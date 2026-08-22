import { getDatabase, nowIso } from "./database";
import type { MemberIdentity } from "./member";
import { configuredEmails, runtimeConfig } from "./integrations";

export type BetaStatus = "pending" | "approved" | "rejected";

export async function ensureBetaAccess(identity: MemberIdentity) {
  const db = await getDatabase();
  const existing = await db.prepare("SELECT * FROM beta_access WHERE member_id=?").bind(identity.id).first<Record<string, unknown>>();
  if (existing) return existing;
  const admin = configuredEmails(runtimeConfig().ADMIN_EMAILS).has(identity.email.toLowerCase()) || identity.id === "demo-member-arjun";
  const now = nowIso();
  await db.prepare("INSERT INTO beta_access (member_id,status,requested_at,approved_at,note,updated_at) VALUES (?,?,?, ?,?,?)")
    .bind(identity.id, admin ? "approved" : "pending", now, admin ? now : null, admin ? "Founder/admin access" : "Beta request submitted", now).run();
  return await db.prepare("SELECT * FROM beta_access WHERE member_id=?").bind(identity.id).first<Record<string, unknown>>();
}

export async function requestBetaAccess(identity: MemberIdentity) {
  const db = await getDatabase(); const now = nowIso();
  await db.prepare("INSERT INTO beta_access (member_id,status,requested_at,note,updated_at) VALUES (?,'pending',?,?,?) ON CONFLICT(member_id) DO UPDATE SET status='pending',requested_at=excluded.requested_at,note='Beta request submitted',updated_at=excluded.updated_at")
    .bind(identity.id, now, "Beta request submitted", now).run();
  await db.prepare("INSERT INTO admin_events (member_id,actor_id,action,entity_type,entity_id,detail_json,created_at) VALUES (?,?, 'beta.requested','beta_access',?,?,?)")
    .bind(identity.id, identity.id, identity.id, JSON.stringify({ status: "pending" }), now).run();
  return { status: "pending" as const };
}
