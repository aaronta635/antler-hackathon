import { NextResponse } from "next/server";
import { generateObject, NoObjectGeneratedError } from "ai";
import { MODEL, reactionsSystem, reactionsPrompt, hasApiKey } from "@/lib/claude";
import {
  reactionsRequestSchema,
  reactionsResponseSchema,
  type Reaction,
  type EnergyPoint,
  type TrackMeta,
} from "@/lib/reactions";
import type { Room } from "@/lib/audience";

// Calls Claude once and returns validated reactions. generateObject forces the
// model to match our schema and throws NoObjectGeneratedError on a bad response.
async function generateReactions(meta: TrackMeta, room: Room, lyrics?: string) {
  const { object } = await generateObject({
    model: MODEL,
    schema: reactionsResponseSchema,
    system: reactionsSystem(room),
    prompt: reactionsPrompt(meta, room, lyrics),
    maxOutputTokens: 4000,
  });
  return object; // { reactions, energy }
}

// Clamp the energy curve to the track length, sort by time.
function cleanEnergy(energy: EnergyPoint[], duration: number): EnergyPoint[] {
  return energy
    .filter((p) => Number.isFinite(p.time) && p.time >= 0 && p.time <= duration)
    .map((p) => ({ time: p.time, level: Math.min(100, Math.max(0, p.level)) }))
    .sort((a, b) => a.time - b.time);
}

// Drop malformed rows, clamp to the track length, keep only listeners who are
// actually in the room, and sort by time. Bad rows never crash the demo.
function cleanReactions(reactions: Reaction[], duration: number, names: Set<string>): Reaction[] {
  return reactions
    .filter(
      (r) =>
        Number.isFinite(r.time) &&
        r.time >= 0 &&
        r.time <= duration &&
        names.has(r.persona) &&
        r.reaction.trim().length > 0,
    )
    .sort((a, b) => a.time - b.time);
}

function logTimeline(meta: TrackMeta, reactions: Reaction[]) {
  const ts = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  console.log(`\n🎧  "${meta.title}" — ${meta.genre} — ${reactions.length} reactions over ${ts(meta.duration)}`);
  for (const r of reactions) {
    console.log(`   ${ts(r.time).padStart(5)}  ${r.persona.padEnd(8)} ${r.reaction}`);
  }
  console.log("");
}

export async function POST(req: Request) {
  // 1. Validate input (track + room) first.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = reactionsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { meta, room, lyrics } = parsed.data;

  // 2. Need a key to reach Claude.
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  // 3. Generate — try once, retry once on a bad/unparseable response.
  let result: { reactions: Reaction[]; energy: EnergyPoint[] };
  try {
    result = await generateReactions(meta, room, lyrics);
  } catch (firstError) {
    if (NoObjectGeneratedError.isInstance(firstError)) {
      try {
        result = await generateReactions(meta, room, lyrics);
      } catch {
        return NextResponse.json(
          { error: "The audience couldn't agree on a take. Try again in a moment." },
          { status: 502 },
        );
      }
    } else {
      console.error("reactions: generation failed", firstError);
      return NextResponse.json(
        { error: "Couldn't reach the listening room right now. Try again shortly." },
        { status: 502 },
      );
    }
  }

  // 4. Clean against the actual room, log, and return.
  const names = new Set(room.listeners.map((l) => l.name));
  const cleaned = cleanReactions(result.reactions, meta.duration, names);
  if (cleaned.length === 0) {
    return NextResponse.json(
      { error: "Got an empty timeline back. Try tweaking the vibe and resubmitting." },
      { status: 502 },
    );
  }

  logTimeline(meta, cleaned);
  return NextResponse.json({ reactions: cleaned, energy: cleanEnergy(result.energy, meta.duration) });
}
