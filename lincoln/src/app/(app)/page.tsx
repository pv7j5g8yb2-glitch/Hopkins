import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import AskBox from "@/components/AskBox";
import { Card, Chip, SectionTitle, btn } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { activitySince, cases, pendingApprovals, upcomingDates } from "@/lib/queries";
import { ago, greeting, inDays, shortDate, today } from "@/lib/format";

export default async function Today() {
  const { user, firm } = await requireUser();
  const all = cases(firm.id);
  const approvals = pendingApprovals(firm.id);
  const did = activitySince(firm.id, new Date(Date.now() - 24 * 3600_000).toISOString()).reverse();
  const dates = upcomingDates(firm.id, 5);
  const waiting = all.filter((c) => c.state === "waiting");

  return (
    <div className="rise">
      <p className="mb-1 text-[12.5px] text-faint">{today()}</p>
      <h1 className="serif mb-6 text-[30px] font-medium leading-tight md:text-[34px]">
        {greeting()}, {user.name.split(" ")[0]}
      </h1>
      <div className="mb-10 max-w-[720px]">
        <AskBox />
      </div>

      {all.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-4 py-14 text-center">
          <p className="text-[14px] text-muted">No open cases</p>
          <Link href="/cases/new" className={btn.primary}><Plus size={14} /> New case</Link>
        </Card>
      ) : (
        <>
          <SectionTitle>For review{approvals.length > 0 ? ` · ${approvals.length}` : ""}</SectionTitle>
          <Card className="mb-10 divide-y divide-line overflow-hidden">
            {approvals.length === 0 && <div className="px-4 py-5 text-[13.5px] text-muted">Nothing awaiting review</div>}
            {approvals.map((a) => (
              <Link key={a.id} href={`/approvals?id=${a.id}`} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-canvas">
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{a.title}</span>
                <Chip className="hidden sm:inline-flex">{a.client}</Chip>
                {a.due && <span className="hidden w-[84px] text-right text-[12px] text-faint md:block">{inDays(a.due)}</span>}
                <ArrowRight size={15} className="shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            ))}
          </Card>

          <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
            <section>
              <SectionTitle>Completed by Lincoln</SectionTitle>
              <Card className="divide-y divide-line">
                {did.length === 0 && <div className="px-4 py-5 text-[13.5px] text-muted">No activity in the last 24 hours</div>}
                {did.slice(0, 7).map((a) => (
                  <div key={a.id} className="flex items-baseline gap-3 px-4 py-2.5">
                    <p className="min-w-0 flex-1 text-[13px] leading-relaxed">{a.text}</p>
                    <span className="shrink-0 text-[11.5px] text-faint">{ago(a.at)}</span>
                  </div>
                ))}
              </Card>
            </section>
            <section className="flex flex-col gap-10">
              {dates.length > 0 && (
                <div>
                  <SectionTitle>Upcoming dates</SectionTitle>
                  <Card className="divide-y divide-line">
                    {dates.map((d) => (
                      <Link key={d.id} href={`/cases/${d.case_id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-canvas">
                        <span className="w-[50px] shrink-0 text-[12.5px] font-medium tabular-nums">{shortDate(d.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px]">{d.label}</span>
                        <span className="max-w-[40%] shrink-0 truncate text-[12px] text-faint">{d.client}</span>
                      </Link>
                    ))}
                  </Card>
                </div>
              )}
              {waiting.length > 0 && (
                <div>
                  <SectionTitle>Awaiting others</SectionTitle>
                  <Card className="divide-y divide-line">
                    {waiting.map((c) => (
                      <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-canvas">
                        <span className="min-w-0 flex-1 truncate text-[13px]">{c.client}</span>
                        <span className="max-w-[55%] shrink-0 truncate text-[12px] text-faint">{c.waiting_on}</span>
                      </Link>
                    ))}
                  </Card>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
