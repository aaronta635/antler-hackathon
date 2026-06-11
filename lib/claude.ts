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

export function reactionsPrompt(meta: TrackMeta, room: Room): string {
  const names = room.listeners.map((l) => l.name).join(", ");
  const target = Math.min(18, Math.max(10, room.listeners.length * 3));
  return `A track is about to play. Here is what its creator told us:

- Title: ${meta.title}
- Genre: ${meta.genre}
- Vibe / description: ${meta.vibe}
- Total duration: ${Math.round(meta.duration)} seconds

Generate a timeline of about ${target} reactions, as if these people were listening together and reacting in the moment.

Rules:
- Spread reactions across the FULL duration (0 to ${Math.round(meta.duration)}s). Do not bunch them at the start.
- React to imagined structural moments: the intro, the first hook, a drop or beat switch, the bridge, the final chorus, the outro.
- Every listener should appear at least twice. Let their takes diverge — someone can love a moment another dislikes.
- Each "reaction" is ONE short line (usually under 120 characters) in that persona's exact writing voice.
- "persona" must be EXACTLY one of these names: ${names}.
- "time" is the second within the track the reaction lands on.`;
}

// --- Phase 4: end-of-song verdict ------------------------------------------

export function summarySystem(room: Room): string {
  return `You are the producer in the room, reading the listeners after a track finishes. Your job is a sharp, honest verdict an artist or their manager can act on — not a polite recap.

THE LISTENERS:
${listenersPromptBlock(room.listeners)}

${toneInstruction(room.brutality)}
Voice: blunt, specific, opinionated. Reference the actual moments and what specific people said.`;
}

export function summaryPrompt(meta: TrackMeta, reactions: Reaction[]): string {
  const timeline = reactions
    .map((r) => `[${Math.round(r.time)}s] ${r.persona}: ${r.reaction}`)
    .join("\n");

  return `Track: "${meta.title}" — ${meta.genre} — ${Math.round(meta.duration)}s.
Vibe the creator described: ${meta.vibe}

Here is everything the room said, in order:
${timeline}

Write the verdict:
- verdict: ONE blunt sentence capturing the room's overall take (the honest headline).
- bestMoment: the single moment that landed hardest — the second it happens and why, citing what people said.
- dropOff: the biggest risk — where listeners cooled off or would tune out — the second and why.
- share: of the listeners, who is most likely to actually share this, on what platform, and the exact clip or reason they'd post it.

Ground every field in the real reactions above. Use the listeners' names. Be specific about timestamps.`;
}
