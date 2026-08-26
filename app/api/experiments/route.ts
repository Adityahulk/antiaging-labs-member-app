import { requireIdentity } from "@/lib/authz";
import { getDatabase, parseJson } from "@/lib/database";
import { activateIntervention, createIntervention, type OutcomeDirection } from "@/lib/intervention-engine";
import { requireJurisdictionFeature } from "@/lib/jurisdiction";
import { createExperiment, experimentTemplates, getMemberOutcomes } from "@/lib/phase3";

export async function GET() {
  const identity = await requireIdentity();
  await requireJurisdictionFeature(identity.id, "experiments");
  const state = await getMemberOutcomes(identity.id);
  return Response.json({ templates: experimentTemplates, experiments: state.experiments });
}

export async function POST(request: Request) {
  const identity = await requireIdentity();
  try {
    await requireJurisdictionFeature(identity.id, "experiments");
    const body = await request.json() as { templateCode?: string };
    const templateCode = String(body.templateCode ?? "");
    const template = experimentTemplates.find((item) => item.code === templateCode);
    if (!template) throw new Error("Unknown experiment template");

    const db = await getDatabase();
    const assessment = await db.prepare("SELECT p.id,p.goal_id,p.safety_decision_id,p.recommended_candidate_id,s.status safety_status FROM priority_assessments p JOIN safety_decisions s ON s.id=p.safety_decision_id WHERE p.member_id=? ORDER BY p.created_at DESC LIMIT 1")
      .bind(identity.id).first<{ id: string; goal_id: string | null; safety_decision_id: string; recommended_candidate_id: string | null; safety_status: string }>();
    if (!assessment || assessment.safety_status !== "eligible_for_wellness_experiment" || !assessment.recommended_candidate_id) throw new Error("Complete the priority and safety assessment before starting an experiment");
    const candidate = await db.prepare("SELECT id,experiment_templates_json FROM priority_candidates WHERE id=? AND member_id=?")
      .bind(assessment.recommended_candidate_id, identity.id).first<{ id: string; experiment_templates_json: string }>();
    if (!candidate || !parseJson<string[]>(candidate.experiment_templates_json, []).includes(templateCode)) throw new Error("This experiment is not linked to your current top measurable priority");
    const existingIntervention = await db.prepare("SELECT id FROM intervention_episodes WHERE member_id=? AND status='active' LIMIT 1").bind(identity.id).first();
    if (existingIntervention) throw new Error("Finish or pause the active intervention before starting another");

    const experiment = await createExperiment(identity.id, templateCode) as Record<string, unknown>;
    const intervention = await createIntervention({
      memberId: identity.id,
      goalId: assessment.goal_id,
      priorityCandidateId: candidate.id,
      safetyDecisionId: assessment.safety_decision_id,
      sourceExperimentId: String(experiment.id),
      title: template.title,
      category: "wellness_experiment",
      hypothesis: template.hypothesis,
      exactInstruction: template.b,
      doseOrDuration: `${template.methodology.durationDays} days`,
      frequency: template.methodology.designType,
      primaryOutcomeCode: template.outcome,
      outcomeDirection: template.methodology.outcome.direction as OutcomeDirection,
      outcomeUnit: template.unit,
      minimumBaselineDays: template.methodology.minimumUsableDays.perArm,
      minimumComparisonDays: template.methodology.minimumUsableDays.perArm,
      reviewAt: String(experiment.endAt),
      evidenceVersion: template.methodology.version,
    });
    await activateIntervention(identity.id, intervention.id, String(experiment.startAt));
    return Response.json({ ...experiment, interventionId: intervention.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not start experiment" }, { status: 400 });
  }
}
