import { Card, Chip, PageHead } from "@/components/ui";
import { LIBRARY } from "@/lib/library";
import { requireUser } from "@/lib/session";

export default async function Library() {
  await requireUser();
  const n = LIBRARY.reduce((s, f) => s + f.types.length, 0);
  return (
    <div className="rise">
      <PageHead title="Library" sub={`${n} case types`} />
      <div className="grid gap-3 md:grid-cols-2">
        {LIBRARY.map((f) => (
          <Card key={f.name} className="px-4 py-3.5">
            <div className="mb-0.5 flex items-center justify-between gap-2"><h2 className="text-[14.5px] font-medium">{f.name}</h2><Chip tone={f.drafting === "testing" ? "warn" : "neutral"}>{f.drafting === "testing" ? "Drafting in validation" : "Drafting not yet validated"}</Chip></div>
            <p className="mb-2.5 text-[12.5px] text-muted">{f.note}</p>
            <div className="flex flex-wrap gap-1.5">{f.types.map(([code, name]) => <span key={code} title={name} className="rounded-md border border-line px-1.5 py-0.5 text-[12px]"><span className="font-medium">{code}</span> <span className="text-faint">{name}</span></span>)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
