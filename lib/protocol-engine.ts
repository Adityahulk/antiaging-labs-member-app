import { getDatabase, id, nowIso, parseJson } from "./database";
import { runAiDraft } from "./ai-drafting";

type Candidate = { domain: string; time: string; title: string; detail: string; reason: string; target: string };

export async function generateProtocol(memberId: string) {
  const db = await getDatabase(); const now = nowIso();
  const snapshot = await db.prepare("SELECT * FROM twin_snapshots WHERE member_id = ? ORDER BY version DESC LIMIT 1").bind(memberId).first<Record<string, unknown>>(); if (!snapshot) throw new Error("Compute the Twin first");
  const domainsResult = await db.prepare("SELECT * FROM twin_domains WHERE snapshot_id = ? ORDER BY id").bind(snapshot.id).all<Record<string, unknown>>();
  const intake = await db.prepare("SELECT question_code, answer_json FROM intake_answers WHERE member_id = ?").bind(memberId).all<{ question_code: string; answer_json: string }>(); const answers = Object.fromEntries(intake.results.map((row) => [row.question_code, parseJson(row.answer_json, "")]));
  const domains = domainsResult.results.map((row) => ({ code: String(row.domain_code), label: String(row.label), score: Number((parseJson(row.evidence_json, {}) as { score?: number }).score ?? 70), state: String(row.state_label), metric: String(row.key_metric), value: String(row.key_value), target: String(row.target ?? "") })).sort((a, b) => a.score - b.score);
  const top = domains.slice(0, 3); const candidates: Candidate[] = [];
  for (const domain of top) {
    if (domain.code === "cardiovascular") candidates.push({ domain: "nutrition", time: "12:30", title: "ApoB-supportive lunch", detail: "Build lunch around legumes or lean protein, vegetables, and a soluble-fibre source.", reason: `${domain.metric} ${domain.value}; target ${domain.target}`, target: "One structured lunch daily" });
    if (domain.code === "metabolic") candidates.push({ domain: "nutrition", time: "12:50", title: "Post-meal walk", detail: "Walk at an easy pace after the largest meal.", reason: `${domain.metric} ${domain.value}; ${domain.state}`, target: "12 minutes" });
    if (domain.code === "recovery") candidates.push({ domain: "recovery", time: "22:15", title: "Wind-down sequence", detail: "Dim light, devices away, and paced breathing before bed.", reason: `${domain.metric} ${domain.value}; ${domain.state}`, target: "10 minutes" });
    if (domain.code === "sleep") candidates.push({ domain: "recovery", time: "07:15", title: "Morning outdoor light", detail: "Get outdoor light shortly after waking.", reason: `${domain.metric} ${domain.value}; ${domain.state}`, target: "12 minutes" });
    if (domain.code === "activity") candidates.push({ domain: "training", time: "17:30", title: "Zone 2 session", detail: "Easy aerobic training at conversational effort.", reason: `${domain.metric} ${domain.value}; ${domain.state}`, target: "35 minutes, 3× weekly" });
  }
  const defaults: Candidate[] = [
    { domain: "nutrition", time: "08:30", title: "Protein-first breakfast", detail: "Use a familiar breakfast that reaches your meal protein target.", reason: "Muscle preservation and satiety", target: "30–35 g protein" },
    { domain: "training", time: "17:30", title: "Full-body strength", detail: "Compound movement pattern session scaled to current experience.", reason: String(answers.training || "Build strength consistency"), target: "3 sessions weekly" },
    { domain: "mind", time: "18:45", title: "Work-to-home downshift", detail: "Use a short walk or breath practice before the evening routine.", reason: `Stress context ${answers.stress || "noted"}`, target: "10 minutes" },
    { domain: "recovery", time: "07:15", title: "Morning outdoor light", detail: "Get outside shortly after waking and keep the timing consistent.", reason: "Circadian timing and recovery consistency", target: "12 minutes" },
    { domain: "supplements", time: "20:00", title: "Existing supplement log", detail: "Take only the items already in your current plan and record completion.", reason: String(answers.medications || "Keep the current approved stack measurable"), target: "One daily check-in" },
  ];
  for (const item of defaults) if (candidates.length < 6 && !candidates.some((candidate) => candidate.title === item.title)) candidates.push(item);
  const versionRow = await db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM protocol_versions WHERE member_id = ?").bind(memberId).first<{ version: number }>(); const version = (versionRow?.version ?? 0) + 1; const protocolId = id("protocol"); const starts = now.slice(0, 10); const ends = new Date(Date.now() + 84 * 86400000).toISOString().slice(0, 10); const strategy = `Focus first on ${top.map((domain) => domain.label.toLowerCase()).join(", ")}, using ${candidates.slice(0,6).length} concrete habits that fit the recorded constraints.`;
  const statements: D1PreparedStatement[] = [db.prepare("INSERT INTO protocol_versions (id, member_id, version, status, title, strategy, started_at, ends_at, created_at, updated_at) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)").bind(protocolId, memberId, version, `12-week protocol v${version}`, strategy, starts, ends, now, now), db.prepare("INSERT INTO approvals (id, member_id, entity_type, entity_id, role, status, reviewer_id, note, created_at, decided_at) VALUES (?, ?, 'protocol', ?, 'practitioner', 'pending', NULL, '', ?, NULL)").bind(id("approval"), memberId, protocolId, now)];
  candidates.slice(0, 6).forEach((action, index) => statements.push(db.prepare("INSERT INTO protocol_actions (protocol_id, member_id, domain, day_of_week, scheduled_time, title, detail, reason, target, done, done_at, sort_order) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 0, NULL, ?)").bind(protocolId, memberId, action.domain, action.time, action.title, action.detail, action.reason, action.target, index + 1)));
  await db.batch(statements);
  const crossModal=await db.prepare("SELECT id,domain_code,title,statement,confidence,layers_json FROM cross_modal_findings WHERE member_id=? AND snapshot_id=? ORDER BY confidence DESC").bind(memberId,snapshot.id).all<Record<string,unknown>>();const genetics=await db.prepare("SELECT id,gene,rsid,title,summary FROM genomic_interpretations WHERE member_id=? AND status='released' ORDER BY gene").bind(memberId).all<Record<string,unknown>>();const refs=[...crossModal.results.map((item)=>String(item.id)),...genetics.results.map((item)=>String(item.id)),...domains.map((item)=>String(item.code))];const ai=await runAiDraft({memberId,task:"protocol",entityType:"protocol",entityId:protocolId,structuredInput:{strategy,candidateActions:candidates.slice(0,6),crossModal:crossModal.results,reviewedGenetics:genetics.results,constraints:answers},inputRefs:refs,fallback:{summary:strategy,priorities:candidates.slice(0,3).map((item)=>({title:item.title,explanation:item.reason,groundingRefs:[]})),limitations:["Actions remain bounded to the reviewed six-habit stack."],groundingRefs:refs.slice(0,10)}});const assisted=ai.output.summary;const finalStrategy=typeof assisted==="string"&&assisted.trim()?assisted.trim():strategy;await db.prepare("UPDATE protocol_versions SET strategy=?,updated_at=? WHERE id=? AND member_id=? AND status='draft'").bind(finalStrategy,nowIso(),protocolId,memberId).run();return { id: protocolId, version, status: "draft", strategy:finalStrategy, actions: candidates.slice(0, 6), assistantDraft:ai };
}

