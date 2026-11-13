import Link from "next/link";
import clsx from "clsx";
import AvatarField from "@/components/AvatarField";
import { Avatar, PageHead, btn, field, label } from "@/components/ui";
import { changePassword, disconnectMailbox, newInboundAddress, updateFirm, updateProfile } from "@/lib/actions";
import { firmMailbox, googleConfigured } from "@/lib/gmail";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { activitySince, people } from "@/lib/queries";
import { ago, hours } from "@/lib/format";

const TABS: [string, string][] = [["profile", "Profile"], ["security", "Security"], ["firm", "Firm"], ["automation", "Automation"], ["integrations", "Integrations"], ["usage", "Usage"]];

const RULES: [string, string, boolean][] = [
  ["Reminders when a client has not replied", "After 3 days", true],
  ["Filing case mail and attachments", "Always", true],
  ["Reading incoming case mail and attachments", "Every two minutes, connected mailbox", true],
  ["Opening cases from new client enquiries", "Always", true],
  ["Approaching deadlines raised as issues", "14 days before", true],
  ["Other messages to clients or third parties", "Attorney approval", false],
  ["Legal strategy and eligibility", "Attorney decision", false],
  ["Anything signed, filed or sent to USCIS or a court", "Attorney approval", false],
];
const CONTROLS: [string, boolean][] = [
  ["Firm separation on every record and query", true],
  ["Passwords and session tokens stored only as hashes", true],
  ["Client pages served only to signed in members of the firm", true],
  ["Audit record of every action and decision", true],
  ["Database level isolation with a key per firm", false],
  ["Two step sign in with Microsoft or Google", false],
  ["Independent security review", false],
  ["Zero retention agreement with the model provider", false],
];
const INTEGRATIONS: [string, [string, string][]][] = [
  ["Documents", [["Microsoft Word", "Add in"], ["Google Drive", "Files"], ["OneDrive and SharePoint", "Files"], ["Dropbox", "Files"]]],
  ["Calendars and signatures", [["Outlook Calendar", "Dates"], ["Google Calendar", "Dates"], ["DocuSign", "Signatures"], ["Microsoft Teams", "Notifications"], ["Slack", "Notifications"]]],
  ["Migration", [["Docketwise", "Cases and documents"], ["LollyLaw", "Cases and documents"], ["INSZoom", "Cases and documents"], ["Clio", "Matters and documents"], ["Folders or spreadsheet", "Anything else"]]],
  ["Government and finance", [["USCIS case status", "Status"], ["LawPay", "Payments"], ["QuickBooks", "Accounts"], ["iManage", "Documents"], ["NetDocuments", "Documents"]]],
];
const KINDS: Record<string, string> = { read: "Reading documents", evidence: "Grading evidence", draft: "Drafting", check: "Checking facts and forms", chase: "Chasing documents", send: "Routine messages", file: "Filing mail", date: "Dates", status: "Status checks", form: "Forms", packet: "Filing packets", open: "Opening cases", bulletin: "Visa Bulletin" };
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MSG: Record<string, Record<string, string>> = {
  profile: { name: "A name is required." },
  security: { limited: "Too many attempts. Try again in 15 minutes.", sample: "Sample accounts have no password.", current: "The current password is incorrect.", password: "The new password must be at least 10 characters." },
  firm: { "1": "Only an administrator can rename the firm." },
};

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("flex items-center gap-4 border-b border-line py-3", className)}>{children}</div>;
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string; error?: string; connected?: string; inbound?: string }> }) {
  const { user, firm } = await requireUser();
  const { tab = "profile", saved, error, connected, inbound } = await searchParams;
  const mailbox = firmMailbox(firm.id, user.id);
  const integrationError = tab === "integrations" && error ? ({ google: "Gmail is not configured on this server.", state: "The connection expired. Try again.", connect: "Google did not complete the connection." } as Record<string, string>)[error] : null;
  const hasPassword = Boolean((db().prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string | null }).password_hash);
  const admin = /admin|managing/i.test(user.role);
  const err = error ? MSG[tab]?.[error] : null;

  return (
    <div className="rise">
      <PageHead title="Settings" />
      <div className="grid gap-8 md:grid-cols-[180px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {TABS.map(([k, t]) => (
            <Link key={k} href={`/settings?tab=${k}`} scroll={false} className={clsx("whitespace-nowrap rounded-lg px-3 py-[7px] text-[13px] transition", tab === k ? "bg-ink/[0.06] font-medium text-ink" : "text-muted hover:text-ink")}>{t}</Link>
          ))}
        </nav>
        <div className="min-w-0 max-w-[620px]">
          {saved && <p className="mb-5 text-[13px] text-muted">Saved.</p>}
          {err && <p className="mb-5 text-[13px] text-risk">{err}</p>}

          {tab === "profile" && (
            <form action={updateProfile} className="flex flex-col gap-5">
              <AvatarField initials={user.initials} current={user.avatar} />
              <label className="block"><span className={label}>Name</span><input name="name" required maxLength={100} defaultValue={user.name} className={field} /></label>
              <label className="block"><span className={label}>Role</span><input name="role" maxLength={60} defaultValue={user.role} className={field} /></label>
              <label className="block"><span className={label}>Email</span><input value={user.email} disabled className={clsx(field, "bg-side text-muted")} /></label>
              <div><button className={btn.primary}>Save</button></div>
            </form>
          )}

          {tab === "security" && (
            <>
              <h2 className="mb-3 text-[14px] font-medium">Password</h2>
              {hasPassword ? (
                <form action={changePassword} className="flex flex-col gap-4">
                  <label className="block"><span className={label}>Current password</span><input name="current" type="password" required autoComplete="current-password" className={field} /></label>
                  <label className="block"><span className={label}>New password</span><input name="next" type="password" required minLength={10} autoComplete="new-password" className={field} /></label>
                  <p className="-mt-2 text-[12px] text-faint">At least 10 characters. Other devices are signed out.</p>
                  <div><button className={btn.primary}>Update password</button></div>
                </form>
              ) : (
                <p className="text-[13px] text-muted">Sample accounts have no password.</p>
              )}
              <h2 className="mb-1 mt-12 text-[14px] font-medium">Data protection</h2>
              <div className="border-t border-line">
                {CONTROLS.map(([t, on]) => <Row key={t}><span className="flex-1 text-[13px]">{t}</span><span className={clsx("text-[12.5px]", on ? "text-ink" : "text-faint")}>{on ? "Active" : "Planned"}</span></Row>)}
              </div>
              <p className="mt-3 text-[12px] text-faint">Client data is accepted once every control is active.</p>
            </>
          )}

          {tab === "firm" && (
            <>
              <form action={updateFirm} className="flex items-end gap-2">
                <label className="block flex-1"><span className={label}>Firm name</span><input name="firm" required maxLength={120} defaultValue={firm.name} disabled={!admin} className={clsx(field, !admin && "bg-side text-muted")} /></label>
                {admin && <button className={btn.secondary}>Save</button>}
              </form>
              <h2 className="mb-1 mt-10 text-[14px] font-medium">Members</h2>
              <div className="border-t border-line">
                {people(firm.id).map((p) => (
                  <Row key={p.id}>
                    <Avatar initials={p.initials} src={p.avatar} size={28} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px]">{p.name}{p.id === user.id ? <span className="text-faint"> (this account)</span> : null}</span><span className="block truncate text-[12px] text-faint">{p.email}</span></span>
                    <span className="hidden text-[12.5px] text-muted sm:block">{p.role}</span>
                  </Row>
                ))}
              </div>
            </>
          )}

          {tab === "automation" && (
            <div className="border-t border-line">
              {RULES.map(([t, d, auto]) => (
                <Row key={t}>
                  <span className="min-w-0 flex-1"><span className="block text-[13px]">{t}</span><span className="block text-[12px] text-faint">{d}</span></span>
                  <span className={clsx("text-[12.5px]", auto ? "text-muted" : "font-medium")}>{auto ? "Automatic" : "Approval"}</span>
                </Row>
              ))}
            </div>
          )}

          {tab === "integrations" && (
            <>
              <section className="mb-10">
                <h2 className="mb-1 text-[13px] font-medium">Mailbox</h2>
                <div className="border-t border-line">
                  <Row>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-[12px] font-medium text-muted">G</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px]">Gmail</span>
                      <span className="block truncate text-[12px] text-faint">{mailbox ? `${mailbox.email}${mailbox.last_check ? ` · checked ${ago(mailbox.last_check)}` : ""}${mailbox.last_error ? ` · ${mailbox.last_error}` : ""}` : "Reads incoming case mail and sends approved replies"}</span>
                    </span>
                    {mailbox ? (
                      <form action={disconnectMailbox}><button className={btn.ghost}>Disconnect</button></form>
                    ) : googleConfigured() ? (
                      <a href="/api/connect/google" className={btn.primary}>Connect</a>
                    ) : (
                      <span className="text-[12px] text-faint">Not configured</span>
                    )}
                  </Row>
                  <Row>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-[12px] font-medium text-muted">O</span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px]">Outlook</span><span className="block text-[12px] text-faint">Microsoft 365</span></span>
                    <span className="text-[12px] text-faint">Planned</span>
                  </Row>
                </div>
                {connected && <p className="mt-3 text-[13px] text-muted">Connected. Mail from now on is read automatically.</p>}
                {integrationError && <p className="mt-3 text-[13px] text-risk">{integrationError}</p>}
              </section>
              {admin && (
                <section className="mb-10">
                  <h2 className="mb-1 text-[13px] font-medium">Forwarding address</h2>
                  <div className="border-t border-line py-3">
                    {inbound ? (
                      <>
                        <p className="mb-2 break-all rounded-lg bg-side px-3 py-2 font-mono text-[12px]">{`${process.env.APP_URL ?? ""}/api/inbound/${inbound}`}</p>
                        <p className="text-[12px] text-faint">Shown once. Point a forwarding service at it (Postmark inbound format). Any mail system can then route case mail to Lincoln.</p>
                      </>
                    ) : (
                      <form action={newInboundAddress} className="flex items-center justify-between gap-4">
                        <span className="text-[12.5px] text-muted">For firms on any mail system. Issuing a new address disables the previous one.</span>
                        <button className={btn.secondary}>Issue address</button>
                      </form>
                    )}
                  </div>
                </section>
              )}
              {INTEGRATIONS.map(([group, items]) => (
                <section key={group} className="mb-8">
                  <h2 className="mb-1 text-[13px] font-medium">{group}</h2>
                  <div className="border-t border-line">
                    {items.map(([name, what]) => (
                      <Row key={name}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-[12px] font-medium text-muted">{name[0]}</span>
                        <span className="min-w-0 flex-1"><span className="block text-[13px]">{name}</span><span className="block text-[12px] text-faint">{what}</span></span>
                        <span className="text-[12px] text-faint">Planned</span>
                      </Row>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}

          {tab === "usage" && (() => {
            const acts = activitySince(firm.id, new Date(Date.now() - 7 * 86400000).toISOString());
            const total = acts.reduce((s, a) => s + a.minutes, 0);
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(Date.now() - (6 - i) * 86400000);
              const key = d.toISOString().slice(0, 10);
              return { label: DAY[d.getDay()], min: acts.filter((a) => a.at.slice(0, 10) === key).reduce((s, a) => s + a.minutes, 0) };
            });
            const max = Math.max(...days.map((d) => d.min), 1);
            const byKind = Object.entries(acts.reduce<Record<string, number>>((m, a) => ((m[a.kind] = (m[a.kind] ?? 0) + a.minutes), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
            return (
              <>
                <div className="text-[12.5px] text-muted">Estimated time saved, last 7 days</div>
                <div className="serif mt-1 text-[44px] font-medium leading-none">{hours(total)}</div>
                <div className="mt-8 flex h-[110px] items-end gap-3">
                  {days.map((d, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className={clsx("w-full rounded-[4px]", i === 6 ? "bg-ink" : "bg-[#dedbd5]")} style={{ height: `${Math.max(2, (d.min / max) * 84)}px` }} />
                      <span className="text-[11px] text-faint">{d.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 border-t border-line">
                  {byKind.map(([k, m]) => <Row key={k} className="py-2.5"><span className="flex-1 text-[13px]">{KINDS[k] ?? k}</span><span className="text-[13px] tabular-nums text-muted">{hours(m)}</span></Row>)}
                </div>
                <p className="mt-3 text-[12px] text-faint">Each completed task counted at a provisional standard time.</p>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
