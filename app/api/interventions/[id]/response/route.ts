import { requireIdentity } from "@/lib/authz";
import { getDatabase } from "@/lib/database";
import { computeAndStoreResponseAssessment, type OutcomeDatum, type ResponseContext } from "@/lib/response-engine";
import type { OutcomeDirection } from "@/lib/intervention-engine";

const WEARABLE_METRICS = new Set(["sleep_minutes", "hrv_rmssd", "resting_hr", "steps", "active_calories", "workout_minutes"]);

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireIdentity();
  const interventionEpisodeId = (await context.params).id;
  try {
    const db = await getDatabase();
    const intervention = await db.prepare("SELECT * FROM intervention_episodes WHERE id=? AND member_id=?").bind(interventionEpisodeId, identity.id).first<Record<string, unknown>>();
    if (!intervention) return Response.json({ error: "Intervention not found" }, { status: 404 });
    if (!intervention.start_at) throw new Error("Start the intervention before assessing a response");
    const start = new Date(String(intervention.start_at));
    const baselineDays = Number(intervention.minimum_baseline_days);
    const baselineEndDate = new Date(start); baselineEndDate.setUTCDate(baselineEndDate.getUTCDate() - 1);
    const baselineStartDate = new Date(start); baselineStartDate.setUTCDate(baselineStartDate.getUTCDate() - Math.max(baselineDays, 14));
    const comparisonEndDate = new Date(Math.min(Date.now(), Date.parse(String(intervention.review_at))));
    const baselineStart = baselineStartDate.toISOString(); const baselineEnd = baselineEndDate.toISOString(); const comparisonStart = start.toISOString(); const comparisonEnd = comparisonEndDate.toISOString();
    const outcomeCode = String(intervention.primary_outcome_code);
    let values: OutcomeDatum[] = [];
    if (WEARABLE_METRICS.has(outcomeCode)) {
      const rows = await db.prepare(`SELECT day,${outcomeCode} value,quality FROM wearable_daily WHERE member_id=? AND ${outcomeCode} IS NOT NULL AND day>=? AND day<=? ORDER BY day`).bind(identity.id, baselineStart.slice(0, 10), comparisonEnd.slice(0, 10)).all<{ day: string; value: number; quality: number }>();
      values = rows.results.map((row) => ({ id: `wearable:${row.day}:${outcomeCode}`, value: Number(row.value), effectiveAt: `${row.day}T12:00:00.000Z`, quality: Number(row.quality) }));
    } else {
      const rows = await db.prepare("SELECT id,value_number,effective_at,quality FROM observations WHERE member_id=? AND concept_code=? AND value_number IS NOT NULL AND effective_at>=? AND effective_at<=? ORDER BY effective_at").bind(identity.id, outcomeCode, baselineStart, comparisonEnd).all<{ id: string; value_number: number; effective_at: string; quality: string }>();
      values = rows.results.map((row) => ({ id: row.id, value: Number(row.value_number), effectiveAt: row.effective_at, quality: row.quality === "accepted" || row.quality === "verified" ? 1 : row.quality === "rejected" ? 0 : .7 }));
    }
    const [exposures, contextRows] = await Promise.all([
      db.prepare("SELECT adherence FROM intervention_exposures WHERE member_id=? AND intervention_episode_id=? AND scheduled_at>=? AND scheduled_at<=?").bind(identity.id, interventionEpisodeId, comparisonStart, comparisonEnd).all<{ adherence: number }>(),
      db.prepare("SELECT id,occurred_at,type,severity FROM context_events WHERE member_id=? AND (intervention_episode_id=? OR intervention_episode_id IS NULL) AND occurred_at>=? AND occurred_at<=?").bind(identity.id, interventionEpisodeId, baselineStart, comparisonEnd).all<{ id: string; occurred_at: string; type: string; severity: number }>(),
    ]);
    const contexts: ResponseContext[] = contextRows.results.map((row) => ({ id: row.id, occurredAt: row.occurred_at, type: row.type, severity: row.severity, exclude: false }));
    const result = await computeAndStoreResponseAssessment({ memberId: identity.id, interventionEpisodeId, primaryOutcomeCode: outcomeCode, unit: String(intervention.outcome_unit), outcomeDirection: String(intervention.outcome_direction) as OutcomeDirection, targetMin: intervention.target_min as number | null, targetMax: intervention.target_max as number | null, baselineStart, baselineEnd, comparisonStart, comparisonEnd, baseline: values, comparison: values, adherenceValues: exposures.results.map((row) => Number(row.adherence)), contexts, minimumBaselineDays: baselineDays, minimumComparisonDays: Number(intervention.minimum_comparison_days) });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not assess response" }, { status: 400 });
  }
}
