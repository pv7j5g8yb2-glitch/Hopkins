# What Lincoln is (draft, 2026-11-12)

Nothing here is built. "Decided" means Ismael said it in conversation; "proposed" means Claude
suggested it and he has not agreed yet. Update this file when either changes.

## In one line

Lincoln runs every immigration case for a US law firm, from the day a client signs to the day
USCIS decides, so the lawyer only reviews and signs. (Decided in substance, wording proposed.)

## Who it is for (decided)

* US immigration law firms and their lawyers and paralegals. Sold to the firm.
* Never finding clients ourselves. An AI law firm was considered and rejected (clients trust
  established firms).
* Immigration first, every case type the firm takes, not a short list of visas. Other practice
  areas only later, if immigration works.

## What the firm gets (decided in substance)

* Cases that move without anyone at the firm chasing, drafting from scratch or watching dates.
* Work that matches a top immigration lawyer's work product. Lincoln never presents itself as a
  lawyer; a licensed lawyer reviews and signs everything.
* Every deliverable back automatically as editable Word files, any other format on request.
* Not a wrapper: it acts over months, keeps the state of each case, works with other people and
  government systems, and learns from outcomes. Plain Claude cannot do that.

## What Lincoln does on a case (proposed)

1. **New case.** Starts on its own when the firm opens a case in its case software, forwards a
   signed engagement letter, or adds it in Lincoln.
2. **Intake.** Sends the client a questionnaire and a checklist built for their case type, in their
   language, in the firm's name. Reads every upload as it arrives (scans, spreadsheets, other
   languages), sends back what is unusable, flags conflicts, name variants and dates that matter.
3. **Evidence.** Chases the client for what is missing. Drafts letters for referees, employers and
   experts, sends them to edit and sign, chases until signed. Arranges certified translations.
4. **Assessment.** Checks the case against the rules for its type, with citations: what to claim,
   what to leave out, what is missing, what is risky.
5. **Drafting.** Forms, the support letter or brief, exhibit index, cover letter, and a gaps and
   risks list for the lawyer.
6. **Lawyer review.** One place to read, edit and approve. Nothing legal goes out without approval.
7. **Filing.** Assembles the packet ready to file.
8. **After filing.** Tracks receipts and case status, drafts the Request for Evidence or NOID
   response the day it arrives, prepares interview prep, and starts the next step when a case is
   approved (for example an I-140 leading to an I-485).
9. **Every date, every case.** Expiry dates, filing windows and deadlines across the whole firm,
   with warnings before anything runs out.
10. **Anything else.** A general immigration assistant for the firm's other tasks.

## What Lincoln never does (decided, from the hard limits)

* Give legal advice to the public, appear in court, sign, or file without a lawyer's approval.
* Send anything to a client or third party that the firm has not approved or set rules for.
* Claim a case type is supported before it has passed a blind test with an answer key.
* Claim security credentials (SOC 2 and so on) or a zero retention agreement before they exist.

## How it is built (proposed)

* **One engine for every case:** intake, chasing documents and people, translations, forms, dates,
  USCIS status, RFEs, client updates.
* **A library entry per case type:** law with citations, forms and fees (with edition dates),
  evidence needed, deadlines, common RFE issues, written from USCIS form instructions, the
  regulations and the Policy Manual.
* **A test case with an answer key per case type,** scored blind. Untested types are clearly marked
  as unchecked to the lawyer.
* **Security from the first line (decided: extremely secure and private per firm):** each firm's data
  separated and encrypted with its own key, encryption everywhere, short lived file links, roles,
  two step login, a log of who opened what, no training on client data, real deletion, no client
  data in logs, data stored in the US. Made up cases only until security is reviewed.

## Not decided

* Price, and per case or per seat ($199 to $300 a seat mentioned earlier).
* How firms find Lincoln without cold outreach, calls or personal content. The biggest open problem.
* Which parent or guardian owns the company; which immigration lawyer advises.
* Model provider and data agreements.
* First step: a demo on the made up Halasz case with fake email and a fake USCIS feed (proposed,
  waiting for a yes).
