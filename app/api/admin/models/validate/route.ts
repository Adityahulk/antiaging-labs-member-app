import { requireRole } from "@/lib/authz";
import { validateTargetModel } from "@/lib/model-service";
export async function POST(request:Request){const identity=await requireRole(["admin"]);try{const body=await request.json() as {modelId:string;prospectiveStudyId:string;evaluation:{n:number;mae:number;coverage:number;maxSubgroupMaeRatio:number;datasetHash:string}};return Response.json(await validateTargetModel(body.modelId,body.prospectiveStudyId,identity.id,body.evaluation));}catch(error){return Response.json({error:error instanceof Error?error.message:"Validation failed"},{status:400});}}
