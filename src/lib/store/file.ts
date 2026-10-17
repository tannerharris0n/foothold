import { promises as fs } from "node:fs";
import path from "node:path";
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

interface Db {
  products: Product[];
  snapshots: Record<string, SiteSnapshot>;
  audits: Record<string, Audit>;
  audiences: Record<string, Audience>;
  roadmaps: Record<string, Roadmap>;
  moves: Move[];
  events: TrackEvent[];
}

const EMPTY: Db = {
  products: [],
  snapshots: {},
  audits: {},
  audiences: {},
  roadmaps: {},
  moves: [],
  events: [],
};

/** Single-file JSON store with a write lock. Fine for one process. */
export class FileStore implements Store {
  private file: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dir: string) {
    this.file = path.join(dir, "db.json");
  }

  private async read(): Promise<Db> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      return { ...EMPTY, ...(JSON.parse(raw) as Partial<Db>) };
    } catch {
      return structuredClone(EMPTY);
    }
  }

  private async write(db: Db) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, this.file);
  }

  /** Serialize read-modify-write cycles. */
  private mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const db = await this.read();
      const out = await fn(db);
      await this.write(db);
      return out;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async createProduct(p: Product) {
    return this.mutate((db) => {
      db.products.push(p);
      return p;
    });
  }
  async getProduct(id: string) {
    const db = await this.read();
    return db.products.find((p) => p.id === id) ?? null;
  }
  async listProducts() {
    const db = await this.read();
    return db.products;
  }
  async updateProduct(id: string, patch: Partial<Product>) {
    return this.mutate((db) => {
      const p = db.products.find((x) => x.id === id);
      if (!p) return null;
      Object.assign(p, patch);
      return p;
    });
  }

  async saveSnapshot(productId: string, s: SiteSnapshot) {
    await this.mutate((db) => {
      db.snapshots[productId] = s;
    });
  }
  async getSnapshot(productId: string) {
    return (await this.read()).snapshots[productId] ?? null;
  }

  async saveAudit(a: Audit) {
    await this.mutate((db) => {
      db.audits[a.productId] = a;
    });
  }
  async getAudit(productId: string) {
    return (await this.read()).audits[productId] ?? null;
  }

  async saveAudience(a: Audience) {
    await this.mutate((db) => {
      db.audiences[a.productId] = a;
    });
  }
  async getAudience(productId: string) {
    return (await this.read()).audiences[productId] ?? null;
  }

  async saveRoadmap(r: Roadmap) {
    await this.mutate((db) => {
      db.roadmaps[r.productId] = r;
    });
  }
  async getRoadmap(productId: string) {
    return (await this.read()).roadmaps[productId] ?? null;
  }

  async addMoves(moves: Move[]) {
    await this.mutate((db) => {
      db.moves.push(...moves);
    });
  }
  async listMoves(productId: string, opts?: { date?: string }) {
    const db = await this.read();
    return db.moves
      .filter((m) => m.productId === productId && (!opts?.date || m.date === opts.date))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? -1 : 1));
  }
  async updateMove(id: string, patch: { status?: MoveStatus; draft?: string }) {
    return this.mutate((db) => {
      const m = db.moves.find((x) => x.id === id);
      if (!m) return null;
      if (patch.status) m.status = patch.status;
      if (typeof patch.draft === "string") m.draft = patch.draft;
      m.updatedAt = new Date().toISOString();
      return m;
    });
  }

  async addEvent(e: TrackEvent) {
    await this.mutate((db) => {
      db.events.push(e);
      // Keep the file bounded.
      if (db.events.length > 50_000) db.events = db.events.slice(-40_000);
    });
  }
  async listEvents(productId: string, sinceIso?: string) {
    const db = await this.read();
    return db.events.filter((e) => e.productId === productId && (!sinceIso || e.ts >= sinceIso));
  }
}
