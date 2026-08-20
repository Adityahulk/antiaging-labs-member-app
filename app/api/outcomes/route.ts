import { requireIdentity } from "@/lib/authz";
import { computeMemberOutcomes } from "@/lib/phase3";
export async function GET(){const identity=await requireIdentity();return Response.json(await computeMemberOutcomes(identity.id),{headers:{"Cache-Control":"no-store"}});}
