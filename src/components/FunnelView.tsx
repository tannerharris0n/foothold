"use client";

import type { FunnelRow } from "@/lib/funnel";

export interface FunnelPayload {
  days: number;
  totalEvents: number;
  funnel: FunnelRow[];
  daily: { date: string; visit: number; signup: number; payment: number }[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function FunnelView({ data, productId }: { data: FunnelPayload | null; productId: string }) {
  const host = typeof window !== "undefined" ? window.location.origin : "";
  if (!data) return <p className="text-sm text-slate pulse">Loading funnel</p>;
  const empty = data.totalEvents === 0;
  const max = Math.max(1, ...data.daily.map((d) => d.visit));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Funnel, last {data.days} days</h2>
        <span className="text-sm text-slate">{data.totalEvents} events</span>
      </div>

      <ol className="mt-5 space-y-3">
        {data.funnel.map((row, i) => (
          <li key={row.step}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">{row.label}</span>
              <span className="text-slate">
                {row.count.toLocaleString()}
                {i > 0 && <span className="ml-2">{pct(row.ofPrev)} of previous</span>}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full rounded-full bg-chalk-2">
              <div
                className={`h-2.5 rounded-full ${row.step === "payment" ? "bg-moss" : "bg-rope"}`}
                style={{ width: `${Math.max(empty ? 0 : 2, row.ofTop * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <div className="text-sm font-semibold">Visits per day</div>
        <div className="mt-2 flex h-16 items-end gap-[3px]" aria-label="daily visits">
          {data.daily.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.visit} visits, ${d.signup} signups`}
              className="flex-1 rounded-t-sm bg-rope/80"
              style={{ height: `${Math.max(3, (d.visit / max) * 100)}%` }}
            />
          ))}
        </div>
      </div>

      {empty && (
        <div className="mt-8 rounded-xl border border-line bg-white p-5">
          <p className="font-semibold">Nothing tracked yet. One script tag turns this on.</p>
          <p className="mt-1 text-sm text-slate">
            Paste this before <code>&lt;/body&gt;</code> on your site. It records a visit on load. Then call{" "}
            <code>fh(&apos;signup&apos;)</code>, <code>fh(&apos;paywall&apos;)</code>, and <code>fh(&apos;payment&apos;)</code> from your
            app when each happens.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-granite p-3 text-xs text-chalk">{`<script src="${host}/t.js" data-p="${productId}" defer></script>`}</pre>
          <p className="mt-3 text-sm text-slate">
            No JavaScript? An image pixel works for visits:{" "}
            <code className="break-all">{`${host}/api/track?p=${productId}&e=visit`}</code>
          </p>
        </div>
      )}
    </div>
  );
}
