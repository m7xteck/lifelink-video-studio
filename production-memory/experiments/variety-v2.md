# Variety & memory pass (v2) — brief for the agent team

Client feedback on L01 v003 (2026-11-24, verbatim): "every single part feels repeated … its all the same drop down
style text with the line above etc. there is a lack of purposeful animations throughout … a listener should be able to
watch through the full 36 minutes without being bored and also with an understanding of whats been said and remember it."

Diagnosis (measured on manifest v003): 251 scenes; kineticStatement 119 + parallelPhrases 55 = 25 of 36 min of the same
rising-line treatment; 138 scenes carry the small tracked kicker + rule; pictorial scenes ≈ 2 min total.

## Principle
Each chapter teaches ONE idea that can be pictured. Give it a **signature illustration** that is built piece by piece
exactly as the narrator names each part, returns when the idea returns, and reappears in the end recap. Recurring,
cumulative images are what make a 36-minute lesson memorable. Text scenes remain for lines with nothing to picture,
but in several distinct treatments.

Brand rules unchanged (design-system.json, preferences.md): paper-and-ink cut paper, palette tokens only, LifeLink
Text + Script accents (≤4 words, no capital I, no numerals, avoid "x"), soft-start easing, travel ≤160 px, no rotating
cards, no hearts/rings/crescents/Islamic patterns/people/faces/hands, no decorative motion, still once settled.
Every moving element must map to a spoken cue (`at` = when the words are spoken; use `npx tsx pipeline/cue-slice.ts`).

## New signature components (src/components/brand/, register in schema + SceneRenderer)
Each takes an ordered list of parts with `at` cues; parts that are not yet spoken are absent (never placeholders that
look broken). Optional `focus` index highlights one part (others dim to ~35%) for revisits. Text labels in LifeLink Text.

| type | idea / where (approx s) | picture | builds as |
|---|---|---|---|
| `lessonMap` | roadmap 136–260; chapter openers | a winding path with up to 8 stations (paper discs) + short titles | stations appear as named; on revisits, past stations filled, current pulses once, future absent |
| `threePillars` | sakina/mawaddah/rahmah 285–390; recap ~2076 | a simple roof/lintel on three paper columns standing on a base | each column rises on its name, word + meaning set under it; lintel lands after the third |
| `ecosystemRings` | dimensions of a healthy marriage 417–546 | concentric paper rings; centre disc = faith; each named dimension adds a labelled arc/ring | centre first, rings added outward as spoken |
| `iceberg` | public vs private character 546–670 | waterline across frame; small peak above (public: reputation, achievements), large mass below (private: at home, under pressure) | peak, then waterline, then the hidden mass revealed on "at home" |
| `pressuresShelter` | changing world 670–810 | a small paper house; labelled wind strokes (finances, technology, work, culture…) arrive from the side; foundation slab glows on "consultation … foundation" | each pressure arrives on its cue, house stays standing |
| `sortTrays` | Islamic teaching vs cultural expectation 810–947 | two trays with headers; small cards drop into the correct tray | card per example on its cue |
| `bridgePlanks` | four elements of partnership 947–1086 (replaces the stepsDiagram revisits) | two cliffs; a bridge of 4 planks laid one by one, each labelled | plank per element; revisits use `focus` |
| `balanceScale` | responsibility vs control / amanah 1086–1228 | a balance; "responsibility/care" vs "control" pans; tips to level on trust | pans load on cues; settles level (no swinging decoration) |
| `foundationLayers` | core foundation 1228–1374 | stacked courses of paper bricks, bottom up, each course labelled (faith, respect, trust …) | course per spoken item |
| `mythTruth` | myths 1514–1668 | a paper slip with "Myth" + the myth; on the correction it tears along a line and the truth is revealed beneath | tear on the correcting phrase |
| `scenarioCard` | scenarios 1384–1500, 1806–1939 | case card: small index ("Scenario" label + Script ordinal word, e.g. "first"), situation line, then a ruled response area that fills as the better response is described | slides up (no rotation) |
| `mirrorCheck` | mirror check 1939–2060 | an oval paper mirror; each question appears inside it (reflection = looking inward); answered questions stack beside it | question per cue |
| `chapterRecap` | end of each chapter (5–8 s) and lesson end ~2068–2120 | a small, still thumbnail of the chapter's signature picture + 1–3 key words | the end-of-lesson recap revisits the signatures in order |

