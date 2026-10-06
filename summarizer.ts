import Anthropic from "@anthropic-ai/sdk";

export type Digest = { overview: string; takeaways: string[]; implication: string };

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const SYSTEM = `You are a senior editor producing a briefing on Economic Times commentary pieces for Indian business readers.
Use only facts present in the article; never invent figures. Respond with ONE JSON object and nothing else (no markdown fences):
{
  "overview": "2-3 punchy sentences stating the core argument",
  "takeaways": ["3 to 5 bullets covering data, arguments and policy points"],
  "implication": "Why this matters for Indian markets, corporate policy or the macro outlook (3-4 sentences)"
}`;

function parse(text: string): Digest {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON in model response");
  const j = JSON.parse(m[0]);
  const takeaways = Array.isArray(j.takeaways) ? j.takeaways.map(String).filter(Boolean).slice(0, 5) : [];
  if (!j.overview || !j.implication || takeaways.length < 3) throw new Error("Digest failed validation");
  return { overview: String(j.overview).trim(), takeaways, implication: String(j.implication).trim() };
}

export async function summarize(a: { headline: string; author: string; full_text: string }): Promise<Digest> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const user = `Headline: ${a.headline}\nAuthor: ${a.author}\n\nArticle:\n${a.full_text.slice(0, 24_000)}`;
  let lastErr: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        temperature: 0.2,
        system: SYSTEM,
        messages: [{ role: "user", content: user }],
      });
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      return parse(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Summarization failed: ${(lastErr as Error).message}`);
}
