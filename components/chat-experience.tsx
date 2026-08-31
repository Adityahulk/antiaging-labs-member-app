"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAppData } from "./app-provider";

type Message = { role: "user" | "assistant"; text: string; data?: string[] };

const initialMessages: Message[] = [
  { role: "assistant", text: "I can explain today’s plan, why something is your current focus, what we have learned from your responses, and what would make a result clearer. What would be most useful right now?" },
];

function answerFor(question: string): Message {
  void question; return { role: "assistant", text: "I couldn’t reach the grounded answer service. Your message was not answered from guessed data—please retry in a moment.", data: ["No health values were inferred"] };
}

export function ChatExperience() {
  const {data}=useAppData();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetch("/api/chat", { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as Message[] : null).then((history) => {
      if (history?.length) setMessages(history);
    }).catch(() => undefined);
  }, []);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending) return;
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setInput("");
    setSending(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: clean }) });
      if (!response.ok) throw new Error("Chat unavailable");
      const reply = await response.json() as Message;
      setMessages((current) => [...current, reply]);
    } catch {
      setMessages((current) => [...current, answerFor(clean)]);
    } finally { setSending(false); }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };

  const explain = (text: string) => {
    const subject = text.length > 90 ? `${text.slice(0, 90).trimEnd()}…` : text;
    void send(`Why this? Explain the reasoning and which of my data you used for: "${subject}"`);
  };

  return (
    <div className="chat-layout">
      <section className="chat-main">
        <div className="chat-topline"><div><span className="ai-orb" aria-hidden="true">✦</span><span><strong>Antiaging Labs Guide</strong><small>Using Twin v{String(data?.twin?.version??"—")} · protocol v{String(data?.protocol?.version??"—")}</small></span></div></div>
        <div className="chat-messages" aria-live="polite">
          {messages.map((message, index) => (
            <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
              {message.role === "assistant" ? <span className="message-avatar" aria-hidden="true">✦</span> : null}
              <div className="message-body"><p>{message.text}</p>{message.data ? <div className="used-data">{message.data.map((item) => <span key={item}>{item}</span>)}</div> : null}{message.role === "assistant" && index > 0 ? <div className="message-actions"><button onClick={() => explain(message.text)} disabled={sending} type="button">Why this?</button></div> : null}</div>
            </div>
          ))}
        </div>
        {messages.length === 1 ? <div className="suggested-prompts"><span>TRY ASKING</span><button onClick={() => void send("Why is this my current focus?")} type="button">Why is this my current focus? <i>→</i></button><button onClick={() => void send("What should I do today?")} type="button">What should I do today? <i>→</i></button><button onClick={() => void send("What have we learned about me?")} type="button">What have we learned about me? <i>→</i></button><button onClick={() => void send("What would make my latest result more certain?")} type="button">What would make my latest result clearer? <i>→</i></button></div> : null}
        {sending ? <p className="chat-thinking">Connecting your data…</p> : null}
        <form className="chat-composer" onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about today, your plan, or what we have learned…" aria-label="Ask your guide a question" /><button className="send-button" aria-label="Send" disabled={sending} type="submit">↑</button></form>
      </section>

      <aside className="chat-context">
        <span className="card-kicker">ACTIVE CONTEXT</span><h2>What I know right now</h2>
        <div className="context-card"><div><span className="context-icon">◈</span><strong>Response Twin</strong></div><p>{data?.twin?.domains.length??0} health domains · snapshot v{String(data?.twin?.version??"—")}</p><a href="/twin">View my Twin →</a></div>
        <div className="context-card"><div><span className="context-icon">✓</span><strong>My plan v{String(data?.protocol?.version??"—")}</strong></div><p>{data?.protocol?.actions.length??0} foundation actions · {data?.responseState?.interventions.filter((item) => ["active", "approved", "paused"].includes(String(item.status))).length ?? 0} current focus</p><a href="/plan">Open my plan →</a></div>
        <div className="context-card"><div><span className="context-icon">↻</span><strong>Response memory</strong></div><p>{data?.responseState?.responseAssessments.length ?? 0} personal learnings recorded</p><a href="/learnings">See what we learned →</a></div>
        <div className="context-card"><div><span className="context-icon">↗</span><strong>Current signals</strong></div><ul>{data?.twin?.domains.slice(0,3).map((domain)=><li key={String(domain.domainCode)}>{String(domain.label)} · {String(domain.trend)}</li>)}</ul></div>
        <div className="context-card"><div><span className="context-icon">◎</span><strong>Released genetics</strong></div><p>{data?.genomics?.interpretations.filter((item)=>item.status==="released").length??0} interpretations available to chat</p><a href="/genetics">View genetics →</a></div>
        <a className="context-settings" href="/support">Manage data &amp; consent <span aria-hidden="true">→</span></a>
      </aside>
    </div>
  );
}
