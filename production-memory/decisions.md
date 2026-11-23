# Decision log

| Date | Decision | By | Evidence |
|---|---|---|---|
| 2026-11-23 | Studio brief received: Remotion + Claude Code on the web, no plugin, no desktop app; 1080p H.264 master; approval gates as specified | Client | Initial brief |
| 2026-11-23 | Neutral test design system v0.1.0-neutral created for engine testing only; watermark mandatory | Director (technical) | brand/design-system.json |
| 2026-11-23 | Narration mastering = gain-only (no compression/limiting) to preserve delivery; limiter needs approval | Director (technical, conservative default) | pipeline/render.ts |
| 2026-11-23 | Added huggingface.co, cas-bridge.xethub.hf.co, us.aws.cdn.hf.co to the environment's allowed hosts for Whisper model download | Client approved prompt | Environment settings |
| 2026-11-23 | Brand pack received (questionnaire PDF, artboard + references image, 2 fonts). Built brand PROPOSAL 1.0 on branch `brand-proposal-v1`; neutral system archived | Director | brand/proposals/interpretation-1.0.md |
| 2026-11-23 | "Geneva" font rebuilt with fontTools for Chromium compatibility (outlines/cmap/widths verified identical); original kept | Director (technical) | public/fonts/lifelink-provisional/README.md |
| 2026-11-23 | Watermark now mandatory in code while brand status ≠ APPROVED | Director (technical, closes audit gap) | src/brand/tokens.ts |
| 2026-11-23 | Five concepts presented for approval. NOT approved yet | Pending client | previews/concepts-v1/ |
| 2026-11-23 | Client on concepts v1: "i really like it its a bit buggy on some parts but other than that its really good, lets start on the first one. give me a small preview of a little bit first like 30 seconds and let me confirm it". Treated as approval to use the concepts v1 direction for a ~30 s PREVIEW of lesson 1. Brand NOT locked (licences, colours, logo outstanding); specific "buggy" parts not yet identified | Client | This conversation |
