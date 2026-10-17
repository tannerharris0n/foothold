import { randomUUID } from "node:crypto";
import { askJSON } from "./ai";
import { AUDIENCE_SCHEMA, AUDIT_SCHEMA, ROADMAP_SCHEMA } from "./schemas";
import type { Audience, Audit, Product, Roadmap, SiteSnapshot } from "./types";

function describeSnapshot(s: SiteSnapshot) {
  return [
    `URL: ${s.url}`,
    `Title: ${s.title}`,
    `Meta description: ${s.description || "(none)"}`,
    `H1: ${s.h1.join(" | ") || "(none)"}`,
    `H2s: ${s.h2.join(" | ") || "(none)"}`,
    `CTAs found: ${s.ctas.join(", ") || "(none)"}`,
    `Pricing mentions: ${s.pricingMentions.join(", ") || "(none)"}`,
    `Social proof signals: ${s.socialProofSignals.join(", ") || "(none)"}`,
    `Analytics detected: ${s.analytics.join(", ") || "(none)"}`,
    `Has signup form or email input: ${s.hasForm}`,
    `Word count: ${s.wordCount}`,
    `Page text (first 6000 chars):\n${s.textSample}`,
    s.pricingPageText ? `Pricing page text:\n${s.pricingPageText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function runAudit(product: Product, snapshot: SiteSnapshot): Promise<Audit> {
  const out = await askJSON<Omit<Audit, "productId" | "createdAt">>(
    `Audit this product's landing page as a growth operator would on day one. Founder stage: ${product.stage}. ${
      product.oneLiner ? `Founder's one-liner: ${product.oneLiner}` : ""
    }

${describeSnapshot(snapshot)}

Return JSON with this exact shape:
{
  "summary": "3 sentences. What the page is trying to do, what is working, what is in the way.",
  "positioning": {
    "who": "the single buyer this page should speak to",
    "problem": "the problem in the buyer's words",
    "promise": "what changes for them, concretely",
    "proof": "what evidence the page offers, or 'none yet' and what the cheapest proof would be",
    "rewrite": { "headline": "...", "subheadline": "...", "cta": "..." }
  },
  "findings": [
    { "id": "f1", "area": "positioning|landing|pricing|onboarding|analytics|seo|trust", "severity": "high|medium|low",
      "title": "short", "evidence": "what on the page shows this", "fix": "exact change to make" }
  ],
  "score": 0-100
}
Give 5 to 9 findings, ordered by severity. The score is how ready this funnel is to convert cold organic traffic; most pre-traction pages land between 35 and 65.`,
    AUDIT_SCHEMA,
  );

  return {
    ...out,
    findings: out.findings.map((f, i) => ({ ...f, id: f.id || `f${i + 1}` })),
    productId: product.id,
    createdAt: new Date().toISOString(),
  };
}

export async function runAudience(product: Product, snapshot: SiteSnapshot, audit: Audit): Promise<Audience> {
  const out = await askJSON<Omit<Audience, "productId" | "createdAt">>(
    `Map where this product's buyers already talk about the problem.

Product: ${product.name} (${product.url})
Positioning from the audit: ${JSON.stringify(audit.positioning)}
Page title: ${snapshot.title}
Page text excerpt: ${snapshot.textSample.slice(0, 2500)}

Return JSON:
{
  "icp": [ { "title": "job or identity", "description": "one sentence", "pains": ["..."], "triggers": ["moment that makes them look for a tool"] } ],
  "competitors": [ { "name": "...", "url": "https://...", "angle": "how they position, and the gap this product can take" } ],
  "communities": [ { "platform": "reddit|x|linkedin|facebook|slack|forum", "name": "r/... or group name", "url": "https://...", "why": "what gets discussed there that matters", "size": "rough" } ],
  "listeningQueries": [ "6 to 10 short search phrases that surface threads where the pain is being described, in the buyer's words, no product names" ],
  "bannedPhrases": [ "words this audience reads as marketing" ]
}
2 or 3 ICPs, 3 to 5 competitors, 8 to 12 communities with real names. Only name communities you are confident exist. Reddit names must be real subreddits.`,
    AUDIENCE_SCHEMA,
  );
  return { ...out, productId: product.id, createdAt: new Date().toISOString() };
}

export async function runRoadmap(product: Product, audit: Audit, audience: Audience): Promise<Roadmap> {
  const out = await askJSON<{ northStar: string; items: { phase: string; title: string; detail: string }[] }>(
    `Write the 30-day roadmap to the first paying users for this product.

Product: ${product.name}, stage ${product.stage}.
Audit summary: ${audit.summary}
Top findings: ${audit.findings.slice(0, 4).map((f) => f.title).join("; ")}
ICP: ${audience.icp.map((i) => i.title).join(", ")}
Communities: ${audience.communities.slice(0, 6).map((c) => c.name).join(", ")}

Return JSON: { "northStar": "one measurable sentence for day 30", "items": [ { "phase": "Week 1|Week 2|Week 3|Week 4", "title": "...", "detail": "one or two sentences, specific" } ] }
8 to 12 items. Week 1 is fixes and instrumentation; weeks 2 to 4 are distribution and learning loops.`,
    ROADMAP_SCHEMA,
  );
  return {
    productId: product.id,
    createdAt: new Date().toISOString(),
    northStar: out.northStar,
    items: out.items.map((i) => ({ ...i, id: randomUUID(), done: false })),
  };
}
