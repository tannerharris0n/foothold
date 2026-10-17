import { FUNNEL_STEPS, type FunnelStep, type TrackEvent } from "./types";

export interface FunnelRow {
  step: FunnelStep;
  label: string;
  count: number;
  /** Share of the first step, 0-1. */
  ofTop: number;
  /** Share of the previous step, 0-1. */
  ofPrev: number;
}

const LABELS: Record<FunnelStep, string> = {
  visit: "Website visitors",
  signup: "Signed up",
  paywall: "Reached paywall",
  payment: "Paid",
};

/** Count unique anon ids per step (falls back to raw events when no anon id). */
export function computeFunnel(events: TrackEvent[]): FunnelRow[] {
  const counts: Record<FunnelStep, number> = { visit: 0, signup: 0, paywall: 0, payment: 0 };
  const seen: Record<FunnelStep, Set<string>> = {
    visit: new Set(),
    signup: new Set(),
    paywall: new Set(),
    payment: new Set(),
  };
  for (const e of events) {
    if (!FUNNEL_STEPS.includes(e.step)) continue;
    if (e.anonId) {
      if (!seen[e.step].has(e.anonId)) {
        seen[e.step].add(e.anonId);
        counts[e.step]++;
      }
    } else counts[e.step]++;
  }
  const top = counts.visit || 1;
  let prev = counts.visit;
  return FUNNEL_STEPS.map((step, i) => {
    const count = counts[step];
    const row: FunnelRow = {
      step,
      label: LABELS[step],
      count,
      ofTop: count / top,
      ofPrev: i === 0 ? 1 : prev ? count / prev : 0,
    };
    prev = count;
    return row;
  });
}

/** Daily visit and signup counts for a sparkline-style strip. */
export function dailySeries(events: TrackEvent[], days = 14) {
  const out: { date: string; visit: number; signup: number; payment: number }[] = [];
  const byDay = new Map<string, { visit: number; signup: number; payment: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    byDay.set(d, { visit: 0, signup: 0, payment: 0 });
  }
  for (const e of events) {
    const d = e.ts.slice(0, 10);
    const row = byDay.get(d);
    if (!row) continue;
    if (e.step === "visit") row.visit++;
    if (e.step === "signup") row.signup++;
    if (e.step === "payment") row.payment++;
  }
  for (const [date, v] of byDay) out.push({ date, ...v });
  return out;
}
