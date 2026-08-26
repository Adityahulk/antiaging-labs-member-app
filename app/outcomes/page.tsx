import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { OutcomesLoader } from "@/components/phase3-experiences";
import { CustomerResultsExperience } from "@/components/customer-results-experience";
export const metadata:Metadata={title:"Your Results — Antiaging Labs",description:"See intervention-linked comparisons, uncertainty, confounders, and source evidence.",openGraph:{title:"Your Results — Antiaging Labs",description:"See what changed without pretending correlation proves cause.",images:[]},twitter:{title:"Your Results — Antiaging Labs",description:"See what changed without pretending correlation proves cause.",images:[]}};
export default function OutcomesPage(){return <MemberShell><PageHeader eyebrow="YOUR RESULTS" title="What changed—and what we learned." description="Experiment results show your response to one change. Health trends show movement without claiming what caused it."/><OutcomesLoader/><CustomerResultsExperience/></MemberShell>}
