import { getDatabase, id, nowIso } from "./database";
import type { InterventionDecision, OutcomeDirection } from "./intervention-engine";

export const RESPONSE_ANALYSIS_VERSION = "response-v1";

export type OutcomeDatum = { id?: string; value: number; effectiveAt: string; quality: number };
export type ResponseContext = { id?: string; occurredAt: string; type: string; severity: number; exclude?: boolean };
export type ResponseComputation = {
  status: "ready" | "insufficient_data";
  baselineValue: number | null;
  comparisonValue: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  effectEstimate: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  dataQuality: number;
  adherence: number;
  baselineUsableDays: number;
  comparisonUsableDays: number;
  confounders: Array<{ id?: string; occurredAt: string; type: string; severity: number; excluded: boolean }>;
  attributionGrade: "A" | "B" | "C" | "D";
  conclusion: "possible_improvement" | "possible_worsening" | "no_reliable_difference" | "descriptive_change" | "insufficient_data";
  recommendedDecision: InterventionDecision;
  insufficiencyReasons: string[];
  sourceRefs: string[];
};

const round = (value: number, places = 4) => Number(value.toFixed(places));
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const variance = (values: number[]) => values.length > 1 ? values.reduce((sum, value) => sum + (value - mean(values)) ** 2, 0) / (values.length - 1) : 0;
const day = (value: string) => new Date(value).toISOString().slice(0, 10);

function validateWindow(name: string, start: string, end: string) {
  if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end)) || start > end) throw new Error(`${name} window is invalid`);
}

function inWindow(value: string, start: string, end: string) {
  const timestamp = new Date(value).toISOString();
  return timestamp >= new Date(start).toISOString() && timestamp <= new Date(end).toISOString();
}

function distanceToRange(value: number, minimum: number, maximum: number) {
  if (value < minimum) return minimum - value;
  if (value > maximum) return value - maximum;
  return 0;
}

function transform(value: number, direction: OutcomeDirection, targetMin?: number | null, targetMax?: number | null) {
  if (direction === "higher_is_better") return value;
  if (direction === "lower_is_better") return -value;
  if (direction === "target_range") {
    if (!Number.isFinite(targetMin) || !Number.isFinite(targetMax) || Number(targetMin) > Number(targetMax)) throw new Error("target_range requires valid targetMin and targetMax");
    return -distanceToRange(value, Number(targetMin), Number(targetMax));
  }
  return value;
}

function usableByDay(values: OutcomeDatum[], start: string, end: string, minimumQuality: number, excludedDays: Set<string>) {
  const selected = new Map<string, OutcomeDatum>();
  for (const value of values) {
    if (!Number.isFinite(value.value) || !Number.isFinite(value.quality) || value.quality < minimumQuality || !inWindow(value.effectiveAt, start, end) || excludedDays.has(day(value.effectiveAt))) continue;
    const key = day(value.effectiveAt);
    const previous = selected.get(key);
    if (!previous || value.quality > previous.quality || value.quality === previous.quality && value.effectiveAt > previous.effectiveAt) selected.set(key, value);
  }
  return [...selected.values()].sort((left, right) => left.effectiveAt.localeCompare(right.effectiveAt));
}

