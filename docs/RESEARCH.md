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

## Competitor homepages, batch 1 of 2 (read 2026-11-10 from saved pages Ismael sent)

Homepage text only, so every number is the company's own claim.

* Parley (parley.so): no longer immigration only. "The Legal Agent that works": self building
  database from email and calendar, turns templates and past samples into skills, works in
  Outlook and Word, Drive, Box, Dropbox. 100+ legal teams, SOC 2 Type II, free trial.
* CaseBlink: a full immigration system of record with agents: intake that asks only what is
  missing, letters and RFE responses from the firm's prior filings with every claim cited, forms
  with provenance per field, tabbed packets, deadlines, time, billing, translations. 100+ firms
  on the logo wall (Dorsey and Whitney, Dickinson Wright and others). SOC 2 Type II, zero model
  retention. Founder came through F-1, H-1B, O-1A and a green card. This is the Lincoln pitch.
* Visalaw AI: research and drafting with exclusive AILA and AILALink content, endorsed by a past
  AILA president. SOC 2 Type II. Claims 10+ hours and $60k a year saved.
* LegistAI: all in one immigration case management with agents, forms from intake, RFE workflow,
  client portal in four languages, research, WhatsApp. From $60 a user a month.
* Docketwise (owned by 8am, with MyCase and LawPay): forms, case management, CRM, billing, 8am IQ
  AI. From $69 a user a month. Homepage showed a "Notice of Security Incident" banner.
* eImmigration (Cerenade): 17,000+ legal professionals, "AI Workmates", from $55 a user.
* Alma: AI native immigration law firm for businesses and individuals. Claims 98% approvals,
  about 2 week preparation, 86 NPS, named in an a16z top 50 AI spend report.
* Casium: licensed law firm plus platform, 90 countries, claims 99% approvals, 14.5% RFE rate,
  18 days to file. SOC 2.
* Gale (YC): not a law firm, software plus independent attorneys. H-1B petitions for $999,
  1,500+ cases filed, 98% first attempt approvals.
* VisaWorker.ai: open source drafting agent for O-1A, EB-1A and NIW. Free with your own
  Anthropic key, $249 a case hosted, per case pricing for firms. Pitched against $8k to $15k
  attorney fees.
* Smokeball: practice management, 34,000+ users, Archie AI in every matter. ISO 27001.
* LEAP Ireland: 550+ Irish firms, 3,000 firms in Ireland and the UK, 78,000+ users worldwide,
  over 15 million euro a year on R&D, Matter AI and Prompts built in.
* Andri (Amsterdam, has an Irish page): agentic legal AI for Europe, house style drafting, case
  timelines, court simulation, ISO 27001, EU data centres, free trial.
* AI.Law: litigation operating system, one case free, SOC 2 Type II, a patent, founded by a
  litigator.
* CoCounsel (Thomson Reuters): spans legal, tax, audit, accounting and trade, grounded in Westlaw
  and Practical Law. Has small firm plans.
* Mitratech: owns INSZoom (immigration case management) inside a large legal, GRC and HR suite.

Patterns: every product now sells the same thing (system of record, agents, the firm's own
templates, Word and Outlook, finished files, attorney review, cited sources). The trust stack is
identical (SOC 2 or ISO 27001, no training, zero retention). Three models: software for lawyers,
AI native firms that sell the outcome to the end client and take the fee, and cheap self filer
tools. Moats seen: exclusive content (AILA, Westlaw), installed base (Docketwise, eImmigration,
LEAP, Smokeball), and owning the client relationship (Alma, Casium, Gale).

## Competitor homepages, batch 2 of 2 (read 2026-11-10)

* Harvey: "AI software for legal and professional services". Banner: raised $550M at $15.5B.
  3,500+ legal organisations. Agents, Vault, research including tax, shared workspaces with
  ethical walls, memory, legal work orchestration, contract review, regulatory tracking, intake,
  facts and chronologies, MCP connectors, Word. Industry pages now include healthcare and life
  sciences, and media. Customers named: Reed Smith, CMS, Burges Salmon, Repsol, Dentsu, Adecco.
* Legora: "the agentic operating system for legal work" (aOS). Agent plans, executes, reviews and
  delivers. Monitors, Lists, Portal, tax analysis. SOC 2 Type II, ISO 27001, ISO 42001, GDPR, HIPAA.
