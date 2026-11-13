import { Avatar, Card, Chip, PageHead, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { people } from "@/lib/queries";

const RULES: [string, string, "auto" | "ask"][] = [
  ["Reminders for missing documents", "Day 3, day 7, then weekly", "auto"],
  ["Filing case mail and attachments to the case", "Always", "auto"],
  ["Sending back unreadable scans with what is wrong", "Always", "auto"],
  ["Receipt notice updates to clients", "Firm standard wording", "auto"],
  ["Checking USCIS case status", "Weekly for every filed case", "auto"],
  ["Any other message to a client or third party", "Approved first", "ask"],
  ["Legal strategy and eligibility", "Always the attorney", "ask"],
  ["Anything signed, filed or sent to USCIS or a court", "Always the attorney", "ask"],
];
const SECURITY: [string, boolean][] = [
  ["Every record carries its firm and every query filters on it", true],
  ["Passwords and session tokens stored only as hashes", true],
  ["Client pages served only to signed in members of the firm", true],
  ["A record of every action Lincoln takes and every decision a person makes", true],
  ["Each firm's data separated inside the database itself, with a key per firm", false],
  ["Two step sign in with Microsoft or Google", false],
  ["An outside security review of the code", false],
  ["A signed data agreement and a no training guarantee from the model provider", false],
];

export default async function SettingsPage() {
  const { firm } = await requireUser();
  return (
    <div className="rise max-w-[760px]">
      <PageHead title="Settings" sub={firm.name} />
      <section className="mb-9">
        <SectionTitle>People</SectionTitle>
        <Card className="divide-y divide-line">
          {people(firm.id).map((p) => <div key={p.id} className="flex items-center gap-3 px-4 py-2.5"><Avatar initials={p.initials} size={28} /><div className="min-w-0 flex-1"><div className="text-[13.5px]">{p.name}</div><div className="text-[12px] text-faint">{p.email}</div></div><Chip>{p.role}</Chip></div>)}
        </Card>
      </section>
      <section className="mb-9">
        <SectionTitle>Automation</SectionTitle>
        <Card className="divide-y divide-line">
          {RULES.map(([t, d, m]) => <div key={t} className="flex items-center gap-3 px-4 py-2.5"><div className="min-w-0 flex-1"><div className="text-[13.5px]">{t}</div><div className="text-[12px] text-faint">{d}</div></div><Chip tone={m === "auto" ? "ok" : "ink"}>{m === "auto" ? "Automatic" : "Approval required"}</Chip></div>)}
        </Card>
      </section>
      <section>
        <SectionTitle>Security</SectionTitle>
        <Card className="divide-y divide-line">
          {SECURITY.map(([t, ok]) => <div key={t} className="flex items-center gap-3 px-4 py-2.5"><span className="min-w-0 flex-1 text-[13.5px]">{t}</span><Chip tone={ok ? "ok" : "warn"}>{ok ? "Active" : "Planned"}</Chip></div>)}
        </Card>
        <p className="mt-2 text-[12px] leading-relaxed text-faint">Sample data only. Client data is not accepted until every control is active.</p>
      </section>
    </div>
  );
}
