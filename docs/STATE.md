# Where things stand (read this at the start of every session)

**Lincoln stopped (2026-11-11).** It failed the pass bar agreed before the final test. Do not reopen it
unless Ismael asks. Use the blind test method (`demo/`) as a one day filter for any next idea: if plain
Claude or ChatGPT does the job about as well, drop the idea.

Last updated 2026-11-12. `CLAUDE.md` holds the rules, this file holds the state. Update it when
anything here changes. The repo is public: never put passwords, keys or personal details in it.

## Being explored: Lincoln autopilot (2026-11-12, not decided, nothing built)

Full draft definition: `docs/LINCOLN.md`.

Idea: Lincoln runs each immigration case for the firm from signed engagement to decision (intake,
chasing client documents, referee letters and translations, forms, petition, USCIS status, RFE
responses, dates), sold to firms, everything sent in the firm's name, a lawyer reviews and signs.
Ismael's requirements so far:
* Sold to firms and lawyers, never finding clients ourselves (an AI law firm was rejected: trust).
* Positioned as part of the firm, so it must work on every immigration case type the firm takes,
  not a short list of visas (a narrow list reads as "not for us").
* Extremely secure and private to each firm.
Unsolved: how firms find it without cold outreach, calls or personal content. Proposed first step,
waiting for his yes: a demo on the made up Halasz case with fake email and a fake USCIS feed.

## Ruled out (2026-11-11)

Audience first (posting the story of building and testing ideas): rejected by Ismael. Do not suggest again.

## Closed (2026-11-11)

Lincoln, legal AI for law firms and immigration firms, is closed. The reason (Ismael's
correction): not the funded incumbents, which he already knew about, but that even narrowed to
immigration, getting small and mid sized firms to sign up to a self serve legal AI platform would
be very hard, close to impossible. Based on a review of 21 competitor homepages (Harvey, Legora,
CaseBlink, Parley, Visalaw, LegistAI, Docketwise, eImmigration, LEAP, Smokeball, Filevine LOIS,
CoCounsel and others) plus two r/legaltech threads. Findings are in `docs/RESEARCH.md`.
The name, logo and brand files stay in `brand/` in case they are useful for something else.
Next: pick one new direction and commit to it for 90 days without restarting.

## Reopened for a test (2026-11-10)

Ismael said go on the three week Lincoln test. Week 1 started: a made up O-1A case is in
`demo/o1-varga/` (all invented, with deliberate traps listed in `answer-key.md`). Three runs: plain
Claude and plain ChatGPT with `plain-run-paste.txt`, and Lincoln's four step method in a fresh
Claude chat (`lincoln/message-1..4-paste.txt`). Then blind scoring against `rubric.md`. If Lincoln
is not clearly best, stop. Known weakness: the same author wrote the traps and the method; a second
case written separately should confirm any win. No Anthropic API key yet (an API account needs an
adult, so a parent must open it).

Week 1 result (2026-11-10): Lincoln v0.1 and plain Claude tied (averages 96.25 and 96.5 of 100
across a Claude judge and a ChatGPT judge); plain ChatGPT 93.25. Lincoln did not clearly win.
Details in `demo/o1-varga/results.md`.

Final round started (2026-11-10): case 2 in `demo/o1-halasz/` (52 page messy bundle plus salary
spreadsheet, answer key committed before Lincoln v0.2). Pass bar: Lincoln beats plain Claude by at
least 5 points with BOTH judges, otherwise Lincoln stops.

Final round result (2026-11-11): Lincoln v0.2 averaged 96.55, plain Claude 91.2, plain ChatGPT 94.75,
but the Claude judge gave Lincoln only +1.7 over plain Claude, so the pass bar (+5 with both judges)
was not met. By the rule agreed before the test, Lincoln stops. Details: `demo/o1-halasz/results.md`.

## Ruled out (2026-11-10)

Shopify App Store product: rejected by Ismael. Do not suggest again.

## What Ismael has said he likes (2026-11-10)

* Building something like Claude trained for one specific group (he knows the wrapper and
  crowding problems).
