import { PageHead } from "@/components/ui";
import { LIBRARY } from "@/lib/library";
import { requireUser } from "@/lib/session";

export default async function Library() {
  await requireUser();
  const n = LIBRARY.reduce((s, f) => s + f.types.length, 0);
  return (
    <div className="rise">
      <PageHead title="Library" sub={`${n} case types in ${LIBRARY.length} families`} />
      <div className="grid gap-x-12 md:grid-cols-2">
        {LIBRARY.map((f) => (
          <section key={f.name} className="border-t border-line py-5">
            <div className="mb-0.5 flex items-baseline justify-between gap-3">
              <h2 className="text-[14px] font-medium">{f.name}</h2>
              <span className="shrink-0 text-[12px] text-faint">{f.drafting === "testing" ? "Drafting in validation" : "Drafting not validated"}</span>
            </div>
            <p className="mb-3 text-[12.5px] text-muted">{f.note}</p>
            <ul className="flex flex-col gap-1">
              {f.types.map(([code, name]) => <li key={code} className="flex gap-3 text-[13px]"><span className="w-[92px] shrink-0 font-medium">{code}</span><span className="text-muted">{name}</span></li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
