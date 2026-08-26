import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { ExperimentsExperience } from "@/components/phase3-experiences";
export const metadata:Metadata={title:"Experiment Options — Antiaging Labs",description:"Review measurable self-experiments and your current active intervention.",openGraph:{title:"Experiment Options — Antiaging Labs",description:"Review one careful, measurable change at a time.",images:[]},twitter:{title:"Experiment Options — Antiaging Labs",description:"Review one careful, measurable change at a time.",images:[]}};
export default function ExperimentsPage(){return <MemberShell><PageHeader eyebrow="EXPERIMENT OPTIONS" title="One question at a time." description="Review eligible options; only one experiment can be active at once."/><ExperimentsExperience/></MemberShell>}
