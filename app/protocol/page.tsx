import { MemberShell, PageHeader } from "../../components/member-shell";
import { ProtocolExperience } from "../../components/protocol-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Protocol — Antiaging Labs",
  description: "Your personalized daily, weekly, and 12-week health protocol.",
  openGraph: { title: "Your Protocol — Antiaging Labs", description: "A personalized protocol built to be understood and lived.", images: [] },
  twitter: { title: "Your Protocol — Antiaging Labs", description: "A personalized protocol built to be understood and lived.", images: [] },
};

export default function ProtocolPage() {
  return (
    <MemberShell>
      <PageHeader eyebrow="YOUR PROTOCOL" title="A plan built to be lived." description="Specific actions, clear reasons, and daily guidance that adapts with you." action={<div className="version-pill">V2 <span>Published 12 Aug</span></div>} />
      <ProtocolExperience />
    </MemberShell>
  );
}
