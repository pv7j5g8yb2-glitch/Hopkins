import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authUrl, googleConfigured } from "@/lib/gmail";
import { newToken } from "@/lib/passwords";
import { currentUser } from "@/lib/session";

export async function GET() {
  const s = await currentUser();
  if (!s) return NextResponse.redirect(new URL("/signin", process.env.APP_URL ?? "http://localhost:3000"));
  if (!googleConfigured()) return NextResponse.redirect(new URL("/settings?tab=integrations&error=google", process.env.APP_URL ?? "http://localhost:3000"));
  const state = newToken();
  (await cookies()).set("lincoln_oauth", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return NextResponse.redirect(authUrl(state));
}
