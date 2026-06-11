# Listening Room

Play your track for a room of synthetic listeners who react in real time — then get an honest readiness scorecard. The test audience an indie artist never had.

Built for the Antler hackathon.

## What it does

Upload a track → describe it → build your audience → watch strangers react live (timestamped reactions, a moving energy curve, transcribed lyrics) → get a craft-by-craft readiness verdict (mixing, vocals, writing…) with the one thing to fix first.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- Claude (`@ai-sdk/anthropic`) — reactions + scorecard
- OpenAI Whisper — lyric transcription
- Supabase — waitlist, session + feedback capture

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3000
```

Required: `ANTHROPIC_API_KEY`. Optional: `OPENAI_API_KEY` (lyrics), Supabase keys (persistence).

For Supabase, run `supabase/schema.sql` in the SQL editor.

## Flow

`/` waitlist → `/upload` → `/details` → `/audience` (build the room) → `/session` (live reactions) → `/summary` (readiness scorecard)
