import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, unlinkSync, writeSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { P } from "./paths";

/**
 * Job ledger: one append-only JSONL file per lesson at
 *   production/jobs/<course>/<lesson>.jsonl
 * Each line is an event; lines are never rewritten. The current state of a task
 * is the fold of its events. Times are the moment each event happened
 * (imported workflow events carry the real time recorded by the agent run, plus
 * `recordedAt` = when the ledger line was written).
 *
 * Writes: every state change takes a short per-ledger O_EXCL lock (fast poll,
 * stale-PID reclaim), re-reads the ledger, validates the transition and appends
 * ONE line with a single O_APPEND write. So concurrent writers never lose or
 * interleave events, and illegal transitions are refused.
 *
 * Retries: `attempts` counts starts. A failed task may be re-queued only while
 * attempts < maxRetries (default 2).
 */

export const STATUSES = ["queued", "running", "done", "failed", "blocked", "cancelled"] as const;
export type JobStatus = (typeof STATUSES)[number];

export type Task = {
  id: string; course: string; lesson: string; kind: string; owner: string;
  deps: string[]; inputs: string[]; outputs: string[];
  status: JobStatus; startedAt?: string; finishedAt?: string;
  attempts: number; maxRetries: number; lastError?: string; checkpoint?: string; note?: string;
  createdAt?: string; updatedAt?: string;
  source?: string; workflow?: string; agentId?: string; phase?: string; summary?: string;
};

export type EventType = "add" | "start" | "done" | "fail" | "block" | "retry" | "cancel";
export type JobEvent = {
  v: 1; type: EventType; id: string; at: string | null; pid: number;
  recordedAt?: string;
  fields?: Partial<Task>;
};

export const jobsRoot = () => process.env.LIFELINK_JOBS_DIR || join(P.root, "production/jobs");
export const ledgerPath = (course: string, lesson: string, root = jobsRoot()) => join(root, safe(course), `${safe(lesson)}.jsonl`);
const safe = (s: string) => { if (!s || /[\\/]|^\.\.?$/.test(s)) throw new Error(`Bad course/lesson id: "${s}"`); return s; };

// ---------- reading & folding ----------

export const readEvents = (file: string): JobEvent[] => {
  if (!existsSync(file)) return [];
  const out: JobEvent[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* a torn final line is ignored, never fatal */ }
  }
  return out;
};

export const fold = (events: JobEvent[], course = "", lesson = ""): Map<string, Task> => {
  const tasks = new Map<string, Task>();
  for (const e of events) {
    const f = e.fields ?? {};
    if (e.type === "add") {
      if (tasks.has(e.id)) continue;
      tasks.set(e.id, {
        id: e.id, course: f.course ?? course, lesson: f.lesson ?? lesson, kind: f.kind ?? "task", owner: f.owner ?? "",
        deps: f.deps ?? [], inputs: f.inputs ?? [], outputs: f.outputs ?? [], status: "queued",
        attempts: 0, maxRetries: f.maxRetries ?? 2, checkpoint: f.checkpoint, note: f.note,
        createdAt: e.at ?? undefined, updatedAt: e.at ?? undefined,
        source: f.source, workflow: f.workflow, agentId: f.agentId, phase: f.phase, summary: f.summary,
      });
      continue;
    }
    const t = tasks.get(e.id);
    if (!t) continue;
    const at = e.at ?? undefined;
    if (at) t.updatedAt = at;
    if (f.owner) t.owner = f.owner;
    if (f.outputs?.length) t.outputs = [...new Set([...t.outputs, ...f.outputs])];
    if (f.checkpoint) t.checkpoint = f.checkpoint;
    if (f.note !== undefined) t.note = f.note;
    if (f.summary !== undefined) t.summary = f.summary;
    switch (e.type) {
      case "start": t.status = "running"; t.attempts++; t.startedAt = at; t.finishedAt = undefined; break;
      case "done": t.status = "done"; t.finishedAt = at; break;
      case "fail": t.status = "failed"; t.finishedAt = at; t.lastError = f.lastError ?? "unknown error"; break;
      case "block": t.status = "blocked"; break;
      case "retry": t.status = "queued"; t.finishedAt = undefined; break;
      case "cancel": t.status = "cancelled"; t.finishedAt = at; break;
    }
  }
  return tasks;
};

export const loadTasks = (course: string, lesson: string, root = jobsRoot()) =>
  fold(readEvents(ledgerPath(course, lesson, root)), course, lesson);

/** Every ledger under the jobs root (optionally one course). */
export const listLedgers = (root = jobsRoot(), course?: string): { course: string; lesson: string; file: string }[] => {
  if (!existsSync(root)) return [];
  const courses = course ? [course] : readdirSync(root).filter((c) => statSync(join(root, c)).isDirectory());
  return courses.flatMap((c) => {
    const d = join(root, c);
    if (!existsSync(d)) return [];
    return readdirSync(d).filter((f) => f.endsWith(".jsonl")).map((f) => ({ course: c, lesson: basename(f, ".jsonl"), file: join(d, f) }));
  });
};

