// Core domain types. Everything the app stores lives here.

export type Stage =
  | "exploring"
  | "building"
  | "built_no_users"
  | "selling"
  | "other";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "exploring", label: "Just exploring", hint: "No product yet, sizing up an idea" },
  { id: "building", label: "Building my first product", hint: "Pre-launch, shipping toward a v1" },
  { id: "built_no_users", label: "Built it, but no users", hint: "It's live. Nobody's showing up." },
  { id: "selling", label: "Already selling", hint: "Some revenue, want more of it" },
  { id: "other", label: "Something else", hint: "Agency, side project, content, whatever" },
];

export interface Product {
  id: string;
  url: string;
  name: string;
  stage: Stage;
  email?: string;
  /** Short founder-written or scraped one-liner. */
  oneLiner?: string;
  /** Voice notes the founder gives us, used in every draft. */
  voice?: string;
  createdAt: string;
  status: "new" | "auditing" | "ready" | "error";
  error?: string;
}

/** What the scraper pulled off the landing page. Raw-ish, stored for the audit. */
export interface SiteSnapshot {
  url: string;
  fetchedAt: string;
  title: string;
  description: string;
  h1: string[];
  h2: string[];
  ctas: string[];
  pricingMentions: string[];
  socialProofSignals: string[];
  analytics: string[];
  hasForm: boolean;
  wordCount: number;
  textSample: string;
  pricingPageText?: string;
}

export interface AuditFinding {
  id: string;
  area: "positioning" | "landing" | "pricing" | "onboarding" | "analytics" | "seo" | "trust";
  severity: "high" | "medium" | "low";
  title: string;
  evidence: string;
  fix: string;
}

export interface Audit {
  productId: string;
  createdAt: string;
  summary: string;
  positioning: {
    who: string;
    problem: string;
    promise: string;
    proof: string;
    rewrite: { headline: string; subheadline: string; cta: string };
  };
  findings: AuditFinding[];
  score: number; // 0-100, how ready the funnel is to convert cold traffic
}

export interface Community {
  platform: "reddit" | "x" | "linkedin" | "facebook" | "slack" | "forum";
  name: string; // r/msp, #vciso, etc.
  url?: string;
  why: string;
  size?: string;
}

export interface Audience {
  productId: string;
  createdAt: string;
  icp: { title: string; description: string; pains: string[]; triggers: string[] }[];
  competitors: { name: string; url?: string; angle: string }[];
  communities: Community[];
  /** Search phrases that surface conversations where the pain is being discussed. */
  listeningQueries: string[];
  /** Phrases to never use; what the audience smells as marketing. */
  bannedPhrases: string[];
}

export type MoveType = "reply" | "post" | "fix" | "outreach" | "content" | "setup";
export type MoveStatus = "pending" | "approved" | "done" | "skipped";

export interface Move {
  id: string;
  productId: string;
  date: string; // YYYY-MM-DD
  type: MoveType;
  channel: string; // reddit, x, linkedin, landing page, email, ...
  title: string;
  why: string;
  draft: string;
  targetUrl?: string;
  effortMinutes: number;
  status: MoveStatus;
  playbookId?: string;
  createdAt: string;
  updatedAt: string;
  /** Where this move came from: live model run or bundled seed data. */
  source: "model" | "seed";
}

export interface RoadmapItem {
  id: string;
  phase: string;
  title: string;
  detail: string;
  done: boolean;
}

export interface Roadmap {
  productId: string;
  createdAt: string;
  northStar: string;
  items: RoadmapItem[];
}

export type FunnelStep = "visit" | "signup" | "paywall" | "payment";
export const FUNNEL_STEPS: FunnelStep[] = ["visit", "signup", "paywall", "payment"];

export interface TrackEvent {
  id: string;
  productId: string;
  step: FunnelStep;
  anonId?: string;
  ts: string;
  ref?: string;
}

export interface RedditThread {
  id: string;
  subreddit: string;
  title: string;
  body: string;
  url: string;
  score: number;
  comments: number;
  createdUtc: number;
  author: string;
}
