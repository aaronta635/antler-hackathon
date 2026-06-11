# DECISION LOG — reasoning behind each step

Records *how* and *why* we decided each step. Most feature paths are decided by the
user; this log captures the options considered, the choice, and the rationale.
Companion to `document.md` (the step plan + strategy research).

---

## D1 — No database
- **Decision:** No DB; all state in memory for the demo.
- **Options:** (a) no DB, (b) Vercel KV for shareable result links, (c) full DB.
- **Why:** Nothing in the demo flow needs persistence; a DB is setup cost with zero demo
  payoff. Audio plays client-side via object URL; only metadata goes to the API.
- **Reconsider if:** we want shareable "how the room reacted" links — then a single JSON blob (KV), not a real DB.

## D2 — Init approach: create-next-app (Option A)
- **Decision:** Scaffold with `create-next-app` defaults; user familiar with Next.js.
- **Options:** (a) create-next-app, (b) manual scaffold, (c) starter template (T3).
- **Why:** Fastest correct setup; T3 drags in DB/auth/tRPC we don't need.
- **Config:** Next 16 (App Router, Turbopack), TS, Tailwind 4, ESLint, **no `src/` dir** so paths
  match the spec (`lib/`, `app/api/`). Added `ai`, `@ai-sdk/anthropic`, `zod`.

## D3 — Backend location
- **Decision:** Backend = Next.js Route Handlers inside `app/api/**/route.ts`; shared server
  logic in `lib/`. No separate server, no tRPC.
- **Why:** Two endpoints only; route handlers run server-side (API key safe), one `npm run dev`
  serves frontend + backend.

## D4 — Upload UX: drag & drop zone
- **Decision:** Drag & drop zone (also click-to-browse).
- **Why:** Premium first impression for the demo; worth the extra code over a native file button.

## D5 — Progress bar: seekable
- **Decision:** Seekable (click/drag to scrub), not display-only.
- **Why:** Exercises timestamp logic harder; seeking matters for demoing Phase 3 reactions.

## D6 — Timing: requestAnimationFrame (Option B)
- **Decision:** Track position with a `requestAnimationFrame` loop (~60fps); throttle the visible
  clock to ~4x/sec.
- **Options:** (a) `timeupdate` event ~4x/sec uneven, (b) rAF every frame.
- **Why:** The app's payoff is reactions landing exactly on time (Phase 3). `timeupdate` is jittery/
  imprecise; rAF gives precise triggers + smooth bar while still honoring the spec's ~4x/sec *display*.

## D7 — Aesthetic: warm amber
- **Decision:** Dark charcoal UI with a warm amber/orange accent.
- **Why:** Cozy "listening room" vibe fitting the product metaphor.

---

## D8 — Primary buyer: keep broad for now
- **Decision:** Don't narrow ICP yet; demo the experience, decide after mentor feedback.
- **Why:** Early; the core experience is buyer-agnostic. Revisit post-mentor.

## D9 — Virality framing: share-ability signal (who/where/why)
- **Decision:** No numeric "viral %". Frame as: which persona shares it, to which platform
  (TikTok/IG/YouTube), at which timestamp, and why.
- **Why:** Honest + explainable; avoids false-precision pushback; incumbents (Snafu, Musiio)
  own raw-audio scoring. Fits Phase 4's "which persona would share it, and why."
- **Affects:** Persona definitions (each needs a platform/sharing disposition) + Phase 4 summary.

## D10 — Output depth: add a decision layer
- **Decision:** Beyond qualitative reactions, add structured release guidance (best moment,
  drop-off/risk, lead-single/share guidance).
- **Why:** Moves product toward an A&R/decision tool — stronger value prop.
- **Affects:** Phase 4 summary becomes structured; keep Phases 1–3 per spec to control scope.
  Build the decision layer only after 1–3 are solid (spec rule).

