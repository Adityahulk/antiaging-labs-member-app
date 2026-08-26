import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { OutcomesExperience, OutcomesLoader } from "@/components/phase3-experiences";
export const metadata:Metadata={title:"Your Results — Antiaging Labs",description:"See intervention-linked comparisons, uncertainty, confounders, and source evidence.",openGraph:{title:"Your Results — Antiaging Labs",description:"See what changed without pretending correlation proves cause.",images:[]},twitter:{title:"Your Results — Antiaging Labs",description:"See what changed without pretending correlation proves cause.",images:[]}};
export default function OutcomesPage(){return <MemberShell><PageHeader eyebrow="YOUR RESULTS" title="What changed—and what we learned." description="Inspect the comparison, intervention link, uncertainty, and confounders before choosing what happens next."/><OutcomesLoader/><OutcomesExperience/></MemberShell>}
