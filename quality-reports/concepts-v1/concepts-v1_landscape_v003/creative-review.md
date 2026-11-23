# Creative review: concepts-v1_landscape_v003 (five brand concepts, 57 s)

Reviewer: Quality Director, independent (did not write the manifest or the design system).
Material reviewed: report.json/report.md (automated QA PASS, not repeated here), contact-sheet.jpg, all 18 frames in `frames/`,
about 60 extra frames pulled with ffmpeg (every 0.5 s or less around each build and each section boundary), manifest.json,
brand/design-system.json, BRAND_INTAKE.md, and the client artboard/references image. No audio or transcript exists (visual concepts only).
Caveat: I judged motion from stills taken 0.25–0.5 s apart, not from real-time playback, so I can't judge easing feel or overall rhythm with confidence.

## Overall impression

This is well above template quality. The palette is used with restraint: cream paper, oxblood ink, royal blue as a ground and accent, the light blue kept for small accents. The paper grain and blind emboss pick up the ORRAV reference directly. Using the script font for one word in a sans sentence correctly reads the Wedi/Save-the-date references. Four of the five concepts have a clearly different composition. The direction reads as Trustworthy, Intentional and Refined.

Two things hold it back. First, the **two-ring motif appears in all five concepts**, and in its embossed form it reads as a pair of wedding bands. Second, the **script font breaks its own rules** in several places: numerals and small sizes, and a capital "I" that reads as "J". Neither needs a new direction. Both should be fixed before this goes to the client as "the brand".

## (a) One brand, distinct compositions?

- **One brand: yes.** The same two typefaces, the same palette, the same paper texture, the same mask-wipe "ink" reveal and the same small tracked-caps labels appear throughout. Nothing falls outside the design system's colours. The watermark is present and legible top right in every frame (status PROPOSAL).
- **Distinct: mostly.** Concept 1 is an object on a ground (folder card). Concept 2 is pure type at scale. Concept 3 is a linear diagram. Concept 4 is a dark field. Concept 5 is a split panel. Ground colour alternates blue, cream, cream, oxblood, then blue/cream, which gives good rhythm.
- The weak spot is **2 → 3**. Both are cream with an oxblood headline at top left and a tracked label above it, so the change between them is smaller than any other. Another weak spot: rings appear in every concept, so the motif stops being a signature and becomes wallpaper.

## (b) Generic / AI-template / PowerPoint risk

- **Concept 5 is the one at risk.** A coloured sidebar holding the title, a numbered list with hairline rules and an empty lower half is the standard "summary slide" layout. Paper texture and script numerals soften it, but structurally it is a deck template. The right panel's lower 40 % is dead space until the sign-off at 53.6 s.
- Concept 3's **filled-intersection Venn** at the end of the path is the most clichéd "compatibility" graphic there is. It also edges toward the "match" visual language the client wants to avoid.
- Concepts 1, 2 and 4 do not look generic.

## (c) Personality and prohibitions

- **Restraint: good.** There are no zooms, bounces or particles. Holds are generous and nothing feels gamified. This sits close to an Aesop/Apple register.
- **Ring motif and wedding rings: real risk, highest-priority finding.** The client lists "wedding rings" as a prohibition. The design system lists "rings" under imagery rules *and* proposes a `linkRings` motif, so it contradicts itself.
  - In concepts 1 (0.5–11 s, large, centre-left) and 5 (46–57 s, bottom of sidebar), the rings are rendered as **thick embossed bands with a bevel and highlight**. Two overlapping metallic-looking bands is the stock wedding-ring icon. A viewer seeing it next to the words "Preparing for Marriage" will read "wedding rings".
  - The hairline versions in concepts 2 and 4 and the Venn in concept 3 read more as geometry, but there are five appearances in 57 s.
  - Note that the client's actual mark (artboard) is *not* two rings. It is a solid disc with a smaller, offset counter-form: two whole forms, one held within the other. The motif is a loose redraw, and the design system's own logo rule says "do not redraw or approximate the two-ring mark".
- **Crescent: risk from motion.** In concept 4 the rings draw on as arcs. At **38.0–39.0 s** a single large thin arc, open on the left, sits alone on the oxblood field and reads as a crescent. The second ring is still incomplete at 44 s (stray arc tail at bottom). Concept 3 has the same issue briefly at **~30.0 s**, a lone open arc after the path ends. Both moments touch the "overused crescent-moon" prohibition.
- No hearts and no Islamic patterns appear, and there is no dating-app language. The copy is sincere. The tone is welcoming, not preachy.

