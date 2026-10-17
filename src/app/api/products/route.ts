import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { runOnboarding } from "@/lib/pipeline";
import { normalizeUrl } from "@/lib/scrape";
import { getStore } from "@/lib/store";
import { STAGES, type Product, type Stage } from "@/lib/types";

export const runtime = "nodejs";

/** POST /api/products  { url, stage, email?, name?, voice? } */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<Product> & { url?: string };
  if (!body.url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  let url: string;
  try {
    url = normalizeUrl(body.url);
  } catch {
    return NextResponse.json({ error: "that does not look like a URL" }, { status: 400 });
  }
  const stage: Stage = STAGES.some((s) => s.id === body.stage) ? (body.stage as Stage) : "built_no_users";

  const product: Product = {
    id: randomUUID(),
    url,
    name: body.name?.trim() || "",
    stage,
    email: body.email?.trim() || undefined,
    voice: body.voice?.trim() || undefined,
    oneLiner: body.oneLiner?.trim() || undefined,
    createdAt: new Date().toISOString(),
    status: "new",
  };
  const store = await getStore();
  await store.createProduct(product);

  if (!aiAvailable()) {
    await store.updateProduct(product.id, {
      status: "error",
      error: "ANTHROPIC_API_KEY is not set, so the audit cannot run. Add it and retry from the dashboard.",
      name: product.name || new URL(url).hostname.replace(/^www\./, ""),
    });
    return NextResponse.json({ id: product.id, status: "error" }, { status: 201 });
  }

  // Fire and forget. The dashboard polls /api/products/:id for progress.
  runOnboarding(product.id).catch((e) => console.error("[onboarding]", product.id, e));
  return NextResponse.json({ id: product.id, status: "auditing" }, { status: 201 });
}

export async function GET() {
  const store = await getStore();
  return NextResponse.json({ products: await store.listProducts() });
}
