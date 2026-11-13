"use server";

import { cookies, headers } from "next/headers";
import { hashPassword, initialsOf, limited, mailConfigured, newToken, sendMail, sha, validEmail, validPassword, verifyPassword } from "./auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, resetDemo, uid } from "./db";
import { COOKIE, requireUser } from "./session";
import { DEMO_USER } from "./seed";
import { approvalById, kv, messageById, setKv } from "./queries";
import { buildHalaszLetter } from "./letter";
import { EVENTS } from "./demo-events";
import type { Question } from "./halasz";
import { LIBRARY } from "./library";
import { draftForCase, processCase } from "./intake";
import { deliver } from "./agent";

const now = () => new Date().toISOString();
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function startSession(userId: string) {
  const token = newToken();
  db().prepare("INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)").run(sha(token), userId, now());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
}
const clientKey = async () => ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();

export async function signInDemo() {
  await startSession(DEMO_USER);
  redirect("/");
}

export async function signIn(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (limited(`in:${email}`) || limited(`in:${await clientKey()}`, 30)) redirect("/signin?error=limited");
  const u = db().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as { id: string; password_hash: string | null } | undefined;
  if (!verifyPassword(password, u?.password_hash ?? null) || !u) redirect("/signin?error=invalid");
  await startSession(u.id);
  redirect("/");
}

export async function signUp(form: FormData) {
  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  const firmName = String(form.get("firm") ?? "").trim().slice(0, 120);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (limited(`up:${await clientKey()}`, 10)) redirect("/signup?error=limited");
  if (!name || !firmName || !validEmail(email)) redirect("/signup?error=fields");
  if (!validPassword(password)) redirect("/signup?error=password");
  const d = db();
  if (d.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) redirect("/signup?error=exists");
  const firmId = "f_" + uid();
  const userId = "u_" + uid();
  d.transaction(() => {
    d.prepare("INSERT INTO firms (id, name, demo) VALUES (?, ?, 0)").run(firmId, firmName);
    d.prepare("INSERT INTO users (id, firm_id, name, email, role, initials, password_hash, created_at) VALUES (?, ?, ?, ?, 'Administrator', ?, ?, ?)").run(userId, firmId, name, email, initialsOf(name), hashPassword(password), now());
  })();
  await startSession(userId);
  redirect("/");
}

export async function requestReset(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (limited(`fp:${email}`, 5) || limited(`fp:${await clientKey()}`, 15)) redirect("/forgot?error=limited");
  const u = db().prepare("SELECT id FROM users WHERE email = ? AND password_hash IS NOT NULL").get(email) as { id: string } | undefined;
  let preview = "";
  if (u) {
    const token = newToken();
    db().prepare("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha(token), u.id, new Date(Date.now() + 3600_000).toISOString());
    sendMail(email, "Reset the Lincoln password", `A password reset was requested for this account. The link is valid for one hour: /reset/${token}`);
    // Until a mail provider is connected, the link is shown on screen so the flow can be tested.
    if (!mailConfigured()) preview = `&preview=${token}`;
  }
  redirect(`/forgot?sent=1${preview}`);
}

export async function resetPassword(form: FormData) {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!validPassword(password)) redirect(`/reset/${encodeURIComponent(token)}?error=password`);
  const d = db();
  const r = d.prepare("SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").get(sha(token), now()) as { user_id: string } | undefined;
  if (!r) redirect("/forgot?error=expired");
  d.transaction(() => {
    d.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), r.user_id);
    d.prepare("UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL").run(now(), r.user_id);
    d.prepare("DELETE FROM sessions WHERE user_id = ?").run(r.user_id);
  })();
  redirect("/signin?reset=1");
}

export async function signOut() {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (sid) db().prepare("DELETE FROM sessions WHERE id = ?").run(sha(sid));
  jar.delete(COOKIE);
  redirect("/signin");
}

