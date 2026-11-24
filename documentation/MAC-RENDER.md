# Rendering on the Mac (M4 Pro)

## One-time file setup (by hand)
These files are kept out of Git on purpose. Copy them into `~/lifelink-video-studio`:
- The narration recording → `media/originals/lifelink-course-L01.m4a` (renamed from `audio_ll_1.m4a`).
- The fonts → `public/fonts/lifelink-provisional/`:
  - `AustralianMirages-Bold.ttf` (rename from `australian-mirages.bold.ttf`)
  - `Geneva-22Soft.ttf` (rename from `GENEVA.TTF`)
  - `Geneva-22Soft.rebuilt.ttf` (the file the studio sent in chat)

## Instructions to paste into a Claude Code session on `~/lifelink-video-studio`
> You are the LifeLink Production Orchestrator on the client's Mac. In this repo (branch brand-proposal-v1):
> 1. `git pull`, then `npm ci`.
> 2. Check that these files exist: `media/originals/lifelink-course-L01.m4a`, plus `public/fonts/lifelink-provisional/AustralianMirages-Bold.ttf` and `Geneva-22Soft.rebuilt.ttf`. Never upload them anywhere.
> 3. Make the working audio exactly as ingest does: `mkdir -p public/audio && ffmpeg -v error -i media/originals/lifelink-course-L01.m4a -vn -ar 48000 -c:a pcm_s16le public/audio/lifelink-course-L01.wav`
> 4. Benchmark: `npx tsx pipeline/render.ts --course lifelink-course --lesson lifelink-course-L01 --from 600 --to 660 --label "mac benchmark"`. Report the wall-clock seconds it prints. The first run downloads Remotion's Chrome (about 100 MB).
> 5. Only when the studio says the revisions are finished: `git pull`, then run the full render `npx tsx pipeline/render.ts --course lifelink-course --lesson lifelink-course-L01 --label "L01 v005"`. Then run `npx tsx pipeline/qa.ts --course lifelink-course --lesson lifelink-course-L01 --video <the mp4 path it printed>`.
> 6. Report the render time, the QA summary line and every FAIL/WARN line. Do not change any code or lesson files.
