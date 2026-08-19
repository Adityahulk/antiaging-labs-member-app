import { getDatabase, id, nowIso } from "./database";

export const GENOMICS_PIPELINE_VERSION = "genomics-ingest-v2.0.0";
export const GENOMICS_POLICY_VERSION = "genetics-interpretation-2026.08";

type TargetVariant = { rsid: string; gene: string; chromosome: string; label: string; category: "inherited_context" | "pharmacogenomics" | "wellness_context" };

const targetVariants: TargetVariant[] = [
  { rsid: "rs429358", gene: "APOE", chromosome: "19", label: "APOE isoform component", category: "inherited_context" },
  { rsid: "rs7412", gene: "APOE", chromosome: "19", label: "APOE isoform component", category: "inherited_context" },
  { rsid: "rs1801133", gene: "MTHFR", chromosome: "1", label: "Folate-pathway context", category: "wellness_context" },
  { rsid: "rs1801131", gene: "MTHFR", chromosome: "1", label: "Folate-pathway context", category: "wellness_context" },
  { rsid: "rs9939609", gene: "FTO", chromosome: "16", label: "Body-composition research context", category: "wellness_context" },
  { rsid: "rs8192678", gene: "PPARGC1A", chromosome: "4", label: "Energy-metabolism research context", category: "wellness_context" },
  { rsid: "rs1815739", gene: "ACTN3", chromosome: "11", label: "Muscle-performance context", category: "wellness_context" },
  { rsid: "rs6265", gene: "BDNF", chromosome: "11", label: "Neuroplasticity research context", category: "wellness_context" },
  { rsid: "rs4680", gene: "COMT", chromosome: "22", label: "Catecholamine-pathway context", category: "wellness_context" },
  { rsid: "rs2228570", gene: "VDR", chromosome: "12", label: "Vitamin-D receptor context", category: "wellness_context" },
  { rsid: "rs1544410", gene: "VDR", chromosome: "12", label: "Vitamin-D receptor context", category: "wellness_context" },
  { rsid: "rs762551", gene: "CYP1A2", chromosome: "15", label: "Caffeine-metabolism context", category: "wellness_context" },
  { rsid: "rs2802292", gene: "FOXO3", chromosome: "6", label: "Healthy-ageing research context", category: "wellness_context" },
  { rsid: "rs1800795", gene: "IL6", chromosome: "7", label: "Inflammatory-pathway context", category: "wellness_context" },
  { rsid: "rs1800629", gene: "TNF", chromosome: "6", label: "Inflammatory-pathway context", category: "wellness_context" },
];

const targetsByRsid = new Map(targetVariants.map((variant) => [variant.rsid, variant]));

export type ParsedVariant = {
  rsid: string | null; chromosome: string; position: number; referenceAllele: string | null; alternateAllele: string | null;
  genotype: string | null; phased: boolean; callState: "called" | "no_call" | "filtered"; filter: string | null; quality: number | null;
  metadata: Record<string, unknown>;
};

export type GenomicsParseResult = {
  format: "vcf" | "raw_array" | "csv_array"; genomeBuild: "GRCh37" | "GRCh38" | "unknown"; sampleId: string | null;
  totalRecords: number; calledRecords: number; noCalls: number; filteredRecords: number; parseErrors: number; duplicateTargets: number;
  targetCalls: ParsedVariant[]; warnings: string[];
};

function normalizeChromosome(value: string) { return value.trim().replace(/^chr/i, "").replace(/^23$/, "X").replace(/^24$/, "Y").replace(/^25$/, "MT").toUpperCase(); }
function cleanAlleles(value: string) { return value.toUpperCase().replace(/[^ACGTID|/.]/g, ""); }
function splitCsvLine(line: string) { const cells: string[] = []; let cell = "", quoted = false; for (const char of line) { if (char === '"') quoted = !quoted; else if (char === "," && !quoted) { cells.push(cell.trim()); cell = ""; } else cell += char; } cells.push(cell.trim()); return cells; }

export function detectGenomeBuild(text: string): "GRCh37" | "GRCh38" | "unknown" {
  const header = text.slice(0, 180_000);
  if (/GRCh38|hg38|build\s*38|assembly=GRCh38/i.test(header)) return "GRCh38";
  if (/GRCh37|hg19|build\s*37|assembly=GRCh37/i.test(header)) return "GRCh37";
  return "unknown";
}

