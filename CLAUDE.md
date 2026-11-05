# Kirmi Studio

The clinic agency model is dropped for good. Do not suggest it, reference it, or use
it as a fit check for new ideas.

## Start here

Read `docs/STATE.md` at the start of every session: it has the current state, what's in flight,
and the small details from earlier sessions. Keep it up to date when anything in it changes.
Whenever something important or valuable comes up (a decision, a preference, a lesson, a plan,
a finding), save it straight away without asking: rules go in this file, creative learnings in the
playbook, state and plans in `docs/STATE.md`, then commit and push (Ismael, 2026-10-19).
Not every remark is a rule (Ismael, 2026-10-30): save what will matter again, not passing thoughts.

## Git

Push work to the session branch without asking (Ismael, 2026-10-18). A push redeploys the waitlist
on Render, which is fine. Only ask first when a change would alter the live site in a way he hasn't
already agreed to.

## Writing for Ismael

These are hard rules. They come from repeated correction, not preference.

**Never use dashes.** No em dashes, no en dashes, no dashes as punctuation of any
kind. Use a comma, a full stop, or restructure the sentence. This applies to every
message, every draft, every rewrite, without exception.

**Irish English, not American.** Enquiry not inquiry. Realise, organise, apologise.
Programme, centre, colour. "At the weekend", not "on the weekend".

**Sound like a person, not a salesperson.** Plain sentences. No LinkedIn register,
no "circling back", no "just floating this back up", no "hope this finds you well",
no "I wanted to reach out". Short is better than clever.

**Say what the reader gets, not what the product does.**

**Never claim anything untested or untrue.** No invented results, no user counts,
no capabilities that have not actually been run.

**Don't repeat what an earlier message in the thread already said.**

**One ask, and make it answerable.** A question the reader can answer in one line
beats a request for a 15 minute call.

## Brand principles

From reference carousels Ismael saved. They apply to our own brand and to every
creative the product makes for its customers, since we distribute their ads.

1. **Visual language.** Visuals aren't aesthetics. They are signals of intent,
   position and credibility.
2. **Brand value.** Brands don't earn trust by promising more. They earn it by
   delivering the same thing, every time.
3. **Brand psychology.** People don't buy products. They buy meaning, and defend
   their choice with logic later.
4. **Brand character.** There is no neutral brand. You shape your character, or the
   market does it for you.
5. **Brand story.** One campaign doesn't build a brand. Repeated narratives do.
6. **Market and positioning.** If your position isn't clear, you're replaceable.
   Clarity is the real competitive advantage.
7. **Brand system.** Without systems, brands rely on taste. Taste doesn't scale.
8. **Execution.** Strategy means nothing without reality. Brands are built in
   experience, not intention.
9. **Branding is alignment.** What you say, what you show, what you deliver and what
   people remember. When everything aligns, the brand becomes undeniable.

The six pillars every brand (ours and each customer's) needs defined:

1. **Visual identity.** Logos, colours, type and layouts that make the brand
   instantly recognisable.
2. **Brand promise.** The core commitment, delivered at every interaction.
3. **Consumer psychology.** The emotions, motivations and biases that make people
   choose one brand over another.
4. **Brand personality.** How the brand speaks, behaves and feels. Its human
   character.
5. **Narrative systems.** Connected stories and messages that repeat across channels
   over time.
6. **Market execution.** Consistent launches, campaigns and real world presence.

Reference style: black on warm off white, fine grain, a bold grotesk title over a
regular weight word, one simple symbol with thick rounded strokes, one short line of
copy. Second style: italic serif headings with soft highlighter marks on grid paper.

## Hopkins brand (locked)

The product (since the pivot, 2026-11-03): **a personal assistant for real estate agents that
runs their Instagram and Facebook content by itself, so they can stay out showing houses.**
Every week it studies their local market and what nearby agents post, plans and designs the week,
the agent approves once on Monday, and it posts each day. **Organic content only for now: ads come
later** (Ismael, 2026-11-04: both at once is too many offers and features). Never lead with, sell
or show ads, leads or Meta ad features until he says so.
**One goal (Ismael, 2026-11-04):** great platforms have one goal (Uber books a ride, Airbnb books a
stay, Duolingo teaches a language, Spotify plays music). Hopkins and every plan for it stay on one
goal; don't pile features on top or explain it in layers. Most agents post badly, rarely or never,
so nothing should rest on "what's working on their account".
Before the pivot: one chat that runs a real estate business's marketing like an agency would.
**Positioning (Ismael, 2026-10-31):** "The personal assistant for real estate agents" (he said
"Realtors Personal Assistant"; public copy says real estate agents because Realtor is NAR's
trademark). It works like Claude: open a new chat, ask for a carousel post or an animated reel
educating first time buyers, and get it.
**Positioning (Ismael, 2026-10-18):** Hopkins is a chat, like ChatGPT or Claude, for running real
estate marketing. Always lead with the chat. Never word it like a service that does the work for
them ("made for you", "done for you"), because that reads as a digital marketing agency.
Name **Hopkins**, after Claude Hopkins, who wrote *Scientific Advertising* in 1923 and
tested every ad against another. Instagram **@gethopkins**. Domain gethopkins.com is
not bought yet; the waitlist runs on waitlist.kirmistudio.com until sign ups prove it.

* **Mark, "Rise":** two hand drawn pebbles, deliberately lopsided, never perfect
  circles. Small pebble lower left (the ad that lost), larger pebble upper right (the
  winner); the size tells the story. The symbol stands on its own, then the name beside it.
  **Since 2026-10-31 (Ismael chose option 23):** both pebbles in the sunset gradient (top
  `#FFC3A0`, middle `#F0708A`, bottom `#B9408F`, lit softly from the top left), no more plum
  and gold. The app icon is the mark on black (`#26262B` to `#08080A`). Files in
  `design/brand/` (icon at 1024, Instagram picture at 1080, SVGs); the app uses
  `app/web/mark.svg` and the `hpk-sun` gradient. It matches the new look's warm pink and has
  no purple, which the platform doesn't use.
* **The mark is black and white now (Ismael, 2026-11-05):** no sunset pink anywhere (app, splash,
  favicon, intro, Terms and Privacy): black on light, white on dark. `app/web/mark.svg` switches with
  the system's dark mode.
* **The front door (Ismael, 2026-11-05):** signed out, `/` is the intro then one question per screen
  (`app/web/welcome.*`). The questions that shape someone's Hopkins (Instagram, brokerage, city, Real
  Estate, Personal Brand or Both, how often, what to post, music, appearance; the 5 photos and the
  agents they like were dropped on 2026-11-05) are asked once, after sign up or at the first sign in (`profiled` in the
  brand; app.js sends anyone without it to `/start`). Forgot password belongs only to sign in.
