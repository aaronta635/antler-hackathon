import { NextResponse } from "next/server";

// Transcribes the uploaded vocal track via OpenAI Whisper, for the lyrics panel
// (decision: STT = Whisper, static block). Best-effort: if there's no key or it
// fails, we return { skipped: true } and the app just runs without lyrics.

const MAX_BYTES = 25 * 1024 * 1024; // Whisper's hard limit

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ skipped: true });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No audio file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ skipped: true });

  try {
    const out = new FormData();
    out.append("file", file, file.name || "audio.mp3");
    out.append("model", "whisper-1");
    // verbose_json gives timed segments — one phrase each — so we can put each
    // line on its own row instead of one run-on block.
    out.append("response_format", "verbose_json");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: out,
    });

    if (!res.ok) {
      console.error("transcribe: whisper error", res.status, await res.text());
      return NextResponse.json({ skipped: true });
    }

    const data = await res.json();
    const segments: Array<{ text?: string }> = Array.isArray(data?.segments) ? data.segments : [];
    // Whisper hallucinates boilerplate over silence (intros/outros). Drop it.
    const HALLUCINATION = /^(thanks? (you )?for watching|please subscribe|like and subscribe|thank you\.?|subtitles? by.*|♪+)$/i;
    const lines = (
      segments.length
        ? segments.map((s) => (s.text ?? "").trim())
        : String(data?.text ?? "").split("\n")
    )
      .map((l) => l.trim())
      .filter((l) => l && !HALLUCINATION.test(l));
    return NextResponse.json({ lyrics: lines.join("\n") });
  } catch (err) {
    console.error("transcribe: failed", err);
    return NextResponse.json({ skipped: true });
  }
}