* LOIS by Filevine: "Legal Operating Intelligence System", agents across every matter, built on
  40M+ matters in Filevine's legal graph. Free trial, no card. Ad film stars Sarah Rafferty (Donna
  in Suits).
* LEGALFLY: legal operating system for corporates, intake, playbook review, drafting in Word,
  agents triggered from email, Slack and Teams, regulatory radar, 130+ jurisdictions, Gartner
  named key vendor. Says it is built for enterprise teams, not law firm productivity.
* LawVu: LegalOS for in-house teams: intake front door, matters, contracts, spend, knowledge,
  agents. Customers include Dentsu (also a Harvey customer).

## Overall read of all 21 (2026-11-10)

* Everyone now sells "the operating system" with agents: Legora aOS, Filevine LOIS, LawVu LegalOS,
  LEGALFLY, CaseBlink, Parley, AI.Law. Lincoln's pitch is the standard pitch.
* The biggest are already moving into other professions: Harvey into professional services,
  healthcare and media, Legora and Harvey into tax, CoCounsel into tax, audit, accounting and
  trade, Parley from immigration to all legal. "Harvey for another profession" is what Harvey
  and Thomson Reuters are doing themselves.
* What keeps the winners winning: data (Filevine 40M matters, Westlaw, AILA content), an installed
  base (LEAP, Smokeball, Docketwise, eImmigration), certifications (SOC 2, ISO 27001, ISO 42001,
  HIPAA), licensed lawyers, and hundreds of millions in funding.
* Verdict given to Ismael: do not build Lincoln as planned. The deciding reason (corrected by
  Ismael, 2026-11-11): funded incumbents were never the problem, he knew about them. The problem
  is that even narrowed to immigration, getting small and mid sized immigration firms to sign up
  to a self serve legal AI platform would be very hard, close to impossible. No reason was found
  for a firm to choose it over CaseBlink, LegistAI or the AI in software it already pays for.

## YC LegalTech directory (pasted 2026-11-11, 53 companies, all YC batches since the start)

The second list Ismael meant to send (236 companies from all industries, F2026 to S2027) did not
arrive: the second paste was the same 53 company LegalTech page again.


* Newest batches (2025 to F2026) are tiny teams (1 to 3 people) doing one money blocking job end
  to end: Elithia (medical record review for injury claims, sold to expert witnesses), Andco and
  Codes Health (record retrieval, Codes Health has 45 staff), Praxis (law firm admin agents),
  OpenIntake (intake calls), Mimos (lead gen and intake for injury firms), Tarifflo (customs
  filing API with MCP), Patent Watch (infringement finding), Mayflower (immigration screening
  inside HR tools). Plus AI native law firms: Wingman Law, Erinys, Blueshoe.
* Each pitch ties to a dollar figure: claims payouts, lost clients ($10k each), overpaid duties,
  patents turned into revenue.
* Older consumer legal tools were acquired: Willing (by MetLife), SimpleCitizen, Clerky.
* Legora's YC entry: $200M+ ARR, 900 staff, $5.6B Series D (other sources say $8.8B later).
* YC offers free Startup School and Co-Founder Matching.

## YC companies F2026 to S2027, all industries (pasted 2026-11-11, 236 companies)

* Batches: 225 Fall 2026, 10 Winter 2027, 1 Summer 2027 (Memorable). Sectors as YC tags them:
  119 B2B, 53 industrials, 21 consumer, 19 fintech, 15 healthcare, 4 real estate and
  construction, 4 government, 1 education. 64 of the 236 taglines mention agents.
* Most of the B2B is tooling for AI agents sold to developers (sandboxes, VMs, inference, testing,
  memory). Most industrials are hardware (robots, drones, defence, energy) that needs capital.
* "Legora for X" is being funded right now: Gradon ("Legora for AEC firms"), Covera (AI native OS
  for insurance brokers), Constor (construction), Ordo Labs (regulated labs), Plek (PE firms).
  This weakens the earlier point that only Harvey and Thomson Reuters can do it.
* One role in a small business, done by AI: Kairos Health (front desk for dental practices),
  Fleety (dispatcher for plumbing and HVAC), Rezora IO (voice agents for home services and real
  estate), Rote (insurance department for auto body shops), Asakana (admin for food
  distributors), Lark (workflows for distributors). Priced against a wage, not against software.
  Their prices and sales model are not known from the list.
