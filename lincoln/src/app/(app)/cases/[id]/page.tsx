import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import DraftView from "@/components/DraftView";
import Refresher from "@/components/Refresher";
import { Avatar, Empty, StageBar, btn, field } from "@/components/ui";
import { requestDraft } from "@/lib/actions";
import { requireUser } from "@/lib/session";
import { caseActivity, caseApprovals, caseById, caseDates, caseDrafts, caseMessages, criteria, documents, issues, people } from "@/lib/queries";
import { ago, inDays, longDate } from "@/lib/format";
import { llmConfigured } from "@/lib/llm";
import type { LetterContent } from "@/lib/letter";

const DOC_STATUS: Record<string, string> = { ok: "Usable", weak: "Low weight", excluded: "Excluded", draft: "Unsigned draft", duplicate: "Duplicate", superseded: "Superseded", needs_translation: "Translation required" };
const GRADES = ["Excluded", "In the file", "Relevant", "Supports the fact", "Meets the standard", "Approved by attorney"];
const REC: Record<string, string> = { claim: "Claim", more: "More evidence required", no: "Do not claim", met: "Met", partial: "Partial", missing: "Missing" };
const KIND: Record<string, string> = { date: "Date", conflict: "Conflict", missing: "Missing", risk: "Risk" };
const pageLink = "text-muted underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink";

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; draft?: string }> }) {
  const { firm } = await requireUser();
  const { id } = await params;
  const { tab = "overview", draft } = await searchParams;
  const c = caseById(firm.id, id);
  if (!c) notFound();
  const who = Object.fromEntries(people(firm.id).map((p) => [p.id, p]));
  const docs = documents(firm.id, id);
  const iss = issues(firm.id, id);
  const open = iss.filter((i) => i.status === "open");
  const resolved = iss.filter((i) => i.status !== "open");
  const drafts = caseDrafts(firm.id, id);
  const msgs = caseMessages(firm.id, id);
  const pending = caseApprovals(firm.id, id);
  const dates = caseDates(firm.id, id);
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = dates.filter((d) => d.date >= todayIso);
  const past = dates.filter((d) => d.date < todayIso).reverse();
  const team = Array.from(new Set([c.attorney_id, c.paralegal_id])).filter((u) => who[u]);
  const tabs: [string, string, number?][] = [["overview", "Overview"], ["documents", "Documents", docs.length], ["evidence", "Evidence"], ["drafts", "Drafts", drafts.length], ["messages", "Messages", msgs.length], ["activity", "Activity"]];
  const none = <Empty>No records</Empty>;

  return (
    <div className="rise">
      {c.processing ? <Refresher /> : null}
      <Link href="/cases" className="mb-5 inline-flex items-center gap-1 text-[12.5px] text-muted transition hover:text-ink"><ChevronLeft size={14} /> Cases</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="serif flex items-center gap-2 text-[27px] font-medium leading-tight">{c.sensitive ? <Lock size={17} className="text-faint" /> : null}{c.client}</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {c.type_code} {c.type_name !== c.type_code ? c.type_name : ""}{c.counterpart ? ` · ${c.counterpart}` : ""} · {c.ref}{c.sensitive ? " · Restricted to case team" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {team.map((u) => <span key={u} title={`${who[u].name}, ${who[u].role}`} className="rounded-full"><Avatar initials={who[u].initials} src={who[u].avatar} size={26} /></span>)}
        </div>
      </div>

      <StageBar stage={c.stage} />

      <div className="mt-6 max-w-[720px]">
        {c.processing ? (
          <div>
            <p className="text-[14px]">Reading the client file</p>
            <div className="mt-3 h-[3px] w-full max-w-[320px] overflow-hidden rounded-full bg-line"><div className="sweep h-full w-1/3 rounded-full bg-ink" /></div>
          </div>
        ) : (
          <>
            <p className="text-[14.5px] leading-relaxed">{c.summary}</p>
            {c.note && <p className="mt-2 text-[13px] text-risk">{c.note}</p>}
            {c.waiting_on && <p className="mt-1.5 text-[13px] text-muted">Awaiting {c.waiting_on}</p>}
          </>
        )}
      </div>

      {pending.length > 0 && (
        <ul className="mt-6 overflow-hidden rounded-xl border border-line">
          {pending.map((a) => (
            <li key={a.id} className="border-b border-line last:border-0">
              <Link href={`/approvals?id=${a.id}`} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-side">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{a.title}</span>
                <span className="hidden text-[12.5px] text-muted sm:block">For review</span>
                <ChevronRight size={15} className="shrink-0 text-faint transition group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!c.processing && <>
      <div className="mb-6 mt-8 flex gap-5 overflow-x-auto border-b border-line">
        {tabs.map(([k, text, count]) => (
          <Link key={k} href={`/cases/${id}?tab=${k}`} scroll={false} className={clsx("-mb-px whitespace-nowrap border-b-[1.5px] pb-2.5 text-[13px] transition", tab === k ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink")}>
            {text}{count ? <span className="ml-1.5 text-[12px] font-normal text-faint">{count}</span> : null}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <section>
            <h2 className="mb-1 text-[13px] font-medium">Open issues{open.length ? <span className="ml-1.5 font-normal text-faint">{open.length}</span> : null}</h2>
            {open.length === 0 ? <p className="border-t border-line py-5 text-[13px] text-faint">No open issues</p> : (
              <ul className="border-t border-line">
                {open.map((i) => (
                  <li key={i.id} className="border-b border-line py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] font-medium">{i.title}</span>
                      <span className="shrink-0 text-[12px] text-faint">{KIND[i.kind] ?? "Risk"}{i.severity === "high" ? " · High" : ""}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{i.detail}</p>
                    {(JSON.parse(i.sources) as number[]).length > 0 && (
                      <p className="mt-1 flex flex-wrap gap-x-2.5 text-[12px]">
                        {(JSON.parse(i.sources) as number[]).map((p) => <a key={p} href={`/api/pages/${id}/${p}`} target="_blank" className={pageLink}>p. {p}</a>)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {resolved.length > 0 && (
              <details className="mt-3 text-[13px]">
                <summary className="cursor-pointer text-muted transition hover:text-ink">{resolved.length} resolved</summary>
                <ul className="mt-2 border-t border-line">
                  {resolved.map((i) => <li key={i.id} className="border-b border-line py-2.5"><div className="text-[13px] text-muted">{i.title}</div><div className="text-[12px] text-faint">{i.resolution}</div></li>)}
                </ul>
              </details>
            )}
          </section>
          <section className="flex flex-col gap-10">
            <div>
              <h2 className="mb-1 text-[13px] font-medium">Dates</h2>
              {upcoming.length === 0 ? <p className="border-t border-line py-5 text-[13px] text-faint">No upcoming dates</p> : (
                <ul className="border-t border-line">
                  {upcoming.map((d) => (
                    <li key={d.id} className="flex items-baseline gap-3 border-b border-line py-2.5">
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13px]">{d.label}</span>{d.source && <span className="block truncate text-[12px] text-faint">{d.source}</span>}</span>
                      <span className="shrink-0 text-right"><span className="block text-[13px] tabular-nums">{longDate(d.date)}</span><span className="block text-[12px] text-faint">{inDays(d.date)}</span></span>
                    </li>
                  ))}
                </ul>
              )}
              {past.length > 0 && (
                <details className="mt-3 text-[13px]">
                  <summary className="cursor-pointer text-muted transition hover:text-ink">{past.length} past</summary>
                  <ul className="mt-2 border-t border-line">
                    {past.map((d) => <li key={d.id} className="flex items-baseline gap-3 border-b border-line py-2"><span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">{d.label}</span><span className="shrink-0 text-[12.5px] tabular-nums text-faint">{longDate(d.date)}</span></li>)}
                  </ul>
                </details>
              )}
            </div>
            <div>
              <h2 className="mb-1 text-[13px] font-medium">Team</h2>
              <ul className="border-t border-line">
                {team.map((u) => <li key={u} className="flex items-center gap-2.5 border-b border-line py-2.5"><Avatar initials={who[u].initials} src={who[u].avatar} size={24} /><span className="flex-1 text-[13px]">{who[u].name}</span><span className="text-[12px] text-faint">{who[u].role}</span></li>)}
              </ul>
            </div>
          </section>
        </div>
      )}

      {tab === "documents" && (docs.length === 0 ? none : (
        <>
          <p className="mb-3 text-[12.5px] text-faint">{c.pages} pages · {docs.length} documents{docs.some((d) => d.is_scan) ? ` · ${docs.filter((d) => d.is_scan).length} scanned` : ""}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead><tr className="border-b border-line text-left text-[12px] text-faint"><th className="w-9 py-2 font-normal">No.</th><th className="px-3 font-normal">Document</th><th className="px-3 font-normal">Pages</th><th className="px-3 font-normal">Source</th><th className="py-2 pl-3 font-normal">Assessment</th></tr></thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-line align-top">
                    <td className="py-3 tabular-nums text-faint">{d.n}</td>
                    <td className="max-w-[440px] px-3 py-3">
                      <div className="font-medium">{d.title}</div>
                      {d.note && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{d.note}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{d.page_from ? <a href={`/api/pages/${id}/${d.page_from}`} target="_blank" className={pageLink}>{d.page_from === d.page_to || !d.page_to ? d.page_from : `${d.page_from} to ${d.page_to}`}</a> : null}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted">{d.source}{d.language && d.language !== "English" ? <span className="block text-[12px] text-faint">{d.language}</span> : null}</td>
                    <td className={clsx("whitespace-nowrap py-3 pl-3", d.status === "ok" ? "text-muted" : "font-medium")}>{DOC_STATUS[d.status] ?? d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ))}

      {tab === "evidence" && (() => {
        const crit = criteria(firm.id, id);
        if (crit.length === 0) return none;
        return (
          <div className="flex flex-col">
            {crit.map((k) => {
              const ev = JSON.parse(k.evidence) as { doc: number; page: number; grade: number; note?: string }[];
              return (
                <section key={k.id} className="border-t border-line py-5 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="text-[14.5px] font-medium">{k.name}{k.citation ? <span className="ml-2 text-[12px] font-normal text-faint">{k.citation}</span> : null}</h3>
                    <span className="text-[12.5px] font-medium">{REC[k.recommendation] ?? k.recommendation}{k.strength ? <span className="font-normal text-faint"> · {k.strength}</span> : null}</span>
                  </div>
                  <p className="mt-1 max-w-[680px] text-[13px] leading-relaxed">{k.summary}</p>
                  {k.weakness && <p className="mt-1 max-w-[680px] text-[13px] leading-relaxed text-muted">{k.weakness}</p>}
                  {ev.length > 0 && (
                    <ul className="mt-3">
                      {ev.map((e, i) => {
                        const d = docs.find((x) => x.n === e.doc);
                        return (
                          <li key={i} className="flex items-center gap-3 py-1.5 text-[12.5px]">
                            <a href={`/api/pages/${id}/${e.page}`} target="_blank" className={clsx("min-w-0 flex-1 truncate transition hover:underline", e.grade === 0 && "text-faint line-through")}>{d?.title ?? "Document"} <span className="text-faint">p. {e.page}</span></a>
                            <span className="hidden w-[170px] shrink-0 truncate text-right text-[12px] text-faint md:block">{e.note ?? GRADES[e.grade]}</span>
                            <span className="flex shrink-0 items-center gap-[3px]" title={GRADES[e.grade]}>
                              {[1, 2, 3, 4, 5].map((g) => <span key={g} className={clsx("h-[5px] w-3 rounded-full", g <= e.grade ? "bg-ink" : "bg-line")} />)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        );
      })()}

      {tab === "drafts" && (() => {
        const dr = drafts.find((x) => x.id === draft) ?? drafts[0];
        const L = dr ? (JSON.parse(dr.content) as LetterContent & { generic?: boolean; error?: string }) : null;
        const decisions = pending.find((a) => a.kind === "decisions");
        return (
          <div>
            {llmConfigured() && c.pages > 0 && !c.processing && (
              <form action={requestDraft.bind(null, id)} className="mb-6 flex max-w-[640px] gap-2">
                <input name="request" required maxLength={600} placeholder="New draft: cover letter, RFE response, declaration" className={field} />
                <button className={btn.primary}>Draft</button>
              </form>
            )}
            {drafts.length > 1 && (
              <div className="mb-5 flex flex-wrap gap-1.5">
                {drafts.map((x) => <Link key={x.id} href={`/cases/${id}?tab=drafts&draft=${x.id}`} scroll={false} className={clsx("max-w-[260px] truncate rounded-lg border px-2.5 py-1 text-[12.5px] transition", x.id === dr?.id ? "border-ink text-ink" : "border-line text-muted hover:text-ink")}>{x.title}</Link>)}
              </div>
            )}
            {!dr || !L ? (
              <Empty>{decisions ? <>The support letter is drafted once the strategy decisions are recorded. <Link href={`/approvals?id=${decisions.id}`} className="text-ink underline underline-offset-4">Open decisions</Link></> : "No drafts"}</Empty>
            ) : dr.status === "drafting" ? (
              <div className="py-6"><Refresher /><p className="text-[14px]">Drafting</p><div className="mt-3 h-[3px] w-full max-w-[320px] overflow-hidden rounded-full bg-line"><div className="sweep h-full w-1/3 rounded-full bg-ink" /></div></div>
            ) : dr.status === "failed" ? (
              <p className="text-[13px] text-risk">The draft could not be produced. {L.error}</p>
            ) : (
              <DraftView caseId={id} draftId={dr.id} title={dr.title} subtitle={`${c.type_code} · ${c.client}${c.counterpart ? ` · ${c.counterpart}` : ""}`} sections={L.sections} facts={L.facts} calls={L.calls} notes={L.notes} status={dr.status} generic={Boolean(L.generic)} />
            )}
          </div>
        );
      })()}

      {tab === "messages" && (msgs.length === 0 ? none : (
        <ul className="border-t border-line">
          {msgs.map((m) => (
            <li key={m.id} className="border-b border-line py-4">
              <div className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
                <span className="font-medium">{m.direction === "in" ? m.party : `To ${m.party}`}</span>
                <span className="text-faint">{m.party_role}</span>
                <span className="ml-auto text-faint">{m.direction === "in" ? "Received" : m.state === "needs_approval" ? "Awaiting approval" : "Sent"} · {ago(m.at)}</span>
              </div>
              <div className="mt-1 text-[13.5px]">{m.subject}</div>
              <p className="mt-1 line-clamp-3 max-w-[720px] whitespace-pre-line text-[13px] leading-relaxed text-muted">{m.body}</p>
              {m.lincoln_note && <p className="mt-2 max-w-[720px] border-l border-ink pl-3 text-[12.5px] leading-relaxed">{m.lincoln_note}</p>}
            </li>
          ))}
        </ul>
      ))}

      {tab === "activity" && (
        <ul className="border-t border-line">
          {caseActivity(firm.id, id).map((a) => (
            <li key={a.id} className="flex items-baseline gap-4 border-b border-line py-2.5">
              <span className="w-[84px] shrink-0 truncate text-[12.5px] text-faint">{a.actor === "Lincoln" ? "Lincoln" : a.actor.split(" ")[0]}</span>
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed">{a.text}</p>
              <span className="shrink-0 text-[12px] text-faint">{ago(a.at)}</span>
            </li>
          ))}
        </ul>
      )}

      </>}

      {llmConfigured() && !c.processing && (
        <div className="mt-12 max-w-[640px]">
          <form action="/assistant" method="get" className="flex gap-2">
            <input type="hidden" name="case" value={id} />
            <input name="q" required placeholder="Ask about this case" className={field} />
            <button className={btn.secondary}>Ask</button>
          </form>
        </div>
      )}
    </div>
  );
}
