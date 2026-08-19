import { getDatabase, id, nowIso, parseJson } from "./database";

export async function generateReport(memberId: string, type: "biomarkers" | "wearables" | "twin") {
  const db = await getDatabase(); const now = nowIso();
  const snapshot = await db.prepare("SELECT * FROM twin_snapshots WHERE member_id = ? ORDER BY version DESC LIMIT 1").bind(memberId).first<Record<string, unknown>>();
  const domains = snapshot ? await db.prepare("SELECT * FROM twin_domains WHERE snapshot_id = ? ORDER BY id").bind(snapshot.id).all<Record<string, unknown>>() : { results: [] as Record<string, unknown>[] };
  const observations = await db.prepare("SELECT concept_code, domain, value_number, value_text, unit, effective_at, source, quality, metadata_json FROM observations WHERE member_id = ? ORDER BY effective_at DESC").bind(memberId).all<Record<string, unknown>>();
  const sourceObservations = type === "wearables" ? observations.results.filter((row) => ["Oura", "WHOOP", "Apple Health", "Garmin", "Open Wearables"].includes(String(row.source))) : observations.results.filter((row) => !["Oura", "WHOOP", "Apple Health", "Garmin", "Open Wearables"].includes(String(row.source)));
  const decodedDomains = domains.results.map((row) => ({ code: row.domain_code, label: row.label, status: row.status, state: row.state_label, trend: row.trend, confidence: row.confidence, metric: row.key_metric, value: row.key_value, unit: row.key_unit, target: row.target, evidence: parseJson(row.evidence_json, {}) }));
  const priorities = [...decodedDomains].sort((a, b) => Number((a.evidence as { score?: number }).score ?? 70) - Number((b.evidence as { score?: number }).score ?? 70)).slice(0, 3);
  const title = type === "biomarkers" ? "Complete biomarker analysis" : type === "wearables" ? "Wearable trend analysis" : "Biological Twin analysis";
  const overview = `${priorities.map((item) => item.label).join(", ")} are the leading priorities in this version. ${String(snapshot?.summary ?? "Data coverage is still building.")}`;
  const reportId = id("report");
  const deepDive = { version: 1, generatedAt: now, snapshotId: snapshot?.id ?? null, twinVersion: snapshot?.version ?? null, overview: { priorities: priorities.map((item) => ({ domain: item.label, state: item.state, metric: `${item.metric} ${item.value} ${item.unit ?? ""}`.trim(), target: item.target, confidence: item.confidence })), reassuring: decodedDomains.filter((item) => item.status === "optimizing").map((item) => item.label), missing: decodedDomains.flatMap((item) => ((item.evidence as { missing?: string[] }).missing ?? []).map((missing) => ({ domain: item.label, missing }))) }, domains: decodedDomains, observations: sourceObservations.map((row) => ({ conceptCode: row.concept_code, domain: row.domain, value: row.value_number ?? row.value_text, unit: row.unit, effectiveAt: row.effective_at, source: row.source, quality: row.quality, provenance: parseJson(row.metadata_json, {}) })), method: { engine: "structured-report-v1", twinObserver: "twin-domain-observer-v1", limitations: ["Measured laboratory values remain tied to their collection date.", "Wearable trends use personal baselines and depend on device coverage."] } };
  await db.batch([
    db.prepare("INSERT INTO reports (id, member_id, type, title, status, source_date, overview, deep_dive_json, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)").bind(reportId, memberId, type, title, now.slice(0, 10), overview, JSON.stringify(deepDive), now, now),
    db.prepare("INSERT INTO approvals (id, member_id, entity_type, entity_id, role, status, reviewer_id, note, created_at, decided_at) VALUES (?, ?, 'report', ?, 'practitioner', 'pending', NULL, '', ?, NULL)").bind(id("approval"), memberId, reportId, now),
  ]);
  return { id: reportId, status: "draft", title, overview, deepDive };
}

export async function approveReport(memberId: string, reportId: string, reviewerId: string, note: string) {
  const db = await getDatabase(); const now = nowIso();
  const report = await db.prepare("SELECT id FROM reports WHERE id = ? AND member_id = ?").bind(reportId, memberId).first(); if (!report) throw new Error("Report not found");
  await db.batch([
    db.prepare("UPDATE reports SET status = 'ready', updated_at = ? WHERE id = ? AND member_id = ?").bind(now, reportId, memberId),
    db.prepare("UPDATE approvals SET status = 'approved', reviewer_id = ?, note = ?, decided_at = ? WHERE entity_type = 'report' AND entity_id = ? AND status = 'pending'").bind(reviewerId, note, now, reportId),
    db.prepare("INSERT INTO notifications (id, member_id, channel, template, title, body, status, created_at, sent_at) VALUES (?, ?, 'in_app', 'report_ready', 'New report ready', 'Your latest analysis is ready to explore.', 'sent', ?, ?)").bind(id("notification"), memberId, now, now),
  ]);
  return { id: reportId, status: "ready" };
}
