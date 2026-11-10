# Lincoln

Lincoln is an AI workspace for immigration lawyers (decided 2026-11-09, Ismael). It was called
Hopkins until that day, and the repo and its GitHub name still say Hopkins. The earlier real
estate content product, the Covered certificate tracker and everything around them were
removed from this repo on 2026-11-09. They are still in git history up to commit `341cf65` if
anything is ever needed. The clinic agency model is dropped for good. Do not suggest it.

## Start here

Read `docs/STATE.md` at the start of every session: it has the current state, what is decided,
what is open and what to do next. Keep it up to date when anything in it changes.
Whenever something important comes up (a decision, a preference, a lesson, a plan, a finding),
save it straight away without asking: rules go in this file, state and plans in `docs/STATE.md`,
research in `docs/RESEARCH.md`, then commit and push. Not every remark is a rule: save what will
matter again, not passing thoughts.

## Git

Push work to the session branch without asking. Never push to another branch without permission.
Only ask first when a change would alter something live that Ismael has not agreed to.

## Writing for Ismael

These are hard rules. They come from repeated correction, not preference.

**Never use dashes.** No em dashes, no en dashes, no dashes as punctuation of any kind. Use a
comma, a full stop, or restructure the sentence. This applies to every message, draft and rewrite.

**Irish English, not American.** Enquiry not inquiry. Realise, organise, apologise. Programme,
centre, colour. "At the weekend", not "on the weekend".

**Sound like a person, not a salesperson.** Plain sentences. No LinkedIn register, no "circling
back", no "hope this finds you well", no "I wanted to reach out". Short is better than clever.

**Say what the reader gets, not what the product does.**

**Never claim anything untested or untrue.** No invented results, user counts, certifications,
customers, testimonials or capabilities that have not actually been run. This matters more here
than anywhere: lawyers check, and a false claim ends the company.

**Don't repeat what an earlier message in the thread already said.**

**Examples read as suggestions.** Never use a dated or basic idea (AI receptionists, chatbots) or
one he has ruled out as an example, even to show a method. If an example is not something worth
building in 2026, leave it out.

**One ask, and make it answerable.**

**Don't pad, don't act superior, don't pile on options.** Ismael gets angry at long lists, at
being asked what he already answered, and at being told to talk to people without a reason. Give
a straight answer first, then the reason. When he decides something, do it.

## The project

* **What it is:** a self serve AI workspace for immigration lawyers in the US (the law is federal,
  so no single state). Like Claude or ChatGPT, trained and set up for immigration work: it takes
  any time consuming task, returns a finished file (Word, PDF, Excel), and connects to the tools
  lawyers use (Word, Google Docs, Outlook, Drive, their case software). Ready made workflows
  first, a general assistant on top. Priced per seat per month (about $300 is the working figure,
  untested).
* **First workflows (draft, to be tested):** employment based cases (O-1, EB-1, H-1B, L-1 and
  green cards from them), end to end from client questionnaire and evidence to a finished filing
  packet. Family cases, forms, deadlines and billing come later.
* **Goal (Ismael, 2026-11-09):** $100k a month profit by age 20, about November 2031. Roughly
  445 seats at $300 if about 75 percent of revenue is profit (both figures are assumptions).
* **Name (Ismael, 2026-11-09): Lincoln**, after Abraham Lincoln the lawyer. Domain: uselincoln.com
  (found free, to be bought by a parent or guardian, used only as the web address). lincoln.ai
  is for sale and is left for later when there is money and users, do not overpay early. Ruled
  out: Walter (Legora owns Walter AI), Atticus, Gideon (both used in legal tech), Suits
  (Suits.ai exists, and Mike Ross practised without a licence), Hopkins (clashes with Johns
  Hopkins in search). Still to do: a US trademark search for LINCOLN in software and legal
  services, and a look at what a search for "Lincoln AI" shows. Lincoln is a big brand in other
  industries (Lincoln Financial, Lincoln Motor, Lincoln Electric).
* **Honest odds:** low single digits to about ten percent for the goal, a guess. Every funded
  competitor (Harvey, Legora, Clio, Spellbook, CoCounsel, Parley, CaseBlink, Docketwise and
  others) is already selling. See `docs/RESEARCH.md`.

## Ismael's real requirements (2026-11-10)

* The only goal: about $100k a month profit (about $1M a year) by age 20. Price, self serve and
  seat counts are not rules in themselves.
* No video or phone calls with buyers. Selling and talking to customers in writing is fine (email,
  DMs, LinkedIn), as long as it is a normal human conversation, not template pitching.

## Hard limits (do not break these)

* **Ismael is 15.** A parent or guardian must be the legal owner of the company and the account
  holder for payments, contracts and data agreements. LinkedIn's minimum age is believed to be
  16 (verify): do not set up an account that pretends to be someone else.
* **No fake identity, no fake founder, no fake lawyer.** The product is not a lawyer and never
  claims to be. Every output is for a licensed attorney to review. Say so plainly.
* **No client files in testing.** Test only on public documents and made up cases.
* **Security claims only if true.** No SOC 2, ISO or HIPAA badges until they exist. What can be
  said honestly: no training on customer data, a zero retention agreement with the model
  provider (only if actually signed), where data is stored, how to delete it.
* **No made up proof.** No logos, quotes, stats or "pilots" that did not happen.
* **No scraping and no ways round a site's bot protection.**
* **Unauthorised practice of law:** the product prepares documents for lawyers. It does not give
  legal advice to the public.

## How to work

* Test before saying it works. Look at the real output, not only that tests pass.
* Run the cheap test before the big build. The plan is in `docs/TEST-PLAN.md`.
* Do not build anything Ismael has not asked for. Say what you think and wait.
* Check a claim against a source before repeating it. Many sources in this field are vendor
  blogs, and AI summaries get firms, dates and funding wrong.
