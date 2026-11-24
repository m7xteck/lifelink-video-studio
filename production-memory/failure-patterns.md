# Failure patterns (technical) and their fixes

Symptom → cause → fix → where it lives. Check this before debugging something that "looks familiar".
Sources: QA reports in `quality-reports/`, `documentation/*.md`, git history, pipeline comments, lesson notes.

## Render / disk / environment
| # | Symptom | Cause | Fix | Evidence |
|---|---|---|---|---|
| F1 | Disk filled during long renders | Every render/still/storyboard call left its Remotion bundle (~450 MB) in /tmp: 147 bundles leaked | `rmSync(serveUrl)` on exit in `render.ts:81`, `still.ts:26`, `storyboard.ts:47`. After a crash, check `df -h` and old `/tmp/remotion-*` bundles | SYSTEM-AUDIT-2026-11-24 §10; commit 1fc14c9 |
| F2 | QA `video.codec` FAIL "h264 High yuvj420p" | JPEG frame images produce full-range yuvj420p unless the pixel format is forced | Encoder sets `pixelFormat: "yuv420p"` (+ bt709) in `render.ts:87` | quality-reports/test-001/…_v001 |
| F3 | Provisional text font (Geneva 22 Soft) not rendered | Chromium's font sanitiser rejects the 1992 font's legacy tables | Rebuilt with fontTools (outlines/cmap/widths verified identical); original kept untouched; licence for rebuild to confirm | public/fonts/lifelink-provisional/README.md; decisions.md |
| F4 | Fonts missing in renders | Headless browser rejects the proxy certificate for font CDNs | Fonts are local files in `public/fonts/` | ENVIRONMENT_REPORT.md |
| F5 | Whisper model download fails | Hosts not allowed / XET transfer | Allowed huggingface.co + CDN hosts; pipeline sets `HF_HUB_DISABLE_XET=1` | decisions.md; CLAUDE.md |
| F6 | Renders ~5.4× real time | Paper texture SVG filters computed per frame | Paper textures pre-rendered to images (~2× faster) | brand-concepts-v1.md; commit c741c03 |
| F7 | Container restart mid-render | Session/container reclaimed | Chunk cache resumes; only missing sections re-render (verified 2026-11-23) | SYSTEM-AUDIT §6 |
| F8 | Interrupt test "passed" but proved nothing | The kill did not stop the process | Use a real SIGKILL test; verify no surviving processes, stale lock reclaimed | AUDIT-2026-11-23 |
| F9 | One small component fix re-renders every section | Engine hash covers all of `src/` | Known gap (upgrade #12: per-component hashing). Batch shared fixes together | SYSTEM-AUDIT §7 |
| F10 | Two heavy jobs at once crawl | CPU-bound on 4 cores | One heavy job per container (`withLock`), `nice` for light jobs | SYSTEM-AUDIT §3, §10 |

## Audio
| # | Symptom | Cause | Fix | Evidence |
|---|---|---|---|---|
| F11 | Narration dynamics squashed / pauses altered | `loudnorm` used as a filter (single-pass dynamic mode) normalises adaptively and changes the delivery | `loudnorm` is used ONLY to measure; the master applies one constant `volume` gain (+60 Hz high-pass), capped at −1.5 dBTP | `render.ts` masterNarration |
| F12 | QA `audio.loudness` WARN (−26.1 LUFS on L01) | Peaks cap the constant gain | A gentle limiter would fix it but alters dynamics → needs client approval (pending) | L01 v001–v003 reports |

## Picture / layout / timing
| # | Symptom | Cause | Fix | Evidence |
|---|---|---|---|---|
| F13 | QA `picture.flashes` FAIL at chapter changes (136.4 s, 243.4 s, … in L01 v001) | Quick paper fade-in after a dark (oxblood) ground scene | After a dark scene fade in ≥ 1.3 s with ease-in-out (`src/motion/time.tsx` afterDark); `GroundBackdrop` blends grounds | L01 v001 report; commit d3156db |
| F14 | QA `layout.text` FAIL: persistent text overlaps (e.g. "When to marry, ⟷ where to live," 58 frames) | Layout too tight for real line lengths | Fix the section layout; re-check stills | L01 v001 report |
| F15 | QaGuard false positives | (a) momentary contacts mid-animation; (b) measuring glyph boxes incl. invisible parts | Only contacts held ≥ 1 s (fps consecutive frames) fail, transient ones are listed; guard measures visible glyphs only | qa.ts §5; commit d93d8b2 |
| F16 | QA `manifest.text-hold` "cue outside scene" on revisited diagrams | Revisited stepsDiagram lists later, not-yet-spoken steps | qa.ts skips cues after scene end for stepsDiagram (never shown before their cue) | commit a7c555d |
| F17 | Text cue held < 1.5 s at a scene boundary (sec-03-16a "individual?" 1.4 s) | Boundary placed right after the last word | Move scene boundaries into pauses (≥ 0.7 s pauses in transcript.json) | L01 v001–v003 reports |
| F18 | Text-on-text during crossfade (s004→s005) | New scene's first line revealed while the old one fades | Move boundary into the pause (39.9 s) or hold the first line until the fade ends | lesson-notes L01 |
| F19 | Word wider than its column ("Understanding" 425 px in a 361 px column) | 4-column layout at h2 | 2×2 grid for 4 items (lesson-specific) | lesson-notes L01 |
| F20 | Emphasis words with punctuation ("guess.") never highlighted | Punctuation stripped on screen but not in the manifest | Emphasis matching normalised | AUDIT-2026-11-23 defect 1; commit d93d8b2 |
| F21 | Elements visibly off their geometry (stones off path, sun cropped) | Hand-estimated coordinates; independent layers | Compute positions from one geometry (centre-line); clip to the right layer | lesson-notes L01 |

## Process / state
| # | Symptom | Cause | Fix | Evidence |
|---|---|---|---|---|
| F22 | status.json says AWAITING_APPROVAL although full renders exist | Full renders run through `render.ts` (preview path), approvals never recorded with `approve.ts` | Record real approvals in the client's words; upgrade #10 | SYSTEM-AUDIT §6 |
| F23 | Orchestration lost at session end | Workflow scripts kept outside the repo | Move scripts into `workflows/`; job ledger (`pipeline/jobs.ts`, being built) | SYSTEM-AUDIT §4 |
| F24 | All memory could vanish with the container | No git remote | Connect a private GitHub repo (user action) | SYSTEM-AUDIT §5 |
| F25 | Transcript mis-hearings of names/terms ("Smillah", "Surah Arghum", "a manner of sacred trust") | Whisper on Arabic terms | Proofreader + client check before on-screen use | lesson-notes L01 |
| F26 | Client could not open a file sent by relative path | Working folder switched between /home/user and the project | Always give absolute paths | AUDIT-2026-11-23 |
| F27 | A QA check was never proven to catch errors | Only positive self-tests | `npm run test:qa-negative` (planted defects) | SYSTEM-AUDIT §8 |
| F28 | QA `picture.long-stillness` passes a 9 s frozen picture (OPEN, found 2026-11-24 by test:qa-negative) | (a) renders have an I-frame every 8.33 s (checked on L01 v003); the re-encoded still breaks `freezedetect=n=-70dB`, so freezes split into runs < 8 s; (b) a freeze lasting to the end of the file prints only `freeze_start`, and qa.ts's regex needs `freeze_duration` | Not fixed (qa.ts owner): e.g. looser noise threshold (−60 dB detected it in testing) and handling a trailing `freeze_start`. Until then, review long holds with clip-review.py | pipeline/tests/qa-negative.ts cases frozen-across-keyframe, frozen-to-end |
