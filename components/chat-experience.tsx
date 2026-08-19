"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; text: string; data?: string[] };

const initialMessages: Message[] = [
  { role: "assistant", text: "Good morning, Arjun. I can help with today's protocol, your results, meals, training, or anything in your health data. What would be most useful right now?" },
];

function answerFor(question: string): Message {
  const normalized = question.toLowerCase();
  if (normalized.includes("workout") || normalized.includes("training") || normalized.includes("zone")) {
    return { role: "assistant", text: "Choose the lighter Zone 2 session today: 30–35 minutes near 132–138 bpm. Your recovery trend is below baseline for three nights, but activity consistency is strong, so an easy aerobic session keeps momentum without adding another hard load.", data: ["HRV: 39 ms RMSSD", "Sleep: 6h 51m", "Protocol v2 · Training"] };
  }
  if (normalized.includes("eat") || normalized.includes("meal") || normalized.includes("lunch")) {
    return { role: "assistant", text: "For lunch, use the tandoori chicken bowl from your protocol: 150–180 g chicken, one cup mixed vegetables, ¾ cup cooked brown rice, cucumber raita, and greens. If ordering out, choose grilled chicken with dal and salad, and keep rice to one katori.", data: ["Protein target: 130 g/day", "Fibre target: 35–40 g/day", "Metabolic priority"] };
  }
  if (normalized.includes("apob") || normalized.includes("cholesterol")) {
    return { role: "assistant", text: "Your ApoB is 108 mg/dL, making it one of the protocol's main cardiovascular priorities. The current plan connects it to soluble fibre, replacing selected saturated-fat sources, three weekly Zone 2 sessions, and a repeat measurement after this cycle.", data: ["ApoB: 108 mg/dL", "Target: <80 mg/dL", "Lab date: 28 Jun"] };
  }
  if (normalized.includes("sleep") || normalized.includes("recovery")) {
    return { role: "assistant", text: "Sleep timing is becoming more consistent, but recovery is temporarily lower. Tonight, keep your 11 PM sleep window, stop caffeine after 1:30 PM, and complete the 10-minute wind-down. No extra recovery intervention is needed yet.", data: ["Sleep regularity: +23 min", "HRV: −12% vs 28-day baseline", "Protocol v2 · Recovery"] };
  }
  return { role: "assistant", text: "I can answer that using your current Twin, reports, and protocol. To make the recommendation specific, tell me whether you want the quickest option for today or a change to your full weekly plan.", data: ["Twin snapshot: Today 8:10 AM", "Protocol v2"] };
}

export function ChatExperience() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetch("/api/chat", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((history: Message[] | null) => {
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

  return (
    <div className="chat-layout">
      <section className="chat-main">
        <div className="chat-topline"><div><span className="ai-orb">✦</span><span><strong>Antiaging Labs Guide</strong><small>Using your data through today, 8:10 AM</small></span></div><button type="button">•••</button></div>
        <div className="chat-messages" aria-live="polite">
          {messages.map((message, index) => (
            <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
              {message.role === "assistant" ? <span className="message-avatar">✦</span> : null}
              <div className="message-body"><p>{message.text}</p>{message.data ? <div className="used-data">{message.data.map((item) => <span key={item}>{item}</span>)}</div> : null}{message.role === "assistant" && index > 0 ? <div className="message-actions"><button type="button">Add to today</button><button type="button">Why this?</button><button aria-label="Helpful" type="button">♡</button></div> : null}</div>
            </div>
          ))}
        </div>
        {messages.length === 1 ? <div className="suggested-prompts"><span>TRY ASKING</span><button onClick={() => void send("What workout should I do today?")} type="button">What workout should I do today? <i>→</i></button><button onClick={() => void send("What should I eat for lunch?")} type="button">What should I eat for lunch? <i>→</i></button><button onClick={() => void send("Explain my ApoB result")} type="button">Explain my ApoB result <i>→</i></button><button onClick={() => void send("Why is my recovery lower?")} type="button">Why is my recovery lower? <i>→</i></button></div> : null}
        {sending ? <p className="chat-thinking">Connecting your data…</p> : null}
        <form className="chat-composer" onSubmit={submit}><button aria-label="Attach" type="button">＋</button><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your data, protocol, meals, training…" /><button className="send-button" aria-label="Send" disabled={sending} type="submit">↑</button></form>
      </section>

      <aside className="chat-context">
        <span className="card-kicker">ACTIVE CONTEXT</span><h2>What I know right now</h2>
        <div className="context-card"><div><span className="context-icon">◈</span><strong>Biological Twin</strong></div><p>8 active domains · updated today</p><a href="/twin">View Twin →</a></div>
        <div className="context-card"><div><span className="context-icon">✓</span><strong>Protocol v2</strong></div><p>Day 18 · 78% adherence</p><a href="/protocol">Open plan →</a></div>
        <div className="context-card"><div><span className="context-icon">↗</span><strong>Current signals</strong></div><ul><li>Recovery below baseline</li><li>Sleep regularity improving</li><li>Activity on target</li></ul></div>
        <div className="context-card"><div><span className="context-icon">◎</span><strong>Top goals</strong></div><ul><li>Improve insulin sensitivity</li><li>Reduce ApoB</li><li>Build aerobic capacity</li></ul></div>
        <button className="context-settings" type="button">Manage chat memory <span>→</span></button>
      </aside>
    </div>
  );
}
