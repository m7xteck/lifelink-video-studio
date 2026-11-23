/**
 * Builds the approval package for a lesson from its manifest:
 * a real rendered still for every scene (the actual engine, not a mock-up),
 * a contact sheet, and storyboard.md with timing, narration and on-screen text.
 *
 *   npx tsx pipeline/storyboard.ts --course <id> --lesson <id> [--orientation portrait]
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { ManifestSchema, type Scene } from "../src/schema/manifest";
import { BROWSER } from "./lib/browser";
import { P, lessonDir } from "./lib/paths";
import { ff } from "./lib/media";
import { readStatus, transition } from "./lib/status";
import { loadWords } from "./lib/transcript";

const { values: a } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" }, orientation: { type: "string", default: "landscape" } } });
const dir = lessonDir(a.course!, a.lesson!);
const m = ManifestSchema.parse(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")));
const portrait = a.orientation === "portrait";
const out = join(P.root, "storyboards", m.lessonId, portrait ? "portrait" : "landscape");
mkdirSync(join(out, "frames"), { recursive: true });

const words = (() => { try { return loadWords(a.course!, a.lesson!); } catch { return []; } })();
const spoken = (s: Scene) => words.filter((w) => w.start >= s.startSec - 0.01 && w.start < s.endSec).map((w) => w.w).join(" ");
const onScreen = (s: Scene): string => {
  const p = s.props as Record<string, unknown>;
  const strs: string[] = [];
  const walk = (v: unknown, k = "") => {
    if (typeof v === "string" && !["align", "scale", "layout", "preferred"].includes(k)) strs.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x, k));
    else if (v && typeof v === "object") Object.entries(v).forEach(([kk, vv]) => walk(vv, kk));
  };
  walk(p);
  return strs.join(" / ");
};
const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

(async () => {
  const serveUrl = await bundle({ entryPoint: join(P.root, "src/index.ts"), publicDir: join(P.root, "public") });
  const inputProps = { manifest: m, orientation: portrait ? "portrait" : "landscape", muted: true, qa: false };
  const composition = await selectComposition({ serveUrl, id: portrait ? "LessonPortrait" : "Lesson", inputProps, browserExecutable: BROWSER ?? undefined });
  const rows: string[] = [];
  for (const [i, s] of m.scenes.entries()) {
    const frame = Math.max(0, Math.round((s.endSec - 0.35) * m.fps));
    const file = join(out, "frames", `${String(i + 1).padStart(2, "0")}_${s.id}.jpg`);
    await renderStill({ composition, serveUrl, output: file, inputProps, frame, scale: 0.5, imageFormat: "jpeg", jpegQuality: 88, browserExecutable: BROWSER ?? undefined });
    rows.push(`### ${i + 1}. ${s.id} · ${s.type} · ${fmt(s.startSec)}–${fmt(s.endSec)} (${(s.endSec - s.startSec).toFixed(1)}s)\n\n![${s.id}](frames/${relative(join(out, "frames"), file)})\n\n**On screen:** ${onScreen(s)}  \n**Narration:** ${spoken(s) || "_(no transcript)_"}\n`);
  }
  ff(["-v", "error", "-pattern_type", "glob", "-i", join(out, "frames", "*.jpg"), "-vf", `scale=${portrait ? 270 : 480}:-2,tile=${portrait ? 6 : 4}x${Math.ceil(m.scenes.length / (portrait ? 6 : 4))}:padding=6:color=0x222222`, "-frames:v", "1", "-q:v", "3", join(out, "contact-sheet.jpg")]);
  const planFile = join(dir, "creative-plan.md");
  const md = [`# Storyboard — ${m.title}`, "", `Lesson \`${m.lessonId}\` · ${fmt(m.durationSec)} · ${m.scenes.length} scenes · ${m.sections.length} sections · ${portrait ? "9:16" : "16:9"}`, "",
    existsSync(planFile) ? readFileSync(planFile, "utf8") : "_No creative-plan.md yet._", "", "![contact sheet](contact-sheet.jpg)", "", "## Scenes", "", ...rows].join("\n");
  writeFileSync(join(out, "storyboard.md"), md);
  const st = readStatus(dir);
  if (st?.state === "CREATIVE_PLAN_READY") transition(dir, "AWAITING_APPROVAL", "Storyboard package generated", { storyboard: relative(P.root, join(out, "storyboard.md")) });
  console.log(`storyboard → ${relative(P.root, out)}/storyboard.md`);
})().catch((e) => { console.error(e); process.exit(1); });
