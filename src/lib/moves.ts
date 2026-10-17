import { randomUUID } from "node:crypto";
import { askJSON } from "./ai";
import { playbooksForStage } from "./playbooks";
import { MOVES_SCHEMA } from "./schemas";
import { listen, subredditNames } from "./reddit";
import { getStore } from "./store";
import type { Audience, Audit, Move, MoveType, Product, RedditThread } from "./types";

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DraftMove {
  type: MoveType;
  channel: string;
  title: string;
  why: string;
  draft: string;
  targetUrl?: string;
  effortMinutes: number;
  playbookId: string;
}

/**
 * The daily loop:
 *   1. pull fresh threads where the audience is describing the pain
 *   2. look at what was already done or skipped (so we learn, not repeat)
 *   3. pick 3 to 5 playbooks that fit today and draft the content
 */
export async function generateDailyMoves(product: Product, opts?: { date?: string; count?: number }): Promise<Move[]> {
  const store = await getStore();
  const [audit, audience] = await Promise.all([store.getAudit(product.id), store.getAudience(product.id)]);
  if (!audit || !audience) throw new Error("Run the audit before generating moves.");

  const date = opts?.date ?? today();
  const count = opts?.count ?? 4;

  const since = new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10);
  const recent = (await store.listMoves(product.id)).filter((m) => m.date >= since);
  const threads = await listen(audience.listeningQueries, subredditNames(audience.communities)).catch(() => [] as RedditThread[]);

  const drafts = await draftMoves({ product, audit, audience, recent, threads, count });
  const now = new Date().toISOString();
  const moves: Move[] = drafts.map((d) => ({
    id: randomUUID(),
    productId: product.id,
    date,
    type: d.type,
    channel: d.channel,
    title: d.title,
    why: d.why,
    draft: d.draft,
    targetUrl: d.targetUrl,
    effortMinutes: d.effortMinutes,
    status: "pending",
    playbookId: d.playbookId,
    createdAt: now,
    updatedAt: now,
    source: "model",
  }));
  await store.addMoves(moves);
  return moves;
}

async function draftMoves(input: {
  product: Product;
  audit: Audit;
  audience: Audience;
  recent: Move[];
  threads: RedditThread[];
  count: number;
}): Promise<DraftMove[]> {
  const { product, audit, audience, recent, threads, count } = input;
  const playbooks = playbooksForStage(product.stage);

  const history = recent.length
    ? recent
        .map((m) => `- ${m.date} [${m.status}] ${m.playbookId ?? m.type} on ${m.channel}: ${m.title}`)
        .join("\n")
    : "(none yet, this is day one)";

  const threadBlock = threads.length
    ? threads
        .slice(0, 15)
        .map(
          (t, i) =>
            `#${i + 1} r/${t.subreddit} (${t.score} pts, ${t.comments} comments, ${Math.round(
              (Date.now() / 1000 - t.createdUtc) / 3600,
            )}h ago)\nTitle: ${t.title}\nURL: ${t.url}\nBody: ${t.body.replace(/\s+/g, " ").slice(0, 500)}`,
        )
        .join("\n\n")
    : "(no fresh threads found today; lean on non-reply playbooks)";

  const out = await askJSON<{ moves: DraftMove[] }>(
    `Plan today's growth moves for ${product.name} (${product.url}), founder stage: ${product.stage}.

Positioning: ${JSON.stringify(audit.positioning)}
Open high-severity findings: ${audit.findings
      .filter((f) => f.severity === "high")
      .map((f) => `${f.id}: ${f.title}`)
      .join("; ") || "none"}
ICP: ${audience.icp.map((i) => `${i.title} (pains: ${i.pains.slice(0, 3).join(", ")})`).join(" | ")}
Banned phrases: ${audience.bannedPhrases.join(", ")}
Founder voice notes: ${product.voice || "plain, direct, practitioner"}

Available playbooks (pick only from these ids, respect their rules and weekly caps):
${playbooks.map((p) => `- ${p.id} [${p.type}/${p.channel}, ~${p.effortMinutes} min, max ${p.maxPerWeek}/wk]: ${p.name}. When: ${p.when}. Rules: ${p.rules.join(" ")}`).join("\n")}

Moves from the last 14 days (do not repeat a fix that is done; if a playbook was skipped twice, try another):
${history}

Fresh threads found in the last week where the pain is being discussed:
${threadBlock}

Return JSON: { "moves": [ { "playbookId": "...", "type": "...", "channel": "...", "title": "imperative, under 12 words", "why": "one sentence tying it to the audit, a thread, or a result", "draft": "the complete content, ready to paste: the full reply or post text, the exact copy change with before/after, the DM text, or the step list for a setup move", "targetUrl": "thread or page URL when relevant", "effortMinutes": 5-45 } ] }
Exactly ${count} moves. At least one must be a reply to a real thread above if any thread is a genuine fit; never reply to a thread that is not a fit just to hit the quota. Total effort under 75 minutes. Drafts must read like a peer wrote them.`,
    MOVES_SCHEMA,
  );

  const valid = new Set(playbooks.map((p) => p.id));
  return out.moves
    .filter((m) => m.draft && m.title)
    .map((m) => ({
      ...m,
      playbookId: valid.has(m.playbookId) ? m.playbookId : playbooks[0].id,
      effortMinutes: Math.min(60, Math.max(3, Number(m.effortMinutes) || 10)),
    }))
    .slice(0, count);
}
