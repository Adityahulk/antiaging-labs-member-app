import { getDatabase, id, nowIso, parseJson } from "./database";

type Row = Record<string, unknown>;
const camel = (row: Row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const sd = (values: number[]) => { const average = mean(values); return values.length > 1 ? Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)) : 0; };

type OutcomeDirection = "higher_is_better" | "lower_is_better" | "descriptive_only";
type ExperimentDesign = "randomized_crossover" | "baseline_then_intervention";
type OutcomeSource = "wearable_daily" | "observations";

type ExperimentMethodology = {
  version: "experiment-methodology-v2";
  designType: ExperimentDesign;
  durationDays: number;
  blockDays: number;
  eligibility: { wellnessOnly: true; minimumHistoricalDays: number; exclusions: string[] };
  dataRequirements: { source: OutcomeSource; metric: string; minimumHistoricalDays: number; description: string };
  minimumUsableDays: { total: number; perArm: number };
  outcome: { code: string; unit: string; direction: OutcomeDirection };
  confounders: string[];
  interpretation: { causalClaimAllowed: false; language: "conservative" };
};

type ExperimentTemplate = {
  code: string;
  title: string;
  hypothesis: string;
  outcome: string;
  unit: string;
  a: string;
  b: string;
  availability: "ready_with_required_data" | "requires_specialized_data";
  methodology: ExperimentMethodology;
};

const methodology = (input: Omit<ExperimentMethodology, "version" | "interpretation">): ExperimentMethodology => ({
  version: "experiment-methodology-v2",
  ...input,
  interpretation: { causalClaimAllowed: false, language: "conservative" },
});

export const experimentTemplates = [
  {
    code: "caffeine_cutoff", title: "Earlier caffeine cutoff", hypothesis: "Stopping caffeine by 1 pm may improve sleep duration.", outcome: "sleep_minutes", unit: "min", a: "Usual caffeine timing", b: "No caffeine after 1 pm", availability: "ready_with_required_data",
    methodology: methodology({ designType: "randomized_crossover", durationDays: 28, blockDays: 2, eligibility: { wellnessOnly: true, minimumHistoricalDays: 7, exclusions: ["pregnancy-related restriction", "acute illness", "clinician-directed caffeine restriction"] }, dataRequirements: { source: "wearable_daily", metric: "sleep_minutes", minimumHistoricalDays: 7, description: "At least seven reliable nights of wearable-recorded sleep duration." }, minimumUsableDays: { total: 14, perArm: 7 }, outcome: { code: "sleep_minutes", unit: "min", direction: "higher_is_better" }, confounders: ["alcohol", "travel", "illness", "late meal", "unusual training", "sleep medication change"] }),
  },
  {
    code: "morning_light", title: "Morning light", hypothesis: "Twenty minutes of outdoor light within an hour of waking may improve sleep duration.", outcome: "sleep_minutes", unit: "min", a: "Usual morning", b: "20 min outdoor light after waking", availability: "ready_with_required_data",
    methodology: methodology({ designType: "baseline_then_intervention", durationDays: 28, blockDays: 14, eligibility: { wellnessOnly: true, minimumHistoricalDays: 7, exclusions: ["acute eye or light-sensitivity condition", "acute illness", "clinician-directed light restriction"] }, dataRequirements: { source: "wearable_daily", metric: "sleep_minutes", minimumHistoricalDays: 7, description: "At least seven reliable nights of wearable-recorded sleep duration." }, minimumUsableDays: { total: 20, perArm: 10 }, outcome: { code: "sleep_minutes", unit: "min", direction: "higher_is_better" }, confounders: ["travel", "shift-work change", "illness", "timezone change", "sleep medication change"] }),
  },
  {
    code: "early_dinner", title: "Earlier dinner", hypothesis: "Finishing dinner three hours before bed may improve overnight HRV.", outcome: "hrv_rmssd", unit: "ms", a: "Usual dinner timing", b: "Dinner ≥3 hours before bed", availability: "ready_with_required_data",
    methodology: methodology({ designType: "randomized_crossover", durationDays: 28, blockDays: 2, eligibility: { wellnessOnly: true, minimumHistoricalDays: 7, exclusions: ["pregnancy-related restriction", "history of disordered eating", "acute illness", "clinician-directed meal timing"] }, dataRequirements: { source: "wearable_daily", metric: "hrv_rmssd", minimumHistoricalDays: 7, description: "At least seven reliable nights of wearable-recorded RMSSD HRV." }, minimumUsableDays: { total: 14, perArm: 7 }, outcome: { code: "hrv_rmssd", unit: "ms", direction: "higher_is_better" }, confounders: ["alcohol", "illness", "late training", "unusual meal size", "travel", "medication change"] }),
  },
  {
    code: "recovery_walk", title: "Post-meal walk", hypothesis: "A ten-minute walk after the largest meal may reduce the measured post-meal glucose response.", outcome: "postprandial_glucose_auc", unit: "mg/dL·h", a: "Usual routine", b: "10 min walk after largest meal", availability: "requires_specialized_data",
    methodology: methodology({ designType: "randomized_crossover", durationDays: 28, blockDays: 2, eligibility: { wellnessOnly: true, minimumHistoricalDays: 3, exclusions: ["glucose-lowering medication change", "symptomatic hypoglycaemia", "acute illness", "clinician-directed activity restriction"] }, dataRequirements: { source: "observations", metric: "postprandial_glucose_auc", minimumHistoricalDays: 3, description: "Meal-linked CGM data capable of calculating post-meal glucose area under the curve. Resting heart rate is not a metabolic outcome for this experiment." }, minimumUsableDays: { total: 14, perArm: 7 }, outcome: { code: "postprandial_glucose_auc", unit: "mg/dL·h", direction: "lower_is_better" }, confounders: ["meal carbohydrate amount", "meal size", "meal timing", "pre-meal activity", "glucose-lowering medication", "illness"] }),
  },
] satisfies readonly ExperimentTemplate[];

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

