"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { reactionsResponseSchema } from "@/lib/reactions";
import {
  DEFAULT_LISTENERS,
  KNOWLEDGE_TYPES,
  GENRES,
  CRITICALITY,
  BRUTALITY,
  MAX_ROOM,
  colorForIndex,
  initialsFromName,
  type Listener,
  type KnowledgeId,
  type CriticalityId,
  type BrutalityId,
  type Room,
} from "@/lib/audience";

export default function AudiencePage() {
  const router = useRouter();
  const { fileUrl, meta, lyrics, setRoom, setReactions } = useSession();

  // Default roster: all 5 selected to start.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(DEFAULT_LISTENERS.map((l) => l.id)),
  );
  const [custom, setCustom] = useState<Listener[]>([]);
  const [brutality, setBrutality] = useState<BrutalityId>("honest");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl) router.replace("/");
    else if (!meta) router.replace("/details");
  }, [fileUrl, meta, router]);

  const roomListeners = useMemo(
    () => [...DEFAULT_LISTENERS.filter((l) => selectedIds.has(l.id)), ...custom],
    [selectedIds, custom],
  );
  const count = roomListeners.length;
  const full = count >= MAX_ROOM;

  function toggleDefault(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (count < MAX_ROOM) next.add(id);
      return next;
    });
  }

  function removeCustom(id: string) {
    setCustom((prev) => prev.filter((l) => l.id !== id));
  }

  async function startSession() {
    if (!meta) return;
    if (count === 0) {
      setError("Pick at least one listener.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const room: Room = { listeners: roomListeners, brutality };
    setRoom(room);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta, room, lyrics: lyrics || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      const parsed = reactionsResponseSchema.safeParse(data);
      if (!parsed.success) {
        setError("Got an unexpected response. Please try again.");
        return;
      }
      setReactions(parsed.data.reactions);
      router.push("/session");
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!fileUrl || !meta) return null;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Build the room
          </h1>
          <p className="mt-2 text-sm text-muted">
            Choose who&apos;s listening to “{meta.title}”. Up to {MAX_ROOM}.{" "}
            <span className="text-foreground">{count} in the room.</span>
          </p>
        </div>

        {/* Default roster */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">Our listeners</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {DEFAULT_LISTENERS.map((l) => {
              const on = selectedIds.has(l.id);
              const disabled = !on && full;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleDefault(l.id)}
                  disabled={disabled}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    on
                      ? "border-accent bg-accent/10"
                      : disabled
                        ? "border-stone-800 opacity-40"
                        : "border-stone-700 hover:border-stone-500"
                  }`}
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-background"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {l.name}, {l.age}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {KNOWLEDGE_TYPES.find((k) => k.id === l.knowledge)?.label} ·{" "}
                      {CRITICALITY.find((c) => c.id === l.criticality)?.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Custom listeners */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">Your audience</h2>
          {custom.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {custom.map((l) => (
                <div
                  key={l.id}
                  className="flex items-start gap-3 rounded-xl border border-accent bg-accent/10 p-3"
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-background"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {l.name}, {l.age}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {KNOWLEDGE_TYPES.find((k) => k.id === l.knowledge)?.label} ·{" "}
                      {CRITICALITY.find((c) => c.id === l.criticality)?.label}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCustom(l.id)}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <AddListener
            disabled={full}
            takenCount={custom.length}
            onAdd={(l) => setCustom((prev) => [...prev, l])}
          />
        </section>

        {/* Brutality dial */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">How brutal is the room?</h2>
          <div className="grid grid-cols-3 gap-2">
            {BRUTALITY.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBrutality(b.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  brutality === b.id
                    ? "border-accent bg-accent/10"
                    : "border-stone-700 hover:border-stone-500"
                }`}
              >
                <span className="block text-sm font-medium text-foreground">{b.label}</span>
                <span className="block text-xs text-muted">{b.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={startSession}
          disabled={submitting || count === 0}
          className="self-center rounded-full bg-accent px-8 py-3 font-medium text-background transition-opacity disabled:opacity-40"
        >
          {submitting ? "Gathering the room…" : "Start the listening session"}
        </button>
      </div>
    </main>
  );
}

// --- Add-a-listener form ----------------------------------------------------

function AddListener({
  disabled,
  takenCount,
  onAdd,
}: {
  disabled: boolean;
  takenCount: number;
  onAdd: (l: Listener) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeId>("casual");
  const [criticality, setCriticality] = useState<CriticalityId>("balanced");
  const [genres, setGenres] = useState<string[]>([]);

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function reset() {
    setName("");
    setAge("");
    setKnowledge("casual");
    setCriticality("balanced");
    setGenres([]);
    setOpen(false);
  }

  function add() {
    const ageNum = parseInt(age, 10);
    if (!name.trim() || !Number.isFinite(ageNum)) return;
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      age: ageNum,
      knowledge,
      criticality,
      genres,
      initials: initialsFromName(name),
      color: colorForIndex(takenCount),
      custom: true,
    });
    reset();
  }

  if (disabled && !open) {
    return <p className="text-xs text-muted">Room is full ({MAX_ROOM}). Remove someone to add a listener.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-dashed border-stone-700 px-4 py-3 text-sm text-muted transition-colors hover:border-stone-500 hover:text-foreground"
      >
        + Add a listener
      </button>
    );
  }

  const canAdd = name.trim().length > 0 && parseInt(age, 10) > 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-stone-700 bg-surface/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. a 28yo techno purist"
            className="rounded-lg border border-stone-700 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Age</span>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="28"
            className="rounded-lg border border-stone-700 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Music knowledge</span>
        <select
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value as KnowledgeId)}
          className="rounded-lg border border-stone-700 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          {KNOWLEDGE_TYPES.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Criticality</span>
        <select
          value={criticality}
          onChange={(e) => setCriticality(e.target.value as CriticalityId)}
          className="rounded-lg border border-stone-700 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          {CRITICALITY.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} — {c.desc}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted">Favourite genres</span>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGenre(g)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                genres.includes(g)
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-stone-700 text-muted hover:border-stone-500"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
        >
          Add to room
        </button>
        <button type="button" onClick={reset} className="text-sm text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}
