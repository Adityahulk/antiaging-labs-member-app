import { requireRole } from "@/lib/authz";
import { trainTargetModel } from "@/lib/model-service";
export async function POST(request:Request){await requireRole(["admin","practitioner"]);const body=await request.json() as {targetCode?:string};if(!body.targetCode)return Response.json({error:"Target code is required"},{status:400});return Response.json(await trainTargetModel(body.targetCode),{status:201});}
