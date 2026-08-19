import { requireRole } from "@/lib/authz";
import { generateProtocol } from "@/lib/protocol-engine";
export async function POST(request: Request) { const actor = await requireRole(["admin", "practitioner"]); const body = await request.json().catch(() => ({})) as { memberId?: string }; return Response.json(await generateProtocol(body.memberId ?? actor.id), { status: 201 }); }
