import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AskBox from "@/components/AskBox";
import { requireUser } from "@/lib/session";
import { pendingApprovals } from "@/lib/queries";
import { inDays } from "@/lib/format";

export default async function Home() {
  const { firm } = await requireUser();
  const review = pendingApprovals(firm.id);

  return (
    <div className="rise mx-auto max-w-[680px] pt-[6vh] md:pt-[11vh]">
      <h1 className="wordmark mb-8 text-center text-[40px] leading-none md:text-[46px]">Lincoln</h1>
      <AskBox />

      <section className="mt-14">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-[13px] font-medium">For review</h2>
          {review.length > 0 && <Link href="/approvals" className="text-[12.5px] text-muted hover:text-ink">View all</Link>}
        </div>
        {review.length === 0 ? (
          <p className="border-t border-line py-6 text-[13px] text-faint">Nothing for review</p>
        ) : (
          <ul className="border-t border-line">
            {review.slice(0, 6).map((a) => (
              <li key={a.id} className="border-b border-line">
                <Link href={`/approvals?id=${a.id}`} className="group flex items-center gap-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">{a.title}</span>
                    <span className="block truncate text-[12.5px] text-muted">{a.client} · {a.type_code}</span>
                  </span>
                  {a.due && <span className="hidden shrink-0 text-[12.5px] text-faint sm:block">Due {inDays(a.due)}</span>}
                  <ChevronRight size={15} className="shrink-0 text-faint transition group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
