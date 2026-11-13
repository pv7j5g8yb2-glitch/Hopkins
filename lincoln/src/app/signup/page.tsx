import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import AuthShell, { Notice, SocialButtons, field, fieldLabel, submit } from "@/components/AuthShell";
import { signUp } from "@/lib/actions";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { fields: "Every field is required, with a valid email.", password: "The password needs at least 10 characters.", exists: "An account with this email already exists.", limited: "Too many attempts. Try again later." };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  return (
    <AuthShell title="Create a Lincoln account" subtitle="Mail, files and calendar connect in the same step" footer={<Link href="/signin" className="font-medium text-ink hover:underline">Sign in to an existing account</Link>}>
      {error && ERR[error] && <Notice>{ERR[error]}</Notice>}
      <SocialButtons />
      <form action={signUp} className="flex flex-col gap-4">
        <label className="block"><span className={fieldLabel}>Full name</span><input name="name" required maxLength={100} autoComplete="name" className={field} /></label>
        <label className="block"><span className={fieldLabel}>Firm</span><input name="firm" required maxLength={120} autoComplete="organization" className={field} /></label>
        <label className="block"><span className={fieldLabel}>Email address</span><input name="email" type="email" required autoComplete="email" placeholder="name@firm.com" className={field} /></label>
        <label className="block"><span className={fieldLabel}>Password<span className="text-[12px] font-normal text-faint">10 characters or more</span></span><input name="password" type="password" required minLength={10} autoComplete="new-password" className={field} /></label>
        <button className={`${submit} mt-1`}>Continue <ChevronRight size={15} /></button>
      </form>
    </AuthShell>
  );
}
