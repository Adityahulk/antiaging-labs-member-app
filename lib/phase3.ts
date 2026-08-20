import { getDatabase, id, nowIso, parseJson } from "./database";

type Row = Record<string, unknown>;
const camel = (row: Row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const sd = (values: number[]) => { const average = mean(values); return values.length > 1 ? Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)) : 0; };

export const experimentTemplates = [
  { code: "caffeine_cutoff", title: "Earlier caffeine cutoff", hypothesis: "Stopping caffeine by 1 pm improves sleep duration without reducing daily energy.", outcome: "sleep_minutes", unit: "min", a: "Usual caffeine timing", b: "No caffeine after 1 pm" },
  { code: "morning_light", title: "Morning light", hypothesis: "Twenty minutes of outdoor light within an hour of waking improves sleep regularity.", outcome: "sleep_minutes", unit: "min", a: "Usual morning", b: "20 min outdoor light after waking" },
  { code: "early_dinner", title: "Earlier dinner", hypothesis: "Finishing dinner three hours before bed improves overnight recovery.", outcome: "hrv_rmssd", unit: "ms", a: "Usual dinner timing", b: "Dinner ≥3 hours before bed" },
  { code: "recovery_walk", title: "Post-meal walk", hypothesis: "A ten-minute walk after the largest meal improves next-day recovery without adding fatigue.", outcome: "resting_hr", unit: "bpm", a: "Usual routine", b: "10 min walk after largest meal" },
] as const;

export async function setResearchConsent(memberId: string, granted: boolean) {
  const db = await getDatabase(); const now = nowIso();
  await db.prepare(`INSERT INTO research_consents (id,member_id,notice_version,granted,scopes_json,granted_at,revoked_at,created_at,updated_at) VALUES (?,?, 'research-v1', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(member_id) DO UPDATE SET granted=excluded.granted,scopes_json=excluded.scopes_json,granted_at=excluded.granted_at,revoked_at=excluded.revoked_at,updated_at=excluded.updated_at`)
    .bind(id("research"), memberId, granted ? 1 : 0, JSON.stringify(["deidentified_outcomes", "model_validation"]), granted ? now : null, granted ? null : now, now, now).run();
  return { granted, updatedAt: now };
}

export async function computeMemberOutcomes(memberId: string) {
  const db = await getDatabase(); const now = nowIso();
  const adherence = await db.prepare("SELECT AVG(done) value FROM protocol_actions WHERE member_id=?").bind(memberId).first<{ value: number | null }>();
  const observationCodes = ["apob", "homa_ir", "hba1c", "fasting_glucose", "vitamin_d", "resting_hr_28d", "sleep_duration_28d"];
  for (const code of observationCodes) {
    const values = await db.prepare("SELECT id,value_number,unit,effective_at,quality FROM observations WHERE member_id=? AND concept_code=? AND value_number IS NOT NULL AND quality!='rejected' ORDER BY effective_at")
      .bind(memberId, code).all<{ id: string; value_number: number; unit: string | null; effective_at: string; quality: string }>();
    if (values.results.length < 2) continue;
    const first = values.results[0]; const latest = values.results.at(-1)!; const change = latest.value_number - first.value_number;
    await upsertOutcome(db, memberId, code, first.value_number, latest.value_number, change, first.value_number ? change / Math.abs(first.value_number) * 100 : null, latest.unit ?? "", first.effective_at, latest.effective_at, adherence?.value ?? null, latest.quality === "accepted" ? 1 : .7, values.results.map((row) => row.id), now);
  }
  const wearable = await db.prepare("SELECT day,sleep_minutes,hrv_rmssd,resting_hr,steps,quality FROM wearable_daily WHERE member_id=? AND quality>=.7 ORDER BY day").bind(memberId).all<Record<string, number | string | null>>();
  const rows = wearable.results; const recent = rows.slice(-7); const baseline = rows.slice(Math.max(0, rows.length - 35), Math.max(0, rows.length - 7));
  const wearableTargets = [{ code: "sleep_minutes", unit: "min" }, { code: "hrv_rmssd", unit: "ms" }, { code: "resting_hr", unit: "bpm" }, { code: "steps", unit: "steps" }];
  if (baseline.length >= 7 && recent.length >= 3) for (const target of wearableTargets) {
    const beforeValues = baseline.map((row) => Number(row[target.code])).filter(Number.isFinite); const afterValues = recent.map((row) => Number(row[target.code])).filter(Number.isFinite);
    if (beforeValues.length < 3 || afterValues.length < 3) continue;
    const before = mean(beforeValues); const current = mean(afterValues); const change = current - before;
    await upsertOutcome(db, memberId, target.code, before, current, change, before ? change / Math.abs(before) * 100 : null, target.unit, String(baseline[0].day), String(recent.at(-1)?.day), adherence?.value ?? null, mean(recent.map((row) => Number(row.quality))), recent.map((row) => `${row.day}:${target.code}`), now);
  }
  return getMemberOutcomes(memberId);
}

