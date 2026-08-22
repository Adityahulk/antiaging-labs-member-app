import type { ReactNode } from "react";
import { getAppAuthIdentity } from "@/lib/app-auth";
import { runtimeConfig } from "@/lib/integrations";
import { AuthForm } from "@/components/auth-form";

export async function AuthGate({ children }: { children: ReactNode }) {
  const user = await getAppAuthIdentity();
  if (user || runtimeConfig().ALLOW_DEMO_AUTH === "true") return children;

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <span className="auth-mark">A</span>
        <p className="eyebrow">ANTIAGING LABS MEMBER OS</p>
        <h1>Your health journey, in one place.</h1>
        <p>Sign in to see your tests, connected data, Biological Twin, reports, protocol, and personal guidance.</p>
        <AuthForm />
      </section>
    </main>
  );
}
