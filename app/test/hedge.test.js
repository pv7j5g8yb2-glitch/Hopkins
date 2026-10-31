import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./helpers.js";

// Free Gemini now and then hangs for minutes. When it hasn't answered in time, Groq is asked too
// and the first answer wins, so a simple question never waits on Gemini's timeouts.
await boot({ ANTHROPIC_API_KEY: "", GEMINI_API_KEY: "test-gemini", GROQ_API_KEY: "test-groq", GROQ_BACKUP_MODELS: "", AI_HEDGE_MS: "150" });
const brain = await import("../src/brain.js");

const asked = [];
let gemini = "hang";
brain.setFetchForTests(async (url, init) => {
  const who = url.includes("groq") ? "groq" : "gemini";
  asked.push(who);
  if (who === "groq") return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: "Instagram access" }) } }] }) };
  if (gemini === "hang") await new Promise((r) => setTimeout(r, 3000));
  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "From Gemini" }) }] } }] }) };
});

test("a slow Gemini: Groq is asked too and its answer comes first", async () => {
  assert.equal(brain.provider, "gemini");
  const t0 = Date.now();
  assert.equal(await brain.titleAI("Hey do you have access to my Instagram?"), "Instagram access");
  assert.ok(Date.now() - t0 < 2000, "didn't wait for Gemini");
  assert.deepEqual(asked, ["gemini", "groq"]);
});

test("a quick Gemini answers on its own, and Groq is never asked", async () => {
  asked.length = 0;
  gemini = "quick";
  assert.equal(await brain.titleAI("Email to a quiet buyer"), "From Gemini");
  assert.deepEqual(asked, ["gemini"]);
});
