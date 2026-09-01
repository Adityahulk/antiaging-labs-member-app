import { getDatabase, nowIso } from "@/lib/database";
import { hashPassword, validPassword, verifyPassword } from "@/lib/app-auth";
import { requireIdentity } from "@/lib/authz";

export async function POST(request: Request) {
  const identity = await requireIdentity();
  const body = await request.json().catch(() => ({})) as { currentPassword?: unknown; newPassword?: unknown };
  if (!validPassword(body.currentPassword) || !validPassword(body.newPassword)) return Response.json({ error: "Both passwords must contain at least 10 characters." }, { status: 400 });
  if (body.currentPassword === body.newPassword) return Response.json({ error: "Choose a different new password." }, { status: 400 });
  const db = await getDatabase();
  const credential = await db.prepare("SELECT password_hash,password_salt FROM auth_credentials WHERE member_id=?").bind(identity.id).first<{ password_hash: string; password_salt: string }>();
  if (!credential || !(await verifyPassword(body.currentPassword, credential.password_salt, credential.password_hash))) return Response.json({ error: "Current password is incorrect." }, { status: 403 });
  const replacement = await hashPassword(body.newPassword);
  await db.prepare("UPDATE auth_credentials SET password_hash=?,password_salt=?,updated_at=? WHERE member_id=?").bind(replacement.hash, replacement.salt, nowIso(), identity.id).run();
  return Response.json({ changed: true });
}
