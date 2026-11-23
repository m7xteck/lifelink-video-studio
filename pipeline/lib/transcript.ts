import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lessonDir } from "./paths";

export type Word = { w: string; start: number; end: number; p: number };
export const loadWords = (course: string, lesson: string): Word[] => {
  const f = join(lessonDir(course, lesson), "transcript", `${lesson}.transcript.json`);
  if (!existsSync(f)) throw new Error(`No transcript for ${lesson}`);
  return JSON.parse(readFileSync(f, "utf8")).segments.flatMap((s: { words: Word[] }) => s.words);
};

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, "").trim();

/** Find when a phrase is spoken. Returns every match with start/end in seconds. */
export const findPhrase = (words: Word[], phrase: string) => {
  const target = norm(phrase).split(/\s+/);
  const hits: { start: number; end: number; text: string }[] = [];
  for (let i = 0; i <= words.length - target.length; i++) {
    if (target.every((t, j) => norm(words[i + j].w) === t)) {
      hits.push({ start: words[i].start, end: words[i + target.length - 1].end, text: words.slice(i, i + target.length).map((w) => w.w).join(" ") });
    }
  }
  return hits;
};
