/** npx tsx pipeline/status.ts [--course <id>]  — production dashboard read from disk (never from memory). */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { P } from "./lib/paths";
import { readStatus } from "./lib/status";

const { values } = parseArgs({ options: { course: { type: "string" } } });
const courses = values.course ? [values.course] : readdirSync(P.courses).filter((c) => !c.startsWith("."));
const rows: Record<string, unknown>[] = [];
for (const c of courses) {
  const cdir = join(P.courses, c);
  if (!existsSync(cdir)) continue;
  for (const l of readdirSync(cdir)) {
    const s = readStatus(join(cdir, l));
    if (!s) continue;
    const last = s.history.at(-1)!;
    rows.push({ course: c, lesson: l, state: s.state, approval: s.approval.creative, updated: last.at.replace("T", " ").slice(0, 16), note: last.note.slice(0, 60) });
  }
}
console.table(rows);
