"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/use-user";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useUser();

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
            Five (or more) synthetic listeners react in real time, timestamped to the
            moment — then hand you an honest scorecard.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/upload")}
          className="w-full rounded-full bg-accent px-6 py-3.5 font-medium text-background transition-transform hover:scale-[1.02]"
        >
          Start a session →
        </button>

        {!loading && (user ? <SignedIn email={user.email ?? ""} /> : <LoginCard />)}
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

function LoginCard() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { name: name.trim() },
        },
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch {
      setError("Couldn't send the link. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-muted">
        ✦ Check <span className="text-foreground">{email}</span> for your magic link.
      </p>
    );
  }

  return (
    <form
      onSubmit={sendLink}
      className="flex w-full flex-col gap-3 rounded-2xl border border-stone-800 bg-surface/40 p-5 text-left"
    >
      <p className="text-xs text-muted">Save your sessions — sign in with email</p>
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
        disabled={sending || !email.trim() || !name.trim()}
        className="rounded-full border border-accent/60 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
      >
        {sending ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}

function SignedIn({ email }: { email: string }) {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  return (
    <p className="text-sm text-muted">
      Signed in as <span className="text-foreground">{email}</span> ·{" "}
      <button type="button" onClick={signOut} className="text-accent hover:underline">
        sign out
      </button>
    </p>
  );
}
