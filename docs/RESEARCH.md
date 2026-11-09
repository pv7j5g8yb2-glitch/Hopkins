# Research log: legal AI (collected 2026-11-08 and 2026-11-09)

Everything here came from web searches, vendor sites and pasted AI summaries. Most sources are
vendor blogs, review sites and Google AI summaries, and they disagree on names, dates and money.
Treat every figure as unverified until checked against a primary source. Never repeat a figure
from here in public copy.

## The market

* Harvey (about $15.5B reported), Legora (about $8.8B reported, bought Qura in April 2026 and
  Walter AI earlier), CoCounsel (Thomson Reuters), Lexis+ AI, Clio (Clio Work, Manage, Grow),
  Spellbook, Legalfly. Harvey and Legora both have mid size firm pages and sell with sales teams.
* Small firm tools and prices (reported): Spellbook about $199 to $350 a seat, CoCounsel
  Essentials about $225 to $400, Clio Work about $199, Paxton $499, GC AI $500.
* Immigration tools (reported): Visalaw AI $220 to $480 a month, LegistAI $50 to $80 a seat,
  Docketwise $69 to $119 a seat (AI on Pro and up), Imagility from $75, Parley (O-1A writer in
  Word), CaseBlink (drafting, reported $2M pre-seed), LegalOS (service, seed). The search on
  2026-11-09 did not confirm any immigration AI funding round, so the earlier "Alma $17M" line
  from a pasted summary is unverified.
* Lawyers already use AI: surveys say 69 to 94 percent use it somehow, but formal firm wide
  adoption is much lower (about 18 to 34 percent). The real opponent is Claude and ChatGPT.
* Anthropic launched Claude for Legal (May 2026, 20 integrations, 12 practice area plugins) and a
  legal plugin for Cowork (January 2026).

## What lawyers say (Reddit r/legaltech thread, about 138 days old on 2026-11-08)

* Praised: Word integration (most mentioned), vaults to ground prompts, exports, ready made
  workflows, drafting in the firm's own voice and templates, first drafts.
* Criticised: "a wrapper", "easily replicated", you still have to check everything, a claim that
  coverage on large document sets is poor because it samples with semantic search.
* Attorneys said they build their own with frontier models. Others said they pay so they do not
  have to build and maintain it. Treat the pro Harvey comments with caution: several readers
  accused them of being marketing.
* Lawyers react badly to anything that smells like marketing. Show real output.

## Trust and risk

* The top worry of small firms is distrust of AI output (reported 83 percent). More than two
  thirds of legal professionals say checking AI costs more than it saves (Morae, reported).
* 2026 sanctions for fake citations ran from about $30,000 to over $100,000 in appeals courts.
* Law Society of Ireland has issued GenAI guidance (verify outputs, the solicitor stays
  responsible). Not directly relevant to a US product, useful for tone.

## Immigration specifics

* Immigration lawyers market themselves in public: LinkedIn is the main network for lawyers
  (ABA 2023 report as cited, 83 percent active), and many post video on LinkedIn, Instagram,
  TikTok and YouTube. One immigration lawyer reportedly has over a million followers.
* No data found on cold message reply rates for immigration lawyers. Our own guess: 5 to 10
  percent reply to a specific message with a free offer, 1 to 2 percent would try something.
* An O-1 beneficiary cannot self petition, a US agent or employer must file. The $100,000 H-1B
  fee was blocked by a court as of October 2026 (reported, appeal pending). Check before relying.
* Immigration files hold passports and personal data. Handle with care and say so plainly.

## Names

* Chosen on 2026-11-09: Lincoln (see `docs/LAUNCH.md`). One search found no legal AI product with
  that name. Not a trademark clearance.
* Taken or poor: Suits.ai exists (Miami, Gartner listing). Walter AI was bought by Legora in
  March 2026 (Vancouver, agents in Word and Outlook). Atticus AI (askatticus.ai) and The Atticus
  Project exist. Gideon Legal and a Gideon app in Clio's directory exist. Hopkins collides with
  Johns Hopkins in search.
* Domain check on 2026-11-09 (basic DNS only): askhopkins.com and .ai, tryhopkins.com,
  usehopkins.com, hopkinslegal.com, hopkinsai.com and hopkins.ai were registered. uselincoln.com
  was found free by Ismael. lincoln.ai is for sale.

## Ideas that were checked and dropped

* Harvey for all small firms: crowded, no gap found.
* Ireland first: Harvey and Legora are already in the big Irish firms, Clio and LEAP in small
  ones, and local startups exist (Newcode, Ovviously, HAQQ, all unverified).
* Quantity surveyors, accountants, architects: crowded with funded tools. Planning consultants
  and independent loss adjusters looked open but small, and were not pursued.
* Verification only (a citation checker): too thin on its own.
* Realtor content, subcontractor certificates, roofing supplements, tariff refunds: see git
  history and earlier notes.
