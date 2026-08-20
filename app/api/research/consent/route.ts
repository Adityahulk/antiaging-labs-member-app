import { requireIdentity } from "@/lib/authz";
import { setResearchConsent } from "@/lib/phase3";
import { requireJurisdictionFeature } from "@/lib/jurisdiction";
export async function PUT(request:Request){const identity=await requireIdentity();await requireJurisdictionFeature(identity.id,"research");const body=await request.json() as {granted?:boolean};return Response.json(await setResearchConsent(identity.id,body.granted===true));}
