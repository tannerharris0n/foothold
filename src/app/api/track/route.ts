import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { FUNNEL_STEPS, type FunnelStep } from "@/lib/types";

export const runtime = "nodejs";

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

async function record(productId: string, step: string, anonId?: string, ref?: string) {
  if (!productId || !FUNNEL_STEPS.includes(step as FunnelStep)) return false;
  const store = await getStore();
  if (!(await store.getProduct(productId))) return false;
  await store.addEvent({
    id: randomUUID(),
    productId,
    step: step as FunnelStep,
    anonId: anonId?.slice(0, 64),
    ref: ref?.slice(0, 200),
    ts: new Date().toISOString(),
  });
  return true;
}

/** GET /api/track?p=PRODUCT&e=visit&a=ANON  -> 1x1 gif (works as an <img> pixel) */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  await record(q.get("p") ?? "", q.get("e") ?? "visit", q.get("a") ?? undefined, req.headers.get("referer") ?? undefined);
  return new NextResponse(PIXEL, {
    headers: { "content-type": "image/gif", "cache-control": "no-store", ...CORS },
  });
}

/** POST /api/track  { p, e, a? }  (used by the JS snippet; sendBeacon-friendly) */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { p?: string; e?: string; a?: string };
  const ok = await record(body.p ?? "", body.e ?? "", body.a, req.headers.get("referer") ?? undefined);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
