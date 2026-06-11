"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { formatTime } from "@/lib/format";

export default function SessionPage() {
  const router = useRouter();
  const { fileUrl, fileName } = useSession();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // If someone lands here without a loaded track (e.g. refresh wipes context), go back.
  useEffect(() => {
    if (!fileUrl) router.replace("/");
  }, [fileUrl, router]);

  // --- Timestamp tracking (decision D6: requestAnimationFrame) ---------------
  // Read audio.currentTime every frame (~60x/sec) for precision (Phase 3 fires
  // reactions off this), but throttle the *visible* clock to ~4x/sec so React
  // isn't re-rendering 60 times a second.
  const rafRef = useRef<number | null>(null);
  const lastDisplayRef = useRef(0);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) return; // already running

    const loop = () => {
      const audio = audioRef.current;
      if (!audio) return;

      // (Phase 3 will check reactions against audio.currentTime here — every frame.)

      const now = performance.now();
      if (now - lastDisplayRef.current >= 250) {
        lastDisplayRef.current = now;
        setCurrentTime(audio.currentTime);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopLoop(), [stopLoop]);

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
      setCurrentTime(audio.currentTime); // snap to the exact pause point
    }
  }, [startLoop, stopLoop]);

  // --- Seeking (decision D5: seekable progress bar) --------------------------
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
      setCurrentTime(t); // reflect immediately, even while paused
    },
    [duration],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!fileUrl) return null; // redirecting

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
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

        <div className="flex flex-col gap-6 rounded-2xl border border-stone-800 bg-surface/60 p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-medium text-foreground">
                {fileName}
              </p>
              <p className="text-sm text-muted">
                {isPlaying ? "Playing" : "Paused"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="shrink-0 text-sm text-muted transition-colors hover:text-foreground"
            >
              Change
            </button>
          </div>

          {/* Seekable progress bar */}
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

          {/* Play / pause */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-background transition-transform hover:scale-105 active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
