import { MemberShell, PageHeader } from "@/components/member-shell";
import { AdminPhase2 } from "@/components/admin-phase2";
import { AdminPhase3 } from "@/components/phase3-experiences";
export default function AdminPage() { return <MemberShell><PageHeader eyebrow="OPERATIONS" title="Every member, moving forward." description="Fulfillment, data quality, genomic review, assisted drafting, validation, and connector health in one operational system." /><AdminPhase2 /><AdminPhase3 /></MemberShell>; }
