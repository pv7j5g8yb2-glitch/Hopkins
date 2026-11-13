import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell, { Notice, field, submit } from "@/components/AuthShell";
import { signUp } from "@/lib/actions";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { fields: "Every field is required, with a valid email.", password: "The password needs at least 10 characters.", exists: "An account with this email already exists.", limited: "Too many attempts. Try again later." };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  return (
    <AuthShell title="Create an account" footer={<>Already registered? <Link href="/signin" className="font-medium text-ink hover:underline">Sign in</Link></>}>
      {error && ERR[error] && <Notice>{ERR[error]}</Notice>}
      <form action={signUp} className="flex flex-col gap-2.5">
        <input name="name" required maxLength={100} autoComplete="name" placeholder="Full name" className={field} />
        <input name="firm" required maxLength={120} autoComplete="organization" placeholder="Firm name" className={field} />
        <input name="email" type="email" required autoComplete="email" placeholder="Work email" className={field} />
        <input name="password" type="password" required minLength={10} autoComplete="new-password" placeholder="Password (10 characters or more)" className={field} />
        <button className={submit}>Create account</button>
      </form>
      <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
        Creating an account accepts the <Link href="/terms" className="underline hover:text-ink">Terms</Link> and <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.
      </p>
    </AuthShell>
  );
}
