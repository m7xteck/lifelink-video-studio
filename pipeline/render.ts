/**
 * LifeLink render engine.
 *
 *   npx tsx pipeline/render.ts --course <courseId> --lesson <lessonId> [options]
 *
 * Options:
 *   --orientation portrait     9:16 recomposition (layouts adapt; nothing is cropped)
 *   --preview                  tier-2 motion preview: 960×540 (scale 0.5), watermarked "PREVIEW", written under
 *                              previews/<lesson>/ — never versioned as a master, never reads or writes the
 *                              master section cache (always rendered fresh, in one pass over the window)
 *   --from 12.5 --to 85        render only a time window (e.g. a 60–90 s sample)
 *   --force                    ignore the section cache
 *   --concurrency N            browser tabs per render (default: all CPU cores)
 *
 * How it works:
 *  1. The manifest is validated.
 *  2. Each teaching SECTION is rendered as its own muted video chunk and cached by a key of
 *     (scenes in the section window ±1.5 s) + (shared engine files: src/ minus src/components,
 *     design system, fonts, textures, encoder) + (only the component files used by the scene
 *     types in that window) — see pipeline/lib/render-cache.ts. A component fix therefore
 *     re-renders only the sections that use it.
 *  3. Chunks are joined losslessly.
 *  4. The ORIGINAL narration is loudness-balanced (non-destructively) and laid over
 *     the visuals in one pass, so audio is never re-chunked and sync is exact.
 *  5. Each output is versioned; earlier versions are never overwritten.
 */
import { rmSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, renameSync } from "node:fs";
import { cpus } from "node:os";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { ManifestSchema, type Manifest } from "../src/schema/manifest";
import { BROWSER } from "./lib/browser";
import { P, lessonDir, renderDir } from "./lib/paths";
import { ff, ffprobe } from "./lib/media";
import { withLock } from "./lib/lock";
import { planChunks, type ChunkPlan } from "./lib/render-cache";
export { planChunks, buildComponentMap, sharedEngineFiles } from "./lib/render-cache";
import ds from "../brand/design-system.json";

const { values: a } = parseArgs({
  options: {
    course: { type: "string" }, lesson: { type: "string" }, orientation: { type: "string", default: "landscape" },
    preview: { type: "boolean", default: false }, force: { type: "boolean", default: false },
    from: { type: "string" }, to: { type: "string" }, concurrency: { type: "string" }, label: { type: "string" },
  },
});
if (!a.course || !a.lesson) { console.error("Usage: --course <id> --lesson <id>"); process.exit(2); }

const log = (...m: unknown[]) => console.log(`[render ${a.lesson}]`, ...m);

/** Same rule as src/brand/tokens.ts brandWatermark: mandatory while the brand is unapproved. */
const brandWatermark = ds.status === "APPROVED" ? null : ds.status === "PROPOSAL" ? "Concept for approval · provisional brand" : "Engine test · neutral style · not LifeLink brand";

export type RenderResult = { output: string; record: string; qaIssues: QaEvent[]; chunks: ChunkInfo[]; durationSec: number };
type QaEvent = { frame: number; issues: Record<string, unknown>[] };
type ChunkInfo = { sectionId: string; frames: [number, number]; key: string; file: string; reused: boolean; seconds: number; qa: QaEvent[] };

