/** Job ledger tests: npx tsx --test pipeline/tests/*.test.ts  (temp dirs only; no network, no renders). */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import * as J from "../lib/jobs";

// Child mode: used by the concurrency test (each child appends many events, then exits before any test registers).
if (process.env.JOBS_CHILD) {
  const { addTask, startTask, doneTask } = await import("../lib/jobs");
  const n = Number(process.env.JOBS_N), me = process.env.JOBS_CHILD;
  for (let i = 0; i < n; i++) {
    const r = { course: "c", lesson: "l", id: `${me}:${i}` };
    addTask({ ...r, kind: "stress" }); startTask(r); doneTask({ ...r, outputs: [`out/${me}-${i}`] });
  }
  process.exit(0);
}


const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), "jobs-test-"));
const run = (args: string[], env: Record<string, string>) => new Promise<{ code: number; out: string; err: string }>((res) => {
  const p = spawn(process.execPath, ["--import", "tsx", ...args], { cwd: ROOT, env: { ...process.env, ...env } });
  let out = "", err = "";
  p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
  p.on("close", (code) => res({ code: code ?? -1, out, err }));
});

test("add → start → done records real times, outputs and attempts", () => {
  const root = tmp();
  const r = { course: "c", lesson: "l", id: "L01:render:v004", root };
  const t0 = Date.now();
  J.addTask({ ...r, kind: "render", owner: "render-engineer", inputs: ["manifest.json"], note: "full render" });
  let t = J.startTask(r);
  assert.equal(t.status, "running"); assert.equal(t.attempts, 1);
  t = J.doneTask({ ...r, outputs: ["renders/L01_v004.mp4"], checkpoint: "renders/.cache/L01" });
  assert.equal(t.status, "done");
  assert.deepEqual(t.outputs, ["renders/L01_v004.mp4"]);
  assert.equal(t.checkpoint, "renders/.cache/L01");
  assert.ok(Date.parse(t.startedAt!) >= t0 - 1 && Date.parse(t.finishedAt!) >= Date.parse(t.startedAt!));
  assert.ok(Date.parse(t.finishedAt!) <= Date.now());
  // append-only: 3 lines, one per event
  const lines = readFileSync(J.ledgerPath("c", "l", root), "utf8").trim().split("\n");
  assert.deepEqual(lines.map((l) => JSON.parse(l).type), ["add", "start", "done"]);
  assert.throws(() => J.doneTask(r), J.JobError); // done twice is refused
  assert.throws(() => J.addTask(r), J.JobError);  // duplicate id refused
  rmSync(root, { recursive: true, force: true });
});

test("ready lists only queued tasks whose deps are all done; start refuses open deps", () => {
  const root = tmp();
  const base = { course: "c", lesson: "l", root };
  J.addTask({ ...base, id: "plan" });
  J.addTask({ ...base, id: "build", deps: ["plan"] });
  J.addTask({ ...base, id: "render", deps: ["build", "plan"] });
  const ready = () => J.readyTasks(J.loadTasks("c", "l", root)).map((t) => t.id);
  assert.deepEqual(ready(), ["plan"]);
  assert.throws(() => J.startTask({ ...base, id: "build" }), /dependencies not done/);
  J.startTask({ ...base, id: "plan" });
  assert.deepEqual(ready(), []);
  J.doneTask({ ...base, id: "plan" });
  assert.deepEqual(ready(), ["build"]);
  J.startTask({ ...base, id: "build" }); J.doneTask({ ...base, id: "build" });
  assert.deepEqual(ready(), ["render"]);
  rmSync(root, { recursive: true, force: true });
});

test("failure + retry: re-queue only while attempts < maxRetries", () => {
  const root = tmp();
  const r = { course: "c", lesson: "l", id: "L01:qa:v1", root };
  J.addTask({ ...r, maxRetries: 2 });
  J.startTask(r);
  let t = J.failTask({ ...r, error: "black frame at 12.3 s" });
  assert.equal(t.status, "failed"); assert.equal(t.lastError, "black frame at 12.3 s");
  t = J.retryTask(r); assert.equal(t.status, "queued");
  J.startTask(r);
  t = J.failTask({ ...r, error: "still black" });
  assert.equal(t.attempts, 2);
  assert.throws(() => J.retryTask(r), /Retry limit reached/);
  assert.equal(J.loadTasks("c", "l", root).get(r.id)!.status, "failed");
  assert.throws(() => J.retryTask({ ...r, id: "missing" }), J.JobError);
  rmSync(root, { recursive: true, force: true });
});

test("CLI: list --json, ready, refusal exit code 2", async () => {
  const root = tmp();
  const env = { LIFELINK_JOBS_DIR: root };
  const f = ["--course", "c", "--lesson", "l"];
  assert.equal((await run(["pipeline/jobs.ts", "add", ...f, "--id", "a", "--kind", "plan", "--owner", "director"], env)).code, 0);
  assert.equal((await run(["pipeline/jobs.ts", "add", ...f, "--id", "b", "--deps", "a"], env)).code, 0);
  const refused = await run(["pipeline/jobs.ts", "start", ...f, "--id", "b"], env);
  assert.equal(refused.code, 2); assert.match(refused.err, /dependencies not done/);
  const ready = await run(["pipeline/jobs.ts", "ready", ...f, "--json"], env);
  assert.deepEqual(JSON.parse(ready.out).map((t: { id: string }) => t.id), ["a"]);
  const list = await run(["pipeline/jobs.ts", "list", "--json"], env);
  assert.deepEqual(JSON.parse(list.out).map((t: { id: string; status: string }) => `${t.id}:${t.status}`), ["a:queued", "b:queued"]);
  rmSync(root, { recursive: true, force: true });
});

