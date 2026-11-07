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
    topics: ["lose it", "pet peeve", "pet peeves", "annoying", "annoys me", "things that annoy", "complain", "traffic", "parking", "weather", "hot take", "hot takes", "only locals", "when someone"],
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
