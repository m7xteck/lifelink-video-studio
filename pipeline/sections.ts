/**
 * Section files: each section's scenes live in courses/<c>/<l>/sections/<sectionId>.json
 * ({ section: {id,title,startSec,endSec}, scenes: [...] }), so sections can be planned and built
 * in parallel without editing the same manifest.
 *   npx tsx pipeline/sections.ts check --course c --lesson l --section <id>   validate base + that section (no write)
 *   npx tsx pipeline/sections.ts merge --course c --lesson l                  write manifest.json from base + all sections
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { ManifestSchema, type Manifest } from "../src/schema/manifest";
import { lessonDir } from "./lib/paths";

type SectionFile = { section: Manifest["sections"][number]; scenes: Manifest["scenes"] };

export const loadMerged = (course: string, lesson: string, only?: string): Manifest => {
  const dir = lessonDir(course, lesson);
  const base = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const sdir = join(dir, "sections");
  const files = existsSync(sdir) ? readdirSync(sdir).filter((f) => f.endsWith(".json") && (!only || f === `${only}.json`)) : [];
  for (const f of files) {
    const sf: SectionFile = JSON.parse(readFileSync(join(sdir, f), "utf8"));
    base.sections = base.sections.filter((s: { id: string }) => s.id !== sf.section.id).concat(sf.section);
    base.scenes = base.scenes.filter((s: { sectionId: string }) => s.sectionId !== sf.section.id).concat(sf.scenes);
  }
  base.sections.sort((x: { startSec: number }, y: { startSec: number }) => x.startSec - y.startSec);
  base.scenes.sort((x: { startSec: number }, y: { startSec: number }) => x.startSec - y.startSec);
  const m = ManifestSchema.parse(base);
  // structural checks the schema can't express
  const errs: string[] = [];
  m.scenes.forEach((s, i) => {
    const prev = m.scenes[i - 1];
    if (prev && Math.abs(s.startSec - prev.endSec) > 0.05) errs.push(`gap/overlap between ${prev.id} (ends ${prev.endSec}) and ${s.id} (starts ${s.startSec})`);
    const sec = m.sections.find((x) => x.id === s.sectionId);
    if (!sec) errs.push(`${s.id}: unknown section ${s.sectionId}`);
    else if (s.startSec < sec.startSec - 0.01 || s.endSec > sec.endSec + 0.01) errs.push(`${s.id} outside its section ${sec.id}`);
  });
  if (new Set(m.scenes.map((s) => s.id)).size !== m.scenes.length) errs.push("duplicate scene ids");
  if (errs.length && !only) throw new Error(errs.join("\n"));
  if (only) {
    const mine = errs.filter((e) => e.includes(only) || m.scenes.some((s) => s.sectionId === only && e.includes(s.id)));
    if (mine.length) throw new Error(mine.join("\n"));
  }
  return m;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values: a, positionals } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" }, section: { type: "string" } }, allowPositionals: true });
  const cmd = positionals[0];
  const m = loadMerged(a.course!, a.lesson!, cmd === "check" ? a.section : undefined);
  if (cmd === "merge") {
    writeFileSync(join(lessonDir(a.course!, a.lesson!), "manifest.json"), JSON.stringify(m, null, 2));
    console.log(`merged: ${m.sections.length} sections, ${m.scenes.length} scenes, ends ${m.scenes.at(-1)?.endSec}s`);
  } else console.log(`VALID: section ${a.section} (${m.scenes.filter((s) => s.sectionId === a.section).length} scenes)`);
}
