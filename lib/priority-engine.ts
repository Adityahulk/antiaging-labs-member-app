import { getDatabase, id, nowIso } from "./database";

export const PRIORITY_ENGINE_VERSION = "priority-v1";
export const SAFETY_POLICY_VERSION = "wellness-safety-v1";
export const PRODUCT_EVENT_SCHEMA_VERSION = "product-event-v1";

export type SafetyStatus = "eligible_for_wellness_experiment" | "requires_data" | "requires_practitioner_review" | "requires_medical_attention";

export type SafetyInput = {
  urgentSymptoms?: boolean;
  criticalLab?: boolean;
  emergencyReasons?: string[];
  medicationChange?: boolean;
  pregnancyContext?: boolean;
  contraindications?: string[];
  adverseEffects?: string[];
  unreviewedHighImpactGenetics?: boolean;
  practitionerReviewReasons?: string[];
  missingRequiredData?: string[];
};

export type PriorityCandidateInput = {
  candidateCode: string;
  domainCode: string;
  title: string;
  userImportance: number;
  actionability: number;
  measurementReadiness: number;
  evidenceConfidence: number;
  timeToSignal: number;
  burden: number;
  riskPenalty: number;
  geneticsModifier?: number;
  rationale?: string[];
  evidenceRefs?: string[];
  missing?: string[];
  experimentTemplates?: string[];
};

export type RankedPriorityCandidate = PriorityCandidateInput & { geneticsModifier: number; finalScore: number; rank: number };

