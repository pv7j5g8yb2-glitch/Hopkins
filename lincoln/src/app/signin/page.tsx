import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell, { Notice, SocialButtons, field, fieldLabel, submit } from "@/components/AuthShell";
import { signIn, signInDemo } from "@/lib/actions";
import { currentUser } from "@/lib/session";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = {
  invalid: "Email or password is incorrect.",
  limited: "Too many attempts. Try again in 15 minutes.",
  expired: "The sign in expired. Start again.",
  provider: "Sign in with Google or Microsoft could not be completed.",
  linked: "This email already has a Lincoln account. Sign in with the password, then connect Google or Microsoft in Settings.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string; deleted?: string }> }) {
  if (await currentUser()) redirect("/");
  const { error, reset, deleted } = await searchParams;
  return (
    <AuthShell
      title="Sign in to Lincoln"
      subtitle="Welcome back"
      footer={<Link href="/signup" className="font-medium text-ink hover:underline">Create an account</Link>}
      below={<form action={signInDemo}><button className="text-[13px] font-medium text-muted underline decoration-[#cfccc6] underline-offset-4 transition hover:text-ink">View the demo account</button></form>}
    >
      {error && ERR[error] && <Notice>{ERR[error]}</Notice>}
      {reset && <Notice tone="ok">Password updated.</Notice>}
      {deleted && <Notice tone="ok">The firm and all of its data have been deleted.</Notice>}
      <SocialButtons />
      <form action={signIn} className="flex flex-col gap-4">
        <label className="block"><span className={fieldLabel}>Email address</span><input name="email" type="email" required autoComplete="email" placeholder="name@firm.com" className={field} /></label>
        <label className="block">
          <span className={fieldLabel}>Password<Link href="/forgot" className="text-[12px] font-medium text-muted hover:text-ink">Forgot password</Link></span>
          <input name="password" type="password" required autoComplete="current-password" className={field} />
        </label>
        <button className={`${submit} mt-1`}>Continue <ChevronRight size={15} /></button>
      </form>
    </AuthShell>
  );
}
