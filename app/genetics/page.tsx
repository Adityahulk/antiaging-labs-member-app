import type { Metadata } from "next";
import { MemberShell,PageHeader } from "@/components/member-shell";
import { GeneticsExperience } from "@/components/genetics-experience";
import { DataGate } from "@/components/ui/data-gate";
export const metadata:Metadata={title:"Genetics — Antiaging Labs",description:"Quality-controlled inherited context and reproducible interpretation."};
export default function GeneticsPage(){return <MemberShell><PageHeader eyebrow="GENETICS" title="Your DNA." description="Context for hypotheses—not a prescription."/><DataGate title="Loading inherited context…"><GeneticsExperience/></DataGate></MemberShell>;}

