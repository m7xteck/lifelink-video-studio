# Approval gates
Requires explicit client approval (quote their words in the approval note):
- A lesson's creative plan/storyboard before production (`npm run approve`).
- Any fundamentally new visual direction or new scene type used for the first time.
- Brand identity changes; music/SFX; noise reduction or limiting of narration; removing any spoken content; paid services; deleting originals/approved files; publishing externally.
Never: treat silence as approval; approve on the client's behalf; record test approvals as client approvals (`--by engine-selftest` is for technical tests only).
Fewer approvals over time: once a treatment is APPROVED in `motion-library/registry.json` and the client has approved ≥ 2 lessons in a course, subsequent lessons in that course may go straight to production IF the client has said so explicitly (record in `production-memory/decisions.md`).
