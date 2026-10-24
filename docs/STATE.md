# Where things stand (read this at the start of every session)

Last updated 2026-10-19. CLAUDE.md holds the rules; this file holds the current state, what is
in flight, and the small details that are easy to lose. Update it whenever something here changes.
The repo is public: never put passwords, keys, the admin password, the ntfy topic or anything
personal in here.

## Repo

* Default branch (set by Ismael, 2026-10-19): `claude/exciting-wright-8ml9uc`. Everything Hopkins
  lives here, and Render deploys the waitlist from it. Work and push on this branch.
* Other branches are from before Hopkins. `claude/focused-hawking-caz4gv` holds the DEIZ booking
  platform (the only copy); ask Ismael before deleting it.

## Working with Ismael

* He posts 2 reels a day on @gethopkins, Irish morning and Irish afternoon (suggested 1pm and 6pm
  Irish time). He asks for new reels about a day before the queue runs out. Quality at volume.
* He wants things done, not asked about. Push without asking (see CLAUDE.md). Don't make him repeat
  himself: when he states a preference, write it into CLAUDE.md, the playbook or this file.
* He gets frustrated by wasted rounds. Before sending anything, check it yourself (stills, timing
  checks, the real page). Never ship a guess and ask him to test it.
* He is on Claude Pro with a weekly limit. Keep sessions short and focused: one job per session,
  batch reel requests, medium effort for routine reel making, high effort for building and debugging.
* Never store, repeat or use his Instagram password. No outreach on his behalf.
* Business accounts that need an adult or a registered business (Meta business verification,
  Stripe, Apple developer programme) go in a parent's or the registered business's name.

## @gethopkins on Instagram

* Bio leads with the chat ("like ChatGPT, for real estate marketing"), never agency wording.
* Posted so far: Reel 1 (5 settings) and Reel 4 (views but no enquiries). Reel 4: 84 views, 98.8%
  non-followers, 83% from the Reels tab, average watch 2s, skip rate 92.7%. Reel 1: about 11 views.
  Lesson logged in the playbook: the first second was the problem.
* Queue, in this order: Reel 3 (describe the home), Reel 2 (Wanamaker's half), Reel 5 (meet
  Hopkins, the launch reel). Latest versions have the slam-in hooks, the talking voice and the
  fixed voice timing. After those, pin Reel 5, with Reels 1 and 3 beside it.
* Pinned launch film cover (2026-10-19): `content/reels/cover-meet.html`, rendered with `node covers.mjs out_dir`
  as `meet.png`. Mark and name, "Meet" in gold serif above, "Real estate marketing, from one chat."
  below, no call to action so it can stay pinned after launch.
* Honest read (2026-10-19, after Ismael asked if the launch film can bring sign ups): the launch film is a
  conversion asset (pinned, on the landing page, sent to someone who already cares), not a discovery
  asset. A cold viewer has no reason to care about an unknown product's demo. Reel 1 (about 10 views)
  and Reel 4 (about 84 views, 2s average watch, 92.7% skip) with only his own like is normal for a
  zero follower account: Instagram shows a reel to a small cold test group, and the first second
  decides whether it widens. Likes from strangers at that size aren't expected, retention is the
  signal. Discovery should come from hook first problem reels (playbook), and early sign ups from him
  showing it directly to real estate people he can reach, not from the algorithm.
* Meta Verified (paid blue badge), asked 2026-10-19: not now. It won't fix a 2 second average watch, and
  Meta's reach boost claims aren't independently shown. Revisit once there is a registered business
  (it needs ID or business documents matching the account name) and some real traction. Price and
  requirements change, check them on Instagram before deciding.
* Profile check (2026-10-19 evening): launch film posted and pinned (0 views just after posting), Reel 4 at
  89 views, Reel 1 at 11, Reel 3 still in Drafts. Highlights set up: Meet, How it works, Breakdown, Story.
  The grid reads as one brand. On the grid thumbnail only the big hook text is readable; the small
  audience line, handle and teaser are too small to read, so the hook must carry each cover alone.
