import { Card, PageHead } from "@/components/ui";
import { requireUser } from "@/lib/session";

const QA: [string, string][] = [
  ["What does Lincoln do?", "It runs each immigration case from signed client to decision: it reads every document, chases what is missing, checks the evidence, drafts the forms and letters, watches every date and tells you when something needs you."],
  ["What does it never do?", "It never gives legal advice to the public, never signs, and never files or sends anything legal without the attorney's approval. Lincoln is not a lawyer."],
  ["How do I check its work quickly?", "Lincoln asks you to decide before it writes. In a draft, facts are underlined in green and linked to the page they came from, judgement calls are highlighted, and notes for you are in red. Read the highlights; skim the rest."],
  ["Where do I see what it did?", "Every action is in the case under Activity, and the week's total is in the Lincoln report."],
  ["What is the demo world?", "A made up firm with made up cases. The button in the sidebar plays events from the outside world, such as a client email or a USCIS notice, so you can watch Lincoln react."],
];

export default async function Help() {
  await requireUser();
  return (
    <div className="rise max-w-[680px]">
      <PageHead title="Help" />
      <Card className="divide-y divide-line">
        {QA.map(([q, a]) => <div key={q} className="px-4 py-3.5"><div className="mb-0.5 text-[14px] font-medium">{q}</div><p className="text-[13.5px] leading-relaxed text-muted">{a}</p></div>)}
      </Card>
    </div>
  );
}
