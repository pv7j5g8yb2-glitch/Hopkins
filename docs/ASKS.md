# Everything an agent can ask Hopkins (2026-10-31)

The source list for Hopkins' scenario tests. Status as of 2026-10-31:
✅ works today, ⚠️ partly or untested, ❌ not built. Keep it updated as things are built.

## Account and settings
- ✅ Sign up, sign in, sign out
- ✅ Change password, email, profile photo
- ⚠️ Forgot password (the reset link exists; check it reaches people by email)
- ✅ Delete my account
- ✅ Turn on Lead alerts on my phone

## My brand
- ✅ Set colours, logo and font (Brand page)
- ✅ "Change my name to Pierre", "my brokerage is Meridian Realty", phone, licence, Instagram, from the chat
- ⚠️ "Make my brand colour navy" from the chat (each ad's look changes; the brand default doesn't)
- ❌ Several agents on one brand, each with their own name and photo

## Getting a property in
- ✅ Type or paste the details ("3 bed 2 bath, $649,000, big yard")
- ✅ Send photos, any size, iPhone HEIC included
- ✅ Paste a Zillow link
- ✅ An MLS share link (Flexmls, Matrix, Paragon) or an agent's site: up to 25 photos at full size, the remarks and the facts (built 2026-10-31 against sample pages; check with a real one)
- ⚠️ A link the site blocks (Hopkins asks for photos and details instead)
- ✅ Rentals ("$2,400/mo"), and other currencies (€, £, AED)
- ⚠️ Land, commercial, new builds, multi unit (written as a normal listing, untested)
- ❌ Import from the MLS or a brokerage feed
- ❌ Read a PDF flyer or brochure
- ✅ Rename, delete, mark as sold or rented, back on the market

## Making ads
- ✅ "Make ads for this", 3 by default, up to 5
- ✅ "Make one about the kitchen", "give me a new set", "add another ad", "delete ad 2"
- ✅ Feed and story sizes, download PNG, copy the ad text, copy the ad link
- ❌ Video ads and Reels
- ❌ Carousel ads (several photos in one ad)
- ⚠️ Ads in Spanish or another language (untested)

## Changing the words on an ad
- ✅ Change the big line, headline, caption, small label
- ✅ "Under the price put ..." (a second line, same font and colours)
- ✅ Dictated text exactly as typed, "remove the full stop"
- ✅ Shorter, punchier, warmer, more premium
- ⚠️ Emojis and hashtags in the caption (the model decides; untested)
- ❌ Change the button ("Learn more" to "Book now")

## Changing the look of an ad
- ✅ Colours, font, layout, text size, left or centred, fade, which part of the photo shows
- ✅ "Put my photo on it" / "take my photo off"
- ✅ Only the ad being worked on changes unless I say all, both or them
- ❌ Move or resize the logo, stickers, badges, QR codes, two photos in one ad

## Photos
- ✅ "Use another photo", "use the kitchen one"
- ❌ Edit the photo itself: brighten, retouch, remove an object, replace the sky, virtual staging

## Running ads on Facebook and Instagram
- ✅ "Run it", pick the budget and days, approve (Meta testers until App Review)
- ✅ Run only some of the ads
- ✅ "Stop the ad", "pause", "turn them back on", also in the listing's ••• menu
- ✅ "Spend $500 instead", "double it", "add $100" on ads already running (changes them on Meta, all or nothing)
- ✅ "Run it another week" (same spend a day, for longer)
- ❌ Start on a set date, only Instagram, change the radius beyond 15 miles
- ❌ Keep the winning ad and stop the losers automatically (Autopilot)
- ✅ "Target first time buyers / people over 50" gets a plain no (Housing rules forbid it)
- ❌ Retargeting, lead form ads, Google, TikTok

## Results
- ✅ "How did I do last week?", "which ad is working?", Leads per ad, spend, cost per Lead
- ✅ Weekly report, Report page by week, Active filter
- ✅ Never invents clicks, reach or engagement
- ❌ Export results

## Leads
- ✅ Every Lead with the ad it came from, this week filter, statuses
- ✅ "Write a reply to this buyer" (as text to copy)
- ✅ Every new Lead into their CRM: Follow Up Boss with their API key, any other CRM through a webhook (Zapier, Make), in Settings, CRM
- ❌ Text or email the Lead from Hopkins

## Moments
- ✅ New price, open house, sold, rented (new ads for each; sold or rented stops running ads)
- ✅ Coming soon, under contract or pending, back on the market (their own ads; under contract says when ads are still running)

## Organic posts (next to build)
- ❌ "Make a post about my city", "a post about me", "market update", "just sold story"
- ❌ Carousels, quote posts, neighbourhood guides, holiday posts
- ✅ Captions, hashtags, Reel scripts and content ideas as text in the chat
- ❌ Post to Instagram for me, schedule posts, a content calendar with images

## Writing help, like any assistant
- ✅ Emails and texts to clients, listing descriptions, bios, open house scripts, follow ups
- ✅ Translate, summarise, rewrite, maths, general business questions

## Questions about the market and the job
- ✅ Marketing advice, what to post, how much to spend
- ⚠️ Market data, comps, prices in an area (general knowledge only, no live data)
- ⚠️ Legal, tax, mortgage questions (general answers, not advice)

## Compliance
- ✅ Fair housing check on every ad, one plain warning on wording the agent asks for
- ✅ Licence line on Lead pages
- ⚠️ State rules (brokerage name on every ad, MLS rules): not checked

## Plans and billing
- ✅ Upgrade (Stripe, once live keys are in), cancel, invoices, card (Manage in Settings)
- ⚠️ Switch plan (cancel, then pick again)
- ✅ Waitlist discount (promotion code at checkout)
- ❌ Refunds from the app, team seats that count agents

## Teams
- ❌ Invite teammates, one login per agent, shared listings, roles, a team lead view

## Connections
- ✅ Meta (Facebook and Instagram ads)
- ✅ Follow Up Boss, and any CRM through a webhook (Zapier, Make)
- ❌ Instagram posting, Google Ads, TikTok, email marketing, their website, Claude or ChatGPT

## When something goes wrong
- ✅ "Undo", "put it back", "I didn't ask for that", edit or stop a message
- ✅ Ad rejected by Meta (the chat says why), Meta disconnected (reconnect)
- ✅ "Why no Leads?" (answers from the real numbers)
- ⚠️ Slow answers on the free AI (Groq steps in after 12 seconds)

## Privacy
- ✅ Delete a listing, delete the account, privacy policy, terms
- ❌ Download all my data
