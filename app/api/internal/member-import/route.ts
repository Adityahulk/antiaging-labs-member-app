import { getDatabase, nowIso } from "@/lib/database";
import { runtimeConfig, timingSafeEqual } from "@/lib/integrations";
import { recomputeTwin } from "@/lib/twin-engine";

type IntakeItem = { questionCode: string; module: string; answer: unknown };
type ObservationItem = { conceptCode: string; domain: string; valueNumber?: number | null; valueText?: string | null; unit?: string | null; effectiveAt: string; source: string; quality?: "accepted" | "needs_review"; provenance?: Record<string, unknown> };
type SourceItem = { sourceCode: string; name: string; category: string; status: string; lastSyncAt?: string | null; coverage: number; metadata?: Record<string, unknown> };
type JourneyItem = { stepCode: string; title: string; detail: string; state: "complete" | "current" | "future"; sortOrder: number; dueAt?: string | null };
type ReportItem = { title: string; sourceDate?: string | null; overview: string; deepDive: Record<string, unknown> };
type ProtocolItem = { title: string; strategy: string; startedAt: string; endsAt: string; actions: Array<{ domain: string; dayOfWeek?: number; scheduledTime?: string; title: string; detail: string; reason: string; target: string; sortOrder: number }> };
type GeneticsOrder = { productName: string; status: string; reference: string; vendor?: string | null; amountPaise?: number; paymentStatus?: string; trackingUrl?: string | null; publicMessage: string; metadata?: Record<string, unknown> };
type MemberBundle = { email: string; fullName: string; primaryGoal: string; intake: IntakeItem[]; observations: ObservationItem[]; sources: SourceItem[]; journey: JourneyItem[]; report: ReportItem; protocol?: ProtocolItem | null; geneticsOrder?: GeneticsOrder | null };

const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const clean = (value: unknown, maximum = 240) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