async function upsertOutcome(db: D1Database, memberId: string, code: string, baseline: number, current: number, change: number, percent: number | null, unit: string, baselineAt: string, currentAt: string, adherence: number | null, quality: number, refs: string[], now: string) {
  await db.prepare(`INSERT INTO outcome_measurements (id,member_id,target_code,window_code,baseline_value,current_value,absolute_change,percent_change,unit,baseline_at,current_at,adherence,quality,source_refs_json,computed_at)
    VALUES (?,?,?,'latest',?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(member_id,target_code,window_code) DO UPDATE SET baseline_value=excluded.baseline_value,current_value=excluded.current_value,absolute_change=excluded.absolute_change,percent_change=excluded.percent_change,unit=excluded.unit,baseline_at=excluded.baseline_at,current_at=excluded.current_at,adherence=excluded.adherence,quality=excluded.quality,source_refs_json=excluded.source_refs_json,computed_at=excluded.computed_at`)
    .bind(id("outcome"), memberId, code, baseline, current, change, percent, unit, baselineAt, currentAt, adherence, quality, JSON.stringify(refs), now).run();
}

export async function getMemberOutcomes(memberId: string) {
  const db = await getDatabase();
  const [outcomes, consent, companions, experiments, predictions, jurisdiction] = await Promise.all([
    db.prepare("SELECT * FROM outcome_measurements WHERE member_id=? ORDER BY computed_at DESC").bind(memberId).all<Row>(),
    db.prepare("SELECT * FROM research_consents WHERE member_id=?").bind(memberId).first<Row>(),
    db.prepare("SELECT id,platform,device_name,app_version,status,last_sync_at,last_cursor,created_at FROM device_installations WHERE member_id=? ORDER BY updated_at DESC").bind(memberId).all<Row>(),
    db.prepare("SELECT * FROM experiments WHERE member_id=? ORDER BY created_at DESC").bind(memberId).all<Row>(),
    db.prepare("SELECT * FROM response_predictions WHERE member_id=? ORDER BY created_at DESC LIMIT 20").bind(memberId).all<Row>(),
    db.prepare("SELECT * FROM member_jurisdictions WHERE member_id=?").bind(memberId).first<Row>(),
  ]);
  const experimentRows = [];
  for (const experiment of experiments.results) {
    const periods = await db.prepare("SELECT * FROM experiment_periods WHERE experiment_id=? ORDER BY day").bind(experiment.id).all<Row>();
    experimentRows.push({ ...camel(experiment), resultJson: parseJson(experiment.result_json, {}), periods: periods.results.map((row) => ({ ...camel(row), contextJson: parseJson(row.context_json, {}) })) });
  }
  return {
    outcomes: outcomes.results.map((row) => ({ ...camel(row), sourceRefsJson: parseJson(row.source_refs_json, []) })),
    researchConsent: consent ? { ...camel(consent), granted: Boolean(consent.granted), scopesJson: parseJson(consent.scopes_json, []) } : null,
    companions: companions.results.map(camel), experiments: experimentRows,
    predictions: predictions.results.map((row) => ({ ...camel(row), featureSnapshotJson: parseJson(row.feature_snapshot_json, {}) })),
    jurisdiction: jurisdiction ? { ...camel(jurisdiction), featuresJson: parseJson(jurisdiction.features_json, {}) } : { countryCode: "IN", regionCode: "TG", policyVersion: "IN-v1", featuresJson: { research: true, experiments: true, abdm: "optional" } },
  };
}

