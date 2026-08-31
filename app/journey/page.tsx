import { MemberShell, PageHeader } from "@/components/member-shell";
import { JourneyExperience } from "@/components/journey-experience";
import { DataGate } from "@/components/ui/data-gate";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Your Journey — Antiaging Labs", description: "Track every step from testing to measured progress.", openGraph: { title: "Your Journey — Antiaging Labs", description: "Track every step from testing to measured progress.", images: [] }, twitter: { title: "Your Journey — Antiaging Labs", description: "Track every step from testing to measured progress.", images: [] } };
export default function JourneyPage() { return <MemberShell><PageHeader eyebrow="YOUR JOURNEY" title="One clear path, from data to progress." description="Every test, connection, report, protocol, and retest milestone—updated from the real workflow." /><DataGate lines={4} title="Loading your journey…"><JourneyExperience /></DataGate></MemberShell>; }
