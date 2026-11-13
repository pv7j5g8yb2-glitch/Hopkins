import { ArrowUp } from "lucide-react";

export default function AskBox() {
  return (
    <form action="/assistant" method="get" className="flex items-end gap-2 rounded-2xl bg-panel p-2.5 pl-4 ring-1 ring-transparent transition focus-within:ring-line">
      <textarea name="q" rows={1} placeholder="Ask about a case, document or deadline" className="block min-h-[36px] w-full resize-none bg-transparent py-2 text-[14px] leading-relaxed outline-none placeholder:text-faint" />
      <button aria-label="Ask Lincoln" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas transition hover:bg-black active:scale-[0.96]">
        <ArrowUp size={16} />
      </button>
    </form>
  );
}
