"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Audience, Audit, Move, Product, Roadmap, SiteSnapshot } from "@/lib/types";
import { STAGES } from "@/lib/types";
import { FunnelView, type FunnelPayload } from "./FunnelView";
import { MoveItem } from "./MoveItem";
import { Wordmark } from "./Nav";

interface Bundle {
  product: Product;
  audit: Audit | null;
  audience: Audience | null;
  roadmap: Roadmap | null;
  moves: Move[];
  snapshot: SiteSnapshot | null;
}

type Tab = "today" | "audit" | "audience" | "funnel" | "roadmap";
const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "audit", label: "Audit" },
  { id: "audience", label: "Audience" },
  { id: "funnel", label: "Funnel" },
  { id: "roadmap", label: "Roadmap" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function Dashboard({ productId }: { productId: string }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [funnel, setFunnel] = useState<FunnelPayload | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [err, setErr] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);

  const load = useCallback(() => {
    return fetch(`/api/products/${productId}`, { cache: "no-store" })
      .then(async (res) => (res.status === 404 ? null : ((await res.json()) as Bundle)))
      .then((b) => {
        if (b) setBundle(b);
        else setErr("No product with that id. Start again from the home page.");
      });
  }, [productId]);

  const loadFunnel = useCallback(() => {
    return fetch(`/api/products/${productId}/funnel?days=30`, { cache: "no-store" })
      .then(async (res) => (res.ok ? ((await res.json()) as FunnelPayload) : null))
      .then((f) => {
        if (f) setFunnel(f);
      });
  }, [productId]);

  useEffect(() => {
    void load();
    void loadFunnel();
  }, [load, loadFunnel]);

  // Poll while the day-one pipeline is running.
  const auditing = bundle?.product.status === "auditing";
  useEffect(() => {
    if (!auditing) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [auditing, load]);

  const today = todayStr();
  const todays = useMemo(() => (bundle?.moves ?? []).filter((m) => m.date === today), [bundle, today]);
  const earlier = useMemo(() => (bundle?.moves ?? []).filter((m) => m.date !== today), [bundle, today]);

  function replaceMove(m: Move) {
    setBundle((b) => (b ? { ...b, moves: b.moves.map((x) => (x.id === m.id ? m : x)) } : b));
  }

  async function draftToday(force = false) {
    setDrafting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/products/${productId}/moves`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not draft moves.");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setDrafting(false);
    }
  }

  async function rerunAudit() {
    setErr(null);
    const res = await fetch(`/api/products/${productId}/audit`, { method: "POST" });
    if (!res.ok) setErr(((await res.json()) as { error?: string }).error || "Could not start the audit.");
    await load();
  }

  if (err && !bundle) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20">
        <Wordmark className="text-lg" />
        <p className="mt-8">{err}</p>
        <Link href="/start" className="btn btn-rope mt-6">
          Start again
        </Link>
      </main>
    );
  }
  if (!bundle) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20">
        <Wordmark className="text-lg" />
        <p className="mt-8 text-slate pulse">Loading</p>
      </main>
    );
  }

  const { product, audit, audience, roadmap } = bundle;
  const stageLabel = STAGES.find((s) => s.id === product.stage)?.label ?? product.stage;
  const minutes = todays.filter((m) => m.status !== "skipped").reduce((a, m) => a + m.effortMinutes, 0);

  return (
    <main className="flex-1">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark className="text-lg" />
        <a href={product.url} target="_blank" rel="noreferrer" className="text-sm text-slate hover:text-granite">
          {product.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
        </a>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 pb-24">
        <div className="rule pt-5">
          <h1 className="display text-4xl sm:text-5xl">{product.name || "Your product"}</h1>
          <p className="mt-2 text-slate">
            {stageLabel}
            {audit ? `, funnel readiness ${audit.score}/100` : ""}
          </p>
        </div>

        {product.status === "auditing" && (
          <div className="mt-6 rounded-xl border border-line bg-white p-5">
            <p className="font-semibold pulse">Running the day-one audit</p>
            <p className="mt-1 text-sm text-slate">
              Reading the page, scoring the funnel, mapping where your buyers talk, drafting today&apos;s moves. Usually two
              to four minutes. This page updates on its own.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              <li className={`tag ${bundle.snapshot ? "tag-moss" : ""}`}>Page read</li>
              <li className={`tag ${audit ? "tag-moss" : ""}`}>Audit</li>
              <li className={`tag ${audience ? "tag-moss" : ""}`}>Audience</li>
              <li className={`tag ${roadmap ? "tag-moss" : ""}`}>Roadmap</li>
              <li className={`tag ${todays.length ? "tag-moss" : ""}`}>First moves</li>
            </ul>
          </div>
        )}

        {product.status === "error" && (
          <div className="mt-6 rounded-xl border border-flare/40 bg-flare-wash p-5">
            <p className="font-semibold">The audit did not finish.</p>
            <p className="mt-1 text-sm">{product.error}</p>
            <button type="button" onClick={rerunAudit} className="btn btn-ghost mt-4">
              Retry the audit
            </button>
          </div>
        )}

        {err && <p className="mt-4 text-sm text-flare">{err}</p>}

        <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.id ? "border-granite text-granite" : "border-transparent text-slate hover:text-granite"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <section>
            {tab === "today" && (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-bold">Today</h2>
                  <span className="text-sm text-slate">
                    {todays.length ? `${todays.length} moves, about ${minutes} minutes` : "No moves drafted yet"}
                  </span>
                </div>
                {todays.length ? (
                  <ol className="mt-4 space-y-5">
                    {todays.map((m, i) => (
                      <MoveItem key={m.id} move={m} index={i} onChange={replaceMove} />
                    ))}
                  </ol>
                ) : (
                  product.status === "ready" && (
                    <div className="mt-4 rounded-xl border border-line bg-white p-5">
                      <p className="text-sm text-slate">
                        Nothing drafted for today. Hit the button, or schedule <code>/api/cron/daily</code> to do this every
                        morning.
                      </p>
                    </div>
                  )
                )}
                {product.status === "ready" && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-rope" disabled={drafting} onClick={() => draftToday(todays.length > 0)}>
                      {drafting ? "Listening and drafting" : todays.length ? "Draft more for today" : "Draft today's moves"}
                    </button>
                  </div>
                )}

                {earlier.length > 0 && (
                  <details className="mt-12">
                    <summary className="cursor-pointer text-sm font-semibold text-slate">
                      Earlier moves ({earlier.length})
                    </summary>
                    <ol className="mt-4 space-y-5">
                      {earlier.map((m, i) => (
                        <MoveItem key={m.id} move={m} index={i} onChange={replaceMove} />
                      ))}
                    </ol>
                  </details>
                )}
              </>
            )}

            {tab === "audit" && <AuditView audit={audit} onRerun={rerunAudit} ready={product.status === "ready"} />}
            {tab === "audience" && <AudienceView audience={audience} />}
            {tab === "funnel" && <FunnelView data={funnel} productId={productId} />}
            {tab === "roadmap" && <RoadmapView roadmap={roadmap} />}
          </section>

          <aside className="space-y-10 lg:border-l lg:border-line lg:pl-10">
            {audit && (
              <div>
                <h3 className="text-sm font-semibold text-slate">Positioning, rewritten</h3>
                <p className="mt-2 text-lg font-bold leading-snug">{audit.positioning.rewrite.headline}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate">{audit.positioning.rewrite.subheadline}</p>
                <span className="btn btn-ghost mt-3 pointer-events-none text-xs">{audit.positioning.rewrite.cta}</span>
              </div>
            )}
            {funnel && (
              <div>
                <h3 className="text-sm font-semibold text-slate">Last 30 days</h3>
                <dl className="mt-2 grid grid-cols-2 gap-3">
                  {funnel.funnel.map((r) => (
                    <div key={r.step} className="rounded-lg bg-white p-3">
                      <dt className="text-xs text-slate">{r.label}</dt>
                      <dd className="text-xl font-bold">{r.count.toLocaleString()}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {roadmap && (
              <div>
                <h3 className="text-sm font-semibold text-slate">Day 30 looks like</h3>
                <p className="mt-2 leading-relaxed">{roadmap.northStar}</p>
              </div>
            )}
            {audience && (
              <div>
                <h3 className="text-sm font-semibold text-slate">Listening for</h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {audience.listeningQueries.slice(0, 8).map((q) => (
                    <li key={q} className="tag">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function AuditView({ audit, onRerun, ready }: { audit: Audit | null; onRerun: () => void; ready: boolean }) {
  if (!audit) return <p className="text-sm text-slate">The audit has not run yet.</p>;
  const sev = { high: "tag-flare", medium: "tag-rope", low: "" } as const;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">What a first-time visitor sees</h2>
        <span className="text-sm text-slate">{audit.score}/100</span>
      </div>
      <p className="mt-3 leading-relaxed">{audit.summary}</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        {(
          [
            ["Who it is for", audit.positioning.who],
            ["The problem, in their words", audit.positioning.problem],
            ["The promise", audit.positioning.promise],
            ["Proof on the page", audit.positioning.proof],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white p-4">
            <dt className="text-xs font-semibold text-slate">{k}</dt>
            <dd className="mt-1 text-sm leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-10 text-lg font-bold">{audit.findings.length} things in the way</h3>
      <ol className="mt-3 space-y-4">
        {audit.findings.map((f, i) => (
          <li key={f.id} className="hairline pt-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-5 shrink-0 text-sm font-semibold text-slate">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`tag ${sev[f.severity]}`}>{f.severity}</span>
                  <span className="tag">{f.area}</span>
                </div>
                <p className="mt-1.5 font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-slate">{f.evidence}</p>
                <p className="mt-2 text-sm leading-relaxed">
                  <span className="font-semibold">Fix: </span>
                  {f.fix}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {ready && (
        <button type="button" onClick={onRerun} className="btn btn-quiet mt-8">
          Re-run the audit
        </button>
      )}
    </div>
  );
}

function AudienceView({ audience }: { audience: Audience | null }) {
  if (!audience) return <p className="text-sm text-slate">The audience map has not run yet.</p>;
  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold">Who you are talking to</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {audience.icp.map((i) => (
            <div key={i.title} className="rounded-lg bg-white p-4">
              <p className="font-semibold">{i.title}</p>
              <p className="mt-1 text-sm text-slate">{i.description}</p>
              <p className="mt-3 text-xs font-semibold text-slate">Pains</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
                {i.pains.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-semibold text-slate">What makes them look</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
                {i.triggers.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold">Where they already talk</h2>
        <ul className="mt-4 divide-y divide-line">
          {audience.communities.map((c) => (
            <li key={`${c.platform}-${c.name}`} className="flex items-start gap-3 py-3">
              <span className="tag mt-0.5 shrink-0">{c.platform}</span>
              <div className="min-w-0">
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-rope hover:underline">
                    {c.name}
                  </a>
                ) : (
                  <span className="font-semibold">{c.name}</span>
                )}
                {c.size && <span className="ml-2 text-xs text-slate">{c.size}</span>}
                <p className="mt-0.5 text-sm text-slate">{c.why}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold">Who else is in the room</h2>
        <ul className="mt-4 space-y-3">
          {audience.competitors.map((c) => (
            <li key={c.name} className="hairline pt-3">
              <span className="font-semibold">{c.name}</span>
              {c.url && (
                <a href={c.url} target="_blank" rel="noreferrer" className="ml-2 text-xs text-rope hover:underline">
                  {c.url.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              )}
              <p className="mt-0.5 text-sm text-slate">{c.angle}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold">Words this audience tunes out</h2>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {audience.bannedPhrases.map((b) => (
            <li key={b} className="tag tag-flare">
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RoadmapView({ roadmap }: { roadmap: Roadmap | null }) {
  if (!roadmap) return <p className="text-sm text-slate">The roadmap has not been written yet.</p>;
  const phases = Array.from(new Set(roadmap.items.map((i) => i.phase)));
  return (
    <div>
      <h2 className="text-xl font-bold">Thirty days to the first paying users</h2>
      <p className="mt-2 leading-relaxed text-slate">{roadmap.northStar}</p>
      <div className="mt-6 space-y-8">
        {phases.map((ph) => (
          <div key={ph}>
            <h3 className="rule pt-3 font-bold">{ph}</h3>
            <ul className="mt-3 space-y-3">
              {roadmap.items
                .filter((i) => i.phase === ph)
                .map((i) => (
                  <li key={i.id} className="flex gap-3">
                    <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${i.done ? "bg-moss" : "bg-line"}`} />
                    <div>
                      <p className="font-semibold leading-snug">{i.title}</p>
                      <p className="mt-0.5 text-sm text-slate">{i.detail}</p>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
