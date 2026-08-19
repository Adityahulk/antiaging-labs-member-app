import { integrationHealth } from "@/lib/integrations";
import { requireRole } from "@/lib/authz";
export async function GET() { await requireRole(["admin"]); return Response.json(integrationHealth()); }
