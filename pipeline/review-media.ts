/**
 * Per-chapter review copies for the board's Review Centre (documentation/board/DATA-CONTRACT.md, review/<lessonId>).
 *
 *   npx tsx pipeline/review-media.ts --root <repo> --lesson <id> --version 003 --out <dir>
 *        [--input <full render mp4>] [--max-mb 14] [--only sec-01,sec-02] [--thumb-only (keep the indexed chapter copies)]
 *   npx tsx pipeline/review-media.ts --out <dir> --attach <upload-result.json>   → <dir>/review-doc.json (review/<lessonId>)
 *
 * Each chapter (manifest section) is cut from the full render and re-encoded to 960×540 H.264 main, CRF 30,
 * AAC 96k, +faststart. A copy larger than --max-mb is re-encoded at a computed bitrate. One 640 px JPEG
 * thumbnail is taken from mid-lesson. Writes media-index.json. Light on CPU: nice -n 15, ffmpeg -threads 2.
 * --root is only read.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { argMap, loadMergedLoose, MediaIndexSchema, readJson, ReviewSchema, type MediaIndex } from "./lib/board-data";

const ff = (args: string[]) => execFileSync("nice", ["-n", "15", "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
export const probeDuration = (file: string) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

export type Chapter = { chapterId: string; title: string; startSec: number; endSec: number };

export const encodeChapter = (input: string, c: Chapter, out: string, maxBytes: number) => {
  const dur = c.endSec - c.startSec;
  const common = ["-ss", c.startSec.toFixed(3), "-i", input, "-t", dur.toFixed(3), "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=960:540:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-profile:v", "main", "-preset", "medium", "-threads", "2", "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart"];
  ff([...common, "-crf", "30", out]);
  let size = statSync(out).size;
  let tries = 0;
  while (size > maxBytes && tries++ < 3) {
    const kbps = Math.max(40, Math.floor(((maxBytes * 8 * (0.9 - 0.1 * tries)) / dur) / 1000) - 96);
    ff([...common, "-b:v", `${kbps}k`, "-maxrate", `${Math.round(kbps * 1.3)}k`, "-bufsize", `${kbps * 2}k`, out]);
    size = statSync(out).size;
  }
  if (size > maxBytes) throw new Error(`${out} is still ${size} bytes after re-encoding (limit ${maxBytes})`);
  return size;
};

export const findLessonDir = (root: string, lesson: string) => {
  const cdir = join(root, "courses");
  for (const c of existsSync(cdir) ? readdirSync(cdir) : []) if (existsSync(join(cdir, c, lesson, "manifest.json"))) return join(cdir, c, lesson);
  return null;
};

export const makeReviewMedia = (o: { root: string; lesson: string; version: string; out: string; input?: string; maxMb?: number; only?: string[]; thumbOnly?: boolean }): MediaIndex => {
  const root = resolve(o.root);
  const version = o.version.padStart(3, "0");
  const input = o.input ?? join(root, "renders", o.lesson, "landscape", `${o.lesson}_landscape_v${version}.mp4`);
  if (!existsSync(input)) throw new Error(`No render at ${input}`);
  const ldir = findLessonDir(root, o.lesson);
  const merged = ldir ? loadMergedLoose(ldir) : null;
  const dur = probeDuration(input);
  const sections = merged?.sections?.length ? merged.sections : [{ id: "full", title: "Full lesson", startSec: 0, endSec: dur }];
  mkdirSync(o.out, { recursive: true });
  const maxBytes = Math.floor((o.maxMb ?? 14) * 1024 * 1024);
  const chapters: MediaIndex["chapters"] = [];
  const previous = o.thumbOnly ? MediaIndexSchema.safeParse(readJson(join(o.out, "media-index.json"))) : null;
  if (previous?.success) chapters.push(...previous.data.chapters);
  else sections.forEach((s, i) => {
    if (o.only && !o.only.includes(s.id)) return;
    const c: Chapter = { chapterId: s.id, title: s.title ?? `Chapter ${i + 1}`, startSec: Math.max(0, s.startSec), endSec: Math.min(dur, s.endSec) };
    if (c.endSec - c.startSec < 0.2) return;
    const file = `${o.lesson}_v${version}_${s.id}_540p.mp4`;
    const sizeBytes = encodeChapter(input, c, join(o.out, file), maxBytes);
    console.log(`${file}: ${(sizeBytes / 1048576).toFixed(2)} MB (${(c.endSec - c.startSec).toFixed(1)} s)`);
    chapters.push({ ...c, file, sizeBytes });
  });
  // Mid-lesson, but on a settled frame: the end of the scene that contains the midpoint (as package.ts does).
  const mid = dur / 2;
  const scene = merged?.scenes?.find((x) => x.startSec <= mid && x.endSec > mid);
  const atSec = Math.round((scene && scene.endSec - 0.5 > scene.startSec ? Math.min(dur - 0.1, scene.endSec - 0.5) : mid) * 100) / 100;
  const thumb = `${o.lesson}_v${version}_thumb_640.jpg`;
  ff(["-ss", String(atSec), "-i", input, "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3", "-threads", "2", join(o.out, thumb)]);
  const index: MediaIndex = MediaIndexSchema.parse({
    lessonId: o.lesson, version, createdAt: new Date().toISOString(), input: input.startsWith(root) ? input.slice(root.length + 1) : input,
    chapters, thumbnail: { file: thumb, sizeBytes: statSync(join(o.out, thumb)).size, atSec },
  });
  writeFileSync(join(o.out, "media-index.json"), JSON.stringify(index, null, 2));
  return index;
};

/**
 * Upload results → map of file basename → {id, url}. Accepts an array of {file|path|name|file_path, id|assetId|asset_id, url},
 * an object wrapping such an array (files/uploaded/results/assets), or a plain map {basename: {id, url}}.
 */
