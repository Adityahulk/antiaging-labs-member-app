import { requireIdentity } from "@/lib/authz";
import { disconnectWearable } from "@/lib/wearables";
export async function DELETE(_request: Request, context: { params: Promise<{ provider: string }> }) { const identity = await requireIdentity(); return Response.json(await disconnectWearable(identity.id, (await context.params).provider.toLowerCase())); }