## (d) Typography and legibility

- **The text face (Geneva 22 Soft) works.** It is clean and calm, and the word-spacing correction is effective (spacing looks natural). Two caveats. It is close to a system UI font, so it contributes polish but little distinctiveness. The single weight also leaves concept 3's three hierarchy levels relying on colour alone (dark / muted / pale pink). "Values, lifestyle, intentions" and "Both sides, independently" are small, low-contrast muted-rose captions on cream that will struggle on a phone.
- **Script font (Australian Mirages):**
  - Used well: "before" (c2), "the right person," (c4), "In summary" (c5) and the wordmark. The short accent phrases and the collision idea are right.
  - **Rule breaks.** The design system says script is "never for numbers in diagrams or anything under 56 px".
    - The stage numerals 1–3 in c3 and the list numerals 1–4 in c5 are script, roughly 40–45 px.
    - The "LifeLink" wordmark on the c1 folder tab is about 30 px.
  - **Capital I reads as J.** "Introduction" (c3, 29.8 s on) and "In summary" (c5) read as "Jntroduction" / "Jn summary" at a glance. This is a known trait of this face. Avoid script words starting with I, or set them in lowercase.
  - **c2 collision.** "before" crosses the p and y descenders of "Compatibility". The overlap is intentional, but the b ascender sits on the p descender and from 2 m away it looks like a typesetting accident rather than a designed interlock. Also, the blue script sits *on top of* oxblood strokes, so there is no knock-out, and the overlap reads as a tangle.
- **Breaks and widows.** c4 "not collecting the most / **matches.**" leaves a one-word last line on the key line of the statement. c4 also breaks "about finding" before the script line, which works rhetorically but leaves a ragged first block. c3 "Complete your / profile" and c5 "Technology combined with human / matchmaking" are acceptable.
- **Minor.** In c2 a faint background hairline (the ring) runs through the caption text ("the next step.") at bottom right, around 18 s.

## (e) Motion and pacing

- **Section boundaries.** All are cross-dissolves. The cream → oxblood (35 s) and oxblood → blue/cream (46 s) dissolves pass through a **dusty mauve/pink** for a few frames (clearly visible at 46.25 s) that is not a brand colour and cheapens the moment. A short dip through cream, or a hard cut on a beat, would be cleaner.
- **c1.** The first 0.5 s is an empty blue field. The emboss rises at 0.5–1.5 s, the card slides in at 1.5–2.5 s and the title mask-wipes at 2.5–3 s. Then it is static from about 4 s to 11 s (≈ 7 s hold). This is fine for an intro concept, but a slow settle or drift would help it feel alive.
- **c2.** This is the best-paced concept. The word build at 11.8 / 13.0 / 13.9 s reads like a sentence being said, and the caption follows at 16 s. The mask wipe mid-word ("Compat…", "befo…") reads as ink and is fine.
- **c3.** The stage cadence (one every 2 s, active stage dark, previous stages muted) is clear and calm. The outcome lands at ~30 s, then everything holds to 35 s. OK.
- **c4.** The ring draw-on is slow, still drawing at 44 s. The text build has room to breathe, but see the crescent note above.
- **c5.** List items every 1.4 s is a touch fast for four items plus a 3-line wrap, but acceptable. The sign-off appears only 3.4 s before the end.

## Issues