export async function derivePriorityCandidates(memberId: string, goalStatement: string, importance = 4) {
  const db = await getDatabase();
  const [wearable, observations, snapshot, genetics, intake] = await Promise.all([
    db.prepare("SELECT COUNT(DISTINCT day) days,COUNT(sleep_minutes) sleep_days,COUNT(hrv_rmssd) hrv_days,COUNT(steps) step_days FROM wearable_daily WHERE member_id=? AND quality>=.7 AND day>=date('now','-60 day')").bind(memberId).first<{ days: number; sleep_days: number; hrv_days: number; step_days: number }>(),
    db.prepare("SELECT concept_code,COUNT(*) count FROM observations WHERE member_id=? AND value_number IS NOT NULL AND quality!='rejected' GROUP BY concept_code").bind(memberId).all<{ concept_code: string; count: number }>(),
    db.prepare("SELECT id FROM twin_snapshots WHERE member_id=? ORDER BY version DESC LIMIT 1").bind(memberId).first<{ id: string }>(),
    db.prepare("SELECT COUNT(*) count FROM genomic_interpretations WHERE member_id=? AND status='released'").bind(memberId).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) count FROM intake_answers WHERE member_id=?").bind(memberId).first<{ count: number }>(),
  ]);
  const goal = goalStatement.toLowerCase();
  const goalFit = (terms: string[]) => terms.some((term) => goal.includes(term)) ? 1 : Math.max(.45, importance / 5);
  const days = (value: unknown) => Math.min(1, Number(value ?? 0) / 14);
  const labCodes = new Set(observations.results.map((row) => row.concept_code.toLowerCase()));
  const metabolicLabs = ["glucose", "fasting_glucose", "hba1c", "triglycerides", "hdl", "insulin"].filter((code) => labCodes.has(code));
  const releasedGenetics = Number(genetics?.count ?? 0);
  const geneticsModifier = releasedGenetics ? .02 : 0;
  const intakeReady = Number(intake?.count ?? 0) >= 8;
  const candidates: PriorityCandidateInput[] = [
    { candidateCode: "sleep_consistency", domainCode: "sleep", title: "Improve sleep consistency", userImportance: goalFit(["sleep", "fatigue", "energy", "recovery"]), actionability: .9, measurementReadiness: days(wearable?.sleep_days), evidenceConfidence: .8, timeToSignal: .85, burden: .25, riskPenalty: .05, geneticsModifier, rationale: ["High-frequency sleep measurement can support a before-and-after comparison."], evidenceRefs: Number(wearable?.sleep_days ?? 0) ? ["wearable_daily:sleep_minutes"] : [], missing: Number(wearable?.sleep_days ?? 0) >= 7 ? [] : ["7+ reliable sleep days"], experimentTemplates: ["caffeine_cutoff", "morning_light"] },
    { candidateCode: "recovery_capacity", domainCode: "recovery", title: "Improve recovery capacity", userImportance: goalFit(["recovery", "stress", "training", "energy", "fatigue"]), actionability: .78, measurementReadiness: days(wearable?.hrv_days), evidenceConfidence: .68, timeToSignal: .72, burden: .35, riskPenalty: .08, geneticsModifier, rationale: ["Repeated HRV and resting-heart-rate measurements can test a bounded recovery hypothesis."], evidenceRefs: Number(wearable?.hrv_days ?? 0) ? ["wearable_daily:hrv_rmssd"] : [], missing: Number(wearable?.hrv_days ?? 0) >= 7 ? [] : ["7+ reliable HRV days"], experimentTemplates: ["morning_light"] },
    { candidateCode: "metabolic_response", domainCode: "metabolic", title: "Improve metabolic response", userImportance: goalFit(["metabolic", "glucose", "weight", "energy", "diabetes"]), actionability: .72, measurementReadiness: Math.min(1, metabolicLabs.length / 3), evidenceConfidence: metabolicLabs.length ? .75 : .35, timeToSignal: .5, burden: .48, riskPenalty: .12, geneticsModifier, rationale: ["Labs and meal-response data are needed before claiming a metabolic response."], evidenceRefs: metabolicLabs.map((code) => `observation:${code}`), missing: metabolicLabs.length >= 2 ? [] : ["fasting metabolic labs or continuous glucose data"], experimentTemplates: ["early_dinner", "recovery_walk"] },
    { candidateCode: "daily_movement", domainCode: "activity", title: "Increase sustainable daily movement", userImportance: goalFit(["fitness", "movement", "activity", "weight", "energy"]), actionability: .92, measurementReadiness: days(wearable?.step_days), evidenceConfidence: .78, timeToSignal: .8, burden: .3, riskPenalty: .05, geneticsModifier: 0, rationale: ["Daily steps provide a low-burden, repeatable outcome."], evidenceRefs: Number(wearable?.step_days ?? 0) ? ["wearable_daily:steps"] : [], missing: Number(wearable?.step_days ?? 0) >= 7 ? [] : ["7+ reliable step-count days"], experimentTemplates: [] },
  ];
  return {
    candidates,
    twinSnapshotId: snapshot?.id ?? null,
    safety: { missingRequiredData: intakeReady ? [] : ["essential safety intake"] } satisfies SafetyInput,
    inputSnapshot: { intakeReady, wearableDays: Number(wearable?.days ?? 0), metabolicMarkers: metabolicLabs, releasedGeneticFindings: releasedGenetics },
  };
}

const PRODUCT_EVENTS = new Set([
  "signup_completed", "core_intake_started", "core_intake_completed", "wearable_connected", "wearable_data_received",
  "lab_uploaded", "dna_path_selected", "dna_uploaded", "genomics_ready", "baseline_ready", "priority_viewed",
  "intervention_accepted", "experiment_started", "checkin_completed", "experiment_completed", "result_viewed",
  "decision_recorded", "second_cycle_purchased",
]);

const uniqueSorted = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
const round = (value: number, places = 4) => Number(value.toFixed(places));

