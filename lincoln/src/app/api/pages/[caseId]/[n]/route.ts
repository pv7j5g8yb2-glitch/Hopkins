import fs from "node:fs";
import path from "node:path";
import { currentUser } from "@/lib/session";
import { caseById } from "@/lib/queries";

// Client pages are never public files. They are read from disk only for a signed in member of the
// firm that owns the case.
export async function GET(_: Request, { params }: { params: Promise<{ caseId: string; n: string }> }) {
  const s = await currentUser();
  if (!s) return new Response("Sign in first", { status: 401 });
  const { caseId, n } = await params;
  const c = caseById(s.firm.id, caseId);
  const page = Number(n);
  if (!c || !Number.isInteger(page) || page < 1 || page > c.pages) return new Response("Not found", { status: 404 });
  const file = path.join(process.cwd(), "data", "pages", c.id, `p-${String(page).padStart(2, "0")}.jpg`);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" } });
}
