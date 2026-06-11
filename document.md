# DOCUMENT — Step Plan & Strategy Notes

This file breaks each phase into smaller steps and captures the business/strategy
research behind product decisions. Companion to `decision.md` (the reasoning log).

---

## Router structure (D11) — folder per page
- `/` — upload (drop a track)
- `/details` — track metadata form (Phase 2)
- `/session` — player + live reaction feed (Phase 1 + 3)
- `/summary` — end-of-song summary + decision layer (Phase 4)
- State shared via `SessionProvider` (React Context) in `app/layout.tsx` (D12).

## PART A — Phase step breakdown

### Phase 1 — Audio playback with live timestamp
- **1.1** Strip `create-next-app` boilerplate (demo page, `public/*.svg`); dark amber theme. ✅
- **1.2** `SessionProvider` context in root layout; `lib/` helpers.
- **1.3** `/` page: drag & drop upload zone (also click) → `URL.createObjectURL`, store in context, route to `/session`.
- **1.4** `/session` page: hidden `<audio>` from context; play/pause control.
- **1.5** Live `currentTime` via `requestAnimationFrame` loop; throttle visible clock to ~4x/sec.
- **1.6** Seekable progress bar (click/drag to scrub).
- **1.7** Stub `/details` and `/summary` pages so the folder structure exists.
- **Verify:** upload on `/`, land on `/session`, hit play, timestamp ticks; scrub works.

### Phase 2 — Persona reaction generation (AI core) ✅
- **2.1** `lib/personas.ts` — 5 richly-defined personas (real archetypes, distinct voices + platform disposition for D9). ✅
- **2.2** `lib/claude.ts` — model + system/prompt builder via `@ai-sdk/anthropic`; `lib/reactions.ts` — zod schemas. ✅
- **2.3** `app/api/reactions/route.ts` — POST: track metadata in → JSON timeline out (`generateObject`). ✅
- **2.4** Prompt: 12–18 reactions across full duration, reacting to hook/drop/bridge/outro. ✅
- **2.5** Schema-validated; retry once on `NoObjectGeneratedError`; clean/clamp/sort; clear errors. ✅
- **2.6** Flow wired: `/` → `/details` (metadata form, auto-detected duration) → POST → store in context → `/session`. ✅
- **Verify:** ✅ submit track info → clean in-character JSON timeline; error paths return 400/500/502 with clear messages.

### Phase 3 — Sync reactions to playback (wow moment)
- **3.1** Sorted-by-time reaction list + a pointer; each rAF tick release reactions where `time <= currentTime`.
- **3.2** Feed UI: persona avatar (initials + color) + text, newest at bottom, auto-scroll.
- **3.3** Fade/slide-in animation.
- **3.4** Handle seek/pause cleanly (reset pointer on backward seek).
- **Verify:** play → reactions stream in on time, feels like a live room.

### Phase 4 — End-of-song summary (only if 1–3 solid)
- **4.1** `app/api/summary/route.ts` — second Claude call over full timeline.
- **4.2** Summary screen: overall reaction, best moment, biggest risk/drop-off, who'd share it + why.
- **Verify:** song ends → polished, insightful summary.

---

## PART B — Business & strategy research (for mentor conversation)

Research dated 2026-06-11. Sources inline.

### Q1 — Who pays? Who feels the pain?
The creative-pain holder (artist) and the budget holder (manager/label/marketing) are
often different people; that gap defines the customer.
- **Signed:** Labels spend ~10% of annual revenue on marketing (majors ~$1.7B in 2017–18);
  indie labels put ~27.8% of artist spend into marketing. Buyer = A&R / marketing teams
  de-risking a release.
- **Independent:** Artist *is* the marketing dept. Single/album release ~$7K–$10K; advice is
  30–40% of production cost into promo, committed before revenue.
- **POV:** Sharpest pain = whoever is about to spend money pushing a track and fears betting on
  the wrong song/single/15 seconds → managers, indie-label A&R, and the self-managed
  "artist-as-business." Pure-expression bedroom artist is a user, weak payer.
- Sources: soundcharts.com release-cycle blog; musicweek.com ORCA; denovoagency.com; sonicbids.com.

### Q2 — Problems besides money & time
- **Honest feedback is nearly impossible:** friends/family default to "sounds great!" — an echo
  chamber that stunts growth → decision paralysis ("is it good, or are they being nice?").
- **Specificity:** "I like it" is useless; artists want *which moment* lands / loses people.
  SoundOut benchmarks a song vs 50,000 others — demand for structured comparative data.
- **Which-single / which-cut decisions;** confidence/permission to act (remove paralysis).
- **Our edge:** synthetic personas hit honesty + specificity + speed at once — never flatter,
  react to a specific timestamp, instant. Different from "pay 80 strangers, wait."
- Sources: musicreviewworld.com; blog.sonicbids.com; soundout.com; Medium/Brian Hazard.

### Q3 — Will indie artists (expression-first) pay?
- They already pay: Groover (~€2/contact, €20–60/campaign), SubmitHub (~$0.80–$1/credit).
  Established $10–$60 willingness-to-pay band.
- But a purist segment optimizes for expression, not market fit; virality framing can insult them.
- **POV:** Target the "indie professional" (career-minded, about to spend $7K). For expression-first
  users, reframe hook as "see how 5 kinds of listeners *experience* your song" (insight, not judgment).
  Payers self-select.
- Sources: dynamoi.com Groover-vs-SubmitHub; musicpulse.app.

### Q4 — Virality probability (the wedge)
- Audio-feature models predict hit/not-hit ~80%+ in studies; one neuro+ML study 97% in-sample —
  but optimistic in lab, weak in wild (TikTok trends/creators/luck are unseen in advance).
- Crowded, funded incumbents: **Snafu Records** (150K tracks/week across Spotify/TikTok/YouTube),
  **Musiio** (raw-audio analysis, claims 9/10 viral top-20), **Instrumental** (flagged Lil Nas X,
  Tones and I pre-fame).
- **POV:** Avoid false-precision ("73% viral"); incumbents own raw-audio scoring. Reframe as
  **share-ability signal per platform, per persona**: which persona posts this, to which platform
  (TikTok/IG/YouTube), at which timestamp, and why. Honest, explainable, differentiated — and Phase 4
  already asks "which persona would share it, and why."
- Sources: pmc.ncbi.nlm.nih.gov PMC10318137; researchgate.net 344216655; rollingstone.com Snafu;
  blog.musiio.com; musicbusinessworldwide.com.

### Positioning decisions (resolved 2026-06-11)
1. **Primary buyer:** keep broad for now; decide ICP after mentor feedback. (D8)
2. **Virality framing:** share-ability signal — who/where/why, no numeric score. (D9)
3. **Output depth:** add a structured "release decision" layer on top of qualitative reactions. (D10)

Build impact: Phases 1–3 stay exactly per spec. Persona definitions (Phase 2) gain a
platform/sharing disposition. Phase 4 summary becomes a *structured decision layer*
(best moment, drop-off/risk, per-platform share signal) — built only after 1–3 are solid.
