/**
 * Production Orchestrator — advances every lesson in a course as far as it may go
 * WITHOUT crossing an approval gate.
 *
 *   npx tsx pipeline/produce.ts --course <id> [--lessons a,b] [--heavy 1] [--light 3] [--dry-run]
 *
 * Per lesson, based on its saved state:
 *   AUDIO_ANALYSED      → transcribe                         (heavy job)
 *   TRANSCRIBED         → STOP: creative plan needed (Creative Director writes manifest.json)
 *   CREATIVE_PLAN_READY → storyboard + approval package       (light job)
 *   AWAITING_APPROVAL   → STOP: waiting for the client
 *   APPROVED / IN_PRODUCTION / REVISION_REQUIRED(after approval) → render  (heavy job)
 *   PREVIEW_RENDERED    → QA                                   (light job)
 *   QA_PASSED           → package deliverables                 (light job)
 *
 * Resource control: "heavy" jobs (render, transcription) each use every CPU core,
 * so by default only ONE runs at a time; light jobs run alongside (default 3).
 * Retries: each step is retried at most twice; errors are recorded in status.json.
 * Locks: one job per lesson at a time (also across separate processes).
 * Re-running is always safe: completed sections are cached and states are on disk.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { P, lessonDir, renderDir } from "./lib/paths";
import { readStatus, transition, type State } from "./lib/status";

const { values: a } = parseArgs({ options: {
  course: { type: "string" }, lessons: { type: "string" }, heavy: { type: "string", default: "1" }, light: { type: "string", default: "3" },
  "dry-run": { type: "boolean", default: false }, retries: { type: "string", default: "2" },
} });
const course = a.course!;
const MAX_RETRIES = Number(a.retries);

class Semaphore {
  private q: (() => void)[] = []; private n: number;
  constructor(n: number) { this.n = n; }
  async run<T>(fn: () => Promise<T>) {
    if (this.n <= 0) await new Promise<void>((r) => this.q.push(r));
    this.n--;
    try { return await fn(); } finally { this.n++; this.q.shift()?.(); }
  }
}
const heavy = new Semaphore(Number(a.heavy));
const light = new Semaphore(Number(a.light));

const sh = (args: string[], tag: string) => new Promise<{ code: number; out: string }>((res) => {
  const p = spawn("npx", ["tsx", ...args], { cwd: P.root, env: process.env });
  let out = "";
  const onData = (d: Buffer) => { out += d; for (const line of String(d).split("\n").filter(Boolean)) if (!/ [1-9]0%$/.test(line)) console.log(`  [${tag}] ${line}`); };
  p.stdout.on("data", onData); p.stderr.on("data", onData);
  p.on("close", (code) => res({ code: code ?? 1, out }));
});

const withRetry = async (tag: string, dir: string, fn: () => Promise<{ code: number; out: string }>) => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const r = await fn();
    if (r.code === 0) return r;
    console.log(`  [${tag}] attempt ${attempt + 1} failed${attempt < MAX_RETRIES ? " — retrying" : ""}`);
    if (attempt === MAX_RETRIES) {
      transition(dir, "FAILED", `${tag} failed after ${MAX_RETRIES + 1} attempts`, { tail: r.out.slice(-1500) }, { force: true });
      throw new Error(`${tag} failed`);
    }
  }
  throw new Error("unreachable");
};

const latestRender = (lesson: string) => {
  const d = join(renderDir(lesson), "landscape");
  if (!existsSync(d)) return null;
  const vids = readdirSync(d).filter((f) => /_v\d{3}\.mp4$/.test(f)).sort();
  return vids.length ? join(d, vids.at(-1)!) : null;
};

const advance = async (lesson: string): Promise<string> => {
  const dir = lessonDir(course, lesson);
  for (let guard = 0; guard < 12; guard++) {
    const s = readStatus(dir)!;
    const state: State = s.state;
    const dry = a["dry-run"];
    switch (state) {
      case "IMPORTED": return "needs audio analysis (re-run ingest)";
      case "AUDIO_ANALYSED":
        if (dry) return "would transcribe";
        await heavy.run(() => withRetry(`${lesson} transcribe`, dir, () => sh(["pipeline/transcribe.ts", "--course", course, "--lesson", lesson], `${lesson} transcribe`)));
        continue;
      case "TRANSCRIBED": return existsSync(join(dir, "manifest.json")) ? "manifest drafted — mark CREATIVE_PLAN_READY after review" : "WAITING: creative plan (manifest.json) to be written";
      case "CREATIVE_PLAN_READY":
        if (dry) return "would build storyboard";
        await light.run(() => withRetry(`${lesson} storyboard`, dir, () => sh(["pipeline/storyboard.ts", "--course", course, "--lesson", lesson], `${lesson} storyboard`)));
        continue;
      case "AWAITING_APPROVAL": return "WAITING: client approval of storyboard";
      case "APPROVED": transition(dir, "IN_PRODUCTION", "Production started by orchestrator"); continue;
      case "REVISION_REQUIRED": return "WAITING: revision decision (see QA report)";
      case "IN_PRODUCTION":
        if (dry) return "would render";
        await heavy.run(() => withRetry(`${lesson} render`, dir, () => sh(["pipeline/render.ts", "--course", course, "--lesson", lesson], `${lesson} render`)));
        transition(dir, "PREVIEW_RENDERED", "Full render complete", { video: latestRender(lesson) });
        continue;
      case "PREVIEW_RENDERED": {
        if (dry) return "would run QA";
        transition(dir, "QA_IN_PROGRESS", "Automated QA started");
        const video = latestRender(lesson)!;
        const r = await light.run(() => sh(["pipeline/qa.ts", "--course", course, "--lesson", lesson, "--video", video], `${lesson} qa`));
        const report = JSON.parse(readFileSync(join(P.qa, lesson, video.split("/").at(-1)!.replace(".mp4", ""), "report.json"), "utf8"));
        transition(dir, r.code === 0 ? "QA_PASSED" : "REVISION_REQUIRED", `Automated QA ${report.result}: ${report.summary}`, { video, failed: report.checks.filter((c: { status: string }) => c.status === "FAIL").map((c: { id: string }) => c.id) });
        continue;
      }
      case "QA_IN_PROGRESS": transition(dir, "PREVIEW_RENDERED", "Resuming interrupted QA", {}, { force: true }); continue;
      case "QA_PASSED":
        if (dry) return "would package deliverables";
        await light.run(() => withRetry(`${lesson} package`, dir, () => sh(["pipeline/package.ts", "--course", course, "--lesson", lesson, "--video", latestRender(lesson)!], `${lesson} package`)));
        continue;
      case "FINAL_RENDERED": return "DONE: deliverables packaged (awaiting client sign-off → DELIVERED)";
      case "DELIVERED": return "DELIVERED";
      case "FAILED": return `FAILED: ${s.history.at(-1)!.note} — inspect status.json, fix, then reset state`;
    }
  }
  return "stopped (step guard)";
};

(async () => {
  const cdir = join(P.courses, course);
  const lessons = a.lessons ? a.lessons.split(",") : readdirSync(cdir).filter((l) => existsSync(join(cdir, l, "status.json"))).sort();
  console.log(`Orchestrating ${lessons.length} lesson(s) in "${course}" — heavy slots ${a.heavy}, light slots ${a.light}`);
  const t0 = Date.now();
  const results = await Promise.allSettled(lessons.map((l) => advance(l)));
  console.log(`\nFinished in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.table(lessons.map((l, i) => ({ lesson: l, result: results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<string>).value : `ERROR ${(results[i] as PromiseRejectedResult).reason?.message}`, state: readStatus(lessonDir(course, l))?.state })));
})();