export function parseGenomicsText(text: string, fileName = "genetics.txt"): GenomicsParseResult {
  if (/^##fileformat=VCF/m.test(text) || /^#CHROM\s/m.test(text) || /\.g?vcf(?:\.gz)?$/i.test(fileName)) return parseVcf(text);
  const firstData = text.split(/\r?\n/).find((line) => line.trim() && !line.startsWith("#")) ?? "";
  if (/,/.test(firstData) || /RSID.*CHROMOSOME.*POSITION.*RESULT/i.test(text.slice(0, 10_000))) return parseArrayCsv(text);
  return parseRawArray(text);
}

function baseResult(format: GenomicsParseResult["format"], text: string): GenomicsParseResult {
  return { format, genomeBuild: detectGenomeBuild(text), sampleId: null, totalRecords: 0, calledRecords: 0, noCalls: 0, filteredRecords: 0, parseErrors: 0, duplicateTargets: 0, targetCalls: [], warnings: [] };
}

function addTarget(result: GenomicsParseResult, call: ParsedVariant, seen: Set<string>) {
  if (!call.rsid || !targetsByRsid.has(call.rsid)) return;
  if (seen.has(call.rsid)) { result.duplicateTargets++; return; }
  seen.add(call.rsid); result.targetCalls.push(call);
}

function finish(result: GenomicsParseResult) {
  if (result.genomeBuild === "unknown") result.warnings.push("Genome build was not declared; position-dependent annotation is paused until the build is confirmed.");
  if (result.totalRecords === 0) result.warnings.push("No variant records could be parsed.");
  const callRate = result.totalRecords ? result.calledRecords / result.totalRecords : 0;
  if (callRate < .95) result.warnings.push(`Overall call rate is ${(callRate * 100).toFixed(1)}%; verify sample and export quality before interpretation.`);
  if (!result.targetCalls.length) result.warnings.push("No supported context variants were found in this export.");
  return result;
}

function parseRawArray(text: string) {
  const result = baseResult("raw_array", text); const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/); if (parts.length < 4 || !/^rs\d+$/i.test(parts[0])) { result.parseErrors++; continue; }
    result.totalRecords++; const rsid = parts[0].toLowerCase(); const genotype = cleanAlleles(parts.slice(3).join("")); const noCall = !genotype || /--|\.\/?\./.test(genotype);
    if (noCall) result.noCalls++; else result.calledRecords++;
    addTarget(result, { rsid, chromosome: normalizeChromosome(parts[1]), position: Number(parts[2]) || 0, referenceAllele: null, alternateAllele: null, genotype: noCall ? null : genotype, phased: genotype.includes("|"), callState: noCall ? "no_call" : "called", filter: null, quality: null, metadata: { sourceFormat: "raw-array", reportedGenotype: genotype } }, seen);
  }
  return finish(result);
}

function parseArrayCsv(text: string) {
  const result = baseResult("csv_array", text); const seen = new Set<string>(); const lines = text.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("#"));
  if (!lines.length) return finish(result);
  const headers = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line); const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])); const rsid = String(row.rsid ?? row.snp ?? row.marker ?? "").toLowerCase();
    if (!/^rs\d+$/.test(rsid)) { result.parseErrors++; continue; }
    result.totalRecords++; const genotype = cleanAlleles(String(row.result ?? row.genotype ?? row.alleles ?? "")); const noCall = !genotype || /--|\.\/?\./.test(genotype);
    if (noCall) result.noCalls++; else result.calledRecords++;
    addTarget(result, { rsid, chromosome: normalizeChromosome(String(row.chromosome ?? row.chrom ?? row.chr ?? "")), position: Number(row.position ?? row.pos ?? 0), referenceAllele: null, alternateAllele: null, genotype: noCall ? null : genotype, phased: genotype.includes("|"), callState: noCall ? "no_call" : "called", filter: null, quality: null, metadata: { sourceFormat: "csv-array", reportedGenotype: genotype } }, seen);
  }
  return finish(result);
}

function parseVcf(text: string) {
  const result = baseResult("vcf", text); const seen = new Set<string>(); const lines = text.split(/\r?\n/); const sampleHeader = lines.find((line) => line.startsWith("#CHROM"));
  if (sampleHeader) result.sampleId = sampleHeader.split("\t")[9] ?? null;
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue; const fields = line.split("\t"); if (fields.length < 8) { result.parseErrors++; continue; }
    result.totalRecords++; const [chrom, pos, rawId, ref, alt, qual, filter, info, format, sample] = fields; const rsid = rawId.split(";").find((value) => /^rs\d+$/i.test(value))?.toLowerCase() ?? null;
    const formatKeys = (format ?? "GT").split(":"); const sampleValues = (sample ?? "").split(":"); const rawGt = sampleValues[formatKeys.indexOf("GT")] ?? sampleValues[0] ?? ""; const noCall = !rawGt || rawGt === "." || rawGt.split(/[|/]/).some((part) => part === "."); const filtered = filter !== "PASS" && filter !== ".";
    if (noCall) result.noCalls++; else if (filtered) result.filteredRecords++; else result.calledRecords++;
    const alleles = [ref, ...alt.split(",")]; const genotype = noCall ? null : rawGt.split(/([|/])/).map((token) => token === "/" || token === "|" ? token : alleles[Number(token)] ?? "?").join("");
    addTarget(result, { rsid, chromosome: normalizeChromosome(chrom), position: Number(pos) || 0, referenceAllele: ref, alternateAllele: alt, genotype, phased: rawGt.includes("|"), callState: noCall ? "no_call" : filtered ? "filtered" : "called", filter, quality: qual === "." ? null : Number(qual), metadata: { sourceFormat: "vcf", rawGt, info, format: format ?? null } }, seen);
  }
  return finish(result);
}

