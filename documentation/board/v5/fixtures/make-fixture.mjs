// FIXTURE GENERATOR — test data for the board v5 harness only. Never published, never shown to the client.
// Chapters, scenes and narration come from the real L01 manifest + transcript so the layout is exercised with
// realistic volume; every other value (renders, QA, jobs, efficiency, review copies) is invented test data
// and every document carries source "FIXTURE (test data)".
// Usage: node documentation/board/v5/fixtures/make-fixture.mjs   (from the repo root)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const L = "lifelink-course-L01";
const dir = join(root, "courses/lifelink-course", L);
const src = "FIXTURE (test data)";
const now = Date.now();
const ago = (min) => new Date(now - min * 60000).toISOString();

const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const transcript = JSON.parse(readFileSync(join(dir, `transcript/${L}.transcript.json`), "utf8"));
const narr = (a, b) => {
  const t = transcript.segments.filter((s) => s.end > a && s.start < b).map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  return t.length > 140 ? t.slice(0, 139) + "…" : t;
};
const chapters = manifest.sections.map((s) => {
  const sc = manifest.scenes.filter((x) => x.sectionId === s.id);
  return { id: s.id, title: s.title, startSec: Math.min(...sc.map((x) => x.startSec)), endSec: Math.max(...sc.map((x) => x.endSec)), source: src };
});
const scenes = manifest.scenes.map((s, i) => ({
  id: s.id, chapterId: s.sectionId, startSec: s.startSec, endSec: s.endSec, type: s.type,
  narration: narr(s.startSec, s.endSec), approval: s.sectionId === "sec-01-welcome" ? "approved" : i === 40 ? "changes" : "none",
}));
const ch = (id) => chapters.find((c) => c.id === id);

const steps = [
  ["transcribe", "Transcript", "done"], ["plan", "Creative plan", "done"], ["animations", "Animations", "done"],
  ["chapters", "Chapters", "running"], ["review", "Your review", "queued"], ["render", "Render", "queued"],
  ["qa", "Video QA", "queued"], ["deliver", "Deliver", "queued"],
].map(([id, label, state]) => ({ id, label, state, evidence: "fixture", source: src }));

