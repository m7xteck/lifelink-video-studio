# Production memory
Durable creative memory, kept in Git rather than in any chat. Read it at the start of every task:
`npx tsx pipeline/memory.ts brief [--course <slug>]` prints a compact brief from these files.

## Layers (highest authority first)
| Layer | File(s) | Who can change it |
|---|---|---|
| 1. **LOCKED brand** | `brand/LOCKED.md` (+ `brand/design-system.json` once `status: "APPROVED"`) | Only with the client's explicit approval, recorded in `decisions.md` with their words |
| — current proposal | `brand/PROPOSAL.md` → pointer to `brand/design-system.json` (status PROPOSAL) | Provisional; any change to colours/fonts/logo still needs client approval |
| 2. **Preferences** | `preferences.md` | Client-confirmed, global creative preferences (each with date + source); changeable with client approval |
| 3. **Course decisions** | `course-decisions/<course>.md` | Hold for every lesson of one course |
| 4. **Lesson notes** | `lesson-notes/<lesson>.md` | Feedback and revisions for one lesson |
| 5. **Experiments** | `experiments/` | Unapproved trials and working briefs; never defaults |

A lower layer never overrides a higher one. If they conflict, follow the higher layer and tell the Director.

## Cross-cutting records
- `decisions.md`: dated log of every approval and significant decision, with the client's words.
- `feedback-log.jsonl`: one line per client message about creative/production work
  (`date, quote, quote_type: verbatim|excerpt|summary, scope: lesson|course|global, status: applied|pending|policy-candidate, source`).
  Add with `npx tsx pipeline/memory.ts feedback add --quote "..." --scope lesson|course|global [--status ...] [--lesson ...] [--source ...]`.
- `rejected.md`: treatments the client or a review rejected — why and when. Never reintroduce without being asked.
- `failure-patterns.md`: technical failures and their fixes.
- `techniques.md`: what worked (creative, timing, pipeline).
- `course-corpus/`: transcripts and concept graphs per course (reference material).
- Search everything: `npx tsx pipeline/memory.ts search <term>`.

## Learning rule
The studio learns from every round, but **never promotes feedback to a global rule on its own**:
1. Log the client's words in `feedback-log.jsonl` (scope as said; lesson by default) and in the lesson notes.
2. If it looks reusable, mark it `policy-candidate` and **ask the client**: "Should this apply to all lessons?"
3. Only on an explicit yes: move it into `preferences.md` (or `course-decisions/`) with date + quote, and record
   the decision in `decisions.md`. Brand changes go to `brand/LOCKED.md` only through the brand-onboarding workflow.

---
Original layer description (2026-11-23), kept for history:
- `brand-rules.md`: permanent brand rules (mirrors the approved design system; client-approved only) — now `brand/LOCKED.md`
- `preferences.md`: reusable creative preferences the client has confirmed apply broadly
- `course-decisions/<course>.md`: decisions for one course (recurring frameworks, visual continuity)
- `lesson-notes/<lesson>.md`: feedback and revisions for one lesson
- `experiments/`: unapproved trials; never defaults
- `decisions.md`: dated log of every approval and significant decision, with the client's words
Rule: never promote a one-off correction to a global rule without asking the client.
