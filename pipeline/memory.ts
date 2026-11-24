/**
 * Creative memory CLI (production-memory/README.md explains the layers).
 *
 *   npx tsx pipeline/memory.ts brief [--course <slug>]       compact creative brief (< 120 lines) for any agent task
 *   npx tsx pipeline/memory.ts feedback add --quote "..." --scope lesson|course|global
 *        [--status applied|pending|policy-candidate] [--quote-type verbatim|excerpt|summary]
 *        [--lesson <id>] [--source "..."] [--date YYYY-MM-DD]  append one client message to feedback-log.jsonl
 *   npx tsx pipeline/memory.ts feedback list [--status pending]
 *   npx tsx pipeline/memory.ts search <term>                  case-insensitive search across production memory
 */
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

const ROOT = resolve(import.meta.dirname, "..");
const MEM = join(ROOT, "production-memory");
const LOG = join(MEM, "feedback-log.jsonl");
const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const clip = (s: string, n = 170) => { const t = s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

type Feedback = { date: string; quote: string; quote_type: string; scope: string; status: string; source?: string; lesson?: string };
const SCOPES = ["lesson", "course", "global"], STATUSES = ["applied", "pending", "policy-candidate"], QTYPES = ["verbatim", "excerpt", "summary"];

const readLog = (): Feedback[] => read(LOG).split("\n").filter((l) => l.trim()).map((l, i) => {
  try { return JSON.parse(l) as Feedback; } catch { throw new Error(`feedback-log.jsonl line ${i + 1} is not valid JSON`); }
});

/** Lines of a markdown section (from "## title" prefix to the next "## "). */
const section = (md: string, title: string) => {
  const lines = md.split("\n");
  const i = lines.findIndex((l) => l.startsWith("## ") && l.slice(3).startsWith(title));
  if (i < 0) return [];
  const j = lines.findIndex((l, k) => k > i && l.startsWith("## "));
  return lines.slice(i + 1, j < 0 ? undefined : j);
};
/** Top-level "- " bullets, with wrapped continuation lines joined (sub-bullets "  - " are dropped). */
const bullets = (lines: string[]) => {
  const out: string[] = [];
  let inSub = false;
  for (const l of lines) {
    if (l.startsWith("- ")) { out.push(l); inSub = false; }
    else if (/^\s+- /.test(l)) inSub = true;
    else if (/^\s+\S/.test(l) && out.length && !inSub) out[out.length - 1] += " " + l.trim();
    else inSub = false;
  }
  return out;
};
/** Data rows of every markdown table in the given lines (header and separator skipped). */
const tableRows = (lines: string[]) => lines.filter((l) => l.startsWith("|") && !/^\|[\s|:-]+\|$/.test(l))
  .map((l) => l.split("|").slice(1, -1).map((c) => c.trim())).filter((cells) => !/^#$|^Item$|^Layer$/.test(cells[0]));

const brief = (course?: string) => {
  const out: string[] = [];
  const ds = JSON.parse(read(join(ROOT, "brand/design-system.json")) || "{}");
  out.push(`# Creative brief (from production-memory, ${new Date().toISOString().slice(0, 10)})${course ? ` — course ${course}` : ""}`);
  out.push("Authority: LOCKED brand > preferences > course decisions > lesson notes > experiments. Never promote feedback to a global rule without asking the client.");

  out.push("", `## Brand — status ${ds.status ?? "?"} (${ds.version ?? "?"})${ds.status === "APPROVED" ? "" : ": NOT locked, watermark mandatory, never present as LifeLink-branded"}`);
  const lockedMd = read(join(MEM, "brand/LOCKED.md"));
  const locked = section(lockedMd, "Locked rules").filter((l) => l.trim());
  out.push(`Locked rules: ${locked.length ? locked.map((l) => clip(l, 120)).join(" ") : "none"}`);
  const open = tableRows(section(lockedMd, "Not yet locked"));
  if (open.length) out.push(`Not locked yet: ${open.map((r) => r[0]).join("; ")}`);
  for (const l of bullets(section(read(join(MEM, "brand/PROPOSAL.md")), "Summary"))) out.push(clip(l, 240));

  out.push("", "## Client preferences (confirmed)");
  const prefMd = read(join(MEM, "preferences.md"));
  for (const t of ["Confirmed by client", "Client direction"]) for (const l of bullets(section(prefMd, t))) out.push(clip(l));

  out.push("", "## Rejected — do not reintroduce (production-memory/rejected.md)");
  for (const r of tableRows(read(join(MEM, "rejected.md")).split("\n"))) if (/^R\d+/.test(r[0])) out.push(clip(`- ${r[0]} ${r[2]} → ${r[5]}`, 160));

  out.push("", "## Techniques that work (production-memory/techniques.md)");
  for (const r of tableRows(read(join(MEM, "techniques.md")).split("\n"))) if (/^T\d+/.test(r[0])) out.push(clip(`- ${r[0]} ${r[1]}`, 150));

  out.push("", "## Course decisions");
  const cdDir = join(MEM, "course-decisions");
  const courses = existsSync(cdDir) ? readdirSync(cdDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")) : [];
  if (course) {
    const md = read(join(cdDir, `${course}.md`));
    const items = bullets(md.split("\n"));
    out.push(...(items.length ? items.map((l) => clip(l, 260)) : [`(none recorded for ${course} yet — production-memory/course-decisions/${course}.md)`]));
  } else out.push(`Pass --course <slug> to include them. Recorded: ${courses.join(", ") || "none"}`);

  const fb = readLog().filter((f) => f.status !== "applied" && (!course || !f.lesson || f.lesson.startsWith(course)));
  if (fb.length) {
    out.push("", "## Open feedback (pending / policy candidates — ask the client, do not apply globally)");
    for (const f of fb) out.push(clip(`- ${f.date} [${f.scope}, ${f.status}] ${f.quote}`, 200));
  }
  out.push("", "Before building: failure-patterns.md (known technical traps). Timing: cue-slice.ts / find-cue.ts. Variety: rhythm.ts. Review: clip-review.py.");
  return out;
};

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (f === "graphify-out" || f.startsWith(".")) return [];
  return statSync(p).isDirectory() ? walk(p) : /\.(md|jsonl|txt)$/.test(f) ? [p] : [];
});

const [cmd, sub, ...rest] = process.argv.slice(2);
if (cmd === "brief") {
  const { values } = parseArgs({ args: process.argv.slice(3), options: { course: { type: "string" } } });
  const lines = brief(values.course);
  console.log(lines.join("\n"));
  if (lines.length >= 120) console.error(`warning: brief is ${lines.length} lines (target < 120)`);
} else if (cmd === "feedback" && sub === "add") {
  const { values } = parseArgs({ args: rest, options: {
    quote: { type: "string" }, scope: { type: "string" }, status: { type: "string", default: "pending" },
    "quote-type": { type: "string", default: "verbatim" }, lesson: { type: "string" }, source: { type: "string" },
    date: { type: "string", default: new Date().toISOString().slice(0, 10) } } });
  const err = (m: string) => { console.error(`memory feedback add: ${m}`); process.exit(2); };
  if (!values.quote?.trim()) err("--quote is required (the client's words)");
  if (!SCOPES.includes(values.scope ?? "")) err(`--scope must be one of ${SCOPES.join("|")}`);
  if (!STATUSES.includes(values.status!)) err(`--status must be one of ${STATUSES.join("|")}`);
  if (!QTYPES.includes(values["quote-type"]!)) err(`--quote-type must be one of ${QTYPES.join("|")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date!)) err("--date must be YYYY-MM-DD");
  const row: Feedback = { date: values.date!, quote: values.quote!.trim(), quote_type: values["quote-type"]!, scope: values.scope!, status: values.status!,
    ...(values.source ? { source: values.source } : {}), ...(values.lesson ? { lesson: values.lesson } : {}) };
  appendFileSync(LOG, JSON.stringify(row) + "\n");
  console.log(`appended to ${relative(ROOT, LOG)}: ${JSON.stringify(row)}`);
  if (row.scope === "global" && row.status !== "applied") console.log("Reminder: a global rule needs the client's explicit yes before it goes into preferences.md.");
} else if (cmd === "feedback" && sub === "list") {
  const { values } = parseArgs({ args: rest, options: { status: { type: "string" } } });
  for (const f of readLog().filter((x) => !values.status || x.status === values.status)) console.log(`${f.date} [${f.scope}/${f.status}${f.lesson ? `/${f.lesson}` : ""}] ${f.quote}`);
} else if (cmd === "search" && sub) {
  const term = [sub, ...rest].join(" ").toLowerCase();
  let n = 0;
  for (const f of walk(MEM)) read(f).split("\n").forEach((l, i) => {
    if (l.toLowerCase().includes(term)) { n++; console.log(`${relative(ROOT, f)}:${i + 1}: ${clip(l, 220)}`); }
  });
  if (!n) { console.log(`no matches for "${term}"`); process.exit(1); }
} else {
  console.error("usage: memory.ts brief [--course c] | feedback add --quote \"...\" --scope lesson|course|global [...] | feedback list [--status s] | search <term>");
  process.exit(2);
}
