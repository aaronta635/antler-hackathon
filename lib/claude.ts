import { anthropic } from "@ai-sdk/anthropic";
import { listenersPromptBlock, toneInstruction, type Room } from "./audience";
import type { Reaction, TrackMeta } from "./reactions";

// One place to swap the model (decision D14). Sonnet 4.6 chosen for the demo:
// faster/cheaper for repeated runs, still excellent persona text. Swap to
// "claude-opus-4-8" for maximum nuance if latency/cost stop mattering.
export const MODEL = anthropic("claude-sonnet-4-6");

// Returns true if the server can actually call Claude, so a route can fail fast
// with a clear message instead of a cryptic SDK error.
export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// --- Phase 2: reaction generation (now room-driven, D17) --------------------

export function reactionsSystem(room: Room): string {
  return `You are simulating a listening room of music fans reacting to a track in real time, as it plays.

CRUCIAL FRAMING: these people are STRANGERS hearing this track cold — it came up on their For You feed / a discovery playlist / a random SoundCloud dive. They have NO relationship to the artist and owe them nothing. They didn't ask to hear this and have a thousand other tracks one swipe away. So their reactions are the honest truth the artist's friends and group chat would never tell them. Indifference is real and allowed — if a moment is boring, they show it (zoning out, reaching to skip), they don't politely cheer.

Each person is a distinct individual. Stay rigorously in character — match each one's writing voice, taste, knowledge, and biases. They disagree with each other.

THE LISTENERS:
${listenersPromptBlock(room.listeners)}

${toneInstruction(room.brutality)}`;
}

export function reactionsPrompt(meta: TrackMeta, room: Room, lyrics?: string): string {
  const names = room.listeners.map((l) => l.name).join(", ");
  const dur = Math.round(meta.duration);
  const short = dur < 90; // a clip / demo excerpt, not a full song

  const lyricsBlock =
    lyrics && lyrics.trim().length > 0
      ? `\nTHE LYRICS (transcribed from the vocal):\n"""\n${lyrics.trim()}\n"""\n- React to the actual WORDS too: the writing, imagery, a line that hits or one that's corny/cliché. Quote or paraphrase a specific lyric when it matters.\n`
      : "";

  const target = short
    ? Math.min(10, Math.max(4, Math.round(dur / 7)))
    : Math.min(18, Math.max(10, room.listeners.length * 3));

  const coverage = short
    ? `- Spread reactions across the full ${dur}s. Not every listener needs to appear twice — keep it natural for a clip this short.`
    : `- Spread reactions across the FULL duration (0 to ${dur}s). Do not bunch them at the start. Every listener should appear at least twice.`;

  const structure = short
    ? `- This is a SHORT CLIP (${dur}s) — treat it as a snippet or demo excerpt, NOT a full song. Do NOT expect or mention a full song structure, and never say things like "outro already?" or reference a bridge/final chorus a clip this short wouldn't have. React to first impressions, the hook, the energy, the sound.`
    : `- React to imagined structural moments across the song: the intro, the first hook, a drop or beat switch, the bridge, the final chorus, the outro.`;

  return `A track is about to play. Here is what its creator told us:

- Title: ${meta.title}
- Genre: ${meta.genre}
- Vibe / description: ${meta.vibe}
- Total duration: ${dur} seconds
${lyricsBlock}
Generate a timeline of about ${target} reactions, as if these people were listening together and reacting in the moment.

Rules:
${coverage}
${structure}
- Assume the track has a lead VOCAL and lyrics (a topline / singer / rapper) UNLESS the vibe explicitly says it's instrumental. React to the vocal too — delivery, melody, lyrics, how it sits — not only the production.
- TALK LIKE A NORMAL PERSON texting a friend, not a music critic. Casual, plain words, no fancy vocabulary or jargon.
- MOST reactions are GUT reactions to easy-to-FEEL moments any normal listener notices the instant they happen: the chorus hitting, a big high note, a solo, the beat dropping, a key change, a catchy hook, the energy lifting or falling, a vocal run. Call those out as they land.
- MIX the lengths: lots of short visceral ones ("ooo this part", "okay this is catchy", "wait this kinda goes hard", "that high note tho", "the chorus EATS"), and only SOME with a bit more detail (name one instrument, or one thing you'd tweak). Do NOT make every line analytical or high-level — keep it feel-first, the kind of thing someone blurts out while listening.
- Show the STREAMING INSTINCT — the honest signal that matters: would they keep listening, skip, replay, or save? Let it surface naturally: "ngl I'd have skipped by now", "ok wait, replaying that", "saving this one", "lost me in this verse", "this intro is too long, get to it". A bored stranger reaching to skip is the most valuable honesty here.
- Let their takes diverge — someone can love a moment another dislikes.
- Each "reaction" is ONE line, casual (usually under 140 characters), in that persona's voice.
- "persona" must be EXACTLY one of these names: ${names}.
- "time" is the second within the track the reaction lands on (0 to ${dur}).

Also produce "energy": the room's collective ENERGY/HYPE curve over the song — ${short ? 8 : 18} points evenly spread from time 0 to ${dur}. Each point: { time, level } where level is 0–100 (0 = bored / checked out, 100 = room fully locked in, hyped, hands up). Make it MOVE: it should rise into hooks/choruses/drops/big moments and dip in intros, filler, or weak sections. Keep it consistent with the reactions above.`;
}

// --- Phase 4: end-of-song verdict ------------------------------------------

export function summarySystem(room: Room): string {
  return `You are an honest A&R / producer reading the room after a track finishes — the test audience an indie artist never had access to. Your job: tell them how READY this track is to bet a career on, the way a label's team would, not the way their friends do.

You assess the COMPLETENESS of the craft (mixing, vocals, songwriting, production, the hook, arrangement) and reason about each — what's there, what's unfinished, what a stranger audience felt. Honest and specific, never generous-by-default, but fair: name strengths where they're real.

THE LISTENERS (these were strangers hearing it cold):
${listenersPromptBlock(room.listeners)}

${toneInstruction(room.brutality)}`;
}

export function summaryPrompt(meta: TrackMeta, room: Room, reactions: Reaction[]): string {
  const timeline = reactions
    .map((r) => `[${Math.round(r.time)}s] ${r.persona}: ${r.reaction}`)
    .join("\n");
  const n = room.listeners.length;

  return `Track: "${meta.title}" — ${meta.genre} — ${Math.round(meta.duration)}s.
Vibe the creator described: ${meta.vibe}

What the ${n} cold-audience listeners said, in order:
${timeline}

Produce a tight READINESS SCORECARD — renders as a dashboard, so keep every field short and grounded in the reactions above:
- headline: ONE honest sentence — where this track really stands for a stranger audience.
- readiness: 0–100, how ready it is to bet on / release (unfinished or mixed sits ~40–65; only a genuinely finished, compelling track clears 80).
- dimensions: 4–6 craft areas RELEVANT to this track (choose from: Mixing, Vocals, Songwriting, Lyrics, Production, Hook, Arrangement, Originality). For each: name, score 0–100 (completeness/quality), and a note of AT MOST 12 words explaining the score, tied to what listeners felt.
- bestMoment: the strongest moment — its second + a note of AT MOST 8 words.
- fixFirst: the SINGLE most important thing to fix before betting on this — one sentence, the thing their group chat would never tell them.
- share: how many of the ${n} would actually share it, the single most likely sharer, and the platform.

Be honest, not generous. Notes must be tiny.`;
}
