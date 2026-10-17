import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "./index";
import type {
  Audience,
  Audit,
  Move,
  MoveStatus,
  Product,
  Roadmap,
  SiteSnapshot,
  TrackEvent,
} from "../types";

/**
 * Supabase-backed store. Schema lives in supabase/migrations/0001_init.sql.
 * Structured documents (audit, audience, roadmap, snapshot) are stored as
 * jsonb keyed by product id; moves and events are first-class rows so they
 * can be filtered and aggregated in SQL.
 */
export class SupabaseStore implements Store {
  private sb: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  }

  private fail(where: string, error: { message: string } | null) {
    if (error) throw new Error(`${where}: ${error.message}`);
  }

  async createProduct(p: Product) {
    const { error } = await this.sb.from("products").insert(toProductRow(p));
    this.fail("createProduct", error);
    return p;
  }
  async getProduct(id: string) {
    const { data, error } = await this.sb.from("products").select("*").eq("id", id).maybeSingle();
    this.fail("getProduct", error);
    return data ? fromProductRow(data) : null;
  }
  async listProducts() {
    const { data, error } = await this.sb.from("products").select("*").order("created_at");
    this.fail("listProducts", error);
    return (data ?? []).map(fromProductRow);
  }
  async updateProduct(id: string, patch: Partial<Product>) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.stage !== undefined) row.stage = patch.stage;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.oneLiner !== undefined) row.one_liner = patch.oneLiner;
    if (patch.voice !== undefined) row.voice = patch.voice;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.error !== undefined) row.error = patch.error;
    const { data, error } = await this.sb.from("products").update(row).eq("id", id).select().maybeSingle();
    this.fail("updateProduct", error);
    return data ? fromProductRow(data) : null;
  }

  private async putDoc(table: string, productId: string, doc: unknown) {
    const { error } = await this.sb
      .from(table)
      .upsert({ product_id: productId, doc }, { onConflict: "product_id" });
    this.fail(`put ${table}`, error);
  }
  private async getDoc<T>(table: string, productId: string): Promise<T | null> {
    const { data, error } = await this.sb.from(table).select("doc").eq("product_id", productId).maybeSingle();
    this.fail(`get ${table}`, error);
    return (data?.doc as T) ?? null;
  }

  saveSnapshot(productId: string, s: SiteSnapshot) {
    return this.putDoc("snapshots", productId, s);
  }
  getSnapshot(productId: string) {
    return this.getDoc<SiteSnapshot>("snapshots", productId);
  }
  saveAudit(a: Audit) {
    return this.putDoc("audits", a.productId, a);
  }
  getAudit(productId: string) {
    return this.getDoc<Audit>("audits", productId);
  }
  saveAudience(a: Audience) {
    return this.putDoc("audiences", a.productId, a);
  }
  getAudience(productId: string) {
    return this.getDoc<Audience>("audiences", productId);
  }
  saveRoadmap(r: Roadmap) {
    return this.putDoc("roadmaps", r.productId, r);
  }
  getRoadmap(productId: string) {
    return this.getDoc<Roadmap>("roadmaps", productId);
  }

  async addMoves(moves: Move[]) {
    if (!moves.length) return;
    const { error } = await this.sb.from("moves").insert(moves.map(toMoveRow));
    this.fail("addMoves", error);
  }
  async listMoves(productId: string, opts?: { date?: string }) {
    let q = this.sb.from("moves").select("*").eq("product_id", productId);
    if (opts?.date) q = q.eq("date", opts.date);
    const { data, error } = await q.order("date", { ascending: false }).order("created_at");
    this.fail("listMoves", error);
    return (data ?? []).map(fromMoveRow);
  }
  async updateMove(id: string, patch: { status?: MoveStatus; draft?: string }) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status) row.status = patch.status;
    if (typeof patch.draft === "string") row.draft = patch.draft;
    const { data, error } = await this.sb.from("moves").update(row).eq("id", id).select().maybeSingle();
    this.fail("updateMove", error);
    return data ? fromMoveRow(data) : null;
  }

  async addEvent(e: TrackEvent) {
    const { error } = await this.sb.from("events").insert({
      id: e.id,
      product_id: e.productId,
      step: e.step,
      anon_id: e.anonId ?? null,
      ts: e.ts,
      ref: e.ref ?? null,
    });
    this.fail("addEvent", error);
  }
  async listEvents(productId: string, sinceIso?: string) {
    let q = this.sb.from("events").select("*").eq("product_id", productId);
    if (sinceIso) q = q.gte("ts", sinceIso);
    const { data, error } = await q.limit(20000);
    this.fail("listEvents", error);
    return (data ?? []).map((r) => ({
      id: r.id,
      productId: r.product_id,
      step: r.step,
      anonId: r.anon_id ?? undefined,
      ts: r.ts,
      ref: r.ref ?? undefined,
    })) as TrackEvent[];
  }
}

// Row <-> domain mappers -------------------------------------------------

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function toProductRow(p: Product): Row {
  return {
    id: p.id,
    url: p.url,
    name: p.name,
    stage: p.stage,
    email: p.email ?? null,
    one_liner: p.oneLiner ?? null,
    voice: p.voice ?? null,
    status: p.status,
    error: p.error ?? null,
    created_at: p.createdAt,
  };
}
function fromProductRow(r: Row): Product {
  return {
    id: r.id,
    url: r.url,
    name: r.name,
    stage: r.stage,
    email: r.email ?? undefined,
    oneLiner: r.one_liner ?? undefined,
    voice: r.voice ?? undefined,
    status: r.status,
    error: r.error ?? undefined,
    createdAt: r.created_at,
  };
}
function toMoveRow(m: Move): Row {
  return {
    id: m.id,
    product_id: m.productId,
    date: m.date,
    type: m.type,
    channel: m.channel,
    title: m.title,
    why: m.why,
    draft: m.draft,
    target_url: m.targetUrl ?? null,
    effort_minutes: m.effortMinutes,
    status: m.status,
    playbook_id: m.playbookId ?? null,
    source: m.source,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}
function fromMoveRow(r: Row): Move {
  return {
    id: r.id,
    productId: r.product_id,
    date: r.date,
    type: r.type,
    channel: r.channel,
    title: r.title,
    why: r.why,
    draft: r.draft,
    targetUrl: r.target_url ?? undefined,
    effortMinutes: r.effort_minutes,
    status: r.status,
    playbookId: r.playbook_id ?? undefined,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
