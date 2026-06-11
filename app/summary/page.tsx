"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { formatTime } from "@/lib/format";
import { listenerByName, type Room } from "@/lib/audience";
import { summarySchema, type Summary } from "@/lib/summary";

const VERDICT_COLOR: Record<string, string> = {
  loved: "#34d399",
  mixed: "#f59e0b",
  passed: "#fb7185",
};

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
        body: JSON.stringify({ sessionId, feeling: feeling ?? undefined, comment: comment.trim() || undefined }),
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
  const { loved, mixed, passed } = summary.sentiment;
  const total = Math.max(1, loved + mixed + passed);
  const n = room.listeners.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted">Scorecard · {title}</p>
        <p className="mt-2 text-lg font-medium leading-snug text-foreground">{summary.headline}</p>
      </div>

      {/* Score + sentiment */}
      <div className="grid grid-cols-3 gap-4 rounded-2xl border border-stone-800 bg-surface/60 p-5">
        <div className="flex flex-col items-center justify-center border-r border-stone-800">
          <span
            className="text-5xl font-bold tabular-nums"
            style={{ color: scoreColor(summary.score) }}
          >
            {Math.round(summary.score)}
          </span>
          <span className="text-xs text-muted">/ 100 room score</span>
        </div>
        <div className="col-span-2 flex flex-col justify-center gap-2">
          <div className="flex h-3 overflow-hidden rounded-full bg-stone-800">
            {(["loved", "mixed", "passed"] as const).map((k) => {
              const v = summary.sentiment[k];
              return (
                <div
                  key={k}
                  style={{ width: `${(v / total) * 100}%`, backgroundColor: VERDICT_COLOR[k] }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs">
            <Legend color={VERDICT_COLOR.loved} label="loved" n={loved} />
            <Legend color={VERDICT_COLOR.mixed} label="mixed" n={mixed} />
            <Legend color={VERDICT_COLOR.passed} label="passed" n={passed} />
          </div>
        </div>
      </div>

      {/* Best / drop-off / share */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Best moment" value={formatTime(summary.bestMoment.time)} note={summary.bestMoment.note} accent="#34d399" />
        <Stat label="Drop-off" value={formatTime(summary.dropOff.time)} note={summary.dropOff.note} accent="#fb7185" />
        <Stat
          label="Would share"
          value={`${summary.share.count}/${n}`}
          note={`${summary.share.persona} · ${summary.share.platform}`}
          accent="#f59e0b"
        />
      </div>

      {/* Per-listener verdicts */}
      <div className="grid grid-cols-2 gap-2">
        {summary.listeners.map((l) => {
          const p = listenerByName(room, l.name);
          return (
            <div
              key={l.name}
              className="flex items-center gap-2 rounded-xl border border-stone-800 bg-surface/40 px-3 py-2"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-background"
                style={{ backgroundColor: p?.color ?? "#78716c" }}
              >
                {p?.initials ?? l.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">{l.name}</span>
                <span className="block truncate text-[11px] text-muted">{l.note}</span>
              </span>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: VERDICT_COLOR[l.verdict] }}
                title={l.verdict}
              />
            </div>
          );
        })}
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

function Legend({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {n} {label}
    </span>
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
