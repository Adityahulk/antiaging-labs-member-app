import { MemberShell, PageHeader } from "@/components/member-shell";
import { AdminPhase2 } from "@/components/admin-phase2";
export default function AdminPage() { return <MemberShell><PageHeader eyebrow="OPERATIONS" title="Every member, moving forward." description="Fulfillment, data quality, genomic review, assisted drafting, publication, and chat QA in one operational system." /><AdminPhase2 /></MemberShell>; }
