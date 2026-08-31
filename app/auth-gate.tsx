import type { ReactNode } from "react";
import { getAppAuthIdentity } from "@/lib/app-auth";
import { runtimeConfig } from "@/lib/integrations";
import { AuthForm } from "@/components/auth-form";
import { ensureMemberSeed } from "@/lib/seed";
import { ensureBetaAccess } from "@/lib/beta-access";
import { BetaGate } from "@/components/beta-gate";

export async function AuthGate({ children }: { children: ReactNode }) {
  const user = await getAppAuthIdentity();
  if (runtimeConfig().ALLOW_DEMO_AUTH === "true") return children;
  if (user) {
    await ensureMemberSeed(user);
    const beta = await ensureBetaAccess(user);
    if (String(beta?.status) !== "approved") return <BetaGate status={String(beta?.status ?? "pending")} />;
    return children;
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <span className="auth-mark">A</span>
        <p className="eyebrow">YOUR PERSONAL RESPONSE TWIN</p>
        <h1>Your body doesn’t respond like everyone else’s.</h1>
        <p>Antiaging Labs combines your bloodwork, DNA and wearable data to build your plan, measure your response and learn what actually works for you.</p>
        <p className="auth-proof-line"><strong>One focused change at a time.</strong> Measured against your own baseline.</p>
        <AuthForm />
      </section>
    </main>
  );
}
