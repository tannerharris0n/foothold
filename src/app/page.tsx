import Link from "next/link";
import { Nav, Wordmark } from "@/components/Nav";

const SAMPLE_MOVES = [
  {
    channel: "reddit",
    title: "Reply in r/msp: 'How do you price a gap assessment?'",
    why: "Posted 3h ago. Four replies, none from someone who has done it. The thread asks for a method, not a tool.",
    minutes: 8,
  },
  {
    channel: "landing page",
    title: "Move the free tier above the fold",
    why: "Audit finding 2: the page says 'start free' in the nav and 'book a demo' in the hero. Pick one.",
    minutes: 15,
  },
  {
    channel: "dm",
    title: "Message the 3 consultants who complained about Word reports this week",
    why: "They described your problem in their own words. Ask how they do it today. Do not pitch.",
    minutes: 20,
  },
];

export default function Landing() {
  return (
    <main className="flex-1">
      <Nav />

      <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-16">
        <div className="flex flex-col justify-center">
          <h1 className="display text-[2.75rem] sm:text-6xl lg:text-[4.25rem]">
            Your first hundred users are already talking about the problem.
            <br />
            Go sit in that room.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate">
            Foothold reads your landing page, finds the threads and groups where your buyers describe the pain you
            solve, and hands you three growth moves a day with the reply, post, or fix already written. You read it, you
            make it yours, you publish. No ads, no scheduler, no posting on your behalf.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/start" className="btn btn-rope text-base">
              Start with your URL
            </Link>
            <Link href="#how" className="btn btn-ghost text-base">
              See a day
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate">Free while in beta. Takes about four minutes to get your first audit.</p>
        </div>

        <div className="relative">
          <div className="rule" />
          <div className="flex items-baseline justify-between py-3">
            <span className="font-semibold">Today</span>
            <span className="text-sm text-slate">3 moves, about 43 minutes</span>
          </div>
          <ol className="space-y-5">
            {SAMPLE_MOVES.map((m, i) => (
              <li key={i} className="hairline pt-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 shrink-0 text-sm font-semibold text-slate">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tag">{m.channel}</span>
                      <span className="text-xs text-slate">{m.minutes} min</span>
                    </div>
                    <p className="mt-1.5 font-semibold leading-snug">{m.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate">{m.why}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="hairline mt-5 pt-4 text-sm text-slate">
            Sample for a vCISO reporting tool. Yours is built from your page and your buyers.
          </div>
        </div>
      </section>

      <section id="how" className="bg-granite text-chalk">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <h2 className="display max-w-3xl text-4xl sm:text-5xl">A day with Foothold</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                t: "Day one: the audit",
                d: "Paste your URL. Foothold pulls the page, scores how ready it is to convert a stranger, rewrites the positioning in your buyer's words, and lists the five to nine things in the way. Then it maps the subreddits, groups, and people where that buyer already complains.",
              },
              {
                t: "Every morning: three moves",
                d: "It listens to those rooms overnight, picks what fits today from a library of playbooks that have worked at your stage, and drafts the whole thing: the reply, the post, the exact copy change, the five DMs. Each move says why it was chosen.",
              },
              {
                t: "You publish. It learns.",
                d: "Approve, edit, or skip. Drop one line of tracking on your site and the four-step funnel fills in. Skipped playbooks get retired, moves that produced signups get more weight, and the roadmap shifts with your traction.",
              },
            ].map((s, i) => (
              <li key={i}>
                <div className="border-t-2 border-chalk/80 pt-4 text-sm text-chalk/60">Step {i + 1}</div>
                <h3 className="mt-2 text-xl font-bold leading-snug">{s.t}</h3>
                <p className="mt-3 leading-relaxed text-chalk/75">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <h2 className="display text-4xl sm:text-5xl">What makes it more than a prompt</h2>
          <dl className="space-y-7">
            {[
              [
                "It works from evidence, not vibes.",
                "Every move cites what triggered it: a finding on your page, a thread posted hours ago, a step in your funnel that dropped. If it cannot point at a reason, it does not suggest the move.",
              ],
              [
                "It picks from playbooks, not from thin air.",
                "Twelve tactics that work between zero and the first hundred paying users, each with the rules that keep an account from getting banned. The model tailors; the library decides what is on the table.",
              ],
              [
                "It never posts for you.",
                "Reddit and X ban automation and your buyers can smell it. Foothold drafts, you publish from your own account, in your own voice. Slower by minutes, safer by a lot.",
              ],
              [
                "You own the data.",
                "Runs on your Supabase and your API key. The playbook library is a file you can edit. Nothing about your product leaves your stack except the model call.",
              ],
            ].map(([t, d]) => (
              <div key={t} className="hairline pt-5">
                <dt className="font-bold">{t}</dt>
                <dd className="mt-1.5 leading-relaxed text-slate">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-24">
        <div className="rule pt-10">
          <h2 className="display text-4xl sm:text-5xl">Four minutes to your first audit.</h2>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/start" className="btn btn-rope text-base">
              Start with your URL
            </Link>
          </div>
        </div>
      </section>

      <footer className="hairline mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-slate">
        <Wordmark />
        <span>Built for founders who ship first and market second.</span>
      </footer>
    </main>
  );
}
