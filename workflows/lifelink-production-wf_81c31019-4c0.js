export const meta = {
  name: 'lifelink-production',
  description: 'LifeLink agent team: extend Module 01 preview to 0:00–1:00 with research, planning, reviews, build, render, QA, independent review and revisions',
  phases: [
    { title: 'Research', detail: 'Audio Intelligence + Course Narrative' },
    { title: 'Plan', detail: 'Creative Director plans 0:40.7–1:00' },
    { title: 'Plan review', detail: 'Brand & Values, Engagement, Proofreader' },
    { title: 'Build', detail: 'Motion Design Director implements + checks stills' },
    { title: 'Render & QA', detail: 'Production Orchestrator + Sound Director' },
    { title: 'Independent review', detail: 'Quality Director + Proofreader on the render' },
    { title: 'Revise', detail: 'Revision Director fixes, re-render, re-review (max 2 rounds)' },
    { title: 'Memory', detail: 'Asset & Production Memory Director records everything' },
  ],
}

const R = '/home/user/lifelink-video-studio'
const role = (f) => `First read ${R}/.claude/agents/${f}.md: that is your role (ignore the YAML header). You are one member of the LifeLink production team.\n\n`
const CTX = `PROJECT CONTEXT
- Repo: ${R} (git branch brand-proposal-v1). Remotion video engine. Do NOT commit.
- Lesson: ${R}/courses/lifelink-course/lifelink-course-L01 (manifest.json, creative-plan.md, transcript/lifelink-course-L01.transcript.json + .txt + .uncertain.json).
- Job: extend the client preview from 0:00–0:40.7 to 0:00–1:00 (60.0 s). New window to plan/build: 40.7 s → 60.0 s. In the transcript: 40.70–54.08 "Marriage is not simply about finding someone who meets a list of expectations, it is about developing the knowledge, emotional maturity, understanding and character needed to build a successful relationship." then 55.08–58.96 "In Islam, marriage, or nikah, is a sacred covenant." (next sentence starts 60.02, outside the window).
- Scenes s001–s004 (0–40.7 s) are client-approved: DO NOT change them. (s003 is intentionally the plain text "parallelPhrases" version.)
- Client rules (mandatory): ${R}/production-memory/preferences.md and decisions.md. In short: every animation must be meaningful and tied to the narration; if nothing meaningful can be shown, use a clean text scene; quality/finish must be premium; nothing cheap, random, decorative, cropped, off-path or glitchy.
- Brand: ${R}/brand/design-system.json (status PROPOSAL, watermark automatic). No hearts, rings, crescents, generic Islamic patterns, people.
- Components available: ${R}/motion-library/registry.json; schema ${R}/src/schema/manifest.ts; renderer map ${R}/src/scenes/SceneRenderer.tsx. Prefer existing components; text types include kineticStatement (with kicker/emphasis), statementCollision, reflectionField, parallelPhrases, comparison, takeaway, quietReflection.
- Tools: cue timings: cd ${R} && npx tsx pipeline/find-cue.ts --course lifelink-course --lesson lifelink-course-L01 "phrase"; stills: npx tsx pipeline/storyboard.ts --course lifelink-course --lesson lifelink-course-L01 (writes storyboards/lifelink-course-L01/landscape/frames/*.jpg; view images with the Read tool).
- Only ONE heavy job (render) at a time; only run renders when your task says so.`

const REPORT = { type: 'object', properties: { summary: { type: 'string' }, details: { type: 'string' } }, required: ['summary', 'details'] }
const REVIEW = { type: 'object', properties: {
  verdict: { type: 'string', enum: ['PASS', 'PASS WITH NOTES', 'REVISION REQUIRED'] },
  issues: { type: 'array', items: { type: 'object', properties: {
    severity: { type: 'string', enum: ['blocker', 'should-fix', 'polish'] }, where: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } },
    required: ['severity', 'where', 'problem', 'fix'] } } }, required: ['verdict', 'issues'] }
const RENDER = { type: 'object', properties: { video: { type: 'string' }, qaResult: { type: 'string' }, qaSummary: { type: 'string' }, failures: { type: 'array', items: { type: 'string' } } }, required: ['video', 'qaResult', 'qaSummary', 'failures'] }

// ---------- Research ----------
phase('Research')
const [audio, narrative] = await parallel([
  () => agent(role('audio-intelligence') + CTX + `\n\nTASK: Produce the cue sheet for 40.7–60.0 s: exact start/end of every phrase likely to appear on screen, pauses ≥0.5 s, low-confidence words, and any likely mis-transcription in this window. Also confirm "nikah" is transcribed correctly in context.`, { label: 'Audio Intelligence Director', phase: 'Research', schema: REPORT }),
  () => agent(role('course-narrative') + CTX + `\n\nTASK: Read the full lesson transcript. Explain the teaching purpose of 40.7–60.0 s within Module 01 and the course, what precedes/follows it, recurring concepts that later scenes must show consistently (e.g. the "mirror check", the three pillars sakina/mawaddah/rahmah if present), and what must NOT be visualised literally.`, { label: 'Course Narrative Director', phase: 'Research', schema: REPORT }),
])
log('Research complete: cue sheet and narrative context ready')

