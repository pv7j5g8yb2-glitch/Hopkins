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
* Reel 7, "the jug" (2026-10-28): Ismael's own 4.3s hook clip (a glass jug given one push,
  rolling away down a path) plays first, untouched (its own sound, fitted to 1080x1920 with thin
  oxblood edges), then a hard cut into `r7.html`: "Here's how you're gonna set up a listing ad that
  keeps rolling without you." Six steps from Meta's own rules (Housing category, three different
  ideas, one ad set, instant form, no big edits for a week, judge on cost per lead), ends on
  Follow @gethopkins. Joined with ffmpeg's concat filter (command in the session; the hook clip
  isn't in git). 54s in all. The clip is about 4 dB louder than the voice part (-11 vs -15 LUFS),
  left as it is. Cover in `hooks.js` ("Set it up once. Then don't touch it."). Kokoro needs
  `VIRTUAL_ENV=$PWD/vovenv` set on its first run so it can install its English model.
  Results after 13 hours (Ismael's screenshots, 2026-10-29): 836 views, skip rate 21.6%, average
  watch 5s, most viewers gone within 2 seconds of the cut, 6 likes, 3 saves, 0 follows. See the
  playbook log for the lesson.
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

## Goal: 10 users by 1 January 2027 (set 2026-10-30)

A user is a real estate agent or team who makes ads in Hopkins, ideally with them running on Meta.
The first 10 don't need App Review or a registered business: they join the Meta app as testers
(should work, untested with ads until Ismael's own test).
Being a tester (Meta's App Roles docs, checked 2026-10-30): no developer account and no download.
Ismael adds them by their Facebook account, they tap Accept once (Facebook, Settings & privacy,
Apps and websites), then Connect Meta in Hopkins like any user. Meta requires an agreement that
they're testing the app, so the pilot needs a line they agree to. If the app sits in a business
portfolio, roles are added in Business Manager instead.

1. By 8 Nov: Meta app made (docs/META.md), keys on Render, one small real ad run through Hopkins
   on Ismael's own ad account. Render on a paid instance before inviting anyone (free restarts).
   Ask Nemanja what he does.
2. By 22 Nov: the first real agent running ads from Hopkins. Pilot offer: Pro free during the
   pilot, they pay their own ad spend, they give feedback. Agents come from the reels (hook clip
   style, the best so far), the waitlist, and Ismael posting as the founder where agents talk
   (r/realtors, real estate Facebook groups), looking for 10 agents to try it.
3. By 31 Dec: 10. Each pilot added as a tester, set up by Ismael on a call or in a DM. A reel
   every week, numbers only when real. A pilot's real Lead, with their permission, is the proof.

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
* Leads and Report used to be "coming soon" (2026-10-25); Ismael had it removed everywhere
  (2026-10-28). Leads with none yet shows "No Leads yet" and a one line hint; Report always opens.
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
* Billing (Ismael, 2026-10-27): Pro is billed every month from the day they sign up, like any
  subscription. "Billing starts when your first ad goes live" is gone from the app, the chat and
  Hopkins' prompt.
* The waitlist is small (no full teams on it yet, Ismael, 2026-10-22). Don't plan around a batch of
  teams; the first users are whoever signs up, solo agents included.
* First real waitlist sign up (2026-10-30): probably Instagram @newanjaz (private, Serbian network),
  under $500 a month on ads. His entry: just him, "Somewhere else" (not US, Canada, UK, Ireland,
  Australia or UAE), no business name or Instagram given, came from an Instagram link. Nothing in
  it says he works in real estate, so Ismael is to ask him himself before deciding on an invite.
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
* Copy and Edit always visible (2026-10-27, Ismael): they were only on the newest message on each
  side, the rest hidden until tapped, which nobody found. Now every message shows Copy and every
  message you sent shows Edit, permanently. Selecting part of a message works on phone and laptop.
  Checked on an iPhone sized screen: copying and editing an older message both work.
* Replies write themselves out (2026-10-27, Ismael): new Hopkins replies appear word by word like
  ChatGPT (`typeOut` in app.js). The reply arrives whole (it's fact checked first), so this is in
  the app: every word is laid out from the start and only fades in (no reflow), timing follows the
  clock so slow phones finish on time, a long reply speeds up to stay within about 2 seconds, and
  ad cards, buttons and Copy appear after the text. A tap, a new message, leaving the screen or
  switching apps finishes it at once; reduced motion shows replies whole. Measured on an iPhone
  sized screen: 86 words in 2.0s, and 211 words in 2.1s with the processor at a quarter speed,
  with an even rate and no change in the reply's height.
* Grey background bug (2026-10-27, Ismael's screenshots): "now do the same for ad 1 and 3" did
  nothing while Hopkins said it was done, then "no you didn't" got an apology and "let me fix that
  now" about a change it had made. Causes and fixes: (1) the model sent the grey plus a stray
  "reset", and reset wiped the change; reset now only counts when the agent asks to start over.
  (2) "ad 1 and 3" was read as ad 1 only; lists ("ad 1 and 3", "ads 1, 2 and 3", "versions 2 & 3")
  are read whole. (3) "the same", "that too", "like ad 2" repeat the last look change (kept on the
  reply as `data.look`), with or without the model. (4) A reply about the look is checked against
  the ads after the change; if nothing changed it says so instead. (5) "No you didn't" with no
  change in that turn is answered from the ads' real look. Rerun live with Groq: all three grey.
* Ads tab (2026-10-27, Ismael): "Fair housing check passed" and Change photo removed (a wording
  warning still shows when there is one; photos change in the chat). The Style sheet changes the
  ad on the tap (about 5 ms, was the server round trip) and saves in the background in order.
  The first set of ads ends with how to change the look (Style, or say it), and the Style sheet
  says anything else can be asked in the chat.
* Open question to Ismael (2026-10-27): free form image edits like ChatGPT or Nano Banana need an
  image model; Google's Gemini 2.5 Flash Image is about $0.04 an image (aggregator sites, checked
  2026-10-27), no clear free tier. Not added. Edits must never change the property itself.
* Grey bug, round two (2026-10-27, Ismael's live chat): "the same for ad 1 and 3" still did
  nothing there, because Ad 2 went grey before the fix, so no look was kept on that reply. Now
  "the same" falls back to the look of the most recently changed other ad; "do the fucking same"
  style wording counts (not only "the same"); a look only "the same" keeps the words as they were
  (the model had rewritten both ads' copy too); and "grey color background" no longer lets a label
  colour through ("color" alone counted as asking for the label). Rerun live with Groq on a phone
  sized screen: Ad 2 grey, "now do the same for ad 1 and 3", "no you didn't": all three grey,
  every reply true, words untouched.
* Truth, round three (2026-10-27, Ismael's screenshots: "removed the period" with the period still
  there, "grey" on navy ads, old changes reported as new, the full stop put back on "$10,000/mo",
  the caption rewritten when only the line was asked for, "The platform only lets me use the
  photos you already uploaded"). Now:
  * every reply about a change is built from the ads before and after (`editParts`, `sayEdits`);
    when nothing changed the reply says so and shows where the ads are (`stateNow`);
  * exact edits skip the model (`directEdit`): "remove the dot", "change the text of X to Y"
    (the split comes after the ad's real line, so "close to santa monica to $10,000/mo" works);
  * the line keeps the full stop as the agent has it (`lineFor`): copied from another ad it is
    exactly that ad's, never a full stop added after "/mo";
  * Hopkins talks as itself (`asItself` plus the prompt);
  * the agent's own photo can go on the ads: style `face`, a round photo bottom right with a white
    ring, from their profile photo. Without one, Hopkins says where to add it (Settings, Profile).
    "bottom right" no longer counts as asking for a new layout.
  Rerun live with Groq on a phone sized, slowed server: every reply true, his face on all three.
* Sidebar (2026-10-27, Ismael): each recent listing has a ••• (on hover, and on the open one) with
  Rename and Delete, in place of the gold "waiting" dot ("Ads ready" under the name still says it).
  The listing's name at the top of the chat renames it when tapped, on laptop and phone. A
  sidebar button next to the logo closes it to a slim rail (open again, new listing, account), like
  Claude and ChatGPT, and it stays closed after a reload. Deleting the open listing goes to
  Listings. Checked with screenshots at laptop and iPhone size on a slowed server.
* Pro and names (2026-10-27, Ismael): the paid plan reads "Pro" in the app, the chat and Hopkins'
  own replies; the account corner and menu show the person's name (their own, then the agent name
  in Brand, then their email) instead of the brokerage. Checked at laptop and iPhone size.
* Swipe to close (2026-10-27, Ismael): every phone sheet (account menu, listing menu, Style,
  rename, feedback, the Pro card) follows the finger and closes on a swipe down, or up for the ones
  that open at the top. A short flick is enough, a small pull springs back, taps and sideways swipes
  (colour swatches) still work. Checked on an iPhone sized screen with real touch events.
* Listings without a photo (2026-10-27, Ismael): the oxblood cover shows only the ground and
  pebbles, no price or beds and baths on it, on Today and Listings.
* 502 on the live app (2026-10-27, 20:12, Ismael's phone): a minute after a push. /healthz now
  says when the running copy started, and a promise that fails without a catch is logged instead
  of stopping the server.
* Today header (2026-10-27, Ismael): under the greeting, the day's date instead of "4 things need
  you today" (which repeated the count). The three numbers sit in one even row between hairlines,
  and each is a way in: Listings opens Listings, Leads this week opens Leads, Waiting on you
  scrolls to the first card. All three numbers in the same ink (Ismael). The lead count comes
  from the leads table for the last 7 days, not from the inbox's newest 30 items. The cards below
  show only the photo (or cover) and the name: no "Ads ready" tag, no "See ads" button.
  The Monday report no longer shows in "This week" on Today; it lives on Report. New leads still do.
* Report redone like Screen Time (2026-10-27, Ismael: "too confusing and overloaded"): one card
  with the week's leads as a big number, showings and the change on the week before under it, and
  7 day bars (today in gold, days in the viewer's own time). "Next" is at most two lines: every
  listing with ads waiting becomes one line, then the first other suggestion. "By listing" shows
  only listings that are running or have leads, each a thin bar (top one gold) and a count; a tap
  opens a sheet with its leads, showings, cost per lead and the spend box (the only place spend is
  typed now). "What's winning" is one split bar with a legend, shown only once there are leads.
  Cost per lead is now spend over all of a listing's leads (spend is a running total), not over
  this week's. The 4 boxes and the 6 spend inputs are gone. Checked at iPhone and laptop size.
* Brand page (2026-10-27, Ismael): "How it looks" is now "Branding" (colours and logo), "How it
  sounds" is gone (the saved voice stays as it was, new accounts write plain), and Font is its own
  section: six fonts shown as an "Aa" sample over the name, Modern (Inter Tight), Classic
  (Instrument Serif, was "Classic serif"), Elegant (Playfair Display), Editorial (Fraunces), Bold
  (Archivo Black), Minimal (DM Sans). The Style sheet, the chat ("elegant font", "bold font") and
  the model all know the six. The logo shows as a circle like a profile picture everywhere: on the
  ads (footer and card), the Instagram preview, the Brand page and the lead page. In the card
  layout the big line now shrinks or goes to two lines to stay inside the card, never cut off.
* Shorter words on screen (2026-10-27, Ismael: "too talkative, sounds like a novel"): "Live
  preview. Tap to expand.", "Sample ad", "New ads and leads show up here.", "Pro requested.",
  "Test sent", "Running ads is on Pro.", "Something broken or missing?", and the coming soon lines
  on Leads and Report cut to one short line each. Rule saved in CLAUDE.md.
* Dates follow each user's own clock (2026-10-27, Ismael): Today's date and greeting, and the
  Report's day bars, use the phone's time zone and redraw by themselves at 00:00 (and at 12:00 and
  18:00 for the greeting), also when the app comes back from the background. Every request sends
  the phone's time zone (X-Time-Zone), so the Monday report starts at the agent's own Monday
  midnight, not UTC's (`localDay`). Checked with a fake clock at 23:59 in Dublin and Los Angeles.
* Sidebar (2026-10-27, Ismael): Recent shows only each listing's name, no "Ads ready",
  "Approved" or lead count under it.
* Report weeks (2026-10-27, Ismael: "always Monday to Sunday, never moves over"): the Report is
  one calendar week, Monday 00:00 to the next Monday 00:00 on the phone's own clock, exact across
  clock changes. This week's bars run M to S with today's letter bold over a small gold dot and
  the days still to come faint. ‹ and › step a week (› stops at this week, ‹ at the week the
  account started); tapping the week's name ("This week", "Last week", "19 to 25 Oct") opens a
  calendar of every month since the account started, each row a week, the picked one in oxblood.
  "Next" only shows on this week. Past weeks are kept once loaded and the week before is fetched
  ahead, so the arrows are instant; a quick run of taps always lands on the last one asked for.
  Today's "Leads this week" and the Monday message ("Last week: ...") use the same weeks
  (`weekRange`, `localDay`, `zonedMidnight` in hopkins.js). Checked on an iPhone sized screen in
  Dublin time with leads at 23:30 Sunday and 00:30 Monday, a week in September, the first week and
  three fast taps.
* Thinking and names (2026-10-27, Ismael): the "Reading the listing / Writing the ads / Checking
  the wording" ticks are gone; a new listing shows only the thinking mark, like every reply, and it
  stays until the listing replaces it (the listing loads behind it, so no grey placeholder flashes
  in between). Listings with the same name show as "Naples", "Naples 2", "Naples 3" in the order
  they were made, everywhere a name appears (`numberNames`).
* "Anytime", not "any time" (2026-10-27, Ismael), in the app, Hopkins' replies, the waitlist page
  and the reel and film sources. Settings reads "Billed monthly. Cancel anytime."
* Report listings board (2026-10-27, Ismael): "Next" is gone. "Listings" is a ranking: rank number
  (1st in a gold circle), photo, name, a thin bar against the best, a short line of the other
  numbers, and the sorted number on the right. Sort: Most leads, Most showings, Lowest cost per
  lead, Newest (no ranks). Filters: All, Running, With leads, each with its count. Every listing
  shows, the ones at 0 faded and unranked. Sort and filter are remembered on the device. A tap
  still opens the listing's sheet with spend.
* Report, round three (2026-10-27, Ismael): filters are All, Active (ads running, not sold) and
  Inactive; "Newest" is "Most recent"; ranks 1, 2 and 3 sit on gold, silver (#C9CDD3) and bronze
  (#B07A4E). The change on the week before is a percentage with a green rising or red falling
  arrow, like Screen Time or Shopify. A week still going is set against the same stretch of last
  week (Monday up to this moment a week ago), a finished week against the whole week before it;
  from 0 it reads "Up from 0", the same count reads "No change", nothing at all shows nothing.
  "Lead" is capitalised across the app, Hopkins' own messages, the Monday report, alerts, and the
  model's replies (`capLeads`, noun only). Checked on a slowed server at iPhone and laptop size:
  6 vs 2 so far reads up 200% (last week's 3 later Leads rightly left out), 5 vs 10 reads down
  50%, 10 vs 0 reads up from 0.
* Report, round four (2026-10-27, Ismael: "too bloated"): the card shows only the number, a
  clear gap, "Leads", then the arrow and percentage centred on one line with "vs last week" (the
  showings line is gone). Listing rows are rank, photo, name, bar and number only (no showings or
  cost per Lead under the name). The week arrows sit evenly either side of the week's name.
  Hopkins' chat prompt now asks for one or two plain sentences, professional, no filler.
  Open question to Ismael: should Hopkins' chat replies also talk about itself in the third
  person, or keep "I" like Claude and ChatGPT (only screens use the third person for now)?
* Demo account (2026-10-28, Ismael: wanted to see the screens full): Admin has "Open demo account".
  It builds a fresh demo agent (Sarah Mitchell, Mitchell Home Group, Austin, on Pro) and signs the
  founder into it: 7 listings with real photos (Unsplash, in app/demo/photos), 3 hand written ads
  each named after its idea, 4 listings running, 1 sold, 2 with ads waiting for a yes, about 50
  Leads over six weeks with names, phones and statuses, spend, and a history back 6 weeks, all
  counted back from now in the founder's own time zone. No AI calls. "Back to my account" in the
  account menu returns to the founder's account (a signed cookie, no password). Opening it again
  rebuilds it; demo accounts never show in the Admin list. Code: app/src/demo.js. Opens in about
  2 seconds locally on a slowed server; on Turso it makes a few hundred writes, so expect longer.
* Report, round five (2026-10-28): "What's winning" (ad types) is replaced by Top ads: the three
  single ads with the most Leads that week, each shown as itself (its photo and its line, gold,
  silver and bronze rank), its name, count and listing; a tap opens that listing's Ads tab on it.
  This week no longer shows a percentage (Ismael: "7 Leads, 600%" beside last week's 9 made no
  sense); it shows "Last week 9". Finished weeks show the percentage "vs the week before", which
  in the demo reads 9 vs 10 down 10%, 10 vs 11 down 9%, 11 vs 7 up 57%, 7 vs 5 up 40%.
* Full end to end check (2026-10-28, Ismael: "everything, literally EVERYTHING"), real Groq, iPhone
  size on a slowed server, then laptop, then the demo account. Passed: sign up and sign in errors,
  brand setup, new listing with photos, every chat change (colours, "the same", fonts, shorter,
  full stop, face with and without a photo, a challenge, edit and rewind), Ads tab, Style,
  download, Run it, plan and yes, buyer Lead page, Lead to Today, Leads, chat and Report,
  listings menu (sold, select, delete, rename), settings (profile, photo, password, alerts),
  feedback, sign out, free plan limits and Ask for Pro, Admin (plan switch, reset link, demo and
  back), Report weeks, calendar, sort and filters, sidebar collapse and the listing menu.
  Fixed from it: "thanks" got "Nothing changed with that message" (now "Anytime.", never the
  model); "make ad 2 navy" also rewrote the caption (a plain look change now keeps the words);
  "which ad is doing best?" said "most engagement" with no data (the model now gets each ad's
  Leads and showings and answers with them: "Ad 1 has 13 Leads, 5 showing requests..."); two
  weeks priced as "$200 over 10 days" (now $20 a day, $280); "before we start" (stray "we" now
  rewritten to "I"); trailing offers ("If you want..., I can...") stripped; the first ads reply
  ended "Let me know if anything needs tweaking" (now cleaned like every reply); the free limit
  reply was five sentences (now two, the price lives on the Pro card); "The free plan makes up to
  3 ads as previews" was wrong (now "3 ads, yours to download"); the Instagram handle in ad
  previews kept "&" ("stone&corealty", now "stoneandcorealty"); glass sheets on phones let the
  buttons behind show through (more opaque now, and the select bar hides under a sheet); the busy
  reply is one short line and no longer becomes "I didn't follow that one" when Groq is over its
  limit; Admin strings shortened and "Paid" reads "Pro"; "Colors" and "Main color" now "Colours"
  and "Main colour" like the rest. Known limit: Groq's free key runs out after a few quick
  messages in a row (about 8,000 tokens a minute); Hopkins says so and asks to send it again.
* Leads search and name capitals (2026-10-28, Ismael): a round search button sits by the Leads
  title; it opens a search field that filters as you type by name, phone (any format), email,
  home, what they asked, status or ad, with "No Leads match" and Cancel. Every name (Leads,
  account, agent name on the brand) now starts each part with a capital, and names saved before
  are fixed at start. Checked on a slowed server at iPhone and laptop size.
* Blocked links and currency (2026-10-28, Ismael, angry: an idealista link failed, then Hopkins
  said it couldn't browse at all and ignored "why"). idealista blocks apps on purpose (bot
  protection); Hopkins doesn't get around that. Now: the first reply names the site; any
  question on a listing whose link didn't open gets a fixed true answer (that site blocks apps,
  Zillow and most brokerage sites don't, paste the description or send photos and the price),
  never the model's guess; the model is told Hopkins does open links. Facts typed in the chat
  that the model leaves out (price, beds, baths, size, address) still reach the listing. Prices
  keep their currency (EUR, GBP, AED, CAD, AUD; a new `currency` column on listings), shown and
  written as €1,250,000 / €1.25M. The empty "Your ads show up here / Make the ads" panel is gone:
  with no ads the chat has the whole screen. More trailing offers stripped ("Anything to
  adjust?", "Pick the one..."). Checked with real Groq on a slowed server, phone and laptop.
  Open idea: read facts from screenshots of a listing page, for sites that block links.
* Why Hopkins' chat isn't as smart as Claude or ChatGPT (2026-10-28, Ismael asked): it runs on
  Groq's free open models (gpt-oss-120b, with smaller backups), which are far weaker, allow about
  8,000 tokens a minute while one chat message uses about 5,000, sometimes return broken JSON,
  and can't see photos well. Every failure drops to the built-in rules, which is where replies
  like "I didn't follow that one" come from. The Claude path is already built and current
  (Claude Opus 5.5, structured output, refusal fallback, sees the photos): it turns on the moment
  `ANTHROPIC_API_KEY` is set on Render, no code change. Rough cost, an estimate not a
  measurement: a few cents per chat message, up to about 10 cents for a new set of ads with
  photos. `HOPKINS_MODEL=claude-sonnet-5-5` halves that if cost matters. Waiting on Ismael for
  the key.
* Gemini, the free model (2026-10-28, Ismael: "keep the absolute best free one"). Built and
  tested against a fake Gemini, not yet live: with `GEMINI_API_KEY` set (free from
  aistudio.google.com, no card) Hopkins runs on Gemini 3.5 Flash, the one that answers free keys reliably (3.8 and 3.7 Flash refused free keys with "high demand" every time on 28 October; they stay as backups after it, then
  2.5 Flash if a name is retired), with the same instructions, structured answers and rules;
  photos go to it as images so it labels them and says what's in them; a link a site blocks is
  read through Google's URL context (Google's own fetcher, a documented API feature) and used
  only when Google reports it really opened the page, never a guess; Groq answers when Gemini
  is over its free limit. Order: Claude, then Gemini, then Groq. Caveats to tell pilots about:
  Google's free tier may use what's sent to improve its products; free limits aren't published
  and vary by project. Waiting on Ismael for a free Gemini key to test it live.
* Gemini tested live (2026-10-28, with Ismael's free key, used from the chat, never saved).
  Free keys: 3.5 Flash answered every time (2 to 18 seconds, though it was overloaded now and
  then); 3.8 and 3.7 Flash refused with "high demand" every time; 2.5 Flash is closed to new
  keys. Order is 3.5, 3.8, 3.7; a model that's overloaded rests 30 seconds, one over its limit 60,
  and Groq answers meanwhile. His idealista link opened through Google's URL context: a villa
  at Avenida Cantábrica 35, Marbesa, Marbella, €4,995,000, 6 bed, 8 bath, 658 m², with three
  specific ads (rooftop sea views, steps from the beach, the full spec) in about 64 seconds from
  link to ads. Google gave no photos from that page, so the ads waited for the agent's. Chat
  answers were on point ("which first", "why", two weeks at $280, "navy"). Fixed from the run:
  "Tell me if you would like to adjust" stripped; "and new caption text" now reads "the caption
  is shorter" or "is rewritten"; the model's line before a plan ("Running all three ads...",
  before anything ran) is gone, the plan alone asks for the yes. Needs `GEMINI_API_KEY` on Render.
* One model for all of Hopkins (Ismael, 2026-10-28): Gemini 3.5 Flash runs every part (chat,
  reading listings and links, seeing photos, writing ads), with Groq as the backup when it's
  busy. No routing between models for now: one voice, nothing to save on a free tier, simpler to
  fix. Revisit only when Hopkins goes paid, with the blind test (Gemini 4 Argon, Claude Opus 5.5
  or Sonnet 5.5, GPT 6 Astra) deciding the main model.
* Stop button (2026-10-28, Ismael). Send turns into Stop while Hopkins works (chat, edits and the
  New listing screen). The server can't call the model back, so a stopped reply runs to its end
  and is then undone: replies deleted, listing and ads restored from the message's undo, the
  message marked stopped and left out of what the model sees; a message sent right after waits
  for that. Stopping a new listing deletes it without counting its ads and frees its photos.
  `/healthz` now also says which provider answers (`ai`). Checked in the browser at phone size
  with real Gemini: ads unchanged after Stop, Edit on the message, the next question answered.
* Live check on Gemini (2026-10-28, invite code from Ismael, test account deleted after). The
  live site reports `ai: gemini`. But the free key ran out: 3.5, 3.8 and 3.7 Flash all answered
  "You exceeded your current quota", so the live run fell back to Groq and the built-in writer.
  The idealista link didn't open (Google's reader is Gemini too), the photo listing got generic
  template ads with photos labelled "other", and one question got the busy line. Stop worked
  live (ads unchanged). 3.5 Flash answered one request a few minutes later, then ran out again:
  the free allowance is small (Google doesn't show the number to the API; a third party source
  says about 20 a day on 3.x Flash, which fits) and one new listing uses about three requests.
  My test runs used much of it. Added 3.5 Flash Lite after the Flash models (its own allowance,
  sees photos, answered every time). Fixed "On Ad 1, a different photo" to "Ad 1 now uses a
  different photo". The real fix is billing on the same Google key (no code change) or Claude.
* The chat knows the account (2026-10-28, Ismael: Hopkins said "I can't see any past report or
  lead numbers"). Every chat now gets a short summary from Hopkins' own records (`accountSummary`
  in hopkins.js): last week, this week so far, each listing's Leads and status, the top ads; with
  no model it still answers from the numbers. Fixed with it: the week's "cost per Lead" divided
  all spend ever by one week's Leads ("9 Leads, $255.56 each" in the Monday message); weeks no
  longer get one. Checked on the demo account: answers matched the Report (9 Leads, 3 showings,
  Westover Hills 20 in all, 3 this week). The idealista link still fails on the live site while
  Gemini's free Flash allowance is used up (Google's reader runs on it).
* Which listing sites Hopkins can read (2026-10-28, tested with Hopkins' own reader on real
  listings; Google's reader tried on the refused ones):
  - Full (price, beds, baths, size, address, the agent's full description, up to 12 photos):
    Zillow (US and Canada), Trulia, Coldwell Banker, Compass (5 photos). Compass, Coldwell
    Banker and Trulia only gave a one line summary until Hopkins learnt to read the schema.org
    data on the page (`ldFacts` in listing.js); now 900 to 1,800 characters of description.
  - Refused (403 or 405 to any app): Realtor.com, Realtor.ca, Redfin, Homes.com, Century 21,
    Keller Williams, RE/MAX, Sotheby's, Berkshire Hathaway. Google's reader: couldn't open
    Realtor.ca; Century 21 came back empty (Hopkins treats that as not opened). Not tried: eXp
    (my test address was wrong), MLS client portal links (OneHome, Matrix, Flexmls), agent IDX
    sites. Never work around a site's blocking.
  - Fixed with it: Canadian listings priced with a plain "$" now count as Canadian dollars
    (postal code or province), "4-bed, 2-bath" with hyphens is read.
  - Photos from a link stop at 12 on purpose (ads need a few, and each is stored).
* **Wording pass (2026-10-29):** every error, toast, button, hint, email and fixed chat line
  rewritten in standard software wording (rule in CLAUDE.md). Buttons renamed: "Make the ads" is
  now "Create ads", "Run it" under an ad is "Run ad", "Yes, run it" on the plan is "Approve and
  run". The reset email, the buyer page form and the login page were done too.
* **Photos of any size and HEIC (2026-10-29):** there was never a real size limit (the browser
  shrinks every photo to 1600 pixels first, so a 12 MB, 8000 pixel JPEG went in fine). The real
  gap was iPhone HEIC photos on Chrome, Firefox or Edge, which were silently dropped. They're now
  opened as they're picked, with libheif in WebAssembly in parallel workers (0.5 MB gzipped,
  loaded only when needed). A 12 MP HEIC takes about 2.5 seconds here, 1.5 of it the decoding
  itself; four take about 6. The photo shows in the tray at once and shimmers while it opens;
  Send waits. Safari opens HEIC itself. Same day, for best quality (rule in CLAUDE.md): photos are
  kept at 1920 on the short side (was 1600 on the long side, which stretched landscape photos in
  story ads 1.6 times), JPEG 0.92 (was 0.86), and Zillow photos at 1536 wide (was 1152).
* **Try an example removed (Ismael, 2026-10-29)** from the New listing screen.
* **Rentals built (Ismael said yes, 2026-10-29).** Each listing has a deal, sale or rent
  (`listings.deal`). The model decides it from what was sent; `parseDeal`/`parseRent` in
  `src/listing.js` are the backup (a sale's "HOA $250/mo" or "rental income" isn't rent). Rent shows
  per month everywhere, ads say "For rent", the buyer page offers Apply (Leads with wants "apply"),
  Rented replaces Sold, the Lead status Offer reads Application, rental fair housing terms (no
  Section 8, students only, mature tenants) are caught, and New listing asks "What are you
  listing?". Zillow's FOR_RENT pages and schema.org lease offers say "For rent". Before this the
  code dropped any price under $10,000, so "$2,400/mo" got no price.
* **Rentals checked live (2026-10-29):** "2 bed 2 bath condo ... 2400/mo, available Dec 1, pets ok,
  in unit laundry" (no dollar sign) became rent $2,400/mo; three renter ads (Midtown, pets, the
  laundry), each with $2,400/mo and Dec 1; "how much should I spend to rent this out fast?" got a
  straight budget answer. The first set took 104 seconds on the free model, too slow (Gemini billing
  still undecided). One test account ("Rental Check", rental-check-...@hopkins.test) was left on
  the live site by a run cut off by a redeploy; the second run deleted its own.
* **Chat as a normal assistant (Ismael, 2026-10-29):** the model's instructions now say it helps
  with anything, relaxed and professional, without steering back to the listing; on the New listing
  screen a question or request that mentions a home fact goes to the model first
  (`answerIfNotListing`), which says whether it's really a listing. On a blocked link only messages
  about the listing get the fixed "restricts access" reply.
* **Unread dot (2026-10-29):** the Today count badge is gone (sidebar and tab bar). `listings.seen_at`
  is set when a chat is opened (GET /api/listings/:id) or a reply lands while it's on screen
  (POST /api/listings/:id/seen); a Hopkins message after it makes the listing `unread`.
* **Threads (2026-10-29):** POST /api/listings/start makes the thread from the first message
  (photos uploaded first), POST /api/listings/:id/first answers it (`firstReply`: a property gets
  its ads, anything else a chat reply; the model names it, `titleAI`, into `listings.auto_title`).
  `PROPERTY()` in hopkins.js decides what counts as a listing. The old POST /api/listings still
  does it all in one call (the tests use it).
* **Threads checked live (2026-10-29):** the thread was there in about 2 seconds both times. "can
  you write a short text to a buyer who went quiet..." was named "Text to a quiet buyer" and
  answered in 11 seconds with two texts, not a listing. "2 bed 2 bath condo in Midtown Atlanta,
  2400/mo..." was named "2 bed condo in Midtown" and became a listing with 3 ads, but took 111
  seconds on the free model.
* **Chats (Ismael, 2026-10-29: "why not just call it Chat"):** Listings became Chats (tab, screen,
  Today's count, menus, toasts); the Chats screen lists every thread. A chat with no property yet
  turns into a listing when a later message has photos or a property's details (`handleMessage`
  reads it with `readAndMake`); a question that only mentions a price stays a chat. Report still
  lists only threads with a property (`PROPERTY()`).
* **The Render loading screen at 16:48 (2026-10-29):** not the pinger. /healthz now shows who last
  pinged it, per source: after 17 quiet minutes the same instance was still up and cron-job.org had
  pinged at 17:10. The app had been asleep only about 7 minutes after the last use, which the
  15 minute sleep can't explain; Render's docs say it "might restart a Free web service at any
  time". Only a paid instance for hopkins-app stops that (waiting on Ismael).
* **Claude/ChatGPT connector (MCP), recommendation 2026-10-29:** not now. Later, one direction only:
  Hopkins as an MCP server that Claude, ChatGPT and Gemini can use (Leads, Monday report, ad
  results first; making ads later, still approved in Hopkins). Their Claude can't power Hopkins.
  Revisit once ads go live through Meta and pilots use Hopkins weekly.
* **Meta readiness check (2026-10-29):** not ready for App Review. Hopkins has no Meta connection
  yet (no Facebook login, no ad account connect, no ads created through the Marketing API, no
  Leads pulled in), and App Review needs a working app plus a screen recording of each permission
  in use. Meta's developer docs: Business Verification is required for advanced access (needed to
  run ads on other people's accounts), but not while the only users are people with a role on the
  app (admins, developers, testers), so pilots can be added as testers before any verification.
  Meta dropped its separate Access Verification step for tech providers in October 2026; Business
  Verification and App Review stay. Whether a sole trader's registered business name is enough for
  verification isn't settled in what Meta publishes (outside guides disagree); a limited company
  is the safe bet. No business is registered yet (see "Business accounts" under Working with Ismael).
* **Meta built (2026-10-29), not yet tried with a real Meta app:** `app/src/meta.js` (login,
  encrypted long lived token, ad accounts and Pages, launch, spend and review status), routes in
  server.js (/api/meta, /api/meta/connect, /api/meta/callback, PATCH and DELETE /api/meta,
  /api/meta/deletion, /api/ads/:id/render), Settings has a Meta section, approving uploads each ad
  as a full size PNG (about 2.8 MB) before the plan is sent, and `syncMeta` runs every 30 minutes.
  Tested against a fake Graph API (test/meta.test.js) and once against Meta's real API with a made
  up token (it refused it, as it should). Next: Ismael creates the Meta app and sets
  META_APP_ID and META_APP_SECRET on Render (docs/META.md), then a first real test on his own ad
  account with a small budget. Not done yet: story size images (Meta adapts the feed image), the
  agent's Instagram account as the ad's identity (the Page shows instead), Lead ads.
* **Cost of opening Meta to everyone (checked 2026-10-29):** App Review and Business Verification
  cost nothing; the only cost is the registered business Meta verifies against. In Ireland a
  registered business name (sole trader, RBN1) is €20 online on CRO's CORE, up to four weeks to
  process; a limited company is about €50 online (Form A1, from a Xero guide, not CRO's own page).
  Whether Meta accepts a sole trader's business name isn't settled; a company is the safe bet.
  A family member's existing registered business can own the Meta app instead.
  Meta verifies businesses in any country, not only Ireland. A US LLC (Wyoming: about $100 to form,
  $60 a year, plus a registered agent, per formation services) suits US customers and Stripe US,
  but a foreign owned single member LLC must file IRS Form 5472 every year with a $25,000 penalty
  for missing it, and Ismael's tax stays wherever he lives. Recommendation given: register where he
  lives unless an accountant says otherwise.
* **Ireland it is (Ismael, 2026-10-29)** for registering the business Meta verifies. Open: whose name.
  One guide says a sole trader must be 18 or over (not confirmed on Revenue or CRO); if he's under
  18 it goes in a parent's name, as the "Business accounts" note says. Tax, as explained to him: a
  sole trader is taxed on profit whether or not the money is taken out; real business costs
  (AI, hosting, domain, Hopkins' own Meta ads) come off the profit first; spending only to avoid
  tax costs more than it saves. An accountant once revenue starts.