export async function createExperiment(memberId: string, templateCode: string) {
  const template = experimentTemplates.find((item) => item.code === templateCode); if (!template) throw new Error("Unknown experiment template");
  const db = await getDatabase();
  const active = await db.prepare("SELECT id FROM experiments WHERE member_id=? AND status='active'").bind(memberId).first(); if (active) throw new Error("Finish the active experiment before starting another");
  const experimentId = id("experiment"); const now = new Date(); const start = new Date(now); start.setUTCDate(start.getUTCDate() + 1); const end = new Date(start); end.setUTCDate(end.getUTCDate() + 13);
  const firstArm = [...`${memberId}:${experimentId}`].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 ? "A" : "B";
  const statements: D1PreparedStatement[] = [db.prepare("INSERT INTO experiments (id,member_id,template_code,title,hypothesis,primary_outcome,unit,status,design,start_at,end_at,protocol_snapshot_id,result_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'active','randomized_blocked_AB',?,?,NULL,'{}',?,?)")
    .bind(experimentId, memberId, template.code, template.title, template.hypothesis, template.outcome, template.unit, start.toISOString(), end.toISOString(), nowIso(), nowIso())];
  for (let offset = 0; offset < 14; offset++) {
    const day = new Date(start); day.setUTCDate(day.getUTCDate() + offset); const block = Math.floor(offset / 2); const arm = block % 2 === 0 ? firstArm : firstArm === "A" ? "B" : "A";
    statements.push(db.prepare("INSERT INTO experiment_periods (id,experiment_id,member_id,day,arm,instruction,completed,adherence,outcome_value,context_json,updated_at) VALUES (?,?,?,?,?,?,0,NULL,NULL,'{}',?)")
      .bind(id("period"), experimentId, memberId, day.toISOString().slice(0, 10), arm, arm === "A" ? template.a : template.b, nowIso()));
  }
  await db.batch(statements); return getExperiment(memberId, experimentId);
}

export async function checkInExperiment(memberId: string, periodId: string, input: { completed: boolean; adherence?: number; context?: string }) {
  const db = await getDatabase();
  const period = await db.prepare("SELECT p.*,e.primary_outcome FROM experiment_periods p JOIN experiments e ON e.id=p.experiment_id WHERE p.id=? AND p.member_id=?").bind(periodId, memberId).first<Row>(); if (!period) throw new Error("Experiment day not found");
  const wearable = await db.prepare(`SELECT ${["sleep_minutes", "hrv_rmssd", "resting_hr", "steps"].includes(String(period.primary_outcome)) ? String(period.primary_outcome) : "sleep_minutes"} value FROM wearable_daily WHERE member_id=? AND day=? ORDER BY quality DESC LIMIT 1`).bind(memberId, period.day).first<{ value: number | null }>();
  await db.prepare("UPDATE experiment_periods SET completed=?,adherence=?,outcome_value=?,context_json=?,updated_at=? WHERE id=? AND member_id=?")
    .bind(input.completed ? 1 : 0, input.adherence ?? (input.completed ? 1 : 0), wearable?.value ?? null, JSON.stringify({ note: input.context?.slice(0, 300) ?? "" }), nowIso(), periodId, memberId).run();
  return analyseExperiment(memberId, String(period.experiment_id));
}

