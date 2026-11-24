/**
 * Quick stills at chosen narration times (for self-checking scenes/components).
 *   npx tsx pipeline/still.ts --course <id> --lesson <id> [--section sec-05] --at 290,300.5,330 [--out dir] [--scale 0.5]
 * --section merges that section file into the base manifest in memory (unmerged edits are visible).
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { BROWSER } from "./lib/browser";
import { loadMerged } from "./sections";

const { values: a } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" }, section: { type: "string" }, at: { type: "string" }, out: { type: "string", default: "/tmp/stills" }, scale: { type: "string", default: "0.5" } } });
const m = loadMerged(a.course!, a.lesson!, a.section);
const times = a.at!.split(",").map(Number);
mkdirSync(a.out!, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(process.cwd(), "src/index.ts") });
const inputProps = { manifest: m, orientation: "landscape", muted: true, qa: false };
const comp = await selectComposition({ serveUrl, id: "Lesson", inputProps, browserExecutable: BROWSER });
for (const t of times) {
  const out = join(a.out!, `t${t.toFixed(2)}.png`);
  await renderStill({ serveUrl, composition: comp, inputProps, frame: Math.round(t * comp.fps), output: out, scale: Number(a.scale), browserExecutable: BROWSER });
  console.log(out);
}
rmSync(serveUrl, { recursive: true, force: true }); // bundles are ~450 MB each; leaking them fills the disk