* AI native service firms, selling the result: ClaimKit (tax), Wingman Law (injury), Obia
  (commercial real estate brokerage), Ignition Benefits, Veltha (TPA), TrueMile (trucking),
  LinkLane (freight brokerage), Adside.ai (ads agency), Cardinal Square (schools).
* Legal tagged: Elithia, Praxis, Neomatter (in house legal), Wingman Law, Tire Swing. Immigration
  adjacent: Veeza AI (consumer tourist visa agent for weak passports). Adalat AI (courts, India).

## "Legora for X" question and public adjusters (2026-11-11)

* Advice given: not a "Legora for X" platform. Harvey, Legora and the YC "Legora for X" teams
  (Gradon, Covera) sell to firms through sales teams, and the reason Lincoln closed (small firms
  will not adopt a whole new AI platform self serve) applies to every profession.
* Suggested instead: one money blocking document job for a solo or small owner who decides alone.
  Example given: public adjusters (paid a share of each settlement, commonly 10 to 20 percent).
* Existing AI tools for public adjusters found (all small, unverified vendor pages): Clayem
  (policy analysis, demand letters), Restoria (Florida, estimate discrepancy reports, Xactimate
  formats), Claim Navigator AI, Claim Mosaic.
* No reliable national count of public adjusters found. Licensed in 45 states plus DC (2020 trade
  article). Florida had 2,914 in 2009 (state audit). Market size is the open question.
* Business valuation analysts also checked: already served by Equitest, ValuBot, AIVI and others.
* Ruled out by Ismael (2026-11-11): public adjusters. Do not suggest again.

## Legora interview, Max Junestrand with Gustaf Alstromer at YC (pasted 2026-11-11, from 2025)

* Recorded about 13 months after W24, around the $80M Series B. 10 people after YC, 100 at
  recording. The intro says $675M valuation then (the YC directory now says $5.6B Series D).
* Selling: the line is "it's impossible to do a bottom-up motion in our industry because you don't
  procure software individually. You take it through procurement and you take it through IT", plus
  security and data privacy checks. It is about law firms, not AI software in general, it never
  says "self serve", and the transcript labels it Host (labels are jumbled, context suggests Max). Big firms buy through innovation teams. At mid size firms
  the partners decide and it is hard to get the whole partnership in, so start with one partner
  and their team, make them "rock stars", then expand. This matches why Lincoln closed.
* No legal background, but he interviewed 100 lawyers first (LinkedIn messages offering to pay
  their hourly rate for lunch, none accepted the money), and kept daily feedback with early firms.
* Before Legora: programmer, esports betting models, Norrsken (transcript says "Norhen"), a short
  spell at McKinsey, stints at other startups. Rejected by YC once, accepted the second time.
* Early wedge: EU data rules (EU hosting, no training, no retention) that general tools did not
  meet. Then tabular review (grid of documents by questions) and a Word add in with playbooks.
* Paused new sales for four to five months after raising, because a lawyer's first login is the
  only chance. Fixed reliability until they could onboard 1,000 lawyers a day.
* Advice to vertical AI founders: do not compete with the AI labs, do not lock into one model
  provider, find a narrow category the models will not reach, or use them in a way others have not.

## YC Light Cone episode on finding startup ideas (pasted 2026-11-11, recorded 2025)

* Two routes: look within (your own expertise, jobs, internships) or "get out of the house" into
  real businesses. Weekend or hackathon ideas and ideas copied from X are the default bad ones.
* Access through family: Ess Health's founder spent a day in his mother's dental office and found
  insurance admin to automate. "Access is all you need." Many YC billion dollar companies trace to
  a parent, uncle, cousin or old roommate.
* Going undercover: a founder took a real remote job as a medical biller (two to four weeks of
  training) to learn the work. Tip: search Indeed for remote analyst or clerk jobs. Or shadow a
  friend with a boring job (Sweet Spot: a friend refreshing the government contracts site all day,
  now an AI platform for government contracting).
* Signals: work outsourced to low wage countries (Lilac Labs, drive thru orders), and products
  that need expensive consultants to work (Automat versus UiPath).
* Replacing a person paid $60k to $80k a year makes small niches (one dentist office, car loan
  lenders) big enough now.
* DataCurve: 19 year olds whose "AI for product managers" failed because they had never been
  product managers. Their win came from the founder's internship at Cohere.
* Crowded is not a reason to quit if you can actually deliver (Giggl in customer support).
  Taking about a year to find the right idea is normal.

## Research: new model abilities x new forced work (2026-11-10)

