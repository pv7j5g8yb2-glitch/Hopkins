import Link from "next/link";
import { PageHead } from "@/components/ui";
import { requireUser } from "@/lib/session";

const QA: [string, string][] = [
  ["Scope", "Lincoln runs each immigration case from engagement to decision: reads every document, requests what is missing, grades the evidence, drafts forms and letters, tracks every date and raises what requires an attorney."],
  ["Limits", "Lincoln is not a lawyer. It gives no legal advice to the public, and signs, files or sends nothing legal without an attorney's approval."],
  ["Drafts", "Sourced facts are underlined and open the page they came from. Judgement calls are shaded. Attorney notes are in square brackets. Review mode dims everything else."],
  ["New cases", "Upload the client file as one PDF. Lincoln reads every page, lists the documents, opens issues, sets dates and drafts the first request to the client for approval."],
  ["Record of work", "Every action is listed under Activity on the case. Weekly totals are in Settings, Usage."],
];

export default async function Help() {
  await requireUser();
  return (
    <div className="rise max-w-[680px]">
      <PageHead title="Help" />
      <dl className="border-t border-line">
        {QA.map(([q, a]) => <div key={q} className="border-b border-line py-4"><dt className="mb-0.5 text-[13.5px] font-medium">{q}</dt><dd className="text-[13.5px] leading-relaxed text-muted">{a}</dd></div>)}
      </dl>
      <div className="mt-6 flex gap-5 text-[12.5px] text-muted">
        <Link href="/privacy" className="hover:text-ink">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-ink">Terms of Service</Link>
      </div>
    </div>
  );
}
