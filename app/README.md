# Hopkins, the product

The chat itself: an agent sends a listing, Hopkins looks at it like an agency would and makes
ads around what's actually special about that home, the agent changes them in the chat and
says yes. Separate from `survey/` (the waitlist server) and `platform/`
(the old booking system).

## What works today

* **Accounts.** Invite only sign up (`INVITE_CODES`; a link like `/signup?invite=CODE` fills the
  code in), email and password, one workspace per business. Forgot password: with Resend set up the
  reset link is emailed straight away; without it, the founder is told on his phone and makes the
  link in Admin to send by hand. A new password signs out every other device.
* **Feedback and errors.** Send feedback from the account menu; it shows in Admin and reaches the
  founder's phone (`NTFY_TOPIC`), as does any server error. Privacy page at `/privacy`.
* **Brand.** Business name, colors, logo, type, voice. Every ad follows it. Set on first sign in.
* **A listing in.** Photos (resized in the browser) plus the link or the description. Hopkins
  reads the price, beds, baths, size, address, area and features. Links: it reads what the
  page says about itself; most portals block that, and then it asks for the details.
* **Ads out, each its own idea.** Hopkins works out what's different about this home and who'd
  buy it, then picks ideas that fit (3 by default, or as many as the agent asks for, up to 5).
  Each ad is named after its idea ("Wraparound porch", "Under $650K"), and the agent can add
  one, drop one, or turn one into a different idea in the chat. Every line is checked against
  the facts, the agent's words and what the photos show (`src/facts.js`): a detail from nowhere
  ("granite counters", a number nobody gave) gets one rewrite, then the sentence goes. Feed
  (4:5) and story (9:16) previews drawn in the agent's brand, exactly as they'd run.
* **Hopkins sees the photos.** Claude sees them directly. On Groq, its free vision model
  (`qwen/qwen3.8-27b`, 3 photos per request) notes the room and what's plainly visible in the
  first 3, so the ads can lead with what's really there.
* **Changes in the chat.** Shorter, longer, warmer, more premium, plainer, another angle, a new
  headline or line on the image, another photo, new facts ("it has a pool"), a new price, an
  open house, sold, run it. With a model key set, the chat is a real conversation: it gets the
  whole thread plus the listing, the ads, the plan and the version on screen, answers questions,
  switches ad when one is named, and acts when asked. `ANTHROPIC_API_KEY` uses Claude for
  everything; without it, `GROQ_API_KEY` uses Groq's free models: `openai/gpt-oss-120b` first,
  then `openai/gpt-oss-20b` and `qwen/qwen3.8-27b` when one is over its limit. Each free model
  allows about 8,000 tokens a minute and 200,000 a day (checked 2026-10-25); a new listing uses
  roughly 5,000 to 8,000 text tokens plus about 5,500 for the photos, a chat turn 2,000 to 3,000.
  The server logs the tokens of every call. Any failure falls back to the built-in reader,
  writer and rules, which cover the common requests but are not a conversation.
* **Hopkins messages first.** A new price or open house brings 3 new ads on its own. The Today
  page lists what's waiting on the agent; on Mondays the report is waiting as a message.
* **Fair housing.** Every line (Hopkins' and the agent's) is checked; problem wording is
  rewritten before it reaches an ad, and the agent's own description gets flagged. Run plans
  use Meta's Housing category: no age, gender or ZIP targeting, 15 mile minimum radius.
* **Free plan** (CLAUDE.md): 3 ads in all, no watermark, downloadable. Changes to them are
  included; any new ad after that (a new set too, and deleting never gives any back) or "Run it"
  brings up the upgrade message. Price changes still update the 3 free ads.
* **Paid plan.** Switched on by an admin (`ADMIN_EMAILS`) on the Admin page. Run it shows the
  plan first (budget, days, where, Housing category), then the yes. Until Meta is connected,
  paid accounts download the feed and story images and copy the text to post or boost it
  themselves; each version's link still credits the leads.
* **Lead pages.** Every listing gets a public page in the agent's brand (`/l/<slug>`), with the
  photos and a showing request form. Each ad version has its own link (`?v=<ad id>`), so every
  lead is credited to the version that brought it. Equal Housing Opportunity in the footer.
* **Leads.** New leads appear in the listing's chat, on the Leads page, and on the agent's phone
  through the free ntfy app if they set a topic on the Brand page.
* **Monday report.** Leads, cost per lead (spend typed in until Meta is connected), showings
  asked, by listing and by version, and what to do next.
