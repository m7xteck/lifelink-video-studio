# QA report — pipeline-test-L02

Video: `renders/pipeline-test-L02/landscape/pipeline-test-L02_landscape_v001.mp4`  
Result: **PASS** (17 pass, 0 fail, 0 warn)  
Generated: 2026-11-23T13:24:44.967Z

| Check | Result | Detail |
|---|---|---|
| manifest.order | PASS | Scenes are in narration order |
| manifest.coverage | PASS | Scenes cover the timeline without gaps |
| manifest.text-hold | PASS | Every text cue stays on screen ≥ 1.5s |
| file.decode | PASS | Full decode with no errors |
| video.resolution | PASS | 1920×1080 (expected 1920×1080) |
| video.codec | PASS | h264 High yuv420p |
| video.fps | PASS | 30.000 fps (expected 30) |
| duration | PASS | 5.633s (expected 5.633s) |
| audio.present | PASS | aac 48000 Hz 2ch |
| audio.duration | PASS | audio 5.633s vs expected 5.633s |
| audio.loudness | PASS | Integrated -17.2 LUFS, true peak -4.3 dBFS (target −16 LUFS, ≤ −1 dBTP) |
| audio.sync | PASS | Narration offset vs original recording: 0 ms (correlation 0.9497); tolerance ±33.3 ms |
| picture.black-frames | PASS | No unexpected black frames |
| picture.flashes | PASS | No frame-to-frame brightness jumps (max Δ 0.1 of 255) |
| picture.long-stillness | PASS | No unintended frozen picture (>8s) |
| layout.text | PASS | No clipped, undersized or overlapping text held on screen |
| subtitles.srt | PASS | 2 cues; timing monotonic and within duration: true |

Contact sheet: `quality-reports/pipeline-test-L02/pipeline-test-L02_landscape_v001/contact-sheet.jpg`

Creative review: PENDING (recorded separately).