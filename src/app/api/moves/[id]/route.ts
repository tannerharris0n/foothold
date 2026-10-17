import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import type { MoveStatus } from "@/lib/types";

export const runtime = "nodejs";

const STATUSES: MoveStatus[] = ["pending", "approved", "done", "skipped"];

/** PATCH /api/moves/:id  { status?, draft? } */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/moves/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { status?: MoveStatus; draft?: string };
  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "bad status" }, { status: 400 });
  }
  const store = await getStore();
  const move = await store.updateMove(id, body);
  if (!move) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ move });
}
