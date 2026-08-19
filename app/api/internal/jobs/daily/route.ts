import { requireRole } from "@/lib/authz";
import { runDailyJobs } from "@/lib/daily-jobs";
export async function POST(){await requireRole(["admin"]);return Response.json(await runDailyJobs());}
