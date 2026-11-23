# LifeLink Video Studio

The production engine that turns LifeLink course narration into finished,
motion-designed lesson videos (1080p MP4 + subtitles + transcript + QA report).

Built on **Remotion** (React-based video framework) — no plugins, no desktop app.
Runs in Claude Code on the web.

**Client:** talk to Claude in plain language ("Here are five recordings, prepare them").
**Developers:** see `CLAUDE.md` for the full pipeline and `documentation/` for architecture.

```
npm install                       # once
pip install -r requirements.txt   # once (transcription)
npm run studio                    # live visual editor/preview in the browser
npm run status                    # where every lesson is
```

Folder map:
- `src/` — the visual engine (brand tokens → motion primitives → scene components → lesson composition)
- `brand/` — design system (single source of truth) and brand intake
- `courses/<course>/<lesson>/` — lesson data: status, transcript, manifest, creative plan
- `pipeline/` — ingest, transcribe, storyboard, render, QA, package, orchestrate
- `motion-library/` — component registry with usage history
- `production-memory/` — approved rules, preferences, decisions, lesson notes
- `workflows/` — approval, revision, QA review, brand onboarding procedures
- `.claude/agents/` — specialist Claude subagents (creative, quality, brand)
- `documentation/` — environment report, architecture, storage
