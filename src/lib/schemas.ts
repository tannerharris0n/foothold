/**
 * JSON Schemas for the documents the model produces. These are sent as
 * output_config.format so the API constrains generation to the shape, which
 * removes JSON parse failures entirely. Every object sets
 * additionalProperties: false, which the API requires.
 */

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const int = { type: "integer" } as const;
const strs = { type: "array", items: str } as const;

export const AUDIT_SCHEMA = {
  type: "object",
  properties: {
    summary: str,
    positioning: {
      type: "object",
      properties: {
        who: str,
        problem: str,
        promise: str,
        proof: str,
        rewrite: {
          type: "object",
          properties: { headline: str, subheadline: str, cta: str },
          required: ["headline", "subheadline", "cta"],
          additionalProperties: false,
        },
      },
      required: ["who", "problem", "promise", "proof", "rewrite"],
      additionalProperties: false,
    },
    findings: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          id: str,
          area: { type: "string", enum: ["positioning", "landing", "pricing", "onboarding", "analytics", "seo", "trust"] },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          title: str,
          evidence: str,
          fix: str,
        },
        required: ["id", "area", "severity", "title", "evidence", "fix"],
        additionalProperties: false,
      },
    },
    score: int,
  },
  required: ["summary", "positioning", "findings", "score"],
  additionalProperties: false,
} as const;

export const AUDIENCE_SCHEMA = {
  type: "object",
  properties: {
    icp: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: { title: str, description: str, pains: strs, triggers: strs },
        required: ["title", "description", "pains", "triggers"],
        additionalProperties: false,
      },
    },
    competitors: {
      type: "array",
      items: {
        type: "object",
        properties: { name: str, url: str, angle: str },
        required: ["name", "angle"],
        additionalProperties: false,
      },
    },
    communities: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["reddit", "x", "linkedin", "facebook", "slack", "forum"] },
          name: str,
          url: str,
          why: str,
          size: str,
        },
        required: ["platform", "name", "why"],
        additionalProperties: false,
      },
    },
    listeningQueries: { ...strs, minItems: 1 },
    bannedPhrases: strs,
  },
  required: ["icp", "competitors", "communities", "listeningQueries", "bannedPhrases"],
  additionalProperties: false,
} as const;

export const ROADMAP_SCHEMA = {
  type: "object",
  properties: {
    northStar: str,
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: { phase: str, title: str, detail: str },
        required: ["phase", "title", "detail"],
        additionalProperties: false,
      },
    },
  },
  required: ["northStar", "items"],
  additionalProperties: false,
} as const;

export const MOVES_SCHEMA = {
  type: "object",
  properties: {
    moves: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          playbookId: str,
          type: { type: "string", enum: ["reply", "post", "fix", "outreach", "content", "setup"] },
          channel: str,
          title: str,
          why: str,
          draft: str,
          targetUrl: str,
          effortMinutes: num,
        },
        required: ["playbookId", "type", "channel", "title", "why", "draft", "effortMinutes"],
        additionalProperties: false,
      },
    },
  },
  required: ["moves"],
  additionalProperties: false,
} as const;

export type JsonSchema = typeof AUDIT_SCHEMA | typeof AUDIENCE_SCHEMA | typeof ROADMAP_SCHEMA | typeof MOVES_SCHEMA;
