import { z } from "zod";
import { KNOWLEDGE_IDS, CRITICALITY_IDS, BRUTALITY_IDS, MAX_ROOM } from "./audience";

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

// One listener in the room (default or custom). Validated when the client posts a room.
export const listenerSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(40),
  age: z.number().int().min(1).max(120),
  knowledge: z.enum(KNOWLEDGE_IDS),
  genres: z.array(z.string()).max(20),
  criticality: z.enum(CRITICALITY_IDS),
  initials: z.string().max(3),
  color: z.string(),
  custom: z.boolean().optional(),
  location: z.string().optional(),
  background: z.string().optional(),
  discovers: z.string().optional(),
  dealbreaker: z.string().optional(),
  guiltyPleasure: z.string().optional(),
  voice: z.string().optional(),
  platform: z.string().optional(),
});

export const roomSchema = z.object({
  listeners: z.array(listenerSchema).min(1, "Pick at least one listener").max(MAX_ROOM),
  brutality: z.enum(BRUTALITY_IDS),
});

// One timestamped, in-character reaction.
export const reactionSchema = z.object({
  time: z.number().min(0), // seconds into the track
  persona: z.string(), // must match a listener name in the room
  reaction: z.string().min(1), // the short, in-voice text
});

export type Reaction = z.infer<typeof reactionSchema>;

// generateObject needs an object at the top level, so the array is wrapped.
export const reactionsResponseSchema = z.object({
  reactions: z.array(reactionSchema).min(1),
});

// POST /api/reactions body: the track + the room that's listening (+ optional lyrics).
export const reactionsRequestSchema = z.object({
  meta: trackMetaSchema,
  room: roomSchema,
  lyrics: z.string().max(20000).optional(),
});
