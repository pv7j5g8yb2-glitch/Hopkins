import Link from "next/link";
import type { ReactNode } from "react";

export const field = "h-10 w-full rounded-lg border border-[#e3e1dc] bg-white px-3 text-[14px] outline-none transition placeholder:text-[#a8a59f] focus:border-ink focus:ring-4 focus:ring-ink/[0.06]";
export const submit = "press flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-ink text-[14px] font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_1px_2px_rgba(22,22,20,0.2)] transition hover:bg-black";
export const fieldLabel = "mb-1.5 flex items-baseline justify-between text-[12.5px] font-medium text-ink";

export function Notice({ tone = "risk", children }: { tone?: "risk" | "ok"; children: ReactNode }) {
  return <p className={`mb-4 rounded-lg px-3 py-2.5 text-[13px] leading-relaxed ${tone === "ok" ? "bg-[#f1f0ed] text-ink" : "bg-risk-bg text-risk"}`}>{children}</p>;
}

/** Continue with Microsoft / Google: signs in, or creates the account and connects everything in one step. */
export function SocialButtons() {
  const b = "press flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-[#e3e1dc] bg-white text-[14px] font-medium text-ink transition hover:bg-[#f7f6f3]";
  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <a href="/api/auth/microsoft" className={b}><img src="/logos/microsoft.svg" alt="" width={16} height={16} />Continue with Microsoft</a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <a href="/api/auth/google" className={b}><img src="/logos/google.svg" alt="" width={16} height={16} />Continue with Google</a>
      <div className="my-2.5 flex items-center gap-3 text-[12px] text-faint"><span className="h-px flex-1 bg-[#e8e6e1]" />or<span className="h-px flex-1 bg-[#e8e6e1]" /></div>
    </div>
  );
}

export default function AuthShell({ title, subtitle, children, footer, below }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; below?: ReactNode }) {
  return (
    <main className="flex min-h-dvh bg-[#f6f5f3]">
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="auth-in w-full max-w-[400px]">
          <div className="overflow-hidden rounded-[18px] border border-[#e6e4df] bg-[#f1f0ed] shadow-[0_1px_2px_rgba(22,22,20,0.04),0_12px_40px_-16px_rgba(22,22,20,0.22)]">
            <div className="rounded-b-[16px] bg-white px-8 pb-8 pt-9 shadow-[0_1px_0_#e6e4df]">
              <div className="mb-5 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Link href="/signin" aria-label="Lincoln"><img src="/mark.png" alt="" width={40} height={40} className="rounded-[10px]" /></Link>
              </div>
              <h1 className="text-center text-[19px] font-semibold tracking-[-0.01em]">{title}</h1>
              {subtitle && <p className="mt-1 text-center text-[13.5px] text-muted">{subtitle}</p>}
              <div className="mt-7">{children}</div>
            </div>
            {footer && <div className="px-8 py-4 text-center text-[13px] text-muted">{footer}</div>}
          </div>
          {below && <div className="mt-6 text-center">{below}</div>}
          <p className="mt-5 text-center text-[12px] leading-relaxed text-faint">
            Continuing accepts the <Link href="/terms" className="underline decoration-[#cfccc6] underline-offset-2 hover:text-ink">Terms of Service</Link> and <Link href="/privacy" className="underline decoration-[#cfccc6] underline-offset-2 hover:text-ink">Privacy Policy</Link>.
          </p>
        </div>
      </section>
      <aside className="relative hidden w-[46%] max-w-[760px] p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-[22px] bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/auth.jpg" alt="" className="auth-photo absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-7 left-8 flex items-center gap-2.5 text-white">
            <span className="wordmark text-[28px] leading-none">Lincoln</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
