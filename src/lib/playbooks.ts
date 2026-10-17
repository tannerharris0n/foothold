import type { MoveType, Stage } from "./types";

/**
 * The playbook library. This is the part that is not a thin wrapper: the
 * model picks from these, it does not invent tactics from nothing. Each
 * playbook says who it is for, when it applies, what "done" looks like, and
 * the rules that keep it from getting an account banned.
 */
export interface Playbook {
  id: string;
  name: string;
  type: MoveType;
  channel: string;
  stages: Stage[];
  /** Plain-English trigger the model checks against the audit and audience. */
  when: string;
  rules: string[];
  effortMinutes: number;
  /** Rough weekly cadence cap so the plan does not spam one channel. */
  maxPerWeek: number;
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: "reddit-helpful-reply",
    name: "Reply in a thread where someone has the exact problem",
    type: "reply",
    channel: "reddit",
    stages: ["built_no_users", "selling", "building"],
    when: "A thread from the last 7 days in a target subreddit describes the pain the product solves.",
    rules: [
      "Answer the question fully before any mention of the product.",
      "Mention the product only if the thread is explicitly asking for tools; otherwise leave it out and let the profile do the work.",
      "Match the subreddit's register. Shorter is better. No bullet lists in casual subs.",
      "Disclose that you built it if you name it.",
      "Never post the same reply in two subreddits.",
    ],
    effortMinutes: 8,
    maxPerWeek: 10,
  },
  {
    id: "reddit-story-post",
    name: "Post a build-in-public story in a founder subreddit",
    type: "post",
    channel: "reddit",
    stages: ["built_no_users", "selling"],
    when: "Account has 7+ days of comment history in the sub and the founder has a concrete lesson or number to share.",
    rules: [
      "Lead with the lesson or the number, not the product.",
      "No links in the body unless the sub allows them; put the product name in a reply to the first comment that asks.",
      "One post per sub per two weeks, maximum.",
    ],
    effortMinutes: 25,
    maxPerWeek: 2,
  },
  {
    id: "x-thread-pain",
    name: "Post on X about the pain, from the practitioner's seat",
    type: "post",
    channel: "x",
    stages: ["building", "built_no_users", "selling"],
    when: "The founder has a point of view on the problem that would make a peer nod.",
    rules: [
      "First line must stand alone and name a specific situation.",
      "No hashtags, no 'thread 🧵', no engagement bait.",
      "If it mentions the product, it is in the last post, as a plain statement.",
    ],
    effortMinutes: 15,
    maxPerWeek: 4,
  },
  {
    id: "x-reply-to-adjacent",
    name: "Reply to someone adjacent who has an audience",
    type: "reply",
    channel: "x",
    stages: ["building", "built_no_users", "selling"],
    when: "An account the ICP follows posted about the problem space in the last 48 hours.",
    rules: ["Add a concrete detail they did not say. Agreeing is not a reply.", "Never link to the product in a reply."],
    effortMinutes: 5,
    maxPerWeek: 7,
  },
  {
    id: "linkedin-practitioner-post",
    name: "LinkedIn post for a B2B buyer",
    type: "post",
    channel: "linkedin",
    stages: ["built_no_users", "selling"],
    when: "The ICP is a professional who buys tools for work and spends time on LinkedIn.",
    rules: [
      "Open with the observation, not with 'I'.",
      "Under 180 words. Short paragraphs. No 'Agree?' at the end.",
      "Link, if any, goes in the first comment.",
    ],
    effortMinutes: 20,
    maxPerWeek: 3,
  },
  {
    id: "dm-five-people",
    name: "Message five people who posted about the problem",
    type: "outreach",
    channel: "dm",
    stages: ["building", "built_no_users"],
    when: "There are identifiable people who recently complained about the pain in public.",
    rules: [
      "Reference the exact post they wrote.",
      "Ask one question about how they handle it today. Do not pitch.",
      "Offer a free setup call only after they reply.",
    ],
    effortMinutes: 20,
    maxPerWeek: 3,
  },
  {
    id: "landing-fix",
    name: "Fix one thing on the landing page",
    type: "fix",
    channel: "landing page",
    stages: ["built_no_users", "selling"],
    when: "The audit found a high-severity landing issue not yet marked done.",
    rules: ["One fix per move. Give the exact before and after copy or element.", "Say how to tell if it worked."],
    effortMinutes: 20,
    maxPerWeek: 3,
  },
  {
    id: "analytics-setup",
    name: "Install funnel tracking",
    type: "setup",
    channel: "analytics",
    stages: ["building", "built_no_users", "selling"],
    when: "No analytics detected or the four funnel steps are not instrumented.",
    rules: ["Name the exact events to fire and where.", "This is a one-time move; do not repeat once events are flowing."],
    effortMinutes: 30,
    maxPerWeek: 1,
  },
  {
    id: "onboarding-email",
    name: "Write the onboarding email that gets users to the first win",
    type: "content",
    channel: "email",
    stages: ["built_no_users", "selling"],
    when: "Signups exist but activation or payment is low.",
    rules: ["One email, one action. Subject under 6 words.", "Written by the founder, signed by the founder."],
    effortMinutes: 20,
    maxPerWeek: 2,
  },
  {
    id: "seo-geo-page",
    name: "Publish a page that answers the question buyers type",
    type: "content",
    channel: "seo",
    stages: ["built_no_users", "selling"],
    when: "There is a specific comparison, 'how do I', or 'X vs Y' query the ICP searches or asks an AI assistant.",
    rules: [
      "Title is the literal question. First paragraph answers it in two sentences.",
      "Include a plain comparison table and a short FAQ so AI assistants can quote it.",
      "Outline only; the founder writes from experience.",
    ],
    effortMinutes: 45,
    maxPerWeek: 1,
  },
  {
    id: "customer-interview",
    name: "Run one 20-minute call with someone in the ICP",
    type: "outreach",
    channel: "call",
    stages: ["exploring", "building", "built_no_users"],
    when: "Fewer than 10 conversations with real buyers have happened.",
    rules: ["Five questions, all about their current workaround.", "No demo unless they ask."],
    effortMinutes: 30,
    maxPerWeek: 3,
  },
  {
    id: "directory-listing",
    name: "List the product where buyers compare tools",
    type: "setup",
    channel: "directories",
    stages: ["built_no_users", "selling"],
    when: "The product is not listed on the two or three directories the ICP actually checks.",
    rules: ["Name the specific directory and why the ICP uses it.", "Reuse the audit's positioning rewrite for the listing copy."],
    effortMinutes: 25,
    maxPerWeek: 1,
  },
];

export function playbooksForStage(stage: Stage) {
  return PLAYBOOKS.filter((p) => p.stages.includes(stage));
}