* **The cream look (Ismael, 2026-11-04, after Cosmos; replaces the black look and the reeded
  background):** a flat warm off white page (`#F6F3EE`) with no picture, pink glow or stripes behind
  it; solid white cards with a hairline; black text and black pill buttons; the sunset pink only in
  the mark. The Liquid Glass tab bar stays, recoloured cream. `design/new-look/cream.py` turned the
  black colours over (neutrals flip, anything with a hue stays); the pinned surfaces are at the end
  of `app/web/app.css`.
* **Colours (Ismael, 2026-10-31: black replaced the blue dusk the same evening, "matches the logo
  since it's on black"; oxblood, cream, gold, plum and navy are retired everywhere):** a graphite
  black (`#0B0B0D` to `#18181B`, never flat #000) seen through reeded glass with one warm house
  shape moving through it, made by `FIELD_SKY=black python3 design/new-look/field.py` (phone
  `26 3 1179 2556 0.66 0.7 0.86`, laptop `18 3 2400 1500 0.78 0.7 0.86`, saved as
  `app/web/field-phone.jpg` and `field-desk.jpg`). White text; secondary text white at 80 to 90%.
  Glass: a graphite tint with a light edge. The one action that matters is a white pill with dark
  text. Browser bar `#0B0B0D`.
  The warm accent is the sunset (`#FFC3A0`, `#F0708A`, `#B9408F`), used for the mark and small
  details, never as a big fill. Dots (unread, Report) are white (Ismael, 2026-10-31). Success `#62D69F`, danger `#FF9B91`.
* **Type:** Inter Tight. Big headings light (300) and tight, everything else regular or semibold.
  No serif in the product; Instrument Serif italic only as a rare accent in marketing.
* **Everywhere the same:** the app, the sign in page, Terms and Privacy, the icon and (once Ismael
  says go) the waitlist, posts and ads for @gethopkins all use the new look. Fine grain on top.
* **Tagline:** none for now (Ismael, 2026-10-18). Don't use "Tested, not guessed." as a slogan on
  end cards, ads or the page. **Promise:** "Real estate marketing, run for
  you. Nothing goes live without your approval." ("Your yes" reads oddly, Ismael 2026-10-29: never use it.)
* **Wording in public copy:** say "real estate" (agents, teams, brokerages), never
  "estate agent", because the US, Canada, Australia and the UAE all say real estate.
  Never use "Realtor" (a trademark for NAR members only). Messages to Ismael stay in
  Irish English.
* **"Built in Silicon Valley" is true** (Ismael, 2026-10-18). It stays in the footer and can be used in
  public copy. Never question it, call it false or remove it.
* **Voice: never "we", "us" or "our"** in anything public (page, posts, captions,
  stories, ads, emails). "We" makes Hopkins sound like an agency. Write as the product:
  "Hopkins makes the ads", "you approve", or "I" when Hopkins talks in the chat. Same in
  plans and drafts for Ismael: say what Hopkins does or what to post, not what "we" do.
* **Personality:** a quiet expert. Plain, precise, shows the numbers, never hype. In reels it talks
  like one person telling a friend or colleague what they think: everyday words, swearing is fine
  where natural (Ismael, 2026-10-19). Facts stay exact.
* **Recurring stories:** Wanamaker's half, tested not guessed, the empty Monday.

## Creative playbook

What content and ad creative actually works on Instagram for real estate lives in
`.claude/skills/hopkins-creative/SKILL.md`. Use it for every post, carousel, reel and ad,
for @gethopkins and for what the product makes for customers. When Ismael sends new
examples of what's winning, add the learning to its log with the date.

**Hook clips stay untouched (Ismael, 2026-10-29):** when Ismael sends a hook clip for a reel, it
plays exactly as sent: no text, no voice, no trim over it. The Hopkins part follows after the cut.
The jug reel built this way is the best so far (836 views, about 10 times the others).

**Instagram mockups (Ismael, 2026-10-25):** wherever an Instagram account, post, ad or story is
recreated (the app's ad previews, reels, posts, the landing page), put Instagram's blue verified
badge after the handle.

## Product decisions (Hopkins)

The product's code is in `app/` (its README says what works and how to run it).

* **THE PIVOT (Ismael, 2026-11-03, worked out on his other Claude account; it overrides anything
  below that leads with ads):** Hopkins is a personal assistant for real estate agents that runs
  their **Instagram and Facebook content**, so they can stay out showing houses. Organic content
  only; ads come later, not now (2026-11-04: offering both at once is too much). The loop:
  1. Setup asks the area (neighbourhood or whole city), the style (real estate only or personal
     brand), how often to post and music taste; Instagram must be a Business or Creator account.
  2. Every week, by itself: research (local news and trends, nearby agents' public post numbers
     through Instagram's official Business Discovery API, the agent's own past results), keep the
     formats that worked, plan the week (carousels, reels, captions, hashtags, story ideas).
  3. Monday notification: the week is ready; the agent edits in plain words and approves once.
  4. Hopkins posts each day at the planned time through Instagram's official publishing API, with
     its own scheduler (the API has none). Stories are planned only and posted by the agent by hand.
  5. Later, not now: ads (turn a post into an ad on their own Meta account, leads to the phone and
     Follow Up Boss). The ad code stays in the app, hidden from agents until then.
  6. Plain chat works like a team leader who answers honestly and never invents data.
  Rules from that session: **never AI generated images, anywhere in Hopkins**; never scraping
  (no Pinterest or Cosmos scraping, no unofficial tools like Phantombuster); photos come from the
  agent's own photo bank (uploads and their past Instagram posts) by default, and a Change photo
  button opens Pinterest, Cosmos or the camera roll so the agent saves and picks the image
  themselves; HEIC is converted to JPEG on upload; agents confirm they have the rights to images
  they add; music only from a licensed catalog (Epidemic Sound or Soundstripe, not chosen), built
  into the reel file; carousels all photos or all videos, 2 to 10 slides; Fair Housing guardrails
  on everything. Approving the week counts as asking, so daily posting isn't an unasked
  automation. Nothing of this is built yet except the chat, ads, leads and Today.
* **Direction (Ismael, 2026-10-31, after a long review he pasted; ads first, now superseded by the
  pivot above):** Hopkins stays a self-serve
  marketing agency for real estate that you run from one chat, but it stops waiting to be asked.
  It watches the agent's listings, ads and Leads, notices what needs doing, prepares it and asks
  for approval; the agent can still ask it anything. The loop to make excellent before anything
  else: listing, campaign, approval, launch, enquiry and follow up, results, the
  next recommendation. Rules for it: every recommendation comes from real data with a minimum of
  evidence (never "failing" after a few dollars), says exactly what approving does (which ads,
  how much money, how long), changes nothing without approval, and is said once. Never generic
  nudges ("post more this week", "review your audience"): every item names the evidence behind it,
  or it isn't shown. Advertising
  execution is the core; creative alone is easy to copy. Don't build a CRM, every integration or
  autonomous budget moves yet. Prove it with 5 to 10 real agents.
* **Interface (Ismael, 2026-10-22):** extremely clean and straightforward, like any successful
  software platform. Keep every feature, but hide the secondary ones: one main action per screen
  (a white pill), everything else in a "more" menu or the account menu, hairlines instead of boxes, two
  text weights, no extra explanations on screen. Check new screens against this before shipping.
* **The whole platform (Ismael, 2026-10-27):** extremely straightforward, less talkative, minimal
  and professional. On screens Hopkins is named in the third person ("Hopkins makes the ads"),
  never "I". In the chat Hopkins is relaxed and professional, like a smart colleague (Ismael,
  2026-10-29): friendly, natural, short for quick things and as long as a real request needs, no
  hype, no filler, no offers of more help. It's a normal assistant too, like ChatGPT or Claude:
  it helps with anything (an email to a client, a maths question, general advice) without steering
  back to the listing or the ads, and a question that mentions a price isn't turned into a listing.
* **Words on screen are short (Ismael, 2026-10-27):** serious software, not a novel. A label or
  hint is a few words ("Live preview. Tap to expand.", "Pro requested.", "Test sent"), no
  explaining how it works, no reassurance, no second sentence unless it's a warning. Check every
  new string against this before shipping. Ismael was angry again on 2026-10-30 ("0 of 3 free ads
  made", "Duo, $149 a month", a footer of billing terms under the plans): say only what ChatGPT or
  Claude would, "Free", "Duo", "Upgrade your plan", "Upgrade to run ads". No counts, terms
  or descriptions nobody asked for. Write as a 9 figure software company.
* **Standard software wording (Ismael, 2026-10-29):** errors, buttons and hints read the way
  ChatGPT, Claude or Gemini would put them, plain and not fancy: "Incorrect email or password",
  "Listing not found", "Something went wrong. Please try again.", "Select a listing first",
  "Create ads", "Approve and run", "requires an upgrade". Never casual ("No such listing", "Too many
  tries", "Sold, nice", "Drop it in here", "whenever you're ready").
* **Phones first (Ismael, 2026-10-24):** most use will be on a phone. Design and check every screen at
  iPhone size first (screenshots, not guesses), then laptop. House rules: a bottom tab bar (Today,
  Chats, a white + key for New chat in the middle with no label like TikTok's, Leads, Report;
  Ismael 2026-10-31), the main
  action fixed at the bottom within thumb reach, menus as bottom sheets that swipe away (down, or up
  for a sheet at the top, Ismael 2026-10-27), inputs at 16px (smaller makes
  iPhones zoom), room for the home bar, no suggested replies or reply chips: the empty box says "Ask Hopkins anything" until there's a conversation, then "Reply to Hopkins" (Ismael, 2026-10-27), only the thinking mark while
  Hopkins works, never a list of steps (Ismael, 2026-10-27), never a blank screen.
* **Serious software, not a game (Ismael, 2026-10-30, restyled 2026-10-31):** the app "felt like a
  mobile game". Look and move like Linear, Stripe, ChatGPT or Claude, in the new look: pill buttons
  (white for the main action, quiet solid pills for the rest) that give a little when pressed
  (never grow or bounce), frosted glass panels with a light edge and no drop shadow, lists as hairline rows, page
  titles 24px semibold (Today's greeting large and light), no progress bars, no celebrations (a
  plain notice instead), no springy or staggered entrances, notices as a small dark glass bar.
  What floats over content (tab bar, message box, sheets) is nearly solid glass, and the page fades
  out before it reaches the tab bar, so nothing scrolling underneath fights its labels.
* **Checking a fix (lesson, 2026-10-24):** test against a slowed down server (the live one on Render
  is slow), not just localhost, and look at every screenshot for the exact thing that was reported.
  Two "fixed" bugs reached Ismael because local checks were instant and a sheet off screen was missed.
  `npm test` also syntax checks `app/web/*.js`: a broken edit to app.js once gave a blank page
  that every server test passed (2026-10-31).
  `app/test/scenarios.test.js` runs real agent phrasings against every listing state with a
  model that answers wrong on purpose; when a new mistake reaches Ismael, add its phrasing there
  first (2026-10-31: it caught a question pausing ads, "make it $300" making a new plan, and
  "5 reel ideas" making a reel).
  The server reads `app/web` files once at start, so restart it after editing them or the test
  runs the old code (2026-10-25). Stop a local server by its PID, never `pkill -f`, which also
  kills the shell running the command.
* **Text is always readable (Ismael, 2026-10-31):** whatever sits behind it (the new reeded glass
  background, photos, glass), every piece of text passes WCAG AA: 4.5 to 1, or 3 to 1 for large
  text, measured against the lightest part of what's behind it, not judged by eye.
  `design/new-look/newlook.mjs` walks every screen on a phone and a laptop and `measure.py` checks
  each piece of text; run them after any visual change (0 failing on 2026-10-31).
* **Liquid Glass (Ismael, 2026-10-24):** Apple's iOS 26 style, on phones only, never laptop or desktop
  (same as Claude and ChatGPT). It has to match Apple's, not be a cheap copy. Since 2026-10-31
  (Ismael: "a white background made less bright is NOT Apple Liquid Glass") every glass panel on
  phones (tab bar and its drop, Ask box, panels, cards, sheets; since 2026-11-01 not the message
  box, buttons, notices or rows, see "Less glass") has all three: refraction (what's behind magnified in the middle and bent at the edges), a rim of
  light along the edge, and a glint that slides as the panel moves. Browsers can't bend what's
  behind an element on iPhone, so `app/web/lens.js` draws the background picture through a lens
  with WebGL for each panel; content scrolling under a floating bar isn't bent, only the
  background. Inputs can't hold the lens and keep the frosted look. Lesson (2026-10-31, Ismael's
  account sheet came up see-through on his iPhone): a panel keeps its own look until its glass is
  drawn, a panel that rebuilds its contents gets its glass back at once, and nothing redraws while
  the screen is still. Test sheets opening, not only still screens.

* **Chat menu (Ismael, 2026-11-01):** a chat's ••• menu (and holding its card) is Rename and Delete
  chat, nothing else; Pause ads or Resume ads appear there only while a chat has ads running. It's
  always "chat", never "listing": Hopkins is for any work, not only listings.
* **Phone header (Ismael, 2026-11-01):** solid `#0B0B0D`, never a blur. Tapping the logo turns
  the mark once on phones too (the new header carries the turn, `S.spinAt`).
* **Tab bar glass (Ismael, 2026-11-01):** glass and gliding stay, but no white reflection or lit
  side: an even hairline all round, so the left (Today, Chats) looks like the right, and a dark
  graphite tint (0.86 in `lens.js`) so the background's purple never shows through it.
* **Notifications in Settings (Ismael, 2026-11-01):** "Get notified every time a new lead comes in."
  and two buttons side by side, On and Off; the chosen one white, the other black with white text.
  No test button.
* **Demo account (Ismael, 2026-11-01):** in the account menu for admins ("Open demo account"), not
  on Admin. Its chats follow today's Hopkins, never an automatic set of 3 (Ismael, 2026-11-01,
  furious it still showed one): the property, read back with one question, the agent asking for a
  number of ads, then those ads. It opens straight to Today (setup done) and looks like a real
  agent's weeks: listings
  with ads in different looks, runs, leads over six weeks, a sold one, plus a carousel, a reel and
  an everyday email chat (`app/src/demo.js`). "Back to my account" returns to Today.
* **Leads and Top-Performing Ads (Ismael, 2026-11-01):** a lead row is the name, where it came from
  (the address and the ad) and how long ago, then Call, Text, Email and its status; no "wants a
  showing", "has a question" or other tags. Top-Performing Ads on Report is just the 3 best ads
  themselves, no ranks, names or counts, and on a phone it swipes from the first to the last and
  never past it.
* **Buttons react instantly (Ismael, 2026-11-01: "too slow", "the entire platform is going to fall
  in ruins"):** no double tap wait (`touch-action: manipulation`), presses show at once (iPhones
  need the page's touchstart listener for that) and ease back in .12s. The app can't be zoomed by
  the phone (`maximum-scale=1`), which had left the New chat line cut at the sides.
* **Report is about ads (Ismael, 2026-11-01):** the board is titled "Ads" and lists only chats that
  have had ads or leads; a carousel or an email chat never appears there.
* **Fast replies, and they always arrive (Ismael, 2026-11-01: plain chat "takes too long thinking";
  leaving mid reply showed a connection error):** plain talk asks Gemini to think lightly and asks
  Groq too after 4 seconds (making things keeps 12); a reply never waits over 2.5 seconds on Meta or
  Follow Up Boss data. If the phone drops the connection while Hopkins works, the app never shows
  an error: the server carries on, the thinking mark stays and the app checks every few seconds
  until the answer is there (`awaitAnswer`); reopening a chat mid reply shows the thinking mark
  again (`working` on the chat). Sending a first message and moving elsewhere never pulls the agent
  back to that chat; the answer waits with its white dot.
* **Black cards, glass only on the tab bar (Ismael, 2026-11-01, after comparing screenshots):** the
  reeded background stays; every card, panel, sheet, box and the Today box is solid near black
  (`--card`, `#141416`) with no rim or glint; only the tab bar (and its drop and + key) keeps Liquid
  Glass (`SELECTORS` in `app/web/lens.js`).
* **Sign in, sign up and forgot password are final (Ismael, 2026-11-01: "stay the exact same now i
  like how they look"):** don't change their look or wording unless he asks.
* **Less glass (Ismael, 2026-11-01: "too much glass", "AI vibecoded slop", not "a serious billion
  dollar software company"):** Solid instead: the chat's message box and the agent's own messages (near black
  `#0E0E10` with a hairline), notices (a solid black pill dropping from the top, one line, e.g.
  "Connected", "Turned on"), secondary buttons and Settings rows. Buttons people act on in setup
  and Settings are the white pill (Connect, Add, Change photo, Save, Change password, Sign out,
  Manage). Links are never underlined. Every button gives a little when pressed (scale .95,
  slightly dimmed, the + key .9) and comes back, never grows or bounces. Connecting anything shows
  only that notice, nothing else.
* **Settings (Ismael, 2026-11-01):** Meta shows only its two boxes (ad account, Page) and a white
  Disconnect under them, no "Connected as"; "Follow Up Boss" with an "API Key" box (no "optional"
  here) and a white Connect; Website is a box like every other field, the site in it with a white
  Remove on its right, which empties it back to "yourbrokerage.com" with Add (same in setup);
  Notifications with one title; Plan with Upgrade on its right (none on Max); Sign out white, Delete
  account a red button with dark text; Terms and Privacy policy as plain text further down.
* **Chat boxes like Claude's (Ismael, 2026-11-01):** the message box and the agent's own messages
  are a filled shade (`#1E1E21`) with no outline. Today's box never greys out the rest of Today
  while typing.
* **New chat (Ismael, 2026-11-01):** "What are you working on, Ismael?" with their first name, in
  the middle of the screen, in Today's greeting type (light, large), always one line and never
  clipped: `fitLine` measures the text's real width and scales it down to fit, never below 18px. New chats start from the + key on phones and
  Today's box on a laptop; no New chat card on Chats and no New chat in the sidebar. The avatar is
  the first letter of the first name on white until they add a photo.
* **Best quality, always (Ismael, 2026-10-29):** ads are always given in the best quality and
  resolution. Photos are kept at 1920 pixels on the short side (4096 at most on the long side, JPEG
  0.92), photos from a link are taken at the largest size the site gives, ads download as PNG at
  1080 by 1350 (feed) and 1080 by 1920 (story). Speed comes from doing the work in parallel and
  showing progress, never from lowering quality.
* **Unread replies (Ismael, 2026-10-29):** no numbered badge on Today. A chat with a Hopkins reply
  the agent hasn't seen (they left before it came) gets a small gold dot where its ••• sits, like
  Claude's, also on its card on the Listings screen. Hovering shows the ••• again; opening the chat
  clears the dot at once. Other rows stay as they are. Listing cards carry no tags (no "Ads ready",
  "Approved" or "Sold", Ismael 2026-10-29): just the Hopkins cover, the name and the dot. Every
  card and small square shows the Hopkins cover, never the property photo (Ismael, 2026-10-29).
  Today (Ismael, 2026-11-01): the greeting, the box, Needs attention when there is any, then
  "Recent" (white, semibold, not grey) and the 5 chats used most recently, or all of them when
  there are fewer. No numbers strip. The greeting says Good morning from 5:00 to 11:59, Good
  afternoon from 12:00 to 18:59 and Good evening from 19:00 to 4:59, and changes by itself when
  the app is opened again.
* **Small details, done properly (Ismael, 2026-10-31: "an intentional work of art touch by a
  serious software company", "without doing too much"):** the box on Today is a real box: tap in
  and the box wakes, the rest of Today stays as it is (no greying, 2026-11-01), the box grows with the text, Send lights up only when there's something to send, and
  sending opens the new chat with the words rising from the box into the first message. Look for
  touches like this across the platform: quiet, purposeful, never a celebration or a bounce.
* **No Brand page (Ismael, 2026-10-31):** removed completely. Sign up is name, email and
  password; the brokerage name is in Settings, Profile; anything else (phone, licence, Instagram)
  is said in the chat. Settings has one CRM row that opens the CRM page.
* **Setup is mandatory, once (Ismael, 2026-10-31):** straight after sign up, a page with no tabs:
  "Connect Hopkins", 1 Meta, 2 Website, 3 Follow Up Boss, 4 Notifications (phones only), Continue. Nothing else opens until it's done (`onboarded` in the
  brand). Meta must be connected; the only ways past it are Meta's login failing for them (before
  App Review only Meta testers can connect), shown as "Continue without Meta", or Meta not being set
  up on the server yet. Step 3 is titled "Follow Up Boss" and is optional since 2026-11-01: one box
  labelled "API Key *(optional)*" (in italics, in brackets) and a white Connect, no webhook or
  Zapier fields on screen. Step 2, Website (Ismael, 2026-11-01), is required: they paste their brokerage's site (placeholder
  "yourbrokerage.com") so Hopkins knows the brokerage and the site. Hopkins reads it end to end,
  never a glance: up to 15 pages, robots.txt respected, as HopkinsBot (`crawlSite` in
  `app/src/site.js`), measured UX checks that stand without a model (`siteChecks`), then a profile
  and a UX review by the model (`siteAnalysisAI`), in the background; it fills the brokerage name if
  empty and reaches the chat (`siteLine`). It's only so Hopkins knows them: nothing of the review
  is ever shown on screen (Ismael, 2026-11-01: "no one ever asked for" it). On screen it's one
  line, the site with "Connected" under it and Change beside it. Step 4 is
  Notifications (Ismael, 2026-11-01: "just an accept notifications button", on the same page as
  Meta): a "Turn on" button and the phone's own Allow. Web push from Hopkins itself (`app/src/push.js`,
  `app/web/sw.js`, keys made once and stored sealed, free, nothing on Render): a new lead, Needs
  attention and Meta disconnecting reach every device, tapping one opens the right screen. iPhones
  only allow it once Hopkins is on the Home Screen (Apple's rule), so on an iPhone step 4 shows the
  two taps instead and doesn't hold up Continue; nor do a blocked or unsupported browser. Android
  gets Turn on. Step 4 is shown on phones only: a laptop's browser allows notifications without
  any of that, so laptops turn them on in Settings (Ismael, 2026-11-01). The notifications text
  always says what they get: "Get notified every time a new lead comes in." One title only. Settings and
  Today offer the same button wherever it's still off. The ntfy app setup is gone from Settings.
* **Makes what's asked, nothing else (Ismael, 2026-10-31):** no automatic set of 3 ads. A property
  on its own (facts, a link, photos) is read back in one line and Hopkins asks what to make for
  it; ads come when asked ("make ads", "run it"). Posts, carousels, stories and animated reels are
  made in the chat (`makeCreation` in `app/src/hopkins.js`, drawn by `app/web/studio.js`),
  download as PNGs or a video, and "make the headings shorter" changes the one just made. The
  API's own `POST /api/listings` still makes ads, because calling it is asking for them.
* **Posts and carousels look designed, not generated (Ismael, 2026-10-31: "genuinely horrible",
  "Claude would make it 10x better"):** the model picks a layout per slide (cover with an audience
  line, numbered step, checklist, one true stat, statement, a closing slide with one symbol) and a
  real look (ivory and noir for quiet luxury in Instrument Serif with one italic word; modern, bold,
  night and photo in Inter Tight with one italic serif word), with a footer strip and progress dots.
  The copy is specific and usable ("pull your free credit reports before you talk to a lender"),
  never vague. The looks are only starting points (Ismael, 2026-10-31): like asking Claude, the
  agent can direct everything on demand, wording, order, slide count, layouts, exact colours, any
  Google Font by name, weight, capitals, alignment, a background per slide, the name at the top
  and the footer line; a change changes exactly that and keeps the rest. No caption or hashtags
  unless asked: a new one ends with "Want a caption and hashtags
  for it?", and a yes or a request in words writes them.
* **Rentals too (Ismael, 2026-10-29):** Hopkins is for homes for sale and homes for rent, same
  purpose. A rental shows its rent per month ("$2,400/mo"), its ads are written for renters ("For
  rent", book a showing or apply), its page offers Apply, and it's rented, not sold.
* **Common sense first (lesson, 2026-10-29):** Ismael was furious that Hopkins acted "like a
  military robot": the code dropped any price under $10,000, so "$2,400/mo" got no price at all.
  The model judges what things mean, the way an experienced marketer would ("$2,400/mo" is rent,
  "3/2" is 3 bed 2 bath); code rules are only the backup for when there's no model, and never
  override an obvious reading. Before adding a rule, ask what a person would understand.
* **Organic posts too (Ismael, 2026-10-31):** Hopkins isn't only listing ads. Agents don't have 30
  listings a month, so Hopkins also makes their everyday posts: their story, their city, their
  life, market updates, carousels, captions (what @gethopkins' own reel tells agents to post). It
  replaces 2026-10-30's "ads only for now". Posting them for the agent needs Instagram's publishing
  permission and its own App Review later; until then they download and post. Since 2026-10-31
  they're made in the chat (see "Makes what's asked").
* **Fair housing warns, never blocks (Ismael, 2026-10-31):** the US Fair Housing Act covers any
  housing statement or ad, paid or organic, so wording like "perfect for couples" gets one plain
  warning and a safer alternative, and the agent decides. Not legal advice.
* **Every set looks different (lesson, 2026-11-01):** Ismael saw "a fucking navy background with
  white copywrited text" again. The model's look for each ad had been wiped when the set was saved
  (`style: {}` in `makeAds`) since the design change of 2026-10-31, so every set was the default
  navy. Now the model's look is kept, and an ad without one gets a starting look (`freshLooks` in
  `app/src/style.js`) not on its siblings or the agent's recent ads. A test checks a set has three
  different looks. Check the saved result, not just what the model returned.
* **Never the same template twice, for anything visual (Ismael, 2026-10-31):** ads, posts,
  carousels, stories, reels and anything else Hopkins makes that's seen. What the agent says it
  should be like, feel like or look like always comes first, before Hopkins' own taste; then they
  change whatever they want.
  Details: the old Hopkins gave every listing the same
  ad copy in the same template, "horrid and poor work". Every new ad, post, carousel, story or reel
  is designed fresh for what was asked and who it's for: each new ad gets its own look (colours,
  font, layout) for its property and idea, different from the others in the set and from the
  agent's recent ads; each creation picks its look for the topic and avoids the agent's recent
  ones unless asked to match. From there the agent changes whatever they want.
* **Opening moment (Ismael, 2026-10-31; redone the same day: "why is it so thin", "remove the glow,
  this isn't a video game", "basic and boring"):** two pebbles arrive the same size, side by side
  like two ads in a test, one shrinks and sinks, the other grows and rises into the mark, "Hopkins"
  rises in bold (700, never thin, wherever the name appears) from under a line, then the lockup
  glides into the header's logo while the ground dissolves. No glow, no sheen on the pebbles, no
  bounce; about two seconds; a tap skips. Shown only when
  Hopkins is opened fresh in a tab after sign in, never on the sign in page, never on returning to
  an open tab or a reload (`app/web/splash.js`, per tab with sessionStorage).
* **One ad at a time (Ismael, 2026-11-01, said four times, furious: "I TOLD YOU 3 TIMES NOW"):**
  Hopkins makes one ad per request, whatever number is named, then the agent changes it however
  they want; another comes only when they ask for another, again one. Never a set, never "3 ads",
  never offering several. The ad sits in the chat like a post, big, with Run ad (until it runs)
  and Download under it. There is no Chat and Ads switch and no separate ad screen or Style sheet:
  everything is said in the chat. Each ad is its own idea for that home, named after it.
  (`ADS_PER_ASK` in `app/src/hopkins.js`; older tests set 3 to check editing several.)
* **Leads stay out of chats (Ismael, 2026-11-01: "it spams too much"):** a new lead is never posted
  in the chat and never puts a dot on it; the phone notification, Today and Leads are enough.
* **Top-Performing Ads (Ismael, 2026-11-01):** Report draws the 3 best ads as the real ads at full
  size, the same renderer as the chat, never a small photo.
* **Free plan (Ismael, 2026-11-01, replacing 3 ads):** unlimited chat (tips, advice, general
  chatting), and 1 piece of content in all, whatever it is (an ad, a post, a carousel, a story or a
  reel), the real thing with no watermark, downloadable, changes to it included. After that nothing
  new without a plan, and deleting never gives it back. Running any ad needs a plan. Asking for ads
  on Free makes one ad. `FREE_AD_LIMIT` in `app/src/plans.js` (tests set `FREE_LIMIT=3` for room).
* **Pilot users (Ismael, 2026-10-26):** on the paid plan by default. Everyone who signs up with an
  invite code starts on paid (`PILOT_PLAN=free` changes that once sign ups open).
* **Chats (Ismael, 2026-10-29):** everything is a chat, like ChatGPT and Claude: "New chat", the
  Chats tab and screen (a "Search chats" bar where the count was, Liquid Glass on phones, plain on
  a laptop; it matches only the name on each card, nothing hidden), "Delete chat", "Rename chat". The first message makes the chat
  at once: it's in the sidebar and opens with the thinking mark before Hopkins answers, named from
  that message in a few words by the model (the first words stand in until then; a property's
  address wins). A chat with a property in it (facts, a link, photos) gets its ads, whether that
  comes in the first message or later; photos sent on their own in a chat are a message too.
* **Answers always come (Ismael, 2026-10-29):** Hopkins answers every message even if the agent
  leaves, closes the page or loses the connection: the server finishes the work on its own (a new
  chat's first answer starts on the server the moment the chat is made), the browser finishes
  sending the message if the page closes (keepalive), and the answer waits with its gold dot.
  Free Gemini sometimes hangs for minutes (a simple question took ten, 2026-10-30): after 12
  seconds Groq is asked too and the first answer wins (`hedged` in `app/src/brain.js`).
* **Meta (2026-10-29):** one connection for Facebook and Instagram, from the agent's own ad account
  under their own Page (Settings, Connect Meta). Approving a plan sends the ads: one Housing
  campaign, one ad set per ad with an equal share of the budget, a 15 mile radius, no age, gender
  or ZIP targeting, each ad linking to the property's page with its own ad. The chat hears once when
  ads go live or are rejected, and spend comes back every 30 minutes. If Meta drops the login in the
  background, the chat and the phone hear once straight away (2026-10-31). Setup steps: `docs/META.md`.
* **Stopping running ads (lesson, 2026-10-31):** Ismael typed "Stop the ad" and got a new run plan,
  "No stop them!" deleted all three ads, and "stop this active ad" got "paused" while nothing had
  changed. He was furious: Hopkins has to be ready for every situation an agent can be in. Now:
  pause and resume are real actions (chat, and Pause ads / Resume ads in the listing's ••• menu);
  pausing reaches Meta's campaign before Hopkins says so, and if Meta refuses, the reply says
  nothing changed. Stop words never make a plan or delete ads; ads are only deleted when the agent
  says remove or delete, and a running ad can't be deleted until it's paused; a reply that claims
  a pause, restart or deletion that didn't happen is replaced with the truth. Sold or rented,
  deleting a listing and deleting the account all stop the ads on Meta first (deleting is refused
  if Meta won't pause). Before shipping anything that changes ads or money, list every way an agent
  could phrase it and every state the listing could be in, and test them.
* **Chat edits do what was asked, to the right ad (lesson, 2026-10-31):** "under the 10k put perfect
  for couples" said about Ad 1 replaced Ad 2's line, then Hopkins changed Ad 2's font unasked and
  said "I've left Ad 2 as it was"; "change my name/brokerage" got "I can't". Now: a change that
  names no ad applies only to the ad being worked on (all, both or them means every ad); a line
  "under" another goes in the second line (`subline`, same font and colours); "undo" or "put it
  back" really restores the ads and says what came back; name, brokerage, phone, licence and
  Instagram change from the chat; wording the agent asks for is kept, with one fair housing note.
* **CRM (Ismael, 2026-10-31):** every new Lead goes straight into the agent's CRM as it comes in:
  Follow Up Boss with their own API key (no app review, checked with Follow Up Boss, kept
  encrypted). Optional, and since 2026-11-01 the webhook (Zapier, Make) has no fields on screen
  (the backend keeps it; an old one shows so it can be removed). Set up in the first steps or Settings, never
  by pasting a key in the chat. A failed send never loses the Lead; Settings says it didn't arrive.
  kvCORE, Lofty and BoomTown need partnerships, so they go through the webhook for now.
  **Every connector gives Hopkins the most data it safely can (Ismael, 2026-10-31), read only:**
  Follow Up Boss gives contacts, enquiries and the properties asked about, deals by stage,
  appointments, tasks, calls and the team (`fubOverview`); Meta gives the account, every
  campaign's status and budget, 30 days by campaign and by ad, Facebook against Instagram, this
  week against last, and Instagram followers and posts once App Review allows (`accountOverview`,
  `docs/META.md`). Each part stands alone, kept ten minutes, a source that doesn't answer says so.
  Any future connector follows the same rule. A webhook CRM can't be read.
* **Listing links:** Hopkins reads every listing page that lets it in (Zillow, MLS share pages
  from Flexmls, Matrix and Paragon, agent sites): up to 25 photos at the largest size, the remarks
  and the facts. Pages drawn in the browser (OneHome) get Google's read too. Sites that block apps
  (Redfin, Realtor.com, Homes.com, idealista) are left alone: never a browser disguise or any way
  round their bot checks.
* **Changing running ads (2026-10-31):** "spend $500 instead", "double it", "run it another week"
  change the ads already out, never a new plan: Meta first, all or nothing, and "longer" keeps the
  same spend a day. Coming soon, under contract and back on the market are moments with their own
  ads.
* **Needs attention (2026-10-31):** Today shows what Hopkins noticed, from its own records
  (`app/src/attention.js`, checked on every Today load and every 30 minutes, each new item sent
  to the phone once): ads made and nothing run for 2 days, a Lead still New after 24 hours, a run
  with $50 and a quarter of its budget spent and no Leads after 3 days, one ad with 3 Leads while
  another has none after 4 days and $20, a run with Leads ending within 2 days. Each has one button
  that does exactly what its label says ("Pause Ad 2, move $26 to Ad 1", "Run another week
  (+$140)") and Dismiss, which is final. Money moves go to Meta first, all or nothing.
* **No automations yet (Ismael, 2026-11-01):** Instant Lead Reply was removed from the whole
  platform: "we aren't an automation platform. Yet. Should start straightforward and minimally
  valuable." Don't add automations that act on the agent's behalf without being asked.
* **Setup from the agent's website (2026-10-31):** `POST /api/brand/from-link` reads the business
  name, logo, colours, phone, email, Instagram and city from the agent's site. Its screen went with
  the Brand page the same day; the route stays for the chat to use.
* **Report rows (Ismael, 2026-10-29):** a listing with ads running keeps its colour on Report even
  with no Leads yet; only one with nothing running and no Leads is greyed.
* **Stop (Ismael, 2026-10-28):** while Hopkins works, Send turns into Stop (a square with soft
  corners), like ChatGPT and Claude. The agent's message stays with Copy and Edit, the reply
  never comes, anything it changed goes back, and the model never sees a stopped request. Stopping a thread's first answer keeps the thread and the
  message, and counts no ads.
* **Editing messages (Ismael, 2026-10-26, 2026-10-27):** copy on every message, edit on every message
  the agent sent, both always visible (never hidden until tapped, never expiring), and any part of
  a message can be selected and copied. An edit makes Hopkins forget the old wording and put the
  ads back as they were, like ChatGPT and Claude. Only messages an edit can't go back to (before an
  approved run, or the chat before the listing existed) have no Edit.
* **Numbers must read true at a glance (lesson, 2026-10-28):** "7 Leads, up 600% vs last week" sat
  next to a last week of 9 because the percentage quietly compared against the same days of last
  week. A week still going never gets a percentage; it shows last week's total beside it. Finished
  weeks say "vs the week before". Before shipping any number, check it against the numbers next to
  it on the same screen and in the views either side.
* **Replies must match what happened (lesson, 2026-10-27):** Hopkins said "grey background applied
  to Ad 1 and Ad 3" when nothing changed, then apologised for a change it had made. Every look
  reply is now checked against the ads after the change; when they disagree, the reply comes from
  the ads, not the model. Keep it that way for anything new Hopkins can change. Since the same
  day every reply about a change is written from the before and after of the ads, never by the model.
* **Results come from real numbers (lesson, 2026-10-28):** asked "which ad is doing best?", Hopkins
  said "most engagement" with no data behind it. The chat model now gets each ad's Leads and
  answers with them; it never mentions engagement, clicks or reach, which Hopkins doesn't track.
  A plain look change ("make ad 2 navy") never rewrites the words.
  Every chat (New listing included) also gets the account's numbers: last week, this week so far,
  each listing, the top ads. Asked "how did I do last week?" it had answered "I can't see any past
  report" (2026-10-28). Never a cost per Lead for a week: spend is a running total per listing, so
  it read $255.56 a Lead when the listings ran at $31 to $90.
* **Links a site blocks (lesson, 2026-10-28):** idealista blocks apps from reading its pages on
  purpose. Hopkins named no site, then told Ismael "I don't have browsing ability" right after a
  Zillow link had worked. Now it always says, professionally: "The link you sent restricts access,
  so I can't see your listing. Please send the property photos and the details: the address,
  price, beds, baths and what stands out." Both photos and details, nothing else (Ismael,
  2026-10-28), and every question on that listing gets that until they arrive.
  Never work around a site's bot protection. Prices keep the currency they were typed in (€, £,
  AED); "€1,250,000" once showed as $1,250,000.
* **Says exactly what it can do (lesson, 2026-10-31):** asked how it compares with an agency,
  Hopkins said it "generates the images" and is "the exact same engine without the retainer".
  The chat model now has a plain list of
  what Hopkins really does with Meta, the CRM and creative (`SYSTEM` in `app/src/brain.js`): it
  designs around the agent's own photos, reads Follow Up Boss and the Meta account but changes
  nothing there, and an agency does more. Update that
  list whenever a capability changes. Never hand the model lists of banned phrases Ismael didn't
  give: it judges what's suitable to say (Ismael, 2026-10-31).
* **Greetings like Claude's (lesson, 2026-10-31: "Morning, Ismael" at 22:48):** the chat model was
  never told the agent's time, so it guessed. Every chat now gets their local time from their own
  timezone (`localNow`); a greeting only opens a chat, never mid thread; a time of day only when it
  matches their clock, otherwise a plain Hi, Hey or Hello. `rightGreeting` in `say` corrects a
  wrong one and removes any mid thread.
* **Seamless, never loading screens (Ismael, 2026-10-31):** every tab opens at once from what the
  app already has and takes the fresh copy quietly; each tab's data is fetched as soon as the app
  opens; the grey placeholder appears only when the network is slow for over 450ms. Tapping the
  logo goes to Today and the mark turns once like the thinking mark.
* **Legal pages are plain (Ismael, 2026-10-31):** Terms and Privacy sit on plain black with no
  background art, card kept. Sign up requires a name ("Sam Smith" as the example), on the page
  and on the server.
* **Hopkins speaks as itself (Ismael, 2026-10-27):** never "the platform doesn't let me" or "the
  system only allows". Claude never says "Anthropic doesn't let me". Hopkins says "I can't" or "I
  can only", and when something needs a step from the agent, it says the step.
* **Property, not home (Ismael, 2026-10-29):** wherever the app or Hopkins' chat talks about the
  place itself it's "property" ("describe the property"), singular for one. Only ad copy, written
  for buyers and renters, may say "home". The threads themselves are chats.
* **"lead" is an ordinary word (Ismael, 2026-10-31, replacing the capital L rule of 2026-10-27):**
  lowercase in the middle of a sentence ("3 new leads", "cost per lead", "no leads yet"), capital
  only where any word would be: starting a sentence, a title or a label ("Leads this week"), or
  the Leads tab by name. Two exceptions he asked for: the big number on Report reads "12 Leads",
  and the empty Leads page says "No Leads Yet". `capLeads` in `app/src/hopkins.js` lowercases it in everything Hopkins
  says, chat titles and Needs attention.
* **Names start with capitals (Ismael, 2026-10-28):** every part of a person's name (first, middle,
  last, each side of a hyphen or apostrophe) starts with a capital, however it was typed: Leads,
  the account name and the agent name on the brand. Only first letters change, so "McDonald"
  stays as typed. `app/src/names.js`; names saved before are fixed when the server starts.
* **Plans (Ismael, 2026-11-01, replacing the agent priced list):** Hopkins starts niched on single
  agents, not whole teams or brokerages: Free, Solo $99/mo, Pro $149/mo, Max $199/mo, one agent
  each; a team gets a plan per agent for now. What separates Solo, Pro and Max isn't decided yet.
  Plans show by name alone ("Pro", "Free"). Prices only in the plan picker ("$149/mo"); "Billed
  monthly. Cancel anytime." only under the plan in Settings and in the account sheet. Self-serve:
  Upgrade goes straight to Stripe Checkout (prices built from `PLANS` in `app/src/plans.js`, no
  Stripe products needed) and the plan starts when it's paid. Moving to another plan ends the old
  subscription at once with the unused part credited, never two at once. Settings, Manage opens
  Stripe's portal to cancel. Admin can still switch a plan by hand. Setup: `docs/STRIPE.md`. The
  account corner and menu show the person's own name, not the brokerage.
* **Paid (Ismael, 2026-10-27):** a normal monthly subscription, billed every month from the day they
  sign up. Never say billing waits for the first ad to go live. In copy it's "billed monthly", never
  "paid monthly" (Ismael, 2026-10-27). Month to month, cancel anytime ("anytime", never "any
  time", Ismael 2026-10-27),
  a flat price with no cut of ad spend, never priced by ad spend.
* **Early access:** teams and brokerages first.
* **Waitlist offer:** 30% off the first year.
* **Autopilot:** optional. The owner sets a monthly budget and goal once, Hopkins makes,
  tests and runs ads within it, reports every Monday, and can be paused anytime. The
  default stays approving every ad.
* **Agency offer:** don't ask teams to fire their agency. Run Hopkins next to it on one
  listing for a month, compare cost per lead, keep whichever wins.