export async function approveProtocol(memberId: string, protocolId: string, reviewerId: string, note: string) {
  const db = await getDatabase(); const now = nowIso(); const protocol = await db.prepare("SELECT id FROM protocol_versions WHERE id = ? AND member_id = ?").bind(protocolId, memberId).first(); if (!protocol) throw new Error("Protocol not found");
  await db.batch([
    db.prepare("UPDATE protocol_versions SET status = 'superseded', updated_at = ? WHERE member_id = ? AND status = 'current'").bind(now, memberId),
    db.prepare("UPDATE protocol_versions SET status = 'current', updated_at = ? WHERE id = ? AND member_id = ?").bind(now, protocolId, memberId),
    db.prepare("UPDATE approvals SET status = 'approved', reviewer_id = ?, note = ?, decided_at = ? WHERE entity_type = 'protocol' AND entity_id = ? AND status = 'pending'").bind(reviewerId, note, now, protocolId),
    db.prepare("INSERT INTO notifications (id, member_id, channel, template, title, body, status, created_at, sent_at) VALUES (?, ?, 'in_app', 'protocol_ready', 'Protocol updated', 'Your latest 12-week protocol is ready.', 'sent', ?, ?)").bind(id("notification"), memberId, now, now),
  ]); return { id: protocolId, status: "current" };
}
