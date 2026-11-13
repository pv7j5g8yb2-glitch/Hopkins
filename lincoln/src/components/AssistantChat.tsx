"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

type M = { role: string; content: string };
const STARTERS = ["What is awaiting review today?", "Which cases are waiting on clients?", "Which dates fall in the next 30 days?"];

export default function AssistantChat({ initial, firstName, q, connected }: { initial: M[]; firstName: string; q: string; connected: boolean }) {
  const [msgs, setMsgs] = useState<M[]>(initial);
  const [text, setText] = useState(q);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs, busy]);

  async function send(t: string) {
    const message = t.trim();
    if (!message || busy) return;
    setError(null);
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setText("");
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsgs((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }

  const box = (
    <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="rounded-2xl bg-panel p-3 ring-1 ring-transparent transition focus-within:ring-line">
      <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} rows={2} placeholder="Ask about a case, document or deadline" className="block w-full resize-none bg-transparent px-1 text-[14px] leading-relaxed outline-none placeholder:text-faint" />
      <div className="mt-1 flex items-center justify-between">
        <span className="hidden px-1 text-[12px] text-faint sm:block">{connected ? "" : "Assistant not enabled in this workspace"}</span>
        <button disabled={busy || !text.trim()} className="ml-auto flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-ink px-3 text-[13px] font-medium text-canvas transition hover:bg-black disabled:opacity-40">Ask Lincoln <ArrowUp size={14} /></button>
      </div>
    </form>
  );

  if (msgs.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-[680px] flex-col justify-center">
        <div className="wordmark mb-7 text-center text-[42px] leading-none">Lincoln</div>
        {box}
        {error && <p className="mt-3 rounded-xl bg-warn-bg px-4 py-3 text-[13px] leading-relaxed">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] text-muted transition hover:border-ink hover:text-ink">{s}</button>)}
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[720px]">
      <div className="flex flex-col gap-5 pb-6">
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-panel px-4 py-2.5 text-[14px] leading-relaxed">{m.content}</div>
          : <div key={i} className="flex gap-3"><span className="wordmark mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink text-[13px] text-canvas">L</span><div className="whitespace-pre-line text-[14px] leading-relaxed">{m.content}</div></div>)}
        {busy && <div className="flex items-center gap-3 text-[13px] text-muted"><span className="wordmark flex h-6 w-6 items-center justify-center rounded-md bg-ink text-[13px] text-canvas">L</span>Working</div>}
        {error && <p className="rounded-xl bg-warn-bg px-4 py-3 text-[13px] leading-relaxed">{error}</p>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-4">{box}</div>
    </div>
  );
}
