import { NextResponse } from "next/server";
import { generateObject, NoObjectGeneratedError } from "ai";
import { MODEL, summarySystem, summaryPrompt, hasApiKey } from "@/lib/claude";
import {
  trackMetaSchema,
  reactionSchema,
  roomSchema,
  type TrackMeta,
  type Reaction,
} from "@/lib/reactions";
import { summarySchema, type Summary } from "@/lib/summary";
import type { Room } from "@/lib/audience";
import { z } from "zod";

const bodySchema = z.object({
  meta: trackMetaSchema,
  room: roomSchema,
  reactions: z.array(reactionSchema).min(1),
});

async function generateSummary(meta: TrackMeta, room: Room, reactions: Reaction[]): Promise<Summary> {
  const { object } = await generateObject({
    model: MODEL,
    schema: summarySchema,
    system: summarySystem(room),
    prompt: summaryPrompt(meta, room, reactions),
    maxOutputTokens: 1200,
  });
  return object;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid summary request." },
      { status: 400 },
    );
  }
  const { meta, room, reactions } = parsed.data;

  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  let summary: Summary;
  try {
    summary = await generateSummary(meta, room, reactions);
  } catch (firstError) {
    if (NoObjectGeneratedError.isInstance(firstError)) {
      try {
        summary = await generateSummary(meta, room, reactions);
      } catch {
        return NextResponse.json(
          { error: "The room couldn't reach a verdict. Try again in a moment." },
          { status: 502 },
        );
      }
    } else {
      console.error("summary: generation failed", firstError);
      return NextResponse.json(
        { error: "Couldn't reach the room for a verdict right now. Try again shortly." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ summary });
}
