/** Compact word timings for a window (what agents read instead of the 570 KB transcript JSON).
 *   npx tsx pipeline/cue-slice.ts --course c --lesson l --from 60 --to 240
 * Output: one line per word "start<TAB>word" (low-confidence words marked "?"), and "--- pause N s" lines. */
import { parseArgs } from "node:util";
import { loadWords } from "./lib/transcript";
const { values: a } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" }, from: { type: "string" }, to: { type: "string" } } });
const from = Number(a.from ?? 0), to = Number(a.to ?? 1e9);
const words = loadWords(a.course!, a.lesson!).filter((w) => w.start >= from && w.start < to);
const out: string[] = [];
words.forEach((w, i) => {
  if (i && w.start - words[i - 1].end >= 0.5) out.push(`--- pause ${(w.start - words[i - 1].end).toFixed(2)} s`);
  out.push(`${w.start.toFixed(2)}\t${w.w}${w.p < 0.5 ? " ?" : ""}`);
});
console.log(out.join("\n"));
