import Link from "next/link";
import { Wordmark } from "@/components/Nav";
import { today } from "@/lib/moves";
import { getStore } from "@/lib/store";
import { STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

/** All products on this instance, with today's workload for each. */
export default async function Products() {
  const store = await getStore();
  const products = await store.listProducts();
  const date = today();
  const rows = await Promise.all(
    products.map(async (p) => {
      const [moves, audit] = await Promise.all([store.listMoves(p.id, { date }), store.getAudit(p.id)]);
      const pending = moves.filter((m) => m.status === "pending").length;
      return { p, pending, total: moves.length, score: audit?.score };
    }),
  );
  rows.sort((a, b) => (a.p.createdAt < b.p.createdAt ? 1 : -1));

  return (
    <main className="flex-1">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark className="text-lg" />
        <Link href="/start" className="btn btn-rope">
          Add a product
        </Link>
      </header>
      <div className="mx-auto w-full max-w-6xl px-5 pb-24">
        <div className="rule pt-5">
          <h1 className="display text-4xl sm:text-5xl">Your products</h1>
          <p className="mt-2 text-slate">
            {rows.length === 0
              ? "Nothing here yet."
              : `${rows.length} ${rows.length === 1 ? "product" : "products"}, ${rows.reduce((a, r) => a + r.pending, 0)} moves waiting today.`}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-line bg-white p-6">
            <p className="font-semibold">Add your first product.</p>
            <p className="mt-1 text-sm text-slate">Paste a URL, answer three questions, and the day-one audit runs.</p>
            <Link href="/start" className="btn btn-rope mt-4">
              Start with your URL
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-line">
            {rows.map(({ p, pending, total, score }) => (
              <li key={p.id}>
                <Link href={`/app/${p.id}`} className="flex items-center gap-4 py-5 hover:bg-white/60">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-bold leading-tight">{p.name || p.url}</span>
                    <span className="mt-1 block text-sm text-slate">
                      {p.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      {" · "}
                      {STAGES.find((s) => s.id === p.stage)?.label ?? p.stage}
                      {typeof score === "number" ? ` · ${score}/100` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {p.status === "ready" ? (
                      <span className={`tag ${pending ? "tag-rope" : total ? "tag-moss" : ""}`}>
                        {pending ? `${pending} to do` : total ? "Done for today" : "No moves yet"}
                      </span>
                    ) : p.status === "auditing" ? (
                      <span className="tag pulse">Auditing</span>
                    ) : p.status === "error" ? (
                      <span className="tag tag-flare">Audit failed</span>
                    ) : (
                      <span className="tag">New</span>
                    )}
                  </span>
                  <span aria-hidden className="text-slate">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