| # | Time | Scene | Severity | Issue | Fix |
|---|---|---|---|---|---|
| 1 | 0.5–11, 46–57 (also 11–22, 22–35, 35–46) | c1, c5 (all) | **blocker** (before client presentation) | Embossed two-ring motif reads as wedding bands. It appears in all five concepts and contradicts the client's prohibition and the design system's own "no rings" rule and "do not approximate the mark" rule. | Remove rings from c1, c2, c5. Keep at most one structural use (c3 path merge) and draw it as two *unequal* forms or an offset disc/counter-form echoing the real mark, not two equal bands. Never emboss/bevel it. Flag the motif to the client as an explicit question. |
| 2 | 38.0–39.0, ~44; ~30.0 | c4, c3 | **should-fix** | Partially drawn rings form a lone arc that reads as a crescent. The c4 ring is still incomplete late in the scene. | Fade the ring in whole (opacity) instead of stroke-drawing it, or draw both rings simultaneously from the same point. Make sure it's complete before the first text line lands. |
| 3 | 22–35, 46–57, 2.5–11 | c3, c5, c1 | **should-fix** | Script font used for numerals and below 56 px (stage/list numerals ~40–45 px, tab wordmark ~30 px), against the design system rule. | Numerals in LifeLink Text (tracked, muted) or oldstyle in the text face. Enlarge the tab wordmark to ≥56 px or move it to the card's foot. |
| 4 | 29.8–35, 46–57 | c3, c5 | **should-fix** | Script capital "I" reads as "J" ("Jntroduction", "Jn summary"). | Use lowercase script ("introduction", "in summary") or a different accent word ("Introduced", "to summarise"). |
| 5 | 13–22 | c2 | **should-fix** | "before" overlaps the p/y descenders and reads as a collision accident, with no knock-out. | Shift "before" so it nests in the gap between descenders, or add a 4–6 px paper-coloured knock-out stroke behind the script so it cuts through cleanly, as in the Wedi reference. |
| 6 | 46–57 | c5 | **should-fix** | Sidebar + numbered bullets reads as a PowerPoint summary slide. The lower right panel is empty. | Try a ledger/index-card treatment: four entries on a cream card with tab (rhymes with c1), or a two-by-two grid. Or vertically centre the list and anchor the sign-off. Drop the sidebar rings. |
| 7 | 22–35 | c3 | **polish** | Filled Venn intersection is a cliché and edges toward "match" imagery. | End the two lines meeting at a single point / merging into one line labelled "Introduction". No overlap fill. |
| 8 | 35.0–35.5, 45.8–46.4 | c3→c4, c4→c5 | **polish** | Dissolves pass through an off-palette dusty mauve. | Dip through cream (0.3 s) or hard cut. |
| 9 | 40–46 | c4 | **polish** | Widow "matches." on the key line. Second ring cropped by the right edge. | Rebreak as "not collecting / the most matches." and keep the rings fully inside the safe area. |
| 10 | 23–35 | c3 | **polish** | Detail captions (muted rose, small) are low contrast and will not survive a phone screen / portrait cut. | Use inkMuted at ≥26 px, or drop the detail lines. |
| 11 | 11–35 | c2→c3 | **polish** | c2 and c3 are the least differentiated pair (same ground, same headline placement). | Give c3 a different ground (paperShade) or move its heading to the bottom/left column. |
| 12 | ~18 | c2 | **polish** | Background hairline runs through the caption text. | Mask the ring behind the caption or move it. |

## Per concept: strongest / weakest

1. **Course intro.** Strongest: the cream folder card with tab on embossed blue is a direct, tasteful translation of the ORRAV reference and feels stationery-grade. Weakest: the large embossed two-ring bands beside "Preparing for Marriage" read as wedding rings. There is also a 30 px script wordmark.
2. **Statement.** Strongest: confident editorial scale with a single script word. It is the most ownable and most "Refined" frame, with excellent build timing. Weakest: the "before" collision with the descenders looks accidental rather than designed.
3. **Diagram.** Strongest: two independent lines converging at a pace of one stage every 2 s explains "both sides, independently" clearly, with no gamification. Weakest: the filled Venn ending is cliché/"match" language, combined with script numerals and the "Jntroduction" read.
4. **Reflection.** Strongest: the oxblood field with light-blue script is the most emotionally resonant moment and has real restraint. Weakest: the stroke-drawn rings create a crescent-shaped arc at 38–39 s and the key line ends on a widow.
5. **Summary.** Strongest: the clean ledger hierarchy and the sign-off with the wordmark close the piece well. Weakest: it is structurally a PowerPoint summary slide (sidebar + bullets + empty lower half).

## Open questions for the client (not defects)

- Is any ring/link motif acceptable at all, given "wedding rings" is a prohibition? Can the real mark's disc-and-counter shape be used as the motif once vector files arrive?
- The script licence for video (Australian Mirages) is still unconfirmed. The concepts lean on it in four of five scenes.

VERDICT: REVISION REQUIRED
