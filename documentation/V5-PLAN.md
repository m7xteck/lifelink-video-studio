# V5: efficiency baseline, board audit and roadmap (2026-11-24)

This extends `SYSTEM-AUDIT-2026-11-24.md`, which covers architecture items 1–10 and isn't repeated here.

Every number below was measured from workflow journals, agent logs (`usage` fields, deduplicated per API message), `.render.json` records and QA reports.

## 1. Efficiency baseline (Module 01 so far)

**Agent work**

| Run | Agents | Tokens processed | Of which output | Wall clock | Agent time |
|---|---|---|---|---|---|
| 1-minute production (`wf_81c3…`) | 22 | 15.2 M | 122 k | 31 min | 37 min |
| Full-lesson build (`wf_3a47…`) | 44 | 39.6 M | 588 k | 58 min | 107 min |
| Final review (`wf_7f6f…`) | 14 | 22.5 M | 151 k | 21 min | 39 min |
| v2 pass, in progress (`wf_6f16…`) | 13 so far | 34.2 M | 281 k | 33 min so far | 63 min |
| **Total** | **93** | **111.5 M** | **1.14 M** | — | — |

**Renders and QA**

| Item | Measured |
|---|---|
| Full renders | 3 |
| v001 | 56.1 min, nothing reused |
| v002 | 97.2 min, nothing reused (ran alongside agent work) |
| v003 | 21.8 min, 13 of 16 sections reused |
| Preview renders | 5 |
| QA on full renders | v001: 3 fail, v002: 1 fail, v003: 1 fail. No full render has passed every check yet. |
| Money cost | **Not measured.** The studio has no billing data. Any figure would be an estimate from public prices and would be labelled that way. |

**What the numbers say**

1. **Re-reading context drives tokens.** Most tokens are cached re-reads by agents of the same files, briefs and images. Output tokens are only about 1% of the total.
2. **Rendering drives wall clock.** A cold 36-minute render takes 56–97 min. Any edit under `src/` currently invalidates every section, because the engine fingerprint hashes all of `src/`. So one component tweak means a cold 1–1.6 h render.
3. **There is duplicated review.** The previous final review found 82 fixes in sections that the build agents had already self-reviewed. Defects that deterministic checks could catch earlier reach the expensive agent reviews.
4. **Full renders are used as review copies.** Three full renders went out for review. A low-resolution motion preview of the changed stretches would have served most of those purposes.

## 2. Production board audit (live board v4)

- **What works**
  - Real agent states, run times and tokens are read from the journals and agent logs.
  - Estimates are labelled.
  - It is responsive and has light and dark themes.
  - There is an evidence panel.
- **What's missing**
  - There is no course or lesson structure: the board shows one run, not the studio.
  - There is no video review, no approvals and no queue control.
  - The evidence, findings and blockers lists are typed by hand.
  - It updates only while a Claude session is active, and doesn't say so prominently.
  - It is agent-centred, when it should be centred on outcomes and decisions.
  - It is a single scrolling page with no navigation.
- **Platform limits** (checked against the artifact runtime contract 0.2.98)
  - The page cannot run jobs or monitor processes on its own.
  - It can store shared data (`db`), play uploaded video up to 20 MiB per file (`assets`), and know who is viewing (`user`).
  - Controls such as Retry, Pause or Approve can only **record a request**. Claude acts on it at the next check, and the page must say exactly that.

## 3. Prioritised roadmap

Ordered by resources saved per approved video, then by how much it reduces friction for you.

| # | Change | Expected effect (to be measured, not promised) | Risk to Module 01 | When |
|---|---|---|---|---|
| 1 | **Per-component render cache.** The section fingerprint hashes only the components that section uses, plus shared engine files. | A component fix re-renders only the sections using it, instead of all 16 | Touches `render.ts` | Build and test in the worktree now; merge after v004 renders |
| 2 | **Three render tiers as commands:**<br>• `still.ts` (exists);<br>• `render.ts --preview` at 960×540 for selected time windows;<br>• the final master | Review the motion of changed stretches in minutes rather than a full render | New flag only | Worktree now |
| 3 | **Deterministic gates before agent review:**<br>• rhythm;<br>• sections check;<br>• QaGuard on stills;<br>• text-hold;<br>• cue-inside-scene | Fewer defects reach the expensive reviewers; fewer review rounds | Additive | Worktree now |
| 4 | **Context packs:**<br>• `memory.ts brief` (being built);<br>• `cue-slice` for narration;<br>• per-section narration plus scene JSON.<br>Agents get only their slice. | Fewer re-read tokens per agent | Additive | In progress |
| 5 | **Effort and model routing in workflows:**<br>• `effort: low` for mechanical agents (validation, data);<br>• default effort for creative work;<br>• the top tier for art direction and audits.<br>Supported by the Workflow tool (`opts.model`, `opts.effort`); not yet exercised here. | Lower cost on routine steps; quality kept where it matters | Next workflow only | Next run |
| 6 | **Job ledger and claims** | Resumable, traceable tasks; no edit collisions | Additive | **Done in worktree, 12/12 tests** |
| 7 | **Board v5** (structure below) on real ledger, render, QA and approval data | Clarity and control for you | Separate artifact until approved | After your design approval |
| 8 | **Review Centre:**<br>• per-chapter 540p review copies;<br>• timestamped comments become ledger tasks;<br>• approve / request changes recorded with your words | Faster, precise revisions | Additive | With board v5 |
| 9 | **Retrospective generator** from the ledger, QA and renders | Learning across lessons | Additive | After Module 01 |
| 10 | **Cost estimates.** Only if you want them: a public price table, clearly marked as an estimate. | Visibility | — | On request |

## 4. Board v5: proposed structure (awaiting your approval)

Two modes:
- **Director**, the default: plain English, decisions first.
- **Technical**: logs, dependencies, render and QA details, tokens.

The views:

1. **Overview**
   - Needs your attention: approvals, failures, decisions.
   - Now producing: lesson, stage and the real current step.
   - Ready to review.
   - Render queue.
   - Recent verified results.
   - Last verified update time, shown prominently.
2. **Course workspace**: lessons in order with duration, stage and approval, as a list or a board by stage, with a search filter.
3. **Lesson workspace**: chapters, then a scene timeline (scene, narration, treatment, approval, render, QA), storyboard stills, tasks, renders, QA, revision history and exports.
4. **Review Centre**
   - Per-chapter player with timecode, speed, and chapter, scene and QA markers.
   - Timestamped comments tied to version and scene.
   - Approve or request changes.
   - Before/after comparison.
5. **Approvals**: one inbox with history. Silence never counts as approval.
6. **Queue**: pending, running, blocked, failed and done, from the ledger. Retry, cancel and prioritise are recorded as requests that Claude actions, labelled that way.
7. **Agents**: grouped by stage, showing role, task, real times, output and errors, with logs collapsed.
8. **Efficiency**: the measured table above, plus trends once there are at least 2 lessons. Estimates are always labelled.
9. **Creative memory**: brand (locked and proposal), preferences, rejected treatments, components with usage counts, techniques. Searchable.
10. **Delivery library**: per lesson, each deliverable with "exists / missing" checked against the files.

The data comes from one `snapshot` script that reads the ledger, `status.json`, render records, QA reports, memory files and the deliverables folder, and writes db documents. Every item carries its source path.
