# QA report — concepts-v1

Video: `renders/concepts-v1/landscape/concepts-v1_landscape_v005.mp4`  
Result: **PASS** (12 pass, 0 fail, 0 warn)  
Generated: 2026-11-23T15:03:06.567Z

| Check | Result | Detail |
|---|---|---|
| manifest.order | PASS | Scenes are in narration order |
| manifest.coverage | PASS | Scenes cover the timeline without gaps |
| manifest.text-hold | PASS | Every text cue stays on screen ≥ 1.5s |
| file.decode | PASS | Full decode with no errors |
| video.resolution | PASS | 1920×1080 (expected 1920×1080) |
| video.codec | PASS | h264 High yuv420p |
| video.fps | PASS | 30.000 fps (expected 30) |
| duration | PASS | 57.000s (expected 57.000s) |
| picture.black-frames | PASS | No unexpected black frames |
| picture.flashes | PASS | No frame-to-frame brightness jumps (max Δ 18.6 of 255) |
| picture.long-stillness | PASS | No unintended frozen picture (>8s) |
| layout.text | PASS | No clipped, undersized or overlapping text held on screen (2 momentary mid-animation contacts ignored) |
| subtitles.srt | INFO | No SRT for this lesson |

Contact sheet: `quality-reports/concepts-v1/concepts-v1_landscape_v005/contact-sheet.jpg`

Creative review: PENDING (recorded separately).