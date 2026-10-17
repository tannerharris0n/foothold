/**
 * Load a seed file into the configured store (file store by default, Supabase
 * when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set).
 *
 *   npm run seed                 # seeds seed/provra.json
 *   npm run seed -- seed/x.json  # seeds another file
 *
 * In production, POST /api/admin/seed with the CRON_SECRET does the same thing
 * without needing a shell in the container.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadSeed, type SeedFile } from "../src/lib/seed";

const file = process.argv[2] ?? "seed/provra.json";
const seed = JSON.parse(readFileSync(path.resolve(file), "utf8")) as SeedFile;
const result = await loadSeed(seed);
console.log(
  result.created
    ? `Seeded ${seed.product.name} (${result.productId}). Open /app/${result.productId}`
    : `Product ${result.productId} already exists; nothing to do.`,
);
