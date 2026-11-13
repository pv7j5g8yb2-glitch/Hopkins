import Link from "next/link";
import { Card, PageHead } from "@/components/ui";
import { requireUser } from "@/lib/session";

const QA: [string, string][] = [
  ["What Lincoln does", "Runs each immigration case from signed client to decision: reads every document, requests what is missing, grades the evidence, drafts forms and letters, tracks every date and raises anything that needs an attorney."],
  ["What Lincoln never does", "Gives legal advice to the public, signs, or files or sends anything legal without an attorney's approval. Lincoln is not a lawyer."],
  ["Reviewing a draft", "Sourced facts are underlined and link to the page they came from. Judgement calls are highlighted. Attorney notes are in red. Review mode dims everything else."],
  ["Record of work", "Every action is listed under Activity in the case. Weekly totals are in the Lincoln report."],
];

export default async function Help() {
  await requireUser();
  return (
    <div className="rise max-w-[680px]">
      <PageHead title="Help" />
      <Card className="divide-y divide-line">
        {QA.map(([q, a]) => <div key={q} className="px-4 py-3.5"><div className="mb-0.5 text-[14px] font-medium">{q}</div><p className="text-[13.5px] leading-relaxed text-muted">{a}</p></div>)}
      </Card>
      <div className="mt-5 flex gap-5 text-[12.5px] text-muted">
        <Link href="/privacy" className="hover:text-ink">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-ink">Terms of Service</Link>
      </div>
    </div>
  );
}