// ---------- Plan ----------
phase('Plan')
const plan = await agent(role('creative-director') + CTX + `\n\nAUDIO CUE SHEET:\n${audio?.details}\n\nNARRATIVE CONTEXT:\n${narrative?.details}\n\nTASK: Plan the scenes for 40.7–60.0 s. For each scene give: id (s005, s006…), start/end (tiling exactly 40.7→60.0, no gaps), type (existing component), full props JSON with every "at" taken from the cue sheet, and one sentence on WHY this treatment (and why any animation is meaningful, or why it is text-only). Do NOT edit any files. Return the scene list as a JSON array string in details.`, { label: 'Creative & Storyboard Director', phase: 'Plan', schema: REPORT })

// ---------- Plan review ----------
phase('Plan review')
const planReviews = (await parallel([
  ['brand-guardian', 'Brand & Values Director', 'Check brand fit and values sensitivity (this passage introduces nikah as a sacred covenant: respectful, no clichés, no invented teaching).'],
  ['engagement-director', 'Engagement Director', 'Check meaningfulness, pacing, readability and variety versus the preceding approved scenes s001–s004.'],
  ['proofreader', 'Proofreader', 'Check every on-screen word against the transcript, timing cues vs the cue sheet, ≥1.5 s holds, script-font rules.'],
].map(([f, label, task]) => () => agent(role(f) + CTX + `\n\nCUE SHEET:\n${audio?.details}\n\nPROPOSED PLAN:\n${plan?.details}\n\nTASK: ${task} Do not edit files.`, { label, phase: 'Plan review', schema: REVIEW })))).filter(Boolean)
const planIssues = planReviews.flatMap((r) => r.issues).filter((i) => i.severity !== 'polish')
log(`Plan review: ${planReviews.map((r) => r.verdict).join(' / ')} (${planIssues.length} required changes)`)

// ---------- Build ----------
phase('Build')
const build = await agent(role('motion-designer') + CTX + `\n\nAPPROVED PLAN:\n${plan?.details}\n\nREQUIRED CHANGES FROM PLAN REVIEW (apply all):\n${JSON.stringify(planIssues, null, 1)}\n\nTASK: Implement in ${R}/courses/lifelink-course/lifelink-course-L01/manifest.json: add section {id:"sec-02-purpose", title:"The purpose of marriage", startSec:40.7, endSec:60.0} and the new scenes (s001–s004 untouched). Append the new scenes to creative-plan.md (same table format). Validate: cd ${R} && npx tsc -p . && npx tsx -e "import('./src/schema/manifest.ts').then(m=>{m.ManifestSchema.parse(JSON.parse(require('fs').readFileSync('courses/lifelink-course/lifelink-course-L01/manifest.json','utf8')));console.log('VALID')})". Then run the storyboard, LOOK at the new scene stills, and fix any visual problem (overflow, awkward breaks, emptiness, overlaps) before finishing. Report exactly what you changed.`, { label: 'Motion Design Director', phase: 'Build', schema: REPORT })

// ---------- Render & QA ----------
const renderAndQa = async (label, phaseName, round) => {
  const r = await agent(role('production-orchestrator') + CTX + `\n\nTASK: cd ${R} && npx tsx pipeline/render.ts --course lifelink-course --lesson lifelink-course-L01 --from 0 --to 60 --label "L01 preview 0-60 ${round}" ; then run npx tsx pipeline/qa.ts --course lifelink-course --lesson lifelink-course-L01 --video <the new mp4 path printed by render>. Return the video path (repo-relative), QA result (PASS/FAIL), the summary line, and every FAIL/WARN line.`, { label, phase: phaseName, schema: RENDER })
  const sound = await agent(role('sound-director') + CTX + `\n\nRENDER: ${r?.video}\nQA: ${r?.qaSummary}\n${(r?.failures || []).join('\n')}\n\nTASK: Read the QA report folder for this video under ${R}/quality-reports/lifelink-course-L01/ and the narration loudness JSON next to the render in ${R}/renders/lifelink-course-L01/landscape-sample/. Report loudness, peaks, sync and whether narration is preserved.`, { label: `Audio & Sound Director${round === 'r0' ? '' : ' (' + round + ')'}`, phase: phaseName, schema: REPORT })
  return { r, sound }
}
phase('Render & QA')
let { r: render, sound } = await renderAndQa('Production Orchestrator', 'Render & QA', 'r0')
log(`Render: ${render?.video} — QA ${render?.qaResult}`)