test("concurrent appends from several processes neither corrupt nor lose events", async () => {
  const root = tmp();
  const P = 5, N = 20;
  const res = await Promise.all(Array.from({ length: P }, (_, i) =>
    run([fileURLToPath(import.meta.url)], { LIFELINK_JOBS_DIR: root, JOBS_CHILD: `w${i}`, JOBS_N: String(N) })));
  for (const r of res) assert.equal(r.code, 0, r.err);
  const lines = readFileSync(J.ledgerPath("c", "l", root), "utf8").split("\n").filter(Boolean);
  assert.equal(lines.length, P * N * 3);
  for (const l of lines) JSON.parse(l); // every line is intact JSON
  const tasks = J.loadTasks("c", "l", root);
  assert.equal(tasks.size, P * N);
  assert.ok([...tasks.values()].every((t) => t.status === "done" && t.attempts === 1 && t.outputs.length === 1));
  rmSync(root, { recursive: true, force: true });
});

const agentLine = (ts: string) => JSON.stringify({ type: "user", timestamp: ts, message: { content: "x" } });

test("import-workflow: real times from agent transcripts, idempotent, completes running tasks later", () => {
  const root = tmp(), wf = join(tmp(), "wf_test-123");
  mkdirSync(wf, { recursive: true });
  writeFileSync(join(wf, "agent-a1.jsonl"), [agentLine("2026-11-24T01:00:00.000Z"), agentLine("2026-11-24T01:05:30.000Z")].join("\n") + "\n");
  writeFileSync(join(wf, "agent-a2.jsonl"), [agentLine("2026-11-24T01:01:00.000Z"), agentLine("2026-11-24T01:02:00.000Z")].join("\n") + "\n");
  const journal = [
    { type: "launched" },
    { type: "started", agentId: "a1", label: "sec-01 · Final Reviewer", phase: "Final review" },
    { type: "started", agentId: "a2", label: "sec-02 · Final Reviewer", phase: "Final review" },
    { type: "result", agentId: "a1", result: { verdict: "FIXED", fixed: ["x"], open: [] } },
  ];
  writeFileSync(join(wf, "journal.jsonl"), journal.map((j) => JSON.stringify(j)).join("\n") + "\n");

  let rep = J.importWorkflow(wf, "c", "l", root);
  assert.deepEqual([rep.added, rep.running], [2, 1]);
  let t = J.loadTasks("c", "l", root);
  const a1 = t.get("wf_test-123:a1")!;
  assert.equal(a1.status, "done");
  assert.equal(a1.startedAt, "2026-11-24T01:00:00.000Z");
  assert.equal(a1.finishedAt, "2026-11-24T01:05:30.000Z");
  assert.equal(a1.source, "workflow-journal");
  assert.equal(a1.owner, "Final Reviewer");
  assert.equal(t.get("wf_test-123:a2")!.status, "running");

  const before = readFileSync(J.ledgerPath("c", "l", root), "utf8");
  rep = J.importWorkflow(wf, "c", "l", root);
  assert.equal(rep.added, 0);
  assert.equal(readFileSync(J.ledgerPath("c", "l", root), "utf8"), before, "re-import writes nothing");

  // a2 finishes later: re-import appends only its done event
  writeFileSync(join(wf, "journal.jsonl"), [...journal, { type: "result", agentId: "a2", result: "done" }].map((j) => JSON.stringify(j)).join("\n") + "\n");
  rep = J.importWorkflow(wf, "c", "l", root);
  assert.deepEqual([rep.added, rep.completed], [0, 1]);
  t = J.loadTasks("c", "l", root);
  assert.equal(t.size, 2);
  assert.equal(t.get("wf_test-123:a2")!.finishedAt, "2026-11-24T01:02:00.000Z");
  J.importWorkflow(wf, "c", "l", root);
  assert.equal(J.readEvents(J.ledgerPath("c", "l", root)).length, 6);
  rmSync(root, { recursive: true, force: true });
});

const REAL = "/root/.claude/projects/-home-user/ba2474dc-abfc-5e50-ae5f-62f1bb4d7bc2/subagents/workflows/wf_7f6fd11d-78e";
test("import-workflow on the real finished final-review journal (read-only)", { skip: !existsSync(REAL) && "journal not present" }, () => {
  const root = tmp();
  J.importWorkflow(REAL, "c", "l", root);
  J.importWorkflow(REAL, "c", "l", root);
  const tasks = [...J.loadTasks("c", "l", root).values()];
  assert.equal(tasks.length, 14);
  for (const t of tasks) {
    assert.equal(t.status, "done");
    assert.ok(t.startedAt && t.finishedAt && t.startedAt < t.finishedAt, `${t.id} has real start < finish`);
    assert.ok(t.startedAt!.startsWith("2026-11-24T01:"));
  }
  rmSync(root, { recursive: true, force: true });
});
