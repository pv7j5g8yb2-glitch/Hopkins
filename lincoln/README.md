# Lincoln app (first draft, 2026-11-13)

The first working version of Lincoln: an immigration case platform for US law firms. The plan it
follows is `../docs/LINCOLN-V1.md`.

## Run it

```
npm install
node scripts/render-pages.mjs   # page images for the made up demo case
npm run dev                     # http://localhost:3210
```

Sign in with "Open the demo workspace". The demo firm, people, clients and cases are all made up.
"Reset the demo" in the sidebar puts everything back.

## What works today

* Today: what needs you, what Lincoln did, dates coming up, who each case is waiting on.
* Cases: 12 made up cases across the kinds of immigration work. One is complete (Dr. Réka Halász,
  O-1A, from `../demo/o1-halasz`): 37 documents read from a 52 page file, 13 issues, evidence graded
  against the eight criteria.
* Approvals: decide, don't proofread. Ten strategy decisions with the evidence attached; the support
  letter is then built from the answers (a criterion is argued only if the attorney said yes).
* The letter: facts linked to the page they came from (hover to see the page), judgement calls
  highlighted, notes for the attorney in red, "show only what needs you", export to Word.
* Demo world: four events from outside (client email, referee letter, USCIS Request for Evidence,
  receipt notice) and what Lincoln does about each.
* Inbox, Lincoln report (time saved, estimate), Library, Integrations (roadmap), Settings.

## What is scripted, and what is not built yet

* The demo case was read ahead of time and its data is stored in `src/lib/halasz.ts`. Lincoln does not
  yet read a new file live inside the app. That needs a model connected (`src/lib/llm.ts`).
* The Assistant chat is wired to the model client but has not been tested against a live model.
* Outside events are played by a button, not by a real inbox or USCIS.
* Sign in with Microsoft or Google, real email, e-signing and imports are not built.
* The standard task times behind the Lincoln report are placeholders.

## Security: where it stands

In place: every row carries its firm and every query filters on it (`src/lib/queries.ts`); pages of
client documents are served only to a signed in member of the firm; sessions sit in an httpOnly
cookie; the model key stays in `.env.local` on the server and out of git.

Not in place yet (all required before any real client file): database level separation with a key
per firm, two step sign in, encryption at rest, an outside security review, a signed data agreement.
**Made up cases only until then.**

## Model key

`.env.local` (never committed):

```
LLM_API_KEY=...
LLM_BASE_URL=...   # the provider's OpenAI style address
LLM_MODEL=...
```
