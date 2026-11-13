import Link from "next/link";
import { Empty, PageHead } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { messages } from "@/lib/queries";
import { ago } from "@/lib/format";

export default async function InboxPage() {
  const { firm } = await requireUser();
  const all = messages(firm.id);
  return (
    <div className="rise">
      <PageHead title="Inbox" />
      {all.length === 0 ? <Empty>No case mail</Empty> : (
        <ul className="border-t border-line">
          {all.map((m) => (
            <li key={m.id} className="border-b border-line py-4">
              <div className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
                <span className="font-medium">{m.direction === "in" ? m.party : `To ${m.party}`}</span>
                {m.case_id && <Link href={`/cases/${m.case_id}?tab=messages`} className="text-muted hover:text-ink hover:underline">{m.client}</Link>}
                <span className="ml-auto text-faint">{m.state === "needs_approval" ? <Link href="/approvals" className="font-medium text-ink">Awaiting approval</Link> : m.direction === "in" ? (m.state === "reading" ? "Reading" : m.state === "unsure" ? <span className="font-medium text-ink">Not sorted</span> : "Received") : m.state === "approved" ? "Approved, not sent" : "Sent"} · {ago(m.at)}</span>
              </div>
              <div className="mt-1 text-[13.5px]">{m.subject}</div>
              <p className="mt-0.5 line-clamp-2 max-w-[760px] text-[13px] leading-relaxed text-muted">{m.body}</p>
              {m.lincoln_note && <p className="mt-2 max-w-[760px] border-l border-ink pl-3 text-[12.5px] leading-relaxed">{m.lincoln_note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
