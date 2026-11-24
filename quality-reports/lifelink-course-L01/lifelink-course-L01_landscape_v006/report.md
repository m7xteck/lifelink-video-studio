# QA report — lifelink-course-L01

Video: `renders/lifelink-course-L01/landscape/lifelink-course-L01_landscape_v006.mp4`  
Result: **PASS** (16 pass, 0 fail, 1 warn)  
Generated: 2026-11-24T21:00:39.383Z

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
| picture.flashes | PASS | No frame-to-frame brightness jumps (max Δ 15.0 of 255) |
| picture.long-stillness | WARN | Completely static for >8s at [{"start":165.67,"dur":11.1},{"start":298.2,"dur":8.26667},{"start":422.9,"dur":10},{"start":433.9,"dur":12.5},{"start":446.4,"dur":10.4667},{"start":457.5,"dur":8.23333},{"start":465.73,"dur":9.9},{"start":476.33,"dur":11.6667},{"start":493.43,"dur":12.8333},{"start":513.9,"dur":9.53333},{"start":537.2,"dur":8.93333},{"start":565.4,"dur":16.2},{"start":603.6,"dur":9.6},{"start":613.2,"dur":12.2333},{"start":698.43,"dur":14.3667},{"start":719.87,"dur":10.3333},{"start":770.57,"dur":14.6333},{"start":867.77,"dur":11.0333},{"start":878.8,"dur":8.36667},{"start":1009.03,"dur":18.0667},{"start":1028.03,"dur":22.1333},{"start":1051.1,"dur":21.1},{"start":1118.63,"dur":9.9},{"start":1134.5,"dur":24.3667},{"start":1172.9,"dur":11.8},{"start":1229.1,"dur":10.8},{"start":1270.5,"dur":9.86667},{"start":1280.77,"dur":11.1333},{"start":1292.27,"dur":9.06667},{"start":1348.63,"dur":16.5},{"start":1396.37,"dur":11.1},{"start":1431.37,"dur":8.36667},{"start":1443.13,"dur":14.0667},{"start":1479.27,"dur":8.9},{"start":1563.6,"dur":9.06667},{"start":1595.1,"dur":9.63333},{"start":1616.27,"dur":8.63333},{"start":1656.63,"dur":8.83333},{"start":1817.13,"dur":13.5333},{"start":1830.67,"dur":8.7},{"start":1839.37,"dur":9.93333},{"start":1849.3,"dur":13.4},{"start":1879.23,"dur":9.3},{"start":1983.5,"dur":11.9667},{"start":1995.97,"dur":12.4667},{"start":2008.43,"dur":10.9},{"start":2019.33,"dur":9.3},{"start":2035.87,"dur":12.5667},{"start":2048.8,"dur":12.4333}] — confirm intentional |
| layout.text | PASS | No clipped, undersized or overlapping text held on screen (3 momentary mid-animation contacts ignored) |
| subtitles.srt | PASS | 525 cues; timing monotonic and within duration: true |

Contact sheet: `quality-reports/lifelink-course-L01/lifelink-course-L01_landscape_v006/contact-sheet.jpg`

Creative review: PENDING (recorded separately).