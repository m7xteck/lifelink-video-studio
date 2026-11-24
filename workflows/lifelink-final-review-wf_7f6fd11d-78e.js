export const meta = {
  name: 'lifelink-final-review',
  description: 'LifeLink final review: one reviewer-fixer per section (stills + proofreading) before the single re-render of Module 01',
  phases: [{ title: 'Final review', detail: 'Per section: render stills, check visually, proofread vs narration, fix blockers/should-fix in the section file' }],
}
const R = '/home/user/lifelink-video-studio'
const C = '--course lifelink-course --lesson lifelink-course-L01'
const SECS = args
const REPORT = { type: 'object', properties: { verdict: { type: 'string', enum: ['PASS', 'FIXED', 'NEEDS EXEC'] }, fixed: { type: 'array', items: { type: 'string' } }, open: { type: 'array', items: { type: 'string' } } }, required: ['verdict', 'fixed', 'open'] }
const results = await parallel(SECS.map((s) => () => agent(
  `Your role briefs: ${R}/.claude/agents/quality-director.md and proofreader.md (read both; ignore YAML headers). You are the FINAL reviewer AND fixer for section ${s.id} (${s.startSec}–${s.endSec} s) of LifeLink Module 01.
Client rules: every animation meaningful (otherwise a clean text scene); premium quality; nothing overlapping, clipped, cramped, awkwardly broken, misplaced or glitchy; script font ≤4 words, no capital I, no numerals; on-screen text faithful to the narration (Islamic terms spelled correctly, e.g. Sakina, Mawaddah, Rahmah, Surah Ar-Rum, Amanah, nikah); every text cue appears when spoken and stays ≥1.5 s.
Known shared fixes already applied in code (do not redo): statementCollision now auto-fits its headline to one line; kineticStatement lines with script emphasis have more line spacing; slow fades after dark scenes. The diagram in sec-09 reappears as a progress tracker on purpose (future steps hidden) — that is intended.
1) cd ${R} && npx tsx pipeline/storyboard.ts ${C} --section ${s.id}   → stills in storyboards/lifelink-course-L01/landscape/${s.id}/frames/ ; LOOK at every still (Read tool).
2) Words + timings: npx tsx pipeline/cue-slice.ts ${C} --from ${s.startSec} --to ${s.endSec} ; compare every on-screen word in ${R}/courses/lifelink-course/lifelink-course-L01/sections/${s.id}.json.
3) Fix every blocker/should-fix issue by editing ONLY sections/${s.id}.json (never components, never other files). Keep the section's start/end unchanged. Re-validate with npx tsx pipeline/sections.ts check ${C} --section ${s.id}, re-render the stills, and confirm each fix visually.
If an issue can only be fixed in a shared component, do not touch it: put it in "open" for the Executive Director. Return: verdict, list of fixes made (scene id: change), open items.`,
  { label: `${s.id} · Final Reviewer`, phase: 'Final review', schema: REPORT }).then((r) => ({ id: s.id, ...r }))))
return results.filter(Boolean)
