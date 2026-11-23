# QA report — lifelink-course-L01

Video: `renders/lifelink-course-L01/landscape-sample/lifelink-course-L01_landscape-sample_v012.mp4`  
Result: **PASS** (16 pass, 0 fail, 1 warn)  
Generated: 2026-11-23T22:23:53.427Z

| Check | Result | Detail |
|---|---|---|
| manifest.order | PASS | Scenes are in narration order |
| manifest.coverage | PASS | Scenes cover the timeline without gaps |
| manifest.text-hold | PASS | Every text cue stays on screen ≥ 1.5s |
| file.decode | PASS | Full decode with no errors |
| video.resolution | PASS | 1920×1080 (expected 1920×1080) |
| video.codec | PASS | h264 High yuv420p |
| video.fps | PASS | 30.000 fps (expected 30) |
| duration | PASS | 60.000s (expected 60.000s) |
| audio.present | PASS | aac 48000 Hz 2ch |
| audio.duration | PASS | audio 60.000s vs expected 60.000s |
| audio.loudness | WARN | Integrated -21.8 LUFS, true peak -1.5 dBFS (target −16 LUFS, ≤ −1 dBTP) |
| audio.sync | PASS | Narration offset vs original recording: 0 ms (correlation 0.9983); tolerance ±33.3 ms |
| picture.black-frames | PASS | No unexpected black frames |
| picture.flashes | PASS | No frame-to-frame brightness jumps (max Δ 14.0 of 255) |
| picture.long-stillness | PASS | No unintended frozen picture (>8s) |
| layout.text | PASS | No clipped, undersized or overlapping text held on screen (1 momentary mid-animation contacts ignored) |
| subtitles.srt | PASS | 525 cues; timing monotonic and within duration: true |

Contact sheet: `quality-reports/lifelink-course-L01/lifelink-course-L01_landscape-sample_v012/contact-sheet.jpg`

Creative review: PENDING (recorded separately).