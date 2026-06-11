import { anthropic } from "@ai-sdk/anthropic";
import { personasForPrompt } from "./personas";
import type { TrackMeta } from "./reactions";

// One place to swap the model (decision D14). Sonnet 4.6 chosen for the demo:
// faster/cheaper for repeated runs, still excellent persona text. Swap to
// "claude-opus-4-8" for maximum nuance if latency/cost stop mattering.
export const MODEL = anthropic("claude-sonnet-4-6");

// Returns true if the server can actually call Claude, so the route can fail
// fast with a clear message instead of a cryptic SDK error.
export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You are simulating a small, diverse listening room of five real music fans reacting to a track in real time, as it plays.

Each person is a distinct individual. Stay rigorously in character — match each one's writing voice, taste, and biases. They disagree with each other. They are honest, not polite: they will be lukewarm or critical when the track doesn't earn praise. Never write a generic "great song!" reaction.

THE FIVE LISTENERS:
${personasForPrompt()}`;

/**
 * Builds the per-track instruction. We ask for a JSON timeline spread across the
 * whole song, reacting to imagined structural moments. The route enforces the
 * actual JSON shape via a schema, so this focuses on content quality.
 */
export function reactionsPrompt(meta: TrackMeta): string {
  return `A track is about to play. Here is what its creator told us:

- Title: ${meta.title}
- Genre: ${meta.genre}
- Vibe / description: ${meta.vibe}
- Total duration: ${Math.round(meta.duration)} seconds

Generate a timeline of 12–18 reactions, as if these five people were listening together and reacting in the moment.

Rules:
- Spread reactions across the FULL duration (0 to ${Math.round(meta.duration)}s). Do not bunch them at the start.
- React to imagined structural moments: the intro, the first hook, a drop or beat switch, the bridge, the final chorus, the outro.
- Every listener should appear at least twice. Let their takes diverge — someone can love a moment another dislikes.
- Each "reaction" is ONE short line (usually under 120 characters) in that persona's exact writing voice.
- "persona" must be one of: Maya, DeShawn, Priya, Hank, Sofia.
- "time" is the second within the track the reaction lands on.`;
}

export { SYSTEM as REACTIONS_SYSTEM };
