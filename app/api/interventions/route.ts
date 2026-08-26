import { requireIdentity } from "@/lib/authz";
import { createIntervention, type OutcomeDirection } from "@/lib/intervention-engine";
import { getResponseState } from "@/lib/response-state";

export async function GET() {
  const identity = await requireIdentity();
  const state = await getResponseState(identity.id);
  return Response.json({ interventions: state.interventions, responseAssessments: state.responseAssessments });
}

export async function POST(request: Request) {
  const identity = await requireIdentity();
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await createIntervention({
      memberId: identity.id,
      goalId: typeof body.goalId === "string" ? body.goalId : null,
      priorityCandidateId: typeof body.priorityCandidateId === "string" ? body.priorityCandidateId : null,
      safetyDecisionId: String(body.safetyDecisionId ?? ""),
      sourceExperimentId: typeof body.sourceExperimentId === "string" ? body.sourceExperimentId : null,
      title: String(body.title ?? ""), category: String(body.category ?? "wellness"), hypothesis: String(body.hypothesis ?? ""), exactInstruction: String(body.exactInstruction ?? ""),
      doseOrDuration: typeof body.doseOrDuration === "string" ? body.doseOrDuration : null, frequency: String(body.frequency ?? "daily"), primaryOutcomeCode: String(body.primaryOutcomeCode ?? ""), outcomeDirection: String(body.outcomeDirection ?? "descriptive_only") as OutcomeDirection, outcomeUnit: String(body.outcomeUnit ?? ""),
      targetMin: typeof body.targetMin === "number" ? body.targetMin : null, targetMax: typeof body.targetMax === "number" ? body.targetMax : null, minimumBaselineDays: Number(body.minimumBaselineDays ?? 7), minimumComparisonDays: Number(body.minimumComparisonDays ?? 7), reviewAt: String(body.reviewAt ?? ""), evidenceVersion: String(body.evidenceVersion ?? "response-intervention-2026-08"),
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not create intervention" }, { status: 400 });
  }
}
