import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell, { Notice, field, submit } from "@/components/AuthShell";
import { signIn, signInDemo } from "@/lib/actions";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { invalid: "Email or password is incorrect.", limited: "Too many attempts. Try again in 15 minutes.", expired: "The sign in expired. Start again." };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string; deleted?: string }> }) {
  if (await currentUser()) redirect("/");
  const { error, reset, deleted } = await searchParams;
  return (
    <AuthShell title="Sign in" footer={<>No account? <Link href="/signup" className="font-medium text-ink hover:underline">Create one</Link></>}>
      {error && ERR[error] && <Notice>{ERR[error]}</Notice>}
      {reset && <Notice tone="ok">Password updated.</Notice>}
      {deleted && <Notice tone="ok">The firm and all of its data have been deleted.</Notice>}
      <form action={signIn} className="flex flex-col gap-2.5">
        <input name="email" type="email" required autoComplete="email" placeholder="Work email" className={field} />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className={field} />
        <button className={submit}>Sign in</button>
      </form>
      <div className="mt-3 text-center"><Link href="/forgot" className="text-[13px] text-muted hover:text-ink">Forgot password</Link></div>
      <div className="my-6 flex items-center gap-3 text-[11.5px] uppercase tracking-[0.08em] text-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <form action={signInDemo}>
        <button className="flex h-11 w-full items-center justify-center rounded-xl border border-line bg-white text-[14px] font-medium transition hover:bg-panel">View the sample workspace</button>
      </form>
    </AuthShell>
  );
}
