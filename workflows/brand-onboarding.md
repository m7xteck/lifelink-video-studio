# Brand onboarding workflow
1. Client uploads materials → saved to `brand/intake/uploads/` (fonts → `public/fonts/lifelink/` after licence check).
2. brand-guardian analyses them → `brand/proposals/design-system-<ver>.json` + `interpretation-<ver>.md` (colours with usage roles, type scale, logo rules, imagery/values rules, motion character, prohibited treatments, open questions).
3. Render proof frames on a separate Git branch: copy the proposal into `brand/design-system.json` there (watermark kept), run the storyboard for the engine test and one real lesson scene. The main branch stays untouched until approval.
4. Present to client. Iterate.
5. On explicit approval: copy proposal → `brand/design-system.json` with `status: "APPROVED"`, `approvedBy`, `approvedAt`, bump version, record in `production-memory/decisions.md`, commit with message "Brand: lock design system v<ver> (client approved <date>)".
6. After locking: any change to colours/fonts/logo rules requires a new proposal + approval. Components may add new compositions only using existing tokens.
