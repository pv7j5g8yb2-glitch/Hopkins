import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connect } from "@/lib/gmail";
import { currentUser } from "@/lib/session";

export async function GET(req: Request) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const s = await currentUser();
  if (!s) return NextResponse.redirect(new URL("/signin", base));
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("lincoln_oauth")?.value;
  jar.delete("lincoln_oauth");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return NextResponse.redirect(new URL("/settings?tab=integrations&error=state", base));
  try {
    await connect(s.firm.id, s.user.id, code);
    return NextResponse.redirect(new URL("/settings?tab=integrations&connected=1", base));
  } catch {
    return NextResponse.redirect(new URL("/settings?tab=integrations&error=connect", base));
  }
}
