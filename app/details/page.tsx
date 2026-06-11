"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { reactionsResponseSchema, type TrackMeta } from "@/lib/reactions";

// Strip the extension to seed the title field from the filename.
function titleFromFile(name: string): string {
  return name.replace(/\.[^/.]+$/, "");
}

export default function DetailsPage() {
  const router = useRouter();
  const { fileUrl, fileName, setGenerated } = useSession();

  // Seed the title from the filename at first render (context already has it
  // by the time we navigate here from /).
  const [title, setTitle] = useState(() => (fileName ? titleFromFile(fileName) : ""));
  const [genre, setGenre] = useState("");
  const [vibe, setVibe] = useState("");
  const [duration, setDuration] = useState(0); // seconds, auto-detected
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: no track loaded (e.g. refresh wiped context) -> back to upload.
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const meta: TrackMeta = { title, genre, vibe, duration };
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      const data = await res.json();

      if (!res.ok) {
        // The API always returns { error } on failure — show it as-is.
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Validate the shape on the client too, so a surprise payload can't crash /session.
      const parsed = reactionsResponseSchema.safeParse(data);
      if (!parsed.success) {
        setError("Got an unexpected response. Please try again.");
        return;
      }

      setGenerated(meta, parsed.data.reactions);
      router.push("/session");
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!fileUrl) return null; // redirecting

  const ready = title.trim() && genre.trim() && vibe.trim() && duration > 0;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xl flex-col gap-6 rounded-2xl border border-stone-800 bg-surface/60 p-8"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Tell the room about your track
          </h1>
          <p className="mt-1 text-sm text-muted">
            The audience reacts to this — describe it like you would to a friend.
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
          disabled={!ready || submitting}
          className="flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-background transition-opacity disabled:opacity-40"
        >
          {submitting ? "Gathering the room…" : "Generate the listening session"}
        </button>
      </form>
    </main>
  );
}
