import { MemberShell, PageHeader } from "@/components/member-shell";
import { OnboardingExperience } from "@/components/onboarding-experience";
import { DataGate } from "@/components/ui/data-gate";
export default function IntakePage() { return <MemberShell><PageHeader eyebrow="YOUR CONTEXT" title="Start with what matters to you." description="Essential questions first, deeper context when it becomes relevant. Your answers save as you go." /><DataGate title="Loading your questions…"><OnboardingExperience /></DataGate></MemberShell>; }
