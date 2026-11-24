/**
 * Board → studio inbox (documentation/board/DATA-CONTRACT.md). Reads the comments / approvals / requests documents
 * that Claude saved with ArtifactData `list --out_dir`, acts on each doc with status "new", and writes the status
 * updates back as files + writes.json (ArtifactData batch entries, op "update", if_version when the saved doc had one).
 *
 *   npx tsx pipeline/board-inbox.ts --root <repo> --in <out_dir> --out <dir> [--now <iso>]
 *
 * - comments  → ledger task (kind revision, owner Revision Director) with lesson/version/chapter/timecode/scene/text.
 * - approvals → a dated row in production-memory/decisions.md quoting the note verbatim ("|" escaped as "\|").
 *               A lesson-level item ("lesson:<L>:creative" or "lesson:<L>:v<NNN>") with decision approve also runs the
 *               approve.ts logic (recordApproval + transition) on <root>'s status.json, only if the state machine allows.
 *               changes / reject also create a ledger revision task.
 * - requests  → retry (jobs retryTask, respects maxRetries), cancel (cancelTask), prioritise (a ledger note task).
 *               Anything the ledger refuses is answered with status "refused" and the reason.
 * Idempotent: docs not "new" are skipped, and every processed doc is logged in <root>/production/board-inbox.jsonl,
 * so running again on the same saved files re-emits the same update without acting twice.
 * Writes only under --root (ledger, decisions.md, status.json, the processed log) and --out.
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { addTask, allTasks, cancelTask, JobError, loadTasks, retryTask } from "./lib/jobs";
import { readStatus, recordApproval, transition } from "./lib/status";
import { ApprovalSchema, argMap, CommentSchema, readInboxDir, RequestSchema, writeDocs, type InboxDoc, type OutDoc } from "./lib/board-data";

export type InboxResult = { collection: string; docId: string; outcome: "processed" | "skipped" | "replayed" | "error"; status?: string; detail: string };

const fmtTime = (s?: number) => (s == null ? "?" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}${s % 1 ? `.${String(Math.round((s % 1) * 10))}` : ""}`);

/** The approve.ts logic for an "approved" decision, against an explicit lesson dir. Returns null if applied, else the reason. */
export const applyLessonApproval = (dir: string, by: string, note: string): string | null => {
  const s = readStatus(dir);
  if (!s) return `no status.json in ${dir}`;
  if (s.state !== "AWAITING_APPROVAL" && s.state !== "REVISION_REQUIRED") return `status.json is ${s.state}; nothing is awaiting approval, so the state machine does not allow APPROVED`;
  if (s.state === "REVISION_REQUIRED") return `status.json is REVISION_REQUIRED; approve.ts only moves AWAITING_APPROVAL → APPROVED`;
  recordApproval(dir, "approved", by, note);
  transition(dir, "APPROVED", "Client approved creative plan (board)", { note, via: "board approvals" });
  return null;
};

