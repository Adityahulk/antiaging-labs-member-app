import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { ExperimentsExperience } from "@/components/phase3-experiences";
export const metadata:Metadata={title:"Personal Experiments — Antiaging Labs",description:"Run low-friction randomized self-experiments and learn from your own response.",openGraph:{title:"Personal Experiments — Antiaging Labs",description:"A careful n-of-1 lab built around your routines.",images:[]},twitter:{title:"Personal Experiments — Antiaging Labs",description:"A careful n-of-1 lab built around your routines.",images:[]}};
export default function ExperimentsPage(){return <MemberShell><PageHeader eyebrow="PERSONAL EXPERIMENTS" title="Find what works for you." description="Compare two routines, capture the response, and keep only what proves useful in your own life."/><ExperimentsExperience/></MemberShell>}
