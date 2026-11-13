import { redirect } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { signInDemo } from "@/lib/actions";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SignIn() {
  if (await currentUser()) redirect("/");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5">
      <div className="rise w-full max-w-[360px]">
        <div className="wordmark mb-2 text-center text-[40px] leading-none">Lincoln</div>
        <p className="mb-9 text-center text-[14px] text-muted">Your immigration cases, moving on their own.</p>
        <form action={signInDemo}>
          <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[14px] font-medium text-canvas transition hover:bg-black active:scale-[0.99]">
            Open the demo workspace <ArrowRight size={15} />
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-[11.5px] uppercase tracking-[0.08em] text-faint">
          <span className="h-px flex-1 bg-line" /> for your firm <span className="h-px flex-1 bg-line" />
        </div>
        <div className="flex flex-col gap-2">
          {["Continue with Microsoft", "Continue with Google"].map((t) => (
            <button key={t} disabled className="flex h-11 w-full items-center justify-between rounded-xl border border-line bg-white px-4 text-[14px] text-faint">
              {t} <span className="rounded-md bg-panel px-1.5 py-0.5 text-[11px]">Not open yet</span>
            </button>
          ))}
        </div>
        <p className="mt-8 flex items-start gap-2 text-[12px] leading-relaxed text-faint">
          <Lock size={13} className="mt-0.5 shrink-0" />
          The demo workspace holds made up cases only. Lincoln prepares work for a licensed attorney to review and sign. It is not a lawyer.
        </p>
      </div>
    </main>
  );
}
