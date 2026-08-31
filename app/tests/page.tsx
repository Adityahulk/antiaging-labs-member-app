import { MemberShell, PageHeader } from "@/components/member-shell";
import { TestsExperience, UploadExperience } from "@/components/workflow-experiences";
import { DataGate } from "@/components/ui/data-gate";
export default function TestsPage() { return <MemberShell><PageHeader eyebrow="LABS & DNA" title="Use what you already have—or add what the Twin needs next." description="Upload existing results first. Order biomarkers or DNA only when they can improve a hypothesis, priority, or measurable follow-up." /><DataGate title="Loading the catalog…"><UploadExperience /><TestsExperience /></DataGate></MemberShell>; }
