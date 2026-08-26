import { requireIdentity } from "@/lib/authz";
import { checkInIntervention, recordContextEvent } from "@/lib/intervention-engine";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireIdentity();
  const interventionEpisodeId = (await context.params).id;
  try {
    const body = await request.json() as { scheduledAt?: string; occurredAt?: string | null; plannedValue?: string; actualValue?: string; adherence?: number; completed?: boolean; subjectiveResponse?: number | null; adverseEffect?: boolean; note?: string; context?: { type: string; severity: number; detail?: Record<string, unknown> } };
    const checkIn = await checkInIntervention({ memberId: identity.id, interventionEpisodeId, scheduledAt: body.scheduledAt || new Date().toISOString(), occurredAt: body.occurredAt ?? new Date().toISOString(), plannedValue: body.plannedValue, actualValue: body.actualValue, adherence: Number(body.adherence ?? (body.completed ? 1 : 0)), completed: Boolean(body.completed), subjectiveResponse: body.subjectiveResponse, adverseEffect: Boolean(body.adverseEffect), note: body.note });
    const contextEvent = body.context ? await recordContextEvent({ memberId: identity.id, interventionEpisodeId, occurredAt: body.occurredAt || new Date().toISOString(), type: body.context.type, severity: body.context.severity, detail: body.context.detail }) : null;
    return Response.json({ checkIn, contextEvent }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Check-in failed" }, { status: 400 });
  }
}
