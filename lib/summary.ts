import { z } from "zod";

// The end-of-song payoff: a structured "verdict from the room" (decision layer, D10)
// plus the per-platform share signal (D9). Fed a second Claude call over the full
// reaction timeline.
export const summarySchema = z.object({
  // One blunt, opinionated sentence — the room's overall take. Not a corporate summary.
  verdict: z.string().min(1),
  // The moment that landed hardest.
  bestMoment: z.object({
    time: z.number().min(0), // seconds
    why: z.string().min(1),
  }),
  // The biggest risk / where listeners would tune out.
  dropOff: z.object({
    time: z.number().min(0),
    why: z.string().min(1),
  }),
  // Share-ability signal: who would share it, where, and what clip (D9).
  share: z.object({
    persona: z.string().min(1), // a PERSONA name
    platform: z.string().min(1), // e.g. TikTok / Instagram Story / Reddit
    what: z.string().min(1), // the exact clip / why they'd post it
  }),
});

export type Summary = z.infer<typeof summarySchema>;
