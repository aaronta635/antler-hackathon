import { z } from "zod";

// The end-of-song payoff, redesigned as a visual scorecard (decision D20): a few
// honest numbers + ultra-short notes instead of paragraphs. Grounded in the
// actual reactions, NOT a fake "viral %" (still honors D9 — no false precision).
export const summarySchema = z.object({
  headline: z.string().min(1), // one punchy sentence
  score: z.number().min(0).max(100), // the room's overall rating
  sentiment: z.object({
    // counts of listeners — must sum to the room size
    loved: z.number().int().min(0),
    mixed: z.number().int().min(0),
    passed: z.number().int().min(0),
  }),
  bestMoment: z.object({ time: z.number().min(0), note: z.string().min(1) }), // note <= 8 words
  dropOff: z.object({ time: z.number().min(0), note: z.string().min(1) }),
  share: z.object({
    count: z.number().int().min(0), // how many of N would share
    persona: z.string().min(1),
    platform: z.string().min(1),
  }),
  // one entry per listener, with a tiny note
  listeners: z
    .array(
      z.object({
        name: z.string().min(1),
        verdict: z.enum(["loved", "mixed", "passed"]),
        note: z.string().min(1), // <= 6 words
      }),
    )
    .min(1),
});

export type Summary = z.infer<typeof summarySchema>;
