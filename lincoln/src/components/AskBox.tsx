import { ArrowUp } from "lucide-react";

export default function AskBox({ placeholder = "Ask Lincoln about any case, document or deadline…", defaultValue = "" }: { placeholder?: string; defaultValue?: string }) {
  return (
    <form action="/assistant" method="get" className="rounded-2xl bg-panel p-3 ring-1 ring-transparent transition focus-within:ring-line">
      <textarea name="q" rows={2} defaultValue={defaultValue} placeholder={placeholder} className="block w-full resize-none bg-transparent px-1 text-[14px] leading-relaxed outline-none placeholder:text-faint" />
      <div className="mt-1 flex items-center justify-between">
        <span className="hidden px-1 text-[12px] text-faint sm:block">Lincoln answers from your firm's cases only</span>
        <button className="ml-auto flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-ink px-3 text-[13px] font-medium text-canvas transition hover:bg-black active:scale-[0.98]">
          Ask Lincoln <ArrowUp size={14} />
        </button>
      </div>
    </form>
  );
}
