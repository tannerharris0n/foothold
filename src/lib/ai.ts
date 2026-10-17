import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local to run live audits and daily moves.");
  }
  if (!client) {
    // Keys that are not scoped to a workspace must name one on every request.
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
    client = new Anthropic({
      defaultHeaders: workspace ? { "anthropic-workspace-id": workspace } : undefined,
    });
  }
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
 * Ask the model for a JSON document. The model is forced to call an `emit`
 * tool whose input is the document, so the API validates the JSON for us and
 * we never parse prose. If the reply is cut off by max_tokens we say so
 * instead of returning a half document.
 */
export async function askJSON<T>(user: string, opts?: { system?: string; maxTokens?: number }): Promise<T> {
  const anthropic = getClient();
  const system = opts?.system ?? OPERATOR_SYSTEM;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  const tool: Anthropic.Tool = {
    name: "emit",
    description: "Return the requested JSON document as this tool's input, matching the shape described in the request exactly.",
    input_schema: { type: "object", properties: {}, additionalProperties: true },
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: opts?.maxTokens ?? 8000,
      system,
      messages,
      tools: [tool],
      tool_choice: { type: "tool", name: "emit" },
    });
    if (res.stop_reason === "max_tokens") {
      throw new Error("The model's reply was cut off by the token limit. Raise maxTokens for this call.");
    }
    const call = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (call && call.input && typeof call.input === "object") return call.input as T;

    // Very rare: the model answered in text despite tool_choice. Try to parse it, then retry once.
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    try {
      return parseJSON<T>(text);
    } catch (e) {
      if (attempt === 1) throw new Error(`Model returned invalid JSON: ${(e as Error).message}`);
      messages.push({ role: "assistant", content: res.content });
      messages.push({ role: "user", content: "Call the emit tool with the JSON document as its input." });
    }
  }
  throw new Error("unreachable");
}

/** Lenient parse for the text fallback: fenced block, surrounding prose, trailing commas. */
export function parseJSON<T>(text: string): T {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = Math.min(...["{", "["].map((c) => (t.indexOf(c) === -1 ? Infinity : t.indexOf(c))));
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (start === Infinity || end === -1) throw new Error("no JSON object found");
  const body = t.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(body) as T;
}
