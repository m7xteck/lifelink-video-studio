/** Board inbox: every action type + idempotency, on temp copies only (never the main repo). */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import * as J from "../lib/jobs";
import { processInbox } from "../board-inbox";

const setup = () => {
  const root = mkdtempSync(join(tmpdir(), "board-inbox-"));
  const status = (lesson: string, state: string) => {
    const dir = join(root, "courses/c1", lesson);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "status.json"), JSON.stringify({ lessonId: lesson, courseId: "c1", state, approval: { creative: "none" }, history: [] }, null, 2));
  };
  status("c1-L01", "AWAITING_APPROVAL");
  status("c1-L02", "IN_PRODUCTION");
  mkdirSync(join(root, "production-memory"), { recursive: true });
  writeFileSync(join(root, "production-memory/decisions.md"), "# Decision log\n\n| Date | Decision | By | Evidence |\n|---|---|---|---|\n");
  const jr = join(root, "production/jobs");
  const r = (id: string) => ({ course: "c1", lesson: "c1-L01", id, root: jr });
  J.addTask({ ...r("render-a"), kind: "render", maxRetries: 2 }); J.startTask(r("render-a")); J.failTask({ ...r("render-a"), error: "chromium crashed" });
  J.addTask({ ...r("render-b"), kind: "render", maxRetries: 1 }); J.startTask(r("render-b")); J.failTask({ ...r("render-b"), error: "out of disk" });
  J.addTask({ ...r("qa-c"), kind: "qa" });
  J.addTask({ ...r("qa-d"), kind: "qa" });
  const inbox = join(root, "inbox-saved");
  const put = (coll: string, id: string, data: object, wrap = false) => {
    mkdirSync(join(inbox, coll), { recursive: true });
    const doc = { id, by: "u_viewer", at: "2026-11-25T09:00:00.000Z", status: "new", ...data };
    writeFileSync(join(inbox, coll, `${id}.json`), JSON.stringify(wrap ? { id, version: 3, data: doc } : doc));
  };
  put("comments", "cm1", { lessonId: "c1-L01", version: "004", chapterId: "sec-04", atSec: 287.4, sceneId: "sec-04-02", text: "The quote fades too early." }, true);
  put("approvals", "ap1", { itemRef: "lesson:L01:v004", decision: "approve", note: "Yes | this one is good, go ahead" });
  put("approvals", "ap2", { itemRef: "lesson:L01:v004:chapter:sec-04", decision: "approve", note: "chapter 4 ok" });
  put("approvals", "ap3", { itemRef: "lesson:L01:v004:chapter:sec-05", decision: "changes", note: "slower please" });
  put("approvals", "ap4", { itemRef: "limiter", decision: "reject", note: "no limiter" });
  put("approvals", "ap5", { itemRef: "lesson:L02:creative", decision: "approve", note: "approved L02" });
  put("requests", "rq1", { jobId: "render-a", action: "retry", note: "" });
  put("requests", "rq2", { jobId: "render-b", action: "retry", note: "" });
  put("requests", "rq3", { jobId: "qa-c", action: "cancel", note: "not needed" });
  put("requests", "rq4", { jobId: "qa-d", action: "prioritise", note: "first please" });
  put("requests", "rq5", { jobId: "nope", action: "retry", note: "" });
  put("requests", "rq6", { jobId: "qa-d", action: "cancel", note: "", status: "done" });
  return { root, inbox, jr };
};

