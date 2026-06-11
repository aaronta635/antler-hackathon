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
- TALK LIKE A NORMAL PERSON texting a friend, not a music critic. Casual, plain words. NO fancy or obscure vocabulary, no jargon nobody says out loud. Even the knowledgeable listeners keep it down-to-earth — if they'd use a technical term, say it plainly.
- Be specific and add a little depth: name the actual instruments / sounds / moments (the sax, the 808s, the guitar tone, the vocal run, the beat switch) and often say what you'd change. e.g. "yoo this sax solo sounds sick, would want it more complex tho" or "drums slap but the bass is kinda just sitting there, give me more".
- Let their takes diverge — someone can love a moment another dislikes.
- Each "reaction" is ONE line, casual and concrete (usually under 160 characters), in that persona's voice.
- "persona" must be EXACTLY one of these names: ${names}.
- "time" is the second within the track the reaction lands on (0 to ${dur}).`;
}

// --- Phase 4: end-of-song verdict ------------------------------------------

export function summarySystem(room: Room): string {
  return `You are the producer in the room, reading the listeners after a track finishes. Your job is a sharp, honest verdict an artist or their manager can act on — not a polite recap.

THE LISTENERS:
${listenersPromptBlock(room.listeners)}

${toneInstruction(room.brutality)}
Voice: blunt, specific, opinionated. Reference the actual moments and what specific people said.`;
}

export function summaryPrompt(meta: TrackMeta, room: Room, reactions: Reaction[]): string {
  const timeline = reactions
    .map((r) => `[${Math.round(r.time)}s] ${r.persona}: ${r.reaction}`)
    .join("\n");
  const names = room.listeners.map((l) => l.name).join(", ");
  const n = room.listeners.length;

  return `Track: "${meta.title}" — ${meta.genre} — ${Math.round(meta.duration)}s.
Vibe the creator described: ${meta.vibe}

The ${n} listeners: ${names}.
Everything they said, in order:
${timeline}

Produce a tight SCORECARD — this renders as a dashboard, so keep every field extremely short:
- headline: ONE punchy sentence — the room's overall take.
- score: 0–100, the room's honest overall rating (a mixed room is ~50–65; only a genuinely loved track clears 80).
- sentiment: how many of the ${n} listeners loved it / were mixed / passed. These three numbers MUST sum to exactly ${n}.
- bestMoment: the strongest moment — its second + a note of AT MOST 8 words.
- dropOff: the weakest / most at-risk moment — its second + a note of AT MOST 8 words.
- share: how many of the ${n} would actually share it, the single most likely sharer, and the platform.
- listeners: exactly one entry per listener (${names}) — verdict (loved | mixed | passed) + a note of AT MOST 6 words.

Ground every field in the reactions above. Be honest, not generous. Notes must be tiny.`;
}