function log(firm: string, caseId: string | null, actor: string, kind: string, text: string, minutes = 0) {
  db().prepare("INSERT INTO activity (id, firm_id, case_id, at, actor, kind, text, minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(uid(), firm, caseId, now(), actor, kind, text, minutes);
}

export async function answerQuestion(approvalId: string, qid: string, answer: "yes" | "no" | "change", note?: string) {
  const { firm } = await requireUser();
  const a = approvalById(firm.id, approvalId);
  if (!a || a.status !== "pending" || a.kind !== "decisions") return;
  const payload = JSON.parse(a.payload) as { questions: Question[] };
  const q = payload.questions.find((x) => x.id === qid);
  if (!q) return;
  q.answer = answer;
  q.note = (note ?? "").slice(0, 500);
  db().prepare("UPDATE approvals SET payload = ? WHERE firm_id = ? AND id = ?").run(JSON.stringify(payload), firm.id, approvalId);
  revalidatePath("/", "layout");
}

export async function acceptAllRecommended(approvalId: string) {
  const { firm } = await requireUser();
  const a = approvalById(firm.id, approvalId);
  if (!a || a.status !== "pending" || a.kind !== "decisions") return;
  const payload = JSON.parse(a.payload) as { questions: Question[] };
  for (const q of payload.questions) if (!q.answer) q.answer = q.recommend;
  db().prepare("UPDATE approvals SET payload = ? WHERE firm_id = ? AND id = ?").run(JSON.stringify(payload), firm.id, approvalId);
  revalidatePath("/", "layout");
}

export async function decideApproval(approvalId: string, decision: "approved" | "rejected") {
  const { user, firm } = await requireUser();
  const d = db();
  const a = approvalById(firm.id, approvalId);
  if (!a || a.status !== "pending") return;
  const F = firm.id;
  const payload = JSON.parse(a.payload);

  const tx = d.transaction(() => {
    if (a.kind === "decisions" && decision === "approved") {
      const qs = payload.questions as Question[];
      if (qs.some((q) => !q.answer)) throw new Error("Every decision must be answered first.");
      const answers = Object.fromEntries(qs.map((q) => [q.id, q.answer as string]));
      log(F, a.case_id, user.name, "decide", `Answered ${qs.length} strategy decisions.`);
      // criteria follow the attorney's answers
      for (const q of qs.filter((x) => /^B\d$/.test(x.id))) {
        const row = d.prepare("SELECT id, evidence FROM criteria WHERE firm_id = ? AND case_id = ? AND code = ?").get(F, a.case_id, q.id) as { id: string; evidence: string } | undefined;
        if (!row) continue;
        const ev = (JSON.parse(row.evidence) as { grade: number }[]).map((e) => (q.answer === "yes" && e.grade === 4 ? { ...e, grade: 5 } : e));
        d.prepare("UPDATE criteria SET recommendation = ?, evidence = ? WHERE id = ?").run(q.answer === "yes" ? "claim" : q.answer === "no" ? "no" : "more", JSON.stringify(ev), row.id);
      }
      if (answers.FIG === "yes") d.prepare("UPDATE issues SET status = 'resolved', resolution = ?, resolved_at = ? WHERE firm_id = ? AND case_id = ? AND id IN ('i_title','i_citations','i_stars','i_headcount')").run(`Decided by ${user.name}: use the dated or signed source.`, now(), F, a.case_id);
      if (answers.OUT === "yes") d.prepare("UPDATE issues SET status = 'resolved', resolution = ?, resolved_at = ? WHERE firm_id = ? AND case_id = ? AND id = 'i_ferrante'").run(`Decided by ${user.name}: the unsigned draft is left out.`, now(), F, a.case_id);
      d.prepare("UPDATE issues SET status = 'resolved', resolution = 'Handled in the letter: stated exactly as the source says.', resolved_at = ? WHERE firm_id = ? AND case_id = ? AND id IN ('i_kinome','i_w2','i_delaney')").run(now(), F, a.case_id);

      if (a.case_id === "c_halasz") {
        const letter = buildHalaszLetter(answers);
        const draftId = uid();
        d.prepare("INSERT INTO drafts (id, firm_id, case_id, title, kind, status, version, content, updated_at) VALUES (?, ?, ?, 'Petition support letter', 'letter', 'for_review', 1, ?, ?)").run(draftId, F, a.case_id, JSON.stringify(letter), now());
        log(F, a.case_id, "Lincoln", "draft", `Wrote the support letter from ${user.name.split(" ")[0]}'s decisions: ${letter.claimed.length} criteria argued, ${letter.facts} facts each linked to its page, ${letter.calls} judgement calls marked.`, 240);
        d.prepare("INSERT INTO approvals (id, firm_id, case_id, kind, title, brief, least_sure, if_wrong, payload, status, assignee_id, created_at, due) VALUES (?, ?, ?, 'draft_review', ?, ?, ?, ?, ?, 'pending', ?, ?, ?)").run(
          uid(), F, a.case_id, "Support letter for review",
          `Drafted from ${qs.length} recorded decisions: ${letter.facts} sourced facts, ${letter.calls} judgement calls, ${letter.notes} attorney notes.`,
          "The final merits paragraph: the one place where the argument is Lincoln's wording, not a fact from the file.",
          "Nothing is filed at this step. Approval moves the letter to the filing packet for signature.",
          JSON.stringify({ draftId }), user.id, now(), day(3));
        d.prepare("UPDATE cases SET stage = 'Review', summary = ?, waiting_on = ? WHERE firm_id = ? AND id = ?").run(`Support letter written from ${user.name.split(" ")[0]}'s decisions and waiting for review. The consultation and the passport renewal are still open.`, `${user.name}: review the letter`, F, a.case_id);
      }
    } else if (a.kind === "message" && decision === "approved" && !firm.demo) {
      log(F, a.case_id, user.name, "decide", `Approved: ${a.title}.`);
    } else if (a.kind === "message" && decision === "approved") {
      const m = messageById(F, payload.messageId);
      if (m) {
        d.prepare("UPDATE messages SET state = 'sent', at = ?, lincoln_note = ? WHERE firm_id = ? AND id = ?").run(now(), `Approved by ${user.name} and sent.`, F, m.id);
        log(F, a.case_id, "Lincoln", "send", `Sent "${m.subject}" to ${m.party} after ${user.name.split(" ")[0]} approved it.`, 5);
      }
    } else if (a.kind === "filing" && decision === "approved") {
      log(F, a.case_id, user.name, "decide", "Approved the application for filing.");
      log(F, a.case_id, "Lincoln", "packet", "Assembled the filing packet in order with the fee form on top, and gave Aisha the filing checklist.", 30);
      d.prepare("UPDATE cases SET summary = ?, waiting_on = 'Aisha Rahman: file the packet' WHERE firm_id = ? AND id = ?").run(`Approved for filing by ${user.name}. The packet is assembled and the filing checklist is with Aisha.`, F, a.case_id);
    } else if (a.kind === "draft_review" && decision === "approved") {
      d.prepare("UPDATE drafts SET status = 'approved', updated_at = ? WHERE firm_id = ? AND id = ?").run(now(), F, payload.draftId);
      log(F, a.case_id, user.name, "decide", "Approved the support letter.");
      d.prepare("UPDATE cases SET summary = 'Support letter approved. Lincoln is assembling the exhibits in filing order. The consultation and the passport renewal are still open.', waiting_on = 'Peer group: advisory opinion' WHERE firm_id = ? AND id = ?").run(F, a.case_id);
    } else if (a.kind === "plan" && decision === "approved") {
      log(F, a.case_id, user.name, "decide", "Approved the response plan.");
      const m = payload.messageId ? messageById(F, payload.messageId) : undefined;
      if (m) {
        d.prepare("UPDATE messages SET state = 'sent', at = ?, lincoln_note = ? WHERE firm_id = ? AND id = ?").run(now(), `Sent when ${user.name} approved the plan.`, F, m.id);
        log(F, a.case_id, "Lincoln", "send", `Sent the document checklist to ${m.party}.`, 5);
      }
      d.prepare("UPDATE cases SET summary = 'Response plan approved. The employer has the checklist; Lincoln will chase it and draft the response as documents arrive.', waiting_on = 'Employer: 4 documents' WHERE firm_id = ? AND id = ?").run(F, a.case_id);
    } else if (decision === "rejected") {
      log(F, a.case_id, user.name, "decide", `Sent back: ${a.title}.`);
    }
    d.prepare("UPDATE approvals SET status = ?, decided_at = ?, decided_by = ? WHERE firm_id = ? AND id = ?").run(decision, now(), user.id, F, approvalId);
    const left = d.prepare("SELECT COUNT(*) AS n FROM approvals WHERE firm_id = ? AND case_id = ? AND status = 'pending'").get(F, a.case_id) as { n: number };
    d.prepare("UPDATE cases SET state = ? WHERE firm_id = ? AND id = ?").run(left.n > 0 ? "needs_you" : "moving", F, a.case_id);
  });
  tx();
  if (a.kind === "message" && decision === "approved" && !firm.demo && payload.messageId) await deliver(F, payload.messageId, { id: user.id, name: user.name });
  revalidatePath("/", "layout");
}

export async function advanceDemo() {
  const { firm } = await requireUser();
  if (firm.demo !== 1) return;
  const step = Number(kv(firm.id, "demo_step") ?? "0");
  const ev = EVENTS[step];
  if (!ev) return;
  const d = db();
  d.transaction(() => {
    ev.run({ d, firm: firm.id, now: now(), day });
    setKv(firm.id, "demo_step", String(step + 1));
  })();
  revalidatePath("/", "layout");
}

export async function resetDemoAction() {
  const { firm } = await requireUser();
  if (firm.demo !== 1) return;
  resetDemo(firm.id);
  (await cookies()).delete(COOKIE);
  redirect("/signin");
}

export async function createCase(form: FormData) {
  const { user, firm } = await requireUser();
  const client = String(form.get("client") ?? "").trim().slice(0, 120);
  const counterpart = String(form.get("counterpart") ?? "").trim().slice(0, 120) || null;
  const code = String(form.get("type") ?? "").trim().slice(0, 40);
  const fam = LIBRARY.find((f) => f.types.some(([c]) => c === code));
  const family = fam?.name ?? "Other";
  const typeName = fam?.types.find(([c]) => c === code)?.[1] ?? code;
  if (!client || !code) redirect("/cases/new?error=fields");
  const file = form.get("file");
  let pdf: Uint8Array | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 25 * 1024 * 1024) redirect("/cases/new?error=size");
    const bytes = new Uint8Array(await file.arrayBuffer());
    // %PDF
    if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) redirect("/cases/new?error=type");
    pdf = bytes;
  }
  const id = "c_" + uid();
  const ref = `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  db().prepare(`INSERT INTO cases (id, firm_id, ref, client, counterpart, type_code, type_name, family, stage, state, waiting_on, summary, attorney_id, paralegal_id, opened_at, sensitive, pages, processing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Intake', 'moving', NULL, ?, ?, ?, ?, ?, 0, ?)`).run(id, firm.id, ref, client, counterpart, code, typeName, family, pdf ? "Reading the client file." : "Opened. No client file yet.", user.id, user.id, now(), family === "Humanitarian" ? 1 : 0, pdf ? 1 : 0);
  log(firm.id, id, user.name, "open", "Opened the case.");
  if (pdf) void processCase(firm.id, id, pdf);
  revalidatePath("/", "layout");
  redirect(`/cases/${id}`);
}

