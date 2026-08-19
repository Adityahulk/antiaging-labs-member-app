import { requireRole } from "@/lib/authz";
import { approveReport } from "@/lib/report-engine";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { const actor = await requireRole(["admin", "practitioner"]); const body = await request.json().catch(() => ({})) as { memberId?: string; note?: string }; return Response.json(await approveReport(body.memberId ?? actor.id, (await context.params).id, actor.id, body.note ?? "Reviewed and approved")); }