## D11 — Multi-page router structure (supersedes "one screen")
- **Decision:** Use the App Router with a folder per page, not one page of components.
  Pages: `/` (upload) → `/details` (metadata) → `/session` (player + reactions) → `/summary`.
- **Supersedes:** the original spec's "one screen, no nav" line — overridden by CLAUDE.md line 101
  ("use folders to keep many pages on router") + explicit user instruction.
- **Why:** User wants each concern on its own page; nothing crowded. Maps cleanly to the phases.
- **Phase 1 note:** Phase 1 lives on `/` + `/session`; `/details` and `/summary` are stubs until
  Phases 2 and 4. For now `/` routes straight to `/session`; Phase 2 inserts `/details` between them.

## D12 — Cross-page state: React Context in root layout
- **Decision:** A client `SessionProvider` mounted once in `app/layout.tsx` holds session state
  (audio file URL, name, later metadata + reactions). No DB, no external store.
- **Why:** The layout stays mounted across client-side route changes, so state + the object URL
  survive navigation. No new dependency (vs Zustand).

## D13 — Demo song: recognizable indie / crossover track
- **Decision:** Demo with a recognizable indie/crossover song (not a mainstream megastar,
  not fully obscure). Needs clear structural moments (hook/drop/bridge/outro) and ~2–3.5 min length.
- **Why:** Balances credibility (judges have a vibe to sanity-check reactions against) with the
  "help indie artists" pitch. Avoids the megastar pitfall: Claude generates from *metadata* (not
  audio), so a famous song would be a memory-assisted "cheat" and contradicts the use case.
- **Caveat:** Still copyrighted commercial music — fine for a local live demo; mind it only if the
  pitch is recorded/posted publicly.

## D14 — AI stack: Vercel AI SDK + generateObject, model claude-opus-4-8
- **Decision:** Generate reactions with `@ai-sdk/anthropic` (per spec) using `generateObject` +
  a zod schema (`ai` v6, `maxOutputTokens`). Model = `claude-opus-4-8` (one-line constant in
  `lib/claude.ts`, trivially swappable to `claude-sonnet-4-6`).
- **Why generateObject over manual parse:** schema-enforced JSON is the most bulletproof way to
  honor "never let a failed parse crash the demo." We still wrap it: retry once on
  `NoObjectGeneratedError`, clean/clamp/sort rows, clear errors with proper status codes.
- **Model choice (resolved):** `claude-sonnet-4-6` for the demo — faster/cheaper for repeated
  practice runs, still excellent persona text. (Opus 4.8 verified great too; swap is one line.)
  Pricing Sonnet $3/$15 vs Opus $5/$25 per 1M.
- **No `temperature`/`top_p`:** Opus 4.8 rejects them; the AI SDK omits them by default.

## D15 — API validation order: input before server-key check
- **Decision:** `/api/reactions` validates the user's track metadata (400) *before* checking for
  `ANTHROPIC_API_KEY` (500). Input errors are the user's to fix regardless of server config.

## D16 — Liveness polish: typing indicators + @replies (anti-"AI feel")
- **Context:** User felt the feed read too generic/AI. Chose two of four proposed fixes.
- **Typing indicators:** each reaction's author appears as an animated "typing…" bubble for
  `TYPING_LEAD` (1.3s) before its timestamp, computed in the same rAF sync (feed-only, no API cost).
- **@replies / pile-ons:** `replyTo` (nullable) added to the reaction schema; prompt asks for 4–6
  reactions that answer another listener (time must come after the one they answer); route normalizes
  replyTo to a valid *other* persona or null; feed shows "↳ replying to {name}".
- **Deferred (offered, not chosen):** presence bar; messier/edgier voice prompt tuning.

## D17 — Dynamic audience (replaces static 5 personas)
- **Decision:** Personas → a configurable **room**. `lib/audience.ts` defines the model: 5 default
  listeners (now a toggleable roster) + user-added **custom listeners** (structured fields: age,
  genres, music-knowledge type, criticality), up to **MAX_ROOM = 6**, plus a global **brutality dial**
  (gentle/honest/savage). New `/audience` screen between `/details` and `/session`.
