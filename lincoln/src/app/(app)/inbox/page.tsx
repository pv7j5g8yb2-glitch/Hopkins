import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, Chip, PageHead } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { messages } from "@/lib/queries";
import { ago } from "@/lib/format";

export default async function InboxPage() {
  const { firm } = await requireUser();
  const all = messages(firm.id);
  return (
    <div className="rise">
      <PageHead title="Inbox" />
      <Card className="divide-y divide-line">
        {all.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-muted">No case mail yet</div>}
        {all.map((m) => (
          <div key={m.id} className="flex gap-3 px-4 py-3.5">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${m.direction === "in" ? "bg-panel text-muted" : "bg-ink text-canvas"}`}>{m.direction === "in" ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                <span className="font-medium">{m.direction === "in" ? m.party : `To ${m.party}`}</span>
                <span className="text-faint">{m.party_role}</span>
                {m.case_id && <Link href={`/cases/${m.case_id}?tab=messages`}><Chip>{m.client}</Chip></Link>}
                {m.state === "needs_approval" && <Chip tone="warn">Awaiting approval</Chip>}
                {m.state === "sent" && <Chip tone="ok">Sent</Chip>}
                <span className="ml-auto text-[11.5px] text-faint">{ago(m.at)}</span>
              </div>
              <div className="mt-0.5 text-[13.5px]">{m.subject}</div>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{m.body}</p>
              {m.lincoln_note && <p className="mt-2 border-l-2 border-ink pl-2.5 text-[12.5px] leading-relaxed"><span className="font-medium">Lincoln:</span> {m.lincoln_note}</p>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
