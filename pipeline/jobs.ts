/**
 * Job ledger CLI (append-only JSONL per lesson at production/jobs/<course>/<lesson>.jsonl).
 *
 *   npx tsx pipeline/jobs.ts add    --course c --lesson l --id L01:render:v004 --kind render --owner render-engineer \
 *                                   [--deps a,b] [--inputs x,y] [--outputs p,q] [--max-retries 2] [--checkpoint path] [--note "..."]
 *   npx tsx pipeline/jobs.ts start  --course c --lesson l --id <id> [--owner role] [--force]   (refuses while deps are not done)
 *   npx tsx pipeline/jobs.ts done   --course c --lesson l --id <id> [--outputs p,q] [--checkpoint path] [--note "..."]
 *   npx tsx pipeline/jobs.ts fail   --course c --lesson l --id <id> --error "what went wrong" [--checkpoint path]
 *   npx tsx pipeline/jobs.ts block  --course c --lesson l --id <id> --note "waiting for client"
 *   npx tsx pipeline/jobs.ts retry  --course c --lesson l --id <id>        (only if attempts < maxRetries)
 *   npx tsx pipeline/jobs.ts cancel --course c --lesson l --id <id> [--note "..."]
 *   npx tsx pipeline/jobs.ts list   [--course c] [--lesson l] [--status s] [--json]
 *   npx tsx pipeline/jobs.ts ready  [--course c] [--lesson l] [--json]     (queued tasks whose deps are all done)
 *   npx tsx pipeline/jobs.ts show   --id <id> [--course c] [--lesson l]   (task + its raw events)
 *   npx tsx pipeline/jobs.ts import-workflow <workflow-transcript-dir> --course c --lesson l
 *
 * Exit codes: 0 ok, 1 usage error, 2 refused (illegal transition, retry limit, unknown task).
 * LIFELINK_JOBS_DIR overrides the ledger root (tests use temp dirs).
 */
import { parseArgs } from "node:util";
import {
  JobError, STATUSES, addTask, allTasks, blockTask, cancelTask, doneTask, failTask, importWorkflow, ledgerPath,
  listLedgers, loadTasks, readEvents, readyTasks, retryTask, startTask, type Task,
} from "./lib/jobs";

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    course: { type: "string" }, lesson: { type: "string" }, id: { type: "string" }, kind: { type: "string" }, owner: { type: "string" },
    deps: { type: "string" }, inputs: { type: "string" }, outputs: { type: "string" }, "max-retries": { type: "string" },
    checkpoint: { type: "string" }, note: { type: "string" }, error: { type: "string" }, status: { type: "string" },
    json: { type: "boolean", default: false }, force: { type: "boolean", default: false },
  },
});
const [cmd, ...rest] = positionals;
const list = (s?: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : undefined);
const usage = (msg: string): never => { console.error(msg); process.exit(1); };
const req = (k: "course" | "lesson" | "id") => a[k] ?? usage(`--${k} is required for "${cmd}"`);
const ref = () => ({ course: req("course"), lesson: req("lesson"), id: req("id") });

const time = (s?: string) => (s ? s.replace("T", " ").slice(0, 19) : "");
const dur = (t: Task) => {
  if (!t.startedAt || !t.finishedAt) return "";
  const s = Math.round((Date.parse(t.finishedAt) - Date.parse(t.startedAt)) / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s` : `${s}s`;
};
const table = (tasks: Task[]) => {
  if (!tasks.length) { console.log("(no tasks)"); return; }
  console.table(tasks.map((t) => ({
    id: t.id, lesson: t.lesson, kind: t.kind, owner: t.owner, status: t.status, tries: `${t.attempts}/${t.maxRetries}`,
    started: time(t.startedAt), finished: time(t.finishedAt), took: dur(t),
    note: (t.lastError && t.status === "failed" ? `ERR ${t.lastError}` : [t.note, t.summary].filter(Boolean).join(" · ")).slice(0, 60),
  })));
};
const print = (t: Task) => console.log(`${t.id}: ${t.status} (attempt ${t.attempts}/${t.maxRetries})${t.lastError && t.status === "failed" ? ` — ${t.lastError}` : ""}`);

try {
  switch (cmd) {
    case "add":
      print(addTask({ ...ref(), kind: a.kind, owner: a.owner, deps: list(a.deps), inputs: list(a.inputs), outputs: list(a.outputs),
        maxRetries: a["max-retries"] !== undefined ? Number(a["max-retries"]) : undefined, checkpoint: a.checkpoint, note: a.note }));
      break;
    case "start": print(startTask({ ...ref(), owner: a.owner, force: a.force })); break;
    case "done": print(doneTask({ ...ref(), outputs: list(a.outputs), checkpoint: a.checkpoint, note: a.note })); break;
    case "fail": print(failTask({ ...ref(), error: a.error ?? usage("--error is required for fail"), checkpoint: a.checkpoint })); break;
    case "block": print(blockTask({ ...ref(), note: a.note ?? usage("--note is required for block") })); break;
    case "retry": print(retryTask(ref())); break;
    case "cancel": print(cancelTask({ ...ref(), note: a.note })); break;
    case "list": {
      if (a.status && !(STATUSES as readonly string[]).includes(a.status)) usage(`--status must be one of ${STATUSES.join(", ")}`);
      const tasks = allTasks({ course: a.course, lesson: a.lesson }).filter((t) => !a.status || t.status === a.status);
      if (a.json) console.log(JSON.stringify(tasks, null, 2));
      else {
        table(tasks);
        const counts = Object.fromEntries(STATUSES.map((s) => [s, tasks.filter((t) => t.status === s).length]).filter(([, n]) => n));
        console.log(`${tasks.length} task(s):`, Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(", ") || "none");
      }
      break;
    }
    case "ready": {
      const ledgers = a.course && a.lesson ? [{ course: a.course, lesson: a.lesson }] : listLedgers(undefined, a.course);
      const ready = ledgers.flatMap((l) => readyTasks(loadTasks(l.course, l.lesson)));
      if (a.json) console.log(JSON.stringify(ready, null, 2)); else table(ready);
      break;
    }
    case "show": {
      const id = req("id");
      const ledgers = a.course && a.lesson ? [{ course: a.course, lesson: a.lesson }] : listLedgers(undefined, a.course);
      const hit = ledgers.find((l) => loadTasks(l.course, l.lesson).has(id));
      if (!hit) throw new JobError(`No task "${id}" found`);
      const task = loadTasks(hit.course, hit.lesson).get(id)!;
      const events = readEvents(ledgerPath(hit.course, hit.lesson)).filter((e) => e.id === id);
      console.log(JSON.stringify({ task, events }, null, 2));
      break;
    }
    case "import-workflow": {
      const dir = rest[0] ?? usage("usage: import-workflow <workflow-transcript-dir> --course c --lesson l");
      const r = importWorkflow(dir, req("course"), req("lesson"));
      console.log(`Imported ${r.workflow}: ${r.agents} agent(s) in journal — ${r.added} added, ${r.completed} completed since last import, ${r.unchanged} unchanged, ${r.running} still running (no result yet).`);
      break;
    }
    default:
      usage("usage: npx tsx pipeline/jobs.ts add|start|done|fail|block|retry|cancel|list|ready|show|import-workflow [flags]  (see header of pipeline/jobs.ts)");
  }
} catch (e) {
  if (e instanceof JobError) { console.error(`REFUSED: ${e.message}`); process.exit(2); }
  throw e;
}
