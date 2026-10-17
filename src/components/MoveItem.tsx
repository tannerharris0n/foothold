"use client";

import { useState } from "react";
import type { Move, MoveStatus } from "@/lib/types";

const STATUS_LABEL: Record<MoveStatus, string> = {
  pending: "To do",
  approved: "Approved",
  done: "Done",
  skipped: "Skipped",
};

export function MoveItem({
  move,
  index,
  onChange,
}: {
  move: Move;
  index: number;
  onChange: (m: Move) => void;
}) {
  const [open, setOpen] = useState(move.status === "pending" && index === 0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(move.draft);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function patch(body: { status?: MoveStatus; draft?: string }) {
    setBusy(true);
    try {
      const res = await fetch(`/api/moves/${move.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { move?: Move };
      if (json.move) onChange(json.move);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; the textarea is selectable anyway
    }
  }

  const dim = move.status === "done" || move.status === "skipped";

  return (
    <li className={`hairline pt-4 ${dim ? "opacity-60" : ""}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 text-left">
        <span className="mt-0.5 w-5 shrink-0 text-sm font-semibold text-slate">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="tag">{move.channel}</span>
            <span className="text-xs text-slate">{move.effortMinutes} min</span>
            {move.status !== "pending" && (
              <span className={`tag ${move.status === "done" ? "tag-moss" : move.status === "approved" ? "tag-rope" : ""}`}>
                {STATUS_LABEL[move.status]}
              </span>
            )}
            {move.source === "seed" && <span className="tag">sample</span>}
          </span>
          <span className={`mt-1.5 block font-semibold leading-snug ${move.status === "done" ? "line-through" : ""}`}>
            {move.title}
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-slate">{move.why}</span>
        </span>
        <span aria-hidden className={`mt-1 text-slate transition-transform ${open ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>

      {open && (
        <div className="mt-4 pl-8">
          {move.targetUrl && (
            <a
              href={move.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-3 inline-block break-all text-sm font-semibold text-rope hover:underline"
            >
              {move.targetUrl.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          )}
          {editing ? (
            <textarea
              className="field min-h-48 font-sans text-[0.95rem] leading-relaxed"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : (
            <div className="draft">{draft}</div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  className="btn btn-rope"
                  disabled={busy}
                  onClick={async () => {
                    await patch({ draft });
                    setEditing(false);
                  }}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    setDraft(move.draft);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-quiet" onClick={copy}>
                  {copied ? "Copied" : "Copy"}
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setEditing(true)}>
                  Edit
                </button>
                {move.status !== "done" && (
                  <button type="button" className="btn btn-rope" disabled={busy} onClick={() => patch({ status: "done" })}>
                    Mark published
                  </button>
                )}
                {move.status === "pending" && (
                  <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => patch({ status: "skipped" })}>
                    Skip
                  </button>
                )}
                {(move.status === "skipped" || move.status === "done") && (
                  <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => patch({ status: "pending" })}>
                    Reopen
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
