# Workflows

Two kinds of file live here:

- **Playbooks** (`*.md`): written procedures for people and agents (approvals, brand onboarding, creative planning, quality review, revisions).
- **Workflow scripts** (`*.js`): the multi-agent orchestration scripts that were run with the Workflow tool. They are copied here unchanged from the session's `workflows/scripts/` folder, so the orchestration is kept with the repo instead of being lost when the session ends. The `wf_…` suffix is the run id. That run's journal can be imported into the job ledger (see below).

| Script | What it did | Run (UTC, from the agent transcripts) | Agents |
|---|---|---|---|
| `lifelink-production-wf_81c31019-4c0.js` | Extended the Module 01 preview to 0:00–1:00. Phases: research (audio + course narrative), plan, plan review (brand/values, engagement, proofreading), build, render & QA, independent review, then up to 2 revision rounds. | 2026-11-23 22:03 → 22:34 | 22 |
| `lifelink-lesson-build-wf_3a47f536-5b5.js` | Built Module 01 from 1:00 to the end. Graphify librarian and section outline first, then for each section: plan → review → build, with sections running in parallel pipelines. | 2026-11-23 22:50 → 23:48 | 44 |
| `lifelink-final-review-wf_7f6fd11d-78e.js` | Final review before the single re-render of Module 01: one reviewer-fixer per section (stills + proofreading against the narration). It edited only its own `sections/sec-NN.json`. | 2026-11-24 01:38 → 01:59 | 14 |
| `l01-variety-v2-wf_6f160aba-443.js` | Module 01 v2: built the chapter signature animations and text styles, re-planned chapters for variety, then reviewed and fixed. | started 2026-11-24 07:47; **still running when this copy was made** (9 of 11 agents finished at 08:15) | 11+ |

## Re-running a script

Call the Workflow tool with `scriptPath` pointing at the file in this folder, for example:

```
Workflow({ scriptPath: "/home/user/lifelink-video-studio/workflows/lifelink-final-review-wf_7f6fd11d-78e.js", args: [...] })
```

- `lifelink-final-review` reads `args` as the list of sections: `[{ id: "sec-03", startSec: 61.2, endSec: 118.4 }, …]`. Take the values from `courses/<course>/<lesson>/sections/*.json`.
- The other scripts take no `args`. Course, lesson, time windows and the repo path (`/home/user/lifelink-video-studio`) are written into the script. Copy the script and edit those constants before using it for another lesson.
- These scripts start agents that edit files and render. Check the current lesson state first (`npm run status`), and don't run one while another heavy job is running.

## Keeping a record (job ledger and claims)

After a run, or while it is still going, import its journal so the ledger holds real execution times:

```
npx tsx pipeline/jobs.ts import-workflow <session>/subagents/workflows/wf_<id> --course <course> --lesson <lesson>
npx tsx pipeline/jobs.ts list --course <course> --lesson <lesson>
```

Re-importing is safe. Existing tasks are not duplicated, and tasks that have finished since the last import get their done event. Agents that edit shared files (components, `brand/design-system.json`) should claim them first: `npx tsx pipeline/claims.ts claim <path> --owner <task-id>`, then `release` when they are done.
