import { NextResponse, type NextRequest } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { generateDailyMoves, today } from "@/lib/moves";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET or POST /api/cron/daily
 * Drafts today's moves for every product that is ready and has none yet.
 * Protect with CRON_SECRET: send it as `authorization: Bearer <secret>` or `?key=`.
 * Point a Railway cron service, GitHub Action, or any scheduler at it once a day.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const key = req.nextUrl.searchParams.get("key");
    if (auth !== secret && key !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!aiAvailable()) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });

  const store = await getStore();
  const products = (await store.listProducts()).filter((p) => p.status === "ready");
  const results: { id: string; name: string; drafted: number; error?: string }[] = [];

  for (const p of products) {
    const existing = await store.listMoves(p.id, { date: today() });
    if (existing.length) {
      results.push({ id: p.id, name: p.name, drafted: 0 });
      continue;
    }
    try {
      const moves = await generateDailyMoves(p);
      results.push({ id: p.id, name: p.name, drafted: moves.length });
    } catch (e) {
      results.push({ id: p.id, name: p.name, drafted: 0, error: (e as Error).message });
    }
  }
  return NextResponse.json({ date: today(), results });
}

export const GET = handle;
export const POST = handle;
