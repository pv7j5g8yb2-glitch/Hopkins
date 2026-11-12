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

## Pricing (Claude's call 2026-11-12, Ismael to confirm; figures untested)

* Sell to the firm. A solo lawyer is a firm of one. No separate plan for individual lawyers.
* Not per seat. Everyone at the firm uses Lincoln free (lawyers, paralegals, assistants), because the
  engine works across the whole firm and seat pricing charges less the more work Lincoln removes.
* A monthly firm fee for the engine on every case, the assistant and dates, plus a fee per case that
  Lincoln runs to filing. Immigration firms charge clients a flat fee per case, so a per case cost is
  easy for them to price in. Working guesses to test: $299 a month and $150 to $300 a case.
* Illustration only: a firm running 20 cases a month at $200 a case pays about $4,300 a month, so
  about 31 such firms would reach the roughly $133k a month revenue behind $100k profit (at 75 percent margin), against about 445 seats
  at $300. Case volume per firm is unknown.

### Who pays and margin (2026-11-12)
* Buyer: the firm, never an individual lawyer or paralegal inside it. Lincoln uses the firm's email,
  case software and client data, so only the firm can authorise it and sign the data agreement. A
  solo lawyer is the firm. (Ismael noted earlier, from the Legora interview, that selling to lawyers
  one by one does not work in legal.)
* The firm pays a monthly fee plus a fee per case run to filing.
* Margin target (Ismael): at least 70 percent. Estimate, not measured: one O-1 case like Halasz
  (52 pages) through four passes on Claude Opus 5.5 ($4 input, $20 output per million tokens, cache
  reads $0.20) is roughly $5 of model cost; the whole case life (uploads, chasing, RFE, status checks
  on Claude Haiku 5.5 at $0.10 and $0.50) roughly $10 to $25. Against $150 to $300 a case that is a
  gross margin around 85 to 95 percent on cases. Risk: a flat monthly fee with unlimited heavy use
  would eat margin, which is why the per case part stays. Measure real token use on the Halasz demo
  before trusting any of this. Gross margin is not profit: salaries, security audits and sales come
  out after it.

## Not decided

* Price figures (structure proposed above).
* How firms find Lincoln without cold outreach, calls or personal content. The biggest open problem.
* Which parent or guardian owns the company; which immigration lawyer advises.
* Model provider and data agreements.
* First step: a demo on the made up Halasz case with fake email and a fake USCIS feed (proposed,
  waiting for a yes).
