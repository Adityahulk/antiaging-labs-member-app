"use client";

import { FormEvent, useState } from "react";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "signup" && password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode === "signup" ? "signup" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, fullName, inviteCode }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not sign you in.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign you in.");
      setBusy(false);
    }
  }

  return <div className="auth-form-wrap">
    <div className="auth-tabs" role="tablist" aria-label="Account access">
      <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
      <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
    </div>
    <form className="auth-form" onSubmit={submit}>
      {mode === "signup" ? <label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required /></label> : null}
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={10} required /><small>Minimum 10 characters.</small></label>
      {mode === "signup" ? <label>Confirm password<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" minLength={10} required /></label> : null}
      {mode === "signup" ? <label>Founding cohort code <span className="optional-label">OPTIONAL</span><input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} autoComplete="off" placeholder="Enter your invitation code" /><small>A valid invitation opens the app immediately. You can also create an account and request access.</small></label> : null}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="primary-button auth-button" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create secure account →" : "Sign in securely →"}</button>
    </form>
    <p className="auth-note">Your account keeps your health data private and separate from every other member.</p>
  </div>;
}