async function stableId(prefix: string, value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hash.slice(0, 28)}`;
}

async function runBatches(database: D1Database, statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += 40) await database.batch(statements.slice(index, index + 40));
}

export async function POST(request: Request) {
  const configured = runtimeConfig().MEMBER_IMPORT_KEY ?? "";
  const supplied = request.headers.get("x-member-import-key") ?? "";
  if (!configured || !timingSafeEqual(configured, supplied)) return Response.json({ error: "Not authorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { members?: MemberBundle[] };
  if (!Array.isArray(body.members) || !body.members.length || body.members.length > 10) return Response.json({ error: "Provide 1-10 member bundles" }, { status: 400 });
  const database = await getDatabase();
  const results: Array<Record<string, unknown>> = [];

  for (const bundle of body.members) {
    const email = clean(bundle.email, 254).toLowerCase();
    const fullName = clean(bundle.fullName, 120);
    if (!validEmail(email) || fullName.length < 2) return Response.json({ error: "Every bundle needs a valid provisioned email and full name" }, { status: 400 });
    const member = await database.prepare("SELECT id FROM members WHERE lower(email)=lower(?)").bind(email).first<{ id: string }>();
    if (!member) return Response.json({ error: `Create the account before importing ${email}` }, { status: 409 });
    const credential = await database.prepare("SELECT member_id FROM auth_credentials WHERE member_id=?").bind(member.id).first();
    if (!credential) return Response.json({ error: `Account credentials are incomplete for ${email}` }, { status: 409 });
    const now = nowIso();
    const statements: D1PreparedStatement[] = [
      database.prepare("UPDATE members SET full_name=?,primary_goal=?,updated_at=? WHERE id=?").bind(fullName, clean(bundle.primaryGoal, 1000), now, member.id),
      database.prepare("INSERT OR IGNORE INTO member_roles (member_id,role,created_at) VALUES (?,'member',?)").bind(member.id, now),
      database.prepare("INSERT INTO beta_access (member_id,status,requested_at,approved_at,note,updated_at) VALUES (?,'approved',?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET status='approved',approved_at=excluded.approved_at,note=excluded.note,updated_at=excluded.updated_at").bind(member.id, now, now, "Founding cohort concierge onboarding", now),
    ];

    for (const item of bundle.journey ?? []) statements.push(database.prepare("INSERT INTO journey_steps (member_id,step_code,title,detail,state,sort_order,due_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(member_id,step_code) DO UPDATE SET title=excluded.title,detail=excluded.detail,state=excluded.state,sort_order=excluded.sort_order,due_at=excluded.due_at,updated_at=excluded.updated_at").bind(member.id, clean(item.stepCode, 80), clean(item.title, 180), clean(item.detail, 500), item.state, item.sortOrder, item.dueAt ?? null, now));
    for (const item of bundle.intake ?? []) statements.push(database.prepare("INSERT INTO intake_answers (member_id,question_code,module,answer_json,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(member_id,question_code) DO UPDATE SET module=excluded.module,answer_json=excluded.answer_json,updated_at=excluded.updated_at").bind(member.id, clean(item.questionCode, 120), clean(item.module, 80), JSON.stringify(item.answer), now));
    for (const item of bundle.sources ?? []) {
      const sourceId = await stableId("source", `${member.id}:${item.sourceCode}`);
      statements.push(database.prepare("INSERT INTO data_sources (id,member_id,source_code,name,category,status,last_sync_at,coverage,metadata_json,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(member_id,source_code) DO UPDATE SET name=excluded.name,category=excluded.category,status=excluded.status,last_sync_at=excluded.last_sync_at,coverage=excluded.coverage,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at").bind(sourceId, member.id, clean(item.sourceCode, 120), clean(item.name, 180), clean(item.category, 80), clean(item.status, 80), item.lastSyncAt ?? null, Math.max(0, Math.min(100, Number(item.coverage) || 0)), JSON.stringify(item.metadata ?? {}), now));
    }
    for (let index = 0; index < (bundle.observations ?? []).length; index++) {
      const item = bundle.observations[index];
      if (!item.conceptCode || !item.domain || (item.valueNumber === undefined && !item.valueText)) continue;
      const observationId = await stableId("obs", `${member.id}:${item.effectiveAt}:${item.source}:${item.conceptCode}:${index}`);
      statements.push(database.prepare("INSERT INTO observations (id,member_id,concept_code,domain,value_number,value_text,unit,effective_at,source,quality,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET concept_code=excluded.concept_code,domain=excluded.domain,value_number=excluded.value_number,value_text=excluded.value_text,unit=excluded.unit,effective_at=excluded.effective_at,source=excluded.source,quality=excluded.quality,metadata_json=excluded.metadata_json").bind(observationId, member.id, clean(item.conceptCode, 120), clean(item.domain, 80), typeof item.valueNumber === "number" && Number.isFinite(item.valueNumber) ? item.valueNumber : null, item.valueText ?? null, item.unit ?? null, item.effectiveAt, clean(item.source, 180), item.quality ?? "accepted", JSON.stringify({ ...(item.provenance ?? {}), importedBy: "concierge", importedAt: now }), now));
    }

    const reportId = await stableId("report", `${member.id}:legacy-biomarkers:${bundle.report.sourceDate ?? "unknown"}`);
    statements.push(database.prepare("INSERT INTO reports (id,member_id,type,title,status,source_date,overview,deep_dive_json,created_at,updated_at) VALUES (?,?,'biomarkers',?,'ready',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,status='ready',source_date=excluded.source_date,overview=excluded.overview,deep_dive_json=excluded.deep_dive_json,updated_at=excluded.updated_at").bind(reportId, member.id, clean(bundle.report.title, 240), bundle.report.sourceDate ?? null, clean(bundle.report.overview, 4000), JSON.stringify(bundle.report.deepDive), now, now));

    if (bundle.protocol) {
      const protocolId = await stableId("protocol", `${member.id}:legacy-final-protocol`);
      statements.push(database.prepare("UPDATE protocol_versions SET status='superseded',updated_at=? WHERE member_id=? AND status='current' AND id<>?").bind(now, member.id, protocolId));
      statements.push(database.prepare("INSERT INTO protocol_versions (id,member_id,version,status,title,strategy,started_at,ends_at,created_at,updated_at) VALUES (?,?,1,'current',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status='current',title=excluded.title,strategy=excluded.strategy,started_at=excluded.started_at,ends_at=excluded.ends_at,updated_at=excluded.updated_at").bind(protocolId, member.id, clean(bundle.protocol.title, 240), clean(bundle.protocol.strategy, 4000), bundle.protocol.startedAt, bundle.protocol.endsAt, now, now));
      statements.push(database.prepare("DELETE FROM protocol_actions WHERE protocol_id=? AND member_id=?").bind(protocolId, member.id));
      for (const action of bundle.protocol.actions) statements.push(database.prepare("INSERT INTO protocol_actions (protocol_id,member_id,domain,day_of_week,scheduled_time,title,detail,reason,target,done,done_at,sort_order) VALUES (?,?,?,?,?,?,?,?,?,0,NULL,?)").bind(protocolId, member.id, clean(action.domain, 80), action.dayOfWeek ?? 0, clean(action.scheduledTime ?? "08:00", 20), clean(action.title, 240), clean(action.detail, 3000), clean(action.reason, 2000), clean(action.target, 1000), action.sortOrder));
    }

    if (bundle.geneticsOrder) {
      const orderId = await stableId("order", `${member.id}:genetics-kit`);
      statements.push(database.prepare("INSERT INTO orders (id,member_id,type,product_name,status,reference,vendor,amount_paise,payment_status,tracking_url,appointment_at,metadata_json,created_at,updated_at) VALUES (?,?,'genetics',?,?,?,?,?,?,?,NULL,?,?,?) ON CONFLICT(id) DO UPDATE SET product_name=excluded.product_name,status=excluded.status,reference=excluded.reference,vendor=excluded.vendor,payment_status=excluded.payment_status,tracking_url=excluded.tracking_url,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at").bind(orderId, member.id, clean(bundle.geneticsOrder.productName, 240), clean(bundle.geneticsOrder.status, 80), clean(bundle.geneticsOrder.reference, 120), bundle.geneticsOrder.vendor ?? null, bundle.geneticsOrder.amountPaise ?? 0, bundle.geneticsOrder.paymentStatus ?? "paid", bundle.geneticsOrder.trackingUrl ?? null, JSON.stringify(bundle.geneticsOrder.metadata ?? {}), now, now));
      const eventId = await stableId("event", `${orderId}:kit-at-home`);
      statements.push(database.prepare("INSERT OR IGNORE INTO order_events (id,order_id,member_id,status,actor_id,source,public_message,internal_note,occurred_at) VALUES (?,?,?,?,?,'concierge_import',?,'',?)").bind(eventId, orderId, member.id, clean(bundle.geneticsOrder.status, 80), "system:concierge-import", clean(bundle.geneticsOrder.publicMessage, 1000), now));
    }
    statements.push(database.prepare("INSERT INTO admin_events (member_id,actor_id,action,entity_type,entity_id,detail_json,created_at) VALUES (?,'system:concierge-import','member_bundle_imported','member',?,?,?)").bind(member.id, member.id, JSON.stringify({ reportId, observationCount: bundle.observations?.length ?? 0, intakeCount: bundle.intake?.length ?? 0, protocolImported: Boolean(bundle.protocol), geneticsOrderImported: Boolean(bundle.geneticsOrder) }), now));
    await runBatches(database, statements);
    await recomputeTwin(member.id);
    results.push({ email, memberId: member.id, observations: bundle.observations?.length ?? 0, intake: bundle.intake?.length ?? 0, reportId, protocol: Boolean(bundle.protocol), geneticsOrder: Boolean(bundle.geneticsOrder) });
  }

  return Response.json({ imported: results });
}
