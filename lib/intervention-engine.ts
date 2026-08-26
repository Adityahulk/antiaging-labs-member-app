import { getDatabase, id, nowIso } from "./database";

export type OutcomeDirection = "higher_is_better" | "lower_is_better" | "target_range" | "descriptive_only";
export type InterventionDecision = "keep" | "change" | "stop" | "repeat" | "insufficient_data" | "practitioner_review";

const TERMINAL_DECISIONS = new Set<InterventionDecision>(["keep", "change", "stop", "repeat", "insufficient_data", "practitioner_review"]);
const DIRECTIONS = new Set<OutcomeDirection>(["higher_is_better", "lower_is_better", "target_range", "descriptive_only"]);
const CONTEXT_TYPES = new Set(["illness", "travel", "alcohol", "late_meal", "unusual_training", "poor_device_coverage", "medication_change", "menstrual_context", "high_stress", "other"]);

function requireText(name: string, value: string, maximum = 500) {
  const clean = value.trim();
  if (!clean) throw new Error(`${name} is required`);
  if (clean.length > maximum) throw new Error(`${name} exceeds ${maximum} characters`);
  return clean;
}

function validDate(name: string, value: string) {
  if (Number.isNaN(Date.parse(value))) throw new Error(`${name} must be a valid date`);
  return new Date(value).toISOString();
}

export function validateInterventionDefinition(input: {
  outcomeDirection: OutcomeDirection;
  targetMin?: number | null;
  targetMax?: number | null;
  minimumBaselineDays: number;
  minimumComparisonDays: number;
  reviewAt: string;
}) {
  if (!DIRECTIONS.has(input.outcomeDirection)) throw new Error("Unsupported outcome direction");
  if (input.outcomeDirection === "target_range") {
    if (!Number.isFinite(input.targetMin) || !Number.isFinite(input.targetMax) || Number(input.targetMin) > Number(input.targetMax)) throw new Error("target_range requires valid targetMin and targetMax");
  }
  if (!Number.isInteger(input.minimumBaselineDays) || input.minimumBaselineDays < 3 || input.minimumBaselineDays > 90) throw new Error("minimumBaselineDays must be between 3 and 90");
  if (!Number.isInteger(input.minimumComparisonDays) || input.minimumComparisonDays < 3 || input.minimumComparisonDays > 90) throw new Error("minimumComparisonDays must be between 3 and 90");
  return { ...input, reviewAt: validDate("reviewAt", input.reviewAt) };
}

