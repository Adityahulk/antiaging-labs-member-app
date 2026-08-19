import { getDatabase, nowIso } from "@/lib/database";
import { getMemberIdentity } from "@/lib/member";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getMemberIdentity();
  const actionId = Number((await context.params).id);
  const body = await request.json() as { done?: boolean };
  if (!Number.isInteger(actionId) || typeof body.done !== "boolean") return Response.json({ error: "Invalid action" }, { status: 400 });
  const db = await getDatabase();
  const result = await db.prepare("UPDATE protocol_actions SET done = ?, done_at = ? WHERE id = ? AND member_id = ?")
    .bind(body.done ? 1 : 0, body.done ? nowIso() : null, actionId, identity.id).run();
  if (!result.meta.changes) return Response.json({ error: "Action not found" }, { status: 404 });
  return Response.json({ id: actionId, done: body.done });
}
