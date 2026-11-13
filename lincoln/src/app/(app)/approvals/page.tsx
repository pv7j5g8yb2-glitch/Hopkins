import Link from "next/link";
import clsx from "clsx";
import { Check, ChevronLeft } from "lucide-react";
import ApprovalPanel from "@/components/ApprovalPanel";
import { Card, Chip, PageHead } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { approvalById, decidedApprovals, messageById, pendingApprovals } from "@/lib/queries";
import { ago, inDays } from "@/lib/format";

const KIND: Record<string, string> = { decisions: "Decisions", message: "Message", filing: "Filing", draft_review: "Review", plan: "Plan" };

export default async function Approvals({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { firm } = await requireUser();
  const { id } = await searchParams;
  const pending = pendingApprovals(firm.id);
  const decided = decidedApprovals(firm.id);
  const picked = id ? approvalById(firm.id, id) : undefined;
  const sel = picked && picked.status === "pending" ? picked : pending[0];
  const payload = sel ? JSON.parse(sel.payload) : null;
  const message = payload?.messageId ? messageById(firm.id, payload.messageId) : null;

  return (
    <div className="rise">
      <PageHead title="Approvals" sub="Only what genuinely needs a person. Everything else Lincoln does on its own and records in the case." />
      {pending.length === 0 ? (
        <Card className="flex items-center gap-3 px-4 py-6 text-[13.5px] text-muted"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-ok-bg text-ok"><Check size={15} /></span>The queue is empty.</Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className={clsx("flex-col gap-1.5", id ? "hidden lg:flex" : "flex")}>
            {pending.map((a) => (
              <Link key={a.id} href={`/approvals?id=${a.id}`} scroll={false} className={clsx("rounded-xl border px-3.5 py-3 transition", sel?.id === a.id ? "border-ink bg-white" : "border-line bg-white hover:border-[#cfcbc3]")}>
                <div className="mb-1 flex items-center gap-1.5"><Chip tone={a.kind === "decisions" || a.kind === "plan" ? "ink" : "neutral"}>{KIND[a.kind]}</Chip>{a.due && <span className="text-[11.5px] text-faint">due {inDays(a.due)}</span>}</div>
                <div className="text-[13.5px] font-medium leading-snug">{a.title}</div>
                <div className="mt-0.5 truncate text-[12px] text-muted">{a.client} · {a.type_code}</div>
              </Link>
            ))}
          </div>
          {sel && (
            <div className={clsx("min-w-0", !id && "hidden lg:block")}>
              <Link href="/approvals" className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted lg:hidden"><ChevronLeft size={14} /> Queue</Link>
              <div className="mb-1 flex flex-wrap items-center gap-1.5"><Link href={`/cases/${sel.case_id}`}><Chip>{sel.client}</Chip></Link><Chip>{sel.type_code}</Chip><span className="text-[11.5px] text-faint">prepared {ago(sel.created_at)}</span></div>
              <h2 className="serif mb-3 text-[21px] font-medium leading-snug">{sel.title}</h2>
              <div className="mb-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
                {[["The decision", sel.brief], ["Lincoln is least sure of", sel.least_sure], ["If it is wrong", sel.if_wrong]].map(([h, t]) => (
                  <div key={h} className="bg-white px-4 py-3"><div className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-faint">{h}</div><p className="text-[13px] leading-relaxed">{t}</p></div>
                ))}
              </div>
              <ApprovalPanel key={sel.id} id={sel.id} caseId={sel.case_id} kind={sel.kind} payload={payload} message={message ? { party: message.party, party_role: message.party_role, subject: message.subject, body: message.body } : null} />
            </div>
          )}
        </div>
      )}
      {decided.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Decided</h2>
          <Card className="divide-y divide-line">
            {decided.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]"><Chip tone={a.status === "approved" ? "ok" : "risk"}>{a.status === "approved" ? "Approved" : "Sent back"}</Chip><span className="min-w-0 flex-1 truncate">{a.title}</span><span className="hidden truncate text-muted sm:block">{a.client}</span><span className="shrink-0 text-[11.5px] text-faint">{a.decided_at ? ago(a.decided_at) : ""}</span></div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
