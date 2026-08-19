import { requireIdentity } from "@/lib/authz";
import { connectWearable } from "@/lib/wearables";
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) { const identity = await requireIdentity(); const origin = new URL(request.url).origin; try { return Response.json(await connectWearable(identity, (await context.params).provider.toLowerCase(), origin)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Connection failed" }, { status: 400 }); } }
