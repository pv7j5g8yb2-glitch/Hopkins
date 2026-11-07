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
    rules: ["The agent supplies the place name, year and photo; Hopkins never invents history.", "Old photos must be ones the agent has the right to use."],
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
    rules: ["Every joke names a real local road, place or habit the agent gives; Hopkins never invents local facts, prices or numbers.", "Each slide's photo is the agent's own."],
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
