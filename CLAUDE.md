# BUILD SPEC — Synthetic Audience Reaction Player

## What we're building
A web app where a user plays a track and watches 5 synthetic audience 
personas react in real time, timestamped to the moment in the song. 
The reactions stream alongside playback like a live listening session.

This is a hackathon build. Priority is ONE impressive, polished experience —
not many features. Build in the exact phase order below. Do not start a 
later phase until the current one works end to end.

## Stack
- Next.js (App Router) + TypeScript + Next.js also for backend.
- Tailwind for styling
- Anthropic Claude via @ai-sdk/anthropic (needs ANTHROPIC_API_KEY)
- Web Audio API / HTML5 audio for playback + timestamp tracking
- No database. All state in memory for the demo.

---

## PHASE 1 — Audio playback with live timestamp (build first)
Goal: a user can load a track and we always know the current play position.

- Simple upload input that accepts an audio file (mp3/wav).
- Play/pause button + a progress bar showing current time.
- Track `currentTime` in state, updating ~4x per second.
- Clean, dark, minimal UI. One centered player. No clutter.

Verify: I can upload a track, hit play, and see the timestamp ticking.

---

## PHASE 2 — Persona reaction generation (the AI core)
Goal: before playback, generate a full timeline of reactions as JSON.

- Create a `/api/reactions` route handler.
- Input: track metadata the user types in (title, genre, short description 
  of the vibe, and total duration in seconds).
- Call Claude with a system prompt containing 5 detailed personas 
  (defined in `lib/personas.ts` — see persona rules below).
- Ask Claude to return ONLY valid JSON, an array of reactions:
  [{ "time": <seconds>, "persona": "<name>", "reaction": "<short text>" }]
- Reactions should be spread across the full duration, 12-18 total, 
  reacting to imagined moments (the hook, the drop, the bridge, the outro).
- Parse and validate the JSON safely. If parsing fails, retry once, 
  then return a clear error.

Persona rules (write these richly in lib/personas.ts):
- Each persona has: name, age, location, music background, how they 
  discover music, one dealbreaker, one guilty pleasure, and a distinct 
  writing style (one texts like a friend, one writes like a Reddit 
  comment, one gives A&R notes, etc).
- Ground them in real cultural archetypes. Specific names, specific 
  references. No generic "young music fan."

Verify: I submit track info and get back a clean JSON timeline of 
in-character reactions that feel like distinct real people.

---

## PHASE 3 — Sync reactions to playback (the wow moment)
Goal: as the song plays, reactions appear at their timestamp.

- As `currentTime` passes each reaction's `time`, surface that reaction 
  in a feed that builds up as the song plays.
- Each reaction shows persona name + their text, styled per persona 
  (small avatar circle with initials + color is enough).
- Reactions animate in smoothly (fade/slide), newest at the bottom, 
  auto-scroll.
- The feeling we want: you're watching people listen to your song live.

Verify: I hit play, the song plays, and reactions stream in at the right 
moments, feeling like a real listening room.

---

## PHASE 4 — End-of-song summary (only if Phases 1-3 are solid)
Goal: a clean payoff screen when the track finishes.

- When playback ends, show a one-page summary:
  - Overall reaction (one strong sentence)
  - Best moment (timestamp + why)
  - Biggest risk / drop-off point
  - Which persona would share it, and why
- Generate this with a second Claude call that takes the full reaction 
  timeline as input.

Verify: song ends, a polished summary appears that feels insightful.

---

## Rules for Claude Code
- Build phase by phase. Confirm each phase works before moving on.
- Keep the UI dark, minimal, and confident. One screen. No settings, 
  no nav, no clutter. This is a demo, every pixel should feel intentional.
- Comment the non-obvious parts (timestamp sync logic, JSON parsing) 
  in plain English.
- Handle the AI call failing gracefully — never let a failed parse 
  crash the demo.
- Do NOT add features I didn't ask for. Depth over breadth.
- Use folders to keep many pages on router, don't use components and add it all on 1 page. 

## Rules for Claude Code on this codebase
- Only the pitch is judged — not the code or docs. Optimize for shipping, not ceremony. Don't waste tokens on process.
- Work directly on `main`. No feature branches. Commit locally as you go; push to `main` later when I ask.
- ALWAYS ask me about business/product/feature decisions — I want to drive those. Code/implementation choices are pre-approved; just make them and keep moving.
- No per-change docs. Do NOT update decision.md/document.md on each prompt. Write ONE short summary doc only at the very end, once the product is complete.