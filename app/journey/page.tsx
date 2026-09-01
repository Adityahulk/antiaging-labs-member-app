import { MemberShell, PageHeader } from "@/components/member-shell";
import { JourneyExperience } from "@/components/journey-experience";
import { DataGate } from "@/components/ui/data-gate";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Your Journey — Antiaging Labs", description: "Track every step from testing to measured progress.", openGraph: { title: "Your Journey — Antiaging Labs", description: "Track every step from testing to measured progress.", images: [] }, twitter: { title: "Your Journey — Antiaging Labs", description: "Track every step from testing to measured progress.", images: [] } };
export default function JourneyPage() { return <MemberShell><PageHeader eyebrow="TIMELINE" title="Where you are in the programme." description="Tests, connections, reports and retests in the order they actually happened." /><DataGate lines={4} title="Loading your journey…"><JourneyExperience /></DataGate></MemberShell>; }
