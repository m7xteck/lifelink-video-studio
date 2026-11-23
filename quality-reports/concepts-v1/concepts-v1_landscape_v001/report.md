# QA report — concepts-v1

Video: `renders/concepts-v1/landscape/concepts-v1_landscape_v001.mp4`  
Result: **FAIL** (10 pass, 2 fail, 0 warn)  
Generated: 2026-11-23T14:32:41.289Z

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
| picture.flashes | FAIL | Sudden brightness jumps at 0.33s, 11.03s, 35.33s, 35.37s, 35.4s, 46.03s, 46.07s, 46.1s |
| picture.long-stillness | PASS | No unintended frozen picture (>8s) |
| layout.text | FAIL | outside-frame: Course @0.40s (30 consecutive frames); outside-frame: Preparing for Marriage @0.40s (37 consecutive frames); text-overlap: Course ⟷ Preparing for Marriage @0.40s (320 consecutive frames); text-overlap: Compatibility ⟷ conversation. @11.40s (236 consecutive frames); text-overlap: Introductions, not conversations ⟷ Compatibility before attraction @46.40s (47 consecutive frames); text-overlap: Compatibility before attraction ⟷ Technology combined with human matchmaking @46.40s (88 consecutive frames); text-overlap: Technology combined with human matchmaking ⟷ A premium, trustworthy experience @46.40s (134 consecutive frames) |
| subtitles.srt | INFO | No SRT for this lesson |

Contact sheet: `quality-reports/concepts-v1/concepts-v1_landscape_v001/contact-sheet.jpg`

Creative review: PENDING (recorded separately).