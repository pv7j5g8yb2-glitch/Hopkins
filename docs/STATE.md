# Where things stand (read this at the start of every session)

Last updated 2026-10-21. CLAUDE.md holds the rules; this file holds the current state, what is
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

## Brand files

* `assets/brand/`: the icon (rounded and square, 1024px), the mark alone (PNG with a clear
  background, and SVG), and the full logo (mark and name) on oxblood, on cream, and on clear
  backgrounds in cream or oxblood, 2400x1000. Same proportions as the waitlist page's logo.

## @gethopkins on Instagram

* Bio leads with the chat ("like ChatGPT, for real estate marketing"), never agency wording.
* Posted so far: Reel 1 (5 settings) and Reel 4 (views but no enquiries). Reel 4: 84 views, 98.8%
  non-followers, 83% from the Reels tab, average watch 2s, skip rate 92.7%. Reel 1: about 11 views.
  Lesson logged in the playbook: the first second was the problem.
* Queue, in this order: Reel 3 (describe the home), Reel 2 (Wanamaker's half), Reel 5 (meet
  Hopkins, the launch reel). Latest versions have the slam-in hooks, the talking voice and the
  fixed voice timing. After those, pin Reel 5, with Reels 1 and 3 beside it.
* Captions for posting are in `reports/hopkins-brand/reels/Captions and posting order.md`.
* Reel 6 (2026-10-26, Ismael's format "X things before your next ad, each more niche"): 7 Meta
  listing ad tips from the Housing category to the 90 day lead download limit, a depth meter on
  the right that drops a level per point, 63s voice. Source `content/reels/r6.html`, caption in
  `reports/hopkins-brand/reels/Reel 6 caption.md`. Not posted yet.
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
* Setup in a fresh container: Kokoro won't build on the default Python 3.13, so make a 3.11 venv:
  `uv venv -p 3.11 vovenv && VIRTUAL_ENV=$PWD/vovenv uv pip install kokoro soundfile transformers
  faster-whisper "numpy<2.3"`, plus `apt-get install espeak-ng`. Run `vovenv/bin/python vo.py rN`,
  and render with `PY=vovenv/bin/python node rec.mjs ...` so the sound mix uses the same Python.
  `rec.mjs` uses the imageio ffmpeg when it's installed
  (`/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2`),
  else the system ffmpeg.
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
* The scripted demo was replaced by the product film inside the Mac browser frame: autoplay,
  muted until the visitor's first click (browsers block sound before that), sound button, gold
  progress bar, no note under it, cut per screen size (phone 9:16, laptop 16:10, desktop 16:9).
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

* **First build done (2026-10-21), in `app/`** (README there lists exactly what works). Private,
  invite only, everything that needs no Meta access: sign up, brand setup, listing in (photos plus
  link or description), 3 ads out (The life, The standout, The facts) with feed and story previews
  in the customer's brand, changes in the chat, free plan limits and watermark, paid plan run plan
  then yes, fair housing checks, a lead page per listing with a link per ad version, leads (in the
  chat, Leads page, phone via ntfy), the Monday report, the testing record, an admin page to switch
  workspaces to paid. 13 automated tests, plus a full browser walkthrough on desktop and phone.
* It's on branch `claude/amazing-noether-92ry61`, not yet on the default branch, and has no Render
  service yet. To put it live: `render.yaml` at the repo root is a Render Blueprint (New, Blueprint,
  this repo and branch), plus a new Turso database. Step by step in `app/README.md` under Deploy.
  Admin emails sign up without a code; production sign ups are closed if `INVITE_CODES` is empty.
  Suggested address: `app.kirmistudio.com`.
* The chat needs a model key to feel like ChatGPT or Claude. The live site has none yet, so it
  runs on the built-in rules, which is why it felt like a bot with preset answers (Ismael,
  2026-10-24). Rebuilt (2026-10-24): the model now gets the whole thread as a real back and forth
  plus the state (listing, ads, plan, version on screen), answers questions, greets back, switches
  version when one is named ("no, I meant 2"), acts when asked, and never repeats itself.
  `ANTHROPIC_API_KEY` uses Claude; `GROQ_API_KEY` uses Groq's free model (the survey's). Both
  paths are tested only with fakes; no real key in the build session. The rules were also
  improved (greetings, version switching, common questions, no repeated replies). **Decision (Ismael,
  2026-10-24): start on Groq's free key, switch to Claude once there are paying users.** Next: he
  adds `GROQ_API_KEY` on Render (hopkins-app, Environment tab; the waitlist service may already
  have one to reuse), then a live chat check. On Groq the ads are written from the text only
  (photos aren't seen), and free tier rate limits fall back to the rules when hit.
  Live tested on Groq with Ismael's key (2026-10-24, key kept out of the repo): replies in 1 to 2
  seconds, real conversation, right answers on cost and version switching. Its limits on this
  account are 1,000 requests a day and 8,000 tokens a minute (about 2 chat messages a minute, 5 or
  6 active agents a day). It kept inventing details in new ads (appliances, "historic charm"), so
  on Groq the first 3 ads come from the built-in writer; Groq does the chat and the edits. Claude
  writes the first set once `ANTHROPIC_API_KEY` is set. Groq sometimes returns broken JSON; Hopkins
  retries once.
* Choices made in the build, change any of them: product copy uses US spelling (customers are
  mostly US); the default run plan is $200 over 10 days split across the 3 versions; feed ads are
  4:5; paid upgrades are requests that notify the founder (no Stripe until an ad can go live);
  lead alerts use the free ntfy app.
* Keeping it awake (2026-10-24): Render's free plan puts the app to sleep after 15 minutes with no
  visits (the "Application loading" screen). Fix: a free pinger (cron-job.org) hits
  `https://hopkins-app.onrender.com/healthz` every 10 minutes. Catch: Render gives 750 free hours a
  month per workspace and one service awake all month uses about 744, so if the waitlist is also a
  free service in the same workspace, both together can run out and Render suspends every free
  service until the 1st. Then the answer is the paid instance for hopkins-app, not more pings.
* Live at `hopkins-app.onrender.com` (Render Blueprint `Hopkins-app`, deploys on every push to
  `claude/amazing-noether-92ry61`, Turso database). Ismael tests on his admin account; to test
  the paid side he switches his own workspace to Paid in Admin.
* Settings page (2026-10-24): profile photo, name, email (needs the current password), password,
  business name, phone lead alerts, plan, sign out, delete account (deletes the whole workspace).
* A listing added after the free ads are used is saved with a clear message (where the free ads
  went) and a "Make the ads" button for after upgrading.
* Liquid Glass tab bar on phones (2026-10-24, `app/web/glass.js` and the `.lg` styles): floating
  capsule plus a round + button like iOS 26, specular rim, frosted blur, a lens behind the selected
  tab that springs, stretches while moving, swells when pressed and follows a dragged finger, and
  dark glass with light labels over dark content. Refraction (background bending at the edge) was
  tried and dropped: iPhone browsers can't do it at all, and Chrome drew banding. Waiting on
  Ismael's verdict on his iPhone before using it anywhere else.
  Update (2026-10-24): he liked it. Also on the other floating things on phones: the message box
  and quick reply pills, the Run it bar, and the bottom sheets. Content (cards, pages) stays solid.
* Ads in the thread (2026-10-25, Ismael): every reply that changes ads carries a snapshot of the
  changed versions (`data.snapshot` on the message) and shows them right there, as they were at
  that moment, like a chat app showing each new image; no scrolling back to the first set. Drawn
  once each into a small JPEG and kept, so long chats stay light on a phone.
* Password reset by email (2026-10-25, Ismael asked why it isn't instant like other apps): built
  on Resend (`app/src/mail.js`). It works the moment `RESEND_API_KEY` and `MAIL_FROM` are set on
  Render; until then the by hand route stays. Needs from Ismael: a free Resend account, the domain
  (kirmistudio.com, or gethopkins.com once bought) verified there with the DNS records Resend gives,
  then the two values on Render.
* Leads and Report are "coming soon" (2026-10-25, Ismael): until an account has a lead (or, for the
  report, an approved run), each page shows a faded, greyed preview of what it will hold under a
  card ("Coming soon", what it does, "This opens once ads can go live on Facebook and Instagram"),
  and their tabs look quieter. Real leads still show the moment one arrives (lead pages already
  work when an agent shares the link).
* Run it on the free plan (2026-10-25, Ismael: the same upgrade note looped in the chat): it now
  opens a plan card over the screen (bottom sheet on a phone) with the price points and Ask for
  the paid plan, and nothing is posted to the chat. Make a new set past the free ads does the
  same. Typing "run it" gets the note once; asking again opens the card instead.
* Listing names (2026-10-25, Ismael): a listing with no name or address is "Untitled 1",
  "Untitled 2"... (`listings.untitled_no`, given in the order they came in, never reused), the
  same on Today, Listings and the chat. Listing cards and the Today card show only the name.
* Ad labels (2026-10-25, Ismael): the tabs, captions and replies say Ad 1, Ad 2, Ad 3; the idea
  names ("Brick gable") only appear after the number in the first message, since as tab labels
  they didn't make sense to him. Removing an ad numbers the rest again from 1.
* "Busy" fix (2026-10-25): on Groq free a chat message is about 5,000 tokens and each model
  allows about 8,000 a minute, so right after a new listing all three were spent and Hopkins said
  it was getting a lot of messages. It now waits for the first model to free up (up to 25
  seconds) and asks again. A busy reply is left out of what the model sees, so "now?" after one
  reaches it together with the unanswered question, and the model is told a short nudge means
  answer what they asked last.
* Free plan changed (2026-10-25, Ismael): the 3 free ads are the real thing, no watermark and
  downloadable. After them nothing new without upgrading: a new set on free now removes the old
  ads (still counted) and needs free ads left, so it can't be used to get fresh ads for nothing.
  On paid a new set still replaces the ads in place so their links keep crediting leads.
* Pilot readiness check (2026-10-25, Ismael asked for an end to end look before real pilots).
  Fixed: on Render every request came through its proxy, so the brakes on sign up (10 per 10 min),
  sign in and the lead form (8 per 10 min) counted every visitor together; a busy hour of real
  leads would have been refused (`trustProxy`). Added: Forgot password (no email service, so the
  founder's phone hears about it and Admin makes a one time link, 48 hours, to send by hand); a
  new password signs out every other device; Send feedback in the account menu (Admin lists it and
  the founder's phone gets it); server errors alert the founder's phone (at most every 10 minutes)
  and people see a plain message; safety headers; last seen per account in Admin; lead alerts turn
  on in one tap (Hopkins makes a private ntfy name, shows the steps, sends a test); a plain privacy
  page at `/privacy`, linked from sign in, Settings and every lead page; lead page link previews
  with a full image address. Walked every screen at iPhone size and on a laptop against a slowed
  server (scratchpad `e2e/pilot.mjs`, `e2e/newbits.mjs`), 28 tests. Founder alerts (resets,
  feedback, errors, sign ups) need `NTFY_TOPIC` set on Render. Pilots sign up with
  `/signup?invite=CODE`, which needs `INVITE_CODES` set on Render.
  Not built, known: emails of any kind, Meta (so free and paid pilots can't run ads, only download
  them on paid), Stripe, backups beyond what Turso keeps, the Monday report counts Monday in UTC.
* No more fixed three (2026-10-25, Ismael: "what if the user doesn't want any of the 3... the
  entire process of the ads is way too generic"). Why it felt generic: on Groq the first ads were
  never written by the model, only by fill in the blank templates (switched off 2026-10-24 after
  Groq invented details), so every home got the same three skeletons, "The life", "The standout",
  "The facts". Now: Hopkins sees the photos (Groq's free vision model), works out what's
  different about the home and who'd buy it, picks ideas that fit, names each ad after its idea,
  and makes 3 by default or what the agent asks for (1 to 5). The chat can add an ad, drop one or
  turn one into a different idea. A fact check (`app/src/facts.js`) catches details from nowhere;
  one rewrite, then the sentence goes. Free plan stays 3 ads in all; turning an ad into a new idea
  is a change, so it's included. Tested live on Groq 2026-10-25 with a craftsman (photos), a
  downtown condo and a fixer upper ("just one ad"): different ideas each time, nothing invented.
  Still to judge on a real phone with real listings: how good the ideas are on gpt-oss-20b, the
  backup model, which writes plainer than 120b.
* Groq's real capacity (found 2026-10-25): each free model has about 200,000 tokens a DAY as well
  as 8,000 a minute. The earlier estimate only counted requests. One new listing is about 5,000 to
  8,000 text tokens plus about 5,500 for the photos; a chat turn 2,000 to 3,000. So the main model
  covers roughly 25 to 40 new listings or 70 to 100 chat turns a day, then the backups take over
  (`GROQ_BACKUP_MODELS`), then the built-in writer. Testing burns the same allowance as the live
  site if both use the same key. The server logs tokens per call ("Groq <model>: N tokens").
  The live site and session testing do share one key, "Hopkins App" (Ismael, 2026-10-25). Groq
  limits are per organisation, not per key, so a second key in the same account wouldn't help;
  only a separate Groq account would. Until then, test with the fake model in `npm test` and the
  no key server, and keep live Groq runs to a few messages.
* Ad style (2026-10-25, Ismael: "the user can change everything in their style"): each ad has its
  own look in `ad.style` (`app/src/style.js` checks every change): background, label and text
  colour, font (modern or classic serif), layout (fade, top, split, card, frame), text size,
  left or centred, which part of the photo shows, fade strength. Two ways in: say it in the chat
  ("version 1 black with a serif font, centred"), or the Style button next to Run it (a sheet with
  a live preview, for one version or all 3). Guards on the chat path, because Groq fills every
  field it's given: only the parts the message mentions change, only the versions it names,
  colours go where the agent said ("green with a gold label"), harsh web colours are swapped for
  tuned ones, and a colour that wouldn't read (black text on navy) is left out and the reply says
  why. When a guard overrides the model, Hopkins writes the reply itself from what actually
  changed. The renderer also nudges a label that's too close to its background (gold on cream
  goes bronze). Tested live on Groq 2026-10-25: six requests in a row all came out right.
* Room labels (2026-10-25): the "Label, exterior, living" dropdown under each photo is gone (Ismael
  didn't see what it was for). Photos are numbered instead, so "use photo 3" works; labels are
  still guessed from file names behind the scenes so "use the kitchen photo" works too.
* Glass on the Ads screen (2026-10-25): the Chat/Ads switch, the Ad 1/2/3 tabs, Feed/Story and the
  Style sheet's This ad/All 3 have the glass. Update (Ismael: "don't have the same feel and
  gliding effect as the nav bar"): on phones they now use the tab bar's own material (rim, sheen,
  faint lens at rest, clear glass under a finger) and its physics (spring that overshoots a touch,
  stretch while moving, swell when pressed, follow a dragged finger and land on the nearest
  pill), in `settleSegs` in app.js. Laptops keep a plain slide. Over a dark photo the version and Feed/Story controls turn dark with light
  labels, like the tab bar (`glass.js` samples the ad canvas under them).
* Admin (2026-10-25, Ismael): only his account (gethopkins@gmail.com) should have it, never the
  public. Admin = the account's email is on `ADMIN_EMAILS` in Render (hopkins-app, Environment),
  checked by the server on every admin request; the menu link only shows for admins too. Emails
  aren't verified, so in production an admin email can't be used to sign up and no account can
  change its email to one: admin only ever applies to an account that already exists. To make
  someone an admin later: they sign up as normal with an invite code, then their email is added
  to `ADMIN_EMAILS` (comma separated) and the service restarts. To remove it, take the email out.
* Covers (2026-10-25, Ismael): a listing with no photo shows a cover instead of a beige square:
  oxblood with fine grain, the price big in gold, beds, baths and size in cream, and the two
  pebbles drawn large and faint, placed differently per listing. Same on Today; sidebar thumbnails
  show the mark on oxblood. The card line under the name says "No photos yet" instead of the price.
* Rename (2026-10-25, Ismael): in a card's press and hold menu and in the listing's ··· menu. Opens
  at the top on a phone (clear of the keyboard), saved as `listings.title`; clearing it goes back
  to the address. The new name shows the moment Save is tapped (the save happens behind it). On a
  phone, text selection is off across the app like a native app (blocked at `selectstart` too),
  except messages, ad text and inputs, so holding a card only opens its menu. API answers are sent
  `Cache-Control: no-store`.
* No guessed cities (2026-10-25, Ismael): a listing's city comes from the listing or not at all.
  Hopkins used to fill it from the brand's city, so photos of Dubai became "Miami". A listing with
  no address is "Untitled listing". On start, the server clears the brand city from listings whose
  own words never mention it (`forgetGuessedCities`).
* Photos sent (2026-10-25, Ismael): shown like Claude, the images themselves on the right with no
  bubble (one big, two side by side, more in a grid with "+N"), and a text bubble only if words were
  typed. Photos sent alone are saved with no text (they used to say "New listing"; old ones still
  render as photos only). The model sees "(sent 2 photos)" in the conversation.
* Photos waiting to be sent (2026-10-25, Ismael): a tray inside the message box, like Claude or
  ChatGPT: a thumbnail each with × to remove, a + to add more, "3 photos ready to send", and a
  count badge on the photo button. Before, on the New listing screen after a first message, added
  photos went into the hidden drop area and couldn't be seen. The suggestion hides while photos wait.
* Chat like Claude or ChatGPT (2026-10-25, Ismael): replies render Markdown (bold, lists, small
  tables that scroll sideways on a phone, short headings), the model is told to talk like a person
  with opinions and reasons, fit the length to the question, use an emoji only now and then, with a
  worked example of the voice. Chat calls run warmer (temperature 0.7) than ad writing (0.4).
  Live on Groq: real opinions and a clean comparison table, but it still slips into "we" now and
  then and rarely uses bold; Claude follows these rules more reliably.
* Groq's free limit is 8,000 tokens a minute and each chat message now uses about 4,000, so two
  quick messages can hit it. Hopkins waits and retries once when Groq says a few seconds; past
  that it says it's getting a lot of messages instead of "I didn't follow" (changes the rules can
  do still happen).
* Every push redeploys the app; for a minute requests can fail (Ismael saw "Something went wrong"
  on Admin at 09:01, a minute after a push). Reads now retry quietly; otherwise it says Hopkins is
  updating. Admin is only for Ismael: every account, who asked to upgrade, and the switch to paid.
* The message box empties the moment you send (2026-10-25, Ismael); it only comes back if the send
  fails. With the free ads used up, the model is told not to offer to make ads (it had asked
  "would you like to proceed?" when the only answer was the upgrade note).
* One thread (2026-10-25, Ismael): whatever was said on the New listing screen before the listing
  arrived (hello, questions) becomes the start of that listing's chat, so it reads as one
  conversation instead of jumping to a fresh chat. When the free ads went on a listing that's since
  been deleted, the upgrade note says "an earlier listing".
* Cleaning up listings (2026-10-24, Ismael asked): on the Listings page, Select (top right) ticks
  listings and a bar at the bottom deletes them in one go, like Photos. Press and hold a card (right
  click on a laptop) for its menu: Open, Select, Mark as sold or for sale, Delete. Every delete asks
  first. `POST /api/listings/delete` takes several ids, only the workspace's own.
* Suggested reply (2026-10-24, Ismael): the quick reply pills above the message box are gone. Like
  Claude's app, the empty box shows Hopkins' guess at your next message in grey with a › to send
  it; tapping the box (phone) puts it away so you type your own; on a laptop it stays until you
  type and Tab drops it in. The model writes the guess with each reply (never about paying, never
  a placeholder like "new text"); without one, it comes from where the listing is at. "Try an
  example" moved into the New listing intro. With no suggestion (none found, or the model failed)
  the box says "Reply to Hopkins", which fits any conversation (Ismael, 2026-10-24). A reply that
  fails (no signal) stops the thinking mark, puts the message back in the box and says "No
  connection. Try again." Hopkins also says "the line on the photo", never
  "overlay", whatever the model writes.
* Notices (2026-10-24, Ismael): every one ("Saved", "Listing deleted", "Copied"...) drops in from
  the top like an iPhone notification, with the mark as an app icon, and glides back up after about
  3 seconds. Swipe up to dismiss early; pulled down it stretches and springs back; holding it keeps
  it. Glass and full width on phones, a small white card on desktop. All in `toast()` in app.js.
* Fixed (2026-10-24, third report): "Hello" on the New listing screen made a listing (named after
  the brand city), then the free limit message. Now a message only becomes a listing when it has
  photos, a link or a fact about a home; anything else gets a normal reply there (Groq when the
  key is set, the rules otherwise) and nothing is saved. The listing steps ("Reading the
  listing...") only show for a listing; otherwise the Hopkins mark spins with the pebbles taking
  turns while it thinks and the gold one rises as the reply lands, the same animation as the old
  landing page demo, also in every listing chat. Listings can now be deleted (··· menu); deleting
  doesn't give free ads back (`workspaces.ads_removed`). Ismael's stray "Miami" listing on the live
  site can go that way.
* Fixed again (2026-10-24, second report): the tab only lit up after the next screen's data
  came back, so on the live server the lens sprang back to the old tab for a moment and the tap
  looked lost. Now the tab lights at once, Today draws from what's loaded, and the touch code
  can't be left stuck by a touch iOS never finishes. Slow server test: old code 7 of 30 right,
  new 30 of 30 at 0, 0.9 and 2.5 seconds per request. Real iPhone Safari (WebKit) can't be run
  in the build session; only Chromium with touch.
* Fixed (2026-10-24): the account and listing menus on phones sat below the screen (the glass
  style overrode their fixed position). The message box, pills and Run it bar now use exactly the
  tab bar's glass, with Apple's scroll edge effect behind them so chat text doesn't show through.
* Fixed (2026-10-24): tabs that "stuck". Two causes: iOS cancelling a quick tap or glide (the bar
  now lands on the tab under the finger and the link works as a backup), and a slow screen
  finishing late and drawing over the one just tapped (screens now check they're still wanted).
  Covered by touch stress and slow connection tests in the session's browser checks.
* Paid accounts can download every ad (feed and story images, copy the text) and post or boost it
  themselves while Meta isn't connected; the approval message says so. Each version's link still
  credits the leads. Free accounts stay previews only (Ismael, 2026-10-22).
* Open question: billing starts "when the first ad goes live". Does an ad the agent downloads and
  posts themselves count as live?
* The waitlist is small (no full teams on it yet, Ismael, 2026-10-22). Don't plan around a batch of
  teams; the first users are whoever signs up, solo agents included.
* Next, in order: (1) deploy it, run Ismael's own test listings through it, then invite whoever is
  on the waitlist (free plan, invite codes); (2) the Meta app: Marketing API with the Housing category, lead ads, then App
  Review (list below), tested first on Ismael's own ad account; (3) pull real spend and leads in,
  so the Monday report and the testing record fill themselves; (4) Stripe, starting at the first
  live ad; (5) push notifications for approvals once teams have live ads.
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
* Outside review (2026-10-26): another AI reviewed the zip (62/100). Three of its points were
  right and are fixed: reset links and the lead page's share address now come from `APP_URL`
  or Render's own `RENDER_EXTERNAL_URL`, never from the request's Host header; uploaded photos
  are checked by their first bytes, not just the type the browser claims; a failed database
  migration is now logged (only "duplicate column" is ignored). Its failed test run was its own
  partial npm install (all 32 tests pass). Still open, low priority: rate limits trust
  X-Forwarded-For, two free plan requests at the same instant could both pass, no CSP header.
* Pilots on paid (2026-10-26, Ismael): every sign up with an invite code now starts on the paid
  plan, so pilots never meet the free limit or the upgrade card. Accounts made before this stay
  as they were and are switched in Admin. `PILOT_PLAN=free` brings back free sign ups later.
* Review gaps closed (2026-10-26): (1) the free plan race was real: with a slow model, three
  listings sent at once made 9 free ads. Ad making is now one at a time per free account (paid
  never waits). (2) Render passes on a faked X-Forwarded-For, so wrong passwords now also count
  per account (10 in 10 minutes), reset emails per address (3 an hour, which also protects
  Resend's 100 a day) and leads per listing (30 an hour); a flood of fake addresses can no
  longer wipe the counts. (3) Every page now sends a Content Security Policy (scripts only from
  the app, inline ones by hash); the whole pilot walkthrough ran with no blocked loads. (4) The
  lead form refuses archived listings, like the page already did. Not done: database backups
  depend on the Turso plan (check the dashboard), and photos aren't resized on the server.
* Copy and edit (2026-10-26, Ismael): small Copy and Edit icons under messages, like ChatGPT and
  Claude. The latest message on each side shows them; tap any other to bring them up. Edit is on
  the latest message you sent: it goes back in the box with an "Editing your message" bar, and
  sending replaces it. Hopkins forgets the old wording (chosen over remembering it, so the model
  never acts on both): the message and its replies go, the listing and ads go back to how they
  were before it (`messages.undo`), and on free the ad count never goes down or up from an edit.
  Not offered once the ads changed another way since (Style, a new set, an approved run, a
  deleted photo). Checked on an iPhone sized screen and a laptop against a slowed server.
* Edit on every message (2026-10-26, Ismael: "the edit button still isn't there"): it had only
  been on the latest follow up, so the message that made the listing had none. Now every
  message the agent sent has Edit, on the New listing screen too. Each message keeps the listing
  and ads as they were before it; editing rewinds to that point (Style changes since included).
  Editing the first message reads the listing again and rewrites its ads in place (same ads,
  links and free count). Only an approved run blocks editing what came before it. The messages
  that will be replaced fade while editing.
* New listing screen guess (2026-10-27, Ismael: "what's 1+2?" showed "Reading the listing" and
  "Writing 3 different ads"): the app guessed a listing from any digit. It now needs what the
  server looks for (a price, beds, baths, size, a street address, a link or photos), so questions
  get the thinking mark and an answer. The step reads "Writing the ads", since the count varies.
* Photos from a link (2026-10-27, Ismael: a Zillow link only gave the address, beds, baths and
  size): Hopkins now brings in up to 12 of the listing's own photos from the page when no photos
  are sent, plus the price, year built and the agent's own description, from Zillow's page data
  (`photosFrom`, `pageFacts` in listing.js). Pages are read up to 3 MB (Zillow's run to 800 KB with
  the photos near the end; the old 600 KB cut was why). Tested on a live Zillow listing with Groq:
  12 photos in under a second, ads on the real porch and front, price read. The first reply's
  "**1** highlights" is now always "**Ad 1**". Other portals (Redfin, Realtor.com) untested.
* Suggested reply removed (2026-10-27, Ismael): no grey guess in the box and no › button; the model
  no longer writes one (fewer tokens per reply). The box says "Ask Hopkins anything" on a new
  chat and "Reply to Hopkins" once there's a conversation. Rule updated in CLAUDE.md.
* Message box (2026-10-27, Ismael): the photo icon is a "+" like Claude and ChatGPT (it opens the
  phone's own picker: library, camera, files). The + and the send button sit the same distance
  from the box's edges and a one line box is exactly their height, so all three share one centre
  line; with longer text they stay at the bottom. Measured on iPhone SE, 13, Pro Max, iPad and a
  laptop: same centre line and equal insets on each.
