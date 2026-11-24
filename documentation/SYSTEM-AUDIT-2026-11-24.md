# LifeLink Video Studio: system audit (2026-11-24)

Scope: the repository at commit `1fc14c9` (branch `brand-proposal-v1`), workflow journals in this session, render and QA records.
The Module 01 v2 run (workflow `wf_6f160aba-443`) was in progress during the audit and was not touched.

**Ratings**
- **VERIFIED:** executed, with evidence.
- **PARTIAL:** works, but with gaps that matter.
- **PLANNED:** described, but no code.
- **BLOCKED:** needs something outside this container.

## Audit findings

**1. Executable specialist agents — PARTIAL**
- Evidence:
  - The 12 role briefs are in `.claude/agents/*.md`, but they are not registered as agent types in this session, which started before the repo existed.
  - Every agent ran as a general-purpose workflow agent with a role brief. The workflow journals under `~/.claude/projects/.../workflows/wf_*` record 113 executions, including:
    - Motion Designer ×7;
    - per-section build and review ×56;
    - Proofreader ×4;
    - Quality Director ×3;
    - Revision Director ×2;
    - Sound Director ×3;
    - Memory Director ×1.

**2. Roles that are only on paper — PARTIAL**
- Engagement, Sound, Memory and Brand roles ran 1–3 times, in the first 1-minute run only. None of them is part of the per-lesson pipeline.
- Sound design has never produced audio: narration-only is the policy until music is approved.

**3. Parallel execution — VERIFIED (bounded)**
- The Workflow tool runs at most 2 agents at once on this 4-CPU container (journals show 2 concurrent `started` events).
- Renders use 4 Chrome tabs (`concurrency: 4` in `.render.json`).
- One heavy render runs at a time, enforced by `withLock("lesson-…")` in `pipeline/render.ts:194`.

**4. Task assignment — PARTIAL**
- Assignment is hard-coded in each workflow script.
- The scripts live in `~/.claude/.../workflows/scripts/`, outside the repo, and are lost when the session ends.
- There is no task ledger with IDs, dependencies, owners or retry state, apart from `produce.ts`, which retries its own steps.

**5. Creative memory across sessions — PARTIAL / BLOCKED**
- Memory is version-controlled markdown in `production-memory/` (preferences, decisions, lesson notes, briefs) and `brand/design-system.json`.
- **There is no git remote** (`git remote -v` is empty). If the container is reclaimed, all of it is lost. Cross-session persistence is unproven until a GitHub repo is connected.
- `production-memory/course-decisions/` is empty.
- Rejected treatments and failure patterns are scattered through notes.

**6. Production states and checkpoints — PARTIAL**
- **The state machine works:**
  - `status.json` and `pipeline/lib/status.ts` record states, evidence and history.
  - Ingest is checkpointed with sha256.
  - The render chunk cache gives resumability: after a container restart mid-render, the render resumed from cached chunks, verified on 2026-11-23.
- **The recorded state is wrong:**
  - L01 still reads `AWAITING_APPROVAL`, although three full watermarked renders exist.
  - Full-lesson renders went through `render.ts` (the preview path), which does not move the state forward.
  - The client's approvals of the 40 s and 60 s previews were never recorded with `approve.ts`.

**7. Targeted scene revisions — VERIFIED (section-level)**
- Chunks are cached by fingerprint (section scenes ±1.5 s, engine code, design system, encoder settings) in `pipeline/render.ts:16,86`.
- Evidence: v003 re-rendered only sec-03, sec-11 and sec-12 out of 16 sections (`/tmp/claude-0/full-render3.log`), 1307 s against 5830 s for v002.
- **Gaps:**
  - There is no per-scene approval state.
  - An edit to a shared component invalidates every section, because the engine hash covers all of `src/`.

**8. Independent verification of renders and QA — VERIFIED (technical); PARTIAL (creative)**
- `pipeline/qa.ts` checks 16 things:
  - decode, resolution, codec, fps and duration;
  - audio presence, duration and loudness;
  - sync against the original by cross-correlation;
  - black frames, flashes and freezes;
  - QaGuard text layout in the render;
  - text-hold times and SRT validity.
