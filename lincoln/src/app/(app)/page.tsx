import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import AskBox from "@/components/AskBox";
import { Card, Chip, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { activitySince, cases, pendingApprovals, upcomingDates } from "@/lib/queries";
import { ago, greeting, hours, inDays, shortDate, today } from "@/lib/format";

export default async function Today() {
  const { user, firm } = await requireUser();
  const all = cases(firm.id);
  const approvals = pendingApprovals(firm.id);
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const did = activitySince(firm.id, since).reverse();
  const minutes = did.reduce((s, a) => s + a.minutes, 0);
  const dates = upcomingDates(firm.id, 6);
  const n = (s: string) => all.filter((c) => c.state === s).length;
  const waiting = all.filter((c) => c.state === "waiting");

  return (
    <div className="rise">
      <p className="mb-1 text-[12.5px] text-faint">{today()}</p>
      <h1 className="serif text-[30px] font-medium leading-tight md:text-[34px]">
        {greeting()}, {user.name.split(" ")[0]}.
      </h1>
      <p className="mb-6 mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
        {all.length} open cases. <span className="text-ink">{n("moving")} are moving</span>, {n("waiting")} are waiting on other people, and{" "}
        <span className="text-ink">{approvals.length === 0 ? "nothing needs you" : `${approvals.length} ${approvals.length === 1 ? "decision needs" : "decisions need"} you`}</span>.
      </p>
      <div className="mb-9 max-w-[720px]">
        <AskBox />
      </div>

      <SectionTitle right={approvals.length > 0 ? <Link href="/approvals" className="text-[12px] text-muted hover:text-ink">Open the queue</Link> : null}>Needs you</SectionTitle>
      {approvals.length === 0 ? (
        <Card className="mb-9 flex items-center gap-3 px-4 py-5 text-[13.5px] text-muted">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ok-bg text-ok"><Check size={15} /></span>
          Nothing is waiting for you. Lincoln will tell you when something does.
        </Card>
      ) : (
        <Card className="mb-9 divide-y divide-line overflow-hidden">
          {approvals.map((a) => (
            <Link key={a.id} href={`/approvals?id=${a.id}`} className="group flex items-start gap-4 px-4 py-3.5 transition hover:bg-canvas">
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[14px] font-medium">{a.title}</span>
                  <Chip>{a.client}</Chip>
                  <Chip>{a.type_code}</Chip>
                </div>
                <p className="line-clamp-2 text-[13px] leading-relaxed text-muted">{a.brief}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 pt-0.5">
                {a.due && <span className="hidden text-[12px] text-faint sm:block">Due {inDays(a.due)}</span>}
                <ArrowRight size={15} className="text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </div>
            </Link>
          ))}
        </Card>
      )}

      <div className="grid gap-9 lg:grid-cols-[1.35fr_1fr]">
        <section>
          <SectionTitle right={<span className="text-[12px] text-muted">about {hours(minutes)} of work</span>}>Lincoln did, last 24 hours</SectionTitle>
          <Card className="divide-y divide-line">
            {did.slice(0, 9).map((a) => (
              <div key={a.id} className="flex gap-3 px-4 py-3">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink/70" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-relaxed">{a.text}</p>
                  <p className="mt-0.5 text-[11.5px] text-faint">
                    {a.client ? (a.case_id ? <Link href={`/cases/${a.case_id}`} className="hover:text-ink">{a.client}</Link> : a.client) : "All cases"} · {ago(a.at)}
                  </p>
                </div>
              </div>
            ))}
            {did.length > 9 && (
              <Link href="/report" className="block px-4 py-2.5 text-[12.5px] text-muted hover:text-ink">
                and {did.length - 9} more
              </Link>
            )}
          </Card>
        </section>

        <section className="flex flex-col gap-9">
          <div>
            <SectionTitle>Dates coming up</SectionTitle>
            <Card className="divide-y divide-line">
              {dates.map((d) => (
                <Link key={d.id} href={`/cases/${d.case_id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-canvas">
                  <span className="w-[52px] shrink-0 text-[12.5px] font-medium tabular-nums">{shortDate(d.date)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{d.label}</p>
                    <p className="truncate text-[11.5px] text-faint">{d.client}</p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-faint">{inDays(d.date)}</span>
                </Link>
              ))}
            </Card>
          </div>
          <div>
            <SectionTitle>Waiting on others</SectionTitle>
            <Card className="divide-y divide-line">
              {waiting.map((c) => (
                <Link key={c.id} href={`/cases/${c.id}`} className="block px-4 py-2.5 transition hover:bg-canvas">
                  <p className="truncate text-[13px]">{c.client}</p>
                  <p className="truncate text-[11.5px] text-faint">{c.waiting_on} · Lincoln is chasing</p>
                </Link>
              ))}
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
