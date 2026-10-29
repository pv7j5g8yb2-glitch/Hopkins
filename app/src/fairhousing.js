// Fair housing checks for every piece of ad copy, Hopkins' own and the agent's.
//
// The US Fair Housing Act bars ads that state or suggest a preference for or against
// people by race, colour, religion, sex, disability, familial status or national origin.
// HUD's guidance on ad wording names the usual traps; brokerages add a few cautious ones
// on top. "block" terms are rewritten before anything is shown or run. "caution" terms are
// pointed out with a better wording, and the agent decides.
//
// This is a wording check, not legal advice, and the app says so where it shows results.

const RULES = [
  // Familial status
  { re: /\b(perfect|ideal|great|made) for (young )?(families|a family|kids|children)\b/i, level: "block", why: "names who the home suits by family status", fix: "with room to spread out" },
  { re: /\bfamily[- ]friendly\b/i, level: "block", why: "suggests a preference for families", fix: "with room to spread out" },
  { re: /\bfamily (neighbou?rhood|street|area|community)\b/i, level: "block", why: "describes the neighbours by family status", fix: "quiet street" },
  { re: /\b(no (kids|children)|adults? only|child[- ]free)\b/i, level: "block", why: "excludes people by family status", fix: "" },
  { re: /\b(empty[- ]nesters?|retirees|newlyweds|young professionals|couples|singles)\b/i, level: "block", why: "describes the buyer instead of the home", fix: "anyone" },
  { re: /\b(mature|older) (buyers?|persons?|people|residents?|couples?)\b/i, level: "block", why: "names an age group", fix: "" },
  { re: /\bstudents?\b/i, level: "caution", why: "can read as a preference for or against a group", fix: "" },
  // Rentals: source of income is protected in many states and cities, and occupancy limits by
  // who the tenant is are familial status (2026-10-29).
  { re: /\b(no (section 8|vouchers?|housing (vouchers?|assistance)|hcv)|section 8 not accepted|vouchers? not accepted)\b/i, level: "block", why: "source of income is protected in many states and cities", fix: "" },
  { re: /\b(students|professionals|working professionals) only\b/i, level: "block", why: "limits who can rent by who they are", fix: "" },
  { re: /\b(ideal|perfect|suits?|suitable) for (a )?(single (person|professional)|one person|a couple)\b/i, level: "block", why: "names who the home suits by family status", fix: "" },
  { re: /\bmature tenants?\b/i, level: "block", why: "names an age group", fix: "" },
  // Sex
  { re: /\bbachelor pad\b/i, level: "block", why: "suggests a preference by sex and family status", fix: "one bedroom retreat" },
  { re: /\b(man cave|she shed)\b/i, level: "caution", why: "describes a room by sex", fix: "bonus room" },
  { re: /\bmaster (bed)?(room|suite|bath)\b/i, level: "caution", why: "most MLSs now say primary", fix: "primary $1$2" },
  { re: /\bhis and hers\b/i, level: "caution", why: "describes the buyers by sex", fix: "double" },
  // Disability
  { re: /\b(able[- ]bodied|no wheelchairs?|not for (the )?(disabled|handicapped))\b/i, level: "block", why: "excludes people with a disability", fix: "" },
  { re: /\bhandicap(ped)?\b/i, level: "caution", why: "say what the home has instead", fix: "accessible" },
  { re: /\bmother[- ]in[- ]law (suite|unit|apartment|quarters)\b/i, level: "caution", why: "names who would live there", fix: "guest $1" },
  // Religion, race, national origin
  { re: /\b(christian|jewish|muslim|catholic|hindu)( home| family| community| neighbou?rhood)\b/i, level: "block", why: "names a religion", fix: "" },
  { re: /\b(white|black|asian|hispanic|latino|ethnic|integrated|segregated) (neighbou?rhood|area|community|street)\b/i, level: "block", why: "describes the neighbours by race or origin", fix: "neighborhood" },
  { re: /\b(exclusive|restricted) (neighbou?rhood|community|enclave|area)\b/i, level: "block", why: "has been used to signal who isn't welcome", fix: "private $2" },
  { re: /\bexclusive\b/i, level: "caution", why: "has been used to signal who isn't welcome", fix: "private" },
  // Subjective safety and school claims
  { re: /\b(safe|crime[- ]free|low[- ]crime) (neighbou?rhood|area|street|community)\b/i, level: "caution", why: "a safety claim can't be backed up and can read as code", fix: "quiet $2" },
  { re: /\b(best|great|good|top) schools?\b/i, level: "caution", why: "a judgement on schools; name the school district instead", fix: "" },
];

export function checkWording(text) {
  if (!text) return [];
  const found = [];
  for (const rule of RULES) {
    const m = text.match(rule.re);
    if (m) found.push({ term: m[0], level: rule.level, why: rule.why, suggestion: rule.fix ? m[0].replace(rule.re, rule.fix).trim() : "" });
  }
  // A caution term inside a block match is the same issue reported twice.
  return found.filter((f, i) => !found.some((g, j) => j !== i && g.level === "block" && g.term !== f.term && g.term.toLowerCase().includes(f.term.toLowerCase())));
}

// Rewrites "block" terms so copy Hopkins writes never carries them. Caution terms are left
// for the agent to see, except where a plain swap is clearly better.
export function cleanWording(text) {
  if (!text) return text;
  let out = text;
  for (const rule of RULES) {
    if (rule.level !== "block" && !/^primary|^guest|^accessible/.test(rule.fix)) continue;
    const re = new RegExp(rule.re.source, rule.re.flags.includes("g") ? rule.re.flags : rule.re.flags + "g");
    out = out.replace(re, (...args) => {
      const match = args[0];
      return rule.fix ? match.replace(rule.re, rule.fix) : "";
    });
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").replace(/^\s*[,.]\s*/, "").trim();
}

// What a housing ad on Meta is allowed to do. Meta requires the Housing special ad
// category for real estate: no age, gender or ZIP code targeting, and a radius of at least
// 15 miles around a location. Hopkins sets these itself; the agent never has to.
export const HOUSING_AUDIENCE = {
  category: "Housing",
  ages: "18 to 65+, fixed by Meta for housing ads",
  genders: "All",
  minRadiusMiles: 15,
  zipTargeting: false,
  detailedExclusions: false,
};

export function audienceFor(listing, radiusMiles = 15) {
  const radius = Math.max(HOUSING_AUDIENCE.minRadiusMiles, Number(radiusMiles) || 15);
  return {
    category: HOUSING_AUDIENCE.category,
    location: [listing.city, listing.area].filter(Boolean).reverse().join(", ") || "the listing's city",
    radiusMiles: radius,
    ages: HOUSING_AUDIENCE.ages,
    genders: HOUSING_AUDIENCE.genders,
    placements: "Instagram and Facebook feeds, Stories and Reels",
  };
}
