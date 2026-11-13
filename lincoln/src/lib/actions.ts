"use server";

import { cookies } from "next/headers";
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

const now = () => new Date().toISOString();
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export async function signInDemo() {
  const d = db();
  const sid = crypto.randomUUID() + crypto.randomUUID();
  d.prepare("INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)").run(sid, DEMO_USER, now());
  (await cookies()).set(COOKIE, sid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  redirect("/");
}

export async function signOut() {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (sid) db().prepare("DELETE FROM sessions WHERE id = ?").run(sid);
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
      if (qs.some((q) => !q.answer)) throw new Error("Answer every decision first.");
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
          uid(), F, a.case_id, "Support letter ready for your review",
          `Written from your ${qs.length} decisions. ${letter.facts} facts are linked to their source page. Read the ${letter.calls} judgement calls and ${letter.notes} notes; the rest only needs a skim.`,
          "The final merits paragraph: it is the one place where the argument is Lincoln's wording, not a fact from the file.",
          "Nothing is filed from this step. Approving it moves the letter to the filing packet, where you sign.",
          JSON.stringify({ draftId }), user.id, now(), day(3));
        d.prepare("UPDATE cases SET stage = 'Review', summary = ?, waiting_on = ? WHERE firm_id = ? AND id = ?").run(`Support letter written from ${user.name.split(" ")[0]}'s decisions and waiting for review. The consultation and the passport renewal are still open.`, `${user.name}: review the letter`, F, a.case_id);
      }
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
  const code = String(form.get("type") ?? "").trim().slice(0, 40);
  const fam = LIBRARY.find((f) => f.types.some(([c]) => c === code));
  const family = fam?.name ?? "Other";
  const typeName = fam?.types.find(([c]) => c === code)?.[1] ?? code;
  if (!client || !code) return;
  const id = "c_" + uid();
  const ref = `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  db().prepare(`INSERT INTO cases (id, firm_id, ref, client, counterpart, type_code, type_name, family, stage, state, waiting_on, summary, attorney_id, paralegal_id, opened_at, sensitive, pages)
    VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 'Intake', 'moving', NULL, ?, ?, ?, ?, ?, 0)`).run(id, firm.id, ref, client, code, typeName, family, `Opened by ${user.name}. Lincoln starts on the questionnaire and checklist as soon as a model is connected to this workspace.`, user.id, user.id, now(), family === "Humanitarian" ? 1 : 0);
  log(firm.id, id, user.name, "open", "Opened the case.");
  revalidatePath("/", "layout");
  redirect(`/cases/${id}`);
}
