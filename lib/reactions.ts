import { z } from "zod";

// The track info the user types on /details — the only input to reaction generation.
// (We never send the audio itself; generation is metadata-driven. See decision D13.)
export const trackMetaSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  genre: z.string().trim().min(1, "Genre is required").max(80),
  vibe: z.string().trim().min(1, "Describe the vibe").max(400),
  duration: z
    .number()
    .positive("Duration must be greater than 0")
    .max(60 * 30, "Track too long for the demo"),
});

export type TrackMeta = z.infer<typeof trackMetaSchema>;

// One timestamped, in-character reaction.
export const reactionSchema = z.object({
  time: z.number().min(0), // seconds into the track
  persona: z.string(), // must match a PERSONA name
  reaction: z.string().min(1), // the short, in-voice text
});

export type Reaction = z.infer<typeof reactionSchema>;

// generateObject needs an object at the top level, so the array is wrapped.
export const reactionsResponseSchema = z.object({
  reactions: z.array(reactionSchema).min(1),
});
