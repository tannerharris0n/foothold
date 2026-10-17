import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/products/:id  -> everything the dashboard needs in one call */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const { id } = await ctx.params;
  const store = await getStore();
  const product = await store.getProduct(id);
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [audit, audience, roadmap, moves, snapshot] = await Promise.all([
    store.getAudit(id),
    store.getAudience(id),
    store.getRoadmap(id),
    store.listMoves(id),
    store.getSnapshot(id),
  ]);
  return NextResponse.json({ product, audit, audience, roadmap, moves, snapshot });
}

/** PATCH /api/products/:id  { name?, voice?, stage?, oneLiner? } */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const patch: Record<string, string> = {};
  for (const k of ["name", "voice", "stage", "oneLiner", "email"]) if (typeof body[k] === "string") patch[k] = body[k];
  const store = await getStore();
  const product = await store.updateProduct(id, patch);
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ product });
}
