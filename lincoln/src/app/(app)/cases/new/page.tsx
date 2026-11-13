import Link from "next/link";
import { ChevronLeft, FileSignature, Inbox, Upload } from "lucide-react";
import { Card, PageHead, btn } from "@/components/ui";
import { createCase } from "@/lib/actions";
import { LIBRARY } from "@/lib/library";
import { requireUser } from "@/lib/session";

export default async function NewCase() {
  await requireUser();
  return (
    <div className="rise max-w-[640px]">
      <Link href="/cases" className="mb-4 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink"><ChevronLeft size={14} /> Cases</Link>
      <PageHead title="New case" sub="Most cases open themselves. This is for the ones that do not." />
      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        {[[FileSignature, "A signed engagement letter", "Lincoln opens the case when the client signs."], [Inbox, "An email from a new client", "Lincoln drafts the reply and the booking."], [Upload, "Files you already have", "Import from your old case software in Settings."]].map(([I, h, t]) => {
          const Icon = I as typeof Inbox;
          return <Card key={h as string} className="px-3.5 py-3"><Icon size={16} className="mb-2 text-muted" /><div className="text-[13px] font-medium">{h as string}</div><p className="text-[12px] leading-relaxed text-muted">{t as string}</p></Card>;
        })}
      </div>
      <form action={createCase}>
        <Card className="flex flex-col gap-4 px-4 py-4">
          <label className="block"><span className="mb-1 block text-[12.5px] text-muted">Client</span><input name="client" required maxLength={120} placeholder="Full name or company" className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[13.5px] outline-none focus:border-ink" /></label>
          <label className="block"><span className="mb-1 block text-[12.5px] text-muted">Kind of case</span>
            <select name="type" required className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[13.5px] outline-none focus:border-ink">
              {LIBRARY.map((f) => <optgroup key={f.name} label={f.name}>{f.types.map(([code, name]) => <option key={f.name + code} value={code}>{code}: {name}</option>)}</optgroup>)}
            </select>
          </label>
          <div><button className={btn.primary}>Open the case</button></div>
        </Card>
      </form>
    </div>
  );
}
