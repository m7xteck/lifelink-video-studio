/**
 * Independent Quality Director — objective checks on a rendered file.
 *
 *   npx tsx pipeline/qa.ts --course <id> --lesson <id> --video <path.mp4> [--record <path.render.json>]
 *
 * Writes quality-reports/<lesson>/<video-name>/report.json + report.md + frames/ + contact-sheet.jpg.
 * Exit code 0 = all hard checks passed, 1 = at least one FAIL.
 * Subjective creative review is recorded separately (see workflows/quality-review.md):
 * this script never claims creative quality.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { ManifestSchema, type Manifest } from "../src/schema/manifest";
import { P, lessonDir } from "./lib/paths";
import { decodeCheck, ff, ffprobe } from "./lib/media";
import ds from "../brand/design-system.json";

type Check = { id: string; status: "PASS" | "FAIL" | "WARN" | "INFO"; detail: string; data?: unknown };

export const runQa = (opts: { course: string; lesson: string; video: string; record?: string }) => {
  const dir = lessonDir(opts.course, opts.lesson);
  const m: Manifest = ManifestSchema.parse(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")));
  const rec = opts.record && existsSync(opts.record) ? JSON.parse(readFileSync(opts.record, "utf8")) : null;
  const winFrom: number = rec?.window?.fromSec ?? 0;
  const winTo: number = rec?.window?.toSec ?? m.durationSec;
  const portrait = rec?.variant?.startsWith("portrait");
  const preview = rec?.variant?.includes("preview");
  const scale = preview ? 0.5 : 1;
  const expW = (portrait ? 1080 : m.width) * scale, expH = (portrait ? 1920 : m.height) * scale;
  const outDir = join(P.qa, m.lessonId, basename(opts.video, ".mp4"));
  const framesDir = join(outDir, "frames");
  mkdirSync(framesDir, { recursive: true });
  const checks: Check[] = [];
  const add = (c: Check) => { checks.push(c); };

  // 1. Manifest integrity (ordering, coverage, readable hold times)
  const sc = [...m.scenes];
  const ordered = sc.every((s, i) => i === 0 || s.startSec >= sc[i - 1].startSec);
  const gaps = sc.slice(1).map((s, i) => ({ id: s.id, gap: +(s.startSec - sc[i].endSec).toFixed(3) })).filter((g) => Math.abs(g.gap) > 0.05);
  add({ id: "manifest.order", status: ordered ? "PASS" : "FAIL", detail: ordered ? "Scenes are in narration order" : "Scenes out of order" });
  add({ id: "manifest.coverage", status: gaps.length ? "FAIL" : "PASS", detail: gaps.length ? `Gaps/overlaps between scenes: ${JSON.stringify(gaps)}` : "Scenes cover the timeline without gaps", data: gaps });
  const SIGNATURE_TYPES = new Set(["stepsDiagram", "threePillars", "ecosystemRings", "iceberg", "pressuresShelter", "sortTrays", "bridgePlanks", "balanceScale", "foundationLayers", "lessonMap", "chapterRecap", "scenarioCard", "mythTruth", "mirrorCheck"]);
  const lateText: string[] = [];
  for (const s of sc) {
    const ats: number[] = JSON.stringify(s.props).match(/"at":\s*[\d.]+/g)?.map((x) => Number(x.split(":")[1])) ?? [];
    for (const at of ats) {
      // a revisited stepsDiagram lists later steps that are not spoken yet: StepsDiagram never shows a step before its cue, so they are never on screen
      // Signature pictures (and recaps) list every part with its spoken cue so a returning picture can show earlier parts built and
      // keep later parts hidden: a part whose cue falls outside this scene is either already built (shown all scene) or never shown.
      if ((at > s.endSec || at < s.startSec) && SIGNATURE_TYPES.has(s.type)) continue;
      if (at < s.startSec - 0.01 || at > s.endSec) lateText.push(`${s.id}: cue ${at}s outside scene ${s.startSec}–${s.endSec}`);
      else if (s.endSec - at < ds.motion.minTextHoldSec) lateText.push(`${s.id}: cue at ${at}s is on screen < ${ds.motion.minTextHoldSec}s`);
    }
  }
  add({ id: "manifest.text-hold", status: lateText.length ? "FAIL" : "PASS", detail: lateText.length ? lateText.join("; ") : `Every text cue stays on screen ≥ ${ds.motion.minTextHoldSec}s`, data: lateText });

  // 2. Container / stream checks
  const probe = ffprobe(opts.video);
  const v = probe.streams.find((s: { codec_type: string }) => s.codec_type === "video");
  const au = probe.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
  const dec = decodeCheck(opts.video);
  add({ id: "file.decode", status: dec.ok ? "PASS" : "FAIL", detail: dec.ok ? "Full decode with no errors" : dec.errors.join(" | ") });
  add({ id: "video.resolution", status: v?.width === expW && v?.height === expH ? "PASS" : "FAIL", detail: `${v?.width}×${v?.height} (expected ${expW}×${expH})` });
  add({ id: "video.codec", status: v?.codec_name === "h264" && v?.pix_fmt === "yuv420p" ? "PASS" : "FAIL", detail: `${v?.codec_name} ${v?.profile ?? ""} ${v?.pix_fmt}` });
  const [fn, fd] = String(v?.r_frame_rate ?? "0/1").split("/").map(Number);
  add({ id: "video.fps", status: Math.abs(fn / fd - m.fps) < 0.01 ? "PASS" : "FAIL", detail: `${(fn / fd).toFixed(3)} fps (expected ${m.fps})` });
  const expDur = winTo - winFrom;
  const dur = Number(probe.format.duration);
  const frameTol = 1.5 / m.fps;
  add({ id: "duration", status: Math.abs(dur - expDur) <= frameTol + 0.03 ? "PASS" : "FAIL", detail: `${dur.toFixed(3)}s (expected ${expDur.toFixed(3)}s)` });

  // 3. Audio
  if (m.audio) {
    add({ id: "audio.present", status: au ? "PASS" : "FAIL", detail: au ? `${au.codec_name} ${au.sample_rate} Hz ${au.channels}ch` : "No audio stream" });
    if (au) {
      const adur = Number(au.duration);
      add({ id: "audio.duration", status: Math.abs(adur - expDur) <= 0.06 ? "PASS" : "FAIL", detail: `audio ${adur.toFixed(3)}s vs expected ${expDur.toFixed(3)}s` });
      const r128 = ff(["-nostats", "-i", opts.video, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]);
      const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(r128.slice(r128.lastIndexOf("Summary")))?.[1]);
      const TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(r128.slice(r128.lastIndexOf("Summary")))?.[1]);
      const okI = I > -20 && I < -13;
      add({ id: "audio.loudness", status: okI ? "PASS" : "WARN", detail: `Integrated ${I} LUFS, true peak ${TP} dBFS (target −16 LUFS, ≤ −1 dBTP)` });
      const src = join(P.root, "public", m.audio);
      const py = spawnSync("python3", ["-I", join(P.root, "pipeline/qa_audio.py"), src, opts.video, String(winFrom), String(expDur)], { encoding: "utf8" });
      if (py.status === 0) {
        const r = JSON.parse(py.stdout);
        const ok = r.lag_ms !== null && Math.abs(r.lag_ms) <= 1000 / m.fps && r.peak_corr > 0.5;
        add({ id: "audio.sync", status: ok ? "PASS" : "FAIL", detail: `Narration offset vs original recording: ${r.lag_ms} ms (correlation ${r.peak_corr}); tolerance ±${(1000 / m.fps).toFixed(1)} ms`, data: r });
      } else add({ id: "audio.sync", status: "FAIL", detail: `Sync analysis failed: ${py.stderr.slice(-300)}` });
    }
  }

  // 4. Picture: black frames, flashes, freezes
  const black = ff(["-i", opts.video, "-vf", "blackdetect=d=0.1:pix_th=0.03:pic_th=0.98", "-an", "-f", "null", "-"]);
  const blacks = [...black.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((x) => [Number(x[1]), Number(x[2])]);
  add({ id: "picture.black-frames", status: blacks.length ? "FAIL" : "PASS", detail: blacks.length ? `Black segments: ${JSON.stringify(blacks)}` : "No unexpected black frames" });
  const stats = execFileSync("ffmpeg", ["-v", "error", "-i", opts.video, "-vf", "scale=96:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-an", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const y = [...stats.matchAll(/YAVG=([\d.]+)/g)].map((x) => Number(x[1]));
  const flashes = y.slice(1).map((val, i) => ({ t: +((i + 1) / m.fps + winFrom).toFixed(2), d: +(val - y[i]).toFixed(1) })).filter((f) => Math.abs(f.d) > 24);
  add({ id: "picture.flashes", status: flashes.length ? "FAIL" : "PASS", detail: flashes.length ? `Sudden brightness jumps at ${flashes.map((f) => f.t + "s").join(", ")}` : `No frame-to-frame brightness jumps (max Δ ${Math.max(0, ...y.slice(1).map((v2, i) => Math.abs(v2 - y[i]))).toFixed(1)} of 255)` });
  // -50 dB tolerates the tiny differences an I-frame re-encode leaves in a still picture (at -70 dB a real 9 s freeze split at each keyframe
  // and went undetected — found by pipeline/tests/qa-negative.ts). A freeze that lasts to the end of the file has no freeze_duration line.
  const fr = ff(["-i", opts.video, "-vf", "freezedetect=n=-50dB:d=8", "-an", "-f", "null", "-"]);
  const vidDur = Number(probe.format?.duration ?? 0);
  const freezes = [...fr.matchAll(/freeze_start: ([\d.]+)(?:[\s\S]*?freeze_duration: ([\d.]+))?/g)]
    .map((x) => ({ start: +(Number(x[1]) + winFrom).toFixed(2), dur: x[2] != null ? Number(x[2]) : +(vidDur - Number(x[1])).toFixed(2) }))
    .filter((f) => f.dur >= 8);
  add({ id: "picture.long-stillness", status: freezes.length ? "WARN" : "PASS", detail: freezes.length ? `Completely static for >8s at ${JSON.stringify(freezes)} — confirm intentional` : "No unintended frozen picture (>8s)" });

  // 5. Layout guard events captured during render (outside frame / too small / overlap)
  if (rec) {
    const events: { frame: number; issues: { kind: string; text?: string; a?: string; b?: string }[] }[] = [];
    for (const c of rec.chunks) {
      const qf = join(P.root, c.file).replace(/\.mp4$/, ".qa.json");
      if (existsSync(qf)) events.push(...JSON.parse(readFileSync(qf, "utf8")));
    }
    const byKey = new Map<string, number[]>();
    for (const e of events) for (const i of e.issues) {
      const k = `${i.kind}: ${i.text ?? `${i.a} ⟷ ${i.b}`}`;
      byKey.set(k, [...(byKey.get(k) ?? []), e.frame]);
    }
    const persistent: string[] = [], transient: string[] = [];
    for (const [k, frames] of byKey) {
      frames.sort((p, q) => p - q);
      let run = 1, best = 1;
      for (let i = 1; i < frames.length; i++) { run = frames[i] === frames[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
      const where = `${(frames[0] / m.fps).toFixed(2)}s`;
      (best >= m.fps ? persistent : transient).push(`${k} @${where} (${best} consecutive frames)`);
    }
    add({ id: "layout.text", status: persistent.length ? "FAIL" : "PASS", detail: persistent.length ? persistent.join("; ") : `No clipped, undersized or overlapping text held on screen${transient.length ? ` (${transient.length} momentary mid-animation contacts ignored)` : ""}`, data: { persistent, transient } });
  } else add({ id: "layout.text", status: "WARN", detail: "No render record supplied — layout guard results unavailable" });

  // 6. Subtitles
  const srt = join(dir, "transcript", `${m.lessonId}.srt`);
  if (existsSync(srt)) {
    const cues = readFileSync(srt, "utf8").trim().split(/\n\s*\n/).map((b) => b.split("\n"));
    const toS = (t: string) => { const [h, mi, rest] = t.split(":"); return +h * 3600 + +mi * 60 + Number(rest.replace(",", ".")); };
    let ok = true, prev = 0;
    for (const c of cues) {
      const [st, en] = (c[1] ?? "").split(" --> ").map(toS);
      if (!(en > st) || st < prev - 0.001 || en > m.durationSec + 0.5 || !c.slice(2).join(" ").trim()) ok = false;
      prev = en;
    }
    add({ id: "subtitles.srt", status: ok ? "PASS" : "FAIL", detail: `${cues.length} cues; timing monotonic and within duration: ${ok}` });
  } else add({ id: "subtitles.srt", status: m.audio && !m.lessonId.startsWith("test-") ? "FAIL" : "INFO", detail: "No SRT for this lesson" });

  // 7. Frames for visual review: every scene (entry + settled) and seeded random samples across runtime
  const times: { t: number; why: string }[] = [];
  for (const s of m.scenes) {
    if (s.endSec <= winFrom || s.startSec >= winTo) continue;
    times.push({ t: Math.max(s.startSec, winFrom) + 0.25, why: `${s.id} transition-in` });
    times.push({ t: Math.min(s.endSec, winTo) - 0.3, why: `${s.id} settled` });
  }
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 8; i++) times.push({ t: winFrom + rnd() * (winTo - winFrom), why: "random sample" });
  times.sort((p, q) => p.t - q.t);
  const frameFiles: { file: string; t: number; why: string }[] = [];
  times.forEach((x, i) => {
    const rel = Math.max(0, Math.min(x.t - winFrom, dur - 0.05));
    const f = join(framesDir, `${String(i).padStart(2, "0")}_${x.t.toFixed(2)}s.jpg`);
    ff(["-v", "error", "-ss", rel.toFixed(3), "-i", opts.video, "-frames:v", "1", "-q:v", "3", f]);
    frameFiles.push({ file: relative(P.root, f), t: +x.t.toFixed(2), why: x.why });
  });
  const sheet = join(outDir, "contact-sheet.jpg");
  const cols = 4, rows = Math.ceil(frameFiles.length / cols);
  ff(["-v", "error", "-pattern_type", "glob", "-i", join(framesDir, "*.jpg"), "-vf", `scale=480:-2,tile=${cols}x${rows}:padding=6:color=0x222222`, "-frames:v", "1", "-q:v", "3", sheet]);

  const fails = checks.filter((c) => c.status === "FAIL");
  const report = {
    lessonId: m.lessonId, video: relative(P.root, opts.video), createdAt: new Date().toISOString(),
    result: fails.length ? "FAIL" : "PASS", summary: `${checks.filter((c) => c.status === "PASS").length} pass, ${fails.length} fail, ${checks.filter((c) => c.status === "WARN").length} warn`,
    checks, frames: frameFiles, contactSheet: relative(P.root, sheet),
    creativeReview: { status: "PENDING", note: "Objective checks only. Creative/brand review is recorded separately and never inferred from these results." },
  };
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  const md = [`# QA report — ${m.lessonId}`, "", `Video: \`${report.video}\`  `, `Result: **${report.result}** (${report.summary})  `, `Generated: ${report.createdAt}`, "",
    "| Check | Result | Detail |", "|---|---|---|", ...checks.map((c) => `| ${c.id} | ${c.status} | ${c.detail.replace(/\|/g, "/")} |`), "",
    `Contact sheet: \`${report.contactSheet}\``, "", "Creative review: PENDING (recorded separately)."].join("\n");
  writeFileSync(join(outDir, "report.md"), md);
  return { report, outDir };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" }, video: { type: "string" }, record: { type: "string" } } });
  const { report, outDir } = runQa({ course: values.course!, lesson: values.lesson!, video: values.video!, record: values.record ?? values.video!.replace(/\.mp4$/, ".render.json") });
  console.log(`QA ${report.result}: ${report.summary} → ${relative(P.root, outDir)}/report.md`);
  for (const c of report.checks) console.log(` ${c.status.padEnd(4)} ${c.id}: ${c.detail}`);
  process.exit(report.result === "PASS" ? 0 : 1);
}
