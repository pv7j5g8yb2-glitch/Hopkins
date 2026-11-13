import { Card, PageHead, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { activitySince } from "@/lib/queries";
import { hours } from "@/lib/format";

const KINDS: Record<string, string> = { read: "Reading documents", evidence: "Grading evidence", draft: "Drafting", check: "Checking facts and forms", chase: "Chasing people", send: "Sending routine messages", file: "Filing mail and documents", date: "Setting dates", status: "Checking case status", form: "Filling forms", packet: "Assembling packets", open: "Opening cases", bulletin: "Reading the Visa Bulletin" };
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function Report() {
  const { firm } = await requireUser();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const acts = activitySince(firm.id, since);
  const total = acts.reduce((s, a) => s + a.minutes, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return { label: DAY[d.getDay()], min: acts.filter((a) => a.at.slice(0, 10) === key).reduce((s, a) => s + a.minutes, 0) };
  });
  const max = Math.max(...days.map((d) => d.min), 1);
  const byKind = Object.entries(acts.reduce<Record<string, number>>((m, a) => ((m[a.kind] = (m[a.kind] ?? 0) + a.minutes), m), {})).sort((a, b) => b[1] - a[1]);
  const byCase = Object.entries(acts.reduce<Record<string, number>>((m, a) => ((m[a.client ?? "All cases"] = (m[a.client ?? "All cases"] ?? 0) + a.minutes), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="rise max-w-[760px]">
      <PageHead title="Lincoln report" sub="The last seven days." />
      <Card className="mb-8 px-5 py-5">
        <div className="mb-1 text-[12px] text-muted">Work Lincoln took off your team</div>
        <div className="serif text-[44px] font-medium leading-none">{hours(total)}</div>
        <div className="mt-1 text-[12.5px] text-faint">{acts.length} tasks across {new Set(acts.map((a) => a.case_id).filter(Boolean)).size} cases · estimate</div>
        <div className="mt-7 flex h-[120px] items-end gap-2.5">
          {days.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10.5px] tabular-nums text-faint">{d.min ? hours(d.min) : ""}</span>
              <div className={`w-full rounded-t-md ${i === 6 ? "bg-ink" : "bg-[#d9d5ce]"}`} style={{ height: `${Math.max(2, (d.min / max) * 86)}px` }} />
              <span className="text-[11px] text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <SectionTitle>By kind of work</SectionTitle>
          <Card className="divide-y divide-line">
            {byKind.map(([k, m]) => (
              <div key={k} className="px-4 py-2.5">
                <div className="mb-1 flex justify-between text-[13px]"><span>{KINDS[k] ?? k}</span><span className="tabular-nums text-muted">{hours(m)}</span></div>
                <div className="h-1 rounded-full bg-panel"><div className="h-full rounded-full bg-ink/70" style={{ width: `${(m / byKind[0][1]) * 100}%` }} /></div>
              </div>
            ))}
          </Card>
        </section>
        <section>
          <SectionTitle>By case</SectionTitle>
          <Card className="divide-y divide-line">
            {byCase.map(([k, m]) => <div key={k} className="flex justify-between px-4 py-2.5 text-[13px]"><span className="truncate">{k}</span><span className="tabular-nums text-muted">{hours(m)}</span></div>)}
          </Card>
        </section>
      </div>
      <p className="mt-8 text-[12px] leading-relaxed text-faint">How this is counted: each task Lincoln completes is multiplied by a standard time for that task. The standard times in this demo are placeholders. They will be replaced by an immigration attorney's figures and then by Lincoln's own measurements.</p>
    </div>
  );
}
