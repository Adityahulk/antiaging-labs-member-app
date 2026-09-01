import { MemberShell, PageHeader } from "@/components/member-shell";
import { TestsExperience, UploadExperience } from "@/components/workflow-experiences";
import { DataGate } from "@/components/ui/data-gate";
export default function TestsPage() { return <MemberShell><PageHeader eyebrow="TESTS" title="Tests." description="Upload first. Order only if it would change a follow-up." /><DataGate title="Loading the catalog…"><UploadExperience /><TestsExperience /></DataGate></MemberShell>; }
