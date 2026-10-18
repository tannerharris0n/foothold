import { runAudience, runAudit, runRoadmap } from "./audit";
import { generateDailyMoves } from "./moves";
import { guessName, snapshotSite } from "./scrape";
import type { SiteSnapshot } from "./types";
import { getStore } from "./store";
import type { Product } from "./types";

/**
 * Day-one pipeline. Runs after a product is created: snapshot the site,
 * audit it, map the audience, write the roadmap, and draft the first moves.
 * Each stage saves as it finishes so the dashboard can fill in progressively.
 */
export async function runOnboarding(productId: string): Promise<void> {
  const store = await getStore();
  const product = await store.getProduct(productId);
  if (!product) throw new Error("product not found");

  await store.updateProduct(productId, { status: "auditing", error: undefined });
  try {
    let snapshot: SiteSnapshot;
    try {
      snapshot = await snapshotSite(product.url);
    } catch (e) {
      // The site refused us. Audit from the founder's own description rather
      // than stopping; the audit will say the page itself could not be read.
      console.warn("[onboarding] scrape failed, using founder input:", (e as Error).message);
      snapshot = fallbackSnapshot(product, (e as Error).message);
    }
    await store.saveSnapshot(productId, snapshot);
    const named: Product =
      (await store.updateProduct(productId, {
        name: product.name || guessName(snapshot),
        oneLiner: product.oneLiner || snapshot.description || snapshot.h1[0],
      })) ?? product;

    const audit = await runAudit(named, snapshot);
    await store.saveAudit(audit);

    const audience = await runAudience(named, snapshot, audit);
    await store.saveAudience(audience);

    const roadmap = await runRoadmap(named, audit, audience);
    await store.saveRoadmap(roadmap);

    await generateDailyMoves(named);
    await store.updateProduct(productId, { status: "ready" });
  } catch (e) {
    await store.updateProduct(productId, { status: "error", error: (e as Error).message });
    throw e;
  }
}

function fallbackSnapshot(product: Product, reason: string): SiteSnapshot {
  const host = new URL(product.url).hostname.replace(/^www\./, "");
  return {
    url: product.url,
    fetchedAt: new Date().toISOString(),
    title: product.name || host,
    description: product.oneLiner || "",
    h1: [],
    h2: [],
    ctas: [],
    pricingMentions: [],
    socialProofSignals: [],
    analytics: [],
    hasForm: false,
    wordCount: 0,
    textSample:
      `THE PAGE COULD NOT BE FETCHED (${reason}). ` +
      `Audit from the founder's description only, say plainly which findings are assumptions, ` +
      `and make the first finding "Allow Foothold to read the page" with the exact fix: allow the FootholdBot user agent ` +
      `or the host's bot protection rule for it.\n\nFounder's description: ${product.oneLiner || "(none given)"}\n` +
      `Founder's voice notes: ${product.voice || "(none)"}`,
  };
}
