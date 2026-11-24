/** Board sync on the REAL main repo (read-only) → schema-valid documents with sources, sizes and measured numbers. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBoard } from "../board-sync";
import { MAX_DOC_BYTES, schemaFor, writeDocs } from "../lib/board-data";

const MAIN = process.env.LIFELINK_MAIN_REPO ?? "/home/user/lifelink-video-studio";
const JOURNALS = process.env.LIFELINK_JOURNALS ?? "/root/.claude/projects/-home-user/ba2474dc-abfc-5e50-ae5f-62f1bb4d7bc2/subagents/workflows";
const haveMain = existsSync(join(MAIN, "courses"));

/** Every object that has a `source` key must have a non-empty string there. */
const badSources = (v: unknown, path = ""): string[] => {
  if (Array.isArray(v)) return v.flatMap((x, i) => badSources(x, `${path}[${i}]`));
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const own = "source" in o && (typeof o.source !== "string" || !o.source) ? [path] : [];
    return own.concat(Object.entries(o).flatMap(([k, x]) => badSources(x, `${path}.${k}`)));
  }
  return [];
};

test("sync on the real main repo: schema-valid docs, sources, < 900 KB, measured render numbers", { skip: !haveMain && "main repo not present" }, () => {
  const out = mkdtempSync(join(tmpdir(), "board-sync-"));
  try {
    const { docs } = buildBoard({ root: MAIN, journals: existsSync(JOURNALS) ? JOURNALS : undefined, reviewMedia: join(out, "no-media") });
    const paths = docs.map((d) => `${d.collection}/${d.docId}`);
    for (const p of ["studio/meta", "studio/overview", "efficiency/summary", "memory/library"]) assert.ok(paths.includes(p), `missing ${p}`);
    assert.ok(paths.some((p) => p.startsWith("lessons/")) && paths.some((p) => p.startsWith("jobs/")));
    for (const d of docs) {
      const s = schemaFor(`${d.collection}/${d.docId}`) ?? schemaFor(d.collection);
      assert.ok(s, `no schema for ${d.collection}`);
      const r = s!.safeParse(d.data);
      assert.ok(r.success, `${d.collection}/${d.docId}: ${r.success ? "" : r.error.message}`);
      assert.deepEqual(badSources(d.data), [], `${d.collection}/${d.docId} has empty sources`);
      assert.ok(typeof (d.data as any).source === "string" || d.collection === "memory", `${d.collection}/${d.docId} has no top-level source`);
    }
    const listed = writeDocs(out, docs);
    for (const l of listed) assert.ok(l.bytes < MAX_DOC_BYTES, `${l.collection}/${l.doc_id} is ${l.bytes} bytes`);
    const writes = JSON.parse(readFileSync(join(out, "writes.json"), "utf8"));
    assert.equal(writes.length, docs.length);
    for (const w of writes) { assert.equal(w.op, "set"); assert.ok(existsSync(w.file_path)); }

    // efficiency numbers equal the .render.json values
    const eff = docs.find((d) => d.collection === "efficiency")!.data as any;
    assert.ok(eff.measured.fullRenders.length > 0);
    for (const r of eff.measured.fullRenders) {
      const rec = JSON.parse(readFileSync(join(MAIN, r.source), "utf8"));
      assert.equal(r.version, rec.version);
      assert.equal(r.minutes, Math.round((rec.wallClockSec / 60) * 10) / 10);
      assert.equal(r.reused, rec.chunks.filter((c: any) => c.reused).length);
      assert.equal(r.total, rec.chunks.length);
    }
    for (const i of eff.insights) assert.ok(i.evidence.length > 10, `insight without evidence: ${i.title}`);
    for (const e of eff.estimates) { assert.equal(e.estimate, true); assert.ok(e.basis.length > 10); }

    // lesson: narration ≤ 140, renders match records, QA counts match reports
    for (const d of docs.filter((d) => d.collection === "lessons")) {
      const l = d.data as any;
      for (const s of l.scenes) assert.ok(s.narration.length <= 140);
      for (const s of l.scenes) assert.equal(s.approval, "none", "nothing is approved by default");
      for (const r of l.renders) {
        const rec = JSON.parse(readFileSync(join(MAIN, r.source), "utf8"));
        assert.equal(r.createdAt, rec.createdAt);
        if (r.qa) {
          const q = JSON.parse(readFileSync(join(MAIN, r.qa.report), "utf8"));
          assert.equal(r.qa.result, q.result);
          assert.equal(r.qa.fail, q.checks.filter((c: any) => c.status === "FAIL").length);
        }
      }
    }
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test("sync emits review/<lesson> from a media index (+ upload results) and sets the lesson thumbnail", { skip: !haveMain && "main repo not present" }, () => {
  const tmp = mkdtempSync(join(tmpdir(), "board-sync-rm-"));
  try {
    const lesson = readdirSync(join(MAIN, "courses/lifelink-course")).find((f) => f.startsWith("lifelink-course-L"))!;
    mkdirSync(join(tmp, "rm"), { recursive: true });
    writeFileSync(join(tmp, "rm/media-index.json"), JSON.stringify({ lessonId: lesson, version: "003", createdAt: "2026-11-24T10:00:00.000Z", input: "x.mp4",
      chapters: [{ chapterId: "sec-01-welcome", title: "Welcome", startSec: 0, endSec: 39.9, file: "a.mp4", sizeBytes: 1000 }], thumbnail: { file: "t.jpg", sizeBytes: 50, atSec: 1 } }));
    writeFileSync(join(tmp, "rm/upload-result.json"), JSON.stringify([{ file: "/x/a.mp4", id: "0123456789abcdef0123456789abcdef", url: "https://example.invalid/a.mp4" }, { file: "t.jpg", id: "f".repeat(32), url: "https://example.invalid/t.jpg" }]));
    const { docs } = buildBoard({ root: MAIN, reviewMedia: join(tmp, "rm") });
    const rv = docs.find((d) => d.collection === "review" && d.docId === lesson)!.data as any;
    assert.equal(rv.versions[0].chapters[0].url, "https://example.invalid/a.mp4");
    assert.equal(rv.versions[0].chapters[0].assetId, "0123456789abcdef0123456789abcdef");
    const ld = docs.find((d) => d.collection === "lessons" && d.docId === lesson)!.data as any;
    assert.equal(ld.thumbnail.assetUrl, "https://example.invalid/t.jpg");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
