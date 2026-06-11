"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  // Soft gate (D22): show the "who are you" form first; reveal Start after they
  // submit. Returning visitors skip it (flag in localStorage).
  const [known, setKnown] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    // Deferred so it doesn't run synchronously in the effect body (and is SSR-safe).
    queueMicrotask(() => {
      if (localStorage.getItem("waitlist_done") === "1") {
        setKnown(true);
        setGreeting(localStorage.getItem("waitlist_name"));
      }
    });
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <Equalizer />

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Listening Room</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Play your track for a room that won&apos;t lie to you.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Synthetic listeners react in real time, timestamped to the moment — then
            hand you an honest scorecard.
          </p>
        </div>

        {known ? (
          <Start
            greeting={greeting}
            onStart={() => router.push("/upload")}
          />
        ) : (
          <Gate
            onDone={(name) => {
              setKnown(true);
              setGreeting(name || null);
            }}
          />
        )}
      </div>
    </main>
  );
}

function Equalizer() {
  const bars = [0, 0.2, 0.45, 0.15, 0.35, 0.05, 0.3];
  return (
    <div className="flex h-12 items-end gap-1.5" aria-hidden>
      {bars.map((delay, i) => (
        <span
          key={i}
          className="eq-bar w-1.5 rounded-full bg-accent"
          style={{ height: "100%", animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

// The waitlist capture. No verification — we just want to know who's listening.
function Gate({ onDone }: { onDone: (name: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Please check your details.");
        return;
      }
      localStorage.setItem("waitlist_done", "1");
      if (name.trim()) localStorage.setItem("waitlist_name", name.trim());
      if (email.trim()) localStorage.setItem("waitlist_email", email.trim());
      onDone(name.trim());
    } catch {
      // Don't hard-block on a network hiccup — let them in anyway.
      localStorage.setItem("waitlist_done", "1");
      if (email.trim()) localStorage.setItem("waitlist_email", email.trim());
      onDone(name.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full flex-col gap-3 rounded-2xl border border-stone-800 bg-surface/40 p-5 text-left"
    >
      <p className="text-sm font-medium text-foreground">First — we&apos;d love to know you</p>
      <p className="-mt-1 text-xs text-muted">We&apos;re early. No password, no spam — just say hi.</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="rounded-lg border border-stone-700 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="rounded-lg border border-stone-700 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={busy || !email.trim()}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-40"
      >
        {busy ? "One sec…" : "Continue ↓"}
      </button>
    </form>
  );
}

function Start({ greeting, onStart }: { greeting: string | null; onStart: () => void }) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      {greeting && <p className="text-sm text-muted">You&apos;re in, {greeting} ✦</p>}
      <span className="animate-bounce text-accent" aria-hidden>
        ↓
      </span>
      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-full bg-accent px-6 py-3.5 font-medium text-background transition-transform hover:scale-[1.02]"
      >
        Start a session →
      </button>
    </div>
  );
}
