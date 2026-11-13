import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connect, isProvider } from "@/lib/integrations";
import { appUrl } from "@/lib/integrations/http";
import { currentUser } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const s = await currentUser();
  if (!s) return NextResponse.redirect(new URL("/signin", appUrl()));
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("lincoln_oauth")?.value;
  jar.delete("lincoln_oauth");
  const code = url.searchParams.get("code");
  if (!isProvider(provider) || !code || expected !== `${provider}.${url.searchParams.get("state")}`) return NextResponse.redirect(new URL("/settings?tab=integrations&error=state", appUrl()));
  try {
    await connect(provider, s.firm.id, s.user.id, code);
    return NextResponse.redirect(new URL(`/settings?tab=integrations&connected=${provider}`, appUrl()));
  } catch (e) {
    console.error("Connection failed", provider, e instanceof Error ? e.message : e);
    return NextResponse.redirect(new URL("/settings?tab=integrations&error=connect", appUrl()));
  }
}