async function sha256Bytes(bytes: ArrayBuffer) { const digest = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function ingestGenomicArtifact(input: { memberId: string; uploadId: string; objectKey: string; fileName: string; size: number; bytes: ArrayBuffer }) {
  const db = await getDatabase(); const now = nowIso(); const text = new TextDecoder("utf-8", { fatal: false }).decode(input.bytes); const parsed = parseGenomicsText(text, input.fileName); const artifactId = id("genome"); const checksum = await sha256Bytes(input.bytes);
  const callRate = parsed.totalRecords ? parsed.calledRecords / parsed.totalRecords : 0;
  const qc = { status: parsed.totalRecords > 0 && callRate >= .95 && parsed.targetCalls.length ? "pass" : "review", callRate, totalRecords: parsed.totalRecords, calledRecords: parsed.calledRecords, noCalls: parsed.noCalls, filteredRecords: parsed.filteredRecords, parseErrors: parsed.parseErrors, duplicateTargets: parsed.duplicateTargets, supportedCalls: parsed.targetCalls.length, warnings: parsed.warnings };
  const status = qc.status === "pass" && parsed.genomeBuild !== "unknown" ? "interpretable" : "needs_review";
  const statements: D1PreparedStatement[] = [db.prepare("INSERT INTO genomic_artifacts (id,member_id,upload_id,kind,format,genome_build,sample_id,object_key,checksum_sha256,size,status,qc_json,pipeline_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(artifactId,input.memberId,input.uploadId,parsed.format === "vcf" ? "variant_calls" : "genotyping_array",parsed.format,parsed.genomeBuild,parsed.sampleId,input.objectKey,checksum,input.size,status,JSON.stringify(qc),GENOMICS_PIPELINE_VERSION,now,now)];
  for (const call of parsed.targetCalls) statements.push(db.prepare("INSERT INTO genomic_variant_calls (id,artifact_id,member_id,rsid,chromosome,position,reference_allele,alternate_allele,genotype,phased,call_state,filter,quality,metadata_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id("variant"),artifactId,input.memberId,call.rsid,call.chromosome,call.position,call.referenceAllele,call.alternateAllele,call.genotype,call.phased?1:0,call.callState,call.filter,call.quality,JSON.stringify(call.metadata),now));
  await db.batch(statements); const reanalysis = await runGenomicReanalysis(input.memberId, artifactId, "initial_ingest");
  return { artifactId, format: parsed.format, genomeBuild: parsed.genomeBuild, status, qc, reanalysis };
}

async function ensureEvidenceRelease(db: D1Database) {
  const releaseId = "evidence_genetics_policy_2026_08"; const now = nowIso();
  await db.prepare("INSERT OR IGNORE INTO evidence_releases (id,source,version,released_at,checksum,status,metadata_json,created_at) VALUES (?,?,?,?,?,'active',?,?)").bind(releaseId,"Antiaging Labs curated genetics policy",GENOMICS_POLICY_VERSION,"2026-08-01","sha256:policy-2026-08",JSON.stringify({ upstreams: ["ClinVar", "ClinGen", "CPIC"], note: "Local policy manifest; external evidence releases are pinned separately when synchronized." }),now).run();
  return releaseId;
}

export function possibleApoeDiplotypes(first: string | null, second: string | null) {
  if (!first || !second) return [] as string[]; const a = first.replace(/[|/]/g, "").split(""); const b = second.replace(/[|/]/g, "").split(""); if (a.length !== 2 || b.length !== 2) return [];
  const haplotype = (x: string, y: string) => x === "T" && y === "T" ? "ε2" : x === "T" && y === "C" ? "ε3" : x === "C" && y === "C" ? "ε4" : x === "C" && y === "T" ? "ε1" : null;
  const possibilities = [[[a[0],b[0]],[a[1],b[1]]],[[a[0],b[1]],[a[1],b[0]]]].map((pairing) => pairing.map(([x,y]) => haplotype(x,y))).filter((pair) => pair.every(Boolean)).map((pair) => (pair as string[]).sort().join("/"));
  return Array.from(new Set(possibilities));
}

export async function runGenomicReanalysis(memberId: string, artifactId: string, trigger = "manual") {
  const db = await getDatabase(); const now = nowIso(); const releaseId = await ensureEvidenceRelease(db); const artifact = await db.prepare("SELECT * FROM genomic_artifacts WHERE id=? AND member_id=?").bind(artifactId,memberId).first<Record<string,unknown>>(); if(!artifact) throw new Error("Genomic artifact not found");
  const calls = await db.prepare("SELECT * FROM genomic_variant_calls WHERE artifact_id=? AND member_id=? ORDER BY rsid").bind(artifactId,memberId).all<Record<string,unknown>>(); const runId=id("reanalysis"); const previous=await db.prepare("SELECT id FROM genomic_reanalysis_runs WHERE artifact_id=? ORDER BY created_at DESC LIMIT 1").bind(artifactId).first<{id:string}>();
  await db.prepare("INSERT INTO genomic_reanalysis_runs (id,member_id,artifact_id,previous_run_id,trigger,evidence_set_json,pipeline_version,status,summary_json,created_at,completed_at) VALUES (?,?,?,?,?,?,?,'processing','{}',?,NULL)").bind(runId,memberId,artifactId,previous?.id??null,trigger,JSON.stringify([releaseId]),GENOMICS_PIPELINE_VERSION,now).run();
  await db.prepare("DELETE FROM genomic_interpretations WHERE member_id=? AND artifact_id=? AND status='draft'").bind(memberId,artifactId).run();
  const called = calls.results.filter((row)=>row.call_state==="called"&&row.genotype); const statements:D1PreparedStatement[]=[];
  for(const row of called){const variant=targetsByRsid.get(String(row.rsid));if(!variant||variant.gene==="APOE")continue;statements.push(db.prepare("INSERT INTO genomic_interpretations (id,member_id,artifact_id,variant_call_id,gene,rsid,category,title,summary,evidence_level,evidence_release_ids_json,limitations_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'draft',?)").bind(id("interpretation"),memberId,artifactId,row.id,variant.gene,variant.rsid,variant.category,variant.label,`${variant.rsid} was called as ${row.genotype}. It is retained as contextual evidence and cannot independently create a protocol action.`,"context_only",JSON.stringify([releaseId]),JSON.stringify(["Common-variant effects are usually small and population-dependent.","Confirm strand/build before any allele-direction interpretation."]),now));}
  const apo1=called.find((row)=>row.rsid==="rs429358");const apo2=called.find((row)=>row.rsid==="rs7412");const diplotypes=possibleApoeDiplotypes(String(apo1?.genotype??"")||null,String(apo2?.genotype??"")||null);
  if(apo1&&apo2){const certain=diplotypes.length===1;statements.push(db.prepare("INSERT INTO genomic_interpretations (id,member_id,artifact_id,variant_call_id,gene,rsid,category,title,summary,evidence_level,evidence_release_ids_json,limitations_json,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'draft',?)").bind(id("interpretation"),memberId,artifactId,null,"APOE","rs429358+rs7412","inherited_context","APOE inherited context",certain?`The two component calls are consistent with ${diplotypes[0]}. This result remains pending reviewer confirmation.`:`The unphased component calls permit ${diplotypes.join(" or ")||"no confident diplotype"}; phasing or a confirmatory result is needed before display as a single result.`,certain?"review_required":"ambiguous",JSON.stringify([releaseId]),JSON.stringify(["Raw consumer data is not a confirmatory clinical test.","Unphased double heterozygotes can be diplotype-ambiguous."]),now));}
  if(statements.length)await db.batch(statements);const summary={targetCalls:calls.results.length,interpreted:statements.length,apoeDiplotypes:diplotypes,ambiguousApoe:diplotypes.length!==1,evidenceReleases:[releaseId]};await db.batch([db.prepare("UPDATE genomic_reanalysis_runs SET status='completed',summary_json=?,completed_at=? WHERE id=?").bind(JSON.stringify(summary),nowIso(),runId),db.prepare("UPDATE genomic_artifacts SET updated_at=? WHERE id=?").bind(nowIso(),artifactId)]);return{id:runId,status:"completed",summary};
}

export async function getGenomicsState(memberId: string) {
  const db=await getDatabase();const artifacts=await db.prepare("SELECT * FROM genomic_artifacts WHERE member_id=? ORDER BY created_at DESC").bind(memberId).all<Record<string,unknown>>();const interpretations=await db.prepare("SELECT * FROM genomic_interpretations WHERE member_id=? ORDER BY created_at DESC").bind(memberId).all<Record<string,unknown>>();const runs=await db.prepare("SELECT * FROM genomic_reanalysis_runs WHERE member_id=? ORDER BY created_at DESC LIMIT 20").bind(memberId).all<Record<string,unknown>>();
  return {artifacts:artifacts.results,interpretations:interpretations.results,runs:runs.results};
}
