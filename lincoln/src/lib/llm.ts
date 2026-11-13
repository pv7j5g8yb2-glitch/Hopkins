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

type Block = { type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } };

// Large reads run one at a time: the provider reserves credit for each request while it runs,
// and parallel reads of long files can exceed it. A dropped stream is retried twice.
let queue: Promise<unknown> = Promise.resolve();

/** Reads page images with the Messages API. Queued, retried, and streamed so long answers do not time out. */
export function readPages(system: string, pages: { n: number; jpeg: Buffer }[], instruction: string, maxTokens = 16000): Promise<string> {
  const run = queue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await readPagesOnce(system, pages, instruction, maxTokens);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (attempt >= 2 || !/interrupt|overload|timeout|terminated|replied (429|5\d\d)/i.test(msg)) throw e;
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      }
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

async function readPagesOnce(system: string, pages: { n: number; jpeg: Buffer }[], instruction: string, maxTokens = 16000): Promise<string> {
  if (!llmConfigured()) throw new Error("No model is connected.");
  const content: Block[] = [];
  for (const p of pages) {
    content.push({ type: "text", text: `Page ${p.n}` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: p.jpeg.toString("base64") } });
  }
  content.push({ type: "text", text: instruction });
  const base = process.env.LLM_BASE_URL!.replace(/\/$/, "").replace(/\/v1$/, "");
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.LLM_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.LLM_MODEL, max_tokens: maxTokens, stream: true, system, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(600_000),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    const msg = /"message"\s*:\s*"([^"]{1,200})"/.exec(detail)?.[1];
    throw new Error(`The model service replied ${res.status}${msg ? `: ${msg}` : ""}.`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      try {
        const ev = JSON.parse(line.slice(5));
        if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") out += ev.delta.text;
        if (ev.type === "error") throw new Error(ev.error?.message ?? "The model service reported an error.");
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  if (!out) throw new Error("The model service sent an empty reply.");
  return out;
}

/** Pulls the JSON object out of a model reply, tolerating code fences or stray text around it. */
export function parseJson<T>(text: string): T {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("The model reply was not in the expected format.");
  return JSON.parse(text.slice(a, b + 1)) as T;
}
