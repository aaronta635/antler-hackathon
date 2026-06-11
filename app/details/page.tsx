"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { trackMetaSchema, type TrackMeta } from "@/lib/reactions";

function titleFromFile(name: string): string {
  return name.replace(/\.[^/.]+$/, "");
}

export default function DetailsPage() {
  const router = useRouter();
  const { fileUrl, fileName, file, lyrics, setLyrics, setMeta } = useSession();

  const [title, setTitle] = useState(() => (fileName ? titleFromFile(fileName) : ""));
  const [genre, setGenre] = useState("");
  const [vibe, setVibe] = useState("");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl) router.replace("/");
  }, [fileUrl, router]);

  // Read the real duration straight off the audio file (once).
  const probed = useRef(false);
  useEffect(() => {
    if (!fileUrl || probed.current) return;
    probed.current = true;
    const probe = new Audio(fileUrl);
    probe.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(probe.duration)) setDuration(Math.round(probe.duration));
    });
  }, [fileUrl]);

  // Kick off lyric transcription in the background (lands in context even after
  // we navigate on). Empty string = "done, no lyrics" so we don't retry.
  const transcribed = useRef(false);
  useEffect(() => {
    if (!file || lyrics !== null || transcribed.current) return;
    transcribed.current = true;
    (async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json();
        setLyrics(typeof data?.lyrics === "string" ? data.lyrics : "");
      } catch {
        setLyrics("");
      }
    })();
  }, [file, lyrics, setLyrics]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const meta: TrackMeta = { title, genre, vibe, duration };
    const parsed = trackMetaSchema.safeParse(meta);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please fill in every field.");
      return;
    }
    setMeta(parsed.data);
    router.push("/audience"); // next: build the room that listens
  }

  if (!fileUrl) return null;

  const ready = title.trim() && genre.trim() && vibe.trim() && duration > 0;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xl flex-col gap-6 rounded-2xl border border-stone-800 bg-surface/60 p-8"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Tell us about your track
          </h1>
          <p className="mt-1 text-sm text-muted">
            Describe it like you would to a friend — this is what the room reacts to.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Track title"
            className="rounded-lg border border-stone-700 bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">Genre</span>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g. indie pop, drill, lo-fi house"
            className="rounded-lg border border-stone-700 bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">The vibe</span>
          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="Moody late-night drive with a big euphoric drop at the end..."
            rows={3}
            className="resize-none rounded-lg border border-stone-700 bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>

        <div className="flex items-center justify-between text-sm text-muted">
          <span>Duration</span>
          <span className="font-mono tabular-nums">
            {duration > 0 ? `${duration}s (auto-detected)` : "reading…"}
          </span>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!ready}
          className="rounded-full bg-accent px-6 py-3 font-medium text-background transition-opacity disabled:opacity-40"
        >
          Next: build the room →
        </button>
      </form>
    </main>
  );
}
