/**
 *   npx tsx pipeline/transcribe.ts --course <id> [--lesson <id>] [--model small.en|medium.en|large-v3]
 * Transcribes every lesson in AUDIO_ANALYSED state (or one lesson) and advances it to TRANSCRIBED.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { P, lessonDir } from "./lib/paths";
import { readStatus, transition } from "./lib/status";
import { withLock } from "./lib/lock";

export const transcribeLesson = async (course: string, lessonId: string, model?: string) => withLock(`lesson-${lessonId}`, async () => {
  const dir = lessonDir(course, lessonId);
  const lesson = JSON.parse(readFileSync(join(dir, "lesson.json"), "utf8"));
  const out = join(dir, "transcript");
  const r = spawnSync("python3", ["-I", join(P.root, "pipeline/transcribe.py"), join(P.root, lesson.workingAudio), out, lessonId, ...(model ? [model] : [])],
    { encoding: "utf8", env: { ...process.env, HF_HUB_DISABLE_XET: "1" }, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    transition(dir, "FAILED", "Transcription failed", { stderr: r.stderr.slice(-1500) }, { force: true });
    throw new Error(r.stderr.slice(-1500));
  }
  const summary = JSON.parse(r.stdout.trim().split("\n").at(-1)!);
  transition(dir, "TRANSCRIBED", "Timestamped transcript created", { ...summary, files: readdirSync(out).map((f) => relative(P.root, join(out, f))) });
  return summary;
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" }, model: { type: "string" } } });
  const cdir = join(P.courses, values.course!);
  const ids = values.lesson ? [values.lesson] : readdirSync(cdir).filter((d) => existsSync(join(cdir, d, "status.json")) && readStatus(join(cdir, d))?.state === "AUDIO_ANALYSED");
  (async () => { for (const id of ids) console.log(await transcribeLesson(values.course!, id, values.model)); })().catch((e) => { console.error(e.message); process.exit(1); });
}
