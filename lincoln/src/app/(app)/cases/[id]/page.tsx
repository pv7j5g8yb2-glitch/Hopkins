import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, ChevronLeft, FileText, Lock, ScanLine } from "lucide-react";
import DraftView from "@/components/DraftView";
import { Avatar, Card, Chip, Dot, SectionTitle, StageBar } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { caseActivity, caseApprovals, caseById, caseDates, caseDrafts, caseMessages, criteria, documents, issues, people } from "@/lib/queries";
import { ago, inDays, longDate, shortDate } from "@/lib/format";
import type { LetterContent } from "@/lib/letter";

const DOC_STATUS: Record<string, [string, "ok" | "warn" | "risk" | "neutral"]> = {
  ok: ["Usable", "ok"], weak: ["Low weight", "warn"], excluded: ["Left out", "risk"], draft: ["Draft, never used", "risk"],
  duplicate: ["Duplicate", "neutral"], superseded: ["Superseded", "neutral"], needs_translation: ["Needs translation", "warn"],
};
const GRADES = ["Left out", "In the file", "Relevant", "Supports the fact", "Enough for the standard", "Approved by attorney"];
const REC: Record<string, [string, "ok" | "warn" | "risk"]> = { claim: ["Claim", "ok"], more: ["Only with more evidence", "warn"], no: ["Do not claim", "risk"] };
const sev = (s: string) => (s === "high" ? "risk" : s === "medium" ? "warn" : "neutral") as "risk" | "warn" | "neutral";

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { firm } = await requireUser();
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const c = caseById(firm.id, id);
  if (!c) notFound();
  const who = Object.fromEntries(people(firm.id).map((p) => [p.id, p]));
  const docs = documents(firm.id, id);
  const iss = issues(firm.id, id);
  const open = iss.filter((i) => i.status === "open");
  const drafts = caseDrafts(firm.id, id);
  const msgs = caseMessages(firm.id, id);
  const pending = caseApprovals(firm.id, id);
  const deep = docs.length > 0;
  const team = Array.from(new Set([c.attorney_id, c.paralegal_id]));
  const tabs: [string, string, number?][] = [["overview", "Overview"], ["documents", "Documents", docs.length], ["evidence", "Evidence"], ["drafts", "Drafts", drafts.length], ["messages", "Messages", msgs.length], ["activity", "Activity"]];
  const thin = <Card className="px-4 py-8 text-center text-[13px] text-muted">{firm.demo ? <>Summary data only. The complete sample is <Link href="/cases/c_halasz" className="font-medium text-ink underline underline-offset-2">Dr. Réka Halász</Link>.</> : "Nothing here yet"}</Card>;

  return (
    <div className="rise">
      <Link href="/cases" className="mb-4 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink"><ChevronLeft size={14} /> Cases</Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="serif flex items-center gap-2 text-[26px] font-medium leading-tight">{c.sensitive ? <Lock size={18} className="text-faint" /> : null}{c.client}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
            <Chip tone="ink">{c.type_code}</Chip>
            <span>{c.type_name}</span>
            {c.counterpart && <><span className="text-faint">·</span><span>{c.counterpart}</span></>}
            <span className="text-faint">·</span><span>Ref {c.ref}</span>
            {c.sensitive ? <Chip tone="warn">Locked to the case team</Chip> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {team.map((u) => who[u] && (
            <span key={u} className="flex items-center gap-1.5 text-[12.5px] text-muted"><Avatar initials={who[u].initials} />{who[u].name.split(" ")[0]}</span>
          ))}
        </div>
      </div>
      <div className="mb-5"><StageBar stage={c.stage} /></div>

      <Card className="mb-3 px-4 py-3.5">
        <div className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">Status</div>
        <p className="max-w-[760px] text-[14px] leading-relaxed">{c.summary}</p>
        {c.waiting_on && <p className="mt-1.5 text-[12.5px] text-muted">Waiting on <span className="text-ink">{c.waiting_on}</span></p>}
      </Card>
      {pending.length > 0 && (
        <Card className="divide-y divide-line overflow-hidden border-ink/80">
          {pending.map((a) => (
            <Link key={a.id} href={`/approvals?id=${a.id}`} className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-canvas">
              <Chip tone="ink">For review</Chip>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{a.title}</span>
              <ArrowRight size={15} className="text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          ))}
        </Card>
      )}

      <div className="mb-5 mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map(([k, label, count]) => (
          <Link key={k} href={`/cases/${id}?tab=${k}`} scroll={false} className={clsx("-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[13px] transition", tab === k ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink")}>
            {label}{count ? <span className="ml-1.5 text-[11.5px] text-faint">{count}</span> : null}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <section>
            <SectionTitle right={<span className="text-[12px] text-faint">{iss.length - open.length} resolved</span>}>Open issues · {open.length}</SectionTitle>
            {!deep ? thin : open.length === 0 ? <Card className="px-4 py-6 text-[13px] text-muted">No open issues</Card> : (
              <Card className="divide-y divide-line">
                {open.map((i) => (
                  <div key={i.id} className="px-4 py-3">
                    <div className="mb-0.5 flex items-center gap-2"><Dot tone={sev(i.severity)} /><span className="text-[13.5px] font-medium">{i.title}</span><Chip>{i.kind === "date" ? "Date" : i.kind === "conflict" ? "Conflict" : i.kind === "missing" ? "Missing" : "Risk"}</Chip></div>
                    <p className="pl-3.5 text-[13px] leading-relaxed text-muted">{i.detail}</p>
                    <div className="mt-1 flex flex-wrap gap-1 pl-3.5">
                      {(JSON.parse(i.sources) as number[]).map((p) => <a key={p} href={`/api/pages/${id}/${p}`} target="_blank" className="rounded-md border border-line px-1.5 text-[11px] text-muted hover:border-ink hover:text-ink">p. {p}</a>)}
                    </div>
                  </div>
                ))}
              </Card>
            )}
            {iss.length > open.length && (
              <details className="mt-3 text-[13px]">
                <summary className="cursor-pointer text-muted hover:text-ink">Show {iss.length - open.length} resolved</summary>
                <Card className="mt-2 divide-y divide-line">
                  {iss.filter((i) => i.status !== "open").map((i) => (
                    <div key={i.id} className="px-4 py-2.5"><div className="text-[13px] text-muted line-through decoration-faint">{i.title}</div><div className="text-[12px] text-ok">{i.resolution}</div></div>
                  ))}
                </Card>
              </details>
            )}
          </section>
          <section className="flex flex-col gap-8">
            <div>
              <SectionTitle>Dates</SectionTitle>
              <Card className="divide-y divide-line">
                {caseDates(firm.id, id).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1"><p className="truncate text-[13px]">{d.label}</p>{d.source && <p className="truncate text-[11.5px] text-faint">{d.source}</p>}</div>
                    <div className="shrink-0 text-right"><p className="text-[12.5px] font-medium tabular-nums">{longDate(d.date)}</p><p className="text-[11.5px] text-faint">{inDays(d.date)}</p></div>
                  </div>
                ))}
              </Card>
            </div>
            <div>
              <SectionTitle>Case team</SectionTitle>
              <Card className="divide-y divide-line">
                {team.map((u) => who[u] && (
                  <div key={u} className="flex items-center gap-2.5 px-4 py-2.5"><Avatar initials={who[u].initials} size={26} /><div><p className="text-[13px]">{who[u].name}</p><p className="text-[11.5px] text-faint">{who[u].role}</p></div></div>
                ))}
              </Card>
            </div>
          </section>
        </div>
      )}

      {tab === "documents" && (!deep ? thin : (
        <>
          <p className="mb-3 text-[12.5px] text-faint">{c.pages} pages · {docs.length} documents · {docs.filter((d) => d.is_scan).length} scans</p>
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead><tr className="border-b border-line text-left text-[11.5px] text-faint"><th className="w-10 py-2.5 pl-4 font-medium">#</th><th className="px-3 font-medium">Document</th><th className="px-3 font-medium">Pages</th><th className="px-3 font-medium">From</th><th className="py-2.5 pl-3 pr-4 font-medium">Assessment</th></tr></thead>
              <tbody>
                {docs.map((d) => {
                  const [label, tone] = DOC_STATUS[d.status] ?? [d.status, "neutral"];
                  return (
                    <tr key={d.id} className="border-b border-line align-top last:border-0 hover:bg-canvas">
                      <td className="py-2.5 pl-4 tabular-nums text-faint">{d.n}</td>
                      <td className="max-w-[420px] px-3 py-2.5">
                        <div className="flex items-center gap-1.5 font-medium">{d.is_scan ? <ScanLine size={13} className="shrink-0 text-faint" /> : <FileText size={13} className="shrink-0 text-faint" />}{d.title}</div>
                        {d.note && <p className="mt-0.5 pl-5 text-[12.5px] leading-relaxed text-muted">{d.note}</p>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {d.page_from ? <a href={`/api/pages/${id}/${d.page_from}`} target="_blank" className="text-muted underline decoration-line underline-offset-4 hover:text-ink">{d.page_from === d.page_to ? d.page_from : `${d.page_from} to ${d.page_to}`}</a> : <span className="text-faint">New</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted">{d.source}{d.language !== "English" && <span className="block text-[11.5px] text-faint">{d.language}</span>}</td>
                      <td className="py-2.5 pl-3 pr-4"><Chip tone={tone}>{label}</Chip></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ))}

      {tab === "evidence" && (!deep ? thin : (
        <div className="flex flex-col gap-3">
          {criteria(firm.id, id).map((k) => {
            const [rl, rt] = REC[k.recommendation];
            const ev = JSON.parse(k.evidence) as { doc: number; page: number; grade: number; note?: string }[];
            return (
              <Card key={k.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-3.5">
                  <div className="min-w-0 max-w-[640px]">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2"><span className="text-[14.5px] font-medium">{k.name}</span><span className="text-[11.5px] text-faint">{k.citation}</span></div>
                    <p className="text-[13px] leading-relaxed">{k.summary}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted">Weakness: {k.weakness}</p>
                  </div>
                  <div className="flex items-center gap-1.5"><Chip tone={rt}>{rl}</Chip><Chip>{k.strength}</Chip></div>
                </div>
                <div className="divide-y divide-line border-t border-line bg-canvas/60">
                  {ev.map((e, i) => {
                    const d = docs.find((x) => x.n === e.doc);
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2">
                        <a href={`/api/pages/${id}/${e.page}`} target="_blank" className={clsx("min-w-0 flex-1 truncate text-[12.5px] hover:underline", e.grade === 0 && "text-faint line-through")}>{d?.title} <span className="text-faint">· p. {e.page}</span></a>
                        {e.note && <span className="hidden shrink-0 text-[11.5px] text-muted sm:block">{e.note}</span>}
                        <span className="flex shrink-0 items-center gap-[3px]" title={GRADES[e.grade]}>
                          {[1, 2, 3, 4, 5].map((g) => <span key={g} className={clsx("h-1.5 w-3.5 rounded-full", e.grade === 0 ? "bg-risk/25" : g <= e.grade ? (e.grade >= 4 ? "bg-ok" : "bg-[#c98a00]") : "bg-line")} />)}
                        </span>
                        <span className="hidden w-[150px] shrink-0 text-right text-[11.5px] text-faint md:block">{GRADES[e.grade]}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === "drafts" && (drafts.length === 0 ? (
        <Card className="px-4 py-8 text-center text-[13px] text-muted">
          {pending.some((a) => a.kind === "decisions") ? <>The support letter is drafted once the strategy decisions are recorded. <Link href={`/approvals?id=${pending.find((a) => a.kind === "decisions")!.id}`} className="font-medium text-ink underline underline-offset-2">Open decisions</Link></> : "No drafts yet"}
        </Card>
      ) : (() => {
        const dr = drafts[0];
        const L = JSON.parse(dr.content) as LetterContent;
        return <DraftView caseId={id} draftId={dr.id} title={dr.title} sections={L.sections} facts={L.facts} calls={L.calls} notes={L.notes} status={dr.status} />;
      })())}

      {tab === "messages" && (msgs.length === 0 ? <Card className="px-4 py-8 text-center text-[13px] text-muted">No messages yet</Card> : (
        <div className="flex flex-col gap-3">
          {msgs.map((m) => (
            <Card key={m.id} className="px-4 py-3.5">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[12.5px]">
                <Chip tone={m.direction === "in" ? "neutral" : m.state === "needs_approval" ? "warn" : "ok"}>{m.direction === "in" ? "Received" : m.state === "needs_approval" ? "Draft, awaiting approval" : "Sent"}</Chip>
                <span className="font-medium">{m.direction === "in" ? m.party : `To ${m.party}`}</span><span className="text-faint">{m.party_role} · {ago(m.at)}</span>
              </div>
              <div className="text-[13.5px] font-medium">{m.subject}</div>
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-[13px] leading-relaxed text-muted">{m.body}</p>
              {m.lincoln_note && <p className="mt-2.5 border-l-2 border-ink pl-2.5 text-[12.5px] leading-relaxed"><span className="font-medium">Lincoln:</span> {m.lincoln_note}</p>}
            </Card>
          ))}
        </div>
      ))}

      {tab === "activity" && (
        <Card className="divide-y divide-line">
          {caseActivity(firm.id, id).map((a) => (
            <div key={a.id} className="flex gap-3 px-4 py-2.5">
              <span className={clsx("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", a.actor === "Lincoln" ? "bg-ink/70" : "bg-ok")} />
              <div className="min-w-0 flex-1"><p className="text-[13px] leading-relaxed">{a.actor !== "Lincoln" && <span className="font-medium">{a.actor}: </span>}{a.text}</p></div>
              <span className="shrink-0 text-[11.5px] text-faint">{ago(a.at)} · {shortDate(a.at)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
