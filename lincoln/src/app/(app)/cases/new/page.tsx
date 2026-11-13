import { PageHead, btn, field, label } from "@/components/ui";
import FileDrop from "@/components/FileDrop";
import { createCase } from "@/lib/actions";
import { LIBRARY } from "@/lib/library";
import { llmConfigured } from "@/lib/llm";
import { requireUser } from "@/lib/session";

const ERRORS: Record<string, string> = {
  fields: "Client and case type are required.",
  size: "The file exceeds 25 MB.",
  type: "Only PDFs and photos (JPEG, PNG, WebP, HEIC) are accepted.",
  sample: "Files cannot be added to the shared sample workspace.",
};

export default async function NewCase({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const { error } = await searchParams;
  return (
    <div className="rise mx-auto max-w-[520px]">
      <PageHead title="New case" />
      <form action={createCase} className="flex flex-col gap-5">
        <label className="block"><span className={label}>Client</span><input name="client" required maxLength={120} className={field} /></label>
        <label className="block"><span className={label}>Petitioner or employer <span className="font-normal text-faint">Optional</span></span><input name="counterpart" maxLength={120} className={field} /></label>
        <label className="block"><span className={label}>Case type</span>
          <select name="type" required className={field}>
            {LIBRARY.map((f) => <optgroup key={f.name} label={f.name}>{f.types.map(([code, name]) => <option key={f.name + code} value={code}>{code} · {name}</option>)}</optgroup>)}
          </select>
        </label>
        {llmConfigured() && <div><span className={label}>Client file <span className="font-normal text-faint">Optional</span></span><FileDrop /></div>}
        {error && ERRORS[error] && <p className="text-[13px] text-risk">{ERRORS[error]}</p>}
        <div><button className={btn.primary}>Open case</button></div>
      </form>
    </div>
  );
}