function assertUnitInterval(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be between 0 and 1`);
}

export function evaluateSafetyStatus(input: SafetyInput): { status: SafetyStatus; reasonCodes: string[] } {
  const emergency = uniqueSorted([
    ...(input.emergencyReasons ?? []),
    ...(input.urgentSymptoms ? ["urgent_symptoms"] : []),
    ...(input.criticalLab ? ["critical_lab"] : []),
  ]);
  if (emergency.length) return { status: "requires_medical_attention", reasonCodes: emergency };

  const review = uniqueSorted([
    ...(input.practitionerReviewReasons ?? []),
    ...(input.contraindications ?? []).map((reason) => `contraindication:${reason}`),
    ...(input.adverseEffects ?? []).map((reason) => `adverse_effect:${reason}`),
    ...(input.medicationChange ? ["medication_change"] : []),
    ...(input.pregnancyContext ? ["pregnancy_context"] : []),
    ...(input.unreviewedHighImpactGenetics ? ["unreviewed_high_impact_genetics"] : []),
  ]);
  if (review.length) return { status: "requires_practitioner_review", reasonCodes: review };

  const missing = uniqueSorted((input.missingRequiredData ?? []).map((reason) => `missing:${reason}`));
  if (missing.length) return { status: "requires_data", reasonCodes: missing };
  return { status: "eligible_for_wellness_experiment", reasonCodes: [] };
}

export function rankPriorityCandidates(candidates: PriorityCandidateInput[]): RankedPriorityCandidate[] {
  const seen = new Set<string>();
  const scored = candidates.map((candidate) => {
    if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(candidate.candidateCode)) throw new Error("candidateCode must be a stable lowercase code");
    if (seen.has(candidate.candidateCode)) throw new Error(`Duplicate candidateCode: ${candidate.candidateCode}`);
    seen.add(candidate.candidateCode);
    for (const [name, value] of Object.entries({
      userImportance: candidate.userImportance,
      actionability: candidate.actionability,
      measurementReadiness: candidate.measurementReadiness,
      evidenceConfidence: candidate.evidenceConfidence,
      timeToSignal: candidate.timeToSignal,
      burden: candidate.burden,
      riskPenalty: candidate.riskPenalty,
    })) assertUnitInterval(name, value);
    const geneticsModifier = candidate.geneticsModifier ?? 0;
    if (!Number.isFinite(geneticsModifier) || geneticsModifier < -.05 || geneticsModifier > .05) throw new Error("geneticsModifier must be between -0.05 and 0.05");
    const positive = .25 * candidate.userImportance + .2 * candidate.actionability + .2 * candidate.measurementReadiness
      + .15 * candidate.evidenceConfidence + .1 * candidate.timeToSignal + .1 * (1 - candidate.burden);
    const finalScore = round(Math.max(0, Math.min(1, positive - .35 * candidate.riskPenalty + geneticsModifier)));
    return { ...candidate, geneticsModifier: round(geneticsModifier), finalScore, rank: 0 };
  });
  return scored.sort((left, right) => right.finalScore - left.finalScore || left.candidateCode.localeCompare(right.candidateCode))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

export async function createMemberGoal(input: { memberId: string; statement: string; desiredOutcome: string; importance: number }) {
  if (!input.statement.trim() || !input.desiredOutcome.trim()) throw new Error("Goal statement and desired outcome are required");
  if (!Number.isInteger(input.importance) || input.importance < 1 || input.importance > 5) throw new Error("Goal importance must be an integer from 1 to 5");
  const db = await getDatabase();
  const goalId = id("goal");
  const now = nowIso();
  await db.batch([
    db.prepare("UPDATE member_goals SET status='superseded',updated_at=? WHERE member_id=? AND status='active'").bind(now, input.memberId),
    db.prepare("INSERT INTO member_goals (id,member_id,statement,desired_outcome,importance,status,created_at,updated_at) VALUES (?,?,?,?,?,'active',?,?)")
      .bind(goalId, input.memberId, input.statement.trim(), input.desiredOutcome.trim(), input.importance, now, now),
  ]);
  return { id: goalId, status: "active" as const, createdAt: now };
}

export async function createPriorityAssessment(input: {
  memberId: string;
  goalId?: string | null;
  twinSnapshotId?: string | null;
  safety: SafetyInput;
  candidates: PriorityCandidateInput[];
  evidenceVersion: string;
  inputSnapshot: Record<string, unknown>;
  safetyEvidenceRefs?: string[];
  decidedBy?: string;
}) {
  if (!input.candidates.length) throw new Error("At least one priority candidate is required");
  if (!input.evidenceVersion.trim()) throw new Error("evidenceVersion is required");
  const ranked = rankPriorityCandidates(input.candidates);
  const safety = evaluateSafetyStatus(input.safety);
  const db = await getDatabase();
  const assessmentId = id("priority");
  const safetyDecisionId = id("safety");
  const now = nowIso();
  const candidateRows = ranked.map((candidate) => ({ ...candidate, id: id("candidate") }));
  const recommended = safety.status === "eligible_for_wellness_experiment" ? candidateRows[0] : null;
  const status = safety.status === "eligible_for_wellness_experiment" ? "ready" : safety.status === "requires_data" ? "needs_data" : "blocked";
  const statements: D1PreparedStatement[] = [
    db.prepare("INSERT INTO safety_decisions (id,member_id,entity_type,entity_id,status,reason_codes_json,evidence_refs_json,policy_version,decided_by,decided_at,expires_at,created_at) VALUES (?,?,'priority_assessment',?,?,?,?,?,?,?,NULL,?)")
      .bind(safetyDecisionId, input.memberId, assessmentId, safety.status, JSON.stringify(safety.reasonCodes), JSON.stringify(uniqueSorted(input.safetyEvidenceRefs ?? [])), SAFETY_POLICY_VERSION, input.decidedBy ?? "system", now, now),
    db.prepare("INSERT INTO priority_assessments (id,member_id,goal_id,twin_snapshot_id,safety_decision_id,recommended_candidate_id,status,engine_version,evidence_version,input_snapshot_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(assessmentId, input.memberId, input.goalId ?? null, input.twinSnapshotId ?? null, safetyDecisionId, recommended?.id ?? null, status, PRIORITY_ENGINE_VERSION, input.evidenceVersion, JSON.stringify(input.inputSnapshot), now),
  ];
  for (const candidate of candidateRows) {
    statements.push(db.prepare("INSERT INTO priority_candidates (id,assessment_id,member_id,candidate_code,domain_code,title,user_importance,actionability,measurement_readiness,evidence_confidence,time_to_signal,burden,risk_penalty,genetics_modifier,final_score,rank,rationale_json,evidence_refs_json,missing_json,experiment_templates_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(candidate.id, assessmentId, input.memberId, candidate.candidateCode, candidate.domainCode, candidate.title, candidate.userImportance, candidate.actionability, candidate.measurementReadiness, candidate.evidenceConfidence, candidate.timeToSignal, candidate.burden, candidate.riskPenalty, candidate.geneticsModifier, candidate.finalScore, candidate.rank, JSON.stringify(candidate.rationale ?? []), JSON.stringify(candidate.evidenceRefs ?? []), JSON.stringify(candidate.missing ?? []), JSON.stringify(candidate.experimentTemplates ?? []), now));
  }
  await db.batch(statements);
  return { id: assessmentId, status, safety, safetyDecisionId, recommendedCandidateId: recommended?.id ?? null, candidates: candidateRows, createdAt: now };
}

export async function recordProductEvent(input: {
  eventName: string;
  memberId?: string | null;
  journeyState?: string | null;
  source: string;
  cohortCode?: string | null;
  sessionId?: string | null;
  occurredAt?: string;
}) {
  if (!PRODUCT_EVENTS.has(input.eventName)) throw new Error("Unsupported privacy-safe product event");
  if (!input.source) throw new Error("source is required");
  for (const [name, value, maximum] of [["source", input.source, 40], ["journeyState", input.journeyState, 60], ["cohortCode", input.cohortCode, 60], ["sessionId", input.sessionId, 100]] as const) {
    if (value && (value.length > maximum || !/^[a-zA-Z0-9_.:-]+$/.test(value))) throw new Error(`${name} must be an opaque code without health data`);
  }
  const db = await getDatabase();
  const eventId = id("productevent");
  const occurredAt = input.occurredAt ?? nowIso();
  await db.prepare("INSERT INTO product_events (id,member_id,event_name,journey_state,source,cohort_code,session_id,schema_version,occurred_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(eventId, input.memberId ?? null, input.eventName, input.journeyState ?? null, input.source, input.cohortCode ?? null, input.sessionId ?? null, PRODUCT_EVENT_SCHEMA_VERSION, occurredAt).run();
  return { id: eventId, eventName: input.eventName, occurredAt };
}
