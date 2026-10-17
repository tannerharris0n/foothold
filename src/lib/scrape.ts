import * as cheerio from "cheerio";
import type { SiteSnapshot } from "./types";

const UA = "Mozilla/5.0 (compatible; FootholdBot/0.1; +https://foothold.local)";

async function fetchHtml(url: string, timeoutMs = 12000): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      redirect: "follow",
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  const parsed = new URL(u);
  parsed.hash = "";
  return parsed.toString();
}

const SOCIAL_PROOF = [
  /\b\d[\d,.]*\+?\s*(users|customers|founders|teams|companies|builders|developers)\b/i,
  /\btrusted by\b/i,
  /\bas seen (on|in)\b/i,
  /\btestimonial/i,
  /\bcase stud/i,
  /\b(★|⭐|stars?)\b/i,
  /\bbacked by\b/i,
];

const ANALYTICS: [RegExp, string][] = [
  [/googletagmanager\.com|gtag\(/i, "Google Analytics / GTM"],
  [/plausible\.io/i, "Plausible"],
  [/posthog/i, "PostHog"],
  [/usefathom|fathom\.js/i, "Fathom"],
  [/connect\.facebook\.net|fbq\(/i, "Meta Pixel"],
  [/clarity\.ms/i, "Microsoft Clarity"],
  [/hotjar/i, "Hotjar"],
  [/segment\.com|analytics\.js/i, "Segment"],
  [/mixpanel/i, "Mixpanel"],
  [/umami/i, "Umami"],
  [/vercel\/analytics|va\.vercel-scripts/i, "Vercel Analytics"],
];

/**
 * Pull the facts an operator would look for on a landing page. This is not a
 * full crawl; it is the homepage plus the pricing page if linked.
 */
export async function snapshotSite(rawUrl: string): Promise<SiteSnapshot> {
  const url = normalizeUrl(rawUrl);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  $("script, style, noscript, svg").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)));

  const ctas = uniq(
    $("a, button")
      .map((_, el) => clean($(el).text()))
      .get()
      .filter((t) => t.length > 1 && t.length < 40)
      .filter((t) =>
        /start|try|get|sign|book|demo|join|buy|download|subscribe|request|free|pricing|talk|waitlist/i.test(t),
      ),
  ).slice(0, 15);

  const pricingMentions = uniq(
    (text.match(/(\$|€|£)\s?\d[\d,.]*(\s?\/\s?(mo|month|yr|year|user|seat))?/gi) ?? []).map(clean),
  ).slice(0, 12);

  const socialProofSignals = uniq(
    SOCIAL_PROOF.flatMap((re) => {
      const m = text.match(re);
      return m ? [m[0]] : [];
    }),
  );

  const analytics = uniq(ANALYTICS.filter(([re]) => re.test(html)).map(([, name]) => name));

  let pricingPageText: string | undefined;
  const pricingHref = $("a[href*='pricing']").first().attr("href");
  if (pricingHref) {
    try {
      const pricingUrl = new URL(pricingHref, url).toString();
      if (pricingUrl !== url) {
        const ph = await fetchHtml(pricingUrl, 8000);
        const $$ = cheerio.load(ph);
        $$("script, style, noscript, svg").remove();
        pricingPageText = $$("body").text().replace(/\s+/g, " ").trim().slice(0, 2500);
      }
    } catch {
      // pricing page is a bonus, not a requirement
    }
  }

  return {
    url,
    fetchedAt: new Date().toISOString(),
    title: clean($("title").first().text()),
    description: clean($('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? ""),
    h1: uniq($("h1").map((_, el) => clean($(el).text())).get()).slice(0, 5),
    h2: uniq($("h2").map((_, el) => clean($(el).text())).get()).slice(0, 20),
    ctas,
    pricingMentions,
    socialProofSignals,
    analytics,
    hasForm: $("form").length > 0 || $("input[type=email]").length > 0,
    wordCount: text.split(" ").length,
    textSample: text.slice(0, 6000),
    pricingPageText,
  };
}

/** Best-effort product name from a snapshot. */
export function guessName(s: SiteSnapshot): string {
  // Titles are usually "Tagline | Brand" or "Brand - Tagline". The brand is
  // the shortest segment that is not a generic word.
  const segments = s.title
    .split(/\s[|\-–—:]\s|\s\|\s|\|/)
    .map((x) => x.trim())
    .filter((x) => x && x.length <= 30 && !/^(home|welcome|pricing|login)$/i.test(x));
  segments.sort((a, b) => a.length - b.length);
  try {
    const host = new URL(s.url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    const fromHost = base.charAt(0).toUpperCase() + base.slice(1);
    // Prefer a title segment that matches the domain; otherwise the shortest.
    const match = segments.find((x) => x.toLowerCase().includes(base.toLowerCase()));
    if (match) return match;
    if (/^\d+$/.test(base) || base === "localhost") return segments[0] ?? "Your product";
    return segments[0] && segments[0].length <= fromHost.length + 12 ? segments[0] : fromHost;
  } catch {
    return segments[0] || "Your product";
  }
}
