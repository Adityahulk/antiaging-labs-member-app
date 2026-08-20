import { requireIdentity } from "@/lib/authz";
import { checkInExperiment } from "@/lib/phase3";
export async function PATCH(request:Request){const identity=await requireIdentity();try{const body=await request.json() as {periodId:string;completed:boolean;adherence?:number;context?:string};return Response.json(await checkInExperiment(identity.id,body.periodId,body));}catch(error){return Response.json({error:error instanceof Error?error.message:"Check-in failed"},{status:400});}}
