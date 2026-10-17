import { runAudience, runAudit, runRoadmap } from "./audit";
import { generateDailyMoves } from "./moves";
import { guessName, snapshotSite } from "./scrape";
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
    const snapshot = await snapshotSite(product.url);
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
