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

## Not yet locked (open items that block a lock)
| Item | Current state | What is needed |
|---|---|---|
| Colours | Hex values sampled from a screenshot of the artboard (paper, oxblood, royal, sky, black, rose) | Client confirms exact codes |
| Derived tints (paperShade, hillFar, hillMid, skyTint…) | Created by the studio for depth/legibility | Client approval |
| Display font "LifeLink Script" (Australian Mirages Bold) | Loads; used for ≤4-word accents | Commercial video licence confirmation |
| Text font "LifeLink Text" (Geneva 22 Soft, rebuilt) | Rebuilt with fontTools for Chromium | Licence + permission to use a rebuilt file |
| Logo | Not supplied; wordmark set in script as placeholder | Vector artwork + usage rules |
| Crescent/heart icons seen on the artboard | Conflict with questionnaire prohibitions | Client decision |
| Imagery of people | Not used ("No people until imagery rules are confirmed") | Client decision |
| Music / SFX | Not approved (narration only) | Client decision |
| Narration limiter / noise reduction | Gain-only master; limiter would reach −16 LUFS | Client yes/no |
| Watermark | Mandatory in code while status ≠ APPROVED | Removed only after lock |

## Hard constraints that already apply (from the brief and CLAUDE.md, not brand locks)
- Never present a render as LifeLink-branded while status ≠ APPROVED; watermark always on.
- Changing colours/fonts/logo rules requires explicit client approval recorded in `decisions.md`.