Question from Ismael: what can the newest models do that they could not a few months ago, and
where does that meet work businesses are forced or already paying to do. Sources are mostly
secondary (trackers, law firm alerts, vendor pages). Check primary sources before relying on any
figure.

### What changed in the models
* Claude Fable 5 (reported 9 June 2026, "Mythos class"): runs for days in an agent harness,
  plans in stages, uses sub agents, checks its own work; 1M token context. Fable 5.1 adds
  document, spreadsheet and slide work. Opus 5.5 (22 Sept 2026) is near Fable 5.1 at lower cost.
  OpenAI's current family is GPT-5.6 (July 2026); GPT-6 not confirmed.
* METR time horizon: top model about 16 hours or more at 50 percent success (May to Aug 2026),
  doubling about every 4.3 months; METR says above 16 hours is unreliable to measure.
* Computer use: frontier agents above the human baseline on OSWorld Verified (85 percent plus,
  July 2026 paper), but only 20.6 percent full completion on OSWorld 2.0 (long professional
  workflows, median 1.6 human hours).
* AWS WorkSpaces for AI agents (preview May 2026) lets agents drive old desktop software. Horizontal
  players already there: Cyberdesk, Minicor, Coasty, plus AWS and Microsoft.
* Read: short tasks are solved; the new frontier is whole multi day deliverables. Most AI tools
  sold in each niche were built in 2024 and 2025 as step assistants, not finished deliverables.

### Forced work with dates (as reported)
* ADA Title II web and document accessibility (WCAG 2.1 AA): public entities of 50k+ by
  26 April 2027, smaller ones and special districts by 26 April 2028 (DOJ interim rule, April
  2026, being challenged in court).
* HHS Section 504 web rule for recipients of HHS money: 15+ employees by 11 May 2027, fewer than
  15 by 10 May 2028 (interim rule, 7 May 2026). Same WCAG 2.1 AA standard.
* PDF remediation is priced at roughly $5 to $25 a page by hand; automated checkers catch only
  20 to 30 percent of PDF issues. Vendors: Allyant, AbleDocs, CommonLook, Equidox, Foxit
  partners, overlays (AudioEye, UserWay, accessiBe).
* EU AI Act high risk (Annex III) moved to 2 December 2027, Annex I to 2 August 2028 (Digital
  Omnibus, reported in force July 2026).
* EU CBAM first annual declaration for 2026 imports due 30 September 2027; importers under 50
  tonnes exempt (about 90 percent of importers). Pain point: emissions data from non EU suppliers.
* EU MDR legacy devices: Class III and implantable IIb by 31 December 2027, others by
  31 December 2028; notified body capacity is the bottleneck.
* CMMC Phase 2 (third party Level 2 for defence contractors) was due 10 November 2026; one source
  says it was suspended in July 2026. 1,042 of about 76,598 organisations certified by Feb 2026.
* IEEPA tariff refunds: Supreme Court ruling 20 Feb 2026; CBP's CAPE portal had accepted about
  $136.6B by 2 Oct 2026. Older "finally liquidated" entries mostly limited to importers who sued.
* CFPB 1071 small business lending data: tiers from July 2026 to October 2027 (may change).
* CMS prior authorisation APIs for payers by 1 January 2027 (payers, not small practices).

### Niches checked and who is already there
* Duty drawback: Flexport, Zollback, LightSource and others; drawback ranked "best of" lists.
* Phase I environmental site assessments: Ama Earth Group, Vestige, V7, VEMLogic, EnviroForge.
* FDA 510(k): Cruxi, Complizen, RegDesk; consultant retainers reported around $60k.
* Cost segregation: Segtax, KBKG Cost Seg Pro, CostSegregation.com.
* Back office work most exposed: data entry, claims, document review, invoice matching (BPO).

### Conclusion given to Ismael
* Being first in a niche is mostly gone: every obvious one checked has at least a few startups.
* The opening that looks like Harvey in 2023: a product built on days long agents that delivers
  the whole finished project, where today's tools in that niche are 2024 style assistants.
  Harvey was not the first legal AI either (Casetext had CoCounsel at the same time).
* Strongest fits for that: the 2027 and 2028 accessibility deadlines (huge number of forced
  buyers, priced by the page today), and EU MDR technical files (high value, Ireland has a large
  medtech cluster, but sales led).
