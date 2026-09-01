import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { ExperimentsExperience } from "@/components/phase3-experiences";
import { DataGate } from "@/components/ui/data-gate";
export const metadata:Metadata={title:"Response Test Options — Antiaging Labs",description:"Review careful, measurable ways to learn what works for you.",openGraph:{title:"Response Test Options — Antiaging Labs",description:"Review one careful, measurable change at a time.",images:[]},twitter:{title:"Response Test Options — Antiaging Labs",description:"Review one careful, measurable change at a time.",images:[]}};
export default function ExperimentsPage(){return <MemberShell><PageHeader eyebrow="FOCUS OPTIONS" title="Choose one thing to learn next." description="Only one focused change can be active at a time."/><DataGate title="Loading response test options…"><ExperimentsExperience/></DataGate></MemberShell>}
