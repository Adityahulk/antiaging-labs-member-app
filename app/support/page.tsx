import type { Metadata } from "next";
import { MemberShell, PageHeader } from "@/components/member-shell";
import { SupportExperience } from "@/components/support-experience";
import { DataGate } from "@/components/ui/data-gate";

export const metadata: Metadata = { title: "Privacy & Support — Antiaging Labs", description: "Manage support, privacy choices, and data requests." };
export default function SupportPage() { return <MemberShell><PageHeader eyebrow="HELP" title="Help and data rights." /><DataGate title="Loading your support history…"><SupportExperience /></DataGate></MemberShell>; }