export async function requestDraft(caseId: string, form: FormData) {
  const { firm } = await requireUser();
  const request = String(form.get("request") ?? "").trim().slice(0, 600);
  const c = db().prepare("SELECT pages FROM cases WHERE firm_id = ? AND id = ?").get(firm.id, caseId) as { pages: number } | undefined;
  if (!c || !request || c.pages < 1) return;
  const draftId = uid();
  db().prepare("INSERT INTO drafts (id, firm_id, case_id, title, kind, status, version, content, updated_at) VALUES (?, ?, ?, ?, 'generic', 'drafting', 1, ?, ?)").run(draftId, firm.id, caseId, request.slice(0, 160), JSON.stringify({ sections: [], facts: 0, calls: 0, notes: 0, claimed: [], generic: true }), now());
  void draftForCase(firm.id, caseId, draftId, request);
  revalidatePath("/", "layout");
  redirect(`/cases/${caseId}?tab=drafts&draft=${draftId}`);
}

export async function updateProfile(form: FormData) {
  const { user } = await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  const role = String(form.get("role") ?? "").trim().slice(0, 60);
  const avatar = String(form.get("avatar") ?? "");
  if (!name) redirect("/settings?tab=profile&error=name");
  const d = db();
  d.prepare("UPDATE users SET name = ?, initials = ?, role = ? WHERE id = ?").run(name, initialsOf(name), role || user.role, user.id);
  if (avatar === "remove") d.prepare("UPDATE users SET avatar = NULL WHERE id = ?").run(user.id);
  else if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar) && avatar.length < 400_000) d.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, user.id);
  revalidatePath("/", "layout");
  redirect("/settings?tab=profile&saved=1");
}

