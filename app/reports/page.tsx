import { MemberShell, PageHeader } from "@/components/member-shell";
import { ReportsExperience } from "@/components/reports-experience";
import { DataGate } from "@/components/ui/data-gate";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Reports — Antiaging Labs", description: "Versioned overview and deep-dive reports grounded in your data.", openGraph: { title: "Reports — Antiaging Labs", description: "Versioned overview and deep-dive reports grounded in your data.", images: [] }, twitter: { title: "Reports — Antiaging Labs", description: "Versioned overview and deep-dive reports grounded in your data.", images: [] } };
export default function ReportsPage() { return <MemberShell><PageHeader eyebrow="REPORTS" title="The complete story behind your data." description="Fast summaries and full analysis from the same immutable report version." /><DataGate title="Loading your reports…"><ReportsExperience /></DataGate></MemberShell>; }
