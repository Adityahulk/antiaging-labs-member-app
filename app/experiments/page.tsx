import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { ExperimentsExperience } from "@/components/phase3-experiences";
import { DataGate } from "@/components/ui/data-gate";
export const metadata:Metadata={title:"Response Test Options — Antiaging Labs",description:"Review careful, measurable ways to learn what works for you.",openGraph:{title:"Response Test Options — Antiaging Labs",description:"Review one careful, measurable change at a time.",images:[]},twitter:{title:"Response Test Options — Antiaging Labs",description:"Review one careful, measurable change at a time.",images:[]}};
export default function ExperimentsPage(){return <MemberShell><PageHeader eyebrow="RESPONSE TEST OPTIONS" title="One useful question at a time." description="Review eligible options; only one focused response test can be active at once."/><DataGate title="Loading response test options…"><ExperimentsExperience/></DataGate></MemberShell>}
