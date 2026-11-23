# Quality review
1. `pipeline/qa.ts` (automatic in `produce`) — objective checks: decode, resolution, codec/colour, fps, duration, audio presence/duration/loudness, narration sync vs original (cross-correlation), black frames, flashes, long freezes, in-render layout guard (text outside frame / below min size / overlapping, persisting ≥ 1 s), manifest ordering/coverage/hold times, SRT validity, plus frames at every scene entry/settle and 8 random samples across the runtime → contact sheet.
2. quality-director subagent — independent creative review → `creative-review.md`.
3. Self-correction: fix smallest scope → re-render (cache) → re-QA. Max 3 correction rounds per issue, then escalate to client with a plain explanation.