function getTemplate(templateCode: string): ExperimentTemplate | undefined {
  return experimentTemplates.find((item) => item.code === templateCode);
}

async function requireExperimentData(db: D1Database, memberId: string, template: ExperimentTemplate) {
  const requirement = template.methodology.dataRequirements;
  let availableDays = 0;
  if (requirement.source === "wearable_daily") {
    const allowedMetrics = ["sleep_minutes", "hrv_rmssd", "resting_hr", "steps"];
    if (!allowedMetrics.includes(requirement.metric)) throw new Error("Experiment outcome is not supported by the wearable store");
    const row = await db.prepare(`SELECT COUNT(DISTINCT day) count FROM wearable_daily WHERE member_id=? AND ${requirement.metric} IS NOT NULL AND quality>=.7 AND day>=date('now','-60 day')`).bind(memberId).first<{ count: number }>();
    availableDays = Number(row?.count ?? 0);
  } else {
    const row = await db.prepare("SELECT COUNT(DISTINCT substr(effective_at,1,10)) count FROM observations WHERE member_id=? AND concept_code=? AND value_number IS NOT NULL AND quality!='rejected' AND effective_at>=datetime('now','-60 day')")
      .bind(memberId, requirement.metric).first<{ count: number }>();
    availableDays = Number(row?.count ?? 0);
  }
  if (availableDays < requirement.minimumHistoricalDays) {
    const prefix = template.availability === "requires_specialized_data" ? "This experiment is currently unmeasurable" : "More baseline data is needed";
    throw new Error(`${prefix}: ${requirement.description} Available reliable days: ${availableDays}.`);
  }
  return { status: "ready" as const, availableDays, requirement };
}

