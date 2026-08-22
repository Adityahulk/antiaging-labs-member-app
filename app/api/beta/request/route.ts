import { requestBetaAccess } from "@/lib/beta-access";
import { requireIdentity } from "@/lib/authz";

export async function POST() { const identity = await requireIdentity(); return Response.json(await requestBetaAccess(identity)); }
