import { requireRole } from "@/lib/authz";
import { createDatabaseBackup, listDatabaseBackups, verifyDatabaseBackup } from "@/lib/backups";

export async function GET() { await requireRole(["admin"]); return Response.json(await listDatabaseBackups()); }

export async function POST(request: Request) {
  const actor = await requireRole(["admin"]); const body = await request.json().catch(() => ({})) as { action?: "create" | "verify"; id?: string };
  try {
    if (body.action === "verify" && body.id) return Response.json(await verifyDatabaseBackup(body.id));
    return Response.json(await createDatabaseBackup(actor.id), { status: 201 });
  } catch (caught) { return Response.json({ error: caught instanceof Error ? caught.message : "Backup operation failed" }, { status: 500 }); }
}
