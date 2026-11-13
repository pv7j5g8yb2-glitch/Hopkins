"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

/** One line that grows with the text. Enter sends, Shift and Enter adds a line. */
export default function Composer({ value, onChange, onSend, busy, placeholder = "Ask Lincoln anything", autoFocus }: { value: string; onChange: (v: string) => void; onSend: () => void; busy?: boolean; placeholder?: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [fly, setFly] = useState(0);
  const go = () => { setFly((n) => n + 1); onSend(); };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!busy && value.trim()) go(); }} className="flex items-end gap-2 rounded-[22px] border border-line bg-white py-2 pl-4 pr-2 shadow-[0_2px_12px_-6px_rgba(22,22,20,0.18)] transition focus-within:border-[#c9c5bd]">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!busy && value.trim()) go();
          }
        }}
        placeholder={placeholder}
        className="block max-h-[220px] min-h-[24px] flex-1 resize-none bg-transparent py-[5px] text-[15px] leading-6 outline-none placeholder:text-faint"
      />
      <button key={fly} disabled={busy || !value.trim()} aria-label="Send" className={`mb-px flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-white transition-colors hover:bg-black ${fly ? "send-pop" : ""} ${busy || !value.trim() ? "opacity-20" : ""}`}><ArrowUp size={16} /></button>
    </form>
  );
}
