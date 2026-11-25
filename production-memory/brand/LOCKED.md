# Brand rules

_None approved yet. Current design system is NEUTRAL_TEST (not LifeLink brand)._

> Note added 2026-11-24 (memory restructure): the line above is the original `production-memory/brand-rules.md`,
> moved here unchanged. Since 2026-11-23 the design system is no longer NEUTRAL_TEST: `brand/design-system.json`
> has `"status": "PROPOSAL"` (version 1.0.0-proposal.2, `approvedBy: null`). Still nothing is locked.

## What "LOCKED" means
A rule belongs in this file only when the client has **explicitly** approved it as permanent, in their own words,
and that approval is recorded as a dated row in `production-memory/decisions.md` (quote + date).
Silence, "looks nice", or approval of a preview is **not** a brand lock. Approving a creative direction for one
lesson (e.g. concepts v1 for the L01 preview) is recorded in `preferences.md` / `course-decisions/`, not here.

How to lock (from `workflows/brand-onboarding.md`): on explicit approval, copy the proposal to
`brand/design-system.json` with `status: "APPROVED"`, `approvedBy`, `approvedAt`, bump the version, record it in
`decisions.md`, then list each locked rule below with the date and the client's words.

## Locked rules
_None._ (status in `brand/design-system.json` = PROPOSAL, checked 2026-11-24)

## Not yet locked (open items)
| Item | Current state | What is needed |
|---|---|---|
| Music / SFX | Narration only. Client asked for "very subtle sfx" (no music) | Client approval of a very subtle SFX sample |

## LOCKED 2026-11-24 (client approved "Lock it" when asked; details verbatim in decisions.md)
Exact colours (paper #F2F0E7, oxblood #500000, royal #3960BD, sky #9AB9D5, black #060405, rose #AF3E46); derived tints; LifeLink Text and LifeLink Script fonts (licensed);
logo artwork in brand/logo/ (crescent/heart = logo icon, only as part of the logo); no people imagery; gentle narration limiter.
Watermark: review copies show "Preview for approval"; only a master rendered after the client approves the lesson (`render.ts --final`) has none.

## Hard constraints that already apply (from the brief and CLAUDE.md, not brand locks)
- Brand status is APPROVED (locked 2026-11-24). Review renders carry "Preview for approval" until the client approves that lesson.
- Changing colours/fonts/logo rules requires explicit client approval recorded in `decisions.md`.

## Client decisions on the brand board (2026-11-24, recorded verbatim in decisions.md)
- **Fonts APPROVED and licensed:** LifeLink Text (Geneva 22 Soft, rebuilt) — "it is licensed"; LifeLink Script (Australian Mirages Bold) — "it is licensed".
- **Derived tints APPROVED** (paperShade, hillFar, hillMid, skyTint…).
- **Colours APPROVED in principle**, exact codes to come from the client — "ask in chat i will give". Until received, sampled values stay in use.
- **Logo APPROVED**, artwork to come — "ask for it in chat i will send it". The crescent/heart seen on the artboard is the logo icon — "that is the logo icon, if you want better quality i can send it". Use it only as part of the logo, never as a decorative motif.
- **No people imagery** (rejected) — "no people imagery".
- **Watermark rule approved:** stays on every render until the brand is fully locked (colour codes + logo artwork received).
- **Narration limiter / noise reduction APPROVED** (no note). Limiter to standard loudness; noise reduction only where it audibly helps without altering the voice.
- **Music / SFX:** changes requested — "very subtle sfx". Narration-only until a very subtle SFX sample is approved; no music.

## Motion exception — approved 2026-11-25
- Slow per-scene documentary push-in allowed (≤ 3.5 % scale per scene, constant rate, eases in). Client: "Keep push-in, allow it". All other zooms remain forbidden.
