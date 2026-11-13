"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Check, CircleAlert, FileText, Sparkles } from "lucide-react";
import { acceptAllRecommended, answerQuestion, decideApproval } from "@/lib/actions";
import type { Question } from "@/lib/halasz";

type Props = {
  id: string;
  caseId: string;
  kind: string;
  payload: any;
  message?: { party: string; party_role: string | null; subject: string; body: string } | null;
};

export default function ApprovalPanel({ id, caseId, kind, payload, message }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const decide = (d: "approved" | "rejected") =>
    start(async () => {
      setError(null);
      try {
        await decideApproval(id, d);
      } catch (e) {
        setError(e instanceof Error ? e.message : "The action failed. Nothing was changed.");
      }
    });

  const footer = (label: string, disabled = false) => (
    <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center gap-2 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur md:-mx-0 md:rounded-b-xl md:px-0">
      <button disabled={pending || disabled} onClick={() => decide("approved")} className="flex h-9 items-center gap-1.5 rounded-lg bg-ink px-4 text-[13.5px] font-medium text-canvas transition hover:bg-black active:scale-[0.98] disabled:opacity-40">
        <Check size={15} /> {label}
      </button>
      <button disabled={pending} onClick={() => decide("rejected")} className="flex h-9 items-center rounded-lg border border-line bg-white px-3.5 text-[13.5px] font-medium transition hover:bg-panel disabled:opacity-40">
        Return
      </button>
      {error && <span className="flex items-center gap-1 text-[12.5px] text-risk"><CircleAlert size={13} />{error}</span>}
    </div>
  );

  if (kind === "decisions") {
    const qs = payload.questions as Question[];
    const done = qs.filter((q) => q.answer).length;
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-ink transition-all" style={{ width: `${(done / qs.length) * 100}%` }} /></div>
            <span className="text-[12.5px] text-muted">{done} of {qs.length} answered</span>
          </div>
          {done < qs.length && (
            <button disabled={pending} onClick={() => start(() => acceptAllRecommended(id))} className="flex h-7 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12px] font-medium transition hover:bg-panel">
              <Sparkles size={12} /> Accept remaining recommendations
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          {qs.map((q, i) => (
            <div key={q.id} className={clsx("rounded-xl border bg-white px-4 py-3.5 transition", q.answer ? "border-line" : "border-[#cfcbc3] shadow-[0_1px_0_rgba(22,22,20,0.04)]")}>
              <div className="mb-1 flex items-center gap-2 text-[11.5px] text-faint"><span className="tabular-nums">{i + 1}</span><span className="uppercase tracking-[0.06em]">{q.topic}</span></div>
              <p className="mb-2 text-[14.5px] font-medium leading-snug">{q.q}</p>
              <ul className="mb-2.5 flex flex-col gap-1">
                {q.evidence.map((e, k) => (
                  <li key={k} className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
                    <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-faint" />
                    <span>{e.t}{e.page && <a href={`/api/pages/${caseId}/${e.page}`} target="_blank" className="ml-1.5 whitespace-nowrap rounded-md border border-line px-1.5 py-px text-[11px] text-muted hover:border-ink hover:text-ink">p. {e.page}</a>}</span>
                  </li>
                ))}
              </ul>
              <p className="mb-3 text-[12.5px] leading-relaxed"><span className={clsx("mr-1.5 rounded-[5px] px-1.5 py-px text-[11.5px] font-medium", q.recommend === "yes" ? "bg-ok-bg text-ok" : "bg-risk-bg text-risk")}>Recommended: {q.recommend === "yes" ? "Yes" : "No"}</span><span className="text-muted">{q.why}</span></p>
              <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
                {(["yes", "no", "change"] as const).map((a) => (
                  <button key={a} disabled={pending} onClick={() => start(() => answerQuestion(id, q.id, a))} className={clsx("h-7 rounded-md px-3.5 text-[12.5px] font-medium transition", q.answer === a ? "bg-ink text-canvas" : "text-muted hover:text-ink")}>
                    {a === "yes" ? "Yes" : a === "no" ? "No" : "More evidence"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {footer("Confirm and draft letter", done < qs.length)}
      </div>
    );
  }

  if (kind === "message" && message) {
    return (
      <div>
        <div className="rounded-xl border border-line bg-white">
          <div className="border-b border-line px-4 py-3 text-[13px]">
            <div><span className="inline-block w-16 text-faint">To</span>{message.party} <span className="text-faint">· {message.party_role}</span></div>
            <div><span className="inline-block w-16 text-faint">Subject</span><span className="font-medium">{message.subject}</span></div>
          </div>
          <p className="whitespace-pre-line px-4 py-4 text-[13.5px] leading-relaxed">{message.body}</p>
        </div>
        {footer("Approve and send")}
      </div>
    );
  }

  if (kind === "filing") {
    return (
      <div>
        <div className="rounded-xl border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Filing check</div>
          <ul className="divide-y divide-line">
            {(payload.checks as [string, boolean][]).map(([t, ok]) => (
              <li key={t} className="flex items-center gap-2.5 px-4 py-2 text-[13px]"><span className={clsx("flex h-4 w-4 items-center justify-center rounded-full", ok ? "bg-ok-bg text-ok" : "bg-risk-bg text-risk")}><Check size={11} strokeWidth={3} /></span>{t}</li>
            ))}
          </ul>
        </div>
        {payload.note && <p className="mt-3 rounded-xl bg-warn-bg px-4 py-3 text-[13px] leading-relaxed text-ink"><span className="font-medium">Note: </span>{payload.note}</p>}
        {footer("Approve for filing")}
      </div>
    );
  }

  if (kind === "draft_review") {
    return (
      <div>
        <Link href={`/cases/${caseId}?tab=drafts`} className="group flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-4 transition hover:border-ink">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-panel"><FileText size={18} /></span>
          <div className="flex-1"><div className="text-[14px] font-medium">Petition support letter</div><div className="text-[12.5px] text-muted">Judgement calls highlighted. Each fact links to its source page.</div></div>
        </Link>
        {footer("Approve letter")}
      </div>
    );
  }

  if (kind === "plan") {
    return (
      <div>
        <div className="rounded-xl border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Proposed response</div>
          <ul className="divide-y divide-line">
            {(payload.points as [string, string][]).map(([h, t]) => (
              <li key={h} className="px-4 py-3"><div className="text-[13.5px] font-medium">{h}</div><p className="text-[13px] leading-relaxed text-muted">{t}</p></li>
            ))}
          </ul>
        </div>
        {message && (
          <div className="mt-3 rounded-xl border border-line bg-white">
            <div className="border-b border-line px-4 py-2.5 text-[12.5px]"><span className="text-faint">To </span>{message.party}<span className="text-faint"> on approval · </span><span className="font-medium">{message.subject}</span></div>
            <p className="whitespace-pre-line px-4 py-3.5 text-[13px] leading-relaxed text-muted">{message.body}</p>
          </div>
        )}
        {footer("Approve plan and send checklist")}
      </div>
    );
  }
  return null;
}
