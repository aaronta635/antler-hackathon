import { NextResponse } from "next/server";
import { generateObject, NoObjectGeneratedError } from "ai";
import { MODEL, SUMMARY_SYSTEM, summaryPrompt, hasApiKey } from "@/lib/claude";
import { trackMetaSchema, reactionSchema, type TrackMeta, type Reaction } from "@/lib/reactions";
import { summarySchema, type Summary } from "@/lib/summary";
import { z } from "zod";

// Body = the track metadata + the full timeline from /api/reactions.
const bodySchema = z.object({
  meta: trackMetaSchema,
  reactions: z.array(reactionSchema).min(1),
});

async function generateSummary(meta: TrackMeta, reactions: Reaction[]): Promise<Summary> {
  const { object } = await generateObject({
    model: MODEL,
    schema: summarySchema,
    system: SUMMARY_SYSTEM,
    prompt: summaryPrompt(meta, reactions),
    maxOutputTokens: 1200,
  });
  return object;
}

export async function POST(req: Request) {
  // 1. Validate input first.
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
  const { meta, reactions } = parsed.data;

  // 2. Need a key to reach Claude.
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  // 3. Generate — retry once on a bad/unparseable response, clean errors otherwise.
  let summary: Summary;
  try {
    summary = await generateSummary(meta, reactions);
  } catch (firstError) {
    if (NoObjectGeneratedError.isInstance(firstError)) {
      try {
        summary = await generateSummary(meta, reactions);
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
