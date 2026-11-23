# Architecture

```
recordings ─► ingest ─► transcribe ─► creative plan (manifest.json) ─► storyboard ─► [CLIENT APPROVAL]
                │            │                 ▲ creative-director subagent              │
                ▼            ▼                 │                                          ▼
       originals (RO)   word timings ──────────┘                       render: per-section chunks (cached)
                                                                        └► join ─► + mastered ORIGINAL narration
                                                                                        │
                                       deliverables ◄─ package ◄─ QA (objective + quality-director) ◄┘
```

Engine layers (src/), each depending only on the ones above it:
1. `brand/design-system.json` → `src/brand/tokens.ts`: colours, type, motion curves, layout (single source of truth)
2. `src/motion/`: animation primitives (timing synced to narration seconds, reveals, drift, atmosphere, layout guard)
3. `src/components/`: scene components (the motion library)
4. `src/schema/manifest.ts`: lesson data contract (zod-validated)
5. `src/compositions/Lesson.tsx`: sequences scenes from a manifest; landscape and portrait from the same data
6. `remotion.config.ts` + `pipeline/render.ts`: render configuration
7. `pipeline/qa.ts` + `src/motion/QaGuard.tsx`: quality configuration

State machine and evidence: `pipeline/lib/status.ts` (IMPORTED → … → DELIVERED; approval gate enforced in code).
