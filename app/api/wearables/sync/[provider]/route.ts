import { requireIdentity } from "@/lib/authz";
import { syncWearable } from "@/lib/wearables";
export async function POST(_request: Request, context: { params: Promise<{ provider: string }> }) { const identity = await requireIdentity(); try { return Response.json(await syncWearable(identity.id, (await context.params).provider.toLowerCase())); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 400 }); } }