- **Prompts are now room-driven:** `reactionsSystem/Prompt` and `summarySystem/Prompt` build from the
  selected listeners + tone; custom listeners get a "invent a believable voice" instruction.
- **Flow:** `/` → `/details` (collect meta) → `/audience` (build room → generate) → `/session` → `/summary`.

## D18 — Killed replies, made the room more critical
- **Decision:** Removed the `replyTo`/pile-on mechanic (felt "tryna-be"). Kept typing indicators.
- **More critical baseline:** `toneInstruction` makes the room hard to impress (ration praise, call out
  clichés/weak hooks/muddy mixing); default listeners re-tuned toward harsher criticality.

## D19 — Add Supabase (reverses D1 "no database")
- **Decision:** Add Supabase for launch — persist sessions + verdicts, capture real feedback
  (comment + feeling), magic-link auth capturing **name + email**, and shareable result links.
- **Auth:** magic link (passwordless); login optional for use, captures name+email.
- **Security model:** server writes via service-role key (bypasses RLS); RLS guards reads/share-links
  and user-owned audiences. Secrets only in gitignored `.env.local`; schema in `supabase/schema.sql`.

## D20 — Tone rebalance, vocals, short-clip handling, dashboard summary
- **Tone:** dialed criticality back (defaults softened; `toneInstruction` now targets a realistic
  MIX of praise + critique, scaled by the brutality dial) — the room was too harsh.
- **Vocals:** prompt now assumes a lead vocal/lyrics unless the vibe says instrumental.
- **Short clips:** tracks under 90s are treated as snippets/demo excerpts — fewer reactions, no
  full-song-structure assumptions (kills "outro already?").
- **Summary → scorecard dashboard:** replaced the prose verdict with numbers/visuals (D9-safe — no
  fake viral %): room score /100, sentiment split (sums to room size), best/drop-off timestamps,
  "X/N would share", per-listener verdict dots. Short notes only.

## D21 — Part B: Supabase auth, homescreen, persistence, feedback
- **Supabase clients:** `lib/supabase/{client,server,admin}.ts` (browser anon / server-with-cookies /
  service-role) + `middleware.ts` to refresh the session.
- **Auth:** magic-link sign-in capturing name + email on the new homescreen; `/auth/callback` exchanges
  the code. Optional (anonymous use still works).
- **Homescreen:** `/` redesigned as a crafted dark/amber landing (equalizer motif, not generic-AI) with
  the short name+email login; upload moved to `/upload`. Flow: `/` → `/upload` → `/details` → `/audience`
  → `/session` → `/summary`.
- **Persistence:** `/api/session` saves each finished session via the service-role client; best-effort
  (returns `{skipped}` if Supabase is off, so the demo never breaks). Verified writing a real row.
- **Feedback:** `/api/feedback` + a feeling (🔥/🙂/😐/👎) + comment widget on the scorecard.
- **Deferred:** public share links (`/s/[id]`) — lowest-priority growth piece, next.

## D22 — Waitlist soft gate replaces magic-link auth
- **Decision:** Drop verified magic-link auth; the homescreen now captures **name + email with no
  verification** (waitlist) and is a **soft gate** — the "Start a session" action is revealed after
  submit; returning visitors skip it (localStorage flag).
- **Why:** User wants real name+email "for actual data" without the friction of an email round-trip.
- **Implementation:** `leads` table (server-written via service role); `/api/lead` (best-effort,
  never hard-blocks). Removed `middleware.ts`, `app/auth/callback`, `lib/use-user.ts`,
  `lib/supabase/client.ts`. Sessions + feedback now always anonymous (user_id null) — already handled.
- **Run the new table:** `leads` section added to `supabase/schema.sql`.

(See `document.md` PART B for the research behind these.)
