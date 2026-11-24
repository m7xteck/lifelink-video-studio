/** review-media on a 20 s synthetic clip in a temp repo: 960×540 H.264 main + AAC, faststart, size cap, thumbnail, attach. */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReviewDoc, makeReviewMedia } from "../review-media";

const probe = (f: string) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", f]).toString());

test("review-media cuts per-chapter 540p copies, thumbnail and media index", () => {
  const root = mkdtempSync(join(tmpdir(), "board-media-"));
  try {
    const L = "t-L01";
    mkdirSync(join(root, "courses/t", L), { recursive: true });
    writeFileSync(join(root, "courses/t", L, "manifest.json"), JSON.stringify({ lessonId: L, sections: [{ id: "sec-01", title: "One", startSec: 0, endSec: 8 }, { id: "sec-02", title: "Two", startSec: 8, endSec: 20 }], scenes: [] }));
    const rdir = join(root, "renders", L, "landscape");
    mkdirSync(rdir, { recursive: true });
    execFileSync("nice", ["-n", "15", "ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=20", "-f", "lavfi", "-i", "sine=frequency=440:duration=20",
      "-c:v", "libx264", "-preset", "ultrafast", "-threads", "2", "-c:a", "aac", "-shortest", join(rdir, `${L}_landscape_v001.mp4`)]);
    const out = join(root, "media");
    const idx = makeReviewMedia({ root, lesson: L, version: "1", out });
    assert.equal(idx.version, "001");
    assert.deepEqual(idx.chapters.map((c) => [c.chapterId, c.title, c.startSec, c.endSec]), [["sec-01", "One", 0, 8], ["sec-02", "Two", 8, 20]]);
    for (const c of idx.chapters) {
      const p = probe(join(out, c.file));
      const v = p.streams.find((s: any) => s.codec_type === "video"), a = p.streams.find((s: any) => s.codec_type === "audio");
      assert.equal(v.codec_name, "h264"); assert.equal(v.profile, "Main"); assert.equal(v.width, 960); assert.equal(v.height, 540);
      assert.equal(a.codec_name, "aac");
      assert.ok(Math.abs(Number(p.format.duration) - (c.endSec - c.startSec)) < 0.3, `duration ${p.format.duration}`);
      assert.ok(c.sizeBytes <= 14 * 1024 * 1024);
      const buf = readFileSync(join(out, c.file));
      assert.ok(buf.indexOf("moov") < buf.indexOf("mdat"), "faststart: moov before mdat");
    }
    const t = probe(join(out, idx.thumbnail!.file)).streams[0];
    assert.equal(t.width, 640);
    assert.equal(idx.thumbnail!.atSec, 10, "no scenes in the test manifest → plain midpoint");
    assert.deepEqual(JSON.parse(readFileSync(join(out, "media-index.json"), "utf8")).chapters.length, 2);

    // size cap: a tiny limit forces the bitrate re-encode path
    const capped = makeReviewMedia({ root, lesson: L, version: "001", out: join(root, "capped"), maxMb: 0.3, only: ["sec-02"] });
    assert.ok(capped.chapters[0].sizeBytes <= 0.3 * 1024 * 1024, `capped size ${capped.chapters[0].sizeBytes}`);

    // attach upload results → review doc
    const doc = buildReviewDoc([{ index: idx, dir: out, attach: { files: [{ path: join(out, idx.chapters[0].file), id: "a".repeat(32), url: "https://example.invalid/1.mp4" }] } }]);
    assert.equal(doc.versions[0].chapters[0].url, "https://example.invalid/1.mp4");
    assert.equal(doc.versions[0].chapters[1].url, null, "no upload → null, never invented");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
