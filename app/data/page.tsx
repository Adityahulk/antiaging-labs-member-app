import { MemberShell, PageHeader } from "../../components/member-shell";
import type { Metadata } from "next";
import { DataExperience } from "@/components/data-experience";
import { DataGate } from "@/components/ui/data-gate";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your Data — Antiaging Labs",
  description: "See every connected source, metric, update, and calculation used by your app.",
  openGraph: { title: "Your Data — Antiaging Labs", description: "Everything connected and visible in one place.", images: [] },
  twitter: { title: "Your Data — Antiaging Labs", description: "Everything connected and visible in one place.", images: [] },
};

export default function DataPage() {
  return (
    <MemberShell>
      <PageHeader eyebrow="DATA" title="Your connected health data." description="Wearables, labs and DNA in one place—plus reports, tests and timeline." action={<ButtonLink href="#wearables">Add data</ButtonLink>} />
      <DataGate lines={4} title="Loading your sources…"><DataExperience /></DataGate>
    </MemberShell>
  );
}
