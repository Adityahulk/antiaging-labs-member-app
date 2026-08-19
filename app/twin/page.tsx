import { MemberShell, PageHeader } from "@/components/member-shell";
import { TwinExperience } from "@/components/twin-experience";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Your Biological Twin — Antiaging Labs", description: "Explore your living, evidence-linked health map.", openGraph: { title: "Your Biological Twin — Antiaging Labs", description: "Explore your living, evidence-linked health map.", images: [] }, twitter: { title: "Your Biological Twin — Antiaging Labs", description: "Explore your living, evidence-linked health map.", images: [] } };
export default function TwinPage() { return <MemberShell><PageHeader eyebrow="YOUR BIOLOGICAL TWIN" title="Your health, alive and connected." description="Measured labs, personal wearable baselines, context, confidence, and protocol actions—joined without hiding uncertainty." /><TwinExperience /></MemberShell>; }
