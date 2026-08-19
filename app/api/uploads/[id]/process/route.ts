import { requireIdentity } from "@/lib/authz";
import { processUpload } from "@/lib/upload-processing";
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) { const identity = await requireIdentity(); return Response.json(await processUpload(identity.id, (await context.params).id)); }
