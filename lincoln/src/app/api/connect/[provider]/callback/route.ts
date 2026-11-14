import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connect, isProvider, signInWith } from "@/lib/integrations";
import { appUrl } from "@/lib/integrations/http";
import { currentUser } from "@/lib/session";
import { securityEvent } from "@/lib/audit";
import { beginChallenge, createSession } from "@/lib/login";
import { db } from "@/lib/db";

// One return address for both uses: connecting accounts from Settings, and signing in or up.
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const go = (path: string) => NextResponse.redirect(new URL(path, appUrl()));
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("lincoln_oauth")?.value ?? "";
  jar.delete("lincoln_oauth");
  const [mode, p, state] = expected.split(".");
  const code = url.searchParams.get("code");
  if (!isProvider(provider) || p !== provider || !code || !state || url.searchParams.get("state") !== state) return go(mode === "auth" ? "/signin?error=provider" : "/integrations?error=state");

  if (mode === "auth") {
    try {
      const r = await signInWith(provider, code);
      if ("error" in r) return go(`/signin?error=${r.error === "exists" ? "linked" : "provider"}`);
      await securityEvent(r.firmId, r.userId, r.created ? "account_created" : "sign_in", `with ${provider === "google" ? "Google" : "Microsoft"}`);
      const u = db().prepare("SELECT totp_enc FROM users WHERE id = ?").get(r.userId) as { totp_enc: string | null };
      if (u.totp_enc) return go(await beginChallenge(r.userId));
      await createSession(r.userId);
      return go("/");
    } catch (e) {
      console.error("Sign in failed", provider, e instanceof Error ? e.message : e);
      return go("/signin?error=provider");
    }
  }

  const s = await currentUser();
  if (!s) return go("/signin");
  if (s.firm.demo) return go("/integrations?error=sample");
  try {
    const email = await connect(provider, s.firm.id, s.user.id, code);
    await securityEvent(s.firm.id, s.user.id, "connected", `${provider} ${email}`);
    return go(`/integrations?connected=${provider}`);
  } catch (e) {
    console.error("Connection failed", provider, e instanceof Error ? e.message : e);
    return go("/integrations?error=connect");
  }
}
