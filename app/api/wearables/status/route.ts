import { requireIdentity } from "@/lib/authz";
import { getDatabase } from "@/lib/database";
import { refreshWearableConnections } from "@/lib/wearables";
export async function GET() { const identity = await requireIdentity(); try { await refreshWearableConnections(identity.id); } catch { /* retain local status during provider outage */ } const db = await getDatabase(); const rows = await db.prepare("SELECT id, provider, status, last_sync_at, error, updated_at FROM wearable_connections WHERE member_id = ? AND provider != 'open_wearables_profile' ORDER BY provider").bind(identity.id).all(); return Response.json(rows.results); }
