// A person's name always starts each part with a capital letter, whatever was typed: first,
// middle and last names, and each side of a hyphen or apostrophe ("mary-jane o'brien" is
// "Mary-Jane O'Brien"). Only first letters change, so "McDonald" and "DeShawn" stay as typed
// (Ismael, 2026-10-28).
export function nameCase(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ").replace(/(^|[\s\-'’.])(\p{Ll})/gu, (m, before, letter) => before + letter.toUpperCase());
}
