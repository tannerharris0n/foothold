import { NextResponse, type NextRequest } from "next/server";
import { computeFunnel, dailySeries } from "@/lib/funnel";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/products/:id/funnel?days=30 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/products/[id]/funnel">) {
  const { id } = await ctx.params;
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const store = await getStore();
  const events = await store.listEvents(id, since);
  return NextResponse.json({
    days,
    totalEvents: events.length,
    funnel: computeFunnel(events),
    daily: dailySeries(events, Math.min(days, 30)),
  });
}
