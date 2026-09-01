"use client";
import { useState } from "react";

export function BetaGate({ status }: { status: string }) {
  const [requested, setRequested] = useState(status === "pending"); const [busy,setBusy]=useState(false); const [notice,setNotice]=useState("");
  const request=async()=>{setBusy(true);setNotice("");try{const response=await fetch("/api/beta/request",{method:"POST"});const result=await response.json().catch(()=>({})) as {error?:string};if(!response.ok)throw new Error(result.error??"Could not submit the request yet.");setRequested(true);setNotice("Your request is with the Antiaging Labs team.");}catch(error){setNotice(error instanceof Error?error.message:"Could not submit the request yet.");}finally{setBusy(false);}};
  return <main className="auth-screen"><section className="auth-card"><span className="auth-mark">A</span><p className="eyebrow">ANTIAGING LABS PRIVATE BETA</p><h1>Invite-only for now.</h1><p>Request access and we’ll enable your account when confirmed.</p>{requested?<div className="workflow-notice">✓ {notice || "Your beta request is pending review."}</div>:<button className="primary-button" disabled={busy} onClick={()=>void request()} type="button"><span>{busy?"Sending…":"Request beta access"}</span><span>→</span></button>}<a className="quiet-button" href="/auth/logout">Sign out</a></section></main>;
}
