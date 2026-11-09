# Where things stand (read this at the start of every session)

Last updated 2026-11-09. `CLAUDE.md` holds the rules, this file holds the state. Update it when
anything here changes. The repo is public: never put passwords, keys or personal details in it.

## What Lincoln is now

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
* Look (2026-11-09): wordmark in Source Serif 4 Medium, black ink `#161614` on warm paper `#F2F0ED` or white on black, no accent colour. Files and notes in `brand/`.
* Hard limits and writing rules are in `CLAUDE.md`.

## Not decided

* Whether the L monogram becomes the icon, or the wordmark stands alone, and the trademark result.
* The exact first workflow, and whether the first release is one case type end to end or wider.
* Price, and per seat or per case.
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
