# The 12 production responsibilities — and how each is really implemented

Honest mapping. "Subagent" = a genuine Claude Code subagent definition in `.claude/agents/`
that runs as a separate model instance with its own context. "Module" = deterministic software.
"Director" = the main Claude session you talk to.

| # | Role | Implementation | Where |
|---|---|---|---|
| 1 | Executive Production Director | Director (main session) | `CLAUDE.md` |
| 2 | Brand & Values Director | Subagent + design-system tokens enforced in code | `.claude/agents/brand-guardian.md`, `brand/`, `src/brand/tokens.ts` |
| 3 | Audio Intelligence Director | Modules | `pipeline/ingest.ts`, `pipeline/transcribe.py` (word timings, pauses, low-confidence flags) |
| 4 | Course Narrative Director | Part of creative-director subagent + course memory | `production-memory/course-decisions/` |
| 5 | Creative & Storyboard Director | Subagent + storyboard module | `.claude/agents/creative-director.md`, `pipeline/storyboard.ts` |
| 6 | Motion Design Director | Director edits engine code; library registry | `src/components/`, `src/motion/`, `motion-library/registry.json` |
| 7 | Engagement Director | Rules inside creative-director; reviewed by quality-director | — |
| 8 | Audio & Sound Director | Module (gain-only mastering; music/SFX disabled until approved) | `pipeline/render.ts → masterNarration` |
| 9 | Production Orchestrator | Module (queue, semaphores, locks, retries, checkpoints) | `pipeline/produce.ts`, `pipeline/lib/lock.ts`, `pipeline/lib/status.ts` |
| 10 | Independent Quality Director | Module (objective) + Subagent (creative, independent context) | `pipeline/qa.ts`, `src/motion/QaGuard.tsx`, `.claude/agents/quality-director.md` |
| 11 | Revision Director | Director + section cache + versioned outputs | `pipeline/render.ts` (cache), `workflows/revisions.md` |
| 12 | Asset & Production Memory Director | Files in Git | `production-memory/`, `motion-library/`, `status.json` histories |

Parallelism: subagents can work on different lessons' plans concurrently. Heavy renders in one
container run one at a time (each already uses all 4 CPU cores). True parallel rendering
would use separate cloud sessions/containers working from the shared Git repository
(not yet set up — needs the GitHub repository; see documentation/ENVIRONMENT_REPORT.md).