export async function createIntervention(input: {
  memberId: string;
  goalId?: string | null;
  priorityCandidateId?: string | null;
  safetyDecisionId: string;
  sourceExperimentId?: string | null;
  sourceProtocolActionId?: number | null;
  title: string;
  category: string;
  hypothesis: string;
  exactInstruction: string;
  doseOrDuration?: string | null;
  frequency: string;
  primaryOutcomeCode: string;
  outcomeDirection: OutcomeDirection;
  outcomeUnit: string;
  targetMin?: number | null;
  targetMax?: number | null;
  minimumBaselineDays?: number;
  minimumComparisonDays?: number;
  reviewAt: string;
  evidenceVersion: string;
}) {
  const definition = validateInterventionDefinition({
    outcomeDirection: input.outcomeDirection,
    targetMin: input.targetMin,
    targetMax: input.targetMax,
    minimumBaselineDays: input.minimumBaselineDays ?? 7,
    minimumComparisonDays: input.minimumComparisonDays ?? 7,
    reviewAt: input.reviewAt,
  });
  const db = await getDatabase();
  const safety = await db.prepare("SELECT status,expires_at,entity_type,entity_id FROM safety_decisions WHERE id=? AND member_id=? ORDER BY decided_at DESC LIMIT 1")
    .bind(input.safetyDecisionId, input.memberId).first<{ status: string; expires_at: string | null; entity_type: string; entity_id: string }>();
  if (!safety) throw new Error("Safety decision not found");
  if (safety.expires_at && safety.expires_at <= nowIso()) throw new Error("Safety decision has expired");
  if (safety.status === "requires_medical_attention") throw new Error("A wellness intervention cannot be created while medical attention is required");
  if (input.goalId) {
    const goal = await db.prepare("SELECT id FROM member_goals WHERE id=? AND member_id=?").bind(input.goalId, input.memberId).first();
    if (!goal) throw new Error("Goal not found");
  }
  let candidateAssessmentId: string | null = null;
  if (input.priorityCandidateId) {
    const candidate = await db.prepare("SELECT id,assessment_id FROM priority_candidates WHERE id=? AND member_id=?").bind(input.priorityCandidateId, input.memberId).first<{ id: string; assessment_id: string }>();
    if (!candidate) throw new Error("Priority candidate not found");
    candidateAssessmentId = candidate.assessment_id;
  }
  const safetyMatchesAssessment = safety.entity_type === "priority_assessment" && safety.entity_id === candidateAssessmentId;
  const safetyMatchesMember = safety.entity_type === "member" && safety.entity_id === input.memberId;
  if (!safetyMatchesAssessment && !safetyMatchesMember) throw new Error("Safety decision does not cover this intervention candidate");
  const interventionId = id("intervention");
  const now = nowIso();
  const status = safety.status === "eligible_for_wellness_experiment" ? "approved" : "awaiting_review";
  await db.prepare("INSERT INTO intervention_episodes (id,member_id,goal_id,priority_candidate_id,safety_decision_id,source_experiment_id,source_protocol_action_id,title,category,hypothesis,exact_instruction,dose_or_duration,frequency,primary_outcome_code,outcome_direction,outcome_unit,target_min,target_max,minimum_baseline_days,minimum_comparison_days,start_at,end_at,review_at,evidence_version,status,decision,decision_reason,decided_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,?,?,?,NULL,NULL,NULL,?,?)")
    .bind(interventionId, input.memberId, input.goalId ?? null, input.priorityCandidateId ?? null, input.safetyDecisionId, input.sourceExperimentId ?? null, input.sourceProtocolActionId ?? null, requireText("title", input.title, 120), requireText("category", input.category, 60), requireText("hypothesis", input.hypothesis, 800), requireText("exactInstruction", input.exactInstruction, 1200), input.doseOrDuration?.trim() || null, requireText("frequency", input.frequency, 120), requireText("primaryOutcomeCode", input.primaryOutcomeCode, 80), definition.outcomeDirection, requireText("outcomeUnit", input.outcomeUnit, 40), input.targetMin ?? null, input.targetMax ?? null, definition.minimumBaselineDays, definition.minimumComparisonDays, definition.reviewAt, requireText("evidenceVersion", input.evidenceVersion, 100), status, now, now).run();
  return { id: interventionId, status, reviewAt: definition.reviewAt, createdAt: now };
}

export async function activateIntervention(memberId: string, interventionId: string, startAt = nowIso()) {
  const db = await getDatabase();
  const intervention = await db.prepare("SELECT i.status,i.review_at,s.status safety_status,s.expires_at FROM intervention_episodes i JOIN safety_decisions s ON s.id=i.safety_decision_id WHERE i.id=? AND i.member_id=?")
    .bind(interventionId, memberId).first<{ status: string; review_at: string; safety_status: string; expires_at: string | null }>();
  if (!intervention) throw new Error("Intervention not found");
  if (intervention.status !== "approved") throw new Error("Only an approved intervention can be activated");
  if (intervention.safety_status !== "eligible_for_wellness_experiment") throw new Error("Intervention is not safety-cleared");
  const activatedAt = validDate("startAt", startAt);
  if (intervention.expires_at && intervention.expires_at <= activatedAt) throw new Error("Safety decision has expired");
  const active = await db.prepare("SELECT id FROM intervention_episodes WHERE member_id=? AND status='active' LIMIT 1").bind(memberId).first<{ id: string }>();
  if (active) throw new Error("Finish or pause the active intervention before starting another");
  const result = await db.prepare("UPDATE intervention_episodes SET status='active',start_at=?,updated_at=? WHERE id=? AND member_id=? AND status='approved'")
    .bind(activatedAt, nowIso(), interventionId, memberId).run();
  if (!result.meta.changes) throw new Error("Intervention activation conflicted with another update");
  return { id: interventionId, status: "active" as const, startAt: activatedAt };
}

export async function pauseIntervention(memberId: string, interventionId: string, reason: string) {
  const db = await getDatabase();
  const now = nowIso();
  const result = await db.prepare("UPDATE intervention_episodes SET status='paused',decision_reason=?,updated_at=? WHERE id=? AND member_id=? AND status='active'")
    .bind(requireText("reason", reason, 500), now, interventionId, memberId).run();
  if (!result.meta.changes) throw new Error("Only an active intervention can be paused");
  return { id: interventionId, status: "paused" as const, updatedAt: now };
}