* **The testing record.** Every approved ad version is stored with the listing type, city, price
  band, idea, audience, spend and leads. This is the moat: over time it shows which kind of ad
  wins for which kind of listing, where.

## Not built yet (needs Meta)

Approved ads wait with the status "waiting on Meta". Nothing pretends to be live. Next: the
Meta app (Marketing API, Housing category, lead ads), App Review, and pulling real spend and
leads in. Billing (Stripe) comes when the first ad can actually go live.

## Run it

```bash
cd app
npm install
COOKIE_SECRET=any-long-random-string ADMIN_EMAILS=you@example.com npm run dev   # http://localhost:3200
npm test
```

With no `INVITE_CODES` set, anyone can sign up (fine locally, never in production).

## Environment

| Variable | What it does |
| --- | --- |
| `COOKIE_SECRET` | Signs sessions. Required. Long and random. |
| `INVITE_CODES` | Comma separated codes a sign up needs. Set it in production. |
| `ADMIN_EMAILS` | Accounts that see the Admin page (switch workspaces to paid). In production an email on this list can't sign up or be moved onto, so admin only applies to accounts that already exist: the person signs up first, then their email goes on the list. |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | Turso database. Defaults to `./data/hopkins.db`. |
| `ANTHROPIC_API_KEY` | Turns on Claude for reading listings, writing ads and the chat. |
| `GROQ_API_KEY` | Free alternative for the chat when there's no Anthropic key (console.groq.com). |
| `HOPKINS_MODEL`, `GROQ_MODEL` | Override the models (defaults `claude-opus-5-5`, `openai/gpt-oss-120b`). |
| `GROQ_BACKUP_MODELS`, `GROQ_VISION_MODEL` | Groq models to try when the main one is over its limit (default `openai/gpt-oss-20b,qwen/qwen3.8-27b`), and the one that sees photos (default `qwen/qwen3.8-27b`). |
| `PILOT_PLAN` | Optional. Everyone who signs up with an invite code is a pilot and starts on the paid plan. Set to `free` to put new sign ups on the free plan instead. |
| `APP_URL` | Optional. The address used in reset links and lead page previews, like `https://hopkins-app.onrender.com`. Render sets `RENDER_EXTERNAL_URL` itself, which is used when this is empty. |
| `RESEND_API_KEY`, `MAIL_FROM` | Email through Resend (free: 3,000 a month, 100 a day). With both set, Forgot password emails the reset link straight away. `MAIL_FROM` is a sender on a domain verified in Resend, like `Hopkins <hello@kirmistudio.com>`. Without them, the founder makes the link in Admin. |
| `NTFY_TOPIC` | The founder's phone alerts: new accounts, upgrade requests, approvals. |
| `PORT` | Defaults to 3200. |

## Deploy (Render)

`render.yaml` at the repo root is a Render Blueprint for this app (the waitlist service is
separate and untouched).

1. Turso: create a new database (not the waitlist's), copy its `libsql://` URL and make a token.
2. Render: New, Blueprint, pick this repository and the branch this code is on. Render reads
   `render.yaml` and creates `hopkins-app` (root `app`, `npm install`, `npm start`, free plan).
3. Fill in the three things it asks for: `ADMIN_EMAILS` (your email), and `DATABASE_URL` and
   `DATABASE_AUTH_TOKEN` from Turso. `COOKIE_SECRET` is generated. Later, in the service's
   Environment tab: `INVITE_CODES` (codes you make up, comma separated, so others can sign up),
   `NTFY_TOPIC` (same as the waitlist's), `ANTHROPIC_API_KEY` or the free `GROQ_API_KEY` (the
   chat is only a real conversation with one of them).
4. Open `https://hopkins-app.onrender.com/signup` (or whatever address Render gives it) and sign
   up with your admin email; admins don't need a code. Others sign up with
   `/signup?invite=YOURCODE`.
5. Optional: add `app.kirmistudio.com` as a custom domain on the service, and the CNAME record
   Render shows at your DNS provider.

In production, sign ups are closed when `INVITE_CODES` is empty (admins can still sign up).
The free Render plan sleeps after 15 quiet minutes, so the first visit after that takes a few
seconds.

## Where things are

* `src/server.js` routes, `src/hopkins.js` what happens on each event, `src/writer.js` the
  built-in ad writer, `src/brain.js` the Claude calls, `src/rules.js` reading the agent's
  messages without a model, `src/fairhousing.js`, `src/plans.js`, `src/listing.js`.
* `web/app.js` the app, `web/creative.js` draws the ads (preview, download and brand page
  share it), `web/lead.html` the public lead page, `web/login.html`.
