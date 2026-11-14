import clsx from "clsx";
import { btn } from "./ui";
import { disconnect, newInboundAddress, setTeamsChannel } from "@/lib/actions";
import { PROVIDERS, checkHealth, connectionsOf, settingsOf, teamsChannels } from "@/lib/integrations";
import { Check, CircleAlert } from "lucide-react";
import { ago } from "@/lib/format";
import { isAdmin, type User, type Firm } from "@/lib/session";

/** Brand logos live in /public/logos. Shown at a fixed size inside a soft tile. */
export function Logo({ name, size = 28 }: { name: string; size?: number }) {
  const file = LOGO_FILE[name];
  return (
    <span className="flex shrink-0 items-center justify-center rounded-[9px] border border-line bg-white" style={{ width: size + 8, height: size + 8 }}>
      {file
        ? // eslint-disable-next-line @next/next/no-img-element
          <img src={`/logos/${file}`} alt="" width={Math.round(size * 0.8)} height={Math.round(size * 0.8)} className="object-contain" style={{ width: Math.round(size * 0.8), height: Math.round(size * 0.8) }} />
        : <span className="text-[12px] font-medium text-muted">{name[0]}</span>}
    </span>
  );
}

const LOGO_FILE: Record<string, string> = {
  Google: "google.svg", Gmail: "gmail.svg", Drive: "drive.svg", Docs: "docs.svg", Sheets: "sheets.svg", Slides: "slides.svg", Calendar: "calendar.svg",
  Microsoft: "microsoft.svg", Outlook: "outlook.svg", Word: "word.svg", Excel: "excel.svg", PowerPoint: "powerpoint.svg", OneDrive: "onedrive.svg", SharePoint: "sharepoint.svg", Teams: "teams.svg",
  "Word add-in": "word.svg", Dropbox: "dropbox.svg", Box: "box.svg", DocuSign: "docusign.svg", Slack: "slack.svg",
  Docketwise: "docketwise.png", LollyLaw: "lollylaw.png", INSZoom: "inszoom.png", eImmigration: "eimmigration.png", Clio: "clio.png", "Spreadsheet import": "excel.svg",
  "USCIS case status": "uscis.png", LawPay: "lawpay.png", QuickBooks: "quickbooks.svg", iManage: "imanage.png", NetDocuments: "netdocuments.png", Zapier: "zapier.svg",
};

const PLANNED: [string, [string, string][]][] = [
  ["Documents", [["Word add-in", "Lincoln inside Word"], ["Dropbox", "Files"], ["Box", "Files"], ["iManage", "Document management"], ["NetDocuments", "Document management"]]],
  ["Signatures and messaging", [["DocuSign", "Signatures"], ["Slack", "Notices"]]],
  ["Migration", [["Docketwise", "Cases and documents"], ["LollyLaw", "Cases and documents"], ["INSZoom", "Cases and documents"], ["eImmigration", "Cases and documents"], ["Clio", "Matters and documents"], ["Spreadsheet import", "Anything else"]]],
  ["Government and finance", [["USCIS case status", "Receipt status, through the official USCIS API"], ["LawPay", "Payments"], ["QuickBooks", "Accounts"], ["Zapier", "Other tools"]]],
];

