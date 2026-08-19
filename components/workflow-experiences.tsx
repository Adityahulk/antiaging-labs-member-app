"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppData } from "./app-provider";

const questions = [
  { code: "primary_goal", module: "goals", label: "What is your main health goal right now?", type: "textarea", why: "This anchors your protocol priorities." },
  { code: "height", module: "body", label: "Height (cm)", type: "number", why: "Used for body-composition and derived calculations." },
  { code: "weight", module: "body", label: "Weight (kg)", type: "number", why: "Helps calculate trends and training targets." },
  { code: "diagnoses", module: "medical", label: "Current diagnoses or past surgeries", type: "textarea", why: "Adds important context to analysis and protocol design." },
  { code: "medications", module: "medical", label: "Medications and regular supplements", type: "textarea", why: "Keeps recommendations compatible with your current routine." },
  { code: "diet_pattern", module: "nutrition", label: "Describe a typical weekday of eating", type: "textarea", why: "Lets the protocol fit your cuisine and schedule." },
  { code: "training", module: "activity", label: "Current weekly exercise", type: "textarea", why: "Sets a realistic training baseline." },
  { code: "sleep_window", module: "sleep", label: "Usual sleep and wake time", type: "text", why: "Supports circadian and recovery planning." },
  { code: "stress", module: "mind", label: "Average stress level (1–10)", type: "number", why: "Shapes recovery load and habit pacing." },
  { code: "constraints", module: "constraints", label: "Budget, travel, kitchen, injury, or schedule constraints", type: "textarea", why: "A perfect protocol is one you can actually follow." },
  { code: "family_history", module: "history", label: "Important first-degree family history", type: "textarea", why: "Adds inherited and preventive context." },
  { code: "preferences", module: "coaching", label: "What kind of coaching works best for you?", type: "textarea", why: "Personalizes language, reminders, and cadence." },
];

export function IntakeExperience() {
  const { refresh } = useAppData();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/intake").then((r) => r.json()).then((rows: Array<{ questionCode: string; answer: unknown }>) => setAnswers(Object.fromEntries(rows.map((row) => [row.questionCode, String(row.answer ?? "")])))).catch(() => undefined); }, []);
  const question = questions[index];
  const completed = Object.values(answers).filter(Boolean).length;
  const save = async () => {
    if (!answers[question.code]?.trim()) return;
    setSaving(true);
    await fetch("/api/intake", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionCode: question.code, module: question.module, answer: answers[question.code] }) });
    setSaving(false);
    if (index < questions.length - 1) setIndex(index + 1); else await refresh();
  };
  return <section className="intake-layout">
    <aside className="intake-progress paper-card"><span className="card-kicker">YOUR CONTEXT</span><strong>{completed}/{questions.length}</strong><p>answers saved</p><div className="summary-bar"><i style={{ width: `${completed / questions.length * 100}%` }} /></div><ol>{["Goals & body", "Medical context", "Daily life", "Preferences"].map((item, i) => <li className={Math.floor(index / 3) >= i ? "active" : ""} key={item}>{i + 1}. {item}</li>)}</ol></aside>
    <article className="intake-card paper-card"><div className="intake-count">QUESTION {index + 1} OF {questions.length}</div><h2>{question.label}</h2><p>{question.why}</p>{question.type === "textarea" ? <textarea value={answers[question.code] ?? ""} onChange={(e) => setAnswers({ ...answers, [question.code]: e.target.value })} /> : <input type={question.type} value={answers[question.code] ?? ""} onChange={(e) => setAnswers({ ...answers, [question.code]: e.target.value })} />}<div className="intake-actions"><button disabled={index === 0} onClick={() => setIndex(index - 1)} className="quiet-button" type="button">Back</button><button disabled={saving || !answers[question.code]?.trim()} onClick={() => void save()} className="primary-button" type="button"><span>{index === questions.length - 1 ? "Complete intake" : saving ? "Saving…" : "Save & continue"}</span><span>→</span></button></div></article>
  </section>;
}

