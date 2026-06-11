import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  comment: z.string().trim().max(2000).optional(),
  feeling: z.string().trim().max(40).optional(),
  // From the waitlist capture so feedback isn't anonymous.
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(200).optional(),
});

function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Real user feedback on a session: a feeling + a comment.
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
    return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  }
  const { sessionId, comment, feeling, name, email } = parsed.data;
  if (!comment && !feeling) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("feedback").insert({
      session_id: sessionId,
      name: name ?? null,
      email: email ?? null,
      comment: comment ?? null,
      feeling: feeling ?? null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("feedback: save failed", err);
    return NextResponse.json({ error: "Couldn't save feedback. Try again." }, { status: 500 });
  }
}
