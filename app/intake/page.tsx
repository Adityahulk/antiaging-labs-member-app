import { MemberShell, PageHeader } from "@/components/member-shell";
import { OnboardingExperience } from "@/components/onboarding-experience";
import { DataGate } from "@/components/ui/data-gate";
export default function IntakePage() { return <MemberShell><PageHeader eyebrow="INTAKE" title="What matters to you." /><DataGate title="Loading your questions…"><OnboardingExperience /></DataGate></MemberShell>; }