export const processInbox = (o: { root: string; inDir: string; outDir: string; now?: string }) => {
  const root = resolve(o.root);
  const jobsRoot = join(root, "production/jobs");
  const decisions = join(root, "production-memory/decisions.md");
  const logFile = join(root, "production/board-inbox.jsonl");
  const now = o.now ?? new Date().toISOString();
  const results: InboxResult[] = [];
  const updates: OutDoc[] = [];

  const log = new Map<string, Record<string, unknown>>();
  if (existsSync(logFile)) for (const l of readFileSync(logFile, "utf8").split("\n")) { try { const e = JSON.parse(l); log.set(`${e.collection}/${e.docId}`, e.update); } catch {} }
  const remember = (d: InboxDoc, update: Record<string, unknown>) => { mkdirSync(dirname(logFile), { recursive: true }); appendFileSync(logFile, JSON.stringify({ at: now, collection: d.collection, docId: d.docId, update }) + "\n"); };

  const coursesDir = join(root, "courses");
  const findLesson = (id: string): { course: string; lesson: string } | null => {
    for (const c of existsSync(coursesDir) ? readdirSync(coursesDir) : []) {
      if (c.startsWith(".") || !existsSync(join(coursesDir, c))) continue;
      for (const l of readdirSync(join(coursesDir, c), { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name))
        if (l === id || l.endsWith(`-${id}`)) return { course: c, lesson: l };
    }
    return null;
  };
  const appendDecision = (date: string, text: string, by: string, ref: string) => {
    const md = existsSync(decisions) ? readFileSync(decisions, "utf8") : "# Decision log\n\n| Date | Decision | By | Evidence |\n|---|---|---|---|\n";
    if (md.includes(ref)) return false; // already recorded (idempotent)
    mkdirSync(dirname(decisions), { recursive: true });
    const esc = (s: string) => s.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
    appendFileSync(decisions, `${md.endsWith("\n") || !md ? "" : "\n"}| ${date} | ${esc(text)} | ${esc(by)} | ${ref} |\n`);
    return true;
  };
  const revisionTask = (id: string, where: { course: string; lesson: string }, note: string, inputs: string[]) => {
    const existing = loadTasks(where.course, where.lesson, jobsRoot).get(id);
    if (existing) return existing.id;
    return addTask({ course: where.course, lesson: where.lesson, id, root: jobsRoot, kind: "revision", owner: "Revision Director", note, inputs }).id;
  };

  for (const d of readInboxDir(o.inDir)) {
    const key = `${d.collection}/${d.docId}`;
    const status = d.data.status;
    if (status !== "new") { results.push({ collection: d.collection, docId: d.docId, outcome: "skipped", status: String(status), detail: `status is "${status}", not "new"` }); continue; }
    const push = (update: Record<string, unknown>, outcome: InboxResult["outcome"], detail: string) => {
      updates.push({ collection: d.collection, docId: d.docId, op: "update", ifVersion: d.version, data: update });
      results.push({ collection: d.collection, docId: d.docId, outcome, status: String(update.status), detail });
    };
    if (log.has(key)) { push(log.get(key)!, "replayed", "already processed earlier; same update re-emitted, nothing done twice"); continue; }
    const by = String(d.data.by ?? "board viewer");
    const date = String(d.data.at ?? now).slice(0, 10);
    try {
      if (d.collection === "comments") {
        const c = CommentSchema.parse(d.data);
        const where = findLesson(c.lessonId);
        if (!where) { results.push({ collection: d.collection, docId: d.docId, outcome: "error", detail: `unknown lesson "${c.lessonId}" under ${coursesDir}; left as new` }); continue; }
        const note = `Board comment on ${where.lesson}${c.version ? ` v${c.version}` : ""}${c.chapterId ? `, chapter ${c.chapterId}` : ""}${c.atSec != null ? `, at ${fmtTime(c.atSec)} (${c.atSec}s)` : ""}${c.sceneId ? `, scene ${c.sceneId}` : ""} by ${by}: "${c.text}"`;
        const taskId = revisionTask(`board:comment:${d.docId}`, where, note, [`board comments/${d.docId}`]);
        const update = { status: "task-created", taskId, processedAt: now };
        remember(d, update); push(update, "processed", `ledger task ${taskId}`);
      } else if (d.collection === "approvals") {
        const a = ApprovalSchema.parse(d.data);
        const ref = `board approvals/${d.docId}`;
        const verb = a.decision === "approve" ? "approved" : a.decision === "changes" ? "requested changes on" : "rejected";
        appendDecision(date, `Board: ${verb} ${a.itemRef}. Note (verbatim): "${a.note}"`, `${by} (board)`, ref);
        const recordedIn = ["production-memory/decisions.md"];
        const notes: string[] = [];
        let taskId: string | undefined;
        const p = a.itemRef.split(":");
        const lessonLevel = p[0] === "lesson" && p.length === 3 && (p[2] === "creative" || /^v\d+$/.test(p[2]));
        const where = p[0] === "lesson" && p[1] ? findLesson(p[1]) : null;
        if (a.decision === "approve" && lessonLevel) {
          if (!where) notes.push(`lesson "${p[1]}" not found; recorded in decisions.md only`);
          else {
            const why = applyLessonApproval(join(coursesDir, where.course, where.lesson), by, a.note);
            if (why) notes.push(`status.json not changed: ${why}. Recorded in decisions.md only`);
            else { recordedIn.push(`courses/${where.course}/${where.lesson}/status.json`); notes.push("status.json: approval recorded, state → APPROVED"); }
          }
        } else if (a.decision === "approve") notes.push("not a lesson-level item, so status.json is unchanged");
        if (a.decision !== "approve") {
          // Items that are not about one lesson (e.g. "board-design", "limiter") go to the studio-level ledger.
          const target = where ?? { course: "studio", lesson: "board" };
          taskId = revisionTask(`board:approval:${d.docId}`, target, `Board ${a.decision} on ${a.itemRef} by ${by}: "${a.note}"`, [ref]);
          notes.push(`revision task ${taskId} in production/jobs/${target.course}/${target.lesson}.jsonl`);
        }
        const update = { status: "recorded", recordedIn: recordedIn.join(" + "), ...(taskId ? { taskId } : {}), result: notes.join("; ") || "recorded", processedAt: now };
        remember(d, update); push(update, "processed", update.result);
      } else {
        const r = RequestSchema.parse(d.data);
        const task = allTasks({ root: jobsRoot }).find((t) => t.id === r.jobId);
        let update: Record<string, unknown>;
        if (!task) update = { status: "refused", result: `No job "${r.jobId}" in the ledger (${jobsRoot}).`, processedAt: now };
        else {
          const ref = { course: task.course, lesson: task.lesson, id: task.id, root: jobsRoot };
          try {
            if (r.action === "retry") { retryTask(ref); update = { status: "accepted", result: `Re-queued (attempt ${task.attempts + 1} of ${task.maxRetries} allowed). The studio runs it at its next check.`, processedAt: now }; }
            else if (r.action === "cancel") { cancelTask({ ...ref, note: `Cancelled from the board by ${by}${r.note ? `: "${r.note}"` : ""}` }); update = { status: "done", result: "Cancelled in the ledger.", processedAt: now }; }
            else {
              const id = `board:priority:${d.docId}`;
              if (!loadTasks(task.course, task.lesson, jobsRoot).has(id)) addTask({ course: task.course, lesson: task.lesson, id, root: jobsRoot, kind: "priority-request", owner: "Production Director", note: `Prioritise ${task.id} (requested by ${by}${r.note ? `: "${r.note}"` : ""})`, inputs: [task.id] });
              update = { status: "accepted", result: `Priority noted in the ledger as ${id}; the studio orders work at its next check.`, processedAt: now };
            }
          } catch (e) {
            if (!(e instanceof JobError)) throw e;
            update = { status: "refused", result: e.message, processedAt: now };
          }
        }
        remember(d, update); push(update, "processed", String(update.result));
      }
    } catch (e) {
      results.push({ collection: d.collection, docId: d.docId, outcome: "error", detail: (e as Error).message.slice(0, 300) });
    }
  }
  const listed = writeDocs(resolve(o.outDir), updates);
  return { results, listed };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = argMap(process.argv.slice(2));
  if (typeof a.root !== "string" || typeof a.in !== "string" || typeof a.out !== "string") { console.error("usage: board-inbox.ts --root <repo> --in <out_dir> --out <dir> [--now <iso>]"); process.exit(2); }
  const { results } = processInbox({ root: a.root, inDir: a.in, outDir: a.out, now: a.now as string | undefined });
  for (const r of results) console.log(`${r.outcome.padEnd(9)} ${r.collection}/${r.docId}${r.status ? ` → ${r.status}` : ""}: ${r.detail}`);
  console.log(`${results.filter((r) => r.outcome === "processed").length} processed, ${results.filter((r) => r.outcome === "replayed").length} replayed, ${results.filter((r) => r.outcome === "skipped").length} skipped, ${results.filter((r) => r.outcome === "error").length} errors → ${resolve(a.out)}/writes.json`);
}
