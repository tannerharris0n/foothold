import { randomUUID } from "node:crypto";
import { getStore } from "./store";
import type { Audience, Audit, Move, Product, Roadmap, SiteSnapshot } from "./types";

export interface SeedFile {
  product: Omit<Product, "createdAt"> & { createdAt?: string };
  snapshot: Omit<SiteSnapshot, "url" | "fetchedAt">;
  audit: Omit<Audit, "productId" | "createdAt">;
  audience: Omit<Audience, "productId" | "createdAt">;
  roadmap: Omit<Roadmap, "productId" | "createdAt" | "items"> & {
    items: Omit<Roadmap["items"][number], "id" | "done">[];
  };
  moves: Omit<Move, "id" | "productId" | "date" | "status" | "createdAt" | "updatedAt" | "source">[];
  events?: { daysAgo: number; visit: number; signup: number; paywall: number; payment: number }[];
}

/**
 * Load a seed document into whichever store is configured. Idempotent: if the
 * product already exists nothing is written. Moves are dated today and tagged
 * source=seed so the UI shows them as samples.
 */
export async function loadSeed(seed: SeedFile): Promise<{ productId: string; created: boolean }> {
  const store = await getStore();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  if (await store.getProduct(seed.product.id)) return { productId: seed.product.id, created: false };

  const product: Product = { createdAt: now, ...seed.product };
  await store.createProduct(product);
  await store.saveSnapshot(product.id, { url: product.url, fetchedAt: now, ...seed.snapshot });
  await store.saveAudit({ productId: product.id, createdAt: now, ...seed.audit });
  await store.saveAudience({ productId: product.id, createdAt: now, ...seed.audience });
  await store.saveRoadmap({
    productId: product.id,
    createdAt: now,
    northStar: seed.roadmap.northStar,
    items: seed.roadmap.items.map((i) => ({ ...i, id: randomUUID(), done: false })),
  });
  await store.addMoves(
    seed.moves.map((m) => ({
      ...m,
      id: randomUUID(),
      productId: product.id,
      date: today,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
      source: "seed" as const,
    })),
  );

  for (const d of seed.events ?? defaultEvents()) {
    const base = Date.now() - d.daysAgo * 86400_000;
    const emit = async (step: "visit" | "signup" | "paywall" | "payment", n: number) => {
      for (let i = 0; i < n; i++) {
        await store.addEvent({
          id: randomUUID(),
          productId: product.id,
          step,
          anonId: `seed-${d.daysAgo}-${i}`,
          ts: new Date(base + i * 60_000).toISOString(),
        });
      }
    };
    await emit("visit", d.visit);
    await emit("signup", d.signup);
    await emit("paywall", d.paywall);
    await emit("payment", d.payment);
  }
  return { productId: product.id, created: true };
}

function defaultEvents(): NonNullable<SeedFile["events"]> {
  // Fourteen quiet days for a pre-traction product: a trickle of visits, a few signups.
  const out: NonNullable<SeedFile["events"]> = [];
  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    out.push({
      daysAgo,
      visit: 6 + ((daysAgo * 7) % 11),
      signup: daysAgo % 3 === 0 ? 1 : 0,
      paywall: daysAgo % 6 === 0 ? 1 : 0,
      payment: daysAgo === 4 ? 1 : 0,
    });
  }
  return out;
}
