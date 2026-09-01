import { MemberShell, PageHeader } from "@/components/member-shell";
import { TestsExperience, UploadExperience } from "@/components/workflow-experiences";
import { DataGate } from "@/components/ui/data-gate";
export default function TestsPage() { return <MemberShell><PageHeader eyebrow="TESTS" title="Upload what you have, or order what is missing." description="Start with existing results. Order labs or DNA only when they would change a hypothesis or a follow-up." /><DataGate title="Loading the catalog…"><UploadExperience /><TestsExperience /></DataGate></MemberShell>; }
