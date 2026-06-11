import { NextResponse } from "next/server";
import { generateObject, NoObjectGeneratedError } from "ai";
import { MODEL, REACTIONS_SYSTEM, reactionsPrompt, hasApiKey } from "@/lib/claude";
import { PERSONA_NAMES } from "@/lib/personas";
import {
  trackMetaSchema,
  reactionsResponseSchema,
  type Reaction,
  type TrackMeta,
} from "@/lib/reactions";

// Calls Claude once and returns validated reactions. generateObject forces the
// model to match our schema and throws NoObjectGeneratedError on a bad/unparseable
// response — that's the failure we retry on.
async function generateReactions(meta: TrackMeta): Promise<Reaction[]> {
  const { object } = await generateObject({
    model: MODEL,
    schema: reactionsResponseSchema,
    system: REACTIONS_SYSTEM,
    prompt: reactionsPrompt(meta),
    maxOutputTokens: 4000,
  });
  return object.reactions;
}

// Drop anything malformed, clamp to the track length, keep only known personas,
// and sort by time so the Phase 3 feed can walk it in order. A few bad rows from
// the model should never crash the demo — we just filter them out.
function cleanReactions(reactions: Reaction[], duration: number): Reaction[] {
  return reactions
    .filter(
      (r) =>
        Number.isFinite(r.time) &&
        r.time >= 0 &&
        r.time <= duration &&
        PERSONA_NAMES.includes(r.persona) &&
        r.reaction.trim().length > 0,
    )
    .map((r) => ({
      ...r,
      // Keep replyTo only if it names a different, known persona; otherwise null.
      replyTo:
        r.replyTo && r.replyTo !== r.persona && PERSONA_NAMES.includes(r.replyTo)
          ? r.replyTo
          : null,
    }))
    .sort((a, b) => a.time - b.time);
}

export async function POST(req: Request) {
  // 1. Parse + validate the track metadata (the user's input — check it first).
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = trackMetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid track info." },
      { status: 400 },
    );
  }
  const meta = parsed.data;

  // 2. Fail fast and clearly if the server can't reach Claude.
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  // 3. Generate — try once, retry once on a bad/unparseable model response.
  let reactions: Reaction[];
  try {
    reactions = await generateReactions(meta);
  } catch (firstError) {
    if (NoObjectGeneratedError.isInstance(firstError)) {
      try {
        reactions = await generateReactions(meta); // single retry
      } catch {
        return NextResponse.json(
          { error: "The audience couldn't agree on a take. Try again in a moment." },
          { status: 502 },
        );
      }
    } else {
      // Auth, rate-limit, network, etc. — surface a clean message, never a stack trace.
      console.error("reactions: generation failed", firstError);
      return NextResponse.json(
        { error: "Couldn't reach the listening room right now. Try again shortly." },
        { status: 502 },
      );
    }
  }

  // 4. Clean up and return the timeline.
  const cleaned = cleanReactions(reactions, meta.duration);
  if (cleaned.length === 0) {
    return NextResponse.json(
      { error: "Got an empty timeline back. Try tweaking the vibe and resubmitting." },
      { status: 502 },
    );
  }

  logTimeline(meta, cleaned);
  return NextResponse.json({ reactions: cleaned });
}

// Pretty-print the timeline to the server terminal so you can see what the
// audience said before the Phase 3 feed renders it on screen.
function logTimeline(meta: TrackMeta, reactions: Reaction[]) {
  const ts = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;
  console.log(
    `\n🎧  "${meta.title}" — ${meta.genre} — ${reactions.length} reactions over ${ts(meta.duration)}`,
  );
  for (const r of reactions) {
    console.log(`   ${ts(r.time).padStart(5)}  ${r.persona.padEnd(8)} ${r.reaction}`);
  }
  console.log("");
}
