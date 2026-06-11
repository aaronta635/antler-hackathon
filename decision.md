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

(See `document.md` PART B for the research behind these.)
