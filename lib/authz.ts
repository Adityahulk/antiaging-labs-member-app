import { getDatabase } from "./database";
import { getMemberIdentity, type MemberIdentity } from "./member";

export async function requireIdentity(): Promise<MemberIdentity> {
  return getMemberIdentity();
}

export async function requireRole(allowed: string[]): Promise<MemberIdentity> {
  const identity = await requireIdentity();
  const db = await getDatabase();
  const rows = await db.prepare("SELECT role FROM member_roles WHERE member_id = ?").bind(identity.id).all<{ role: string }>();
  if (!rows.results.some((row) => allowed.includes(row.role))) throw new Response("Forbidden", { status: 403 });
  return identity;
}
