# Creative review — test-001 landscape v007

Reviewer: quality-director (independent; did not write the manifest or render)
Date: 2026-11-23
Material reviewed: `report.json`, `contact-sheet.jpg`, all 22 frames in `frames/`, plus about 50 extra frames I pulled from the MP4 around every scene boundary and cue (0.5–2.0, 4.5–5.6, 10.0–12.4, 18.0–21.2, 24.0–26.5, 30.0–31.0, 34.0–35.6 s). I also read `manifest.json` and `brand/design-system.json` (status `NEUTRAL_TEST`).

Context: this is a 40 s engine test in the neutral placeholder style. There is no transcript, only test tones at scene starts, so I checked storytelling against the manifest's `at` cues and the on-screen wording, not against narration. I judged motion from stills taken 0.1–0.5 s apart. I could not judge easing quality, judder or how smooth the motion feels.

## Overall impression
The direction is restrained and coherent, and the craft level is high: a warm-dark field, Newsreader display type, Inter labels and a single muted-gold accent. Hierarchy is clear in every scene. Nothing on screen falls outside the palette or the font families. Text reveals are staggered by line or by item and land on or just after their cues. No scenes collide during transitions: each boundary is a fade-out of about 0.3–0.45 s, a brief empty background beat, then the next scene builds in.

## Watermark / brand
- The watermark "ENGINE TEST · NEUTRAL STYLE · NOT LIFELINK BRAND" is present in the top-right of every frame I inspected, from 0.0 to 39.9 s. It is legible, in muted ink, and sits clear of all content. **OK.**
- Colours seen: background/deep, ink, inkMuted, accent (gold), secondary (blue-grey stroke on Person A), line. All are in `design-system.json`. Fonts: Newsreader roman and italic, and Inter. **OK.**
- Nothing presents itself as LifeLink branding. **OK.**

## Findings

### 1. Emphasis on "guess." is not rendered (s02, 6.6–10.0 s) — should-fix
The manifest asks for emphasis on `["narration", "guess."]`. "narration," gets the gold italic, but "not from a guess." renders in plain ink (frames 04, 05, and extracted frames at 7.2 and 10.0 s). The likely cause is punctuation matching: "narration" matches the token "narration,", but the term "guess." (with its full stop) fails to match. The bug sits in the data-driven emphasis path, which is exactly what this test exists to prove, and in a real lesson it would silently drop the author's intent.
**Fix:** normalise trailing punctuation on both the emphasis terms and the tokens before matching, add a unit test for terms that contain punctuation, then re-render s02.

### 2. "Shared space" label collides with both circle strokes (s04, about 20.3–24.0 s) — should-fix
The italic "Shared space" label is wider than the overlap lens, so the "S" and the final "e" sit on the two circle outlines (frame 12 at full resolution, extracted frames at 20.8 and 21.2 s). Strokes crossing letterforms make this the least refined moment in the piece, and it also blurs the metaphor of a distinct shared space.
**Fix:** do one of these:
- increase the final overlap so the lens is about 1.3× the label width;
- drop the label to `label`/`caption` size;
- move the label just below the lens with a short leader;
- knock the strokes out behind the text with a background-coloured halo.

### 3. Every transition is the same dip through empty background — polish
All six boundaries (4.5, 10, 18, 24, 30, 34.5 s) use the same treatment: the outgoing scene fades for about 0.3–0.45 s, an empty background frame holds briefly, then the next scene builds from nothing (QA frames 03, 06, 10, 13, 17, 19 are all near-empty). The result is clean and safe, but over 40 s the rhythm is metronomic and slightly "slide-deck". At lesson length it will also add a small dead beat at every scene change.
**Fix:** keep the dip for section changes only (10 s, 30 s). Within a section (4.5, 18, 24 s), try a short overlap or carry-over, for example letting the step path or the background drift continue so the next scene builds while the last one exits. Re-check the text-overlap rule afterwards.

### 4. Step details and inactive labels are very low contrast (s03, 10.8–18.0 s) — polish
In the path diagram the "Step one / two / three" details are shown in dim inkMuted at caption size, and inactive step labels are dimmed further (frame 09 crop). They still read at 1080p full screen, but they will be marginal on a laptop in a lit room or in a downscaled 720p stream. The diagram also leaves the lower third of the frame empty while the four nodes sit in a narrow band.
**Fix:**
- Raise the minimum opacity of inactive steps (about 0.6 → 0.75).
- Keep details at least at `label` (26 px) instead of `caption`.
- Optionally increase the amplitude of the path, or move it down about 60 px, to balance the heading against the diagram.

### 5. Tiny gold dot under the reflection line reads as a stray speck (s06, 31–34.5 s) — polish
A roughly 6 px accent dot is centred under "A restrained scene for reflective moments." It is clearly intentional, as an ornament or breathing point, but at this size it looks like a compression artefact or a typo full stop, especially in a scene that is otherwise empty.
**Fix:** either enlarge it into a deliberate mark, such as a 40–60 px hairline rule or a slow breathing pulse, or remove it.

### Notes (no action required)
- **s01 (0–4.5 s):** The title builds by line with a mask reveal from about 0.5 s. The outlined "01" numeral is a good, quiet texture. The first 0.25 s is background only, which is fine as a lead-in.
- **s02:** Lines appear on their cues (line 1 about 5.0–5.6 s, line 2 by 7.2 s; cue 6.6). The text-overlap flagged by QA at 4.83 s is not visible in any extracted frame. It is pre-animation geometry only.
- **s04:** The circles start converging on cue (19 s) and settle by about 20.8 s. The caption appears after the convergence, which is good sequencing.
- **s05:** The preferred side is signalled by the gold title and brighter points while the other side is dimmed, and the blur-in entrances are tasteful. At 29.7 s the whole comparison is already dimming, so there is no final hold on the preferred state. That is acceptable at this length.
- **s07:** Items reveal on cue (35.2, 36.6, 38.0 s) and hold to the end, a clean close. "Engine checks" breaks naturally across two lines.
- **Typography:** no widows or awkward breaks, and nothing below 22 px apart from the watermark, which is exempt by purpose.
- **Values sensitivity:** neutral placeholder content, so nothing to flag. "Person A / Person B" as two whole forms is respectful.

## Summary table
| # | Time | Scene | Severity | Issue |
|---|---|---|---|---|
| 1 | 6.6–10.0 s | s02 | should-fix | Emphasis on "guess." not applied (punctuation matching) |
| 2 | 20.3–24.0 s | s04 | should-fix | "Shared space" label collides with circle strokes |
| 3 | all boundaries | all | polish | Identical dip-to-empty transitions; metronomic rhythm |
| 4 | 10.8–18.0 s | s03 | polish | Low-contrast step details and inactive labels; diagram band sits high |
| 5 | 31–34.5 s | s06 | polish | Tiny accent dot reads as a speck |

VERDICT: PASS WITH NOTES
