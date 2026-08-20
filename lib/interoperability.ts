import { env } from "cloudflare:workers";
import { getDatabase, id, nowIso } from "./database";

type InteropEnv = { UPLOADS?: R2Bucket; ABDM_GATEWAY_URL?: string; ABDM_CLIENT_ID?: string };
const loinc: Record<string, string> = { apob: "1884-6", hba1c: "4548-4", fasting_glucose: "1558-6", creatinine: "2160-0", vitamin_d: "1989-3" };

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function interoperabilityStatus() {
  const runtime = env as unknown as InteropEnv;
  return { fhir: { standard: "FHIR R4", profile: "ABDM-aligned exchange v1", ready: true }, abdm: { mode: runtime.ABDM_GATEWAY_URL && runtime.ABDM_CLIENT_ID ? "configured" : "optional_not_configured", ready: Boolean(runtime.ABDM_GATEWAY_URL && runtime.ABDM_CLIENT_ID) } };
}

export async function buildFhirBundle(memberId: string) {
  const db = await getDatabase();
  const [member, observations, protocol, actions] = await Promise.all([
    db.prepare("SELECT id,full_name,email FROM members WHERE id=?").bind(memberId).first<Record<string, unknown>>(),
    db.prepare("SELECT * FROM observations WHERE member_id=? AND quality!='rejected' ORDER BY effective_at DESC LIMIT 250").bind(memberId).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM protocol_versions WHERE member_id=? AND status='current' ORDER BY version DESC LIMIT 1").bind(memberId).first<Record<string, unknown>>(),
    db.prepare("SELECT * FROM protocol_actions WHERE member_id=? ORDER BY sort_order").bind(memberId).all<Record<string, unknown>>(),
  ]);
  if (!member) throw new Error("Member not found");
  const patientId = `patient-${memberId.replace(/[^A-Za-z0-9.-]/g, "-")}`;
  const entries: Array<{ fullUrl: string; resource: Record<string, unknown> }> = [{ fullUrl: `urn:uuid:${patientId}`, resource: { resourceType: "Patient", id: patientId, identifier: [{ system: "https://antiaging-labs.com/member", value: memberId }], name: [{ text: member.full_name }], telecom: [{ system: "email", value: member.email, use: "home" }] } }];
  for (const row of observations.results) {
    const observationId = `observation-${String(row.id).replace(/[^A-Za-z0-9.-]/g, "-")}`;
    entries.push({ fullUrl: `urn:uuid:${observationId}`, resource: { resourceType: "Observation", id: observationId, status: "final", category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: row.domain === "activity" || row.domain === "sleep" ? "activity" : "laboratory" }] }], code: { coding: loinc[String(row.concept_code)] ? [{ system: "http://loinc.org", code: loinc[String(row.concept_code)], display: row.concept_code }] : [{ system: "https://antiaging-labs.com/concepts", code: row.concept_code }] }, subject: { reference: `urn:uuid:${patientId}` }, effectiveDateTime: row.effective_at, valueQuantity: row.value_number === null ? undefined : { value: row.value_number, unit: row.unit ?? undefined, system: "http://unitsofmeasure.org", code: row.unit ?? undefined }, valueString: row.value_number === null ? row.value_text ?? undefined : undefined, device: row.source ? { display: row.source } : undefined, note: [{ text: `Quality: ${row.quality}` }] } });
  }
  const laboratoryReferences=entries.filter((entry)=>entry.resource.resourceType==="Observation"&&((entry.resource.category as Array<{coding:Array<{code:string}>}>|undefined)?.[0]?.coding?.[0]?.code==="laboratory")).map((entry)=>({reference:entry.fullUrl}));
  if(laboratoryReferences.length){const diagnosticId=`diagnostic-${crypto.randomUUID()}`;entries.push({fullUrl:`urn:uuid:${diagnosticId}`,resource:{resourceType:"DiagnosticReport",id:diagnosticId,status:"final",code:{text:"Longitudinal biomarker results"},subject:{reference:`urn:uuid:${patientId}`},effectiveDateTime:nowIso(),result:laboratoryReferences,conclusion:"Canonical verified observations; interpretations remain in their versioned source reports."}})}
  if (protocol) {
    const carePlanId = `careplan-${String(protocol.id).replace(/[^A-Za-z0-9.-]/g, "-")}`;
    entries.push({ fullUrl: `urn:uuid:${carePlanId}`, resource: { resourceType: "CarePlan", id: carePlanId, status: "active", intent: "plan", title: protocol.title, description: protocol.strategy, subject: { reference: `urn:uuid:${patientId}` }, period: { start: protocol.started_at, end: protocol.ends_at }, activity: actions.results.map((action) => ({ detail: { status: action.done ? "completed" : "scheduled", description: action.title, scheduledString: `${action.scheduled_time}; ${action.detail}` } })) } });
  }
  const provenanceId = `provenance-${crypto.randomUUID()}`;
  entries.push({ fullUrl: `urn:uuid:${provenanceId}`, resource: { resourceType: "Provenance", id: provenanceId, target: entries.map((entry) => ({ reference: entry.fullUrl })), recorded: nowIso(), agent: [{ type: { text: "Assembler" }, who: { display: "Antiaging Labs Member OS" } }], entity: [{ role: "source", what: { display: "Canonical longitudinal record; exported without altering source measurements" } }] } });
  const organizationId=`organization-antiaging-labs`;entries.unshift({fullUrl:`urn:uuid:${organizationId}`,resource:{resourceType:"Organization",id:organizationId,active:true,name:"Antiaging Labs"}});
  const compositionId=`composition-${crypto.randomUUID()}`;const composition={resourceType:"Composition",id:compositionId,status:"final",type:{coding:[{system:"http://snomed.info/sct",code:"371530004",display:"Clinical consultation report"}],text:"Member longitudinal health record"},subject:{reference:`urn:uuid:${patientId}`},date:nowIso(),author:[{reference:`urn:uuid:${organizationId}`}],title:"Antiaging Labs longitudinal health record",confidentiality:"N",section:[{title:"Measurements",entry:entries.filter((entry)=>entry.resource.resourceType==="Observation"||entry.resource.resourceType==="DiagnosticReport").map((entry)=>({reference:entry.fullUrl}))},{title:"Current protocol",entry:entries.filter((entry)=>entry.resource.resourceType==="CarePlan").map((entry)=>({reference:entry.fullUrl}))},{title:"Provenance",entry:[{reference:`urn:uuid:${provenanceId}`}]}]};entries.unshift({fullUrl:`urn:uuid:${compositionId}`,resource:composition});
  const bundleId=id("bundle");return { resourceType: "Bundle", id: bundleId, meta: { profile: ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"] }, identifier:{system:"https://antiaging-labs.com/fhir/bundles",value:bundleId}, type: "document", timestamp: nowIso(), entry: entries };
}

export async function exportFhirBundle(memberId: string, purpose = "member_export") {
  const bundle = await buildFhirBundle(memberId); const serialized = JSON.stringify(bundle, null, 2); const hash = await sha256(serialized); const exportId = id("fhirexport"); const key = `${memberId}/fhir/${exportId}.json`;
  const runtime = env as unknown as InteropEnv; if (runtime.UPLOADS) await runtime.UPLOADS.put(key, serialized, { httpMetadata: { contentType: "application/fhir+json" }, customMetadata: { memberId, purpose, sha256: hash } });
  const db = await getDatabase(); await db.prepare("INSERT INTO fhir_exports (id,member_id,standard,profile_version,purpose,bundle_hash,object_key,status,destination,created_at) VALUES (?,?,'FHIR R4','ABDM-aligned-v1',?,?,?,'completed',NULL,?)")
    .bind(exportId, memberId, purpose, hash, runtime.UPLOADS ? key : null, nowIso()).run();
  return { exportId, hash, bundle, downloadable: Boolean(runtime.UPLOADS) };
}
