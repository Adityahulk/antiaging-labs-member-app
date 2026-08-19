import { requireRole } from "@/lib/authz";
import { submitOrderToLab } from "@/lib/lab-adapter";
export async function POST(_:Request,context:{params:Promise<{id:string}>}){const actor=await requireRole(["admin","practitioner"]);try{return Response.json(await submitOrderToLab((await context.params).id,actor.id),{status:201});}catch(error){return Response.json({error:error instanceof Error?error.message:"Could not submit order"},{status:400});}}