export async function createExperiment(memberId: string, templateCode: string) {
  const template = getTemplate(templateCode); if (!template) throw new Error("Unknown experiment template");
  const db = await getDatabase();
  const active = await db.prepare("SELECT id FROM experiments WHERE member_id=? AND status='active'").bind(memberId).first(); if (active) throw new Error("Finish the active experiment before starting another");
  const readiness = await requireExperimentData(db, memberId, template);
  const experimentId = id("experiment"); const now = new Date(); const start = new Date(now); start.setUTCDate(start.getUTCDate() + 1); const end = new Date(start); end.setUTCDate(end.getUTCDate() + template.methodology.durationDays - 1);
  const firstArm = [...`${memberId}:${experimentId}`].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 ? "A" : "B";
  const initialResult = { methodology: template.methodology, measurementStatus: readiness.status, readiness, interpretationStatus: "scheduled", conclusion: "Experiment scheduled. Results will remain descriptive until the template-specific data minimums are met." };
  const statements: D1PreparedStatement[] = [db.prepare("INSERT INTO experiments (id,member_id,template_code,title,hypothesis,primary_outcome,unit,status,design,start_at,end_at,protocol_snapshot_id,result_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'active',?,?,?,NULL,?,?,?)")
    .bind(experimentId, memberId, template.code, template.title, template.hypothesis, template.outcome, template.unit, template.methodology.designType, start.toISOString(), end.toISOString(), JSON.stringify(initialResult), nowIso(), nowIso())];
  for (let offset = 0; offset < template.methodology.durationDays; offset++) {
    const day = new Date(start); day.setUTCDate(day.getUTCDate() + offset);
    const block = Math.floor(offset / template.methodology.blockDays);
    const arm = template.methodology.designType === "baseline_then_intervention" ? (block === 0 ? "A" : "B") : block % 2 === 0 ? firstArm : firstArm === "A" ? "B" : "A";
    const periodContext = { methodologyVersion: template.methodology.version, expectedConfounders: template.methodology.confounders, outcomeStatus: "pending" };
    statements.push(db.prepare("INSERT INTO experiment_periods (id,experiment_id,member_id,day,arm,instruction,completed,adherence,outcome_value,context_json,updated_at) VALUES (?,?,?,?,?,?,0,NULL,NULL,?,?)")
      .bind(id("period"), experimentId, memberId, day.toISOString().slice(0, 10), arm, arm === "A" ? template.a : template.b, JSON.stringify(periodContext), nowIso()));
  }
  await db.batch(statements); return getExperiment(memberId, experimentId);
}

export async function checkInExperiment(memberId: string, periodId: string, input: { completed: boolean; adherence?: number; context?: string }) {
  const db = await getDatabase();
  const period = await db.prepare("SELECT p.*,e.primary_outcome,e.template_code FROM experiment_periods p JOIN experiments e ON e.id=p.experiment_id WHERE p.id=? AND p.member_id=?").bind(periodId, memberId).first<Row>(); if (!period) throw new Error("Experiment day not found");
  const template = getTemplate(String(period.template_code)); if (!template) throw new Error("Experiment methodology is unavailable");
  let outcome: { value: number | null } | null = null;
  if (template.methodology.dataRequirements.source === "wearable_daily") {
    const metric = template.methodology.dataRequirements.metric;
    if (!["sleep_minutes", "hrv_rmssd", "resting_hr", "steps"].includes(metric)) throw new Error("Experiment outcome is not supported by the wearable store");
    outcome = await db.prepare(`SELECT ${metric} value FROM wearable_daily WHERE member_id=? AND day=? AND quality>=.7 ORDER BY quality DESC LIMIT 1`).bind(memberId, period.day).first<{ value: number | null }>();
  } else {
    outcome = await db.prepare("SELECT value_number value FROM observations WHERE member_id=? AND concept_code=? AND substr(effective_at,1,10)=? AND value_number IS NOT NULL AND quality!='rejected' ORDER BY CASE quality WHEN 'accepted' THEN 0 ELSE 1 END,effective_at DESC LIMIT 1")
      .bind(memberId, template.methodology.dataRequirements.metric, period.day).first<{ value: number | null }>();
  }
  const previousContext = parseJson<Record<string, unknown>>(period.context_json, {});
  const context = { ...previousContext, note: input.context?.slice(0, 300) ?? "", outcomeStatus: outcome?.value === null || outcome?.value === undefined ? "missing" : "measured" };
  await db.prepare("UPDATE experiment_periods SET completed=?,adherence=?,outcome_value=?,context_json=?,updated_at=? WHERE id=? AND member_id=?")
    .bind(input.completed ? 1 : 0, input.adherence ?? (input.completed ? 1 : 0), outcome?.value ?? null, JSON.stringify(context), nowIso(), periodId, memberId).run();
  return analyseExperiment(memberId, String(period.experiment_id));
}