export function TestsExperience() {
  const { data, refresh } = useAppData();
  const [booking, setBooking] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const book = async (type: "biomarker" | "genetics") => {
    setBooking(type); setNotice("");
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ type, city: "Hyderabad", preferredDate: type === "biomarker" ? new Date(Date.now() + 3 * 86400000).toISOString() : undefined }) });
    const result = await response.json() as { reference?: string; error?: string };
    setNotice(response.ok ? `${result.reference} is paid and queued for concierge confirmation.` : result.error ?? "Could not create order");
    setBooking(null); if (response.ok) await refresh();
  };
  return <><section className="test-catalog"><article className="test-product paper-card"><span className="test-letter">B</span><span className="card-kicker">BIOMARKERS</span><h2>Advanced Longevity Panel</h2><p>74 markers with at-home collection, normalized analysis, Twin integration, and protocol update.</p><ul><li>Concierge booking</li><li>Overview + deep-dive report</li><li>Before/after comparison</li></ul><div><strong>₹18,999</strong><button onClick={() => void book("biomarker")} disabled={Boolean(booking)} className="primary-button" type="button"><span>{booking === "biomarker" ? "Creating…" : "Book panel"}</span><span>→</span></button></div></article><article className="test-product paper-card"><span className="test-letter genetics">G</span><span className="card-kicker">GENETICS</span><h2>Longevity Genetics Array</h2><p>At-home kit, raw-data vault, inherited context, and a readable genetics report.</p><ul><li>Kit shipping and tracking</li><li>QC and interpretation</li><li>Cross-modal Twin context</li></ul><div><strong>₹29,999</strong><button onClick={() => void book("genetics")} disabled={Boolean(booking)} className="primary-button" type="button"><span>{booking === "genetics" ? "Creating…" : "Order kit"}</span><span>→</span></button></div></article></section>{notice ? <div className="workflow-notice">✓ {notice}</div> : null}<section className="paper-card order-table"><div className="section-head compact"><div><span className="card-kicker">YOUR ORDERS</span><h2>Tracking and fulfillment</h2></div></div>{data?.orders.map((order) => <div className="order-table-row" key={String(order.id)}><span><strong>{String(order.productName)}</strong><small>{String(order.reference)} · {String(order.vendor ?? "Concierge")}</small></span><span className="status-pill sage">{String(order.status).replaceAll("_", " ")}</span><span><strong>{String(order.paymentStatus)}</strong><small>₹{(Number(order.amountPaise) / 100).toLocaleString("en-IN")}</small></span>{order.trackingUrl ? <a href={String(order.trackingUrl)} target="_blank" rel="noreferrer">Track →</a> : <span>Updates here →</span>}</div>)}</section></>;
}

export function UploadExperience() {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setNotice("");
    const response = await fetch("/api/uploads", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json() as { fileName?: string; error?: string };
    setNotice(response.ok ? `${result.fileName} received and queued for processing.` : result.error ?? "Upload failed");
    setBusy(false); if (response.ok) event.currentTarget.reset();
  };
  return <form className="upload-panel paper-card" onSubmit={submit}><div><span className="card-kicker">IMPORT HEALTH DATA</span><h2>Add a lab, Apple Health, Garmin, or genetics export.</h2><p>PDF, CSV, JSON, XML, TXT, or ZIP · up to 25 MB</p></div><select name="type" aria-label="Data type"><option value="lab_report">Lab report</option><option value="apple_health">Apple Health export</option><option value="garmin">Garmin export</option><option value="genetics">Genetics raw data</option></select><input name="file" type="file" required /><button disabled={busy} className="primary-button" type="submit"><span>{busy ? "Uploading…" : "Upload securely"}</span><span>↑</span></button>{notice ? <small className="upload-notice">{notice}</small> : null}</form>;
}

type AdminData = { counts: { members: number; needsAction: number; uploads: number }; orders: Array<Record<string, unknown>>; uploads: Array<Record<string, unknown>> };
export function AdminExperience() {
  const [data, setData] = useState<AdminData | null>(null);
  const load = () => fetch("/api/admin/overview", { cache: "no-store" }).then((r) => r.json()).then(setData);
  useEffect(() => { void load(); }, []);
  const update = async (id: string, status: string) => { await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); await load(); };
  const queue = useMemo(() => data?.orders ?? [], [data]);
  return <><section className="admin-stats"><article><span>MEMBERS</span><strong>{data?.counts.members ?? "—"}</strong></article><article><span>NEEDS ACTION</span><strong>{data?.counts.needsAction ?? "—"}</strong></article><article><span>NEW UPLOADS</span><strong>{data?.counts.uploads ?? "—"}</strong></article></section><section className="paper-card admin-queue"><div className="section-head compact"><div><span className="card-kicker">FULFILLMENT QUEUE</span><h2>Paid orders and live operations</h2></div></div>{queue.map((order) => <div className="admin-row" key={String(order.id)}><span><strong>{String(order.full_name)}</strong><small>{String(order.product_name)} · {String(order.reference)}</small></span><span>{String(order.status).replaceAll("_", " ")}</span><select value={String(order.status)} onChange={(e) => void update(String(order.id), e.target.value)}><option value="paid_reconciling">Paid — reconcile</option><option value="ops_review">Ops review</option><option value="vendor_booked">Vendor booked</option><option value="appointment_confirmed">Appointment confirmed</option><option value="in_transit">In transit</option><option value="collected">Collected</option><option value="processing">Processing</option><option value="verification">Verification</option><option value="released">Released</option><option value="recollection">Recollection</option><option value="refunded">Refunded</option></select></div>)}</section></>;
}
