import { requireRole } from "@/lib/authz";
import { generateReport } from "@/lib/report-engine";
export async function POST(request: Request) { const actor = await requireRole(["admin", "practitioner"]); const body = await request.json() as { memberId?: string; type?: "biomarkers" | "wearables" | "twin" | "genetics" }; return Response.json(await generateReport(body.memberId ?? actor.id, body.type ?? "twin"), { status: 201 }); }
