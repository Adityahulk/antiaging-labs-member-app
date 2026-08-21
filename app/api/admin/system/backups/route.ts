import { requireRole } from "@/lib/authz";
import { createDatabaseBackup, listDatabaseBackups, verifyDatabaseBackup } from "@/lib/backups";
import { runtimeConfig, timingSafeEqual } from "@/lib/integrations";

export async function GET() { await requireRole(["admin"]); return Response.json(await listDatabaseBackups()); }

export async function POST(request: Request) {
  const configuredKey = runtimeConfig().BACKUP_RUN_KEY;
  const suppliedKey = request.headers.get("x-backup-run-key");
  const maintenanceAuthorized = Boolean(configuredKey && suppliedKey && timingSafeEqual(configuredKey, suppliedKey));
  const actorId = maintenanceAuthorized ? "system:backup-trigger" : (await requireRole(["admin"])).id;
  const body = await request.json().catch(() => ({})) as { action?: "create" | "verify"; id?: string };
  try {
    if (body.action === "verify" && body.id) return Response.json(await verifyDatabaseBackup(body.id));
    return Response.json(await createDatabaseBackup(actorId), { status: 201 });
  } catch (caught) { return Response.json({ error: caught instanceof Error ? caught.message : "Backup operation failed" }, { status: 500 }); }
}