* Launch film at 0 views after 2 hours (2026-10-19): Account Status was clean (recommendation
  eligibility, features and removals all green, only an irrelevant monetisation warning). The post
  showed "The Weeknd, Timeless" attached as its audio, so the film's own sound (sfx and the spoken
  "Get Hopkins") was probably replaced by a licensed track that a business account shouldn't use for a
  product promo. Ismael prefers the music (it makes the film feel better than the sfx alone, and it is
  the Timeless instrumental, no lyrics; an instrumental is still licensed). Agreed test: leave it
  up until tomorrow. If still near 0, repost with original audio, and consider a royalty free music
  bed mixed into the film itself (`sfx2.py`) so the feel stays without the rights risk. Licensed
  tracks can never go in Hopkins ads, so the film's sound should work without them. Also: feed posts and stories
  (carousels like "Join the waitlist", "What you get") get 0 views at zero followers, since they only
  reach followers. Reels are the only discovery route right now.
* Volume question (2026-10-19, Ismael floated 5 reels a day plus reposting old ones): my read is more
  shots helps a zero follower account, but 5 a day is not realistic on his Pro weekly limit (each
  reel needs script, voice, stills check and render, so it is not minutes), and near identical or
  reposted reels get less reach. Better: 2 to 3 a day, each a different first second on a real problem,
  then compare average watch time in Insights and make more of what holds people. Old reels get
  reposted only if re-edited with a new hook, not as exact copies. Test Trial Reels (shown to
  non followers first) for hook testing.
* Reel idea queue (2026-10-19, Ismael wants a creative hook plus a real tip, helpful, not
  self promoting; end with "Follow @gethopkins" only). Each tip needs a fact check before it is made:
  1. "Meta won't let you target a ZIP code for homes" and what to do instead (Housing special ad
     category: no age, gender or ZIP, a minimum location radius, so the ad's first line has to name the
     neighbourhood; check the current radius figure).
  2. "Three more words that get a listing ad flagged" (follow up to Reel 3: walking distance, safe
     neighbourhood, master bedroom; check against current fair housing guidance).
  3. "Stop touching your ad" (big edits restart Meta's learning, so give it a few days and change one
     thing at a time; check the current wording of the learning phase).
  4. "Your Just Listed ad is the most boring thing on the internet" (lead with the one thing one buyer
     wants, weak vs strong, labelled by outcome).
  5. "You don't have an ad problem, you have a one ad problem" (run three different ads, compare cost
     per lead, Wanamaker).
  Fact check done for idea 1 (2026-10-19): the March 2019 settlement (NFHA, ACLU, Communications Workers
  of America) removed age, gender and ZIP targeting for housing, employment and credit ads, and housing
  ads need a location radius of at least 15 miles. Age and ZIP details come partly from press and law
  firm summaries, not the settlement text, so keep the reel's wording simple and not legal.
  Recommended order: 1, 2, 3. Trial Reels are locked at his follower count; following the account from
  his own two personal accounts is fine but changes nothing for reach.
