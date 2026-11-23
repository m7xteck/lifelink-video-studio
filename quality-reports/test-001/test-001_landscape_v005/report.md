# QA report — test-001

Video: `renders/test-001/landscape/test-001_landscape_v005.mp4`  
Result: **PASS** (16 pass, 0 fail, 0 warn)  
Generated: 2026-11-23T13:19:56.220Z

| Check | Result | Detail |
|---|---|---|
| manifest.order | PASS | Scenes are in narration order |
| manifest.coverage | PASS | Scenes cover the timeline without gaps |
| manifest.text-hold | PASS | Every text cue stays on screen ≥ 1.5s |
| file.decode | PASS | Full decode with no errors |
| video.resolution | PASS | 1920×1080 (expected 1920×1080) |
| video.codec | PASS | h264 High yuv420p |
| video.fps | PASS | 30.000 fps (expected 30) |
| duration | PASS | 40.000s (expected 40.000s) |
| audio.present | PASS | aac 48000 Hz 2ch |
| audio.duration | PASS | audio 40.000s vs expected 40.000s |
| audio.loudness | PASS | Integrated -16 LUFS, true peak -4.8 dBFS (target −16 LUFS, ≤ −1 dBTP) |
| audio.sync | PASS | Narration offset vs original recording: 0 ms (correlation 0.9634); tolerance ±33.3 ms |
| picture.black-frames | PASS | No unexpected black frames |
| picture.flashes | PASS | No frame-to-frame brightness jumps (max Δ 1.1 of 255) |
| picture.long-stillness | PASS | No unintended frozen picture (>8s) |
| layout.text | PASS | No clipped, undersized or overlapping text held on screen (1 momentary mid-animation contacts ignored) |
| subtitles.srt | INFO | No SRT for this lesson |

Contact sheet: `quality-reports/test-001/test-001_landscape_v005/contact-sheet.jpg`

Creative review: PENDING (recorded separately).