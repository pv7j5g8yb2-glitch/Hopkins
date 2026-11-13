import { Card, Chip, PageHead } from "@/components/ui";
import { requireUser } from "@/lib/session";

const GROUPS: { title: string; note: string; tone: "ok" | "warn" | "neutral"; tag: string; items: [string, string][] }[] = [
  { title: "First to connect", note: "Standard connections. No outside review needed.", tone: "ok", tag: "Next", items: [["Google Drive", "Files"], ["OneDrive and SharePoint", "Files"], ["Dropbox", "Files"], ["Box", "Files"], ["Slack", "Notifications"], ["Microsoft Teams", "Notifications"], ["Google Calendar", "Dates"], ["Outlook Calendar", "Dates"], ["DocuSign", "Signatures"], ["Dropbox Sign", "Signatures"], ["Zoom", "Consultations"]] },
  { title: "After an outside security review", note: "Google and Microsoft review any app that reads mail.", tone: "warn", tag: "In review later", items: [["Gmail", "Case mail"], ["Outlook", "Case mail"], ["Microsoft Word", "Add in"]] },
  { title: "Moving to Lincoln", note: "One time imports from the software you use now. Lincoln does the move for you.", tone: "neutral", tag: "Import", items: [["Docketwise", "Cases and documents"], ["LollyLaw", "Cases and documents"], ["INSZoom", "Cases and documents"], ["eImmigration", "Cases and documents"], ["Clio", "Matters and documents"], ["Spreadsheet or folders", "Anything else"]] },
  { title: "Later", note: "", tone: "neutral", tag: "Later", items: [["USCIS case status", "Government"], ["LawPay", "Payments"], ["Stripe", "Payments"], ["QuickBooks", "Accounts"], ["iManage", "Documents"], ["NetDocuments", "Documents"], ["Zapier", "Thousands of other tools"]] },
];

export default async function Integrations() {
  await requireUser();
  return (
    <div className="rise">
      <PageHead title="Integrations" sub="Lincoln is its own platform. These connect it to the tools your firm already uses." />
      <p className="mb-6 max-w-[720px] rounded-xl bg-panel px-4 py-3 text-[13px] leading-relaxed text-muted">None of these is connected in the demo workspace. This page shows the order they are being built in.</p>
      {GROUPS.map((g) => (
        <section key={g.title} className="mb-8">
          <h2 className="text-[14.5px] font-medium">{g.title}</h2>
          {g.note && <p className="mb-3 text-[12.5px] text-muted">{g.note}</p>}
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map(([name, what]) => (
              <Card key={name} className="flex items-center gap-3 px-3.5 py-3">
                <span className="wordmark flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel text-[14px] text-muted">{name[0]}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-medium">{name}</div><div className="truncate text-[12px] text-faint">{what}</div></div>
                <Chip tone={g.tone}>{g.tag}</Chip>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
