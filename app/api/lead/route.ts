import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// Waitlist capture: name + email, no verification (decision D22). Just stored
// for launch analytics. Best-effort — never blocks the user from continuing.
const bodySchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Enter a valid email"),
});

function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 400 },
    );
  }

  // If Supabase isn't configured, still let the user through (don't block the demo).
  if (!supabaseConfigured()) return NextResponse.json({ ok: true, skipped: true });

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("leads")
      .insert({ name: parsed.data.name ?? null, email: parsed.data.email });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("lead: save failed", err);
    // Capture failing should not stop someone using the product.
    return NextResponse.json({ ok: true, skipped: true });
  }
}
