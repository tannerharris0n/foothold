import { NextResponse, type NextRequest } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { runOnboarding } from "@/lib/pipeline";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** POST /api/products/:id/audit  -> re-run the full day-one pipeline */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/audit">) {
  const { id } = await ctx.params;
  const store = await getStore();
  const product = await store.getProduct(id);
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!aiAvailable()) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  if (product.status === "auditing") return NextResponse.json({ status: "auditing" });
  runOnboarding(id).catch((e) => console.error("[audit]", id, e));
  return NextResponse.json({ status: "auditing" }, { status: 202 });
}
