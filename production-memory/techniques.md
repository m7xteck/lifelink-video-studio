# Techniques that worked

Reusable craft and pipeline techniques with evidence. Creative techniques still obey `brand/` and `preferences.md`.

## Creative
| # | Technique | Why it works | Evidence / where |
|---|---|---|---|
| T1 | **Signature image per chapter**, built piece by piece exactly on the narrator's cues (parts not yet spoken are absent) | One recognisable picture per idea makes a long lesson memorable; build = teaching | variety-v2.md; components in `src/components/brand/` |
| T2 | **Continuity / returns**: the same image comes back, developed (`focus` dims others to ~35%, new label, connection) | Visual memory without replay; client's 2026-11-24 direction | variety-v2.md Revision 2 §3–4 |
| T3 | **Develop, don't cut**: one continuous scene that grows while the narrator stays on an idea | Avoids picture→text→picture choppiness | variety-v2.md Revision 2 §3 |
| T4 | **Restraint where nothing can be pictured**: a composed text treatment instead of a forced illustration | Client: three-lines scene "cheap… no meaning"; plain text approved | lesson-notes L01 (s003 reverted, s001–s004 approved) |
| T5 | **Varied text reveals**: rise / focus (in place, calm) / ink (written left→right); never the same reveal twice in a row; rise ≤ 1/3 | Kills the "same drop-down text" monotony | variety-v2.md; kineticStatement `reveal` |
| T6 | **Kicker only at chapter openers** | 138 kickers made every scene look alike | variety-v2.md |
| T7 | **Meaning-driven illustration**: an object that acts on the words (letter rises from envelope on "welcome"; sun rises on "relationships of your life"; compass → seedling) | Motion maps to narration; client "much better" | lesson-notes L01 (v010) |
| T8 | **Exact geometry**: compute paths/positions from one centre-line (fold-free search), place parts ON it | No "steps off the path" errors | lesson-notes L01 |
| T9 | **Soft-start easing, short travel** (≤ ~160 px, eased rise + fade) | Smooth at 30 fps; fixed "choppy" | lesson-notes L01; design-system motion rules |
| T10 | **Slow arrival after dark scenes** (≥ 1.3 s, ease in-out) and matched grounds between scenes | No brightness flashes | `src/motion/time.tsx`, `GroundBackdrop.tsx` |
| T11 | **Recap only where it helps memory**; lesson-end recap connects the signatures in order | Purposeful, not mechanical | variety-v2.md Revision 2 §2 |
| T12 | **Freeze approved scenes** and preserve them through later passes | No regressions on what the client liked | lesson-notes L01 (s001–s004, first 60 s) |

## Timing
| # | Technique | Where |
|---|---|---|
| T13 | Every `at` = when the words are spoken, from word timestamps: `npx tsx pipeline/cue-slice.ts --course c --lesson l --from A --to B` (window) or `pipeline/find-cue.ts "<phrase>"` (exact phrase) | CLAUDE.md |
| T14 | Put scene boundaries in pauses (≥ 0.7 s pauses listed in transcript.json) so last lines hold ≥ 1.5 s and crossfades never overlap text | lesson-notes L01 |
| T15 | Section files (`courses/<c>/<l>/sections/<id>.json`) let agents plan/build sections in parallel; `pipeline/sections.ts check` / `merge` | sections.ts |

## Pipeline / review
| # | Technique | Where |
|---|---|---|
| T16 | **Section render cache** (fingerprint per section ±1.5 s + engine + design system + encoder): v003 re-rendered 3 of 16 sections, 1307 s vs 5830 s | `pipeline/render.ts`; SYSTEM-AUDIT §7 |
| T17 | **Video-based review** (not stills only): `python3 -I pipeline/clip-review.py <video> <transcript.json> <from> <to> <out>` → clip, captioned filmstrips, motion-energy graph (spikes = jolts); found the 4:45 dead air | clip-review.py |
| T18 | **Rhythm check** before render: `npx tsx pipeline/rhythm.ts --course c --lesson l [--section id]` (no same type twice in a row, ≤3 of a type per 8, kickers) | rhythm.ts |
| T19 | Independent reviewer per section + Quality Director on contact sheet after QA passes | CLAUDE.md QA; Module 01 review (82 section fixes) |
| T20 | Self-check stills at first cue, mid-build, fully built, fade-out before hand-off; `npx tsc --noEmit` | variety-v2.md quality bar |
| T21 | Gain-only narration mastering with a loudness report (`*.loudness.json`) | render.ts |