export async function changePassword(form: FormData) {
  const { user } = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (limited(`pw:${user.id}`, 6)) redirect("/settings?tab=security&error=limited");
  const row = db().prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string | null };
  if (!row.password_hash) redirect("/settings?tab=security&error=sample");
  if (!verifyPassword(current, row.password_hash)) redirect("/settings?tab=security&error=current");
  if (!validPassword(next)) redirect("/settings?tab=security&error=password");
  const sid = (await cookies()).get(COOKIE)?.value ?? "";
  const d = db();
  d.transaction(() => {
    d.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), user.id);
    // every other device is signed out
    d.prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?").run(user.id, sha(sid));
  })();
  redirect("/settings?tab=security&saved=1");
}

export async function updateFirm(form: FormData) {
  const { user, firm } = await requireUser();
  const name = String(form.get("firm") ?? "").trim().slice(0, 120);
  if (!name || !/admin|managing/i.test(user.role)) redirect("/settings?tab=firm&error=1");
  db().prepare("UPDATE firms SET name = ? WHERE id = ?").run(name, firm.id);
  revalidatePath("/", "layout");
  redirect("/settings?tab=firm&saved=1");
}

export async function clearChat(caseId: string | null) {
  const { user, firm } = await requireUser();
  db().prepare("DELETE FROM chat WHERE firm_id = ? AND user_id = ? AND case_id IS ?").run(firm.id, user.id, caseId);
}

