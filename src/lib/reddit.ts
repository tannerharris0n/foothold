import type { RedditThread } from "./types";

const UA = "web:foothold-growth-operator:v0.1 (by /u/foothold_dev)";

interface RedditListing {
  data?: {
    children?: {
      data: {
        id: string;
        subreddit: string;
        title: string;
        selftext: string;
        permalink: string;
        score: number;
        num_comments: number;
        created_utc: number;
        author: string;
        over_18?: boolean;
      };
    }[];
  };
}

/**
 * Reddit's public JSON endpoints work without OAuth for light read traffic as
 * long as the User-Agent is descriptive. If you outgrow that, swap this for
 * the OAuth API; the shape returned here stays the same.
 */
export async function searchReddit(
  query: string,
  opts?: { subreddit?: string; limit?: number; time?: "day" | "week" | "month" },
): Promise<RedditThread[]> {
  const limit = opts?.limit ?? 10;
  const time = opts?.time ?? "week";
  const base = opts?.subreddit
    ? `https://www.reddit.com/r/${encodeURIComponent(opts.subreddit)}/search.json?restrict_sr=1&`
    : "https://www.reddit.com/search.json?";
  const url = `${base}q=${encodeURIComponent(query)}&sort=new&t=${time}&limit=${limit}&type=link`;

  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) throw new Error(`Reddit search failed (${res.status}) for "${query}"`);
  const json = (await res.json()) as RedditListing;
  return (json.data?.children ?? [])
    .map((c) => c.data)
    .filter((d) => !d.over_18 && d.author !== "[deleted]")
    .map((d) => ({
      id: d.id,
      subreddit: d.subreddit,
      title: d.title,
      body: (d.selftext || "").slice(0, 900),
      url: `https://www.reddit.com${d.permalink}`,
      score: d.score,
      comments: d.num_comments,
      createdUtc: d.created_utc,
      author: d.author,
    }));
}

/**
 * Run several listening queries and a few subreddit-scoped searches, dedupe,
 * and return the freshest threads. Failures on one query do not sink the batch.
 */
export async function listen(
  queries: string[],
  subreddits: string[],
  opts?: { perQuery?: number; max?: number },
): Promise<RedditThread[]> {
  const perQuery = opts?.perQuery ?? 6;
  const max = opts?.max ?? 25;
  const jobs: Promise<RedditThread[]>[] = [];

  for (const q of queries.slice(0, 6)) jobs.push(searchReddit(q, { limit: perQuery }).catch(() => []));
  for (const sub of subreddits.slice(0, 5)) {
    const q = queries[0] ?? "";
    if (q) jobs.push(searchReddit(q, { subreddit: sub, limit: perQuery }).catch(() => []));
  }

  const results = (await Promise.all(jobs)).flat();
  const seen = new Set<string>();
  return results
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .sort((a, b) => b.createdUtc - a.createdUtc)
    .slice(0, max);
}

export function subredditNames(communities: { platform: string; name: string }[]): string[] {
  return communities
    .filter((c) => c.platform === "reddit")
    .map((c) => c.name.replace(/^\/?r\//i, "").trim())
    .filter(Boolean);
}
