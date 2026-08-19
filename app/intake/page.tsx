import { MemberShell, PageHeader } from "@/components/member-shell";
import { IntakeExperience } from "@/components/workflow-experiences";
export default function IntakePage() { return <MemberShell><PageHeader eyebrow="HEALTH INTAKE" title="The context that makes your plan personal." description="Short, adaptive steps. Every answer saves automatically and can be changed later." /><IntakeExperience /></MemberShell>; }