export async function disconnectMailbox() {
  const { user, firm } = await requireUser();
  db().prepare("DELETE FROM mailboxes WHERE firm_id = ? AND user_id = ?").run(firm.id, user.id);
  revalidatePath("/settings");
}

/** Issues a new secret forwarding address for the firm. The old one stops working. */
export async function newInboundAddress() {
  const { user, firm } = await requireUser();
  if (!/admin|managing/i.test(user.role)) return;
  const token = newToken();
  setKv(firm.id, "inbound_hash", sha(token));
  redirect(`/settings?tab=integrations&inbound=${token}`);
}

export async function addFile(caseId: string, form: FormData) {
  const { user, firm } = await requireUser();
  const c = db().prepare("SELECT processing FROM cases WHERE firm_id = ? AND id = ?").get(firm.id, caseId) as { processing: number } | undefined;
  const file = form.get("file");
  if (!c || c.processing || !(file instanceof File) || file.size === 0 || file.size > 25 * 1024 * 1024) redirect(`/cases/${caseId}?tab=documents`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) redirect(`/cases/${caseId}?tab=documents`);
  db().prepare("UPDATE cases SET processing = 1, note = NULL WHERE firm_id = ? AND id = ?").run(firm.id, caseId);
  log(firm.id, caseId, user.name, "file", `Added ${file.name}.`);
  void processCase(firm.id, caseId, bytes, { append: true });
  revalidatePath("/", "layout");
  redirect(`/cases/${caseId}`);
}
