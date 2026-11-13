import { ArrowUp } from "lucide-react";

export default function AskBox({ caseId, placeholder = "Ask about a case, a document or a deadline" }: { caseId?: string; placeholder?: string }) {
  return (
    <form action="/assistant" method="get" className="rounded-2xl border border-line bg-white p-3 shadow-[0_2px_10px_-6px_rgba(22,22,20,0.18)] transition focus-within:border-[#c9c5bd]">
      {caseId && <input type="hidden" name="case" value={caseId} />}
      <textarea name="q" rows={2} required placeholder={placeholder} className="block w-full resize-none bg-transparent px-1.5 pt-1 text-[15px] leading-relaxed outline-none placeholder:text-faint" />
      <div className="flex justify-end">
        <button aria-label="Send" className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black active:scale-[0.96]">
          <ArrowUp size={16} />
        </button>
      </div>
    </form>
  );
}
