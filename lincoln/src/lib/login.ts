import { cookies, headers } from "next/headers";
import { db } from "./db";
import { newToken, sha } from "./passwords";
import { COOKIE, MFA_COOKIE, SESSION_HOURS } from "./session";
import { clientIp } from "./audit";

// Not a server action file: nothing here can be called from the browser directly.

export const cookieOpts = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge });

export async function createSession(userId: string) {
  const token = newToken();
  const agent = ((await headers()).get("user-agent") ?? "").slice(0, 200);
  const at = new Date().toISOString();
  db().prepare("INSERT INTO sessions (id, user_id, created_at, ip, agent, last_seen) VALUES (?, ?, ?, ?, ?, ?)").run(sha(token), userId, at, await clientIp(), agent, at);
  (await cookies()).set(COOKIE, token, cookieOpts(60 * 60 * SESSION_HOURS));
}

/** Starts the second step for a user with two step sign in. Returns where to send the browser. */
export async function beginChallenge(userId: string) {
  const token = newToken();
  db().prepare("INSERT INTO login_challenges (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha(token), userId, new Date(Date.now() + 5 * 60_000).toISOString());
  (await cookies()).set(MFA_COOKIE, token, cookieOpts(300));
  return "/signin/code";
}
