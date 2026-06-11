"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { formatTime } from "@/lib/format";
import { personaByName } from "@/lib/personas";

export default function SessionPage() {
  const router = useRouter();
  const { fileUrl, fileName, reactions } = useSession();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // How many reactions (sorted by time) have been revealed so far.
  const [shownCount, setShownCount] = useState(0);

  // If someone lands here without a loaded track / timeline (e.g. refresh wiped
  // the in-memory context), send them back to start.
  useEffect(() => {
    if (!fileUrl) router.replace("/");
  }, [fileUrl, router]);

  // Keep the latest reactions + shown count in refs so the rAF loop (created once)
  // always reads current values without being re-created.
  const reactionsRef = useRef(reactions ?? []);
  const shownCountRef = useRef(0);
  useEffect(() => {
    reactionsRef.current = reactions ?? [];
  }, [reactions]);

  // --- Reaction sync (Phase 3) ----------------------------------------------
  // Reactions are sorted by time. The revealed set is simply every reaction whose
  // time has passed. Recomputing from 0 each call means seeking BACKWARD correctly
  // hides later reactions, and seeking forward reveals them — no stale pointer.
  const syncReactions = useCallback((t: number) => {
    const list = reactionsRef.current;
    let count = 0;
    while (count < list.length && list[count].time <= t) count++;
    if (count !== shownCountRef.current) {
      shownCountRef.current = count;
      setShownCount(count);
    }
  }, []);

  // --- Timestamp loop (decision D6: requestAnimationFrame) -------------------
  // Reaction triggers are checked every frame (~60x/sec) so they land on time;
  // the visible clock is throttled to ~4x/sec to avoid needless re-renders.
  const rafRef = useRef<number | null>(null);
  const lastDisplayRef = useRef(0);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) return;

    const loop = () => {
      const audio = audioRef.current;
      if (!audio) return;
      const t = audio.currentTime;

      syncReactions(t); // precise, every frame

      const now = performance.now();
      if (now - lastDisplayRef.current >= 250) {
        lastDisplayRef.current = now;
        setCurrentTime(t);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [syncReactions]);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopLoop(), [stopLoop]);

  // Auto-scroll the feed to the newest reaction as they stream in.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shownCount]);

  // --- Play / pause ----------------------------------------------------------
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
      startLoop();
    } else {
      audio.pause();
      setIsPlaying(false);
      stopLoop();
      setCurrentTime(audio.currentTime);
    }
  }, [startLoop, stopLoop]);

  // --- Seeking (decision D5) -------------------------------------------------
  const seekRef = useRef(false);

  const applySeek = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      const audio = audioRef.current;
      if (!track || !audio || !duration) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const t = ratio * duration;
      audio.currentTime = t;
      setCurrentTime(t);
      syncReactions(t); // update the feed immediately, even while paused
    },
    [duration, syncReactions],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const shown = (reactions ?? []).slice(0, shownCount);

  if (!fileUrl) return null; // redirecting

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <audio
          ref={audioRef}
          src={fileUrl}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => {
            setIsPlaying(false);
            stopLoop();
          }}
          hidden
        />

        {/* Player */}
        <div className="flex flex-col gap-6 rounded-2xl border border-stone-800 bg-surface/60 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-medium text-foreground">{fileName}</p>
              <p className="text-sm text-muted">{isPlaying ? "Playing" : "Paused"}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="shrink-0 text-sm text-muted transition-colors hover:text-foreground"
            >
              Change
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div
              ref={trackRef}
              onPointerDown={(e) => {
                seekRef.current = true;
                (e.target as Element).setPointerCapture?.(e.pointerId);
                applySeek(e.clientX);
              }}
              onPointerMove={(e) => {
                if (seekRef.current) applySeek(e.clientX);
              }}
              onPointerUp={() => {
                seekRef.current = false;
              }}
              className="group relative h-2 w-full cursor-pointer rounded-full bg-stone-800"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent opacity-0 shadow transition-opacity group-hover:opacity-100"
                style={{ left: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-xs tabular-nums text-muted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-background transition-transform hover:scale-105 active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* The room — reactions stream in at their timestamp */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-foreground">The room</span>
            <span className="text-xs text-muted">
              {shown.length} / {(reactions ?? []).length} reactions
            </span>
          </div>

          <div
            ref={feedRef}
            className="flex h-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-stone-800 bg-surface/40 p-4"
          >
            {shown.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center text-sm text-muted">
                Hit play — the room is listening.
              </div>
            ) : (
              shown.map((r, i) => {
                const p = personaByName(r.persona);
                return (
                  <div key={i} className="animate-reaction-in flex items-start gap-3">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-background"
                      style={{ backgroundColor: p?.color ?? "#78716c" }}
                    >
                      {p?.initials ?? r.persona.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-foreground">{r.persona}</span>
                        <span className="font-mono text-[11px] tabular-nums text-muted">
                          {formatTime(r.time)}
                        </span>
                      </div>
                      <p className="text-sm text-stone-300">{r.reaction}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