export async function resumeIntervention(memberId: string, interventionId: string) {
  const db = await getDatabase();
  const intervention = await db.prepare("SELECT i.status,s.status safety_status,s.expires_at FROM intervention_episodes i JOIN safety_decisions s ON s.id=i.safety_decision_id WHERE i.id=? AND i.member_id=?")
    .bind(interventionId, memberId).first<{ status: string; safety_status: string; expires_at: string | null }>();
  if (!intervention || intervention.status !== "paused") throw new Error("Only a paused intervention can be resumed");
  if (intervention.safety_status !== "eligible_for_wellness_experiment" || intervention.expires_at && intervention.expires_at <= nowIso()) throw new Error("Fresh safety review is required before resuming");
  const active = await db.prepare("SELECT id FROM intervention_episodes WHERE member_id=? AND status='active' LIMIT 1").bind(memberId).first();
  if (active) throw new Error("Another intervention is already active");
  const now = nowIso();
  await db.prepare("UPDATE intervention_episodes SET status='active',updated_at=? WHERE id=? AND member_id=? AND status='paused'").bind(now, interventionId, memberId).run();
  return { id: interventionId, status: "active" as const, updatedAt: now };
}

export async function checkInIntervention(input: {
  memberId: string;
  interventionEpisodeId: string;
  scheduledAt: string;
  occurredAt?: string | null;
  plannedValue?: string | null;
  actualValue?: string | null;
  adherence: number;
  completed: boolean;
  subjectiveResponse?: number | null;
  adverseEffect?: boolean;
  note?: string;
  source?: string;
}) {
  if (!Number.isFinite(input.adherence) || input.adherence < 0 || input.adherence > 1) throw new Error("adherence must be between 0 and 1");
  if (input.subjectiveResponse !== undefined && input.subjectiveResponse !== null && (!Number.isFinite(input.subjectiveResponse) || input.subjectiveResponse < 0 || input.subjectiveResponse > 10)) throw new Error("subjectiveResponse must be between 0 and 10");
  const scheduledAt = validDate("scheduledAt", input.scheduledAt);
  const occurredAt = input.occurredAt ? validDate("occurredAt", input.occurredAt) : null;
  const db = await getDatabase();
  const intervention = await db.prepare("SELECT id,status FROM intervention_episodes WHERE id=? AND member_id=?").bind(input.interventionEpisodeId, input.memberId).first<{ id: string; status: string }>();
  if (!intervention || !["active", "paused"].includes(intervention.status)) throw new Error("Active intervention not found");
  const existing = await db.prepare("SELECT id FROM intervention_exposures WHERE intervention_episode_id=? AND scheduled_at=?").bind(input.interventionEpisodeId, scheduledAt).first<{ id: string }>();
  const exposureId = existing?.id ?? id("exposure");
  const now = nowIso();
  const statements: D1PreparedStatement[] = [db.prepare("INSERT INTO intervention_exposures (id,intervention_episode_id,member_id,scheduled_at,occurred_at,planned_value,actual_value,adherence,completed,subjective_response,adverse_effect,note,source,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(intervention_episode_id,scheduled_at) DO UPDATE SET occurred_at=excluded.occurred_at,planned_value=excluded.planned_value,actual_value=excluded.actual_value,adherence=excluded.adherence,completed=excluded.completed,subjective_response=excluded.subjective_response,adverse_effect=excluded.adverse_effect,note=excluded.note,source=excluded.source")
    .bind(exposureId, input.interventionEpisodeId, input.memberId, scheduledAt, occurredAt, input.plannedValue?.trim() || null, input.actualValue?.trim() || null, input.adherence, input.completed ? 1 : 0, input.subjectiveResponse ?? null, input.adverseEffect ? 1 : 0, (input.note ?? "").trim().slice(0, 500), input.source ?? "member", now)];
  if (input.adverseEffect) statements.push(db.prepare("UPDATE intervention_episodes SET status='paused',updated_at=? WHERE id=? AND member_id=? AND status='active'").bind(now, input.interventionEpisodeId, input.memberId));
  await db.batch(statements);
  return { id: exposureId, interventionEpisodeId: input.interventionEpisodeId, scheduledAt, status: input.adverseEffect ? "paused" : intervention.status };
}

