import { requireIdentity } from "@/lib/authz";
import { interoperabilityStatus } from "@/lib/interoperability";
export async function GET(){await requireIdentity();return Response.json(interoperabilityStatus());}
