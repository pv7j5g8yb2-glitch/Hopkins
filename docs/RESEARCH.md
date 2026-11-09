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

## Pricing thread (Google AI summaries, 2026-11-09, unverified)

* Claimed: immigration firms are flat fee and paralegal heavy, so per seat price multiplies, and
  $299 a seat is too high for self serve. Suggested $49 to $150 a seat, or a low base plus a fee
  per generated packet, or an attorney seat at a premium with cheap paralegal seats.
* Matches reported competitor prices (Docketwise $69 to $119, LegistAI $50 to $80). Visalaw AI
  ($220 to $480) goes the other way. No immigration firm has been asked yet.
* Seat maths for $100k a month profit at about 75 percent margin (about $133k revenue): $79 a
  seat needs about 1,690 seats, $149 about 895, $300 about 445. Margin is a guess.
* Useful product ideas from it: an RFE analyst (read the USCIS letter, say what is claimed, list
  the evidence to collect), form to letter consistency checks, a Visa Bulletin alert, every fact
  linked to its source page, integrate with Docketwise or similar instead of replacing them.
* Not to rely on: itemising an AI fee on a client's bill (check bar rules), "Lenora AI",
  mention of GPT-4o and Claude 3.5 Sonnet (out of date), "the market is wide open".
* Decision: ask lawyers in the test what they would pay per person per month. Do not set the price
  from an AI summary.

## Immigration AI platforms found (2026-11-09, from searches, not a complete or verified list)

Built for immigration lawyers: Parley (support letters, RFE analyser, forms, Word add-in),
CaseBlink (Studio drafting, $2M pre-seed Mar 2025), Visalaw.ai (research and drafting, $1.6M seed
Feb 2025, co-founded by Greg Siskind), Drafty AI, Immigration Copilot, US Immigration AI, HAQQ
(general legal AI with an immigration page).
Case management with AI: Docketwise (IQ add-on, about $69 to $129 a seat), LegistAI ($50 to $60),
Imagility (RFE Response Builder, no public price), INSZoom by Mitratech (AI integrations with
Visalaw AI, Lawfully and Candle AI shown at AILA June 2026), Cerenade eimmigration ($55, no AI
found), CaseONE immiONE (RFE Copilot), Prolexis, BCOS, MigraTrack, Filevine ImmigrationAI (2023),
LollyLaw (AI unconfirmed), Lawyaw (forms, one blog), Instafill (forms).
AI first firms and services: Alma (law firm, $17M Series A), Casium (licensed firm model, $5M seed
Oct 2025), Gale (YC W25, about $2.7M seed, H-1B).
Self filer tools: VisaWorker.ai (free to start, $249 to unlock), QuickFiling, USVisaStack.ai.
General legal AI with immigration customers possible: Harvey, Legora, CoCounsel, Clio, Spellbook,
Claude and ChatGPT (no immigration features confirmed).
Not found: any Series A for a pure software vendor in this space. Check next: the AILA conference
exhibitor list.
