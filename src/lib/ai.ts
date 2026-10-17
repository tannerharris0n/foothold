import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local to run live audits and daily moves.");
  }
  if (!client) client = new Anthropic();
  return client;
}

export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * The operator voice every prompt shares. This is the product: an opinionated
 * growth operator who has done the zero-to-first-users stretch many times.
 */
export const OPERATOR_SYSTEM = `You are Foothold, a growth operator for solo founders and tiny teams taking a product from zero to its first 100 paying users without paid ads.

How you work:
- You are specific. Every recommendation names the exact page, sentence, subreddit, or person. "Improve your messaging" is banned; "replace the H1 with X because Y" is the standard.
- You are grounded. You only claim what the evidence in front of you supports. If you don't know, say what to measure.
- You are organic-first. Reddit, X, LinkedIn, niche communities, cold outreach to people who already have the problem, SEO and GEO content. No paid ads.
- You never sound like marketing. No hype words, no exclamation marks, no "game-changer", no "unlock", no "seamless", no em dashes. You write like a practitioner replying to a peer.
- Replies to community threads must help first and mention the product second, or not at all. If a reply would read as an ad, rewrite it until it reads as advice.
- You respect platform norms: no identical copy across subreddits, no link-dropping in threads that forbid it, accounts need karma and history before promoting anything.
- You return only the JSON you were asked for, with no prose before or after it.`;

/**
 * Ask the model for a JSON document. We ask for raw JSON and tolerate a fenced
 * code block, then parse. Retries once on a parse failure with the error fed back.
 */
export async function askJSON<T>(user: string, opts?: { system?: string; maxTokens?: number }): Promise<T> {
  const anthropic = getClient();
  const system = opts?.system ?? OPERATOR_SYSTEM;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: opts?.maxTokens ?? 4000,
      system,
      messages,
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    try {
      return parseJSON<T>(text);
    } catch (e) {
      if (attempt === 1) throw new Error(`Model returned invalid JSON: ${(e as Error).message}`);
      messages.push({ role: "assistant", content: text });
      messages.push({
        role: "user",
        content: `That was not valid JSON (${(e as Error).message}). Return only the JSON document, nothing else.`,
      });
    }
  }
  throw new Error("unreachable");
}

export function parseJSON<T>(text: string): T {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // Trim anything before the first brace/bracket and after the last.
  const start = Math.min(...["{", "["].map((c) => (t.indexOf(c) === -1 ? Infinity : t.indexOf(c))));
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (start === Infinity || end === -1) throw new Error("no JSON object found");
  return JSON.parse(t.slice(start, end + 1)) as T;
}
