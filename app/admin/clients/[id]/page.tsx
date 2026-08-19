import { MemberShell } from "@/components/member-shell";
import { Client360 } from "@/components/client-360";
export default async function ClientPage({ params }: { params: Promise<{ id:string }> }) { const { id }=await params; return <MemberShell><Client360 memberId={id}/></MemberShell>; }