// ---------- Independent review (+ revision loop) ----------
const review = async (phaseName, round) => (await parallel([
  () => agent(role('quality-director') + CTX + `\n\nVIDEO: ${R}/${render?.video}\nQA: ${render?.qaSummary}\n${(render?.failures || []).join('\n')}\n\nTASK: Independent review of the WHOLE 60 s. Extract frames with ffmpeg into /tmp/claude-0/qd-${round}/ (every 0.5 s around each scene change: 7.6, 16.4, 29.0, 40.7 and any new boundary; every 1 s through 40–60 s; plus 8 spread samples) and view them with Read. Look for glitches, crops, misplacement, overlaps, unreadable or awkward text, cheap-looking or meaningless motion, brand violations. Only list real, visible problems.`, { label: `Independent Quality Director${round === 'r0' ? '' : ' (' + round + ')'}`, phase: phaseName, schema: REVIEW }),
  () => agent(role('proofreader') + CTX + `\n\nVIDEO: ${R}/${render?.video}\n\nTASK: Proofread the rendered video. Extract a frame at the settled moment of every scene (and mid-reveal frames for text that builds) with ffmpeg into /tmp/claude-0/pr-${round}/, view them, and compare every on-screen word with the transcript and the manifest: wording, spelling, punctuation, capitalisation, line breaks, timing vs narration.`, { label: `Proofreader${round === 'r0' ? '' : ' (' + round + ')'}`, phase: phaseName, schema: REVIEW }),
])).filter(Boolean)

phase('Independent review')
let reviews = await review('Independent review', 'r0')
let issues = reviews.flatMap((x) => x.issues).filter((i) => i.severity !== 'polish')
log(`Independent review: ${reviews.map((x) => x.verdict).join(' / ')} — ${issues.length} blocker/should-fix issues`)

const revisions = []
for (let round = 1; round <= 2 && (issues.length || render?.qaResult !== 'PASS'); round++) {
  phase('Revise')
  const fix = await agent(role('revision-director') + CTX + `\n\nCONFIRMED ISSUES (round ${round}):\n${JSON.stringify(issues, null, 1)}\nQA failures: ${(render?.failures || []).join(' | ')}\n\nTASK: Fix every blocker/should-fix issue with the smallest correct change. Do not change client-approved scenes s001–s004 unless the issue is a genuine bug in them (then fix the bug only, not the design). Re-validate the manifest and type-check, render storyboard stills and check your fixes visually. Do NOT run the full render. Report each issue → what you changed (or why it is not a real issue).`, { label: `Revision Director (round ${round})`, phase: 'Revise', schema: REPORT })
  revisions.push(fix)
  const rr = await renderAndQa(`Production Orchestrator (round ${round})`, 'Revise', `r${round}`)
  render = rr.r; sound = rr.sound
  reviews = await review('Revise', `r${round}`)
  issues = reviews.flatMap((x) => x.issues).filter((i) => i.severity !== 'polish')
  log(`Round ${round}: QA ${render?.qaResult}; reviews ${reviews.map((x) => x.verdict).join(' / ')}; ${issues.length} open issues`)
}
if (issues.length) log(`Stopped after the revision limit with ${issues.length} open issues — escalating to the Executive Director`)

// ---------- Memory ----------
phase('Memory')
const memory = await agent(role('memory-keeper') + CTX + `\n\nFINAL VIDEO: ${render?.video} (QA ${render?.qaResult})\nPLAN: ${plan?.summary}\nBUILD: ${build?.summary}\nREVISIONS: ${revisions.map((x) => x?.summary).join(' | ')}\nOPEN ISSUES: ${JSON.stringify(issues)}\n\nTASK: Update ${R}/production-memory/lesson-notes/lifelink-course-L01.md (append a dated entry: client asked to revert the three-paths scene to text, build the agent team, and extend to 1:00; what each stage did; open issues) and motion-library/registry.json usedIn for any component used in the new scenes. Do not commit.`, { label: 'Asset & Production Memory Director', phase: 'Memory', schema: REPORT })

return {
  video: render?.video, qa: render?.qaResult, qaSummary: render?.qaSummary, qaFailures: render?.failures,
  sound: sound?.summary,
  research: { audio: audio?.summary, narrative: narrative?.summary },
  plan: plan?.summary, planDetails: plan?.details,
  planReviews: planReviews.map((r) => ({ verdict: r.verdict, issues: r.issues })),
  build: build?.summary,
  finalReviews: reviews.map((x) => ({ verdict: x.verdict, issues: x.issues })),
  revisions: revisions.map((x) => x?.summary),
  openIssues: issues, memory: memory?.summary,
}
