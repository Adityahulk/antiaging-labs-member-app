import { requireIdentity } from "@/lib/authz";
import { exportFhirBundle } from "@/lib/interoperability";
import { requireJurisdictionFeature } from "@/lib/jurisdiction";
export async function POST(){const identity=await requireIdentity();await requireJurisdictionFeature(identity.id,"abdm");return Response.json(await exportFhirBundle(identity.id));}
