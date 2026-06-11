import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackMetaSchema, reactionSchema, roomSchema } from "@/lib/reactions";
import { summarySchema } from "@/lib/summary";

const bodySchema = z.object({
  meta: trackMetaSchema,
  room: roomSchema,
  reactions: z.array(reactionSchema),
  summary: summarySchema.nullable().optional(),
});

function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Persists a completed session for launch analytics + feedback. Best-effort:
// if Supabase isn't set up, we return { skipped: true } so the demo never breaks.
export async function POST(req: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ skipped: true });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session payload." }, { status: 400 });
  }
  const { meta, room, reactions, summary } = parsed.data;

  // Associate with the logged-in user if there is one (anonymous is fine).
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* not logged in */
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("sessions")
      .insert({
        user_id: userId,
        track_title: meta.title,
        track_genre: meta.genre,
        track_vibe: meta.vibe,
        track_duration: meta.duration,
        room,
        reactions,
        summary: summary ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("session: save failed", err);
    return NextResponse.json({ skipped: true });
  }
}
