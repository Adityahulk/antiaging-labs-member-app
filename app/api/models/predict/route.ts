import { requireIdentity } from "@/lib/authz";
import { predictForMember } from "@/lib/model-service";
export async function POST(request:Request){const identity=await requireIdentity();const body=await request.json() as {targetCode?:string};if(!body.targetCode)return Response.json({error:"Target code is required"},{status:400});return Response.json(await predictForMember(identity.id,body.targetCode));}
