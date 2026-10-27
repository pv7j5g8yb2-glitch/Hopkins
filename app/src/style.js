// How an ad looks, beyond its words: the colours, font, layout and so on that the renderer
// (web/creative.js) reads from ad.style. One place checks every change, whether it comes from
// the chat (a model or the built-in rules) or the Style sheet, so nothing odd ever gets saved.

export const LAYOUTS = ["fade", "top", "split", "card", "frame"];
// face: the agent's own photo in the bottom right corner (2026-10-27, Ismael asked for his face).
const ENUMS = { font: ["modern", "classic"], layout: LAYOUTS, align: ["left", "center"], focus: ["top", "center", "bottom"], fade: ["light", "normal", "strong"], face: ["on", "off"] };
const COLOURS = ["bg", "accent", "text"];
export const STYLE_KEYS = [...COLOURS, ...Object.keys(ENUMS), "size"];

// Everyday colour words, for when the agent says "make it green" and no model is there to
// turn it into a hex value. Tuned to look good on an ad, not the pure web colours.
export const COLOUR_WORDS = {
  black: "#111111", white: "#FFFFFF", cream: "#F4EBDD", beige: "#E8DCC8", ivory: "#FBF7EE", sand: "#D9C7A7",
  navy: "#1F2A44", blue: "#1E4E8C", "light blue": "#9CC3E6", "sky blue": "#9CC3E6", teal: "#1F6F6B", turquoise: "#2A9D8F",
  green: "#2F5D46", "dark green": "#1E3A2B", sage: "#8A9A7B", olive: "#5C6B3A", emerald: "#1F7A55",
  red: "#9B2C2C", burgundy: "#6D1F2C", maroon: "#5A1A24", oxblood: "#2A0F14", wine: "#5A1A2C",
  pink: "#E8B4C0", blush: "#F1D3D3", purple: "#5B4873", plum: "#5B4873", lilac: "#B79DC2", lavender: "#C9B8DE",
  orange: "#D9822B", terracotta: "#C0603F", rust: "#9C4A26", yellow: "#E9C46A", gold: "#D7AE62", mustard: "#C9A227",
  brown: "#6B4A35", tan: "#C2A27C", taupe: "#8B7D72", grey: "#5F6368", gray: "#5F6368", "light grey": "#D9D9D9",
  "light gray": "#D9D9D9", charcoal: "#2B2B2B", silver: "#C0C0C0", slate: "#3E4C59",
};

const hex = (v) => {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  if (COLOUR_WORDS[t]) return COLOUR_WORDS[t];
  const m = t.match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return "#" + h.toUpperCase();
};

// The cleaned changes: a valid value sets the key, "" or null clears it (back to the default),
// anything else is ignored. "reset": true clears the whole look.
export function cleanStyle(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  if (input.reset === true) return { reset: true };
  for (const k of COLOURS) {
    if (!(k in input)) continue;
    if (input[k] === "" || input[k] === null) out[k] = null;
    else if (hex(input[k])) out[k] = hex(input[k]);
  }
  for (const [k, allowed] of Object.entries(ENUMS)) {
    if (!(k in input)) continue;
    if (input[k] === "" || input[k] === null) out[k] = null;
    else if (allowed.includes(String(input[k]).toLowerCase())) out[k] = String(input[k]).toLowerCase();
  }
  if ("size" in input) {
    const n = Number(input.size);
    if (input.size === "" || input.size === null || n === 0) out.size = null;
    else if (Number.isFinite(n)) out.size = Math.round(Math.min(1.4, Math.max(0.7, n)) * 100) / 100;
  }
  return out;
}

// An ad's style with the changes applied. Keys the renderer doesn't know (length, voice and the
// other wording choices kept in the same place) are left alone.
export function mergeStyle(current = {}, changes = {}) {
  const next = { ...current };
  if (changes.reset) for (const k of STYLE_KEYS) delete next[k];
  for (const [k, v] of Object.entries(changes)) {
    if (k === "reset") continue;
    if (v === null) delete next[k];
    else next[k] = v;
  }
  return next;
}

// A short plain description, for the model's context and for replies.
export function describeStyle(style = {}) {
  const parts = [];
  if (style.layout) parts.push(`${style.layout} layout`);
  if (style.bg) parts.push(`background ${style.bg}`);
  if (style.accent) parts.push(`accent ${style.accent}`);
  if (style.text) parts.push(`text ${style.text}`);
  if (style.font) parts.push(`${style.font} font`);
  if (style.size) parts.push(`text size ${style.size}x`);
  if (style.align) parts.push(`${style.align} aligned`);
  if (style.face === "on") parts.push("the agent's photo in the bottom right corner");
  if (style.focus) parts.push(`photo shows the ${style.focus}`);
  if (style.fade) parts.push(`${style.fade} fade`);
  return parts.join(", ") || "brand defaults";
}

// Models reach for pure web colours (#FFD700 gold, #FF0000 red). Those look cheap on an ad, so
// they're swapped for the tuned versions above.
const HARSH = { "#FFD700": "gold", "#FFC000": "gold", "#DAA520": "gold", "#FF0000": "red", "#008000": "green", "#00FF00": "green", "#0000FF": "blue", "#000080": "navy", "#800080": "purple", "#FFA500": "orange", "#FFFF00": "yellow", "#808080": "grey", "#A52A2A": "brown", "#FFC0CB": "pink", "#800000": "maroon", "#000000": "black" };
export const softenColour = (h) => (h && HARSH[h.toUpperCase()] ? COLOUR_WORDS[HARSH[h.toUpperCase()]] : h);

