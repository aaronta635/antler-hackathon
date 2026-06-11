"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { formatTime } from "@/lib/format";
import type { Room } from "@/lib/audience";
import { summarySchema, type Summary } from "@/lib/summary";

function scoreColor(score: number): string {
  if (score >= 75) return "#34d399";
  if (score >= 55) return "#f59e0b";
  return "#fb7185";
}

export default function SummaryPage() {
  const router = useRouter();
  const { meta, room, reactions, summary, setSummary } = useSession();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!summary);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!meta || !reactions || !room) router.replace("/");
  }, [meta, reactions, room, router]);

  // Persist the finished session once (best-effort; no-op if Supabase is off).
  const persisted = useRef(false);
  useEffect(() => {
    if (!summary || persisted.current || !meta || !room || !reactions) return;
    persisted.current = true;
    (async () => {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meta, room, reactions, summary }),
        });
        const data = await res.json();
        if (data?.id) setSessionId(data.id);
      } catch {
        /* persistence is optional */
      }
    })();
  }, [summary, meta, room, reactions]);

  const requested = useRef(false);
  useEffect(() => {
    if (summary || requested.current || !meta || !reactions || !room) return;
    requested.current = true;
    (async () => {
      try {
        const res = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meta, room, reactions }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "Couldn't reach a verdict. Try again.");
          return;
        }
        const parsed = summarySchema.safeParse(data?.summary);
        if (!parsed.success) {
          setError("Got an unexpected verdict. Try again.");
          return;
        }
        setSummary(parsed.data);
      } catch {
        setError("Network error — check your connection and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [summary, meta, room, reactions, setSummary]);

  if (!meta || !reactions || !room) return null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {loading && !summary && <VerdictLoading />}
        {error && !summary && <VerdictError message={error} onRetry={() => router.refresh()} />}
        {summary && (
          <div className="flex flex-col gap-6">
            <Dashboard summary={summary} room={room} title={meta.title} onReplay={() => router.push("/")} />
            {sessionId && <Feedback sessionId={sessionId} />}
          </div>
        )}
      </div>
    </main>
  );
}

const FEELINGS: [string, string][] = [
  ["loved", "🔥"],
  ["useful", "🙂"],
  ["meh", "😐"],
  ["off", "👎"],
];

function Feedback({ sessionId }: { sessionId: string }) {
  const [feeling, setFeeling] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!feeling && !comment.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          feeling: feeling ?? undefined,
          comment: comment.trim() || undefined,
          // Attach the waitlist identity so feedback isn't anonymous.
          name: localStorage.getItem("waitlist_name") ?? undefined,
          email: localStorage.getItem("waitlist_email") ?? undefined,
        }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <p className="text-center text-sm text-muted">Thanks for the feedback ✦</p>;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-800 bg-surface/40 p-5">
      <p className="text-sm font-medium text-foreground">Was this useful?</p>
      <div className="flex gap-2">
        {FEELINGS.map(([id, emoji]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFeeling(id)}
            className={`flex-1 rounded-xl border px-2 py-2 text-center transition-colors ${
              feeling === id ? "border-accent bg-accent/10" : "border-stone-700 hover:border-stone-500"
            }`}
          >
            <span className="text-lg">{emoji}</span>
            <span className="block text-[11px] capitalize text-muted">{id}</span>
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything else? (optional)"
        rows={2}
        className="resize-none rounded-lg border border-stone-700 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || (!feeling && !comment.trim())}
        className="self-end rounded-full bg-accent px-5 py-2 text-sm font-medium text-background disabled:opacity-40"
      >
        {busy ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}

function VerdictLoading() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-accent" />
      <p className="text-sm text-muted">Tallying the room…</p>
    </div>
  );
}

function VerdictError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-sm text-rose-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-background"
      >
        Try again
      </button>
    </div>
  );
}

function Dashboard({
  summary,
  room,
  title,
  onReplay,
}: {
  summary: Summary;
  room: Room;
  title: string;
  onReplay: () => void;
}) {
  const n = room.listeners.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted">Readiness scorecard · {title}</p>
        <p className="mt-2 text-lg font-medium leading-snug text-foreground">{summary.headline}</p>
      </div>

      {/* Readiness score + craft breakdown */}
      <div className="flex flex-col gap-5 rounded-2xl border border-stone-800 bg-surface/60 p-5 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center justify-center sm:w-28 sm:border-r sm:border-stone-800 sm:pr-4">
          <span className="text-5xl font-bold tabular-nums" style={{ color: scoreColor(summary.readiness) }}>
            {Math.round(summary.readiness)}
          </span>
          <span className="text-xs text-muted">/ 100 ready</span>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          {summary.dimensions.map((d) => (
            <DimensionBar key={d.name} name={d.name} score={d.score} note={d.note} />
          ))}
        </div>
      </div>

      {/* The one thing to fix first — the truth the group chat won't tell them */}
      <div className="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-rose-300">Fix this first</p>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-200">{summary.fixFirst}</p>
      </div>

      {/* Best moment + market signal */}
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Best moment" value={formatTime(summary.bestMoment.time)} note={summary.bestMoment.note} accent="#34d399" />
        <Stat
          label="Would share"
          value={`${summary.share.count}/${n}`}
          note={`${summary.share.persona} · ${summary.share.platform}`}
          accent="#f59e0b"
        />
      </div>

      <button
        type="button"
        onClick={onReplay}
        className="self-center rounded-full bg-accent px-6 py-3 font-medium text-background transition-transform hover:scale-[1.02]"
      >
        Play another track
      </button>
    </div>
  );
}

function DimensionBar({ name, score, note }: { name: string; score: number; note: string }) {
  const color = scoreColor(score);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <span className="font-mono text-xs tabular-nums" style={{ color }}>
          {Math.round(score)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] leading-tight text-muted">{note}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-stone-800 bg-surface/60 p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-mono text-2xl font-semibold tabular-nums" style={{ color: accent }}>
        {value}
      </span>
      <span className="text-[11px] leading-tight text-stone-300">{note}</span>
    </div>
  );
}
