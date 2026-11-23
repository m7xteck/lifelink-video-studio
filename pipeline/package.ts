/**
 * Assembles the deliverable folder for a QA-passed lesson:
 *   deliverables/<course>/<lesson>/  video, SRT, transcript, timeline/manifest, thumbnail,
 *   QA report, version history, source references, social adaptation plan.
 *   npx tsx pipeline/package.ts --course <id> --lesson <id> --video <render.mp4>
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { ManifestSchema } from "../src/schema/manifest";
import { P, lessonDir } from "./lib/paths";
import { ff } from "./lib/media";
import { readStatus, transition } from "./lib/status";

export const packageLesson = (course: string, lesson: string, video: string) => {
  const dir = lessonDir(course, lesson);
  const m = ManifestSchema.parse(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")));
  const qaReport = join(P.qa, lesson, basename(video, ".mp4"), "report.json");
  if (!existsSync(qaReport) || JSON.parse(readFileSync(qaReport, "utf8")).result !== "PASS") throw new Error("Refusing to package: no passing QA report for this exact render");
  const out = join(P.root, "deliverables", course, lesson);
  mkdirSync(out, { recursive: true });
  const name = `${lesson}_${m.title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}`;
  copyFileSync(video, join(out, `${name}_1080p.mp4`));
  for (const ext of ["srt", "txt", "transcript.json"]) {
    const f = join(dir, "transcript", `${lesson}.${ext}`);
    if (existsSync(f)) copyFileSync(f, join(out, `${name}.${ext}`));
  }
  copyFileSync(join(dir, "manifest.json"), join(out, `${name}.timeline.json`));
  copyFileSync(qaReport, join(out, "qa-report.json"));
  copyFileSync(qaReport.replace(/\.json$/, ".md"), join(out, "qa-report.md"));
  // Thumbnail: settled frame of the first section title (or first scene), 1280×720.
  const t = m.scenes.find((s) => s.type === "sectionTitle") ?? m.scenes[0];
  ff(["-v", "error", "-ss", String(Math.max(0, t.endSec - 0.4)), "-i", video, "-frames:v", "1", "-vf", "scale=1280:720", "-q:v", "2", join(out, `${name}_thumbnail.jpg`)]);
  const status = readStatus(dir)!;
  writeFileSync(join(out, "version-history.json"), JSON.stringify({ status: status.history, approval: status.approval }, null, 2));
  const lessonMeta = existsSync(join(dir, "lesson.json")) ? JSON.parse(readFileSync(join(dir, "lesson.json"), "utf8")) : {};
  writeFileSync(join(out, "sources.json"), JSON.stringify({ narration: lessonMeta.original ?? m.audio, sha256: lessonMeta.sha256 ?? null, designSystem: JSON.parse(readFileSync(P.designSystem, "utf8")).version, remotionSource: "src/ (this repository)", fonts: "public/fonts (see LICENSE.md)" }, null, 2));
  const social = [`# Social adaptation plan — ${m.title}`, "", "Portrait (9:16) versions are recomposed by the engine (layouts re-flow; nothing is cropped). Candidate clips, chosen for self-contained teaching moments:", "",
    ...m.scenes.filter((s) => ["kineticStatement", "stepsDiagram", "connectionMetaphor", "takeaway", "quietReflection"].includes(s.type)).map((s) => `- **${s.id}** (${s.type}) ${s.startSec.toFixed(1)}–${s.endSec.toFixed(1)}s — render with \`npm run render -- --course ${course} --lesson ${lesson} --orientation portrait --from ${s.startSec} --to ${s.endSec}\``),
    "", "Each clip needs client approval before publishing."].join("\n");
  writeFileSync(join(out, "social-adaptation-plan.md"), social);
  if (status.state === "QA_PASSED") transition(dir, "FINAL_RENDERED", "Deliverables packaged", { folder: relative(P.root, out) });
  return out;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" }, video: { type: "string" } } });
  console.log(packageLesson(values.course!, values.lesson!, values.video!));
}