export function analyseExperimentPeriods(templateCode: string, periods: Row[], storedMethodology?: ExperimentMethodology) {
  const template = getTemplate(templateCode); if (!template && !storedMethodology) throw new Error("Experiment methodology is unavailable");
  const method = storedMethodology ?? template!.methodology;
  const valid = periods.filter((row) => {
    const context = parseJson<Record<string, unknown>>(row.context_json, {});
    return Number(row.completed) === 1 && row.outcome_value !== null && row.outcome_value !== undefined && Number(row.adherence) >= .7 && context.excludeFromAnalysis !== true;
  });
  const a = valid.filter((row) => row.arm === "A").map((row) => Number(row.outcome_value)).filter(Number.isFinite);
  const b = valid.filter((row) => row.arm === "B").map((row) => Number(row.outcome_value)).filter(Number.isFinite);
  const effect = b.length && a.length ? mean(b) - mean(a) : null;
  const standardError = a.length > 1 && b.length > 1 ? Math.sqrt(sd(a) ** 2 / a.length + sd(b) ** 2 / b.length) : null;
  const sufficientData = valid.length >= method.minimumUsableDays.total && a.length >= method.minimumUsableDays.perArm && b.length >= method.minimumUsableDays.perArm;
  const interval = sufficientData && effect !== null && standardError !== null ? [effect - 1.96 * standardError, effect + 1.96 * standardError] : null;
  let favoredArm: "A" | "B" | null = null;
  if (interval && method.outcome.direction !== "descriptive_only") {
    if (method.outcome.direction === "higher_is_better") favoredArm = interval[0] > 0 ? "B" : interval[1] < 0 ? "A" : null;
    if (method.outcome.direction === "lower_is_better") favoredArm = interval[1] < 0 ? "B" : interval[0] > 0 ? "A" : null;
  }
  const notedConfounders = valid.filter((row) => Boolean(String(parseJson<Record<string, unknown>>(row.context_json, {}).note ?? "").trim())).length;
  const interpretationStatus = !sufficientData ? "insufficient_data" : favoredArm ? "possible_signal" : "no_clear_difference";
  const conclusion = !sufficientData
    ? `Not enough reliable data yet. This design needs at least ${method.minimumUsableDays.perArm} usable days in each routine (${method.minimumUsableDays.total} total); it does not support a conclusion from only a few days per arm.`
    : favoredArm
      ? `Routine ${favoredArm} showed a possible favorable signal for ${method.outcome.code.replaceAll("_", " ")} in this run. This is a personal, exploratory result and does not establish that the routine caused the difference.`
      : `This run did not show a clear difference between the routines for ${method.outcome.code.replaceAll("_", " ")}. The result should not be interpreted as proof that the routines are equivalent.`;
  return {
    methodology: method,
    measurementStatus: valid.length === 0 ? "awaiting_measurements" : sufficientData ? "sufficient_measurements" : "partial_measurements",
    interpretationStatus,
    validDays: valid.length,
    armA: { n: a.length, mean: a.length ? mean(a) : null },
    armB: { n: b.length, mean: b.length ? mean(b) : null },
    effect,
    effectDefinition: "Routine B mean minus Routine A mean",
    outcomeDirection: method.outcome.direction,
    interval,
    favoredArm,
    sufficientData,
    causalConclusion: false,
    notedConfounderDays: notedConfounders,
    conclusion,
  };
}

export async function analyseExperiment(memberId: string, experimentId: string) {
  const db = await getDatabase(); const experiment = await db.prepare("SELECT * FROM experiments WHERE id=? AND member_id=?").bind(experimentId, memberId).first<Row>(); if (!experiment) throw new Error("Experiment not found");
  const periods = await db.prepare("SELECT * FROM experiment_periods WHERE experiment_id=? AND member_id=? ORDER BY day").bind(experimentId, memberId).all<Row>();
  const previousResult = parseJson<{ methodology?: ExperimentMethodology }>(experiment.result_json, {});
  const result = analyseExperimentPeriods(String(experiment.template_code), periods.results, previousResult.methodology);
  const complete = new Date(String(experiment.end_at)) < new Date();
  await db.prepare("UPDATE experiments SET result_json=?,status=?,updated_at=? WHERE id=? AND member_id=?").bind(JSON.stringify(result), complete ? "completed" : "active", nowIso(), experimentId, memberId).run();
  return { ...(await getExperiment(memberId, experimentId)), resultJson: result };
}

async function getExperiment(memberId: string, experimentId: string) {
  const db = await getDatabase(); const experiment = await db.prepare("SELECT * FROM experiments WHERE id=? AND member_id=?").bind(experimentId, memberId).first<Row>(); const periods = await db.prepare("SELECT * FROM experiment_periods WHERE experiment_id=? AND member_id=? ORDER BY day").bind(experimentId, memberId).all<Row>();
  return { ...camel(experiment ?? {}), resultJson: parseJson(experiment?.result_json, {}), periods: periods.results.map((row) => ({ ...camel(row), contextJson: parseJson(row.context_json, {}) })) };
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