* Ruled out by Ismael (2026-11-10): accessibility compliance platform (ADA Title II, HHS 504). Do not suggest again.
* Ruled out by Ismael (2026-11-10): Shopify App Store product. Do not suggest again.

## Property, cars and "Claude for one group" (2026-11-10)

* Property investors and syndicators: AI underwriting already crowded (Titleman, Archer, Apers,
  CashflowPortal parsing, V7, Docsumo lists). Developers and land: TestFit, Zenerate, Dwellci,
  Algoma ($2.3M), ArchiWise, Acres.com.
* Franchised car dealers: heavily funded AI (Impel about $126M to $130M, Numa about $48M and
  1,300+ dealers, Toma about $17.5M with a16z and YC, Actively reported $45M, Swirl).
* Independent used car dealers: NIADA 2025 about 53,000 active (117,000 licensed), 9.8M vehicles
  retailed in 2025. A vendor study (AutoAcquire) says 14 percent of independents used AI
  acquisition tools in 2025 against 24 percent of franchise dealers, and independents turn stock
  in 52 days against 38 overall. Tools there: Carketa, AutoAcquire, Van, ACV Auctions.
* Read given to Ismael: the overlap of all three interests is a Claude for independent car
  dealers that does the buying and selling work end to end. Data access must come through
  proper partnerships or APIs, never scraping. Dealers may prefer phone, which clashes with his
  no calls rule: to be tested.
* Ruled out by Ismael (2026-11-10): AI for independent car dealers ("essentially a CRM", doubts managers would pay). Do not suggest again.

## Lincoln rechecked with the new rules (2026-11-10: selling in writing allowed, no calls)

* Visalaw AI: Core $220 and Pro $480 a month per licence, free trial only after booking a demo.
  Parley: Starter reported $500 a month for up to 10 seats, free trial. CaseBlink: reported $100
  to $300 a seat. LegistAI: reported $60 a user. Several are quote based (demo call).
* AILA: 18,000+ US lawyers. Share in solo or small firms not found.
* Clio: 71 percent of solos and 75 percent of small firms use AI for legal work (2025 or 2026
  report, year unclear). So small firms are already buying AI, which weakens the earlier
  judgement that they will not sign up on their own. That judgement was never tested.
* Read: a no demo, instant trial product for solos is a real difference from Visalaw's demo gate.
  Still crowded and price pressured (LegistAI at $60). The existing three week test plan already
  works without calls and would settle it.

## Review of a pasted Google AI thread on fastest companies and bootstrapping (2026-11-10)

* Higgsfield: company says it crossed a $1B annualised run rate on 24 Sept 2026 (latest four
  weeks x 13), about 18 months after a March 2025 product launch; about 70 percent enterprise.
  Self reported. It is AI video, so the thread's "training data contracts" explanation is wrong.
  A source the thread itself cites says Higgsfield is not the fastest.
* Cursor: SpaceX agreed to buy Anysphere for about $60B in stock (16 June 2026); closing status
  unclear in sources.
* Harvey: Series B Dec 2023 at a publicly reported $715M; unicorn at the July 2024 Series C
  ($1.5B), about two years after founding, not 18 to 20 months.
* Bootstrapped "proof" partly wrong: Veed bootstrapped to about $7M ARR, then took $35M from
  Sequoia (2022); Clay is venture funded (Sequoia, Meritech, $500M valuation in 2024). Midjourney,
  Mailchimp and Pieter Levels are real bootstrapped cases. Slack and Shopify timelines to $1B
  revenue are off.
* Useful part: ways to get customers without cold outreach: free single purpose tools (HubSpot
  Website Grader), search pages for very specific questions (Zapier integration pages),
  marketplaces, building in public (Pieter Levels).

## Review of a second pasted Google AI thread on bootstrapping to $100M (2026-11-10)

* It reverses itself after pushback: first Zapier and Mailchimp prove the path, then they are
  "obsolete". "Mathematically proven" and "statistically realistic" with no statistics given.
* Facts: Midjourney about $200M a year with no VC (widely reported); Mailchimp bootstrapped,
  about $800M revenue, sold to Intuit for $12B; Zapier took a $1.3M seed and in 2021 Sequoia and
  Steadfast bought shares from early holders at a $5B valuation (so "never touched VC" is loose).
* Its main claim, that VCs will not fund small niches, is contradicted by the YC F2026 list he
  sent: Fleety (plumbing and HVAC dispatch), Rote (auto body shops), Kairos Health (dental).