const docs = {};
docs["studio/meta"] = { lastSync: ago(12), syncedBy: "studio session", schema: 1, source: src };
docs["studio/overview"] = {
  courses: [{ id: "lifelink-course", title: "LifeLink Marriage Academy", lessonIds: [L, "lifelink-course-L02"], source: src }],
  activeLessonId: L,
  attention: [
    { id: "att-limiter", kind: "decision", title: "Volume: raise narration to standard level?", detail: "Module 01 is quiet (−26 LUFS). A gentle limiter is needed. Nothing changes until you say yes.", action: { label: "Decide", view: "approvals", ref: "limiter" }, since: ago(300), source: src },
    { id: "att-ch04", kind: "review", title: "Chapter 4 (v004) is ready to watch", detail: "Three pillars now rise on cue. Your approval is needed before the final render.", action: { label: "Watch chapter 4", view: "review", ref: `lesson:${L}:v004:chapter:sec-04` }, since: ago(40), source: src },
    { id: "att-fail", kind: "failure", title: "Caption hold check failed on v003", detail: "One caption is on screen for 1.4 s (minimum 1.5 s).", action: { label: "Open queue", view: "queue", ref: "t-qa-v003" }, since: ago(500), source: src },
  ],
  nextActions: [
    { id: "na-ch04", kind: "review", title: "Watch and approve Chapter 4, The three pillars", detail: "It is the only chapter blocking the v004 render. Your earlier note (screen almost empty) was addressed.", action: { label: "Open Review Centre at Chapter 4", view: "review", ref: `lesson:${L}:v004:chapter:sec-04` }, since: ago(40), source: src },
    { id: "na-limiter", kind: "decision", title: "Decide on the narration limiter", detail: "Loudness QA warns on every render until this is decided.", action: { label: "Decide", view: "approvals", ref: "limiter" }, since: ago(300), source: src },
    { id: "na-board", kind: "approval", title: "Approve the board design", detail: "This page: structure, review centre and modes.", action: { label: "Review", view: "approvals", ref: "board-design" }, since: ago(200), source: src },
  ],
  recent: [
    { at: ago(70), text: "Chapter animations built (12 pictures, 4 text styles)", kind: "build", source: src },
    { at: ago(56), text: "Job ledger and file claims: 12 of 12 tests passed", kind: "test", source: src },
    { at: ago(290), text: "v003 rendered; automatic QA 15 pass, 1 fail, 1 warning", kind: "render", source: src },
  ],
  queueCounts: { queued: 3, running: 1, blocked: 1, failed: 1, done: 6 },
  source: src,
};
docs[`lessons/${L}`] = {
  id: L, courseId: "lifelink-course", title: manifest.title, durationSec: manifest.durationSec, state: "AWAITING_APPROVAL", source: src,
  stage: { current: "chapters", steps },
  now: { text: "Chapters 11–14 being planned; 3–8 done. 11 of 21 agent tasks finished.", measured: true, at: ago(14), source: src },
  eta: { at: new Date(now + 5.7 * 3600000).toISOString(), basis: "based on how long finished tasks took" },
  chapters, scenes, scenesSource: src,
  renders: [
    { version: "v002", label: "First full pass", createdAt: ago(60 * 30), wallClockMin: 97, reusedSections: 0, totalSections: 16, output: `renders/${L}_v002.mp4`, outputExists: true, engineFingerprint: "abc123", qa: { result: "FAIL", pass: 13, fail: 3, warn: 1, report: "quality-reports/L01_v002/report.json" }, source: src },
    { version: "v003", label: "Chapter 4 rework", createdAt: ago(290), wallClockMin: 22, reusedSections: 13, totalSections: 16, output: `renders/${L}_v003.mp4`, outputExists: true, engineFingerprint: "abc124", qa: { result: "FAIL", pass: 15, fail: 1, warn: 1, report: "quality-reports/L01_v003/report.json" }, source: src },
    { version: "v004", label: "Three pillars on cue", createdAt: ago(45), wallClockMin: 18, reusedSections: 14, totalSections: 16, output: `renders/${L}_v004.mp4`, outputExists: true, engineFingerprint: "abc125", qa: { result: "PASS", pass: 16, fail: 0, warn: 1, report: "quality-reports/L01_v004/report.json" }, source: src },
  ],
  qaIssues: [
    { version: "v003", check: "caption-hold", status: "fail", detail: "Caption held 1.4 s (minimum 1.5 s)", atSec: 285.2, source: src },
    { version: "v004", check: "loudness", status: "warn", detail: "Integrated loudness −26 LUFS (target −16)", source: src },
    { version: "v004", check: "contrast", status: "warn", detail: "Low contrast on a kicker line", atSec: 300.5, source: src },
    { version: "v004", check: "safe-area", status: "warn", detail: "Title touches the safe-area edge", atSec: 15.1, source: src },
  ],
  deliverables: [
    { kind: "Master video (1080p)", path: `deliverables/${L}/${L}_v003.mp4`, exists: true, bytes: 812000000, source: src },
    { kind: "Captions (SRT)", path: `deliverables/${L}/${L}.srt`, exists: true, bytes: 48211, source: src },
    { kind: "Portrait cut (9:16)", path: `deliverables/${L}/${L}_portrait.mp4`, exists: false, source: src },
  ],
  revisions: [
    { at: ago(300), text: "Chapter 4: three pillars rise on cue (client note: screen almost empty)", source: src },
    { at: ago(1500), text: "Welcome title held longer", source: src },
  ],
};
const T = (id, kind, owner, status, o = {}) => ({ id, kind, owner, status, startedAt: null, finishedAt: null, attempts: 0, maxRetries: 2, lastError: null, deps: [], outputs: [], note: null, source: src, ...o });
docs[`jobs/${L}`] = {
  lessonId: L, source: src, tasks: [
    T("t-plan-03", "chapter-plan", "Creative Director", "done", { startedAt: ago(200), finishedAt: ago(170), attempts: 1, outputs: ["courses/…/sections/sec-03.json"], note: "Plan chapter 3" }),
    T("t-plan-04", "chapter-plan", "Creative Director", "done", { startedAt: ago(170), finishedAt: ago(150), attempts: 1, outputs: ["courses/…/sections/sec-04.json"], note: "Plan chapter 4" }),
    T("t-plan-11", "chapter-plan", "Creative Director", "running", { startedAt: ago(14), attempts: 1, note: "Plan chapter 11" }),
    T("t-plan-12", "chapter-plan", "Creative Director", "queued", { deps: ["t-plan-11"], note: "Plan chapter 12" }),
    T("t-anim", "animations", "Motion Designer", "done", { startedAt: ago(130), finishedAt: ago(70), attempts: 1, outputs: ["src/scenes/pillars.tsx", "src/scenes/ecosystem.tsx"], note: "Build chapter animations" }),
    T("t-qa-v003", "video-qa", "QA Engineer", "failed", { startedAt: ago(295), finishedAt: ago(290), attempts: 2, lastError: "caption-hold: 1.4 s caption at 04:45", note: "Automatic QA on v003" }),
    T("t-render-v005", "render", "Render Engineer", "blocked", { deps: ["t-review-04"], note: "Render v005 after your review" }),
    T("t-review-04", "client-review", "Client", "queued", { note: "Your review of chapter 4" }),
    T("t-creative-review", "creative-review", "Quality Director", "queued", { deps: ["t-render-v005"], note: "Independent creative review" }),
    T("t-ledger", "engineering", "Pipeline Engineer", "done", { startedAt: ago(90), finishedAt: ago(56), attempts: 1, note: "Job ledger + claims tests" }),
  ],
};
// v003 review copies: the real 540p files in review-media/ when present and readable (served at /review-media/ by
// run-tests.cjs); otherwise that chapter has no copy (url null). v004 copies are synthetic test patterns (FIXTURE).
const mediaDir = join(root, "review-media");
const probe = (f) => { try { const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "csv=p=0", f], { encoding: "utf8" }).trim(); const [d, sz] = out.split(","); return +d > 0 ? { d: +d, size: +sz } : null; } catch { return null; } };
const v003 = ["sec-01-welcome", "sec-02-purpose", "sec-03", "sec-04"].map((id) => {
  const f = join(mediaDir, `${L}_v003_${id}_540p.mp4`), ok = existsSync(f) && probe(f);
  return { chapterId: id, title: ch(id).title, startSec: ch(id).startSec, endSec: ch(id).endSec, assetId: ok ? "local-" + id : null, url: ok ? `/review-media/${L}_v003_${id}_540p.mp4` : null, sizeBytes: ok ? ok.size : 0 };
});
const fx = (id, file) => ({ chapterId: id, title: ch(id).title, startSec: ch(id).startSec, endSec: ch(id).endSec, assetId: "fixture-" + id, url: file, sizeBytes: 0 });
docs["review/" + L] = {
  source: src,
  versions: [
    { version: "v004", createdAt: ago(45), chapters: [fx("sec-01-welcome", "fixtures/review-v004-sec-01-welcome.mp4"), fx("sec-04", "fixtures/review-v004-sec-04.mp4")] },
    { version: "v003", createdAt: ago(290), chapters: v003 },
    { version: "v002", createdAt: ago(1800), chapters: [] },
  ],
};
docs["efficiency/summary"] = {
  source: src,
  measured: {
    fullRenders: [
      { lesson: L, version: "v002", minutes: 97, reused: 0, total: 16, source: src },
      { lesson: L, version: "v003", minutes: 22, reused: 13, total: 16, source: src },
      { lesson: L, version: "v004", minutes: 18, reused: 14, total: 16, source: src },
    ],
    agentRuns: [
      { run: "wf-plan-a", agents: 21, tokensM: 31.2, outputK: 410, wallMin: 96, agentMin: 380, finished: true, source: src },
      { run: "wf-anim", agents: 7, tokensM: 12.4, outputK: 150, wallMin: 60, agentMin: 190, finished: true, source: src },
      { run: "wf-plan-b", agents: 11, tokensM: 9.8, outputK: 96, wallMin: 40, agentMin: 120, finished: false, source: src },
    ],
    qaFailRate: 0.67, qaFailRateBasis: "2 of 3 renders had at least one failed check",
    revisionsCount: 2, revisionsBasis: "lesson notes",
  },
  insights: [
    { title: "A shared animation change forces a full re-render", detail: "Editing a component used in every chapter invalidates all 16 sections.", impact: "high", evidence: "v002 re-rendered 16 of 16 sections in 97 min; v004 reused 14 of 16 in 18 min.", action: "Version shared components so old sections keep their cache.", source: src },
    { title: "Loudness warning repeats on every render", detail: "Narration is quiet; the warning will not clear without the limiter.", impact: "medium", evidence: "3 of 3 renders warned on loudness.", action: "Decide on the limiter (Approvals).", source: src },
    { title: "Caption holds slightly short", detail: "One caption below the 1.5 s minimum.", impact: "low", evidence: "1 fail on v003.", action: "Planner checks hold time before render.", source: src },
  ],
  estimates: [{ label: "Next full lesson render", value: "about 20 min", basis: "median of the last two section-cached renders", estimate: true }],
  notMeasured: ["Cost: no billing data is available to the studio"],
};
docs["memory/library"] = {
  locked: [{ text: "Narration is the master timeline; never cut or reorder it.", source: src }, { text: "Watermark every render while the brand is a test palette.", source: src }],
  openItems: [{ item: "Font licences", state: "waiting", needed: "Licence confirmation for video use", source: src }],
  proposal: { status: "proposal", version: "v2", approvedBy: null, summary: ["Burgundy and paper palette", "Hanken Grotesk for interface type"], source: src },
  preferences: [{ text: "Prefer key phrases over subtitles.", source: src }, { text: "Hold on-screen text for at least 1.5 s.", source: src }],
  rejected: [{ id: "r1", date: "2026-11-20", treatment: "Stock-photo backgrounds", by: "client", why: "Feels generic", instead: "Typographic scenes", source: src }],
  techniques: [{ id: "k1", text: "Reveal list items on the spoken cue word.", source: src }],
  components: [
    { name: "kineticStatement", type: "scene", status: "active", uses: 119, lastUsed: ago(45), source: src },
    { name: "parallelPhrases", type: "scene", status: "active", uses: 55, lastUsed: ago(45), source: src },
    { name: "statementCollision", type: "scene", status: "active", uses: 22, lastUsed: ago(45), source: src },
    { name: "comparison", type: "scene", status: "active", uses: 16, lastUsed: ago(45), source: src },
    { name: "pathLandscape", type: "scene", status: "experimental", uses: 2, lastUsed: null, source: src },
  ],
  feedback: [{ date: "2026-11-23", quote: "Screen is almost empty while she introduces the three pillars.", quoteType: "verbatim", scope: "lesson", status: "addressed", lesson: L, source: src }],
  source: src,
};
docs["comments/c-seed-1"] = { id: "c-seed-1", lessonId: L, version: "v004", chapterId: "sec-04", atSec: 285.0, sceneId: scenes.find((s) => s.startSec <= 285 && s.endSec > 285)?.id, text: "Pillars land nicely now — keep this timing.", status: "task-created", taskId: "task-17", by: "u-director", at: ago(30) };
docs["approvals/a-seed-1"] = { id: "a-seed-1", itemRef: `lesson:${L}:v004:chapter:sec-01-welcome`, decision: "approve", note: "Welcome is good.", status: "recorded", recordedIn: "production-memory/decisions.md", by: "u-director", at: ago(600) };

writeFileSync(join(here, "seed.json"), JSON.stringify({ _fixture: "TEST DATA ONLY — generated by make-fixture.mjs", docs }, null, 1));
console.log("wrote", join(here, "seed.json"), Object.keys(docs).length, "docs");
