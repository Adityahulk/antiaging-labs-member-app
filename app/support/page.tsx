import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { SupportExperience } from "@/components/support-experience";
import { DataGate } from "@/components/ui/data-gate";

export const metadata: Metadata = { title: "Privacy & Support — Antiaging Labs", description: "Manage support, privacy choices, and data requests." };
export default function SupportPage() { return <MemberShell><PageHeader eyebrow="HELP" title="Support, privacy and your data rights." description="Contact the team, raise a non-urgent safety concern, or manage how your data is used." /><DataGate title="Loading your support history…"><SupportExperience /></DataGate></MemberShell>; }