* It never names a niche. Like every source so far, it ends by asking which industry he knows.

## r/AskReddit "Lawyers, how are you using AI" (pasted 2026-11-10, thread about a month old)

* A 1,000+ lawyer firm (commenters guess Kirkland & Ellis) reportedly spent eight figures on its
  own AI on its own documents, self hosted, and cut first and second year hiring. Big firms build
  their own; small firms cannot.
* A corporate benefits lawyer's clients dried up in a year (anecdote).
* A practising lawyer: AI is very good at research, basic drafting, reviewing large volumes and
  paralegal admin, which can be automated end to end "with a little bit of foundation work".
  Courts now require AI disclosure and sanction errors; some say privilege can be at risk when
  client data goes into AI (unverified). Lawyers use local AI for confidential documents.
* For Lincoln: employment based immigration is mostly filings with USCIS, an agency, not court
  work, so it sits on the side lawyers say AI already does well. Confidentiality is a must.

## r/LawFirm "moved from Claude or ChatGPT to legal specific AI?" (pasted 2026-11-10)

* Several lawyers moved the other way, from legal tools (EvenUp, Supio) to plain Claude, because
  Claude's quality is better once skills are set up. "The setup is where people stall" (the
  founder of North, which "engineers Claude for law firms").
* What lawyers say legal tools add: matter memory across months, linked citations they can check
  in the same place (OpenCase, Irys Cite Check, Harvey Vaults), organised documents, and the
  "plumbing" (OCR, de duplication, page cites, a BAA). Medrecords AI co founder: "at 3,000 pages
  from 12 providers, the plumbing is the product".
* Lawyers already connect Claude to Clio through MCP and keep matters in Claude projects.
* Privacy questions lawyers ask vendors: training on data, retention, add on connectors, who can
  read data versus where it sits.
* Read for Lincoln: model quality is not the edge. The edge is per matter memory, checkable
  sources, done for you immigration skills and setup, and true privacy terms. One option is to
  build Lincoln on top of Claude (skills and connectors) rather than as a separate chat app.
* Anthropic released open source Claude Cowork plugins (announced 30 Jan 2026), including a
  legal one for contract review, NDA triage and compliance; Thomson Reuters fell about 18 percent
  and RELX had its worst day since 1988 (early Feb 2026). The lab itself now ships general legal
  skills; immigration specific work is narrower.

## r/legaltech "the 4 things I actually use AI for every week" (pasted 2026-11-10)

* Works: first drafts of letters and emails, timelines from long records with page references,
  cleanup, quick orientation. Stopped: research needing real citations (fake cases), anything
  filed without close reading. Several lawyers trust only Westlaw or Lexis for research.
* Some lawyers build their own tools with Claude Code or Lovable. Big companies have internal GPT
  platforms plus Legora; small firms do not.
* Hourly billers resist ("I bill hourly, give me my hour back"); flat fee lawyers gain most.
* Immigration petitions are mostly flat fee (sources: Manifest Law, Lighthouse, Beyond Border):
  H-1B new petition about $2,500 to $5,500, O-1 about $3,000 to $15,000 by source. On flat fees
  every hour saved is the lawyer's own profit, a strong reason to pay.
* Verification eats into time saved; the fix lawyers suggest is several agents checking each other.

## r/legaltech "what would you need to trust AI contract extraction?" (pasted 2026-11-10)

* Trust design lawyers asked for: several passes (extract, check, correct), a table of sources,
  confidence and a list of what could not be verified, readable not technical. Amendments and
  redefined terms override the base text. "Fewer fields you can stand behind": a "not found" is
  forgiven faster than a confident wrong answer.
* A lawyer: "absolute certainty that inputs are not used for anything and immediately destroyed.
  Unlimited liability... Do that and you will cash checks." Privacy is a buying trigger. Unlimited
  liability is not something a parent owned startup can offer.
* Hostility again to "vibe code me a business I know nothing about", but the thread still got
  three useful answers. Law firms are seen as slow adopters; in house teams adopt faster.
* For Lincoln: every statement in a packet should point to the exact page of evidence, with a
  plain list of what is missing or unverified, and true zero retention terms.

## r/startups "$10M ARR in 13 years, rant on fail fast and YC" (pasted 2026-11-10, post 8 months old)

* Anonymous founder (claim unverified; a commenter doubts it): marketing SaaS, failed first
  company, broke through only after pairing with a cofounder who could sell; survived years on
  consultancy and deals. Hardest lesson as a developer: tech is secondary.
