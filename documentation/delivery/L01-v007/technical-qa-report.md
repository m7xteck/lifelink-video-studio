# Technical QA report: Module 01, Lesson 01, v007

**Video:** `renders/lifelink-course-L01/landscape/lifelink-course-L01_landscape_v007.mp4`. This is the master: 1920×1080, 30 fps, H.264, 588 MB.

**Delivery copy:** `deliverables/lifelink-course/L01-v007/LifeLink-Module01-Lesson01_v007_preview.mp4`. It is the same picture and sound re-encoded to a smaller file, and was not re-checked separately.

**Automated checks:** `pipeline/qa.ts`, run 2026-11-25 on the master. Full report: `quality-reports/lifelink-course-L01/lifelink-course-L01_landscape_v007/report.md`.

**Result: PASS. 16 pass, 0 fail, 1 warning.**

| Check | Result | Measured |
|---|---|---|
| Scenes in narration order | PASS | |
| Scenes cover the timeline with no gaps | PASS | |
| Every text cue on screen ≥ 1.5 s | PASS | |
| Full decode with no errors | PASS | |
| Resolution | PASS | 1920×1080 |
| Codec | PASS | H.264 High, yuv420p |
| Frame rate | PASS | 30.000 fps |
| Duration | PASS | 2168.27 s. This is 3 s longer than the narration because of the closing logo hold. |
| Audio present | PASS | AAC 48 kHz stereo |
| Audio length | PASS | Matches the video |
| Loudness | PASS | −16.5 LUFS integrated, −1.5 dBTP true peak (target −16 LUFS, ≤ −1 dBTP) |
| Narration sync against your original recording | PASS | 5 ms offset (tolerance ±33 ms) |
| Black frames | PASS | None unexpected |
| Flashes | PASS | Largest frame-to-frame brightness jump: 14.9 of 255 |
| Text layout (clipped, too small, overlapping) | PASS | Only 3 momentary contacts, all mid-animation |
| Subtitles (SRT) | PASS | 525 cues, in order and within the duration |
| Long stillness (> 8 s fully static) | **WARN** | 12 stretches, about 2.0 min in total, all inside the three longest pictures: rings, bridge, balance scale |

**Narration:** unchanged. The only processing is gain plus a 60 Hz rumble filter, and the gentle limiter you approved. Nothing was cut, reordered or re-voiced.

**Brand:** `brand/design-system.json` v1.0.0, status APPROVED. It is locked with your exact colours and fonts, and the logo appears in the opening and closing.

**Watermark:** "Preview for approval". It stays until you approve this lesson; the clean master is then made with `--final`.

**Render:** 16 chapters. The final run took 16.4 min, because 15 chapters were reused from the run that hit the cloud's 2-hour limit. A full cold render in the cloud takes about 2 h 15 min. On your Mac it took about 25 s per minute of lesson.

## QA history for this lesson

| Version | Result | Failures |
|---|---|---|
| v003 | 1 fail | Text hold too short. Loudness warning: −26.1 LUFS, before the limiter was approved. |
| v004 | 1 fail | "Scenario" tab text too small |
| v005 | 2 fails | "Scenario" tab text too small; "Effort" held 1.18 s |
| v006 | **PASS** | 49 still stretches (9.6 min) |
| v007 | **PASS** | 12 still stretches (2.0 min) |

The stillness check only became reliable from v004, when the freeze-detection threshold was corrected. v003's "no stillness" result is therefore not comparable.
