"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, SquarePen } from "lucide-react";
import { clearChat } from "@/lib/actions";

type M = { role: string; content: string };

/** Minimal rendering for model replies: paragraphs, bullet and numbered lines, bold. */
function Rich({ text }: { text: string }) {
  const bold = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? <strong key={i} className="font-semibold">{p}</strong> : <Fragment key={i}>{p.replace(/^#+\s*/, "")}</Fragment>));
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          return <ul key={i} className="flex flex-col gap-1 pl-4">{lines.map((l, k) => <li key={k} className="list-disc marker:text-faint">{bold(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>)}</ul>;
        }
        return <p key={i}>{lines.map((l, k) => <Fragment key={k}>{k > 0 && <br />}{bold(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}

export default function AssistantChat({ initial, q, connected, scope }: { initial: M[]; q: string; connected: boolean; scope: { id: string; name: string } | null }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<M[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs, busy]);

  async function send(t: string) {
    const message = t.trim();
    if (!message || busy) return;
    setError(null);
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setText("");
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, caseId: scope?.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsgs((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      router.replace(scope ? `/assistant?case=${scope.id}` : "/assistant", { scroll: false });
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const box = (
    <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="rounded-2xl border border-line bg-white p-3 shadow-[0_2px_10px_-6px_rgba(22,22,20,0.18)] transition focus-within:border-[#c9c5bd]">
      <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} rows={2} placeholder={scope ? `Ask about ${scope.name}` : "Ask about a case, a document or a deadline"} className="block w-full resize-none bg-transparent px-1.5 pt-1 text-[15px] leading-relaxed outline-none placeholder:text-faint" />
      <div className="flex items-center justify-between">
        <span className="px-1.5 text-[12px] text-faint">{connected ? "" : "Assistant not enabled"}</span>
        <button disabled={busy || !text.trim()} aria-label="Send" className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black disabled:opacity-25"><ArrowUp size={16} /></button>
      </div>
    </form>
  );

  const head = (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div className="min-w-0 truncate text-[13px] text-muted">{scope ? <Link href={`/cases/${scope.id}`} className="hover:text-ink">{scope.name}</Link> : "Assistant"}</div>
      {msgs.length > 0 && (
        <button onClick={() => start(async () => { await clearChat(scope?.id ?? null); setMsgs([]); setError(null); })} className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-muted transition hover:bg-panel hover:text-ink"><SquarePen size={13} /> New chat</button>
      )}
    </div>
  );

  if (msgs.length === 0) {
    return (
      <div className="mx-auto max-w-[680px]">
        {scope && head}
        <div className="flex min-h-[62dvh] flex-col justify-center">
          <h1 className="wordmark mb-8 text-center text-[40px] leading-none md:text-[46px]">Lincoln</h1>
          {box}
          {error && <p className="mt-3 text-[13px] text-risk">{error}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[720px]">
      {head}
      <div className="flex flex-col gap-7 pb-8">
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} className="ml-auto max-w-[85%] whitespace-pre-line rounded-2xl bg-panel px-4 py-2.5 text-[14.5px] leading-relaxed">{m.content}</div>
          : <div key={i} className="text-[14.5px] leading-[1.7]"><Rich text={m.content} /></div>)}
        {busy && <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink [animation-delay:300ms]" /></div>}
        {error && <p className="text-[13px] text-risk">{error}</p>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-4">{box}</div>
    </div>
  );
}