// A model fills in every style field it's given, which would quietly change things nobody asked
// for. Each part only changes when the agent's message is about it.
const ASKED = {
  bg: /colou?r|background|bg|backdrop|look|style|luxur|brand|dark|light|tone|\b(black|white|navy|blue|green|red|burgundy|maroon|cream|beige|grey|gray|pink|purple|plum|brown|teal|sage|olive|gold|orange|yellow|charcoal|ivory|sand|wine|rust|terracotta|emerald|slate|#[0-9a-f]{3,6})\b/,
  // "grey color background" is about the background, not the label (2026-10-27: it let a
  // black label through). Plural "colours" still means the whole look.
  accent: /accent|label|price|highlight|colou?rs\b|luxur|brand|look|style/,
  // Only when a colour is said near the words, not for "put the text at the top".
  text: /(text|words|writing|letters|headline|title|font)( colou?r)?\s+(in |to |be |is |that's |)?(black|white|cream|ivory|gold|navy|dark|light|#[0-9a-f]{3,6}|[a-z]+ colou?r)|\b(black|white|cream|ivory|gold|navy|dark|light|#[0-9a-f]{3,6})\s+(text|words|writing|letters|headline|title|font)|font colou?r|text colou?r|readab|contrast|hard to read|can't read/,
  font: /font|serif|classic|modern|type|typeface|luxur|elegant|editorial|bold|look|style/,
  // "My face in the bottom right" is about the photo of them, not the layout.
  layout: /layout|\b(top|bottom)\b(?!\s*(right|left|corner))|split|card|frame|border|fade|full|bleed|block|photo (above|on top)|arrange|design/,
  size: /big|small|size|larger|tiny|huge|bolder/,
  align: /cent(er|re)|left|align|middle/,
  focus: /crop|sky|roof|show more|top of the photo|bottom of the photo|focus|photo higher|photo lower|lawn|driveway/,
  fade: /fade|overlay|gradient|tint|shadow|darker|lighter|dim/,
  face: /face|headshot|my (photo|picture|pic)|(photo|picture|pic) of me|myself|me in the/,
};
export function onlyAsked(changes, message = "") {
  if (changes.reset) return changes;
  const low = String(message).toLowerCase();
  const out = {};
  for (const [k, v] of Object.entries(changes)) {
    if (!ASKED[k] || ASKED[k].test(low)) out[k] = ["bg", "accent", "text"].includes(k) ? softenColour(v) : v;
  }
  return out;
}

// The change in words, for Hopkins' reply: "a green background and a gold label".
const NAME_FOR = Object.fromEntries(Object.entries(COLOUR_WORDS).reverse().map(([n, h]) => [h, n]));
const LAYOUT_WORDS = { fade: "the full photo layout", top: "the line at the top", split: "the photo above a solid block", card: "the card layout", frame: "the photo in a frame" };
export const colourName = (h) => NAME_FOR[h] || h;
export function sayLook(changes = {}, sizeStep = 0) {
  if (changes.reset) return "your brand look back";
  const colour = colourName;
  const parts = [];
  if (changes.bg) parts.push(`a ${colour(changes.bg)} background`);
  if (changes.accent) parts.push(`a ${colour(changes.accent)} label`);
  if (changes.text) parts.push(`${colour(changes.text)} text`);
  if (changes.font) parts.push(changes.font === "classic" ? "the classic serif font" : "the modern bold font");
  if (changes.layout) parts.push(LAYOUT_WORDS[changes.layout]);
  const step = sizeStep || (changes.size ? changes.size - 1 : 0);
  if (step) parts.push(step > 0 ? "bigger text" : "smaller text");
  if (changes.align) parts.push(changes.align === "center" ? "centered text" : "left aligned text");
  if (changes.focus) parts.push(changes.focus === "center" ? "the photo centered" : `more of the ${changes.focus} of the photo`);
  if (changes.fade) parts.push(`a ${changes.fade === "normal" ? "normal" : changes.fade === "light" ? "lighter" : "stronger"} fade`);
  if (changes.face) parts.push(changes.face === "on" ? "your photo in the bottom right corner" : "no photo of you");
  if (!parts.length) return "the new look";
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

// WCAG contrast between two hex colours: 1 is the same colour, 21 is black on white.
const lum = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a, b) {
  if (!hex(a) || !hex(b)) return 21;
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// The changes minus any colour that wouldn't read on the background it ends up on: black text
// on navy, a navy label on navy. The text then picks light or dark by itself. What was dropped
// comes back so the reply doesn't claim it.
export function keepReadable(changes, current = {}, brandBg = "#1F2A36") {
  if (changes.reset) return { changes, dropped: [] };
  const bg = changes.bg !== undefined ? changes.bg || brandBg : current.bg || brandBg;
  const out = { ...changes };
  const dropped = [];
  if (out.text && contrast(out.text, bg) < 3) { delete out.text; dropped.push("text"); }
  // The renderer nudges a label that's a little close (gold on cream); one that's nearly the
  // background itself is left out.
  if (out.accent && contrast(out.accent, bg) < 1.25) { delete out.accent; dropped.push("accent"); }
  // A new background can make the colours already set unreadable, so those go back to automatic.
  if (changes.bg) {
    if (current.text && !("text" in out) && contrast(current.text, bg) < 3) out.text = null;
    if (current.accent && !("accent" in out) && contrast(current.accent, bg) < 1.25) out.accent = null;
  }
  return { changes: out, dropped };
}
