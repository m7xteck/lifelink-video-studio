# Which checks were actually performed

Only checks that really ran are listed as done. Each one names the evidence.

## Done on v007, the delivered version

| Check | How | Evidence |
|---|---|---|
| 17 objective technical checks (format, sync, loudness, black frames, flashes, stillness, text layout, subtitles, text hold, scene coverage) | `pipeline/qa.ts` on the full 36-min master | `quality-reports/lifelink-course-L01/lifelink-course-L01_landscape_v007/report.md` |
| Scene structure and rhythm (no gaps, no same design twice in a row) | `pipeline/sections.ts check/merge`, `pipeline/rhythm.ts` | Run before the v006 and v007 renders: VALID, RHYTHM OK |
| Still-moment review on real footage | `clip-review.py` filmstrips of v006 at 16:45–17:55 and 18:50–19:22 | Led to the v007 push-in |
| Push-in removes frozen holds | 540p preview of 18:56–19:20 plus ffmpeg freeze detection: no freezes ≥ 8 s. Full-lesson count: 49 → 12 | Preview render, v007 QA report |
| "not ownership" lettering correct | Full-resolution stills at 19:10 and 19:40 | Spacing bug found and fixed |
| Independent creative review | A `quality-director` reviewer who did not build the video examined the contact sheet, frames and real stretches | `creative-review.md` in this folder |
| Before/after clips | Built from the real v003 and v007 files, then frames inspected | `deliverables/lifelink-course/L01-v007/before-after/` |

## Done on earlier versions and carried forward (not repeated on v007)

- **v004:**
  - 3 Quality Directors reviewed real clips across all 36 minutes;
  - an independent learner audit;
  - the findings are in `production-memory/lesson-notes/L01-v004-review-findings.md`.
  - The fixes went into v005. The v005, v006 and v007 changes were small and targeted, so the full multi-reviewer pass was not repeated.
- **Proofreading** of on-screen words against the narration: done during the v2 build and review rounds. Not repeated in full for v007, whose only text change is "not ownership", taken word for word from the narration.

## Not done

- **A full watch-through of v007 by a person.** That is your review. Automated checks and AI reviewers do not replace it.
- **Portrait (9:16) version.** Not rendered.
- **Sound effects or music.** None used. Very subtle SFX is still awaiting a sample for your approval.
- **Earlier by-ear queries:** around 3:00 ("matter" or "manner"?) and around 3:34. These are still open for you to listen to.
- **The clean, unwatermarked final master (`--final`).** It is made only after you approve the lesson.
