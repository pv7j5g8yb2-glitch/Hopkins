"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowUp, FileText, Paperclip, X } from "lucide-react";
import { startCase } from "@/lib/actions";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic";

function Send({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={!ready || pending} aria-label="Send" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-opacity ${ready || pending ? "" : "opacity-20"}`}>
      {pending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-canvas/30 border-t-canvas" /> : <ArrowUp size={16} />}
    </button>
  );
}

/** One box: what the case is, and the client's files if there are any. Enter sends. */
export default function CaseComposer() {
  const form = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text]);

  // The hidden input is what the form sends, so it always holds exactly the files shown.
  const sync = (next: File[]) => {
    setFiles(next);
    if (!input.current) return;
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    input.current.files = dt.files;
  };
  const add = (list: FileList | null) => sync([...files, ...Array.from(list ?? [])].slice(0, 40));
  const ready = text.trim().length > 0 || files.length > 0;

  return (
    <form
      ref={form}
      action={startCase}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
    >
      <div className={`rounded-[22px] border bg-card shadow-[0_2px_12px_-6px_rgba(22,22,20,0.18)] transition ${over ? "border-ink" : "border-line focus-within:border-edge"}`}>
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 px-3 pt-3">
            {files.map((f, i) => (
              <li key={i} className="fade-in flex max-w-[220px] items-center gap-1.5 rounded-lg bg-panel py-1 pl-2 pr-1 text-[12.5px]">
                <FileText size={13} className="shrink-0 text-muted" />
                <span className="truncate">{f.name}</span>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => sync(files.filter((_, k) => k !== i))} className="rounded p-0.5 text-faint transition hover:text-ink"><X size={13} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-1 py-2 pl-2 pr-2">
          <button type="button" onClick={() => input.current?.click()} aria-label="Attach files" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-panel hover:text-ink"><Paperclip size={17} strokeWidth={1.8} /></button>
          <textarea
            ref={area}
            name="text"
            rows={1}
            value={text}
            autoFocus
            maxLength={8000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (ready) form.current?.requestSubmit();
              }
            }}
            placeholder="Describe the case or attach files"
            className="block max-h-[240px] min-h-[24px] flex-1 resize-none bg-transparent px-1 py-[5px] text-[15px] leading-6 outline-none placeholder:text-faint"
          />
          <Send ready={ready} />
        </div>
      </div>
      <input ref={input} type="file" name="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { const picked = Array.from(e.target.files ?? []); sync([...files, ...picked].slice(0, 40)); }} />
    </form>
  );
}
