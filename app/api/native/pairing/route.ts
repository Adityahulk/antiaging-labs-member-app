import { requireIdentity } from "@/lib/authz";
import { createPairingCode, listCompanions } from "@/lib/native-health";
export async function GET(){const identity=await requireIdentity();return Response.json(await listCompanions(identity.id));}
export async function POST(request:Request){const identity=await requireIdentity();const body=await request.json() as {platform?:string};if(!["ios","android"].includes(body.platform??""))return Response.json({error:"Choose iOS or Android"},{status:400});return Response.json(await createPairingCode(identity.id,body.platform as "ios"|"android"),{status:201});}