export async function analyseExperiment(memberId: string, experimentId: string) {
  const db = await getDatabase(); const experiment = await db.prepare("SELECT * FROM experiments WHERE id=? AND member_id=?").bind(experimentId, memberId).first<Row>(); if (!experiment) throw new Error("Experiment not found");
  const periods = await db.prepare("SELECT * FROM experiment_periods WHERE experiment_id=? AND member_id=? ORDER BY day").bind(experimentId, memberId).all<Row>();
  const valid = periods.results.filter((row) => Number(row.completed) === 1 && row.outcome_value !== null && Number(row.adherence) >= .7);
  const a = valid.filter((row) => row.arm === "A").map((row) => Number(row.outcome_value)); const b = valid.filter((row) => row.arm === "B").map((row) => Number(row.outcome_value));
  const effect = b.length && a.length ? mean(b) - mean(a) : null;
  const standardError = a.length > 1 && b.length > 1 ? Math.sqrt(sd(a) ** 2 / a.length + sd(b) ** 2 / b.length) : null;
  const conclusive = a.length >= 3 && b.length >= 3 && effect !== null && standardError !== null;
  const result = { validDays: valid.length, armA: { n: a.length, mean: a.length ? mean(a) : null }, armB: { n: b.length, mean: b.length ? mean(b) : null }, effect, interval: conclusive ? [effect! - 1.96 * standardError!, effect! + 1.96 * standardError!] : null, conclusion: !conclusive ? "Keep collecting—at least three reliable days per routine are needed." : Math.abs(effect!) <= 1.96 * standardError! ? "No reliable difference yet." : effect! > 0 ? "Routine B was better for this outcome in this run." : "Your usual routine performed better in this run." };
  const complete = new Date(String(experiment.end_at)) < new Date() && conclusive;
  await db.prepare("UPDATE experiments SET result_json=?,status=?,updated_at=? WHERE id=? AND member_id=?").bind(JSON.stringify(result), complete ? "completed" : "active", nowIso(), experimentId, memberId).run();
  return { ...(await getExperiment(memberId, experimentId)), resultJson: result };
}

async function getExperiment(memberId: string, experimentId: string) {
  const db = await getDatabase(); const experiment = await db.prepare("SELECT * FROM experiments WHERE id=? AND member_id=?").bind(experimentId, memberId).first<Row>(); const periods = await db.prepare("SELECT * FROM experiment_periods WHERE experiment_id=? AND member_id=? ORDER BY day").bind(experimentId, memberId).all<Row>();
  return { ...camel(experiment ?? {}), resultJson: parseJson(experiment?.result_json, {}), periods: periods.results.map(camel) };
}

export async function getCohortAnalytics(minimumCell = 5) {
  const db = await getDatabase();
  const consented = await db.prepare("SELECT COUNT(*) count FROM research_consents WHERE granted=1").first<{ count: number }>();
  const rows = await db.prepare(`SELECT o.target_code,COUNT(*) n,AVG(o.absolute_change) average_change,AVG(o.percent_change) average_percent_change,AVG(o.adherence) average_adherence,AVG(o.quality) average_quality
    FROM outcome_measurements o JOIN research_consents c ON c.member_id=o.member_id AND c.granted=1 GROUP BY o.target_code ORDER BY o.target_code`).all<Row>();
  return { consentedMembers: consented?.count ?? 0, minimumCell, metrics: rows.results.map((row) => Number(row.n) < minimumCell ? { targetCode: row.target_code, n: row.n, suppressed: true } : { targetCode: row.target_code, n: row.n, suppressed: false, averageChange: row.average_change, averagePercentChange: row.average_percent_change, averageAdherence: row.average_adherence, averageQuality: row.average_quality }) };
}

export async function runPhase3Jobs() {
  const db = await getDatabase(); const members = await db.prepare("SELECT id FROM members").all<{ id: string }>();
  for (const member of members.results) await computeMemberOutcomes(member.id);
  const active = await db.prepare("SELECT id,member_id FROM experiments WHERE status='active'").all<{ id: string; member_id: string }>();
  for (const experiment of active.results) await analyseExperiment(experiment.member_id, experiment.id);
  return { membersProcessed: members.results.length, experimentsAnalysed: active.results.length, completedAt: nowIso() };
}
