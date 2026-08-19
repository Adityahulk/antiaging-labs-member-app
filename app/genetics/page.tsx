import type { Metadata } from "next";
import { MemberShell,PageHeader } from "@/components/member-shell";
import { GeneticsExperience } from "@/components/genetics-experience";
export const metadata:Metadata={title:"Genetics — Antiaging Labs",description:"Quality-controlled inherited context and reproducible interpretation."};
export default function GeneticsPage(){return <MemberShell><PageHeader eyebrow="GENETICS" title="Inherited context, without the black box." description="Inspect quality, supported calls, evidence versions, ambiguity, and every released interpretation."/><GeneticsExperience/></MemberShell>;}

