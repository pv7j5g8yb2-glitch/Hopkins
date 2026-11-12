# Lincoln v1: the version we build now (2026-11-12)

The single plan for the demo, the free pilot and the first raise. It combines `docs/LINCOLN.md`
(Claude's peak version) with the outside review Ismael pasted on 2026-11-12, keeping only what
matters for the next step. Where this file and `docs/LINCOLN.md` disagree, this file wins.

## What Lincoln is

Lincoln runs immigration cases for US law firms, from signed client to USCIS decision. The lawyer
makes every legal call and signs. Lincoln does the rest, and proves how well it does it.

## The edge (why a firm pays $199 to $299 a user and why a VC funds it)

Doing the work on its own is no longer enough: ICM Desk sells it for $6 to $16 a seat and Filevine
says 2027 is the year of autonomous software. Lincoln wins on four things together:

1. **It runs the case.** It notices what each case needs and acts within rules the firm sets.
2. **It proves its accuracy.** A published error rate for each case type, from blind tests with
   answer keys. No immigration product publishes this today.
3. **It proves it pays for itself.** Every month it shows the firm the hours it saved, case by case.
   At the US median paralegal wage (about $29.70 an hour), $249 a user is about 8.4 hours a month.
4. **It goes deep where cheap tools are shallow.** Evidence heavy cases first (O-1, EB-1A, NIW): it
   checks whether each piece of evidence really supports each claim and catches contradictions.

## Taken from the outside review, and why

* **A map of each case.** Every fact is stored with its source page, date, who confirmed it and any
  conflict. Conflicts become issues for a person to resolve; Lincoln never picks one silently.
  Why: this is what makes drafts checkable and review fast.
* **Evidence graded in five steps:** exists, relevant, supports the fact, enough for the legal
  standard, approved by the attorney. Why: "a document mentions it" is not "it proves it".
* **Hard rules in code, not in the AI:** deadline maths, permissions, approvals, nothing sent or filed
  without the required approval. Why: these can never depend on a model behaving.
* **Emails and documents are untrusted.** Text inside an upload or an email can never change
  Lincoln's rules or permissions. Why: Lincoln reads strangers' documents all day.
* **Never drops a task silently.** If it cannot finish something it says why, shows what it tried and
  hands it to a person.
* **Error rate, not acceptance rate.** A lawyer accepting a draft does not prove it was right.
  Material errors are counted separately from style edits.
* **Filing readiness check** before any packet is marked complete: forms, editions, signatures,
  exhibits, translations, fees, consistent personal details. It never says a case will succeed.
* **The morning report ("no case stalls"):** every case, why it is waiting, what Lincoln already
  did, what needs a person today.
* **The right models for each job:** the strongest model for legal reasoning and drafting, a cheap one
  for sorting and reminders. Keeps the cost per case low.
* **First customers:** employment immigration firms of about 3 to 30 people.

## Kept from Claude's version, and why

* **Lincoln is its own platform** (Ismael's decision), with imports from other software inside
  Lincoln and an optional sync during a switch. Not a layer on Docketwise.
* **Three approval levels** (routine on firm rules, messages in batches, legal judgement and filing
  with full attorney review), shown as one card per decision.
* **Word in, Word out.** Lawyers finish in Word, so no own document editor.
* **One price per user a month, unlimited use** (Ismael's decision), with a fair use limit only if
  real usage breaks the 70 percent margin.

## Left out for now, and why

* **"The AI operating system for law firms":** that is Clio's pitch. Lincoln says what it does.
* **Billing, client money accounts, profitability and capacity forecasting:** regulated or heavy,
  and not what proves the product. Later.
* **Learning across firms:** needs contracts and consent. Later; learning within a firm comes first.
* **Watching every USCIS policy change:** later. Form editions and fees are checked from day one.
* **Approval odds or "chance of success":** never.
* **Three pricing tiers, enterprise options, extra channels, other practice areas:** after the raise.
* **Sitting with firms to observe them:** against Ismael's rules. Lawyers judge finished work instead.

## Build order for the demo (made up cases only)

1. **Case and evidence core.** Load the Halasz bundle (52 pages, scans, spreadsheet): document list,
   facts with source pages, conflicts as issues, evidence graded against each O-1A criterion, filing
   requirements checked. Scored against the existing answer key.
2. **Drafts.** Support letter, criteria map, exhibit index, risks list as Word files, every fact
   linked to its page, judgement calls marked. Filing readiness report.
3. **The case running on its own.** A fake client inbox, fake referees and a fake USCIS feed: Lincoln
   asks for missing documents, sends back bad scans, drafts referee letters, chases until "signed",
   reacts to a Request for Evidence with a draft response the same day. Approval cards, the morning
   report and a full record of every action.
4. **The numbers.** Run Varga and Halasz plus one new made up case through Lincoln and through plain
   Claude, judged blind as before: error rate by type, time, and AI cost per case.
5. **Ready for one lawyer to try.** Logins, roles, each firm's data separate and encrypted, the
   action record. The lawyer runs Lincoln on made up cases and gives written feedback.

Real client files stay out (hard limit in `CLAUDE.md`) until there is a security review, a signed
data agreement held by the parent's company, and Ismael changes that rule.

Needs: an Anthropic API key on the parent's account (a few dollars per test case).

## What goes to a VC after that

A short video of a made up case running end to end; the blind test results and error rates; the
cost per case; the lawyer's written feedback (real, with permission); the market facts in
`docs/RESEARCH.md`; the plan for the money. Ismael's rule still applies: no VC before revenue, unless
he changes it.
