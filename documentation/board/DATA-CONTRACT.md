# Studio board v5: data contract

The board is a claude.ai Artifact page using the `db`, `assets` and `user` capabilities. It **cannot run jobs**.

Data moves both ways:
- **Studio → board.** `pipeline/board-sync.ts` builds documents from verified project files. Claude writes them with ArtifactData (batch, `file_path`).
- **Board → studio.** The page writes comments, approvals and requests into db collections. Claude reads them with ArtifactData `list --out_dir`, then runs `pipeline/board-inbox.ts <dir>`. That converts them into ledger tasks and approval records, and writes back their new status.

The board always shows `meta.lastSync` (the time of the last verified sync) and never implies live monitoring.

## Documents written by the studio (read-only for the page)

Every value must come from a real source. Each object carries `source` (repo path or "workflow-journal").

| db path | contents | sources |
|---|---|---|
| `studio/meta` | `{ lastSync, syncedBy: "studio session", schema: 1 }` | sync time |
| `studio/overview` | `{ courses: [{id, title, lessonIds}], activeLessonId, attention: [Item], nextActions: [Item], recent: [{at, text, kind, source}], queueCounts: {queued, running, blocked, failed, done} }` | ledger, status.json, render records, QA reports, approvals |
| `lessons/<lessonId>` | `{ id, courseId, title, durationSec, state (status.json), stage: {current, steps: [{id, label, state: done/running/queued/blocked}]}, now: {text, measured: true}, eta?: {at, basis}, thumbnail?: {assetUrl}, chapters: [{id, title, startSec, endSec}], scenes: [{id, chapterId, startSec, endSec, type, narration (≤140 chars), approval: none/approved/changes}], renders: [{version, label, createdAt, wallClockMin, reusedSections, totalSections, output, qa: {result, pass, fail, warn, report}}], qaIssues: [{version, check, status, detail, atSec?}], deliverables: [{kind, path, exists, bytes?}], revisions: [{at, text, source}] }` | manifest/sections, transcript, status.json, `.render.json`, QA `report.json`, deliverables folder |
| `jobs/<lessonId>` | `{ tasks: [{id, kind, owner, status, startedAt, finishedAt, attempts, maxRetries, lastError, deps, outputs, note, source}] }` | `production/jobs/<course>/<lesson>.jsonl`, plus imported workflow journals |
| `efficiency/summary` | `{ measured: {fullRenders: [{version, minutes, reused, total}], agentRuns: [{run, agents, tokensM, outputK, wallMin, agentMin}], qaFailRate, revisionsCount}, insights: [{title, detail, impact: high/medium/low, evidence, action}], estimates: [{label, value, basis}] }` | render records, journals, QA |
| `memory/library` | `{ locked: [...], proposal: {...}, preferences: [...], rejected: [...], techniques: [...], components: [{name, type, uses, lastUsed}], feedback: [...] }` | `production-memory/**`, `motion-library/registry.json`, manifest usage counts |
| `review/<lessonId>` | `{ versions: [{version, createdAt, chapters: [{chapterId, title, startSec, endSec, assetId, url, sizeBytes}]}] }` | review copies uploaded as assets (540p, at most 15 MB each) by `pipeline/review-media.ts` |

**Item** = `{ id, kind: "approval" | "failure" | "decision" | "review", title, detail, action: {label, view, ref}, since, source }`.

## Collections the page writes (viewer actions)

All writes carry `by` (`user.id()`), `at` (ISO), `status: "new"` and a client-generated `id`.

| collection | doc | when |
|---|---|---|
| `comments` | `{ lessonId, version, chapterId, atSec, sceneId, text, status: new/task-created/resolved, taskId? }` | Review Centre comment at the current timecode |
| `approvals` | `{ itemRef (e.g. "lesson:L01:v004:chapter:sec-04", "board-design", "limiter"), decision: approve/changes/reject, note, status: new/recorded, recordedIn? }` | approve / request changes / reject buttons |
| `requests` | `{ jobId, action: retry/cancel/prioritise, note, status: new/accepted/done/refused, result? }` | Queue controls. The page labels them "Request sent: the studio acts on it at its next check". |

**Rules:**
- Writes require at least `interact` level.
- The page shows a write as **Saved** only after the db write resolves. On failure it shows the error and keeps the user's text.
- Nothing is ever approved by default. Silence is not approval.
- `board-inbox.ts` records approvals in `production-memory/decisions.md` and `status.json` (via `approve.ts` where the item is a lesson version), quoting the note verbatim. It creates ledger tasks for comments and `changes` decisions, then sets each doc's status and `taskId`/`recordedIn`.
