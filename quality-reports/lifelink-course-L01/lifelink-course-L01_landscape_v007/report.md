# QA report — lifelink-course-L01

Video: `renders/lifelink-course-L01/landscape/lifelink-course-L01_landscape_v007.mp4`  
Result: **PASS** (16 pass, 0 fail, 1 warn)  
Generated: 2026-11-25T01:40:58.731Z

| Check | Result | Detail |
|---|---|---|
| manifest.order | PASS | Scenes are in narration order |
| manifest.coverage | PASS | Scenes cover the timeline without gaps |
| manifest.text-hold | PASS | Every text cue stays on screen ≥ 1.5s |
| file.decode | PASS | Full decode with no errors |
| video.resolution | PASS | 1920×1080 (expected 1920×1080) |
| video.codec | PASS | h264 High yuv420p |
| video.fps | PASS | 30.000 fps (expected 30) |
| duration | PASS | 2168.267s (expected 2168.267s) |
| audio.present | PASS | aac 48000 Hz 2ch |
| audio.duration | PASS | audio 2168.267s vs expected 2168.267s |
| audio.loudness | PASS | Integrated -16.5 LUFS, true peak -1.5 dBFS (target −16 LUFS, ≤ −1 dBTP) |
| audio.sync | PASS | Narration offset vs original recording: 5 ms (correlation 0.9756); tolerance ±33.3 ms |
| picture.black-frames | PASS | No unexpected black frames |
| picture.flashes | PASS | No frame-to-frame brightness jumps (max Δ 14.9 of 255) |
| picture.long-stillness | WARN | Completely static for >8s at [{"start":422.9,"dur":9.93333},{"start":448.33,"dur":8.13333},{"start":458.1,"dur":10.4},{"start":565.6,"dur":11.0667},{"start":773.87,"dur":8.1},{"start":999.37,"dur":8.7},{"start":1009.17,"dur":14.2667},{"start":1028.3,"dur":12.8},{"start":1041.1,"dur":9.03333},{"start":1051.33,"dur":9.6},{"start":1146.13,"dur":8.13333},{"start":1271.53,"dur":8.8}] — confirm intentional |
| layout.text | PASS | No clipped, undersized or overlapping text held on screen (3 momentary mid-animation contacts ignored) |
| subtitles.srt | PASS | 525 cues; timing monotonic and within duration: true |

Contact sheet: `quality-reports/lifelink-course-L01/lifelink-course-L01_landscape_v007/contact-sheet.jpg`

Creative review: PENDING (recorded separately).