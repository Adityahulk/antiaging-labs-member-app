import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { OutcomesExperience, OutcomesLoader } from "@/components/phase3-experiences";
export const metadata:Metadata={title:"Measured Progress — Antiaging Labs",description:"See longitudinal outcomes, model validation, and portable records.",openGraph:{title:"Measured Progress — Antiaging Labs",description:"See longitudinal outcomes without a hiding composite score.",images:[]},twitter:{title:"Measured Progress — Antiaging Labs",description:"See longitudinal outcomes without a hiding composite score.",images:[]}};
export default function OutcomesPage(){return <MemberShell><PageHeader eyebrow="MEASURED PROGRESS" title="Your direction, with receipts." description="Baseline to now, one outcome at a time—with data quality, source evidence, and honest uncertainty."/><OutcomesLoader/><OutcomesExperience/></MemberShell>}
