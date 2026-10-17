/**
 * Load a seed file into the configured store (file store by default, Supabase
 * when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set).
 *
 *   npm run seed                 # seeds seed/provra.json
 *   npm run seed -- seed/x.json  # seeds another file
 *
 * Seeded moves are dated today and tagged source=seed so they read as samples
 * in the UI. Re-running replaces nothing: if the product exists it is skipped.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getStore } from "../src/lib/store";
import type { Audience, Audit, Move, Product, Roadmap, SiteSnapshot } from "../src/lib/types";

interface SeedFile {
  product: Omit<Product, "createdAt"> & { createdAt?: string };
  snapshot: Omit<SiteSnapshot, "url" | "fetchedAt">;
  audit: Omit<Audit, "productId" | "createdAt">;
  audience: Omit<Audience, "productId" | "createdAt">;
  roadmap: Omit<Roadmap, "productId" | "createdAt" | "items"> & { items: Omit<Roadmap["items"][number], "id" | "done">[] };
  moves: Omit<Move, "id" | "productId" | "date" | "status" | "createdAt" | "updatedAt" | "source">[];
  events?: { daysAgo: number; visit: number; signup: number; paywall: number; payment: number }[];
}

const file = process.argv[2] ?? "seed/provra.json";
const seed = JSON.parse(readFileSync(path.resolve(file), "utf8")) as SeedFile;
const store = await getStore();
const now = new Date().toISOString();
const today = now.slice(0, 10);

if (await store.getProduct(seed.product.id)) {
  console.log(`Product ${seed.product.id} already exists; nothing to do.`);
  process.exit(0);
}

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

// Optional sample funnel so the dashboard is not empty on first open.
const days = seed.events ?? defaultEvents();
for (const d of days) {
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

console.log(`Seeded ${product.name} (${product.id}). Open /app/${product.id}`);

function defaultEvents() {
  // Fourteen quiet days for a pre-traction product: a trickle of visits, a few signups.
  const out: NonNullable<SeedFile["events"]> = [];
  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const visit = 6 + ((daysAgo * 7) % 11);
    const signup = daysAgo % 3 === 0 ? 1 : 0;
    out.push({ daysAgo, visit, signup, paywall: daysAgo % 6 === 0 ? 1 : 0, payment: daysAgo === 4 ? 1 : 0 });
  }
  return out;
}
