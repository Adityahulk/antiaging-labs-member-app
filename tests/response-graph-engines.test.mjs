import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function loadPureModule(path) {
  const source = (await readFile(new URL(path, root), "utf8"))
    .replace(/^import \{ getDatabase, id, nowIso \} from "\.\/database";\s*$/m, "const getDatabase=async()=>globalThis.__responseGraphDb;const id=(prefix)=>`${prefix}_testid`;const nowIso=()=>\"2026-08-26T12:00:00.000Z\";")
    .replace(/^import type .*;\s*$/gm, "");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const priority = await loadPureModule("lib/priority-engine.ts");
const intervention = await loadPureModule("lib/intervention-engine.ts");
const response = await loadPureModule("lib/response-engine.ts");

class MockStatement {
  constructor(database, sql) { this.database = database; this.sql = sql; this.args = []; }
  bind(...args) {
    assert.equal(args.length, (this.sql.match(/\?/g) ?? []).length, `placeholder mismatch in: ${this.sql}`);
    this.args = args;
    return this;
  }
  async first() { return this.database.first(this.sql, this.args); }
  async run() { this.database.runs.push({ sql: this.sql, args: this.args }); return { meta: { changes: 1 } }; }
}

class MockDatabase {
  constructor(first) { this.firstHandler = first; this.runs = []; this.batches = []; }
  prepare(sql) { return new MockStatement(this, sql); }
  first(sql, args) { return this.firstHandler?.(sql, args) ?? null; }
  async batch(statements) { this.batches.push(statements); for (const statement of statements) await statement.run(); return statements.map(() => ({ meta: { changes: 1 } })); }
}

test("safety evaluation follows the medical, review, data, eligible hierarchy", () => {
  assert.deepEqual(priority.evaluateSafetyStatus({ criticalLab: true, medicationChange: true, missingRequiredData: ["wearable"] }), { status: "requires_medical_attention", reasonCodes: ["critical_lab"] });
  assert.deepEqual(priority.evaluateSafetyStatus({ medicationChange: true, missingRequiredData: ["wearable"] }), { status: "requires_practitioner_review", reasonCodes: ["medication_change"] });
  assert.deepEqual(priority.evaluateSafetyStatus({ missingRequiredData: ["wearable", "wearable"] }), { status: "requires_data", reasonCodes: ["missing:wearable"] });
  assert.deepEqual(priority.evaluateSafetyStatus({}), { status: "eligible_for_wellness_experiment", reasonCodes: [] });
});

test("priority ranking is deterministic, bounded, and only modestly modified by genetics", () => {
  const ranked = priority.rankPriorityCandidates([
    { candidateCode: "sleep_consistency", domainCode: "sleep", title: "Sleep consistency", userImportance: 1, actionability: .9, measurementReadiness: 1, evidenceConfidence: .9, timeToSignal: .9, burden: .2, riskPenalty: 0, geneticsModifier: -.05 },
    { candidateCode: "caffeine_timing", domainCode: "sleep", title: "Caffeine timing", userImportance: .7, actionability: .8, measurementReadiness: .8, evidenceConfidence: .7, timeToSignal: .9, burden: .2, riskPenalty: 0, geneticsModifier: .05 },
    { candidateCode: "high_risk", domainCode: "other", title: "High risk", userImportance: 1, actionability: 1, measurementReadiness: 1, evidenceConfidence: 1, timeToSignal: 1, burden: 0, riskPenalty: 1 },
  ]);
  assert.deepEqual(ranked.map((item) => item.candidateCode), ["sleep_consistency", "caffeine_timing", "high_risk"]);
  assert.deepEqual(ranked.map((item) => item.rank), [1, 2, 3]);
  assert.ok(ranked.every((item) => item.finalScore >= 0 && item.finalScore <= 1));
  assert.throws(() => priority.rankPriorityCandidates([{ candidateCode: "bad", domainCode: "x", title: "Bad", userImportance: 2, actionability: 1, measurementReadiness: 1, evidenceConfidence: 1, timeToSignal: 1, burden: 0, riskPenalty: 0 }]), /between 0 and 1/);
});

test("priority persistence uses bound D1 statements for the complete ranked assessment", async () => {
  const database = new MockDatabase();
  globalThis.__responseGraphDb = database;
  const created = await priority.createPriorityAssessment({ memberId: "member-1", evidenceVersion: "evidence-v1", safety: {}, inputSnapshot: { sourceRefs: ["safe-ref"] }, candidates: [{ candidateCode: "sleep_consistency", domainCode: "sleep", title: "Sleep consistency", userImportance: 1, actionability: .9, measurementReadiness: 1, evidenceConfidence: .9, timeToSignal: .9, burden: .2, riskPenalty: 0 }] });
  assert.equal(created.status, "ready");
  assert.equal(database.batches[0].length, 3);
  assert.ok(database.runs.every((entry) => !entry.sql.includes("member-1")));
});

test("intervention definitions enforce measurement windows and target direction", () => {
  const valid = intervention.validateInterventionDefinition({ outcomeDirection: "lower_is_better", minimumBaselineDays: 7, minimumComparisonDays: 10, reviewAt: "2026-09-01T00:00:00.000Z" });
  assert.equal(valid.minimumComparisonDays, 10);
  assert.throws(() => intervention.validateInterventionDefinition({ outcomeDirection: "target_range", minimumBaselineDays: 7, minimumComparisonDays: 7, reviewAt: "2026-09-01", targetMin: 100, targetMax: 80 }), /targetMin and targetMax/);
  assert.throws(() => intervention.validateInterventionDefinition({ outcomeDirection: "higher_is_better", minimumBaselineDays: 2, minimumComparisonDays: 7, reviewAt: "2026-09-01" }), /between 3 and 90/);
});

test("intervention creation requires a covering safety decision and uses a prepared insert", async () => {
  const database = new MockDatabase((sql) => {
    if (sql.includes("FROM safety_decisions")) return { status: "eligible_for_wellness_experiment", expires_at: null, entity_type: "member", entity_id: "member-1" };
    return null;
  });
  globalThis.__responseGraphDb = database;
  const created = await intervention.createIntervention({ memberId: "member-1", safetyDecisionId: "safety-1", title: "Earlier caffeine cutoff", category: "sleep", hypothesis: "Earlier caffeine may improve sleep", exactInstruction: "Stop caffeine by 1 PM", frequency: "daily", primaryOutcomeCode: "sleep_minutes", outcomeDirection: "higher_is_better", outcomeUnit: "minutes", reviewAt: "2026-09-09T00:00:00.000Z", evidenceVersion: "evidence-v1" });
  assert.equal(created.status, "approved");
  assert.equal(database.runs.length, 1);
  assert.match(database.runs[0].sql, /^INSERT INTO intervention_episodes/);
});

test("activation, check-in, context, decision, and genetic links preserve member ownership", async () => {
  const database = new MockDatabase((sql) => {
    if (sql.includes("JOIN safety_decisions")) return { status: "approved", review_at: "2026-09-09T00:00:00.000Z", safety_status: "eligible_for_wellness_experiment", expires_at: null };
    if (sql.includes("status='active' LIMIT 1")) return null;
    if (sql.includes("SELECT id,status FROM intervention_episodes")) return { id: "intervention-1", status: "active" };
    if (sql.includes("SELECT id FROM intervention_exposures")) return null;
    if (sql.includes("SELECT status FROM intervention_episodes")) return { status: "active" };
    if (sql.includes("SELECT id FROM intervention_episodes")) return { id: "intervention-1" };
    if (sql.includes("FROM genomic_interpretations")) return { id: "genetics-1", status: "released" };
    return null;
  });
  globalThis.__responseGraphDb = database;
  assert.equal((await intervention.activateIntervention("member-1", "intervention-1")).status, "active");
  assert.equal((await intervention.checkInIntervention({ memberId: "member-1", interventionEpisodeId: "intervention-1", scheduledAt: "2026-08-26T08:00:00.000Z", occurredAt: "2026-08-26T08:05:00.000Z", adherence: .9, completed: true, adverseEffect: true })).status, "paused");
  assert.ok((await intervention.recordContextEvent({ memberId: "member-1", interventionEpisodeId: "intervention-1", occurredAt: "2026-08-26T12:00:00.000Z", type: "travel", severity: 2 })).id);
  assert.equal((await intervention.decideIntervention({ memberId: "member-1", interventionEpisodeId: "intervention-1", decision: "stop", reason: "No longer appropriate" })).status, "stopped");
  assert.equal((await intervention.linkGeneticHypothesis({ memberId: "member-1", interventionEpisodeId: "intervention-1", genomicInterpretationId: "genetics-1", influence: "supporting", predictedRelationship: "May alter caffeine response", evidenceVersion: "evidence-v1" })).observedStatus, "unresolved");
});

test("product events accept only the fixed privacy-safe event contract", async () => {
  const database = new MockDatabase();
  globalThis.__responseGraphDb = database;
  const event = await priority.recordProductEvent({ memberId: "member-1", eventName: "experiment_started", journeyState: "experiment_active", source: "member_app", cohortCode: "founding_2026" });
  assert.equal(event.eventName, "experiment_started");
  assert.equal(database.runs.length, 1);
  await assert.rejects(() => priority.recordProductEvent({ eventName: "apob_108", source: "member_app" }), /Unsupported privacy-safe/);
});

function points(startDay, values, quality = .9) {
  return values.map((value, index) => ({ id: `obs-${startDay}-${index}`, value, quality, effectiveAt: `2026-08-${String(startDay + index).padStart(2, "0")}T08:00:00.000Z` }));
}

const windows = { baselineStart: "2026-08-01T00:00:00.000Z", baselineEnd: "2026-08-07T23:59:59.999Z", comparisonStart: "2026-08-08T00:00:00.000Z", comparisonEnd: "2026-08-14T23:59:59.999Z" };

test("response assessment respects higher and lower outcome direction", () => {
  const higher = response.computeResponseAssessment({ ...windows, baseline: points(1, [60, 60, 60, 60, 60, 60, 60]), comparison: points(8, [70, 70, 70, 70, 70, 70, 70]), outcomeDirection: "higher_is_better", adherenceValues: Array(7).fill(1) });
  assert.equal(higher.status, "ready");
  assert.equal(higher.effectEstimate, 10);
  assert.equal(higher.conclusion, "possible_improvement");
  assert.equal(higher.recommendedDecision, "keep");

  const lower = response.computeResponseAssessment({ ...windows, baseline: points(1, [70, 70, 70, 70, 70, 70, 70]), comparison: points(8, [60, 60, 60, 60, 60, 60, 60]), outcomeDirection: "lower_is_better", adherenceValues: Array(7).fill(.9) });
  assert.equal(lower.absoluteChange, -10);
  assert.equal(lower.effectEstimate, 10);
  assert.equal(lower.conclusion, "possible_improvement");
});

test("response assessment handles target ranges, confounder exclusions, and insufficient data", () => {
  const target = response.computeResponseAssessment({ ...windows, baseline: points(1, [120, 120, 120, 120, 120, 120, 120]), comparison: points(8, [90, 90, 90, 90, 90, 90, 90]), outcomeDirection: "target_range", targetMin: 70, targetMax: 90, adherenceValues: Array(7).fill(.9) });
  assert.equal(target.effectEstimate, 30);
  assert.equal(target.conclusion, "possible_improvement");

  const insufficient = response.computeResponseAssessment({ ...windows, baseline: points(1, [60, 61]), comparison: points(8, [62, 63]), outcomeDirection: "higher_is_better", adherenceValues: [.9, .9] });
  assert.equal(insufficient.status, "insufficient_data");
  assert.equal(insufficient.attributionGrade, "D");
  assert.match(insufficient.insufficiencyReasons.join(" "), /baseline_days:2\/7/);

  const excluded = response.computeResponseAssessment({ ...windows, baseline: points(1, [60, 60, 60, 60, 60, 60, 60]), comparison: points(8, [70, 70, 70, 70, 70, 70, 100]), outcomeDirection: "higher_is_better", adherenceValues: Array(7).fill(1), minimumComparisonDays: 6, contexts: [{ id: "travel", occurredAt: "2026-08-14T12:00:00.000Z", type: "travel", severity: 3, exclude: true }] });
  assert.equal(excluded.comparisonUsableDays, 6);
  assert.equal(excluded.comparisonValue, 70);
  assert.equal(excluded.confounders[0].excluded, true);
});

test("response persistence versions and binds the intervention-specific assessment", async () => {
  const database = new MockDatabase((sql) => {
    if (sql.includes("FROM intervention_episodes")) return { id: "intervention-1", member_id: "member-1", primary_outcome_code: "sleep_minutes", outcome_direction: "higher_is_better" };
    if (sql.includes("MAX(version)")) return { version: 2 };
    return null;
  });
  globalThis.__responseGraphDb = database;
  const computation = response.computeResponseAssessment({ ...windows, baseline: points(1, [60, 60, 60, 60, 60, 60, 60]), comparison: points(8, [70, 70, 70, 70, 70, 70, 70]), outcomeDirection: "higher_is_better", adherenceValues: Array(7).fill(1) });
  const stored = await response.storeResponseAssessment({ memberId: "member-1", interventionEpisodeId: "intervention-1", primaryOutcomeCode: "sleep_minutes", outcomeDirection: "higher_is_better", unit: "minutes", ...windows, computation });
  assert.equal(stored.version, 3);
  assert.equal(database.runs.length, 1);
  assert.match(database.runs[0].sql, /^INSERT INTO response_assessments/);
});
