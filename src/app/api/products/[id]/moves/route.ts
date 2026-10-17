import { NextResponse, type NextRequest } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { generateDailyMoves, today } from "@/lib/moves";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/products/:id/moves?date=YYYY-MM-DD */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/products/[id]/moves">) {
  const { id } = await ctx.params;
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  const store = await getStore();
  return NextResponse.json({ moves: await store.listMoves(id, { date }) });
}

/** POST /api/products/:id/moves  -> draft today's moves now */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/products/[id]/moves">) {
  const { id } = await ctx.params;
  const store = await getStore();
  const product = await store.getProduct(id);
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!aiAvailable()) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { count?: number; force?: boolean };

  const existing = await store.listMoves(id, { date: today() });
  if (existing.length && !body.force) return NextResponse.json({ moves: existing, note: "already drafted today" });

  try {
    const moves = await generateDailyMoves(product, { count: body.count });
    return NextResponse.json({ moves }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
