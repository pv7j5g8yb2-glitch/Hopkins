// The template library (Ismael, 2026-11-07): human designed templates that Hopkins fills in, never
// designs from scratch. Each template is its own entry with a purpose, so a request is only ever
// matched to a template made for it. Nothing here is copied from anyone else's work: every
// template is designed by Ismael and added with `addTemplate`-shaped data below.
//
// A template has:
//   id, name          what it is
//   purpose           one plain sentence: what post it makes and who it's for
//   topics            words that mean "this template", matched against what the agent asks for
//   avoid             words that mean it is NOT the right one (a coffee spots request never gets a
//                     market update template)
//   covers            alternative cover looks, the agent can pick one
//   slides            the slide kinds in order, each with its fields (what changes) and a slot for
//                     the agent's own photo
//   fields            what Hopkins fills: city, neighbourhoods, lines, agent name, comment word

export const TEMPLATES = [
  {
    id: "notes-app",
    name: "What the neighbourhoods have in their notes app",
    purpose: "A funny local identity carousel: one slide per neighbourhood, each a notes app card with the lines locals would write down. For people who live in or are moving to the city.",
    topics: ["neighbourhood", "neighborhood", "suburbs", "districts", "areas", "local life", "moving", "moving to", "living in", "locals", "funny", "relatable", "notes app"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "price", "tips"],
    covers: ["serif title over photo", "bold title over photo", "all caps title over photo", "suburbs version"],
    slides: [
      { kind: "cover", fields: ["city", "area_word"], photo: true },
      { kind: "notes-card", repeat: "2 to 8", fields: ["neighbourhood", "note_title", "note_lines", "caption_line"], photo: true },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { city: "text", area_word: "neighborhoods | suburbs | districts", neighbourhood: "text", note_title: "text", note_lines: "3 to 6 short lines", caption_line: "one funny line", agent_name: "text", comment_word: "one word", comment_offer: "what they get" },
  },
  {
    id: "gone-but-never-forgotten",
    name: "Gone but never forgotten",
    purpose: "A nostalgic local carousel about businesses and places that closed and that locals miss: one slide per place with an old photo and the year it closed. Builds local trust and comments.",
    topics: ["closed", "gone", "bring back", "miss", "nostalgia", "old", "history", "used to be", "remember", "landmark", "local business", "throwback"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "tips"],
    covers: ["bold sans over dusk photo", "serif italic over landscape photo"],
    slides: [
      { kind: "cover", fields: ["city"], photo: true },
      { kind: "question", optional: true, fields: ["city", "series_number"], photo: true },
      { kind: "closed-business", repeat: "3 to 8", fields: ["headline", "body", "year_closed"], photo: "background", polaroid: "agent supplied photo of the place" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { city: "text", series_number: "number", headline: "one punchy line", body: "2 to 3 sentences, only facts the agent confirms", year_closed: "year", agent_name: "text", comment_word: "one word", comment_offer: "what they get" },
    research: true,
    rules: ["Hopkins researches the places, years and stories itself, and every fact carries a source.", "The agent approves the list of facts before anything is made; a fact with no source is dropped.", "Old photos only from clearly licensed sources (for example Wikimedia Commons, credited), otherwise the agent's own photo."],
  },
  {
    id: "lose-it-local",
    name: "Things that make me lose it as a local",
    purpose: "A funny, relatable local pet peeves carousel: one 'When someone...' line per slide over the agent's own photo of a place, food or drink, ending with the agent's portrait and a comment offer. For locals who recognise the traffic, parking and weather jokes.",
    topics: ["lose it", "pet peeve", "pet peeves", "annoying", "annoys me", "things that annoy", "complain", "traffic", "parking", "weather", "only locals", "when someone"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "closed", "bring back", "notes app"],
    covers: ["four photo collage, tag, bold title with italic serif ending", "serif title top over skyline, 'as a local' arrow", "plain sans centred title", "serif centred title 'in [City]'"],
    slides: [
      { kind: "cover", fields: ["city", "title_variant"], photo: true },
      { kind: "when-someone", repeat: "4 to 10", fields: ["joke_line"], photo: "agent supplied photo that fits the joke", text: "small white sans, top left, over a darkened photo" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { city: "text", joke_line: "one or two sentences starting 'When...' about a real local thing the agent confirms: a road, a place, the weather, parking", agent_name: "text", comment_word: "one word, e.g. FALL", comment_offer: "the free guide they get" },
    research: true,
    rules: ["Hopkins looks up the real local roads, places and habits itself, with a source for each, and the agent approves the lines before they're made.", "Never invented local facts, prices or numbers.", "Each slide's photo is the agent's own or clearly licensed."],
  },
  {
    id: "not-just-selling",
    name: "I'm not just selling a house",
    purpose: "A warm seasonal carousel for buyers and sellers: each slide pairs what the agent does ('I'm not just writing contracts.') with the family moment it protects ('I'm securing the front yard where they'll rake leaf piles just to jump in them.'). Built around a season or holiday: fall, Halloween, Thanksgiving, Christmas, New Year.",
    topics: ["not just", "more than a house", "more than selling", "what i really do", "what i actually do", "why i do this", "holiday", "thanksgiving", "christmas", "halloween", "new year", "season", "seasonal", "fall", "winter", "family moments", "memories"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "closed", "bring back", "traffic", "parking"],
    noCover: true,
    covers: ["split photo, two lines", "full photo, two lines"],
    slides: [
      { kind: "not-just-pair", repeat: "4 to 8", fields: ["job_task", "family_moment"], photo: "two photos per slide: the task or room, then the moment; season matched", text: "white sans, centred, one line over each half" },
      { kind: "comment", fields: ["agent_name", "city", "dm_offer"], photo: "agent", note: "script signature, city local & real estate advisor, and a DM offer" },
    ],
    fields: { job_task: "'I'm not just ...' and a real agent task (writing contracts, scheduling inspections, handing over keys)", family_moment: "'I'm ...' and the home moment it protects in the chosen season", agent_name: "text", city: "text", dm_offer: "DM me whenever you're ready for an agent who's on your side" },
    rules: ["Moments are about family and home life only, never about who a property suits (fair housing).", "Season comes from the agent's request or the calendar."],
  },
  {
    id: "not-paid-to-list",
    name: "I'm not paid to list houses",
    purpose: "A seller-facing authority carousel: what the agent really does beyond putting a house on the MLS (marketing it, negotiating offers, protecting the price to closing). One portrait of the agent behind every slide. Wins listing conversations.",
    topics: ["not paid to list", "list houses", "listing", "sellers", "seller", "why hire me", "what i do for sellers", "marketing plan", "mls is not marketing", "listing presentation", "negotiate", "negotiating offers", "top dollar", "marketing your home", "marketing a house"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "open house", "closed", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween"],
    covers: ["serif italic over portrait, arrow", "bold sans with italic serif ending", "split big sans top and bottom right", "serif with years of experience line"],
    slides: [
      { kind: "cover", fields: ["city", "title_variant", "years_experience"], photo: "agent portrait" },
      { kind: "claim", repeat: "4 to 7", fields: ["headline", "body"], photo: "same agent portrait on every slide", text: "serif headline over small bold sans body, bottom left, arrow bottom right" },
      { kind: "comment", fields: ["agent_name", "city", "inbox_line"], photo: "agent portrait" },
    ],
    fields: { city: "text", years_experience: "number, only if the agent gives it", headline: "short serif line, e.g. 'I don't just post it and pray.'", body: "1 to 3 plain sentences describing something the agent really does", agent_name: "text", inbox_line: "My inbox is always open." },
    rules: ["Every claim about what the agent does (calls, mailers, social reach, network) must be true for them; Hopkins asks which of them they actually do and drops the rest.", "No invented numbers, years or results.", "The photo is the agent's own, never AI generated."],
  },
  {
    id: "never-worry-local",
    name: "5 things I never worry about as a local",
    purpose: "A relatable, funny local carousel: five small things locals shrug off (the weather, the humidity, the bugs, the shoes, the seasons), each a short serif title with two or three casual sentences over the agent's own photo. Ends with the agent's portrait and a comment offer for a free guide.",
    topics: ["never worry", "don't worry about", "things i don't worry", "locals shrug", "as a local", "living in", "life in", "what it's like to live", "weather", "humidity", "seasons", "bugs", "quirks", "local quirks", "five things", "5 things"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "closed", "bring back", "traffic", "parking", "not paid to list", "not just selling"],
    covers: ["serif title over skyline with italic city line", "serif title over skyline, plain", "italic 'five things' over landscape", "bold sans over mountains with arrow", "three photo collage"],
    slides: [
      { kind: "cover", fields: ["count", "city", "demonym"], photo: "agent supplied or licensed photo of the city" },
      { kind: "shrug", repeat: "4 to 7", fields: ["title", "body"], photo: "agent supplied photo that fits", text: "serif lowercase title with small sans body, top left, right or bottom right" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { count: "number", city: "text", demonym: "what locals call themselves, e.g. Dallasite, only if the agent confirms", title: "lowercase serif line, e.g. 'lovebug season'", body: "2 to 3 casual first person sentences about a real local thing", agent_name: "text", comment_word: "one word", comment_offer: "the free guide" },
    research: true,
    rules: ["Hopkins looks up what is really true about the city (weather, seasons, bugs, quirks) with a source, and the agent approves the lines before they're made.", "Never invent facts, numbers or personal stories; first person lines are drafts the agent confirms are true for them.", "Photos are the agent's own or clearly licensed."],
  },
  {
    id: "refuse-to-do",
    name: "Things I refuse to do for my clients",
    purpose: "A standards carousel: three to five things the agent refuses to do for clients and what they do instead, ending with what it's like to work with them. Builds trust with buyers and sellers.",
    topics: ["refuse", "things i refuse", "standards", "my rules", "one rule", "won't break", "what it's like to work with me", "work with me", "how i work"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "closed", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween"],
    status: "format only: structure and wording style saved as inspiration; layout to be designed by Ismael",
    covers: ["to be designed"],
    slides: [
      { kind: "cover", fields: ["title", "city"], photo: "agent portrait" },
      { kind: "refuse-pair", repeat: "3 to 5", fields: ["i_refuse", "i_do_instead"], photo: "agent" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { i_refuse: "a real thing the agent won't do", i_do_instead: "what they do instead", agent_name: "text", city: "text", comment_word: "one word", comment_offer: "what they get" },
    rules: ["Every refusal must be true for this agent; Hopkins asks and drops the rest.", "Never invented results."],
  },
  {
    id: "see-vs-took",
    name: "What you see versus what it took",
    purpose: "A behind the scenes carousel: the finished result on one side and the weeks of work behind it on the other (a sale, a listing, a closing). Shows the agent working.",
    topics: ["what you see", "what it took", "behind the scenes", "behind the sale", "what i do for my clients", "the work behind", "agents don't realize", "being an agent is easy"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "closed", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween"],
    status: "format only: structure and wording style saved as inspiration; layout to be designed by Ismael",
    covers: ["to be designed"],
    slides: [
      { kind: "cover", fields: ["title", "city"], photo: "agent portrait" },
      { kind: "see-vs-took", repeat: "3 to 6", fields: ["what_you_see", "what_it_took"], photo: "agent supplied" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { what_you_see: "the visible result", what_it_took: "the real work, only what the agent confirms", agent_name: "text", city: "text", comment_word: "one word", comment_offer: "what they get" },
    rules: ["Only work the agent really did; never invent hours, numbers or results."],
  },
  {
    id: "sit-vs-fight",
    name: "Listings that sit versus listings buyers fight over",
    purpose: "A pricing and marketing contrast: what makes a listing sit and what makes buyers compete for it, with the agent's own take. Wins seller listings.",
    topics: ["listings that sit", "fight over", "sits on the market", "why listings sit", "multiple offers", "tough market", "without dropping the price", "outdated advice"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "closed", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween"],
    status: "format only: structure and wording style saved as inspiration; layout to be designed by Ismael",
    covers: ["to be designed"],
    slides: [
      { kind: "cover", fields: ["title", "city"], photo: "agent portrait" },
      { kind: "sit-vs-fight", repeat: "3 to 6", fields: ["what_makes_it_sit", "what_makes_buyers_fight"], photo: "agent supplied" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { what_makes_it_sit: "a real cause", what_makes_buyers_fight: "what works instead", agent_name: "text", city: "text", comment_word: "one word", comment_offer: "what they get" },
    rules: ["Advice only; no invented statistics, days on market or prices. Any local numbers come from a source the agent approves."],
  },
  {
    id: "hills-i-die-on",
    name: "Hills I'll die on",
    purpose: "A professional hot takes carousel: three to six opinions the agent stands behind (for example, not always telling people to buy instead of rent), each with a one line reason.",
    topics: ["hills i die on", "hot take", "hot takes", "my opinion", "unpopular opinion", "professional opinion", "food for thought", "buy instead of rent"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "closed", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween"],
    status: "format only: structure and wording style saved as inspiration; layout to be designed by Ismael",
    covers: ["to be designed"],
    slides: [
      { kind: "cover", fields: ["title", "city"], photo: "agent portrait" },
      { kind: "hot-take", repeat: "3 to 6", fields: ["take", "reason"], photo: "agent supplied" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { take: "one clear opinion", reason: "one line why", agent_name: "text", city: "text", comment_word: "one word", comment_offer: "what they get" },
    rules: ["The agent writes or approves every opinion; Hopkins never invents opinions or claims for them.", "No wording about who a property suits (fair housing)."],
  },
  {
    id: "one-rule",
    name: "The one rule I won't break",
    purpose: "A single value post: the one rule the agent refuses to break, even if it costs them a sale, and the story or reason behind it.",
    topics: ["one rule", "rule i won't break", "even if it costs me a sale", "my non negotiable", "non negotiable", "my line in the sand"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "closed", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween"],
    status: "format only: structure and wording style saved as inspiration; layout to be designed by Ismael",
    covers: ["to be designed"],
    slides: [
      { kind: "cover", fields: ["title", "city"], photo: "agent portrait" },
      { kind: "rule", repeat: "2 to 4", fields: ["rule", "why", "example"], photo: "agent supplied" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { rule: "the rule", why: "why it matters", example: "a real example the agent gives", agent_name: "text", city: "text", comment_word: "one word", comment_offer: "what they get" },
    rules: ["The example must come from the agent; Hopkins never invents a story."],
  },
  {
    id: "first-in-my-bloodline",
    name: "First in my bloodline to...",
    purpose: "A funny, relatable agent life carousel: every slide repeats 'first in my bloodline to' and finishes it with something only a real estate agent does (meeting strangers at vacant houses, knowing someone's finances before their middle name, driving 45 minutes for a 10 minute showing). One interior photo behind every slide, one short line in the middle. Highly shareable and gets agents followed.",
    topics: ["first in my bloodline", "bloodline", "only an agent", "agent life", "being an agent", "real estate agent life", "relatable", "funny agent", "things only agents", "day in the life", "agent humor", "agent humour"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "closed", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween", "not paid to list", "hills i die on"],
    noCover: true,
    covers: ["centred bold sans in cream, one interior photo, dark overlay"],
    slides: [
      { kind: "bloodline", repeat: "5 to 10", fields: ["finish_the_line"], photo: "the same agent supplied interior photo on every slide", text: "cream bold sans, centred, 3 to 4 lines, 'first in my bloodline to' then the punchline" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { finish_the_line: "the funny agent specific ending, from things the agent confirms are true for them", agent_name: "text", city: "text", comment_word: "one word", comment_offer: "what they get" },
    rules: ["Hopkins suggests lines about agent life and the agent picks the ones that are true for them; never invented personal facts.", "Any figure in a line (such as 43,560 square feet in an acre) must be correct and checked.", "The photo is the agent's own or clearly licensed."],
  },
  {
    id: "unhinged-to-the-average-person",
    name: "Things I do as an agent that seem unhinged",
    purpose: "A funny agent life carousel: the cover says 'things I do as a [City] real estate agent that seem unhinged to the average person', then each slide is one unhinged thing in a lowercase serif title with a small sans punchline under it (cleaning out a stranger's rotten fridge, walking into the creepy basement first, driving to a house just to smell it, showing someone 47 houses with no guarantee of pay). One dark, moody photo per slide. Ends with the agent's portrait and an invitation to message.",
    topics: ["unhinged", "seem unhinged", "things i do as an agent", "average person", "crazy things i do", "weird things i do", "agent things", "what agents do", "things only agents do", "strange", "wild things"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween", "not paid to list", "hills i die on", "bloodline"],
    covers: ["agent portrait in a kitchen, bold cream sans with one oversized word"],
    slides: [
      { kind: "cover", fields: ["city", "oversized_word"], photo: "agent portrait" },
      { kind: "unhinged", repeat: "5 to 10", fields: ["thing_i_do", "punchline"], photo: "agent supplied photo that fits, dark overlay", text: "lowercase serif title, small sans punchline underneath, left or right aligned" },
      { kind: "comment", fields: ["agent_name", "city", "invite_line"], photo: "agent portrait", note: "Hi, I'm [Name], your local [City] real estate advisor. Making a move soon? Send me a message." },
    ],
    fields: { city: "text", oversized_word: "unhinged", thing_i_do: "an agent task that sounds ridiculous out of context", punchline: "the short reason why it is actually part of the job", agent_name: "text", invite_line: "Making a move soon? Send me a message" },
    rules: ["The agent confirms each thing is true for them; Hopkins suggests, never invents personal stories or numbers.", "Any figure in a line (such as 47 houses) is the agent's own, never made up.", "Photos are the agent's own or clearly licensed."],
  },
  {
    id: "when-i-list-a-home",
    name: "When I list a home, I treat it like it's my own",
    purpose: "A seller-facing listing process carousel: what the agent does for every listing, one step per slide, each a serif headline with a short sans explanation over a darkened interior photo (walk through with a buyer's eyes, marketing starts before we go live, hire a pro photographer, price on data not emotion, tell the truth after every showing, stay involved through closing, negotiate every line of the offer). Ends with the agent's portrait and an invitation to message if they're thinking of listing.",
    topics: ["when i list a home", "treat it like it's my own", "like it's my own", "my listing process", "how i sell your home", "how i market a listing", "listing process", "what happens when you list with me", "sellers", "pro photographer", "price based on data", "negotiate every line", "stay involved through closing", "if i were selling my own home"],
    avoid: ["market update", "interest rate", "first time buyer", "mortgage", "just listed", "just sold", "open house", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween", "hills i die on", "bloodline", "unhinged", "closed"],
    covers: ["four photo collage with the agent portrait, serif title with italic second line and caps subtitle"],
    slides: [
      { kind: "cover", fields: ["city", "title"], photo: "four photo collage including the agent portrait" },
      { kind: "listing-step", repeat: "5 to 9", fields: ["step_title", "step_body"], photo: "agent supplied interior photo, dark overlay", text: "serif headline, small sans body, centred" },
      { kind: "comment", fields: ["agent_name", "city", "invite_line"], photo: "agent portrait in a small frame over an interior photo", note: "This is how I show up for every listing. If you're thinking about listing in [City] this year, send me a message." },
    ],
    fields: { city: "text", title: "When I list a home in [City], I treat it like it's my own", step_title: "'I ...' and a real thing the agent does", step_body: "1 to 3 plain sentences saying why it matters to the seller", agent_name: "text", invite_line: "send me a message" },
    rules: ["Hopkins asks which steps the agent really does (pro photographer, broker outreach, buyer database, showing feedback) and only uses true ones.", "No invented numbers, results or guarantees; 'data' claims need the agent's real data.", "Photos are the agent's own listing or interior photos."],
  },
  {
    id: "doesnt-have-to-be",
    name: "It doesn't have to be... it just has to be...",
    purpose: "A reassuring buyer carousel built on one repeated move: each slide is a split photo, grey on top with 'it doesn't have to be [what people think]', full colour underneath with 'it just has to be [what really matters]'. For first time buyers and hesitant buyers (your dream house, the top of your budget, impress everyone, check every box, look like Pinterest, have it all figured out, wait until you're ready).",
    topics: ["doesn't have to be", "it just has to be", "first home", "starter home", "dream house", "top of your budget", "ready to buy", "not ready", "hesitant", "nervous buyer", "first time buyer reassurance", "you don't have to", "buying your first home", "scared to buy"],
    avoid: ["market update", "interest rate", "just listed", "just sold", "open house", "bring back", "traffic", "parking", "thanksgiving", "christmas", "halloween", "hills i die on", "bloodline", "unhinged", "closed", "not paid to list"],
    noCover: true,
    covers: ["split photo: grey top half, colour bottom half, cream bold sans"],
    slides: [
      { kind: "not-this-but-this", repeat: "5 to 8", fields: ["doesnt_have_to", "just_has_to"], photo: "one agent supplied photo per slide, shown grey in the top half and in colour in the bottom half", text: "cream bold sans, centred in each half" },
      { kind: "comment", fields: ["agent_name", "city", "comment_word", "comment_offer"], photo: "agent" },
    ],
    fields: { doesnt_have_to: "the pressure buyers feel", just_has_to: "what actually matters", agent_name: "text", city: "text", comment_word: "one word", comment_offer: "what they get" },
    rules: ["Advice only; no promises about rates, prices or approval, and never wording about who a home suits (fair housing).", "Photos are the agent's own or clearly licensed; the grey and colour halves are made from the same photo."],
  },
];

const words = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
const hits = (text, list) => list.filter((t) => ` ${text} `.includes(` ${t.toLowerCase()} `) || text.includes(t.toLowerCase())).length;

// The templates that fit a request, best first. A template is never offered if the request hits
// its avoid list harder than its topics, and nothing is offered when nothing really fits.
export function matchTemplates(request, library = TEMPLATES) {
  const text = words(request).join(" ");
  return library
    .map((t) => ({ t, score: hits(text, t.topics), bad: hits(text, t.avoid) }))
    .filter((x) => x.score > 0 && x.bad < x.score)
    .sort((a, b) => b.score - b.bad - (a.score - a.bad))
    .map((x) => x.t);
}

// What the agent can ask for, in plain words, for the chat to say when nothing matches.
export const templateMenu = (library = TEMPLATES) => library.map((t) => t.name);