export const allTasks = (opts: { root?: string; course?: string; lesson?: string } = {}): Task[] => {
  const root = opts.root ?? jobsRoot();
  const ledgers = opts.course && opts.lesson ? [{ course: opts.course, lesson: opts.lesson }] : listLedgers(root, opts.course);
  return ledgers.flatMap((l) => [...loadTasks(l.course, l.lesson, root).values()]);
};

/** Queued tasks whose dependencies are all done (deps are looked up in the same ledger). */
export const readyTasks = (tasks: Map<string, Task>): Task[] =>
  [...tasks.values()].filter((t) => t.status === "queued" && t.deps.every((d) => tasks.get(d)?.status === "done"));

// ---------- writing ----------

const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === "EPERM"; } };
const sleepSync = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Short synchronous O_EXCL lock next to the ledger (polls every 10–30 ms; reclaims dead-PID or >60 s old locks). */
export const withLedgerLock = <T>(file: string, fn: () => T, timeoutMs = 30_000): T => {
  mkdirSync(dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  const t0 = Date.now();
  for (;;) {
    try {
      const fd = openSync(lock, "wx");
      writeSync(fd, String(process.pid));
      closeSync(fd);
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        const pid = Number(readFileSync(lock, "utf8"));
        const age = Date.now() - statSync(lock).mtimeMs;
        if ((pid && !alive(pid)) || age > 60_000) { unlinkSync(lock); continue; }
      } catch { continue; /* lock vanished between calls: retry at once */ }
      if (Date.now() - t0 > timeoutMs) throw new Error(`Timed out waiting for ledger lock ${lock}`);
      sleepSync(10 + Math.random() * 20);
    }
  }
  try { return fn(); } finally { try { unlinkSync(lock); } catch {} }
};

/** One line, one write(2) with O_APPEND. */
const appendEvents = (file: string, events: JobEvent[]) => {
  if (!events.length) return;
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, events.map((e) => JSON.stringify(e)).join("\n") + "\n", { flag: "a" });
};

const now = () => new Date().toISOString();
const ev = (type: EventType, id: string, fields?: Partial<Task>, at: string | null = now()): JobEvent =>
  ({ v: 1, type, id, at, pid: process.pid, ...(fields && Object.keys(fields).length ? { fields: clean(fields) } : {}) });
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export class JobError extends Error {}

type Ref = { course: string; lesson: string; id: string; root?: string };

const mutate = (r: Ref, decide: (t: Task | undefined, tasks: Map<string, Task>) => JobEvent[]): Task => {
  const file = ledgerPath(r.course, r.lesson, r.root);
  return withLedgerLock(file, () => {
    const tasks = fold(readEvents(file), r.course, r.lesson);
    const events = decide(tasks.get(r.id), tasks);
    appendEvents(file, events);
    return fold(readEvents(file), r.course, r.lesson).get(r.id)!;
  });
};

const need = (t: Task | undefined, id: string, allowed: JobStatus[], action: string): Task => {
  if (!t) throw new JobError(`No task "${id}" in this ledger`);
  if (!allowed.includes(t.status)) throw new JobError(`Cannot ${action} task "${id}": it is ${t.status} (allowed from: ${allowed.join(", ")})`);
  return t;
};

export type AddInput = Ref & Partial<Pick<Task, "kind" | "owner" | "deps" | "inputs" | "outputs" | "maxRetries" | "checkpoint" | "note">>;
export const addTask = (a: AddInput) => mutate(a, (t) => {
  if (t) throw new JobError(`Task "${a.id}" already exists (${t.status})`);
  return [ev("add", a.id, { course: a.course, lesson: a.lesson, kind: a.kind ?? "task", owner: a.owner ?? "", deps: a.deps ?? [], inputs: a.inputs ?? [], outputs: a.outputs ?? [], maxRetries: a.maxRetries ?? 2, checkpoint: a.checkpoint, note: a.note })];
});

export const startTask = (r: Ref & { owner?: string; force?: boolean }) => mutate(r, (t, tasks) => {
  const task = need(t, r.id, ["queued", "blocked"], "start");
  const open = task.deps.filter((d) => tasks.get(d)?.status !== "done");
  if (open.length && !r.force) throw new JobError(`Cannot start "${r.id}": dependencies not done: ${open.map((d) => `${d} (${tasks.get(d)?.status ?? "missing"})`).join(", ")}`);
  return [ev("start", r.id, { owner: r.owner })];
});

export const doneTask = (r: Ref & { outputs?: string[]; checkpoint?: string; note?: string }) => mutate(r, (t) => {
  need(t, r.id, ["running"], "finish");
  return [ev("done", r.id, { outputs: r.outputs, checkpoint: r.checkpoint, note: r.note })];
});

export const failTask = (r: Ref & { error: string; checkpoint?: string }) => mutate(r, (t) => {
  need(t, r.id, ["running", "queued"], "fail");
  return [ev("fail", r.id, { lastError: r.error, checkpoint: r.checkpoint })];
});