export const parseAttach = (raw: unknown): Map<string, { id: string | null; url: string | null }> => {
  const m = new Map<string, { id: string | null; url: string | null }>();
  if (!raw || typeof raw !== "object") return m;
  const o = raw as any;
  const list: any[] | null = Array.isArray(o) ? o : Array.isArray(o.files ?? o.uploaded ?? o.results ?? o.assets) ? (o.files ?? o.uploaded ?? o.results ?? o.assets) : null;
  if (list) for (const e of list) {
    const f = e?.file ?? e?.path ?? e?.name ?? e?.file_path ?? e?.filename;
    if (f) m.set(basename(String(f)), { id: e.id ?? e.assetId ?? e.asset_id ?? null, url: e.url ?? null });
  }
  else for (const [k, v] of Object.entries(o)) if (v && typeof v === "object") m.set(basename(k), { id: (v as any).id ?? (v as any).assetId ?? null, url: (v as any).url ?? null });
  return m;
};

/** review/<lessonId> document from one or more media indexes (+ optional upload results). */
export const buildReviewDoc = (items: { index: MediaIndex; dir: string; attach?: unknown }[]) => {
  const versions = items.map(({ index, attach }) => {
    const up = parseAttach(attach);
    return { version: index.version, createdAt: index.createdAt, chapters: index.chapters.map((c) => ({ chapterId: c.chapterId, title: c.title, startSec: c.startSec, endSec: c.endSec, assetId: up.get(c.file)?.id ?? null, url: up.get(c.file)?.url ?? null, sizeBytes: c.sizeBytes })) };
  }).sort((a, b) => b.version.localeCompare(a.version));
  const newest = [...items].sort((a, b) => b.index.version.localeCompare(a.index.version))[0];
  const t = newest?.index.thumbnail;
  const tu = t ? parseAttach(newest.attach).get(t.file) : undefined;
  return ReviewSchema.parse({
    versions, ...(t ? { thumbnail: { assetId: tu?.id ?? null, url: tu?.url ?? null, sizeBytes: t.sizeBytes } } : {}),
    source: items.map((i) => `${basename(i.dir)}/media-index.json${i.attach ? " + upload results" : " (not uploaded yet: url/assetId null)"}`).join("; "),
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = argMap(process.argv.slice(2));
  const out = typeof a.out === "string" ? resolve(a.out) : "";
  if (!out) { console.error("usage: review-media.ts --root <repo> --lesson <id> --version 003 --out <dir> | --out <dir> --attach <upload-result.json>"); process.exit(2); }
  if (typeof a.attach === "string") {
    const index = MediaIndexSchema.parse(readJson(join(out, "media-index.json")));
    const attach = readJson(a.attach);
    if (resolve(a.attach) !== join(out, "upload-result.json")) copyFileSync(a.attach, join(out, "upload-result.json"));
    const doc = buildReviewDoc([{ index, dir: out, attach }]);
    const missing = doc.versions[0].chapters.filter((c) => !c.url).map((c) => c.chapterId);
    writeFileSync(join(out, "review-doc.json"), JSON.stringify(doc, null, 1));
    console.log(`review/${index.lessonId} → ${join(out, "review-doc.json")}${missing.length ? ` (no upload found for: ${missing.join(", ")})` : ""}`);
  } else {
    if (typeof a.root !== "string" || typeof a.lesson !== "string" || typeof a.version !== "string") { console.error("--root, --lesson and --version are required"); process.exit(2); }
    const idx = makeReviewMedia({ root: a.root, lesson: a.lesson, version: a.version, out, input: a.input as string | undefined, maxMb: a["max-mb"] ? Number(a["max-mb"]) : undefined, only: typeof a.only === "string" ? a.only.split(",") : undefined, thumbOnly: a["thumb-only"] === true });
    console.log(`${idx.chapters.length} chapter copies + thumbnail → ${out}/media-index.json`);
  }
}
