import { z } from "zod";

// The end-of-song payoff, reframed around the artist's real question (the pitch):
// is this ready to bet on? Instead of a vibe recap, it scores the COMPLETENESS of
// the track across craft dimensions (mixing, vocals, writing, …) with reasoning,
// plus the one thing to fix first. Grounded in what the strangers actually said.
export const summarySchema = z.object({
  // One honest line — where this track stands for a stranger audience.
  headline: z.string().min(1),
  // Overall "ready to bet on" score (0–100). Mixed/unfinished sits ~40–65.
  readiness: z.number().min(0).max(100),
  // Completeness by craft dimension — the core of the scorecard.
  dimensions: z
    .array(
      z.object({
        name: z.string().min(1), // e.g. Mixing, Vocals, Writing, Production, Hook
        score: z.number().min(0).max(100),
        note: z.string().min(1), // short reasoning (<= ~12 words)
      }),
    )
    .min(3),
  // The strongest moment (ties to the live timeline).
  bestMoment: z.object({ time: z.number().min(0), note: z.string().min(1) }),
  // The single most important thing to fix first — the thing friends won't say.
  fixFirst: z.string().min(1),
  // Market signal: how many of the room would actually share it.
  share: z.object({
    count: z.number().int().min(0),
    persona: z.string().min(1),
    platform: z.string().min(1),
  }),
});

export type Summary = z.infer<typeof summarySchema>;
