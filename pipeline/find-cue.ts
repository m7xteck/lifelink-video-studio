/** npx tsx pipeline/find-cue.ts --course <id> --lesson <id> "phrase as spoken"  → exact timestamps */
import { parseArgs } from "node:util";
import { findPhrase, loadWords } from "./lib/transcript";
const { values, positionals } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" } }, allowPositionals: true });
const hits = findPhrase(loadWords(values.course!, values.lesson!), positionals.join(" "));
console.log(hits.length ? hits : "No match — check wording against the transcript.");
