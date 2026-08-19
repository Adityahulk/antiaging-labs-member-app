import { MemberShell, PageHeader } from "@/components/member-shell";
import { TestsExperience } from "@/components/workflow-experiences";
export default function TestsPage() { return <MemberShell><PageHeader eyebrow="TESTS & TRACKING" title="Book once. Follow every step." description="Choose a module, complete payment, and see every booking, kit, collection, and result update here." /><TestsExperience /></MemberShell>; }
