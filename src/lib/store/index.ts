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
 * Storage interface. Two implementations:
 *  - FileStore: a JSON file on disk, zero setup, good for local dev and demos.
 *  - SupabaseStore: Postgres via supabase-js, used when SUPABASE env vars exist.
 */
export interface Store {
  createProduct(p: Product): Promise<Product>;
  getProduct(id: string): Promise<Product | null>;
  listProducts(): Promise<Product[]>;
  updateProduct(id: string, patch: Partial<Product>): Promise<Product | null>;

  saveSnapshot(productId: string, s: SiteSnapshot): Promise<void>;
  getSnapshot(productId: string): Promise<SiteSnapshot | null>;

  saveAudit(a: Audit): Promise<void>;
  getAudit(productId: string): Promise<Audit | null>;

  saveAudience(a: Audience): Promise<void>;
  getAudience(productId: string): Promise<Audience | null>;

  saveRoadmap(r: Roadmap): Promise<void>;
  getRoadmap(productId: string): Promise<Roadmap | null>;

  addMoves(moves: Move[]): Promise<void>;
  listMoves(productId: string, opts?: { date?: string }): Promise<Move[]>;
  updateMove(id: string, patch: { status?: MoveStatus; draft?: string }): Promise<Move | null>;

  addEvent(e: TrackEvent): Promise<void>;
  listEvents(productId: string, sinceIso?: string): Promise<TrackEvent[]>;
}

let cached: Store | null = null;

export async function getStore(): Promise<Store> {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const { SupabaseStore } = await import("./supabase");
    cached = new SupabaseStore(url, key);
  } else {
    const { FileStore } = await import("./file");
    cached = new FileStore(process.env.DATA_DIR || "./data");
  }
  return cached;
}