## New text treatments (so text scenes stop looking identical)
- `highlightLine`: one sentence set large; a marker sweep (sky/royal tint behind the key words) draws on the emphasis cue. No kicker.
- `pullQuote`: a key sentence of the narrator's, oversized opening quote mark cut from paper, sentence right of it. For teaching lines that deserve weight.
- `questionPrompt`: reflection questions — a large script "?" cut-out at left, question set beside it, generous space. (Replaces reflectionField for some.)
- `wordStack`: 2–4 single key words stacked big and left-aligned, each on its cue (lists of qualities). Replaces many parallelPhrases.
- Existing kineticStatement keeps working, but **kicker only at chapter openings**, never on consecutive scenes.

## Rhythm rules for planners (checked by a script)
1. Never the same scene type twice in a row; no type more than 3 times in any 8 consecutive scenes.
2. Text-only treatments ≤ 50 % of runtime; every chapter has its signature picture on screen ≥ 25 % of its time.
3. Kickers: ≤ 1 per chapter (the opener) plus genuine headings the narrator reads out.
4. Each chapter ends with a `chapterRecap`; the lesson end recap revisits all signatures.
5. A signature returns (with `focus`) whenever the narration returns to one of its parts, instead of new text.

## Quality bar (every component, self-checked before hand-off)
Render stills at: first cue, mid-build, fully built, fade-out; inspect each at full size. Check: nothing off-frame or
cropped, labels never overlap shapes or each other, parts physically sit where they should (columns on the base,
planks between cliffs, cards inside trays), nothing appears before its cue, nothing moves without a cue, still when
settled. `npx tsc --noEmit` clean. QaGuard passes.

## Text entrances (client, 2026-11-24: "adding 1 or 2 other variety instead of being consistently drop down style text")
kineticStatement now has `reveal`: "rise" (words rise from a mask — the old look), "focus" (words come into focus in place,
no movement — calm, reflective lines), "ink" (each line written left→right — definitions, key statements).
Omitted ⇒ chosen automatically per scene. Planners: set it deliberately; never the same reveal on two consecutive text
scenes; "rise" ≤ 1/3 of text scenes. The new text components must each use an entrance that is NOT the rising mask.

## REVISION 2 — client direction 2026-11-24 (this section overrides anything above, and any task prompt that conflicts)
Goal: from good motion graphics to premium educational filmmaking. Not more animations — better ones.
1. **Narration first.** A scene exists only if it helps the viewer understand or remember what is being said at that moment. Never fill time.
   If a line has nothing to picture, a restrained text treatment (or a held, quiet frame) is the right answer.
2. **Adaptive pacing — no quotas.** The "≥25 % picture per chapter" and "text ≤50 %" targets are REMOVED (rhythm.ts now reports them as info only).
   Choose visual density from the teaching and emotion: rich where a concept is being built, restrained where the narrator is personal or reflective.
   `chapterRecap` only where a recap genuinely helps memory (end of a dense teaching chapter, and the lesson end) — not mechanically every chapter.
3. **Develop, don't cut.** Prefer ONE continuous signature scene that develops as the speaker explains (parts added, a part brought into focus, a label
   transforming, the view moving closer to the part being discussed) over cutting picture → text → picture. A concept's picture should feel like it is
   teaching alongside the narrator. Use `focus` and build cues rather than new scenes where the narrator stays on the same idea.
4. **Continuity & memory.** First appearance establishes the image; later returns use the SAME image, developed (e.g. the pillars return when tranquility
   is mentioned again; the iceberg returns when private character returns; the bridge planks return with focus). The lesson-end recap connects the images.
   Intentional, not repetitive: a return must add something (focus, a new label, a connection), never a plain replay.
5. **No identical patterns back to back** (enforced: no same type twice in a row; text reveals alternate).
6. **Premium art direction.** Brand palette/typography/composition only. Avoid generic infographic templates, icon-y or childish shapes, crowded diagrams,
   decorative motion, and anything that looks auto-generated. Generous space, few elements, precise alignment. If a component looks basic or template-like
   in your stills, say so in your final answer (component name + what is weak) so the Motion Designer can upgrade it — do not paper over it.
7. **Preserve what works.** The approved first 60 s, the PathLandscape and FindingBecoming scenes and other strong scenes stay unless there is a clear reason.
8. **No dead air.** A frame showing only a small label (or nothing) while the narrator is introducing something is a defect — found in v003 at
   4:45–4:49 by video review ("three essential pillars" over an almost empty frame). Restraint means a deliberate, composed frame, not emptiness.
Video review tool (used after render): `python3 -I pipeline/clip-review.py <video> <transcript.json> <from> <to> <out> [fps]` → clip.mp4 with audio,
timestamped filmstrips captioned with the words being spoken, and a motion-energy graph (spikes = pops/jolts).
