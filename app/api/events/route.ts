import { requireIdentity } from "@/lib/authz";
import { recordProductEvent } from "@/lib/priority-engine";

export async function POST(request: Request) {
  const identity = await requireIdentity();
  try {
    const body = await request.json() as { eventName?: string; journeyState?: string | null; source?: string; cohortCode?: string | null; sessionId?: string | null };
    return Response.json(await recordProductEvent({ eventName: String(body.eventName ?? ""), memberId: identity.id, journeyState: body.journeyState, source: body.source || "member_app", cohortCode: body.cohortCode, sessionId: body.sessionId }), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Event rejected" }, { status: 400 });
  }
}