* New batch (2026-10-19, talking to a friend style, hook on screen and in sound, second person stories):
  Reel 6 "You can't pick who sees your listing ad anymore" (2019 settlement), Reel 7 "Stop touching
  your ad" (learning phase, about 50 results in 7 days), Reel 8 "Would you stop for this ad?" (specs vs
  the life), Reel 9 "You have a one ad problem" (run three, compare cost per lead). Renders and covers
  in `reports/hopkins-brand/reels/`. Voice af_heart at 1.0 (0.95 for r9), about 185 wpm, every reel
  checked with faster-whisper before rendering. Still to make from the idea queue: words that get an ad
  flagged (needs a careful fact check: HUD's 1995 guidance says "walking distance" style words are fine),
  Boost vs Ads Manager showdown (check what Boost offers today), red flags checklist.
* First DM enquiry (2026-10-19): @keystonemedias (real estate video agency, about 1.3k followers, "65+
  realtors & mortgage brokers") asked how the programme works. Possibly a partner (they make the videos,
  Hopkins could run them as ads) or an agency prospecting. Reply drafted in future tense, since nothing
  is built yet, ending with one question: for Keystone itself or for the agents they film for.
  He answered "for the realtors" (his agent clients), so it's a possible channel: his videos, run as ads
  through Hopkins, for his 65+ agents. Next ask: do his agents run his videos as paid ads now, or only
  post them? Don't offer anything special or a call until that's known.
  2026-10-20: he said his agents post "more organic". So paid ads are the gap. Next ask: why (hassle,
  cost, or tried and saw nothing), since that decides the pitch. After that, offer him and a few of his
  agents first access when it opens, with the real waitlist offer (30% off the first year).
  Profile read (2026-10-20, from his highlights): Montreal area studio, bilingual, team of three on camera
  (co-founder, creative director "pat_keystone", head videographer). Films talking head content and some
  listing videos for RE/MAX, eXp, Royal LePage agents and mortgage brokers, a few in the US (Fort
  Lauderdale, Fairway Mortgage). Sells by "Book a call". Linked to Sasha Bordonaro, a Montreal social
  media coach (podcast guest on Les Courtiers du Québec) who runs a marketing bootcamp under "Sociable
  Marketing Agency"; the REVIEWS highlight is mostly her bootcamp reviews. Every win shown is views,
  followers or one "new client from the videos"; nothing about ads, leads or cost per lead. No web
  presence found beyond Instagram. Fit: a channel (his videos as ad creative for his clients, Hopkins
  measures leads), not a competitor. Watch: he could also want to resell ads management himself.
  2026-10-20: asked why agents don't run ads, he said "Just no results". So they tried or assume it
  doesn't work. The pitch is testing and cost per lead, not "run ads". Don't claim Hopkins fixes
  results; claim it tests three versions and shows what each lead cost. Next: ask what they tried, then
  offer first access for two of his agents on one real listing each.
* Outreach plan (2026-10-20): Ismael searched Meta Ad Library (US, housing) for agents running listing ads
  right now, to follow from @gethopkins and offer a free test for feedback. Read of the results: lots of
  agents do run paid ads. Many are platform made (Adwerx "RE/MAX powered by Adwerx", BackAtYou, AdFenix,
  Listing4 style): plain "For Sale" with no copy, run by the brokerage tool, so the agent may not control
  them. Others are lead magnet ads ("free list of homes", instant form) and a few agents already run
  several variants (Reed Perry, Spokane, 7 versions of one concept), so they already test. Best targets:
  independent agents or small teams running one or two weak manual ads for more than a week. Filter by
  longer running ads, not the "started today" ones. Spanish language agents are common (Hopkins is English
  only). Pace 10 to 15 contacts a day to stay clear of Instagram limits, one specific observation in each
  first message, one yes or no ask. Expect a low reply rate. The free test must be something he can deliver
  (manual test: three versions, they run them, he records leads and cost).
* Captions for posting are in `reports/hopkins-brand/reels/Captions and posting order.md`.
* Turn on Instagram's AI label when posting (the voice is AI made).
* The bio had a "Backed by @ycombinator" line. It was flagged: only keep it if Hopkins is actually
  in YC, and then add the batch (for example "YC F26").

## Reels

* Engine and sources: `content/reels/` (README there). Rules: `.claude/skills/hopkins-creative/SKILL.md`
  ("The first second", "How reels talk", "Every reel ships with a hook cover", "Every reel ends the
  same way").
* Make a reel: write `rN.html` (script + scenes + `hook` + `sfx`), add its cover to `hooks.js`,
  `python3 vo.py rN`, check stills with `node stills.mjs`, render with `node rec.mjs rN.html out.mp4`,
  covers with `node covers.mjs out_dir`.
* Voice: Kokoro af_heart at speed 1.1, captions placed by wav2vec2 forced alignment, pronunciation
  fixes in `FIXES` in `vo.py`. Checked with faster-whisper (small.en): 9 in 10 caption words within
  about 0.15s of the voice. Ismael found the old voice's pronunciation and timing bad; this is the fix.
* Open question to Ismael: voice future reels with ElevenLabs (connected to his account, about
  1,000 characters a reel, free plan about 10,000 a month) instead of Kokoro. No answer yet.
* Setup in a fresh container (2026-10-19): system Python may be 3.13, where Kokoro won't build. Use
  `uv venv -p /usr/bin/python3.11 /home/user/vo-env`, then `VIRTUAL_ENV=/home/user/vo-env uv pip install
  kokoro soundfile transformers faster-whisper pip` and `/home/user/vo-env/bin/python -m spacy download
  en_core_web_sm`; run vo.py and rec.mjs with `PATH=/home/user/vo-env/bin:$PATH`. espeak-ng isn't needed. ffmpeg is at
  `/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2`.
  Playwright's Chromium can't decode H.264, so check videos by extracting frames with ffmpeg.
* Rendered mp4s and covers live in `reports/hopkins-brand/reels/`, which is not in git. A new
  container won't have them; Ismael has the sent copies, and they can be re-rendered from source.

## Finding content to rebuild

* Ismael sends links to posts that are working; each becomes an animated reel in the Hopkins format
  (the idea, never the wording). See "Finding posts to rebuild" in the playbook.
* Instagram links can be read without a login through the embed page:
  `https://www.instagram.com/p/CODE/embed/captioned/` in Playwright Chromium with
  `ignoreHTTPSErrors: true` (the environment's proxy certificate). That gives the account, follower
  count, caption, likes, the first slide and any image slides (click "Next"). It can't play reels or
  video slides, and doesn't show saves or shares. TikTok links are untested.
* Idea agreed in principle, not built: a trend library (patterns, not posts: format, hook type,
  layout, why it works, numbers, date) that Ismael refreshes weekly. It later seeds the product's
  creative engine. Start it after the usage reset. First entry: the "Places I'd take someone
  visiting [City]" local guide carousel (1,259 likes, 1,680 shares), a format for customers' ads.

## Waitlist site (waitlist.kirmistudio.com)

* Server: `survey/` (Fastify), deployed on Render from branch `claude/exciting-wright-8ml9uc` on
  every push. Page: `survey/web/waitlist.html`.
* The scripted demo was replaced by the product film inside the Mac browser frame: autoplay, always
  silent (Ismael, 2026-10-19: no sound and no sound button, ever), a tap stops it and leaves a see-through
  play button, a tap again carries on, gold progress bar, no note under it, cut per screen size (phone
  9:16, laptop 16:10, desktop 16:9).
* Film files load from jsDelivr pinned to commit `1106b7a75ceb8afae14a45da1455ccadcf9d12bc`, then
  fall back to this server, then to feeding the player in pieces (`.f.mp4`, Media Source
  Extensions), then a whole-file download, then a play button. When the films change, commit them
  first and update the pinned commit in the page.
* Every visit reports how the film loaded to `GET /api/waitlist/film` (last 100, in memory, no IPs).
  `?filmdebug` on the page shows a live diagnostic box. It played fine on Ismael's iMac (Safari
  18.6) and iPhone after the fix.
* Search Console: sitemap fixed and accepted (`/sitemap.xml`, also in robots.txt).
* "Built in Silicon Valley" in the footer is true; leave it alone.

## Launch film

* Source: `content/launch/film.html` (46.5s), rendered by `content/launch/rec.mjs` with motion blur
  (90fps blended to 30). Env: `W`, `H`, `DSF`, and `QS` for page params (`cta=Join%20the%20waitlist`
  for the web cut; Instagram cut says "link in bio"). Sound: `sfx2.py`.
* The listing photos it uses are in `content/launch/img/`, not in git (owner approved them for the
  film only). The Kenney sound pack for `sfx2.py` was in a scratch folder. A new container has
  neither: ask Ismael for the photos again before re-rendering the film.

## The product (Hopkins) and what's next

* Next session after the weekly reset (Wednesday afternoon): start the first build, on high effort,
  in a fresh session. Plan: a private version first, everything that needs no Meta access. Listing
  photos and details in, three ad versions out, feed and story previews, changes made in the chat.
  The film's interface (sidebar, chat, three versions, preview panel, leads table, Monday report)
  is the design reference.
* Design decisions for the build (2026-10-19, after an outside critique Ismael shared):
  * **Hopkins messages first.** Agents forget to open apps, and that's the main churn risk. When
    there's something to do (a new listing, an open house, a price change, a losing ad), Hopkins
    sends the agent a message with the ads ready: "Your new listing on Oak Street is live. Here are
    3 ads, $200 over 10 days. Run them?" One tap to approve. The chat stays for anything custom.
    The first trigger can be the agent forwarding a listing link; MLS feeds come later (access
    usually needs a broker or vendor agreement).
  * **Leads first, not ad stats.** The Monday report leads with leads and cost per lead ("7 leads,
    $21 each, 2 asked for a showing"), and new leads reach the agent's phone within seconds.
  * **The moat is the testing record.** Store every test from day one: the listing type, city,
    creative pattern, audience setting, spend, leads, cost per lead and the winner. Over time
    Hopkins knows what wins for which listing where, and a copy of the chat screen can't match that.
  * **Housing rules built in**: the Housing special ad category, no age, gender or ZIP targeting,
    fair housing wording checks.
  * **Later, carefully:** automatic texting of leads runs into US texting law (TCPA, heavy fines),
    so it's not an early feature.
  * Competitors doing parts of this: Ylopo, Lofty (formerly Chime) and Rechat, big all-in-one
    platforms (CRM, website, lead generation, ads), mostly on long contracts. Hopkins' difference:
    one chat, the agent's own ad account, a flat price with no cut of spend, testing first.
* **Backend stack decision (2026-10-19): start small, keep a few things fixed from day one.**
  * Fixed from day one, because they are costly to change later: the testing record schema (the
    moat), tenant isolation (every row belongs to a team), the approval gate, hard budget caps, Meta
    tokens encrypted and never shown to the model, an append only audit log, and all Meta calls
    behind one interface.
  * Safety lives in code, not in prompts. The model only proposes actions as structured objects.
    A separate ads gateway checks them (Housing category forced, no banned targeting, caps per ad
    set, day and month, a single use approval token tied to the exact payload) and is the only thing
    that talks to Meta. Ads are created paused and switched on only after the yes.
  * Money: the agent's own card on their own ad account, so ad spend never passes through Hopkins.
  * Answers: Claude through the API with tool use, strongest model for the chat and copy, a small
    model for checks, prompt caching, a fixed test set for fair housing wording.
  * Creatives: real listing photos are the hero, laid out by HTML templates rendered in headless
    Chromium (same engine as the reels). Image models only for clean up, reframing, and staging
    (always labelled). Video by Remotion or ffmpeg. An automated check runs before the agent sees it.
  * Stages: private build (one TypeScript service on Fastify, Postgres, object storage, a simple
    queue, Claude API) then first Meta testers (add the gateway module, Stripe, error tracking)
    then 50 plus teams (own gateway service, durable workflows such as Temporal, a warehouse, model
    routing, SOC 2 prep) then autopilot, MLS feeds and texting.
  * Use Meta's Marketing API directly. Reporting connectors like Porter or Supermetrics are fine for
    analysis but should not sit in the path that spends money.
* **Rough overhead (2026-10-19, estimates from list prices, not measured, check before relying):**
  * Day 1 out of pocket is small, under about $100 a month: Render web and Postgres $15 to $40,
    object storage pennies, Claude API $10 to $50 while testing (billed separately from Claude Pro),
    error tracking and email on free tiers, domain about $15 a year (waits for sign ups). Meta's API,
    App Review and business verification are free. Optional own test ad spend, say $5 to $20 a day.
  * First Meta testers (5 to 20 teams): about $100 to $400 a month. Stripe fees about 3% of what is
    charged, no monthly fee.
  * 50 plus teams: about $1,000 to $4,000 a month, driven mostly by ads and video generated. At $299
    a month that is roughly $15,000 revenue against that overhead.
  * One-offs: registered business (needed for Meta verification and Stripe, else a parent's name),
    privacy policy and terms (Meta requires them; lawyer review optional at first), Apple developer
    $99 a year only for a native app, SOC 2 only when bigger customers ask.
  * Unknown until the private build measures it: real cost per listing (model calls plus image and
    video generation). Needed before setting higher tiers.
* `platform/` is an older booking system from before Hopkins. It is not the Hopkins product.
* Meta: running ads on other people's accounts needs App Review for advanced access
  (ads_management, ads_read, leads_retrieval, pages_show_list, pages_read_engagement,
  pages_manage_ads, business_management), business verification, a privacy policy and data
  deletion page, and a screen recording per permission. The Marketing API access tier needs 500
  successful calls in 15 days with under 15% errors. A working app is needed before any of that.
  Before review, people with a role on the app (testers) can use it, so the first waitlist teams can
  be added as testers (untested with ads, try on Ismael's own ad account first).
* Phone app: not first. Web app first (works in a phone browser), then push notifications for
  approvals and new leads once teams have live ads, a native app only when teams ask or approvals
  are being lost.

## Ad Library outreach shortlist (2026-10-20)
Source: Meta Ad Library, active ads, impressions 5 to 20 Oct 2026, keyword "realtor", sorted by impressions. Most top results are not targets (Realtor.com, NAR, boards, MLS, brokerage corporate pages, lenders, title, cash buyers). Names only, no phone numbers.
* First tier, independent, long running or set and forget ads: Rodolfo Flores (AZ), Dillon Bout (Space Coast), Jennifer Scates, Christine Sparks, Andy Griesinger, Kimberly Thomason, Kathy Hayward, Rodney Brown, Eric Hatch, Don Shaffer, Matt Maloney, Chuck Vosburgh, Justin Grey.
* Different offer: Sonia Toor (free list lead gen, already measures leads), Erin Ray (rentals).
* Spanish language, park until Hopkins does Spanish: Zuly Gomez, Mayra Cisneros, Roger Lopez.
* Before sending: open the ad card, check the start date and that it is a listing or lead ad, follow from @gethopkins first. Ask is one line: free test on one listing for honest feedback.

## Grid views snapshot (2026-10-21, 09:09)
Pinned launch film 21. "Stop touching your ad" 0. "You can't pick who sees your listing ad anymore" 1. "No more Sunday nights in Ads Manager" 29. "Every listing. One chat." 14. "Stop writing perfect for families" 7. "Thousands of views. Zero enquiries." 93. "5 settings wasting your listing ad budget" 13.
Read: numbers are tiny, so only the 93 stands out, and it names a stake (views with nothing to show for it). Reels 6 to 9 not yet posted. Outreach DMs matter more than views right now.

## Follow chip in every reel (2026-10-21)
Ismael wants "Follow @gethopkins" on screen in every reel, silent (not in the voiceover). Done in `content/reels/engine.js`: a gold chip shows from the last spoken phrase to the end of the voice, and the end card button is bigger. Applies to every reel automatically. Reels 6 to 11 re-rendered. r1 to r5 not re-rendered.

## Ad Library outreach shortlist, round 2 (2026-10-21)
Source: Housing ads filter, keyword "realtor", sorted by impressions, 5 to 20 Oct 2026. Note: the start date filter did not hold, the page shows ads from 2020 onwards. Names only, no contact details.
* First tier, one person, text heavy or listing ads, creative looks unchanged: Ginger McCallum (TX, new this month), Matt Maloney (IN, same listing ad since Feb), Chuck Vosburgh (FL, text only Just Listed), Kathy Hayward (LA, Just Listed since Nov 2024), Don Shaffer (OH), Justin Grey (CA), Liza McLean (MO), Dillon Bout (FL), Rodney Brown (NV), Steele Nash (AZ), Cody Meaux (LA).
* Already tests many versions, good first conversation: Rudy Flores (AZ, has a team).
* Free list lead ads that look like one vendor template, ask who makes them first: Mark Gonzalez, Jennifer Scates, Christine Sparks, Andy Griesinger, Kimberly Thomason, Albert Grothe, Ivan Cano.
* Skip: American Dream TV promos (Melissa Jones, Charlotte Baker, Eddie Ferrell, Anne Whitney Gray, Ashlea Pflug, Eric Schultz, Samantha Mendoza, Tami Kramer), Canada (Sonia Toor, Jordan Sachi, Ammy Setia, Pinkjit Brar, Jane Heim), Spanish language until Hopkins supports it, brokerages, boards, lenders, title, cash buyers, Homebot, Realtor.com, NAR.

## Build or wait decision (2026-10-21)
Answer given: build the thinnest version now in parallel with outreach, do not wait for a signup. Replies take days and a yes needs something to hand over the same week. Build only the part a tester can use: listing in, three ad versions out as previews, edits in the chat, fair housing check, export plus a setup checklist. Do not build the Meta gateway, billing, Autopilot or accounts until one agent has used it and said what is wrong. Stop and rethink if after about 30 messages there are no replies at all.

## Reels 12 to 16 (2026-10-23)
r12 "Nobody reads past this line" (ad text is cut after two or three lines on a phone, put the stop line first), r13 "Stop putting hashtags in your ads" (on Facebook every hashtag is a link out of the ad), r14 "Your ad has seven buttons" (one ad, one ask), r15 "Nobody is watching your logo intro" (open on the best five seconds), r16 "Your ad worked. Then your website killed it." (send the ad to the listing page, not the homepage). Ideas came from patterns in the Ad Library pages Ismael pasted (hashtag piles, long contact blocks).
Timing: `vo.py` now varies the gap between lines (longer after a question, small variation elsewhere) and every script uses `pause` on chosen lines, including mid sentence after a comma, so the voice breathes like a person. Each reel was checked with faster-whisper (`small.en`) against the script; fixed "Buyer ad?" (heard as "buy your ad") and "button" (clipped). `DM` is now spoken as "D M".
* 2026-10-23: Ismael watched reels 12 to 16 and rejected them (too short, obvious advice, no engagement). Not to be redone. Do not post them. Next batch: pitch hooks and angles first, insider level only, 45 to 90 seconds.

## Review of the Google AI Mode chat (2026-10-24)
Ismael pasted a long chat with another AI about reach, pricing and growth. Real data from his screenshots in it: Account Status clean (recommendation eligible, only "Established presence" flagged for monetisation), 17 followers, best reel "Stop touching your ad" 115 views, 76.4% skip rate, 5s average watch on a 39s reel, one save, audience India 24.6% and US 8.8%, account type Creator. The drop is in the first two seconds, not the length.
My review: trust the screenshot data and the broad points (Instagram is proof not the funnel early on, a copy only tool is a wrapper so the Meta execution layer is the value, launch once the loop works rather than waiting on waitlist size, legal setup through a parent). Ignore the invented numbers (users after 6 months, $1.2M to $1.8M ARR by 18, $5K to $50K MRR in 4 to 9 months on a flat $100 CAC with no churn), the unverified competitor prices, the scraping of agents' contact details, "11 to 15 second reels with no breaths", and location tagging cities he isn't in. That AI admitted it never watched the video and agreed with every number he proposed.
Ismael's proposed ladder: Solo $99, up to 5 users $299, up to 10 $349, up to 15 $499, up to 20 $799, above that a quote. Issues: 5 users is pointless at $50 less than 10, the 15 to 20 jump is $300 for 5 seats, and seats are not what costs Hopkins or what the agent values (listings and ad spend are). Suggested: Solo $99 (1 user), Team $299 (up to 5), Team Plus $499 (up to 15), larger by quote. Not decided.