export default async function IntegrationsPanel({ user, firm, connected, error, inbound, recheck }: { user: User; firm: Firm; connected?: string; error?: string; inbound?: string; recheck?: boolean }) {
  const conns = connectionsOf(firm.id, user.id);
  const health = Object.fromEntries(await Promise.all(conns.map(async (c) => [c.provider, await checkHealth(c, recheck || Boolean(connected))] as const)));
  const ms = conns.find((c) => c.provider === "microsoft");
  let channels: { teamId: string; channelId: string; name: string }[] = [];
  if (ms) { try { channels = await teamsChannels(ms); } catch { channels = []; } }
  const problem = error ? ({ google: "Google is not configured on this server.", microsoft: "Microsoft is not configured on this server.", state: "The sign in expired. Try again.", connect: "The sign in was not completed.", sample: "Accounts cannot be connected to the shared sample workspace." } as Record<string, string>)[error] : null;

  return (
    <div>
      <section className="mb-10">
        <div className="grid gap-3 md:grid-cols-2">
          {PROVIDERS.map((p) => {
            const c = conns.find((x) => x.provider === p.id);
            return (
              <div key={p.id} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex items-center gap-3">
                  <Logo name={p.name} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{p.name}</span>
                    <span className="block truncate text-[12px] text-faint">{c ? `${c.email}${c.last_check ? ` · checked ${ago(c.last_check)}` : ""}` : p.id === "google" ? "Gmail and Google Workspace" : "Microsoft 365 and Outlook.com"}</span>
                  </span>
                  {c ? (
                    <form action={disconnect}><input type="hidden" name="provider" value={p.id} /><button className={btn.ghost}>Disconnect</button></form>
                  ) : p.configured() ? (
                    <a href={`/api/connect/${p.id}`} className={clsx(btn.primary, "press")}>Connect</a>
                  ) : (
                    <span className="text-[12px] text-faint">Not configured</span>
                  )}
                </div>
                {c && health[p.id] && (
                  <div className="mt-4 border-t border-line pt-3">
                    {health[p.id].map((h) => (
                      <div key={h.service} className="flex items-center gap-2 py-1 text-[12.5px]">
                        {h.ok ? <Check size={14} className="shrink-0 text-ink" /> : <CircleAlert size={14} className="shrink-0 text-risk" />}
                        <span className="flex-1">{h.service}</span>
                        {!h.ok && <span className="truncate text-faint">{h.note}</span>}
                      </div>
                    ))}
                    <div className="mt-2 flex gap-4 text-[12.5px]">
                      {health[p.id].some((h) => h.note === "Permission not granted") && <a href={`/api/connect/${p.id}`} className="font-medium text-ink underline underline-offset-4">Grant missing permissions</a>}
                      <a href="/integrations?recheck=1" className="text-muted underline decoration-line underline-offset-4 hover:text-ink">Check again</a>
                    </div>
                  </div>
                )}
                {!c && <div className="mt-4 flex flex-wrap gap-2">
                  {p.services.map((s) => (
                    <span key={s} className={clsx("flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px]", c ? "border-line text-ink" : "border-line text-muted")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/logos/${LOGO_FILE[s]}`} alt="" width={14} height={14} className="h-[14px] w-[14px] object-contain" />{s}
                    </span>
                  ))}
                </div>}
                {c?.last_error && <p className="mt-3 text-[12px] text-risk">{c.last_error}</p>}
                {c && p.id === "microsoft" && (
                  <form action={setTeamsChannel} className="mt-4 flex items-center gap-2">
                    <select name="channel" defaultValue={settingsOf(c).teams ? `${settingsOf(c).teams!.teamId}|${settingsOf(c).teams!.channelId}|${settingsOf(c).teams!.name}` : ""} className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-ink">
                      <option value="">Teams notices off</option>
                      {channels.map((ch) => <option key={ch.channelId} value={`${ch.teamId}|${ch.channelId}|${ch.name}`}>{ch.name}</option>)}
                    </select>
                    <button className={btn.secondary}>Save</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        {connected && <p className="mt-3 text-[13px] text-muted">Connected. New mail is read automatically from now on.</p>}
        {problem && <p className="mt-3 text-[13px] text-risk">{problem}</p>}
      </section>

      {isAdmin(user.role) && !firm.demo && (
        <section className="mb-10">
          <h2 className="mb-1 text-[13px] font-medium">Forwarding address</h2>
          <div className="border-t border-line py-3">
            {inbound ? (
              <>
                <p className="mb-2 break-all rounded-lg bg-side px-3 py-2 font-mono text-[12px]">{`${process.env.APP_URL ?? ""}/api/inbound/${inbound}`}</p>
                <p className="text-[12px] text-faint">Shown once. For a forwarding service in Postmark inbound format.</p>
              </>
            ) : (
              <form action={newInboundAddress} className="flex items-center justify-between gap-4">
                <span className="text-[12.5px] text-muted">For mail hosted outside Google and Microsoft. A new address disables the previous one.</span>
                <button className={btn.secondary}>Issue address</button>
              </form>
            )}
          </div>
        </section>
      )}

      {PLANNED.map(([group, items]) => (
        <section key={group} className="mb-8">
          <h2 className="mb-1 text-[13px] font-medium">{group}</h2>
          <div className="border-t border-line">
            {items.map(([name, what]) => (
              <div key={name} className="flex items-center gap-3 border-b border-line py-3">
                <Logo name={name} size={24} />
                <span className="min-w-0 flex-1"><span className="block text-[13px]">{name}</span><span className="block text-[12px] text-faint">{what}</span></span>
                <span className="text-[12px] text-faint">Planned</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
