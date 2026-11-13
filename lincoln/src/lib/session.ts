import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export type User = { id: string; firm_id: string; name: string; email: string; role: string; initials: string };
export type Firm = { id: string; name: string; demo: number };
export const COOKIE = "lincoln_session";

export async function currentUser(): Promise<{ user: User; firm: Firm } | null> {
  const sid = (await cookies()).get(COOKIE)?.value;
  if (!sid) return null;
  const d = db();
  const user = d.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?").get(sid) as User | undefined;
  if (!user) return null;
  const firm = d.prepare("SELECT * FROM firms WHERE id = ?").get(user.firm_id) as Firm;
  return { user, firm };
}

/** Every page and action starts here. Nothing is read without a signed in user and their firm. */
export async function requireUser() {
  const s = await currentUser();
  if (!s) redirect("/signin");
  return s;
}
