"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { STAGES, type Stage } from "@/lib/types";

type Step = "stage" | "url" | "voice" | "email";
const ORDER: Step[] = ["stage", "url", "voice", "email"];

/**
 * Quiz-style onboarding. Stage first (it sets the playbook), then the URL,
 * then two optional questions that make the drafts sound like the founder.
 * Each screen asks one thing.
 */
export default function Start() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("stage");
  const [stage, setStage] = useState<Stage | null>(null);
  const [url, setUrl] = useState("");
  const [voice, setVoice] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(ORDER.length - 1, idx + 1)]);
  const back = () => setStep(ORDER[Math.max(0, idx - 1)]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, stage, voice, email }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error || "Could not start the audit.");
      router.push(`/app/${json.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="flex-1">
      <Nav right={<span className="text-sm text-slate">{idx + 1} of {ORDER.length}</span>} />
      <div className="mx-auto w-full max-w-2xl px-5 pb-24 pt-6 sm:pt-14">
        <div className="mb-10 flex gap-1.5" aria-hidden>
          {ORDER.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-rope" : "bg-chalk-2"}`} />
          ))}
        </div>

        {step === "stage" && (
          <>
            <h1 className="display text-4xl sm:text-5xl">Where are you right now?</h1>
            <p className="mt-4 text-slate">This decides which playbooks are on the table. You can change it later.</p>
            <ul className="mt-8 space-y-3">
              {STAGES.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setStage(s.id);
                      next();
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border-[1.5px] bg-white px-5 py-4 text-left transition-colors hover:border-rope ${
                      stage === s.id ? "border-rope" : "border-line"
                    }`}
                  >
                    <span>
                      <span className="block font-semibold">{s.label}</span>
                      <span className="block text-sm text-slate">{s.hint}</span>
                    </span>
                    <span aria-hidden className="text-slate">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === "url" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) next();
            }}
          >
            <h1 className="display text-4xl sm:text-5xl">Where does your product live?</h1>
            <p className="mt-4 text-slate">
              The landing page is enough. Foothold reads it the way a first-time visitor would, then goes looking for
              those visitors.
            </p>
            <input
              autoFocus
              className="field mt-8"
              placeholder="yourproduct.com"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="mt-6 flex items-center gap-3">
              <button type="submit" className="btn btn-rope" disabled={!url.trim()}>
                Continue
              </button>
              <button type="button" onClick={back} className="btn btn-quiet">
                Back
              </button>
            </div>
          </form>
        )}

        {step === "voice" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <h1 className="display text-4xl sm:text-5xl">How do you talk?</h1>
            <p className="mt-4 text-slate">
              Optional. A line or two about your voice and anything you never want said. Every draft follows it.
            </p>
            <textarea
              autoFocus
              className="field mt-8 min-h-32"
              placeholder="Direct, a little dry. I'm a practitioner, not a marketer. Never say 'game-changer' or 'seamless'. Fine to swear lightly on Reddit."
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
            />
            <div className="mt-6 flex items-center gap-3">
              <button type="submit" className="btn btn-rope">
                {voice.trim() ? "Continue" : "Skip for now"}
              </button>
              <button type="button" onClick={back} className="btn btn-quiet">
                Back
              </button>
            </div>
          </form>
        )}

        {step === "email" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <h1 className="display text-4xl sm:text-5xl">Where should the daily moves go?</h1>
            <p className="mt-4 text-slate">
              Optional. The dashboard has everything; email is a reminder, not a newsletter.
            </p>
            <input
              autoFocus
              className="field mt-8"
              placeholder="you@yourproduct.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="mt-4 text-sm text-flare">{error}</p>}
            <div className="mt-6 flex items-center gap-3">
              <button type="submit" className="btn btn-rope" disabled={busy}>
                {busy ? "Starting the audit" : "Run my audit"}
              </button>
              <button type="button" onClick={back} className="btn btn-quiet" disabled={busy}>
                Back
              </button>
            </div>
            <p className="mt-6 text-sm text-slate">
              Auditing <span className="font-semibold text-granite">{url}</span> as{" "}
              <span className="font-semibold text-granite">{STAGES.find((s) => s.id === stage)?.label.toLowerCase()}</span>.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
