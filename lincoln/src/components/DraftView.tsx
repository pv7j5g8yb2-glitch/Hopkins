"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Download, Eye } from "lucide-react";
import type { Section, Seg } from "@/lib/halasz";

type Hover = { seg: Seg; x: number; y: number } | null;

export default function DraftView({ caseId, draftId, title, sections, facts, calls, notes, status }: { caseId: string; draftId: string; title: string; sections: Section[]; facts: number; calls: number; notes: number; status: string }) {
  const [focus, setFocus] = useState(false);
  const [hover, setHover] = useState<Hover>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const close = () => setHover(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, []);

  const show = (seg: Seg, el: HTMLElement) => {
    if (timer.current) clearTimeout(timer.current);
    const r = el.getClientRects()[0] ?? el.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    const x = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
    const below = r.bottom + 8;
    const y = below + 300 > window.innerHeight ? Math.max(12, r.top - 308) : below;
    setHover({ seg, x, y });
  };
  const hide = () => {
    timer.current = setTimeout(() => setHover(null), 120);
  };

  return (
    <div>
      <div className="sticky top-12 z-10 -mx-1 mb-3 bg-canvas px-1 py-2 md:top-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-white px-3.5 py-2.5">
        <div className="mr-auto min-w-0">
          <div className="truncate text-[13.5px] font-medium">{title}</div>
          <div className="text-[11.5px] text-faint">{status === "approved" ? "Approved" : "Draft for attorney review"} · version 1</div>
        </div>
        <span className="flex items-center gap-1.5 text-[12px] text-muted"><span className="h-2 w-2 rounded-sm bg-ok/70" />{facts} facts checked</span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted"><span className="h-2 w-2 rounded-sm bg-[#e2b23c]" />{calls} judgement calls</span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted"><span className="h-2 w-2 rounded-sm bg-risk/70" />{notes} notes for you</span>
        <button onClick={() => setFocus((v) => !v)} className={clsx("flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition", focus ? "border-ink bg-ink text-canvas" : "border-line bg-white hover:bg-panel")}>
          <Eye size={13} /> {focus ? "Showing what needs you" : "Show only what needs you"}
        </button>
        <a href={`/api/drafts/${draftId}/docx`} className="flex h-7 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12px] font-medium transition hover:bg-panel">
          <Download size={13} /> Word
        </a>
      </div>
      </div>

      <article className="mx-auto max-w-[720px] rounded-xl border border-line bg-white px-5 py-8 md:px-12 md:py-12">
        <h2 className="serif mb-1 text-[22px] font-medium">Petition support letter</h2>
        <p className="mb-8 text-[12.5px] text-faint">Form I-129, O-1A classification · Petitioner: Corvane Therapeutics, Inc. · Beneficiary: Dr. Réka Halász</p>
        {sections.map((s) => (
          <section key={s.id} className="mb-7">
            <h3 className="serif mb-0.5 text-[16.5px] font-medium">{s.heading}</h3>
            {s.cite && <p className="mb-2 text-[11.5px] text-faint">{s.cite}</p>}
            {s.paras.map((p, i) => (
              <p key={i} className="serif mb-3 text-[14.5px] leading-[1.75]" style={{ fontVariationSettings: '"opsz" 12', letterSpacing: 0 }}>
                {p.map((g, k) =>
                  g.k === "fact" ? (
                    <span
                      key={k}
                      tabIndex={0}
                      onMouseEnter={(e) => show(g, e.currentTarget)}
                      onMouseLeave={hide}
                      onClick={(e) => show(g, e.currentTarget)}
                      className={clsx("cursor-help rounded-[2px] decoration-ok/50 decoration-dotted underline-offset-[5px] transition hover:bg-ok-bg", focus ? "text-faint" : "underline")}
                    >
                      {g.t}
                    </span>
                  ) : g.k === "call" ? (
                    <mark key={k} className="rounded-[3px] bg-warn-bg px-0.5 text-ink">{g.t}</mark>
                  ) : g.k === "note" ? (
                    <span key={k} className="font-sans text-[12.5px] leading-relaxed text-risk"> [{g.t.trim()}]</span>
                  ) : (
                    <span key={k} className={focus ? "text-faint" : undefined}>{g.t}</span>
                  ),
                )}
              </p>
            ))}
          </section>
        ))}
        <p className="mt-10 border-t border-line pt-4 text-[11.5px] leading-relaxed text-faint">Prepared by Lincoln for attorney review. Lincoln is not a lawyer. Nothing here is filed until the attorney of record approves and signs.</p>
      </article>

      {hover && hover.seg.page && (
        <div
          className="rise fixed z-50 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_40px_-12px_rgba(22,22,20,0.35)]"
          style={{ left: hover.x, top: hover.y }}
          onMouseEnter={() => timer.current && clearTimeout(timer.current)}
          onMouseLeave={hide}
        >
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ok-bg text-ok"><Check size={11} strokeWidth={3} /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium">{hover.seg.doc}</div>
              <div className="text-[11px] text-faint">Client file, page {hover.seg.page} · checked against this page</div>
            </div>
          </div>
          <a href={`/api/pages/${caseId}/${hover.seg.page}`} target="_blank" className="block h-[220px] overflow-hidden bg-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/pages/${caseId}/${hover.seg.page}`} alt={`Page ${hover.seg.page}`} className="w-full" />
          </a>
        </div>
      )}
    </div>
  );
}