export const renderLesson = async (): Promise<RenderResult> => {
  const dir = lessonDir(a.course!, a.lesson!);
  const parsed: Manifest = ManifestSchema.parse(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")));
  const preview = a.preview;
  const portrait = a.orientation === "portrait";
  const scale = preview ? 0.5 : 1;
  const variant = `${portrait ? "portrait" : "landscape"}${preview ? "-preview" : ""}${a.from || a.to ? "-sample" : ""}`;
  // Previews always carry a PREVIEW watermark (plus the mandatory brand notice while the brand is unapproved).
  const manifest: Manifest = preview
    ? { ...parsed, watermark: ["Preview · 540p · not final", parsed.watermark ?? brandWatermark].filter(Boolean).join(" · ") }
    : parsed;
  const fps = manifest.fps;
  const winFrom = a.from ? Number(a.from) : 0;
  const winTo = a.to ? Math.min(Number(a.to), manifest.durationSec) : manifest.durationSec;
  const totalFrames = Math.ceil(manifest.durationSec * fps);
  // Masters: renders/<lesson>/<variant>/ with the section cache in chunks/.
  // Previews: previews/<lesson>/ with a private scratch folder that is deleted afterwards.
  const outDir = preview ? join(P.previews, manifest.lessonId) : join(renderDir(manifest.lessonId), variant);
  const chunkDir = preview ? join(outDir, `.work-${process.pid}-${Date.now()}`) : join(outDir, "chunks");
  mkdirSync(chunkDir, { recursive: true });
  if (preview) process.on("exit", () => rmSync(chunkDir, { recursive: true, force: true }));

  const t0 = Date.now();
  log("bundling project…");
  const serveUrl = await bundle({ entryPoint: join(P.root, "src/index.ts"), publicDir: join(P.root, "public") });
  process.on("exit", () => rmSync(serveUrl, { recursive: true, force: true })); // ~450 MB per bundle
  const inputProps = { manifest, orientation: portrait ? "portrait" : "landscape", muted: true, qa: true };
  const composition = await selectComposition({ serveUrl, id: portrait ? "LessonPortrait" : "Lesson", inputProps, browserExecutable: BROWSER ?? undefined });

  // Section chunks clipped to the requested window.
  // Every encoder setting is part of the cache fingerprint.
  const encoder = { codec: "h264" as const, crf: preview ? 23 : 16, pixelFormat: "yuv420p" as const, imageFormat: "jpeg" as const, jpegQuality: 92, colorSpace: "bt709" as const, scale };
  const { sharedHash: engineHash, plans: sectionPlans } = planChunks(manifest, { root: P.root, portrait, scale, encoder, winFrom, winTo });
  log(`engine fingerprint ${engineHash} (shared files; components hashed per section); variant ${variant}; window ${winFrom}s–${winTo}s`);
  for (const p of sectionPlans) if (p.unmapped.length) log(`section ${p.sectionId}: scene type(s) ${p.unmapped.join(", ")} not found in SceneRenderer.tsx — hashing all of src/components for this section`);
  // A preview renders the whole window in one pass (fewer chunk start-ups, so faster) and never touches the cache.
  const plans: ChunkPlan[] = preview && sectionPlans.length
    ? [{ ...sectionPlans[0], sectionId: "preview", f1: sectionPlans.at(-1)!.f1, key: "uncached" }]
    : sectionPlans;
  const chunks: ChunkInfo[] = [];
  const conc = Number(a.concurrency ?? cpus().length);
  for (const { sectionId, f0, f1, key } of plans) {
    const sec = { id: sectionId };
    const file = join(chunkDir, `${sec.id}_${f0}-${f1}_${key}.mp4`);
    const qaFile = file.replace(/\.mp4$/, ".qa.json");
    if (!preview && existsSync(file) && !a.force) {
      log(`section ${sec.id}: cached (frames ${f0}–${f1})`);
      chunks.push({ sectionId: sec.id, frames: [f0, f1], key, file, reused: true, seconds: 0, qa: existsSync(qaFile) ? JSON.parse(readFileSync(qaFile, "utf8")) : [] });
      continue;
    }
    const qa: QaEvent[] = [];
    const ts = Date.now();
    let lastPct = -1;
    const tmp = file.replace(/\.mp4$/, ".partial.mp4");
    await renderMedia({
      composition, serveUrl, outputLocation: tmp, inputProps, frameRange: [f0, f1], muted: true,
      concurrency: conc, browserExecutable: BROWSER ?? undefined, ...encoder, logLevel: "error",
      onBrowserLog: (l) => {
        if (l.text.startsWith("LIFELINK_QA ")) { try { qa.push(JSON.parse(l.text.slice(12))); } catch {} }
      },
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 10) * 10;
        if (pct !== lastPct) { lastPct = pct; log(`section ${sec.id}: ${pct}%`); }
      },
    });
    renameSync(tmp, file); // only completed chunks ever carry the final name (checkpointing)
    writeFileSync(qaFile, JSON.stringify(qa));
    const seconds = (Date.now() - ts) / 1000;
    log(`section ${sec.id}: rendered ${f1 - f0 + 1} frames in ${seconds.toFixed(1)}s`);
    chunks.push({ sectionId: sec.id, frames: [f0, f1], key, file, reused: false, seconds, qa });
  }
  if (!chunks.length) throw new Error("Nothing to render in the requested window");

  // Join chunks losslessly.
  const listFile = join(preview ? chunkDir : outDir, "concat.txt");
  writeFileSync(listFile, chunks.map((c) => `file '${c.file}'`).join("\n"));
  const silent = join(preview ? chunkDir : outDir, "visuals.mp4");
  ff(["-v", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", silent]);

  // Next version number — never overwrite.
  // Previews are named by window and time instead (never a master version number).
  const existing = readdirSync(outDir).filter((f) => /_v\d{3}\.mp4$/.test(f));
  const ver = preview ? "preview" : String(existing.length + 1).padStart(3, "0");
  const startSec = chunks[0].frames[0] / fps;
  const durSec = (chunks.at(-1)!.frames[1] + 1 - chunks[0].frames[0]) / fps;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "");
  const output = preview
    ? join(outDir, `${manifest.lessonId}_${variant}_${startSec.toFixed(1)}-${(startSec + durSec).toFixed(1)}s_${stamp}.mp4`)
    : join(outDir, `${manifest.lessonId}_${variant}_v${ver}.mp4`);

  if (manifest.audio) {
    const src = join(P.root, "public", manifest.audio);
    const mastered = join(preview ? chunkDir : outDir, `narration_master${process.env.LIFELINK_LIMITER !== "0" ? "_lim" : ""}_${startSec}_${durSec}.wav`);
    if (!existsSync(mastered) || a.force) masterNarration(src, mastered, startSec, durSec);
    ff(["-v", "error", "-i", silent, "-i", mastered, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", durSec.toFixed(3), "-movflags", "+faststart", output]);
  } else {
    copyFileSync(silent, output);
  }

  const qaIssues = chunks.flatMap((c) => c.qa);
  const record = output.replace(/\.mp4$/, ".render.json");
  const probe = ffprobe(output);
  writeFileSync(record, JSON.stringify({
    lessonId: manifest.lessonId, courseId: manifest.courseId, variant, version: ver, output: relative(P.root, output),
    window: { fromSec: startSec, toSec: startSec + durSec }, engineFingerprint: engineHash, label: a.label ?? null, tier: preview ? "preview" : "master", sectionCache: preview ? "not used (rendered fresh)" : "per-component keys",
    createdAt: new Date().toISOString(), wallClockSec: (Date.now() - t0) / 1000, concurrency: conc,
    chunks: chunks.map(({ qa, ...c }) => ({ ...c, file: relative(P.root, c.file), qaEvents: qa.length })),
    qaEvents: qaIssues.length, probe: { format: probe.format, streams: probe.streams.map((s: Record<string, unknown>) => ({ codec_type: s.codec_type, codec_name: s.codec_name, width: s.width, height: s.height, r_frame_rate: s.r_frame_rate, duration: s.duration, sample_rate: s.sample_rate, channels: s.channels })) },
  }, null, 2));
  log(`done → ${relative(P.root, output)} (${((Date.now() - t0) / 1000).toFixed(1)}s wall clock)`);
  return { output, record, qaIssues, chunks, durationSec: durSec };
};

/**
 * Narration mastering. Measures loudness (EBU R128) and applies ONE constant gain to -16 LUFS.
 * Default (client approved a gentle limiter on 2026-11-24, see decisions.md): a transparent peak limiter
 * (4x oversampled, -2 dBFS ceiling ≈ -1.5 dBTP, 5 ms attack, 80 ms release) catches the few brief
 * transients that previously capped the gain. No compression, no trimming; pauses untouched.
 * LIFELINK_LIMITER=0 restores the old gain-only behaviour (gain capped by the true peak).
 * Optional noise reduction only with LIFELINK_DENOISE=1.
 */
const masterNarration = (src: string, out: string, startSec: number, durSec: number) => {
  const pre = ["highpass=f=60", ...(process.env.LIFELINK_DENOISE === "1" ? ["afftdn=nr=10:nf=-45"] : [])].join(",");
  const trim = ["-ss", startSec.toFixed(3), "-t", durSec.toFixed(3)];
  const measure = ff(["-v", "info", ...trim, "-i", src, "-af", `${pre},loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"]);
  const json = JSON.parse(measure.slice(measure.lastIndexOf("{"), measure.lastIndexOf("}") + 1));
  const I = Number(json.input_i), TP = Number(json.input_tp);
  const silent = !Number.isFinite(I);
  const wanted = silent ? 0 : -16 - I;
  const limiter = process.env.LIFELINK_LIMITER !== "0";
  const gainDb = silent ? 0 : limiter ? wanted : Math.min(wanted, -1.5 - TP);
  const lim = limiter && !silent && gainDb > -1.5 - TP ? ",aresample=192000,alimiter=limit=0.794:attack=5:release=80:level=disabled,aresample=48000" : "";
  const af = `${pre},volume=${gainDb.toFixed(2)}dB${lim},apad`;
  // apad + output duration: if the video is a fraction of a frame longer than the recording, pad with silence (never cut).
  ff(["-v", "error", ...trim, "-i", src, "-af", af, "-t", durSec.toFixed(3), "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", out]);
  writeFileSync(out.replace(/\.wav$/, ".loudness.json"), JSON.stringify({
    inputLUFS: I, inputTruePeak: TP, gainDb: +gainDb.toFixed(2), expectedLUFS: silent ? null : +(I + gainDb).toFixed(1),
    peakLimited: gainDb < wanted - 0.05, limiter: lim !== "", filter: af,
    note: lim ? "Full gain to -16 LUFS; brief peaks caught by the approved gentle limiter." : gainDb < wanted - 0.05 ? "Peaks prevented full gain (limiter disabled)." : "Target reached with gain only.",
  }, null, 2));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  withLock(`lesson-${a.lesson}`, renderLesson).catch((e) => { console.error(e); process.exit(1); });
}
