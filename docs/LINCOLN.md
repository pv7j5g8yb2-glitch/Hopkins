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

## The funded version (proposed 2026-11-12)

What VC money buys, in order: the engine and case library for every immigration case type, each
passing its blind test; connections to the firm's tools (Docketwise, LollyLaw, Clio, Outlook, Gmail,
e-signing, a translation provider, the USCIS case status API); an outside security audit and SOC 2;
the outcomes loop (which evidence wins, which draws RFEs, with each firm's permission); one adult
salesperson and a stand at the AILA conference.

## Why a firm picks Lincoln (proposed 2026-11-12, competitor facts from third party sources)

* **Harvey and Legora:** built for big firms and in house teams; Harvey reportedly needs about 20
  seats at about $1,200 a seat a month (unofficial). Their "Intake" products handle in house requests,
  not immigration cases. Most immigration lawyers are solos or in firms of 2 to 5 (about 35 percent and
  26 percent of AILA members, 2026 media kit).
* **CoCounsel:** research and drafting tied to Westlaw, about $637 to $784 per user a month for firms
  up to 10 attorneys (aggregators). Works when asked.
* **Clio Work:** the closest on acting without a prompt, but general across all practice areas and
  needs Clio Manage. Not built around USCIS, petitions and evidence.
* **LegalFly:** in house corporate legal (contracts, due diligence); not immigration firms.
* **Visalaw.ai and Parley:** immigration drafting on request (Visalaw about $220 a licence, $480
  with 10 drafts a month; Parley a team licence reported from $500 a month). The lawyer still runs the
  case: collects evidence, chases people, watches USCIS.
* **Lincoln:** the only one found that runs the whole case (people, documents, USCIS, dates) and is
  priced for a small firm. Risk: any of them can add this. The defence is focus, a tested library for
  every case type, connections to immigration software and outcome data that grows with use.

## Pricing (Ismael decided 2026-11-12: one fixed monthly fee, unlimited use, no per case fee)

* Buyer: the firm, never an individual inside it. Lincoln uses the firm's email, case software and
  client data, so only the firm can authorise it and sign the data agreement. A solo lawyer is the
  firm. (Ismael, from the Legora interview: selling to lawyers one by one does not work in legal.)
* One fixed monthly fee, unlimited cases and unlimited use. No per case fee: charging for each case
  feels like paying extra for Lincoln doing its job.
* The fee is per user (Ismael, 2026-11-12): everyone at the firm who uses Lincoln pays, lawyer or
  not. Working figure $299 per user a month (untested).
* Margin target (Ismael): at least 70 percent. Estimate, not measured: one O-1 case like Halasz
  (52 pages) through four passes on Claude Opus 5.5 ($4 input, $20 output per million tokens, cache
  reads $0.20) is roughly $5 of model cost; a whole case life (uploads, chasing, RFE, status checks on
  Claude Haiku 5.5) roughly $10 to $25. At $299 per user, 70 percent margin holds while the cases
  each user works on cost under about $90 a month, so about 4 to 9 cases a month per user at those
  estimates, more if the real cost is lower. Cases per user per month is unknown. Measure real token use on the Halasz
  demo; if heavy users break the margin, raise the price or add a fair use limit, not a per case fee.
* Gross margin is not profit: salaries, security audits and sales come out after it.

### Adding users (proposed 2026-11-12)
* The person who signs the firm up does it with their work Microsoft or Google account (most firms
  run on one of the two). Lincoln then offers to invite colleagues on the same firm email domain; they
  join in one click with their own work account, and the admin approves each one.
* Invite by email as the fallback for anyone without a work Microsoft or Google account.
* Larger firms: single sign on (Okta, Microsoft Entra) and automatic adding and removing of users,
  so a leaver loses access the day they leave.
* Billing follows users: adding someone adds a seat for the rest of the month, removing them stops it.
* Every person has their own login, role (admin, lawyer, paralegal, assistant) and two step login.
  No shared logins: the record of who opened what only works per person, and firms need that record.

## How to explain Lincoln to a lawyer (draft 2026-11-12; only say it once every line is true)

**What it is.** Lincoln runs your immigration cases from the day the client signs to the day USCIS
decides. You review and sign. Lincoln does the rest.

**What happens on a case.** You open the case. Lincoln emails your client, in their language and in
your firm's name, with a checklist for their case type, reads every document as it comes in and tells
them straight away what is missing or unusable. It drafts the referee letters, sends them out to edit
and sign, and follows up until they are back. It arranges translations. It checks the evidence against
the rules for that case type and tells you what it would claim, what it left out and why. It drafts the
forms, the letter, the exhibit index and a list of risks, as Word files. You review, change what you
want, and approve. After filing it watches USCIS, and the day an RFE arrives you already have a draft
response and the client already has a list of what is needed. It watches every date on every case.

**Why you would care.** Your time goes on the legal judgement, not on chasing people and assembling
paper. Nothing slips because a date was missed. You can take on more cases without hiring.

**Why you can trust it.**
* Nothing goes out in your name without your approval or rules you set.
* Every fact in a draft cites the page it came from, so you can check any line in seconds.
* It shows what it left out and why: a paid award, an unsigned draft letter, a figure that conflicts
  with a dated document.
* Before we say Lincoln handles a case type, it has passed a blind test against an answer key, and
  the results are published.
* Your data is walled off from every other firm, encrypted, never used for training, and deleted
  when you say.
* It is not a lawyer and never says it is. You are the lawyer.

**Price.** One monthly fee per person using Lincoln, unlimited cases.

**Must be true before any of this is said:** the product built and working; each case type that is
named passed its blind test; the security measures actually in place; a written data agreement the
firm can sign.

## Not decided

* Price figures (structure proposed above).
* How firms find Lincoln without cold outreach, calls or personal content. The biggest open problem.
* Which parent or guardian owns the company; which immigration lawyer advises.
* Model provider and data agreements.
* First step: a demo on the made up Halasz case with fake email and a fake USCIS feed (proposed,
  waiting for a yes).
