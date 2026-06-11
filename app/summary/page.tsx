"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { formatTime } from "@/lib/format";
import { personaByName } from "@/lib/personas";
import { summarySchema, type Summary } from "@/lib/summary";

export default function SummaryPage() {
  const router = useRouter();
  const { meta, reactions, summary, setSummary } = useSession();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!summary);

  // No timeline in memory (refresh wiped context) -> back to start.
  useEffect(() => {
    if (!meta || !reactions) router.replace("/");
  }, [meta, reactions, router]);

  // Generate the verdict once, on arrival, unless it's already cached in context.
  const requested = useRef(false);
  useEffect(() => {
    if (summary || requested.current || !meta || !reactions) return;
    requested.current = true;

    (async () => {
      try {
        const res = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meta, reactions }),
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
  }, [summary, meta, reactions, setSummary]);

  if (!meta || !reactions) return null; // redirecting

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {loading && !summary && <VerdictLoading />}
        {error && !summary && <VerdictError message={error} onRetry={() => router.refresh()} />}
        {summary && <Verdict summary={summary} title={meta.title} onReplay={() => router.push("/")} />}
      </div>
    </main>
  );
}

function VerdictLoading() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-accent" />
      <p className="text-sm text-muted">The room is deciding…</p>
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

function Verdict({
  summary,
  title,
  onReplay,
}: {
  summary: Summary;
  title: string;
  onReplay: () => void;
}) {
  const sharer = personaByName(summary.share.persona);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted">The room has spoken</p>
        <p className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-foreground">
          {summary.verdict}
        </p>
        <p className="mt-2 text-sm text-muted">on “{title}”</p>
      </div>

      <div className="grid gap-4">
        {/* Best moment */}
        <div className="rounded-2xl border border-stone-800 bg-surface/60 p-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-accent">Best moment</span>
            <span className="font-mono text-xs tabular-nums text-muted">
              {formatTime(summary.bestMoment.time)}
            </span>
          </div>
          <p className="mt-2 text-sm text-stone-300">{summary.bestMoment.why}</p>
        </div>

        {/* Drop-off risk */}
        <div className="rounded-2xl border border-stone-800 bg-surface/60 p-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-rose-400">Biggest risk</span>
            <span className="font-mono text-xs tabular-nums text-muted">
              {formatTime(summary.dropOff.time)}
            </span>
          </div>
          <p className="mt-2 text-sm text-stone-300">{summary.dropOff.why}</p>
        </div>

        {/* Share signal */}
        <div className="rounded-2xl border border-stone-800 bg-surface/60 p-5">
          <span className="text-sm font-medium text-foreground">Who&apos;d share it</span>
          <div className="mt-3 flex items-start gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-background"
              style={{ backgroundColor: sharer?.color ?? "#78716c" }}
            >
              {sharer?.initials ?? summary.share.persona.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-stone-300">
                <span className="font-medium text-foreground">{summary.share.persona}</span> →{" "}
                <span className="text-accent">{summary.share.platform}</span>
              </p>
              <p className="mt-1 text-sm text-stone-300">{summary.share.what}</p>
            </div>
          </div>
        </div>
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
