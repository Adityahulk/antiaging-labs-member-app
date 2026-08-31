import { MemberShell, PageHeader } from "@/components/member-shell";
import { BetaRequestsPanel } from "@/components/workflow-experiences";
import { AdminAdvancedPanel } from "@/components/admin-advanced-panel";
export default function AdminPage() { return <MemberShell><PageHeader eyebrow="OPERATIONS" title="Every member, moving forward." description="Beta access loads first. Detailed queues and operations are available on demand." /><BetaRequestsPanel /><AdminAdvancedPanel /></MemberShell>; }
