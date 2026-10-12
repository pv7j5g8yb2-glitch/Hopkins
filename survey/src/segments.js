// Was 10. Lowered after live testing showed the adaptive engine routinely used nearly all
// of it (completing at 8-9 questions, not stopping early), which is a lot of free-text
// typing to ask a stranger on a cold, unpaid, unincentivized survey, especially on mobile,
// where composing answers is slower and fatigue shows up as shorter, lazier late-question
// answers rather than a clean drop-off. 7 keeps the full 5-question baseline intact (still
// comparable across every respondent) while capping the adaptive depth at 2 follow-ups.
export const QUESTION_CAP = 7;
export const BASELINE_COUNT = 5;

export const segments = {
  bookkeepers: {
    niche: "bookkeepers",
    intro: [
      "Quick survey, nothing more, about how work goes for you day to day.",
      "There’s nothing to sign up for and nothing being sold to you here, this is pure research.",
      "Know that there are no right or wrong answers. The more specific you are with your answers, the more useful it is. Thanks.",
    ],
    baseline: [
      "What is the part of a typical client’s bookkeeping that eats the most of your time, and shouldn’t?",
      "How do you deal with that today?",
      "How often does that come up?",
      "What is that costing you? Even a rough number helps, in hours a week or however you’d measure it.",
      "If something fixed that properly, what would it be worth to you, per month, per client?",
    ],
  },
  "real-estate-agents": {
    niche: "real estate",
    intro: [
      "Quick survey, nothing more, about how work goes for you day to day.",
      "There’s nothing to sign up for and nothing being sold to you here, this is pure research.",
      "Know that there are no right or wrong answers. The more specific you are with your answers, the more useful it is. Thanks.",
    ],
    baseline: [
      "What part of your work eats up the most of your time, and shouldn’t?",
      "How do you deal with that today?",
      "How often does that come up?",
      "What is that costing you? Even a rough number helps, in hours a week or however you’d measure it.",
      "If something fixed that properly, what would it be worth to you, per month?",
    ],
  },
};

// A singular, personal label for a respondent in this niche, used on the homepage's "Are
// you a:" links, where the page is addressing them directly rather than describing the
// niche as a category. Falls back to the plural category name for any future niche added
// here without a custom label of its own.
export const ROLE_LABELS = {
  bookkeepers: "Bookkeeper",
  "real-estate-agents": "Working in real estate",
};

// Public link aliases: respondents see the alias in the URL, while responses are still
// stored under the canonical slug, so data and admin filtering never split in two.
export const SLUG_ALIASES = {
  "real-estate": "real-estate-agents",
};

export function resolveSlug(slug) {
  return SLUG_ALIASES[slug] ?? slug;
}

export function getSegment(slug) {
  return segments[slug] ?? null;
}

export function publicSlug(slug) {
  return Object.keys(SLUG_ALIASES).find((alias) => SLUG_ALIASES[alias] === slug) ?? slug;
}

export function listSegments() {
  return Object.entries(segments).map(([slug, segment]) => ({ slug, publicSlug: publicSlug(slug), niche: segment.niche }));
}
