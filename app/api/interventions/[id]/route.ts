import { requireIdentity } from "@/lib/authz";
import { activateIntervention, decideIntervention, pauseIntervention, resumeIntervention, type InterventionDecision } from "@/lib/intervention-engine";
import { getResponseState } from "@/lib/response-state";
import { getDatabase, nowIso } from "@/lib/database";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireIdentity();
  const interventionId = (await context.params).id;
  const state = await getResponseState(identity.id);
  const intervention = state.interventions.find((item) => item.id === interventionId);
  if (!intervention) return Response.json({ error: "Intervention not found" }, { status: 404 });
  return Response.json({ intervention, responseAssessments: state.responseAssessments.filter((item) => item.interventionEpisodeId === interventionId) });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireIdentity();
  const interventionId = (await context.params).id;
  try {
    const body = await request.json() as { action?: "activate" | "pause" | "resume" | "decide"; startAt?: string; reason?: string; decision?: InterventionDecision };
    const db = await getDatabase();
    const linked = await db.prepare("SELECT source_experiment_id FROM intervention_episodes WHERE id=? AND member_id=?").bind(interventionId, identity.id).first<{ source_experiment_id: string | null }>();
    if (body.action === "activate") return Response.json(await activateIntervention(identity.id, interventionId, body.startAt));
    if (body.action === "pause") { const result = await pauseIntervention(identity.id, interventionId, body.reason || "Paused by member"); if (linked?.source_experiment_id) await db.prepare("UPDATE experiments SET status='paused',updated_at=? WHERE id=? AND member_id=? AND status='active'").bind(nowIso(), linked.source_experiment_id, identity.id).run(); return Response.json(result); }
    if (body.action === "resume") { const result = await resumeIntervention(identity.id, interventionId); if (linked?.source_experiment_id) await db.prepare("UPDATE experiments SET status='active',updated_at=? WHERE id=? AND member_id=? AND status='paused'").bind(nowIso(), linked.source_experiment_id, identity.id).run(); return Response.json(result); }
    if (body.action === "decide" && body.decision) { const result = await decideIntervention({ memberId: identity.id, interventionEpisodeId: interventionId, decision: body.decision, reason: body.reason || `Member chose ${body.decision}` }); if (linked?.source_experiment_id) await db.prepare("UPDATE experiments SET status='completed',updated_at=? WHERE id=? AND member_id=?").bind(nowIso(), linked.source_experiment_id, identity.id).run(); return Response.json(result); }
    return Response.json({ error: "Unsupported intervention action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not update intervention" }, { status: 400 });
  }
}