* Argument: VC and YC need a few 100x outcomes, so their advice favours big risky bets; a slow
  profitable company is fine for the founder but useless to them. Counter comments: YC loses its
  $500k, support lowers failure rates, raising $300k+ links to survival (selection bias noted).
* Comment worth keeping: "half the founders i know use [fail fast] as an excuse to bail on stuff
  after 6 weeks. thats not pivoting thats just not committing."
* For Ismael: $1M a year profit is about an eighth of this founder's $10M ARR, and his rules
  (bootstrapped, no investors) put him on this slow path, where selling and staying power matter
  more than the idea.

## Legora LinkedIn post "Legora now connects to Claude for Legal" (screenshots, 2026-11-10, post about a week old)

* Legora says it is part of Anthropic's "Claude for Legal" launch: lawyers put Legora's agent to work
  on jurisdiction specific research and their own matters from inside Claude. 1,475 reactions.
* Top comment (lawyer and investor, 69 likes): "A wrapper saying he is connected to what he is
  wrapped around." Others joke about "recursive legal tech". A Dentons associate defends it as
  convenience. An Eversheds partner asks whether Legora is still model agnostic.
* Serious comments: a compliance adviser says Claude becomes "the place where the lawyer starts and
  receives the answer" and specialist providers may end up competing with the platforms they made
  indispensable; others ask for independent verification of conclusions, a tamper proof record of
  what a source said on the day it was relied on, and security for privileged data.
* Read: mockery on LinkedIn has not stopped Legora selling. The bigger signal is that the work is
  moving inside Claude itself, which supports building Lincoln as immigration skills and a
  connector inside Claude rather than a separate chat app.
* API notes (Claude API skill, prices cached 2026-11-03): one account gives every model, chosen per
  request; pay per token only. Opus 5.5 $4 / $20 per million tokens in / out, Sonnet 5.5 $2 / $10,
  Haiku 5.5 $0.10 / $0.50, Fable 5.2 $8 / $40. Fable 5.2 is not available under zero data retention
  unless Anthropic authorises it, which matters for a privacy promise to lawyers. Opus 5.5 effort
  defaults to medium on the API, so set it explicitly.

## Harvey founders' AMA on r/legaltech (pasted 2026-11-11, about six months old)

* Early days: "Linkedin messaged everyone. tbh [no] one really responded until A&OS press." First
  customer intro came from an investor. Best demo: take something a litigator filed in court and have
  Harvey argue against it live, "People REALLY paid attention if it was their own work." Seed from
  OpenAI with no revenue; not profitable. About $300M ARR at the time (May 2026); 1T tokens in January
  to 12T+ in May after moving to cloud agents.
* Their case against plain Claude ("Claude for Legal", Cowork): law firms cannot use desktop apps with
  client data; they need ethical walls, retention, governance, audit, multi model routing, DMS
  integrations (iManage, NetDocs), client collaboration, 24/7 support and training. In short: enterprise
  infrastructure and service, not better drafting.
* Lawyer pushback: "Why should a 20-lawyer firm pay you guys $100k a year when they can do similar
  things with a $20/month/user Claude account?" (no answer). A firm librarian: results unreliable, every
  answer has to be verified, so work is done twice. A European firm: output too American.
* Small firms and solos feel ignored: an in-house team never got a demo reply; a solo asks whether Harvey
  will ever serve solos; Harvey says "hope to support small teams and solos very soon". A three person
  firm did get flexible terms at a premium price.
* Harvey's view of where vertical companies win: making review of AI output easy in their domain, and
  domain benchmarks and evals.
* Read against our test: plain Claude already drafts at about the level of a legal tool; what Harvey
  sells on top is security, compliance, integrations and service, which a parent owned startup run by a
  15 year old cannot credibly offer to firms.

## r/legaltech "How will Eve / Supio / EvenUp / Harvey survive when lawyers build their own?" (pasted 2026-11-11)

* Main answers: lawyers do not want to become workflow engineers; building is fun, upkeep "goes on
  literally forever"; solos and small shops "will always pay"; many lawyers still struggle with email;
  one builder spent tens of thousands of euros of tokens and says the detail and deployment are immense.
* Risks to wrappers: they rely on frontier models and are not profitable, so prices may rise or they may
  close when venture money dries up; the labs may package role specific tools into enterprise plans
  ("very little reason to use a 3rd party"); some may escape by moving to cheaper open weight models.