export function computeResponseAssessment(input: {
  baseline: OutcomeDatum[];
  comparison: OutcomeDatum[];
  baselineStart: string;
  baselineEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  outcomeDirection: OutcomeDirection;
  targetMin?: number | null;
  targetMax?: number | null;
  adherenceValues?: number[];
  contexts?: ResponseContext[];
  minimumBaselineDays?: number;
  minimumComparisonDays?: number;
  minimumQuality?: number;
  minimumAdherence?: number;
  minimumMeaningfulEffect?: number;
}): ResponseComputation {
  validateWindow("baseline", input.baselineStart, input.baselineEnd);
  validateWindow("comparison", input.comparisonStart, input.comparisonEnd);
  const minimumQuality = input.minimumQuality ?? .7;
  const minimumBaselineDays = input.minimumBaselineDays ?? 7;
  const minimumComparisonDays = input.minimumComparisonDays ?? 7;
  const minimumAdherence = input.minimumAdherence ?? .6;
  const minimumEffect = Math.max(0, input.minimumMeaningfulEffect ?? 0);
  for (const [name, value] of Object.entries({ minimumQuality, minimumAdherence })) if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be between 0 and 1`);
  const contexts = (input.contexts ?? []).filter((context) => inWindow(context.occurredAt, input.baselineStart, input.comparisonEnd));
  const excludedDays = new Set(contexts.filter((context) => context.exclude).map((context) => day(context.occurredAt)));
  const baseline = usableByDay(input.baseline, input.baselineStart, input.baselineEnd, minimumQuality, excludedDays);
  const comparison = usableByDay(input.comparison, input.comparisonStart, input.comparisonEnd, minimumQuality, excludedDays);
  const adherenceValues = (input.adherenceValues ?? []).filter((value) => Number.isFinite(value) && value >= 0 && value <= 1);
  const adherence = adherenceValues.length ? mean(adherenceValues) : 0;
  const insufficiencyReasons: string[] = [];
  if (baseline.length < minimumBaselineDays) insufficiencyReasons.push(`baseline_days:${baseline.length}/${minimumBaselineDays}`);
  if (comparison.length < minimumComparisonDays) insufficiencyReasons.push(`comparison_days:${comparison.length}/${minimumComparisonDays}`);
  if (!adherenceValues.length) insufficiencyReasons.push("adherence_missing");
  else if (adherence < minimumAdherence) insufficiencyReasons.push(`adherence_below:${round(minimumAdherence)}`);
  const all = [...baseline, ...comparison];
  const dataQuality = all.length ? mean(all.map((value) => value.quality)) : 0;
  const sourceRefs = [...new Set(all.map((value) => value.id).filter((value): value is string => Boolean(value)))].sort();
  const confounders = contexts.map((context) => ({ id: context.id, occurredAt: context.occurredAt, type: context.type, severity: context.severity, excluded: Boolean(context.exclude) }));
  if (insufficiencyReasons.length) {
    return { status: "insufficient_data", baselineValue: baseline.length ? round(mean(baseline.map((value) => value.value))) : null, comparisonValue: comparison.length ? round(mean(comparison.map((value) => value.value))) : null, absoluteChange: null, percentChange: null, effectEstimate: null, lowerBound: null, upperBound: null, dataQuality: round(dataQuality), adherence: round(adherence), baselineUsableDays: baseline.length, comparisonUsableDays: comparison.length, confounders, attributionGrade: "D", conclusion: "insufficient_data", recommendedDecision: "insufficient_data", insufficiencyReasons, sourceRefs };
  }

  const baselineValue = mean(baseline.map((value) => value.value));
  const comparisonValue = mean(comparison.map((value) => value.value));
  const absoluteChange = comparisonValue - baselineValue;
  const percentChange = baselineValue === 0 ? null : absoluteChange / Math.abs(baselineValue) * 100;
  const transformedBaseline = baseline.map((value) => transform(value.value, input.outcomeDirection, input.targetMin, input.targetMax));
  const transformedComparison = comparison.map((value) => transform(value.value, input.outcomeDirection, input.targetMin, input.targetMax));
  const effectEstimate = mean(transformedComparison) - mean(transformedBaseline);
  const standardError = Math.sqrt(variance(transformedBaseline) / transformedBaseline.length + variance(transformedComparison) / transformedComparison.length);
  const margin = 1.96 * standardError;
  const lowerBound = effectEstimate - margin;
  const upperBound = effectEstimate + margin;
  const includedSevereConfounders = contexts.filter((context) => !context.exclude && context.severity >= 2).length;
  const attributionGrade: ResponseComputation["attributionGrade"] = includedSevereConfounders || adherence < .7 || dataQuality < .75 ? "C"
    : baseline.length >= 7 && comparison.length >= 7 && adherence >= .8 && dataQuality >= .85 ? "A" : "B";
  let conclusion: ResponseComputation["conclusion"];
  let recommendedDecision: InterventionDecision;
  if (input.outcomeDirection === "descriptive_only") {
    conclusion = "descriptive_change";
    recommendedDecision = "practitioner_review";
  } else if (lowerBound > minimumEffect) {
    conclusion = "possible_improvement";
    recommendedDecision = "keep";
  } else if (upperBound < -minimumEffect) {
    conclusion = "possible_worsening";
    recommendedDecision = "stop";
  } else {
    conclusion = "no_reliable_difference";
    recommendedDecision = attributionGrade === "C" ? "repeat" : "change";
  }
  return { status: "ready", baselineValue: round(baselineValue), comparisonValue: round(comparisonValue), absoluteChange: round(absoluteChange), percentChange: percentChange === null ? null : round(percentChange), effectEstimate: round(effectEstimate), lowerBound: round(lowerBound), upperBound: round(upperBound), dataQuality: round(dataQuality), adherence: round(adherence), baselineUsableDays: baseline.length, comparisonUsableDays: comparison.length, confounders, attributionGrade, conclusion, recommendedDecision, insufficiencyReasons: [], sourceRefs };
}

export async function storeResponseAssessment(input: {
  memberId: string;
  interventionEpisodeId: string;
  primaryOutcomeCode: string;
  outcomeDirection: OutcomeDirection;
  unit: string;
  baselineStart: string;
  baselineEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  computation: ResponseComputation;
  analysisVersion?: string;
}) {
  const db = await getDatabase();
  const intervention = await db.prepare("SELECT id,member_id,primary_outcome_code,outcome_direction FROM intervention_episodes WHERE id=? AND member_id=?")
    .bind(input.interventionEpisodeId, input.memberId).first<{ id: string; member_id: string; primary_outcome_code: string; outcome_direction: string }>();
  if (!intervention) throw new Error("Intervention not found");
  if (intervention.primary_outcome_code !== input.primaryOutcomeCode || intervention.outcome_direction !== input.outcomeDirection) throw new Error("Response outcome does not match the intervention definition");
  const current = await db.prepare("SELECT COALESCE(MAX(version),0) version FROM response_assessments WHERE intervention_episode_id=?").bind(input.interventionEpisodeId).first<{ version: number }>();
  const version = Number(current?.version ?? 0) + 1;
  const assessmentId = id("response");
  const computedAt = nowIso();
  const value = input.computation;
  await db.prepare("INSERT INTO response_assessments (id,member_id,intervention_episode_id,version,status,primary_outcome_code,outcome_direction,unit,baseline_start,baseline_end,comparison_start,comparison_end,baseline_value,comparison_value,absolute_change,percent_change,effect_estimate,lower_bound,upper_bound,data_quality,adherence,baseline_usable_days,comparison_usable_days,confounders_json,attribution_grade,conclusion,recommended_decision,insufficiency_reasons_json,source_refs_json,analysis_version,computed_at,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)")
    .bind(assessmentId, input.memberId, input.interventionEpisodeId, version, value.status, input.primaryOutcomeCode, input.outcomeDirection, input.unit, input.baselineStart, input.baselineEnd, input.comparisonStart, input.comparisonEnd, value.baselineValue, value.comparisonValue, value.absoluteChange, value.percentChange, value.effectEstimate, value.lowerBound, value.upperBound, value.dataQuality, value.adherence, value.baselineUsableDays, value.comparisonUsableDays, JSON.stringify(value.confounders), value.attributionGrade, value.conclusion, value.recommendedDecision, JSON.stringify(value.insufficiencyReasons), JSON.stringify(value.sourceRefs), input.analysisVersion ?? RESPONSE_ANALYSIS_VERSION, computedAt).run();
  return { id: assessmentId, version, computedAt, ...value };
}

export async function computeAndStoreResponseAssessment(input: Parameters<typeof computeResponseAssessment>[0] & {
  memberId: string;
  interventionEpisodeId: string;
  primaryOutcomeCode: string;
  unit: string;
  analysisVersion?: string;
}) {
  const computation = computeResponseAssessment(input);
  return storeResponseAssessment({ memberId: input.memberId, interventionEpisodeId: input.interventionEpisodeId, primaryOutcomeCode: input.primaryOutcomeCode, outcomeDirection: input.outcomeDirection, unit: input.unit, baselineStart: input.baselineStart, baselineEnd: input.baselineEnd, comparisonStart: input.comparisonStart, comparisonEnd: input.comparisonEnd, computation, analysisVersion: input.analysisVersion });
}
