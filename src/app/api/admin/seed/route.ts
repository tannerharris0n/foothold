import { NextResponse, type NextRequest } from "next/server";
import provra from "../../../../../seed/provra.json";
import { loadSeed, type SeedFile } from "@/lib/seed";

export const runtime = "nodejs";

/**
 * POST /api/admin/seed   (authorization: Bearer CRON_SECRET)
 * Loads the bundled Provra sample into the store. Idempotent. Refuses to run
 * when CRON_SECRET is unset so it can never be hit on an unconfigured deploy.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await loadSeed(provra as unknown as SeedFile);
  return NextResponse.json(result, { status: result.created ? 201 : 200 });
}
