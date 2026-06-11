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
    out.append("response_format", "text");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: out,
    });

    if (!res.ok) {
      console.error("transcribe: whisper error", res.status, await res.text());
      return NextResponse.json({ skipped: true });
    }

    const lyrics = (await res.text()).trim();
    return NextResponse.json({ lyrics });
  } catch (err) {
    console.error("transcribe: failed", err);
    return NextResponse.json({ skipped: true });
  }
}
