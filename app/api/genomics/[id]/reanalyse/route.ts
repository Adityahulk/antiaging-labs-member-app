import { requireRole } from "@/lib/authz";
import { getDatabase } from "@/lib/database";
import { runGenomicReanalysis } from "@/lib/genomics";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){const actor=await requireRole(["admin","practitioner"]);const artifactId=(await context.params).id;const body=await request.json().catch(()=>({})) as {memberId?:string};let memberId=body.memberId;if(!memberId){const db=await getDatabase();memberId=(await db.prepare("SELECT member_id FROM genomic_artifacts WHERE id=?").bind(artifactId).first<{member_id:string}>())?.member_id;}if(!memberId)return Response.json({error:"Artifact not found"},{status:404});return Response.json(await runGenomicReanalysis(memberId,artifactId,`manual:${actor.id}`),{status:201});}

