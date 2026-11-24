# QA report — lifelink-course-L01

Video: `renders/lifelink-course-L01/landscape/lifelink-course-L01_landscape_v001.mp4`  
Result: **FAIL** (13 pass, 3 fail, 1 warn)  
Generated: 2026-11-24T01:35:18.322Z

| Check | Result | Detail |
|---|---|---|
| manifest.order | PASS | Scenes are in narration order |
| manifest.coverage | PASS | Scenes cover the timeline without gaps |
| manifest.text-hold | FAIL | sec-03-16a: cue at 185.92s is on screen < 1.5s; sec-03-22a: cue at 235.46s is on screen < 1.5s; sec-09-08: cue 1007.88s outside scene 993–999.8; sec-09-08: cue 1026.92s outside scene 993–999.8; sec-09-08: cue 1049.98s outside scene 993–999.8; sec-09-10: cue 1026.92s outside scene 1006.4–1010.4; sec-09-10: cue 1049.98s outside scene 1006.4–1010.4; sec-09-13: cue 1049.98s outside scene 1025.9–1029.9; sec-13-14: cue 1624.58s outside scene 1624.7–1630.2 |
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
| picture.flashes | FAIL | Sudden brightness jumps at 136.37s, 136.4s, 243.37s, 243.4s, 406.47s, 406.5s, 655.67s, 655.7s, 1316.93s, 1316.97s, 1514.37s, 1514.4s, 1668.37s, 1668.4s, 1932.07s, 1932.1s, 2048.47s, 2048.5s |
| picture.long-stillness | PASS | No unintended frozen picture (>8s) |
| layout.text | FAIL | text-overlap: Partnership ⟷ and sacred trust @176.83s (79 consecutive frames); text-overlap: When one spouse is tired, unwell, worried or struggling ⟷ compassion and understanding @356.73s (55 consecutive frames); text-overlap: When to marry, ⟷ where to live, @701.13s (58 consecutive frames); text-overlap: where to live, ⟷ how to organise responsibilities. @701.13s (137 consecutive frames); text-overlap: Cultural expectations ⟷ presented as @830.53s (79 consecutive frames); text-overlap: of the quality of a marriage ⟷ A couple may begin with a very simple celebration and build  @860.00s (210 consecutive frames); text-overlap: Social status ⟷ and family reputation @867.33s (99 consecutive frames); text-overlap: Cultural traditions should not justify ⟷ injustice, @913.13s (72 consecutive frames); text-overlap: A healthy understanding of Amanah ⟷ Both spouses have @1122.30s (123 consecutive frames); text-overlap: Isolating a spouse from family and friends ⟷ is not a healthy expression of care. @1153.13s (41 consecutive frames); text-overlap: Both spouses understand their commitments ⟷ and take accountability for their actions. @1292.03s (108 consecutive frames); text-overlap: Not always expensive gifts or elaborate gestures ⟷ Small, consistent acts of kindness @1419.43s (50 consecutive frames); text-overlap: Finding the right ⟷ life partner @2121.13s (79 consecutive frames) |
| subtitles.srt | PASS | 525 cues; timing monotonic and within duration: true |

Contact sheet: `quality-reports/lifelink-course-L01/lifelink-course-L01_landscape_v001/contact-sheet.jpg`

Creative review: PENDING (recorded separately).