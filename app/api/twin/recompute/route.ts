import { requireIdentity } from "@/lib/authz";
import { recomputeTwin } from "@/lib/twin-engine";
export async function POST() { const identity = await requireIdentity(); return Response.json(await recomputeTwin(identity.id), { status: 201 }); }
