// One place for every model call. Works with any provider that speaks the OpenAI chat format.
// The key lives in .env.local on the server and is never sent to the browser or written to the repo.

export const llmConfigured = () => Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL && process.env.LLM_MODEL);

export type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function chat(messages: Msg[], opts: { maxTokens?: number } = {}): Promise<string> {
  if (!llmConfigured()) throw new Error("No model is connected yet.");
  const res = await fetch(`${process.env.LLM_BASE_URL!.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LLM_API_KEY}` },
    body: JSON.stringify({ model: process.env.LLM_MODEL, messages, max_tokens: opts.maxTokens ?? 1500 }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`The model service replied ${res.status}.`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("The model service sent an empty reply.");
  return text;
}
