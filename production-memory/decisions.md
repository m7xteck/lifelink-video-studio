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
| 2026-11-23 | Client: "needs to be more graphical or pictorial and have elements". Direction extended with paper-cut illustrations + objects (PROPOSED). Possibly a reusable preference ("prefer pictorial scenes over type-only") — confirm with client before making it global | Client | lesson-notes/lifelink-course-L01.md |
| 2026-11-24 | Production memory restructured: brand/LOCKED.md (moved from brand-rules.md) + brand/PROPOSAL.md, rejected.md, failure-patterns.md, techniques.md, feedback-log.jsonl, course-decisions/lifelink-course.md; `pipeline/memory.ts` brief/feedback/search. No creative rule changed | Director (technical) | SYSTEM-AUDIT-2026-11-24 upgrade #4 |
| 2026-11-24 | Merge system-upgrade-v1 into production before the v004 render (rollback tag `pre-upgrade-merge`) | Client chose "Yes, merge now (Recommended)" when asked | ledger, claims, memory, render cache, preview tier, QA freeze fix |
| 2026-11-24 | Board: approved brand:watermark. Note (verbatim): "" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/05578f21-28c4-4c86-9e58-03f6e7678fa4 |
| 2026-11-24 | Board: requested changes on brand:music-sfx. Note (verbatim): "very subtle sfx" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/08f4ffc3-7280-4f0d-a536-2a92a29567d9 |
| 2026-11-24 | Board: approved brand:colours. Note (verbatim): "ask in chat i will give" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/0eafab56-0859-42a0-bafb-72bb6735cc1c |
| 2026-11-24 | Board: approved brand:logo. Note (verbatim): "ask for it in chat i will send it" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/16b9e7d3-db64-4f0a-927c-2439b4732ca8 |
| 2026-11-24 | Board: approved feedback:2026-11-24. Note (verbatim): "yes but not 100% of the time" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/2032865f-20fb-4552-8297-e795d226b1db |
| 2026-11-24 | Board: approved brand:text-font-lifelink-text-geneva-22-soft-rebuilt. Note (verbatim): "it is licensed" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/21dbc347-6c5b-4826-bffc-ab617e95f8f4 |
| 2026-11-24 | Board: requested changes on lesson:L01:creative. Note (verbatim): "i gave feedback" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/29cd626a-33bd-44a7-8666-2c9e2f9a97ef |
| 2026-11-24 | Board: rejected brand:imagery-of-people. Note (verbatim): "no people imagery" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/3d57293c-fae9-40b4-92db-b32753e20641 |
| 2026-11-24 | Board: approved feedback:2026-11-24. Note (verbatim): "needs a good balance" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/42906a79-a6cd-444c-b725-9e75c8efc3cd |
| 2026-11-24 | Board: approved brand:crescent-heart-icons-seen-on-the-artboard. Note (verbatim): "that is the logo icon, if you want better quality i can send it" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/45c5441f-6c05-45bc-87ef-fdacbe2b1e35 |
| 2026-11-24 | Board: approved brand:display-font-lifelink-script-australian-mirages-bold. Note (verbatim): "it is licensed" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/7b51dfc0-a97c-4edb-aaf3-b01c8ae6ce9a |
| 2026-11-24 | Board: approved brand:watermark. Note (verbatim): "" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/8a4c48da-f1c1-4200-ac9d-aff78cf0e512 |
| 2026-11-24 | Board: requested changes on feedback:2026-11-23. Note (verbatim): "i cant see the previews where is it" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/cd422328-d650-48ff-83f7-c686628631c9 |
| 2026-11-24 | Board: approved brand:narration-limiter-noise-reduction. Note (verbatim): "" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/e15f88e2-05af-40c8-ac03-40ac1850a7dc |
| 2026-11-24 | Board: approved brand:derived-tints-papershade-hillfar-hillmid-skytint. Note (verbatim): "" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/f095ae4b-b0a5-43db-b20d-100837bab2f3 |
| 2026-11-24 | Board: requested changes on lifelink-course-L01. Note (verbatim): "i gave feedback" | u_AakDwdb2YRIZP5wkj9VBOQ (board) | board approvals/fd74bb16-443e-4bc2-88fc-839a0c4290b5 |
| 2026-11-24 | Exact brand colours supplied: paper #F2F0E7, oxblood #500000, royal #3960BD, sky #9AB9D5, black #060405, rose #AF3E46; logo artwork supplied (horizontal, stacked, royal wordmark PNG) | Client sent the colour sheet and logo files in chat, as promised on the board ("ask in chat i will give") | design-system.json 1.0.0-proposal.3; brand/logo/ |
| 2026-11-24 | BRAND LOCKED: design-system 1.0.0 status APPROVED; review renders say "Preview for approval"; clean master only via render.ts --final after the client approves the lesson | Client chose "Lock it (Recommended)" | brand/design-system.json, src/brand/tokens.ts, pipeline/render.ts |
| 2026-11-24 | Use the real logo (icon + wordmark) in the opening (embossed) and on the closing card | Client chose "Yes, opening and closing (Recommended)" | to implement after the polish pass |