* Read: what small firms pay for is someone else doing the setup and the upkeep, not better drafting.
  In immigration, case management tools (Docketwise, LawLogix, INSZoom, eImmigration) already hold that
  role and are adding AI.

## Pasted Google AI thread: "Harvey for accounting" and "best vertical for the Harvey model" (2026-11-11)

* Accounting: the thread's own harsh answer holds. Fixed fees and the CPA shortage are real, but the work
  is spreadsheets and ledgers, incumbents (Thomson Reuters, Wolters Kluwer, Intuit) and funded startups
  (Blue J, Fieldguide, Numeric, Trullion, Basis) are there, Harvey works with PwC on tax, and busy
  season blocks selling for months.
* Its pick, commercial insurance underwriting and claims, is already crowded with funded companies:
  Sixfold ($30M Series B, Jan 2026, "AI Underwriter"), Federato ($100M Series D, Nov 2025, submission
  triage for carriers and MGAs), and YC F2026 alone has Covera, Hesper AI, Veltha, Ignition Benefits,
  Risklytics and Rote. Selling needs SOC 2, security reviews and enterprise sales, which clash with
  Ismael's no calls rule and his age.
* Its "sell completed work, not chat" advice is what Lincoln did; plain Claude matched it on a
  document heavy job. Read 300 pages and draft a memo is exactly what general models now do well.
* Unverified claims in the thread: Harvey "80% of Am Law 100", "$1,000+ per seat", "MGAs decide in weeks".

## Remodel an old category: research (2026-11-11)

Method: look for big categories where the incumbent is forcing customers to move anyway (sunsets,
mergers, price hikes), because forced switching is the moment buyers look at alternatives.

* Youth sports club and league software (strongest find):
  - Stack Sports merged with PlayMetrics in June 2025; PlayMetrics closed its purchase of SportsEngine
    from Versant on 1 May 2026 (SportsEngine: over 16 million athletes, 1.2 million teams, 45,000
    organisations, per its site; reported valuation $400M to $500M).
  - The combined company is retiring products: Goalline and Pointstreak shut in May 2026; Sports Connect
    (Little League's official provider since 2016) sunsets in 2027; AYSO is moving to PlayMetrics.
  - So one company now controls a large share and is forcing many leagues to migrate within about a
    year. Other players: LeagueApps, TeamSnap, Jersey Watch, TeamLinkt, GotSport, Crossbar, Demosphere.
  - One market report puts US youth sports tech at about $2.1B (2025); estimates vary widely.
  - Not a document job, so plain Claude does not replace it: the value is registration, payments,
    scheduling, communication and records. Revenue in this category usually comes from a cut of the
    registration fees processed. Risks: children's data (COPPA under 13), payments need an adult owner,
    governing bodies (AYSO, Little League) choose centrally for their members, crowded challengers.
* QuickBooks Desktop: versions retired every May (2023 version on 31 May 2026), Desktop price rises from
  Feb 2026, QuickBooks Online rises from Aug 2026; users angry. But alternatives are many and strong
  (Xero, Zoho Books, FreshBooks, Wave, Sage) and accounting was already judged crowded.
* Dental practice software: Eaglesoft moving to subscriptions, standard Dentrix still on local servers;
  cloud challengers (Curve, Dentally, CareStack) already there; HIPAA and sales calls.
* Fitness studio software: Mindbody price creep complaints; many challengers (Momence, WellnessLiving,
  Glofox, Gymdesk, Vibefam).
* Insurance agency management: sticky (migrating files, carrier downloads); Big I cites two hours a day
  of manual data entry for independent agents.
* Ruled out by Ismael (2026-11-11): youth sports club software, QuickBooks Desktop alternatives, dental, fitness studio and insurance agency software. Do not suggest again.

## Cal AI: teen founders, consumer AI app, grown by creator content (checked 2026-11-11)

* Photo calorie tracker launched May 2024, built by teenagers (Zach Yadegari, Henry Langmack and others).
  TechCrunch reported over $2M revenue in one month early on; later accounts say 15M downloads and over
  $30M a year before MyFitnessPal bought it (announced December 2025). Figures are founder reported.
* Growth came from paying about 250 creators a fixed monthly fee to post on TikTok and Instagram; the
  first traction came from one paid story by a creator documenting weight loss. Brand and creator
  content, not the founders' faces, and no cold outreach.
