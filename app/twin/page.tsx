import { MemberShell, PageHeader } from "@/components/member-shell";
import { TwinExperience } from "@/components/twin-experience";
import { DataGate } from "@/components/ui/data-gate";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "My Response Twin — Antiaging Labs", description: "See what is measured, what appears important, what is being tested and what has been learned.", openGraph: { title: "My Response Twin — Antiaging Labs", description: "A living model of your biology and your personal responses.", images: [] }, twitter: { title: "My Response Twin — Antiaging Labs", description: "A living model of your biology and your personal responses.", images: [] } };
export default function TwinPage() { return <MemberShell><PageHeader eyebrow="MY RESPONSE TWIN" title="A living model of your biology—and how you respond." description="See what is measured, what appears important, what is being tested, and what your own results have taught us so far." /><DataGate lines={4} title="Building your Twin view…"><TwinExperience /></DataGate></MemberShell>; }
