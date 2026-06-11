"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { formatTime } from "@/lib/format";
import { listenerByName, KNOWLEDGE_TYPES, CRITICALITY, type Listener } from "@/lib/audience";

// How long before a reaction's timestamp its author appears as "typing…".
const TYPING_LEAD = 1.3; // seconds

// An avatar that reveals the listener's stats on hover — so you remember who's who.
function ListenerAvatar({ listener }: { listener: Listener }) {
  const k = KNOWLEDGE_TYPES.find((x) => x.id === listener.knowledge);
  const c = CRITICALITY.find((x) => x.id === listener.criticality);
  return (
    <div className="group/av relative">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-background ring-2 ring-background"
        style={{ backgroundColor: listener.color }}
      >
        {listener.initials}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-10 z-30 hidden w-56 -translate-x-1/2 rounded-xl border border-stone-700 bg-stone-900 p-3 text-left shadow-xl group-hover/av:block">
        <p className="text-sm font-medium text-foreground">
          {listener.name}, {listener.age}
          {listener.custom && <span className="ml-1 text-[10px] text-accent">yours</span>}
        </p>
        {listener.location && <p className="text-xs text-muted">{listener.location}</p>}
        <p className="mt-2 text-xs text-stone-300">
          {k?.label} · {c?.label} listener
        </p>
        <p className="text-xs text-muted">into {listener.genres.join(", ") || "all kinds"}</p>
        {listener.dealbreaker && (
          <p className="mt-1 text-xs text-muted">can&apos;t stand: {listener.dealbreaker}</p>
        )}
      </div>
    </div>
  );
}

export default function SessionPage() {
  const router = useRouter();
  const { fileUrl, fileName, reactions, room, lyrics } = useSession();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // How many reactions (sorted by time) have been revealed so far.
  const [shownCount, setShownCount] = useState(0);
  // Indices of reactions whose author is currently "typing" (in the lead window).
  const [typingIdx, setTypingIdx] = useState<number[]>([]);

  // If someone lands here without a loaded track / timeline (e.g. refresh wiped
  // the in-memory context), send them back to start.
  useEffect(() => {
    if (!fileUrl) router.replace("/");
  }, [fileUrl, router]);

  // Keep the latest reactions + shown count in refs so the rAF loop (created once)
  // always reads current values without being re-created.
  const reactionsRef = useRef(reactions ?? []);
  const shownCountRef = useRef(0);
  const typingKeyRef = useRef(""); // last typing set, to avoid redundant setState
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

    // "Typing": not-yet-revealed reactions whose author is within the lead window.
    const typing: number[] = [];
    for (let i = count; i < list.length && list[i].time - TYPING_LEAD <= t; i++) {
      typing.push(i);
    }
    const key = typing.join(",");
    if (key !== typingKeyRef.current) {
      typingKeyRef.current = key;
      setTypingIdx(typing);
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

  // Auto-scroll the feed to the newest reaction / typing bubble as they appear.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shownCount, typingIdx]);

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
  const all = reactions ?? [];
  const shown = all.slice(0, shownCount);
  const typing = typingIdx.map((i) => all[i]).filter(Boolean);

  if (!fileUrl) return null; // redirecting

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <audio
          ref={audioRef}
          src={fileUrl}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => {
            setIsPlaying(false);
            stopLoop();
            router.push("/summary"); // the payoff (Phase 4)
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

          <div className="relative flex items-center justify-center">
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
            <button
              type="button"
              onClick={() => router.push("/summary")}
              className="absolute right-0 text-sm text-muted transition-colors hover:text-foreground"
            >
              Skip to verdict →
            </button>
          </div>
        </div>

        {/* The room — reactions stream in at their timestamp */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 px-1">
            <span className="text-sm font-medium text-foreground">The room</span>
            {/* Who's listening — hover an avatar to see who they are */}
            <div className="flex gap-1.5">
              {(room?.listeners ?? []).map((l) => (
                <ListenerAvatar key={l.id} listener={l} />
              ))}
            </div>
          </div>

          <div
            ref={feedRef}
            className="flex h-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-stone-800 bg-surface/40 p-4"
          >
            {shown.length === 0 && typing.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center text-sm text-muted">
                Hit play — the room is listening.
              </div>
            ) : (
              <>
                {shown.map((r, i) => {
                  const p = listenerByName(room, r.persona);
                  return (
                    <div key={i} className="animate-reaction-in flex items-start gap-3">
                      <div
                        title={p ? `${p.name}, ${p.age} — ${KNOWLEDGE_TYPES.find((k) => k.id === p.knowledge)?.label}` : r.persona}
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
                })}

                {/* Typing indicators for whoever is about to speak */}
                {typing.map((r) => {
                  const p = listenerByName(room, r.persona);
                  return (
                    <div
                      key={`typing-${r.persona}-${r.time}`}
                      className="flex items-center gap-3 opacity-80"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-background"
                        style={{ backgroundColor: p?.color ?? "#78716c" }}
                      >
                        {p?.initials ?? r.persona.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-stone-800 px-3 py-2.5">
                        {[0, 0.2, 0.4].map((d) => (
                          <span
                            key={d}
                            className="typing-dot h-1.5 w-1.5 rounded-full bg-stone-400"
                            style={{ animationDelay: `${d}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

        <LyricsPanel lyrics={lyrics} />
      </div>
    </main>
  );
}

// Static lyrics block (Whisper transcript) shown beside the room.
function LyricsPanel({ lyrics }: { lyrics: string | null }) {
  return (
    <div className="flex w-full flex-col gap-3 lg:w-64 lg:shrink-0">
      <span className="px-1 text-sm font-medium text-foreground">Lyrics</span>
      <div className="h-72 overflow-y-auto rounded-2xl border border-stone-800 bg-surface/40 p-4 text-sm leading-relaxed text-stone-300 lg:h-114">
        {lyrics === null ? (
          <span className="text-muted">Transcribing the vocals…</span>
        ) : lyrics.trim().length === 0 ? (
          <span className="text-muted">No lyrics detected (instrumental, or transcription off).</span>
        ) : (
          <p className="whitespace-pre-wrap">{lyrics}</p>
        )}
      </div>
    </div>
  );
}
