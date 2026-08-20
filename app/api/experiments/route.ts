import { requireIdentity } from "@/lib/authz";
import { createExperiment, experimentTemplates, getMemberOutcomes } from "@/lib/phase3";
import { requireJurisdictionFeature } from "@/lib/jurisdiction";
export async function GET(){const identity=await requireIdentity();await requireJurisdictionFeature(identity.id,"experiments");const state=await getMemberOutcomes(identity.id);return Response.json({templates:experimentTemplates,experiments:state.experiments});}
export async function POST(request:Request){const identity=await requireIdentity();try{await requireJurisdictionFeature(identity.id,"experiments");const body=await request.json() as {templateCode?:string};return Response.json(await createExperiment(identity.id,String(body.templateCode??"")),{status:201});}catch(error){return Response.json({error:error instanceof Error?error.message:"Could not start experiment"},{status:400});}}