* Browsing property and car listings. As a child he sketched new car designs for BMW and Audi.
* Football, the gym, YouTube. Nothing on the YC batch list stood out to him.

## What Lincoln was

An AI workspace for immigration lawyers in the US. Self serve, per seat, working price about $300
a month (untested). Like Claude or ChatGPT set up for immigration practice: any time consuming
task in, a finished file out (Word, PDF, Excel), connected to Word, Google Docs, Outlook, Drive
and case software. A licensed attorney reviews everything. Nothing is built yet.

How we got here (short): the realtor content product was dropped on 2026-11-05 because AI made
designs were not good enough and it was one funded competitor away from irrelevant. Covered (a
subcontractor insurance certificate tracker) was built on 2026-11-08 and dropped the same day
because the category already has cheap and free tools. After a long review of legal AI
(`docs/RESEARCH.md`), Ismael chose immigration law on 2026-11-09. Everything older was removed
from the repo the same day. History is in git up to commit `341cf65`.

## Decided

* Target buyer: immigration lawyers and small firms in the US, across all states.
* Shape: a general immigration assistant on top of ready made workflows, with file output and tool
  connections. Employment based cases first (O-1, EB-1, H-1B, L-1, green cards), end to end from
  intake to packet.
* Goal: $100k a month profit by age 20 (about November 2031). Profit, not revenue.
* Name: Lincoln (decided 2026-11-09). Domain uselincoln.com, to be bought by a parent or guardian. lincoln.ai is for sale, left for later. Trademark search for LINCOLN still to do. The old Hopkins logo files are in `archive/hopkins-logo/`.
* Look (2026-11-09): wordmark in Literata SemiBold (600), black ink `#161614` on warm paper `#F2F0ED` or white on black, no accent colour. Files and notes in `brand/`.
* Hard limits and writing rules are in `CLAUDE.md`.

* Product requirement (2026-11-11): the four passes run automatically and the lawyer always gets every
  deliverable back as separate Word files in one go (support letter, criteria map, exhibit index,
  gaps and risks). No manual exporting, no tabs to hunt for. Lawyers can ask in the chat for any other
  format: one combined file, a zip, PDF, Word, one at a time. Default to editable Word (lawyers on
  Reddit say they finish everything in Word), with a download all button; check the default with the
  first real lawyers rather than guessing.
* Quality bar (Ismael, 2026-11-10): the work Lincoln does should match a top immigration lawyer's
  work product. It never presents itself as a lawyer; a licensed lawyer reviews and signs.

## Not decided

* Whether the L monogram becomes the icon, or the wordmark stands alone, and the trademark result.
* The exact first workflow, and whether the first release is one case type end to end or wider.
* Price figure. Structure decided 2026-11-12: one fixed monthly fee per firm, unlimited use, no per case fee (per user, see `docs/LINCOLN.md`). $199 to $300 a seat mentioned earlier.
* Who the parent or guardian owner is, and how payments and contracts are held.
* Which immigration lawyer will advise (nobody yet).
* Which model providers and what data agreements.

## Facts that matter (all from `docs/RESEARCH.md`, many unverified)

* Funded competitors already sell to immigration lawyers: Parley (O-1A writer in Word),
  CaseBlink (reported $2M pre-seed), Visalaw AI (reported $220 to $480 a month), LegistAI,
  Docketwise (with Docketwise IQ). Harvey, Legora, Clio, Spellbook and CoCounsel serve law
  broadly. Claude and ChatGPT are what lawyers already use.
* Lawyers on Reddit say the value is packaging, Word integration, ready made workflows and the
  firm's own templates, and that people who can build their own do. The people who buy are the
  ones who will not build it.
* Seat maths: $100k a month revenue at $300 a seat is about 333 seats, about 110 firms at 3
  seats. For $100k profit at 75 percent margin, about 445 seats. Assumptions, not data.
* Honest odds of the goal: low single digits to about ten percent. A guess.

## Next

1. Read and agree `docs/TEST-PLAN.md` (three weeks, no building before the stop rule).
2. Parent or guardian conversation about ownership.
3. Find one immigration lawyer willing to review outputs.
4. Decide the name after lawyers have reacted to something real.
