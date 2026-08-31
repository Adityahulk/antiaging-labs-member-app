import { MemberShell, PageHeader } from "../../components/member-shell";
import type { Metadata } from "next";
import { DataExperience } from "@/components/data-experience";
import { DataGate } from "@/components/ui/data-gate";

export const metadata: Metadata = {
  title: "Your Data — Antiaging Labs",
  description: "See every connected source, metric, update, and calculation used by your app.",
  openGraph: { title: "Your Data — Antiaging Labs", description: "Everything connected and visible in one place.", images: [] },
  twitter: { title: "Your Data — Antiaging Labs", description: "Everything connected and visible in one place.", images: [] },
};

export default function DataPage() {
  return (
    <MemberShell>
      <PageHeader eyebrow="YOUR DATA" title="Everything connected, nothing hidden." description="See every source, metric, update, and calculation used across your Twin and protocol." action={<a className="primary-button" href="#wearables"><span>＋ Add data</span><span>→</span></a>} />
      <DataGate lines={4} title="Loading your sources…"><DataExperience /></DataGate>
    </MemberShell>
  );
}
