import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { Avatar, Chip, Dot, PageHead, btn, stateLabel } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { cases, people } from "@/lib/queries";
import { inDays, shortDate } from "@/lib/format";

export default async function Cases() {
  const { firm } = await requireUser();
  const all = cases(firm.id);
  const who = Object.fromEntries(people(firm.id).map((p) => [p.id, p]));
  const groups = ["needs_you", "moving", "waiting"].map((s) => ({ s, rows: all.filter((c) => c.state === s) })).filter((g) => g.rows.length);

  return (
    <div className="rise">
      <PageHead
        title="Cases"
        sub={`${all.length} open across ${new Set(all.map((c) => c.family)).size} kinds of immigration work`}
        right={<Link href="/cases/new" className={btn.primary}><Plus size={14} /> New case</Link>}
      />
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[820px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11.5px] font-medium text-faint">
              <th className="py-2.5 pl-4 pr-3 font-medium">Client</th>
              <th className="px-3 font-medium">Case</th>
              <th className="px-3 font-medium">Stage</th>
              <th className="px-3 font-medium">Waiting on</th>
              <th className="px-3 font-medium">Next date</th>
              <th className="py-2.5 pl-3 pr-4 font-medium">Team</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.s}>
              <tr className="border-b border-line bg-canvas">
                <td colSpan={6} className="px-4 py-1.5 text-[11.5px] text-muted">
                  <span className="mr-2 inline-flex items-center gap-1.5"><Dot tone={g.s === "needs_you" ? "ink" : g.s === "moving" ? "ok" : "neutral"} />{stateLabel(g.s)}</span>
                  <span className="text-faint">{g.rows.length}</span>
                </td>
              </tr>
              {g.rows.map((c) => (
                <tr key={c.id} className="group border-b border-line last:border-0 hover:bg-canvas">
                  <td className="py-2.5 pl-4 pr-3">
                    <Link href={`/cases/${c.id}`} className="flex items-center gap-1.5 font-medium">
                      {c.sensitive ? <Lock size={12} className="text-faint" /> : null}
                      <span className="truncate">{c.client}</span>
                    </Link>
                    {c.counterpart && <div className="truncate text-[11.5px] text-faint">{c.counterpart}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3"><Chip>{c.type_code}</Chip> <span className="ml-1 hidden text-muted xl:inline">{c.type_name}</span></td>
                  <td className="px-3 text-muted">{c.stage}</td>
                  <td className="max-w-[220px] truncate px-3 text-muted">{c.waiting_on ?? <span className="text-faint">Nobody. Lincoln is working</span>}</td>
                  <td className="whitespace-nowrap px-3 text-muted">
                    {c.next_date ? <><span className="text-ink">{shortDate(c.next_date)}</span> <span className="text-faint">· {c.next_date_label}, {inDays(c.next_date)}</span></> : <span className="text-faint">None set</span>}
                  </td>
                  <td className="py-2.5 pl-3 pr-4">
                    <div className="flex gap-1">
                      {Array.from(new Set([c.attorney_id, c.paralegal_id])).map((u) => who[u] && <Avatar key={u} initials={who[u].initials} />)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