test("inbox: each action type, verbatim decisions, state-machine guard, refusals", () => {
  const { root, inbox, jr } = setup();
  try {
    const out = join(root, "out1");
    const { results } = processInbox({ root, inDir: inbox, outDir: out, now: "2026-11-25T10:00:00.000Z" });
    const by = Object.fromEntries(results.map((r) => [r.docId, r]));
    const tasks = J.loadTasks("c1", "c1-L01", jr);

    // comment → revision task with all context
    assert.equal(by.cm1.status, "task-created");
    const ct = tasks.get("board:comment:cm1")!;
    assert.equal(ct.kind, "revision"); assert.equal(ct.owner, "Revision Director");
    for (const s of ["c1-L01", "v004", "sec-04", "4:47.4", "sec-04-02", "The quote fades too early."]) assert.ok(ct.note!.includes(s), `note lacks ${s}: ${ct.note}`);

    // approvals
    const dec = readFileSync(join(root, "production-memory/decisions.md"), "utf8");
    assert.ok(dec.includes('Note (verbatim): "Yes \\| this one is good, go ahead"'));
    assert.ok(dec.includes("| 2026-11-25 |") && dec.includes("board approvals/ap1") && dec.includes("board approvals/ap4"));
    const st1 = JSON.parse(readFileSync(join(root, "courses/c1/c1-L01/status.json"), "utf8"));
    assert.equal(st1.state, "APPROVED"); assert.equal(st1.approval.creative, "approved"); assert.equal(st1.approval.note, "Yes | this one is good, go ahead");
    assert.match(by.ap2.detail, /not a lesson-level item/);
    const st2 = JSON.parse(readFileSync(join(root, "courses/c1/c1-L02/status.json"), "utf8"));
    assert.equal(st2.state, "IN_PRODUCTION", "state machine refused: unchanged");
    assert.match(by.ap5.detail, /IN_PRODUCTION.*decisions\.md only/);
    assert.ok(tasks.get("board:approval:ap3")?.kind === "revision");
    assert.ok(J.loadTasks("studio", "board", jr).get("board:approval:ap4"), "non-lesson changes/reject go to the studio ledger");

    // requests
    assert.equal(by.rq1.status, "accepted"); assert.equal(tasks.get("render-a")!.status, "queued");
    assert.equal(by.rq2.status, "refused"); assert.match(by.rq2.detail, /Retry limit/); assert.equal(tasks.get("render-b")!.status, "failed");
    assert.equal(by.rq3.status, "done"); assert.equal(tasks.get("qa-c")!.status, "cancelled");
    assert.equal(by.rq4.status, "accepted"); assert.ok(tasks.get("board:priority:rq4"));
    assert.equal(by.rq5.status, "refused"); assert.match(by.rq5.detail, /No job/);
    assert.equal(by.rq6.outcome, "skipped");

    // update docs + writes.json (if_version carried from the wrapped doc)
    const writes = JSON.parse(readFileSync(join(out, "writes.json"), "utf8"));
    assert.equal(writes.length, 11);
    const w = writes.find((x: any) => x.doc_id === "cm1");
    assert.equal(w.op, "update"); assert.equal(w.collection, "comments"); assert.equal(w.if_version, 3);
    assert.deepEqual(JSON.parse(readFileSync(w.file_path, "utf8")).taskId, "board:comment:cm1");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("inbox is idempotent: a second run on the same saved docs acts on nothing", () => {
  const { root, inbox, jr } = setup();
  try {
    processInbox({ root, inDir: inbox, outDir: join(root, "o1") });
    const dec1 = readFileSync(join(root, "production-memory/decisions.md"), "utf8");
    const led1 = readFileSync(J.ledgerPath("c1", "c1-L01", jr), "utf8");
    const st1 = readFileSync(join(root, "courses/c1/c1-L01/status.json"), "utf8");
    const { results } = processInbox({ root, inDir: inbox, outDir: join(root, "o2") });
    assert.equal(results.filter((r) => r.outcome === "processed").length, 0);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 11);
    assert.equal(readFileSync(join(root, "production-memory/decisions.md"), "utf8"), dec1);
    assert.equal(readFileSync(J.ledgerPath("c1", "c1-L01", jr), "utf8"), led1);
    assert.equal(readFileSync(join(root, "courses/c1/c1-L01/status.json"), "utf8"), st1);
    // the replayed updates are identical to the first ones
    const a = JSON.parse(readFileSync(join(root, "o1/writes.json"), "utf8")).map((w: any) => readFileSync(w.file_path, "utf8"));
    const b = JSON.parse(readFileSync(join(root, "o2/writes.json"), "utf8")).map((w: any) => readFileSync(w.file_path, "utf8"));
    assert.deepEqual(b, a);
    // a doc already written back as processed is skipped
    writeFileSync(join(inbox, "requests/rq1.json"), JSON.stringify({ id: "rq1", status: "accepted", jobId: "render-a", action: "retry", note: "" }));
    const r3 = processInbox({ root, inDir: inbox, outDir: join(root, "o3") }).results.find((r) => r.docId === "rq1")!;
    assert.equal(r3.outcome, "skipped");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
