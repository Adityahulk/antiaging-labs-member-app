import { requireRole } from "@/lib/authz";
import { runPhase3Jobs } from "@/lib/phase3";
export async function POST(){await requireRole(["admin"]);return Response.json(await runPhase3Jobs());}
