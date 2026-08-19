import { getDatabase, nowIso } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getMemberIdentity();
  const sourceId = (await context.params).id;
  const body = await request.json() as { status?: "connected" | "disconnected" };
  if (!body.status) return Response.json({ error: "status is required" }, { status: 400 });
  const db = await getDatabase();
  const result = await db.prepare("UPDATE data_sources SET status = ?, last_sync_at = ?, updated_at = ? WHERE id = ? AND member_id = ?")
    .bind(body.status, body.status === "connected" ? nowIso() : null, nowIso(), sourceId, identity.id).run();
  return result.meta.changes ? Response.json({ id: sourceId, status: body.status }) : Response.json({ error: "Source not found" }, { status: 404 });
}
