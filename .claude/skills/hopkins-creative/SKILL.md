---
name: hopkins-creative
description: What real estate content and ad creative actually works on Instagram right now (2026 into 2027). Use whenever writing, designing or reviewing posts, carousels, reels, stories or ads for the @gethopkins account, or creatives the Hopkins product makes for its customers.
---

# Hopkins creative playbook

Studied from feeds that are winning in real estate on Instagram (Coffee & Contracts,
@heyalyssamichelle and the member posts they showcase), October 2026. Brand rules in
CLAUDE.md always come first. Add new learnings to the log at the bottom, with a date.

## Before designing anything

Always open @coffeecontracts on Instagram (instagram.com/coffeecontracts) and study their
latest grid and two or three recent carousels first: how the slides are laid out, the
type, the photos, the colours, the footer strip and the overall branding. Note anything
that has changed since the log below and add it there with the date. Instagram usually
blocks viewing without a login, so if the page won't open, ask Ismael for fresh
screenshots of their grid and a recent carousel before starting. Study the visual system
and the patterns, then make our own in the Hopkins brand. Never copy their designs.

## The core idea

Real estate content that grows is content people **save and send**. The best posts get
roughly as many shares as likes (one hooks carousel: 1,072 likes, 1,096 shares). A post
gets sent on when the reader can use it straight away: a hook to copy, a template to
fill in, a local list to plan the weekend with. Judge every post by "would someone
send this to a colleague or a friend?", not by how pretty it is.

## What works

