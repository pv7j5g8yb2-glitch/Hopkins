# Hopkins, the product

The chat itself: an agent sends a listing, Hopkins makes 3 different ads, the agent changes
them in the chat and says yes. Separate from `survey/` (the waitlist server) and `platform/`
(the old booking system).

## What works today

* **Accounts.** Invite only sign up (`INVITE_CODES`), email and password, one workspace per
  business.
* **Brand.** Business name, colors, logo, type, voice. Every ad follows it. Set on first sign in.
* **A listing in.** Photos (resized in the browser) plus the link or the description. Hopkins
  reads the price, beds, baths, size, address, area and features. Links: it reads what the
  page says about itself; most portals block that, and then it asks for the details.
* **3 ads out**, each a different idea: *The life* (the life the home gives), *The standout*
  (one detail, its photo), *The facts* (price and numbers). Feed (4:5) and story (9:16)
  previews drawn in the agent's brand, exactly as they'd run.
* **Changes in the chat.** Shorter, longer, warmer, more premium, plainer, another angle, a new
  headline or line on the image, another photo, new facts ("it has a pool"), a new price, an
  open house, sold, run it. With a model key set, the chat is a real conversation: it gets the
  whole thread plus the listing, the ads, the plan and the version on screen, answers questions,
  switches version when one is named, and acts when asked. `ANTHROPIC_API_KEY` uses Claude (also
  reads listings and photos and writes the ads); without it, `GROQ_API_KEY` uses Groq's free
  model for the chat and edits (text only, same as the survey); the first 3 ads then come from
  the built-in writer, because Groq invented details in live tests. Any failure falls back to the built-in rules, which
  cover the common requests and questions but are not a conversation.
* **Hopkins messages first.** A new price or open house brings 3 new ads on its own. The Today
  page lists what's waiting on the agent; on Mondays the report is waiting as a message.
* **Fair housing.** Every line (Hopkins' and the agent's) is checked; problem wording is
  rewritten before it reaches an ad, and the agent's own description gets flagged. Run plans
  use Meta's Housing category: no age, gender or ZIP targeting, 15 mile minimum radius.
* **Free plan** (CLAUDE.md): 3 ads, previews only, the Hopkins mark across the middle, no
  downloads. A 4th ad or "Run it" brings up the upgrade message. Price changes still update
  the 3 free ads.
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
| `ADMIN_EMAILS` | Accounts that see the Admin page (switch workspaces to paid). |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | Turso database. Defaults to `./data/hopkins.db`. |
| `ANTHROPIC_API_KEY` | Turns on Claude for reading listings, writing ads and the chat. |
| `GROQ_API_KEY` | Free alternative for the chat when there's no Anthropic key (console.groq.com). |
| `HOPKINS_MODEL`, `GROQ_MODEL` | Override the models (defaults `claude-opus-5-5`, `openai/gpt-oss-120b`). |
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
