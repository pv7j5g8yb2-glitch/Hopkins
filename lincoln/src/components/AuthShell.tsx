import Link from "next/link";
import type { ReactNode } from "react";

export const field = "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[14px] outline-none transition placeholder:text-faint focus:border-ink";
export const submit = "flex h-11 w-full items-center justify-center rounded-xl bg-ink text-[14px] font-medium text-canvas transition hover:bg-black active:scale-[0.99]";

export function Notice({ tone = "risk", children }: { tone?: "risk" | "ok"; children: ReactNode }) {
  return <p className={`mb-4 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${tone === "ok" ? "bg-ok-bg text-ok" : "bg-risk-bg text-risk"}`}>{children}</p>;
}

export default function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-canvas px-5">
      <div className="flex flex-1 flex-col items-center justify-center py-12">
        <div className="rise w-full max-w-[360px]">
          <Link href="/signin" className="wordmark mb-8 block text-center text-[34px] leading-none">Lincoln</Link>
          <h1 className="mb-5 text-center text-[15px] font-medium">{title}</h1>
          {children}
          {footer && <div className="mt-5 text-center text-[13px] text-muted">{footer}</div>}
        </div>
      </div>
      <footer className="flex justify-center gap-5 pb-6 text-[12px] text-faint">
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
      </footer>
    </main>
  );
}