- It has caught real failures: v001 failed 3 checks and v002 failed 1. Reports are in `quality-reports/…/report.md`.
- Creative review was done by agents looking at stills only, until today's `clip-review.py`.
- **There are no negative tests:** nobody has shown that QA catches deliberately planted errors. `selftest.ts` only tests a passing case.

**9. Dashboard data — PARTIAL**
- **Real data:**
  - Agents and their run times come from the workflow journal.
  - Tokens come from each agent's own log (`usage` fields, deduplicated per message).
- **Estimated:** time left. It is labelled as an estimate on the page, from v4 onwards.
- **Not autonomous:** the board updates only while this Claude session is alive. A watcher emits events, then Claude writes them to the board.
- **Hand-entered:** the "evidence", "findings" and "blockers" lists are typed in by Claude, not generated.

**10. Several full-length lessons — PARTIAL**
- **What works:** the pipeline is lesson-generic (ingest, transcribe, sections, render and QA all take `--course/--lesson`), and the section cache and locks scale.
- **Limits:**
  - One heavy job per container: a 36-minute lesson takes about 97 min to render cold.
  - 2 agents at once.
  - No batch queue.
  - Disk leaks: 147 bundles of 450 MB were leaked; fixed today.
  - No remote storage for media.
- A five-lesson batch would run lesson by lesson, which is about 8 h of rendering cold.

## Prioritised upgrade plan

Safe now means it doesn't touch files the active run uses: `src/**`, `courses/**`, `pipeline/{render,qa,sections,still,rhythm,cue-slice,board-snapshot}.*` and `brand/**`.

| # | Upgrade | Why it matters | Safe now? |
|---|---|---|---|
| 1 | **Connect a private GitHub repo** and push all branches | Without it, memory and history die with the container | User action needed (BLOCKED) |
| 2 | **Job ledger** (`production/jobs/*.jsonl`) and a `jobs` CLI: task ID, course/lesson, owner, deps, outputs, status, real times, failures, retries, checkpoint. Imports workflow journals as real execution records | Gives the dependency-aware orchestration, resumability and dashboard truth | Yes: new files only |
| 3 | **File-ownership claims** (`claims` CLI, O_EXCL per path, stale-PID reclaim) for agents editing shared files | Prevents agents overwriting each other | Yes: new files |
| 4 | **Structured creative memory**:<br>• locked brand vs proposal vs preferences;<br>• rejected treatments;<br>• failure patterns;<br>• techniques that worked;<br>• a verbatim feedback log | Memory the studio can retrieve and learn from, with an approval line for policy | Yes: new files plus additive notes |
| 5 | **QA negative tests**: plant black frames, silence, an overlap, a short text hold and a broken SRT, and assert qa.ts flags each | Proves QA actually catches errors | Yes: test-only fixtures |
| 6 | **Workflow scripts into the repo** (`workflows/`) | Orchestration survives sessions | Yes |
| 7 | **Operating playbook in CLAUDE.md** mapping plain requests ("start these five lessons", "check repetition"…) to commands | Simple-language control | Yes (docs) |
| 8 | **Scene table and impact** (`scenes.ts`): per scene its times, narration, type, approval, chunk/version and QA; plus `impact --scene` listing what must rebuild | Targeted revisions at scene level | After the run (reads manifest and render records; read-only, but it needs a stable schema) |
| 9 | **Cross-lesson diversity report**: type, reveal and sequence repetition against earlier lessons | Variety with a reason | After the run |
| 10 | **Status reconciliation**: record the real approvals (client's words) and fix L01's state; `render.ts` writes PREVIEW_RENDERED for full windows | The truth in status.json | After the run (touches the lesson) |
| 11 | **Retrospective generator** from the ledger and QA | Continuous improvement | After 2 |
| 12 | **Narrower engine hash**: per-component dependency hashing, so a component fix doesn't re-render every section | Faster revisions | After the run (render.ts) |

Not proposed: a database, a queue server or containers-per-agent. They add complexity without adding reliability here.
