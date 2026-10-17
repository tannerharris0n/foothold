/**
 * Runs once when the Next.js server boots. When SEED_ON_BOOT is set, loads
 * the bundled Provra sample into the store if it is not already there. Safe to
 * leave on: loadSeed is idempotent and exits early when the product exists.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.SEED_ON_BOOT) return;
  try {
    const { loadSeed } = await import("./lib/seed");
    const { default: provra } = await import("../seed/provra.json");
    const result = await loadSeed(provra as unknown as import("./lib/seed").SeedFile);
    console.log(result.created ? `[seed] loaded Provra sample (${result.productId})` : `[seed] Provra sample already present`);
  } catch (e) {
    console.error("[seed] failed:", (e as Error).message);
  }
}
