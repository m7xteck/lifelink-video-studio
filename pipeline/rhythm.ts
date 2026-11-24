/**
 * Rhythm check (production-memory/experiments/variety-v2.md, rules 1–3) on the merged manifest.
 *   npx tsx pipeline/rhythm.ts --course c --lesson l [--section sec-NN]
 * 1. Never the same scene type twice in a row; no type more than 3 times in any 8 consecutive scenes.
 * 2. (info only) text/picture share — no fixed minimums since client direction 2026-11-24 (adaptive pacing).
 * 3. Kickers: ≤ 1 per chapter, never on consecutive scenes.
 * The client-approved opening (scenes ending ≤ 60 s) is reported for information but never fails the check.
 * With --section, only violations touching that section count (the whole-lesson text share is still printed).
 * Exit 1 on any counted violation.
 */
import { parseArgs } from "node:util";
import { loadMerged } from "./sections";
import type { Scene } from "../src/schema/manifest";

export const TEXT_ONLY = new Set([
  "kineticStatement", "parallelPhrases", "statementCollision", "highlightLine", "pullQuote", "questionPrompt",
  "wordStack", "quietReflection", "reflectionField", "comparison", "takeaway",
]);
/** Not counted as a chapter's picture either (titles / brand frames). */
const NEUTRAL = new Set(["sectionTitle", "courseIntro"]);
const APPROVED_END = 60;

const { values: a } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" }, section: { type: "string" } } });
if (!a.course || !a.lesson) { console.error("usage: npx tsx pipeline/rhythm.ts --course c --lesson l [--section sec-NN]"); process.exit(2); }
const m = loadMerged(a.course, a.lesson);
const S = m.scenes;
const dur = (s: Scene) => s.endSec - s.startSec;
const approved = (s: Scene) => s.endSec <= APPROVED_END + 0.01;
const inScope = (s: Scene) => !a.section || s.sectionId === a.section;
const hasKicker = (s: Scene) => !!(s.props as { kicker?: unknown }).kicker;

const fails: string[] = [], infos: string[] = [];
const report = (msg: string, scenes: Scene[]) => {
  if (!scenes.some(inScope)) return;
  (scenes.every(approved) ? infos : fails).push(msg);
};

const SERIES = new Set(["mythTruth"]); // intentional consecutive series (see production-memory/lesson-notes/L01-v004-review-findings.md)
// Rule 1a: same type twice in a row
for (let i = 1; i < S.length; i++) {
  // The six myths are one deliberately developing series (client asked for all myths to use the tearing slip): exempt.
  if (S[i].type === S[i - 1].type && !SERIES.has(S[i].type)) report(`R1 repeat: ${S[i - 1].id} → ${S[i].id} are both ${S[i].type}`, [S[i - 1], S[i]]);
}
// Rule 1b: > 3 of one type in any 8 consecutive scenes (report each offending window start once per type run)
const seen = new Set<string>();
for (let i = 0; i + 1 < S.length; i++) {
  const win = S.slice(i, i + 8);
  const counts = new Map<string, Scene[]>();
  for (const s of win) counts.set(s.type, [...(counts.get(s.type) ?? []), s]);
  for (const [type, list] of counts) {
    if (list.length <= 3 || SERIES.has(type)) continue;
    const key = `${type}:${list.slice(0, 4).map((s) => s.id).join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    report(`R1 density: ${list.length}× ${type} in 8 scenes ${win[0].id}…${win.at(-1)!.id} (${list.map((s) => s.id).join(", ")})`, list);
  }
}
// Rule 2: text share of runtime, and picture share per chapter
const total = S.reduce((t, s) => t + dur(s), 0);
const text = S.filter((s) => TEXT_ONLY.has(s.type)).reduce((t, s) => t + dur(s), 0);
const textPct = (100 * text) / total;
const textMsg = `R2 text-only share: ${textPct.toFixed(1)} % of ${(total / 60).toFixed(1)} min (limit 50 %)`;
infos.push(textMsg.replace(" (limit 50 %)", "")); // informational: client 2026-11-24 removed fixed percentages (adaptive pacing)
for (const sec of m.sections) {
  const mine = S.filter((s) => s.sectionId === sec.id);
  if (!mine.length) continue;
  const secDur = mine.reduce((t, s) => t + dur(s), 0);
  const pic = mine.filter((s) => !TEXT_ONLY.has(s.type) && !NEUTRAL.has(s.type)).reduce((t, s) => t + dur(s), 0);
  const pct = (100 * pic) / secDur;
  const line = `R2 picture share ${sec.id}: ${pct.toFixed(1)} % (info only)`;
  if (inScope(mine[0])) infos.push(line);
  // Rule 3: kickers per chapter, and never on consecutive scenes
  const k = mine.filter(hasKicker);
  if (k.length > 1) report(`R3 kickers: ${sec.id} has ${k.length} (max 1): ${k.map((s) => s.id).join(", ")}`, k);
}
for (let i = 1; i < S.length; i++) {
  if (hasKicker(S[i]) && hasKicker(S[i - 1])) report(`R3 consecutive kickers: ${S[i - 1].id} → ${S[i].id}`, [S[i - 1], S[i]]);
}

for (const x of infos) console.log(`  ok/info  ${x}`);
for (const x of fails) console.log(`  FAIL     ${x}`);
console.log(fails.length ? `RHYTHM: ${fails.length} violation(s)${a.section ? ` in ${a.section}` : ""}` : `RHYTHM: OK${a.section ? ` (${a.section})` : ""}`);
process.exit(fails.length ? 1 : 0);