1. **Name the audience at the top.** A small line ("real estate teams:", "team
   leaders:") above the big hook. Everyone else scrolls past, the right people stop.
2. **One hook, big and bold.** Slide one is only the hook. City and keywords in big
   text help the Explore page.
3. **Fill in the blank templates.** "[City Name]", "[Home Type]", "[Neighborhood]"
   gaps make a post instantly usable, so it gets saved.
4. **Lists with a number.** "7 hooks I'd use this week", "5 things I'd do this week".
5. **Contrarian lines.** "market updates are dead", "nobody cares about your new
   listing", "stop marketing the square footage". Say the opposite of the usual
   advice, then show the better way.
6. **Post this, not that.** Side by side, the weak version and the strong one.
7. **Local identity content** (for customers' own accounts): how the agent lives in
   their city. "Three things [City] ruined for me", "the first rule of [City]",
   "my current [City] rotation", "pick a Sunday morning, I'll pick your neighborhood".
8. **Timely local content:** what's on this month, seasonal events, new openings.
   Locals save and send posts that help them make plans.
9. **Listing features that speak to one buyer.** Not "4 bed, 2 bath" but the life:
   "buy the home with the wraparound porch, choose the slower mornings".
10. **Lo-fi beats polished** for feed posts: it should feel made on the phone, not by
    an agency. Ads can be more finished, but still native to the feed.
11. **Keywords in captions.** Instagram works as a search engine: name the city, the
    neighborhoods and what you do in the caption.
12. **Humour people share:** "if real estate brokerages were dog breeds". Tribal and
    light, never mean about a real, named person or company.
13. **Ride the current tool trend** with real tutorials (in 2026: Claude and AI for
    real estate). Teach something that works, not hype.
14. **Comment for the freebie.** "Comment HOOKS and I'll send you The Hook Edit."
    Comments lift the post; the automated DM delivers the freebie and collects the
    email. Needs a DM automation tool on the account.
15. **The weekly flagship carousel**, 10 slides, same structure every week:
    1. Big hook ("what's working right now in [topic]")
    2. "Every week we study what works… here's what's working right now"
    3 to 9. One tactic per slide: headline, one line, three example tiles
    10. The product, real proof if any, and the comment or link CTA
16. **A footer strip on every carousel slide:** a short rotating line on the left, the
    wordmark on the right. The brand repeats without the slide feeling like an ad.
17. **Last slide sells, the rest give.** Value on slides 1 to 9, the offer only at the end.
18. **One image, one fixed line, a rotating punchline.** The same photo on every slide,
    the same line on one side ("Let us handle your socials"), and only the other side
    changes, each one a pain the reader knows ("Film a reel and never edit it",
    "Call posting once a month consistency"). Cheap to make, very shareable: 1,256 likes,
    1,308 shares. The reader sees themselves in the joke and sends it on.
19. **Weak vs strong, labelled with the outcome.** Two creatives side by side, each
    labelled by what it causes, not by "bad" and "good": "this gets scrolled past" vs
    "this gets an 'is it still available?'", "this raises red flags" vs "this books the
    showing". One short line underneath gives the reason ("a lower price makes buyers ask
    why, a lifestyle perk makes them ask when"). This is the natural format for Ad teardown.
20. **Vary the visuals, never the type.** A carousel can change background on every slide
    (photo, flat colour, grid paper, a pinboard) and still feel like one brand when the
    type and a small signature mark stay identical. Tight bold grotesk, centred, with one
    italic word to land the line.
21. **A personal process hook.** "When I get a new project, I close my laptop", with small
    side notes "I know it sounds weird, but hear me out". Admitting something unusual
    makes people swipe to find out why.

## Every reel ships with a hook cover

Ismael's standing rule (2026-10-18): every reel, always, comes with its own cover image, made at the
same time as the reel. The cover is the hook in big type, written to make people tap, but it must be
true and the reel must pay it off. Curiosity, a named mistake or a number, never a promise the reel
doesn't keep and never an invented result. Hopkins is "tested, not guessed", so bait and switch hurts
the brand.

* 1080x1920, all text and the visual inside the 3:4 grid crop (y 240 to 1680), since the profile
  grid shows the middle 3:4.
* Small audience line on top ("Real estate teams:"), a huge Inter Tight hook with one Instrument
  Serif gold word, one simple visual from the reel, @gethopkins bottom left, a short teaser bottom
  right ("Number 3 is the boost button", "Here's what to write").
* Made from `content/reels/covers.html` (`node covers.mjs out_dir`). Add the new reel's entry there.

## Every reel ends the same way

The end card is the mark, "Hopkins" beside it, and one gold pill under it. No slogan. One call to
action, never two (Ismael, 2026-10-18):
* Teaching reels with no self promotion: pill "Follow @gethopkins", no spoken sign off.
* Launch or self promotion reels: the voice says "Get Hopkins." as the name lands (set
  `signoff:true` in the reel), and the pill carries the next step ("Join the waitlist · link in bio").
Built into `content/reels/engine.js` and `vo.py`.

## Look

Bold grotesk word mixed with an italic serif word, cream text over warm real photos
(coffee, interiors, streets, light), one consistent look across the whole grid.
For Hopkins that is Inter Tight bold with Instrument Serif italic, oxblood, cream and
gold, per CLAUDE.md. Free licence photos only (Unsplash, Pexels), never listing portals.

## Our house style: editorial

The chosen style for @gethopkins (Ismael's pick, 2026-10-17) is the editorial look:
moody real photos (interiors, desks, coffee, hands, streets, objects), very tight bold
grotesk mixed with one big italic serif word, type laid over and around the photo, small
side notes, a tiny signature mark at the bottom, a different background per slide with
the same type. References: @coffeecontracts, @claunicornios, @heyalyssamichelle,
@femmebrandsocial, @asylic.inc (the calculator post).

The style wins attention and shares. It does not turn people into customers on its own.
Every post in this style also needs:
1. Something usable (a hook, a teardown, a number) so it gets saved and sent.
2. A next step: comment for the freebie, or the waitlist link.
3. Proof once it exists (real screenshots, real numbers), never invented.
4. Ads and numbers as the topic, aimed at team leaders, not lifestyle tips for solo agents.

Backgrounds: Ismael sends the photos (his own or free licence stock), Claude does the
type, layout and edit on top.

## Intentionally messy, not template neat

Left alone, AI made layouts come out centred, symmetrical and evenly spaced, and the feed
can tell straight away. The posts that win break the rules on purpose. Every creative needs
at least two of these, and it should still look deliberate, not broken:

- Type that touches or crosses the photo, a person or an object, not sitting in a safe box.
- Very tight letter spacing on the big words, so letters nearly touch.
- Mixed scale in one line: a huge word next to tiny side notes ("I know it sounds weird",
  "but hear me out").
- Words placed off grid or scattered across the slide with uneven gaps.
- A real phone photo with grain, shadows and clutter (a desk, a coffee, hands, a street),
  never glossy stock or a perfect render.
- One taped on or rotated element: a sticker, a cut out photo, a highlighter mark, a
  note in a different typeface.
- Backgrounds that change from slide to slide while the type stays the same.

The real photos matter most, and they come from Ismael's phone, not from stock. Make
two versions when unsure (clean and messy) and let Ismael pick.

## For the @gethopkins account

- Audience line: "real estate teams:" or "team leaders:". Speak to team leaders and
  brokers (ad spend, listing volume, cost per lead), not solo agents.
- Topic is **ads and marketing that wins listings**, not posting tips and not lead
  response. Follow up is a feature, never the headline.
- Series: **What's working in real estate ads right now** (weekly flagship),
  **Steal this ad** (hooks and ad ideas with [City] gaps), **Ad teardown** (patterns
  from public ads, recreated on our made up brokerage Ellery Realty rather than
  screenshots of real agents' ads), **Tested, not guessed** (Claude Hopkins, Wanamaker's
  half, one testing lesson per post).
- Faceless: screen recordings of the Hopkins chat making an ad, hands and phone shots,
  b-roll with text. On camera content grows faster; faceless is slower but workable.
- CTA: "Comment ADS for 10 ad hooks for your city" or "Join the waitlist, link in bio".

## For creatives the product makes for customers

- Every customer gets their own brand system (logo, colours, type, voice) and every
  creative follows it, every time.
- Use the patterns above on the customer's own city, listings and voice: local
  identity, timely local, listing features for one buyer, fill in the blank hooks.
- Meta rewards **creative diversity**: test genuinely different concepts against each
  other (agent video, just sold carousel, local market data), not small tweaks of one.
- Nothing goes live without the owner's yes.

## Never

- Invent results, testimonials, follower counts or numbers. Proof only once it's real
  and the person agreed to be shown.
- Use "Realtor" in public copy (NAR trademark) or "estate agent". Say "real estate".
- Use dashes as punctuation in any copy.
- Write "we", "us" or "our" in any copy. It reads like an agency. Hopkins is software:
  "Hopkins tests both", "what to run instead", or "I" when Hopkins speaks in the chat.
- Copy another account's post or template word for word. Learn the pattern, make our own.

## Log

- 2026-10-18 (reels, pace): Captions read at 135 words a minute felt far too slow; the reference
  reels run at about 195. Reels now have a voiceover at about 180 words a minute and the captions
  follow the voice word by word (`content/reels/vo.py`). At that pace a 60s teaching reel needs
  about 175 spoken words, so plan five to eight real points, not three. Voice is AI made, so turn
  on Instagram's AI label when posting.

- 2026-10-17 (reels): Ismael's pick for reels is the animated explainer format (references:
  @adilet.fndr "if you vibe coded an app" and @peterstewiestartup "5 tools"). What makes it work:
  captions that build word by word with the key word boxed, one small piece of moving UI per
  point (ad cards, Ads Manager panels, forms, maps, counters), a real number on screen with a
  tiny source line under it, and a share line at the end ("Send this to whoever runs your ads").
  Hopkins version: oxblood ground, cream UI cards, gold only for the number that matters, plum for
  the losing version, one Instrument Serif italic word, line art house illustrations instead of
  stock photos, "Example numbers" on anything illustrative. Quiet expert tone, never the scare
  tone of the reference. No mascot. Length: about 60s for teaching reels, 30s or more for launch
  reels. Engine and reel sources live in `content/reels/` (engine.js plus r1 to r5, see its README
  for how to render).

- 2026-10-17 (later): Added 18 to 21 from @femmebrandsocial (rock paper scissors
  carousel), @claunicornios (designer process carousel) and a @coffeecontracts weak vs
  strong price drop carousel (431 likes, 322 comments, 233 shares).

- 2026-10-17: First version, from Coffee & Contracts' site, feed and a 10 slide
  "what's working right now" carousel, and @heyalyssamichelle's hooks carousel.
