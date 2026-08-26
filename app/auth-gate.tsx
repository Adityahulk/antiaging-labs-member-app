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
        <h1>Learn what actually works for your body.</h1>
        <p>Connect inherited context, biomarkers and daily signals. Test one safe change at a time and measure your response.</p>
        <AuthForm />
      </section>
    </main>
  );
}
