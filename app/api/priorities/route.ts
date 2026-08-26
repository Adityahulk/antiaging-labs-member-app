import { requireIdentity } from "@/lib/authz";
import { getDatabase } from "@/lib/database";
import { createMemberGoal, createPriorityAssessment, derivePriorityCandidates, type SafetyInput } from "@/lib/priority-engine";
import { getResponseState } from "@/lib/response-state";

export async function GET() {
  const identity = await requireIdentity();
  return Response.json(await getResponseState(identity.id));
}

export async function POST(request: Request) {
  const identity = await requireIdentity();
  try {
    const body = await request.json() as { goal?: { statement?: string; desiredOutcome?: string; importance?: number }; safety?: SafetyInput };
    const db = await getDatabase();
    let goal = await db.prepare("SELECT id,statement,importance FROM member_goals WHERE member_id=? AND status='active' ORDER BY updated_at DESC LIMIT 1").bind(identity.id).first<{ id: string; statement: string; importance: number }>();
    if (body.goal?.statement) {
      const created = await createMemberGoal({ memberId: identity.id, statement: body.goal.statement, desiredOutcome: body.goal.desiredOutcome || "Learn which measurable change improves my near-term health response", importance: Number(body.goal.importance ?? 4) });
      goal = { id: created.id, statement: body.goal.statement, importance: Number(body.goal.importance ?? 4) };
    }
    if (!goal) {
      const member = await db.prepare("SELECT primary_goal FROM members WHERE id=?").bind(identity.id).first<{ primary_goal: string }>();
      const statement = member?.primary_goal || "Find the most useful measurable health priority";
      const created = await createMemberGoal({ memberId: identity.id, statement, desiredOutcome: "Identify one safe, measurable intervention to test", importance: 4 });
      goal = { id: created.id, statement, importance: 4 };
    }
    const derived = await derivePriorityCandidates(identity.id, goal.statement, goal.importance);
    const suppliedSafety = body.safety ?? {};
    const safety: SafetyInput = { ...derived.safety, ...suppliedSafety, missingRequiredData: [...new Set([...(derived.safety.missingRequiredData ?? []), ...(suppliedSafety.missingRequiredData ?? [])])] };
    const assessment = await createPriorityAssessment({ memberId: identity.id, goalId: goal.id, twinSnapshotId: derived.twinSnapshotId, safety, candidates: derived.candidates, evidenceVersion: "response-priority-2026-08", inputSnapshot: derived.inputSnapshot });
    return Response.json(assessment, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not calculate priorities" }, { status: 400 });
  }
}