export const blockTask = (r: Ref & { note: string }) => mutate(r, (t) => {
  need(t, r.id, ["queued", "running"], "block");
  return [ev("block", r.id, { note: r.note })];
});

export const retryTask = (r: Ref) => mutate(r, (t) => {
  const task = need(t, r.id, ["failed"], "retry");
  if (task.attempts >= task.maxRetries) throw new JobError(`Retry limit reached for "${r.id}": ${task.attempts} attempt(s), maxRetries ${task.maxRetries}. Last error: ${task.lastError}`);
  return [ev("retry", r.id)];
});

export const cancelTask = (r: Ref & { note?: string }) => mutate(r, (t) => {
  need(t, r.id, ["queued", "running", "blocked", "failed"], "cancel");
  return [ev("cancel", r.id, { note: r.note })];
});

// ---------- workflow journal import ----------

type JournalLine = { type: string; agentId?: string; label?: string; phase?: string; result?: unknown };

/** First and last "timestamp" values in an agent transcript (real times written by the run). */
export const agentTimes = (file: string): { first?: string; last?: string } => {
  if (!existsSync(file)) return {};
  const text = readFileSync(file, "utf8");
  const re = /"timestamp":"([^"]+)"/;
  const first = re.exec(text)?.[1];
  const i = text.lastIndexOf('"timestamp":"');
  const last = i >= 0 ? re.exec(text.slice(i))?.[1] : undefined;
  return { first, last };
};

const summarise = (r: unknown): string => {
  if (r == null) return "";
  if (typeof r === "string") return r.slice(0, 200);
  if (typeof r === "object") {
    const o = r as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.verdict === "string") parts.push(o.verdict);
    for (const k of ["fixed", "open", "issues", "failures"]) if (Array.isArray(o[k])) parts.push(`${k}: ${(o[k] as unknown[]).length}`);
    if (typeof o.summary === "string") parts.push(o.summary.slice(0, 160));
    return parts.join(" · ") || JSON.stringify(r).slice(0, 160);
  }
  return String(r).slice(0, 200);
};

export type ImportReport = { workflow: string; agents: number; added: number; completed: number; unchanged: number; running: number };

/**
 * Convert a Workflow-tool transcript directory (journal.jsonl + agent-<id>.jsonl) into ledger tasks.
 * Task id = <workflow-dir-name>:<agentId>. Idempotent: existing tasks are skipped, a task imported
 * while still running gets its done/fail event when the journal later has its result.
 */
export const importWorkflow = (dir: string, course: string, lesson: string, root = jobsRoot()): ImportReport => {
  const journal = join(dir, "journal.jsonl");
  if (!existsSync(journal)) throw new JobError(`No journal.jsonl in ${dir}`);
  const wf = basename(dir.replace(/\/+$/, ""));
  const lines: JournalLine[] = readFileSync(journal, "utf8").split("\n").filter((l) => l.trim()).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  const started = new Map<string, JournalLine>();
  const results = new Map<string, unknown>();
  for (const l of lines) {
    if (!l.agentId) continue;
    if (l.type === "started" && !started.has(l.agentId)) started.set(l.agentId, l);
    if (l.type === "result") results.set(l.agentId, l.result);
  }
  const file = ledgerPath(course, lesson, root);
  const rep: ImportReport = { workflow: wf, agents: started.size, added: 0, completed: 0, unchanged: 0, running: 0 };
  withLedgerLock(file, () => {
    const tasks = fold(readEvents(file), course, lesson);
    const out: JobEvent[] = [];
    const recordedAt = now();
    for (const [agentId, s] of started) {
      const id = `${wf}:${agentId}`;
      const { first, last } = agentTimes(join(dir, `agent-${agentId}.jsonl`));
      const hasResult = results.has(agentId);
      const result = results.get(agentId);
      const label = s.label ?? agentId;
      const role = label.includes("·") ? label.split("·").pop()!.trim() : label;
      const finish = (): JobEvent => result == null
        ? { ...ev("fail", id, { lastError: "workflow journal recorded an empty result" }, last ?? null), recordedAt }
        : { ...ev("done", id, { summary: summarise(result) }, last ?? null), recordedAt };
      const existing = tasks.get(id);
      if (!existing) {
        out.push({ ...ev("add", id, { course, lesson, kind: (s.phase ?? "workflow").toLowerCase().replace(/[^a-z0-9]+/g, "-"), owner: role, deps: [], inputs: [], outputs: [], maxRetries: 1, note: label, source: "workflow-journal", workflow: wf, agentId, phase: s.phase }, first ?? null), recordedAt });
        out.push({ ...ev("start", id, undefined, first ?? null), recordedAt });
        if (hasResult) { out.push(finish()); rep.added++; } else { rep.added++; rep.running++; }
      } else if (existing.status === "running" && hasResult) {
        out.push(finish()); rep.completed++;
      } else {
        rep.unchanged++;
        if (existing.status === "running") rep.running++;
      }
    }
    appendEvents(file, out);
  });
  return rep;
};
