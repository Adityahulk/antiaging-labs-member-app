import { MemberShell, PageHeader } from "@/components/member-shell";
import { AdminExperience } from "@/components/workflow-experiences";
export default function AdminPage() { return <MemberShell><PageHeader eyebrow="OPERATIONS" title="Every member, moving forward." description="Fulfillment, uploads, status updates, and exceptions in one operational queue." /><AdminExperience /></MemberShell>; }
