import { MemberShell, PageHeader } from "@/components/member-shell";
import { AdminBackupPanel, AdminExperience, AdminSupportPanel, BetaRequestsPanel } from "@/components/workflow-experiences";
import { AdminPhase3 } from "@/components/phase3-experiences";
export default function AdminPage() { return <MemberShell><PageHeader eyebrow="OPERATIONS" title="Every member, moving forward." description="Concierge fulfillment, data quality, assisted drafting, validation, and connector health in one operational system." /><AdminBackupPanel /><AdminSupportPanel /><BetaRequestsPanel /><AdminExperience /><AdminPhase3 /></MemberShell>; }