export async function recordContextEvent(input: { memberId: string; interventionEpisodeId?: string | null; occurredAt: string; type: string; severity: number; detail?: Record<string, unknown>; source?: string }) {
  if (!CONTEXT_TYPES.has(input.type)) throw new Error("Unsupported context event type");
  if (!Number.isInteger(input.severity) || input.severity < 1 || input.severity > 3) throw new Error("severity must be an integer from 1 to 3");
  const db = await getDatabase();
  if (input.interventionEpisodeId) {
    const intervention = await db.prepare("SELECT id FROM intervention_episodes WHERE id=? AND member_id=?").bind(input.interventionEpisodeId, input.memberId).first();
    if (!intervention) throw new Error("Intervention not found");
  }
  const contextId = id("context");
  const occurredAt = validDate("occurredAt", input.occurredAt);
  await db.prepare("INSERT INTO context_events (id,member_id,intervention_episode_id,occurred_at,type,severity,detail_json,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(contextId, input.memberId, input.interventionEpisodeId ?? null, occurredAt, input.type, input.severity, JSON.stringify(input.detail ?? {}), input.source ?? "member", nowIso()).run();
  return { id: contextId, occurredAt };
}

export async function decideIntervention(input: { memberId: string; interventionEpisodeId: string; decision: InterventionDecision; reason: string }) {
  if (!TERMINAL_DECISIONS.has(input.decision)) throw new Error("Unsupported intervention decision");
  const db = await getDatabase();
  const intervention = await db.prepare("SELECT status FROM intervention_episodes WHERE id=? AND member_id=?").bind(input.interventionEpisodeId, input.memberId).first<{ status: string }>();
  if (!intervention || !["active", "paused", "completed"].includes(intervention.status)) throw new Error("Intervention cannot be decided in its current state");
  const status = input.decision === "stop" ? "stopped" : input.decision === "practitioner_review" ? "paused" : "completed";
  const now = nowIso();
  await db.prepare("UPDATE intervention_episodes SET status=?,decision=?,decision_reason=?,decided_at=?,end_at=COALESCE(end_at,?),updated_at=? WHERE id=? AND member_id=?")
    .bind(status, input.decision, requireText("reason", input.reason, 1000), now, now, now, input.interventionEpisodeId, input.memberId).run();
  return { id: input.interventionEpisodeId, status, decision: input.decision, decidedAt: now };
}

export async function linkGeneticHypothesis(input: { memberId: string; interventionEpisodeId: string; genomicInterpretationId: string; influence: "supporting" | "conflicting" | "required_context" | "neutral" | "research_only"; predictedRelationship: string; evidenceVersion: string }) {
  const db = await getDatabase();
  const [intervention, interpretation] = await Promise.all([
    db.prepare("SELECT id FROM intervention_episodes WHERE id=? AND member_id=?").bind(input.interventionEpisodeId, input.memberId).first(),
    db.prepare("SELECT id,status FROM genomic_interpretations WHERE id=? AND member_id=?").bind(input.genomicInterpretationId, input.memberId).first<{ id: string; status: string }>(),
  ]);
  if (!intervention) throw new Error("Intervention not found");
  if (!interpretation) throw new Error("Genomic interpretation not found");
  if (input.influence !== "research_only" && interpretation.status !== "released") throw new Error("Only released genomic interpretations may influence an intervention");
  const linkId = id("genelink");
  const now = nowIso();
  await db.prepare("INSERT INTO genetic_hypothesis_links (id,member_id,intervention_episode_id,genomic_interpretation_id,influence,predicted_relationship,observed_status,evidence_version,created_at,updated_at) VALUES (?,?,?,?,?,?,'unresolved',?,?,?) ON CONFLICT(intervention_episode_id,genomic_interpretation_id) DO UPDATE SET influence=excluded.influence,predicted_relationship=excluded.predicted_relationship,evidence_version=excluded.evidence_version,updated_at=excluded.updated_at")
    .bind(linkId, input.memberId, input.interventionEpisodeId, input.genomicInterpretationId, input.influence, requireText("predictedRelationship", input.predictedRelationship, 1000), requireText("evidenceVersion", input.evidenceVersion, 100), now, now).run();
  return { id: linkId, observedStatus: "unresolved" as const };
}
