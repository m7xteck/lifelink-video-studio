# QA report — lifelink-course-L01

Video: `renders/lifelink-course-L01/landscape/lifelink-course-L01_landscape_v002.mp4`  
Result: **FAIL** (15 pass, 1 fail, 1 warn)  
Generated: 2026-11-24T03:48:20.800Z

| Check | Result | Detail |
|---|---|---|
| manifest.order | PASS | Scenes are in narration order |
| manifest.coverage | PASS | Scenes cover the timeline without gaps |
| manifest.text-hold | FAIL | sec-03-16a: cue at 185.92s is on screen < 1.5s; sec-09-08: cue 1007.88s outside scene 993–999.8; sec-09-08: cue 1026.92s outside scene 993–999.8; sec-09-08: cue 1049.98s outside scene 993–999.8; sec-09-10: cue 1026.92s outside scene 1006.4–1010.4; sec-09-10: cue 1049.98s outside scene 1006.4–1010.4; sec-09-13: cue 1049.98s outside scene 1025.9–1029.9; sec-12-01: cue at 1382.18s is on screen < 1.5s |
| file.decode | PASS | Full decode with no errors |
| video.resolution | PASS | 1920×1080 (expected 1920×1080) |
| video.codec | PASS | h264 High yuv420p |
| video.fps | PASS | 30.000 fps (expected 30) |
| duration | PASS | 2165.267s (expected 2165.267s) |
| audio.present | PASS | aac 48000 Hz 2ch |
| audio.duration | PASS | audio 2165.267s vs expected 2165.267s |
| audio.loudness | WARN | Integrated -26.1 LUFS, true peak -1.5 dBFS (target −16 LUFS, ≤ −1 dBTP) |
| audio.sync | PASS | Narration offset vs original recording: 0 ms (correlation 0.9983); tolerance ±33.3 ms |
| picture.black-frames | PASS | No unexpected black frames |
| picture.flashes | PASS | No frame-to-frame brightness jumps (max Δ 16.8 of 255) |
| picture.long-stillness | PASS | No unintended frozen picture (>8s) |
| layout.text | PASS | No clipped, undersized or overlapping text held on screen (4 momentary mid-animation contacts ignored) |
| subtitles.srt | PASS | 525 cues; timing monotonic and within duration: true |

Contact sheet: `quality-reports/lifelink-course-L01/lifelink-course-L01_landscape_v002/contact-sheet.jpg`

Creative review: PENDING (recorded separately).