# QA report — concepts-v1

Video: `renders/concepts-v1/landscape/concepts-v1_landscape_v004.mp4`  
Result: **FAIL** (11 pass, 1 fail, 0 warn)  
Generated: 2026-11-23T14:56:31.588Z

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
| layout.text | FAIL | text-overlap: Introductions, not conversations ⟷ Compatibility before attraction @46.53s (39 consecutive frames); text-overlap: Compatibility before attraction ⟷ Technology combined with human matchmaking @46.53s (92 consecutive frames); text-overlap: Technology combined with human matchmaking ⟷ A premium, trustworthy experience @46.53s (151 consecutive frames) |
| subtitles.srt | INFO | No SRT for this lesson |

Contact sheet: `quality-reports/concepts-v1/concepts-v1_landscape_v004/contact-sheet.jpg`

Creative review: PENDING (recorded separately).