/**
 * QA negative tests: prove that pipeline/qa.ts catches deliberately planted defects.
 *
 *   npm run test:qa-negative            (runs under `nice -n 15`; ~10 s fixtures, ultrafast encodes)
 *   KEEP=1 npm run test:qa-negative     keep the temp fixtures and reports for inspection
 *
 * For each case it builds a tiny synthetic fixture (10 s, 1920×1080, 30 fps, H.264 + AAC, unless the defect
 * is the format itself) with ffmpeg, plus a minimal test lesson in courses/__qa-test__/<lesson>/ (manifest, SRT,
 * render record with layout-guard events) and synthetic narration in public/audio/__qa-test__/. It runs qa.ts
 * on it and asserts that exactly the planted check reports FAIL/WARN and every other check passes.
 * Everything it creates (courses/__qa-test__, public/audio/__qa-test__, quality-reports/qaneg-*, temp media)
 * is deleted at the end. qa.ts itself is never modified.
 *
 * Not covered here (needs a real Remotion render): that QaGuard actually emits overlap events while rendering —
 * this test only plants the events qa.ts reads from chunk *.qa.json files. file.decode (corrupt file) and
 * video.codec are not planted.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const FIX = join(import.meta.dirname, "fixtures/qa-negative");
const COURSE = "__qa-test__";
const courseDir = join(ROOT, "courses", COURSE);
const audioDir = join(ROOT, "public/audio", COURSE);
const tmp = mkdtempSync(join(tmpdir(), "lifelink-qa-negative-"));
const DUR = 10, FPS = 30;

const run = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}\n${(r.stderr || "").slice(-1500)}`);
  return r.stderr + r.stdout;
};
const ff = (...args: string[]) => run("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-threads", "2", ...args]);
const X264 = ["-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"];
const AAC = ["-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2"];

// ---------- synthetic narration: syllable-like bursts with pauses (deterministic), normalised to ~-16 LUFS ----------
const makeNarration = (out: string) => {
  const sr = 48000, n = sr * DUR, x = new Float32Array(n);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let t = 0.2;
  while (t < DUR - 0.4) {
    const len = 0.12 + rnd() * 0.25, f0 = 120 + rnd() * 90;
    const a = Math.floor(t * sr), b = Math.min(n, Math.floor((t + len) * sr));
    for (let i = a; i < b; i++) {
      const p = (i - a) / (b - a), env = Math.sin(Math.PI * p) ** 2, s = i / sr;
      x[i] = env * (0.5 * Math.sin(2 * Math.PI * f0 * s) + 0.25 * Math.sin(2 * Math.PI * 2.7 * f0 * s) + 0.15 * (rnd() * 2 - 1));
    }
    t += len + (rnd() < 0.15 ? 0.5 + rnd() * 0.4 : 0.04 + rnd() * 0.2);
  }
  const pcm = Buffer.alloc(44 + n * 2);
  pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + n * 2, 4); pcm.write("WAVE", 8); pcm.write("fmt ", 12);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(sr, 24);
  pcm.writeUInt32LE(sr * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i] * 0.5)) * 32767), 44 + i * 2);
  const raw = join(tmp, "raw.wav");
  writeFileSync(raw, pcm);
  const m = run("ffmpeg", ["-hide_banner", "-nostats", "-i", raw, "-af", "ebur128", "-f", "null", "-"]);
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(m.slice(m.lastIndexOf("Summary")))?.[1]);
  ff("-i", raw, "-af", `volume=${(-16 - I).toFixed(2)}dB,alimiter=limit=0.89:level=false`, "-c:a", "pcm_s16le", out);
};

// ---------- video fixtures ----------
const SRC = `testsrc2=s=1920x1080:r=${FPS}:d=${DUR}`;
const video = {
  clean: (o: string, wav: string) => ff("-f", "lavfi", "-i", SRC, "-i", wav, ...X264, ...AAC, "-t", String(DUR), o),
  // 0.8 s of black reached by 0.6 s fades (so it is a black segment, not a brightness flash)
  black: (o: string, wav: string) => ff("-f", "lavfi", "-i", SRC, "-i", wav, "-filter_complex",
    `[0:v]split[a][b];[a]trim=0:4,setpts=PTS-STARTPTS,fade=t=out:st=3.4:d=0.6[a1];color=c=black:s=1920x1080:r=${FPS}:d=0.8[k];` +
    `[b]trim=4.8:${DUR},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.6[b1];[a1][k][b1]concat=n=3:v=1:a=0[v]`,
    "-map", "[v]", "-map", "1:a", ...X264, ...AAC, "-t", String(DUR), o),
  noAudio: (o: string, clean: string) => ff("-i", clean, "-map", "0:v", "-c:v", "copy", o),
  silentAudio: (o: string, clean: string) => ff("-i", clean, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v", "-map", "1:a", "-c:v", "copy", ...AAC, "-t", String(DUR), o),
  audioLate: (o: string, clean: string, wav: string) => ff("-i", clean, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "adelay=200:all=1,atrim=0:10", ...AAC, "-t", String(DUR), o),
  res720: (o: string, wav: string) => ff("-f", "lavfi", "-i", `testsrc2=s=1280x720:r=${FPS}:d=${DUR}`, "-i", wav, ...X264, ...AAC, "-t", String(DUR), o),
  fps25: (o: string, wav: string) => ff("-f", "lavfi", "-i", `testsrc2=s=1920x1080:r=25:d=${DUR}`, "-i", wav, ...X264, ...AAC, "-t", String(DUR), o),
  // one pure-white frame at 5.0 s
  flash: (o: string, wav: string) => ff("-f", "lavfi", "-i", SRC, "-i", wav, "-vf", "drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill:enable='eq(n,150)'", ...X264, ...AAC, "-t", String(DUR), o),
  // frozen picture 0.5–9.5 s (9 s), motion again at the end. keyint = GOP length in frames:
  // 600 → the freeze lies inside one GOP; 250 (x264's default) → an I-frame at 8.33 s re-encodes the still picture
  frozen: (o: string, wav: string, keyint: number, toEnd = false) => ff("-f", "lavfi", "-i", SRC, "-i", wav, "-filter_complex",
    toEnd ? "[0:v]trim=0:0.5,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=9.5[v]"
      : "[0:v]split[a][b];[a]trim=0:0.5,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=9[a1];[b]trim=9.5:10,setpts=PTS-STARTPTS[b1];[a1][b1]concat=n=2:v=1:a=0[v]",
    "-map", "[v]", "-map", "1:a", ...X264, "-x264-params", `keyint=${keyint}`, ...AAC, "-t", String(DUR), o),
};

// ---------- test lesson ----------
type Lesson = { manifest?: (m: any) => void; srt?: "good" | "bad" | "none"; overlapFrames?: number };
const makeLesson = (lessonId: string, l: Lesson) => {
  const dir = join(courseDir, lessonId);
  mkdirSync(join(dir, "transcript"), { recursive: true });
  mkdirSync(join(dir, "chunks"), { recursive: true });
  const m = JSON.parse(readFileSync(join(FIX, "manifest.base.json"), "utf8"));
  m.lessonId = lessonId;
  l.manifest?.(m);
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(m, null, 2));
  if ((l.srt ?? "good") !== "none") copyFileSync(join(FIX, `${l.srt ?? "good"}.srt`), join(dir, "transcript", `${lessonId}.srt`));
  // render record: the layout guard writes one <chunk>.qa.json per chunk; qa.ts reads them via record.chunks
  const chunk = join(dir, "chunks", "sec-a.mp4");
  const events = Array.from({ length: l.overlapFrames ?? 0 }, (_, i) => ({ frame: 60 + i, issues: [{ kind: "text-overlap", a: "Planted line A", b: "Planted line B" }] }));
  writeFileSync(chunk.replace(/\.mp4$/, ".qa.json"), JSON.stringify(events));
  const record = join(dir, "fixture.render.json");
  writeFileSync(record, JSON.stringify({ window: { fromSec: 0, toSec: DUR }, variant: "landscape", chunks: [{ file: relative(ROOT, chunk) }] }));
  return record;
};

/** knownGap: qa.ts is known to miss this defect (reported, not fixed here — qa.ts is out of scope). The case is shown as
 *  GAP and does not fail the suite unless STRICT=1; if qa.ts starts catching it, the case says so. */
type Case = { name: string; desc: string; video: string; lesson?: Lesson; expect: Record<string, ("FAIL" | "WARN")[]>; knownGap?: string };

const results: { name: string; desc: string; ok: boolean; detail: string; gap?: boolean }[] = [];
const qaRun = (c: Case, videoFile: string) => {
  const lessonId = `qaneg-${c.name}`;
  const record = makeLesson(lessonId, c.lesson ?? {});
  const r = spawnSync("nice", ["-n", "15", "npx", "tsx", "pipeline/qa.ts", "--course", COURSE, "--lesson", lessonId, "--video", videoFile, "--record", record], { cwd: ROOT, encoding: "utf8" });
  const reportDir = join(ROOT, "quality-reports", lessonId);
  const sub = existsSync(reportDir) ? readdirSync(reportDir)[0] : undefined;
  if (!sub) return results.push({ name: c.name, desc: c.desc, ok: false, detail: `qa.ts produced no report (exit ${r.status}): ${(r.stderr || r.stdout).slice(-400)}` });
  const report = JSON.parse(readFileSync(join(reportDir, sub, "report.json"), "utf8"));
  const problems: string[] = [];
  const got: string[] = [];
  for (const ch of report.checks as { id: string; status: string; detail: string }[]) {
    const exp = c.expect[ch.id];
    if (exp) { got.push(`${ch.id}=${ch.status}`); if (!exp.includes(ch.status as "FAIL")) problems.push(`MISSED ${ch.id}: ${ch.status} (expected ${exp.join("/")}) — ${ch.detail}`); }
    else if (ch.status !== "PASS" && ch.status !== "INFO") problems.push(`UNEXPECTED ${ch.id}: ${ch.status} — ${ch.detail}`);
  }
  for (const id of Object.keys(c.expect)) if (!report.checks.some((ch: { id: string }) => ch.id === id)) problems.push(`MISSING check ${id} (not run)`);
  const expectFail = Object.values(c.expect).some((s) => s.includes("FAIL"));
  const exitOk = expectFail ? r.status === 1 : r.status === 0;
  if (!exitOk) problems.push(`exit code ${r.status}`);
  const detail = problems.length ? problems.join(" | ") : (got.join(", ") || `${report.summary}, exit ${r.status}`);
  if (c.knownGap) {
    const missed = problems.some((p) => p.startsWith("MISSED"));
    results.push({ name: c.name, desc: c.desc, gap: missed, ok: process.env.STRICT === "1" ? !problems.length : true,
      detail: missed ? `KNOWN QA GAP — ${c.knownGap}. ${detail}` : `now detected (${detail}) — remove knownGap from this case` });
  } else results.push({ name: c.name, desc: c.desc, ok: !problems.length, detail });
};

const cases: Case[] = [
  { name: "clean", desc: "clean fixture: every check passes", video: "clean", expect: {} },
  { name: "black", desc: "0.8 s black segment at 4.0 s", video: "black", expect: { "picture.black-frames": ["FAIL"] } },
  { name: "no-audio", desc: "audio stream missing", video: "noAudio", expect: { "audio.present": ["FAIL"] } },
  // a silent track cannot be aligned, so sync fails; loudness is a WARN-level check by design
  { name: "silent-audio", desc: "audio track is digital silence", video: "silentAudio", expect: { "audio.sync": ["FAIL"], "audio.loudness": ["WARN"] } },
  { name: "audio-late", desc: "narration 200 ms late", video: "audioLate", expect: { "audio.sync": ["FAIL"] } },
  { name: "wrong-resolution", desc: "1280×720 instead of 1920×1080", video: "res720", expect: { "video.resolution": ["FAIL"] } },
  { name: "wrong-fps", desc: "25 fps instead of 30", video: "fps25", expect: { "video.fps": ["FAIL"] } },
  { name: "flash", desc: "one white frame at 5.0 s", video: "flash", expect: { "picture.flashes": ["FAIL"] } },
  { name: "frozen", desc: "picture frozen 9 s mid-clip, inside one GOP", video: "frozenGop600", expect: { "picture.long-stillness": ["WARN"] } },
  { name: "frozen-across-keyframe", desc: "same 9 s freeze, x264 default GOP (I-frame at 8.33 s)", video: "frozenGop250",
    expect: { "picture.long-stillness": ["WARN"] }, knownGap: "freezedetect n=-70dB is broken by the I-frame re-encode of the still picture, so the freeze splits into runs < 8 s" },
  { name: "frozen-to-end", desc: "picture frozen from 0.5 s to the end of the file", video: "frozenToEnd",
    expect: { "picture.long-stillness": ["WARN"] }, knownGap: "ffmpeg prints only freeze_start for a freeze that lasts to EOF; qa.ts's regex needs freeze_duration" },
  { name: "short-text-hold", desc: "manifest cue at 4.2 s in a scene ending 5.0 s (0.8 s hold)", video: "clean",
    lesson: { manifest: (m) => { m.scenes[0].props.lines[1].at = 4.2; } }, expect: { "manifest.text-hold": ["FAIL"] } },
  { name: "scene-gap", desc: "0.6 s gap between scenes", video: "clean",
    lesson: { manifest: (m) => { m.scenes[1].startSec = 5.6; m.scenes[1].props.at = 6.0; } }, expect: { "manifest.coverage": ["FAIL"] } },
  { name: "invalid-srt", desc: "SRT cue ending before it starts", video: "clean", lesson: { srt: "bad" }, expect: { "subtitles.srt": ["FAIL"] } },
  { name: "missing-srt", desc: "no SRT for a narrated lesson", video: "clean", lesson: { srt: "none" }, expect: { "subtitles.srt": ["FAIL"] } },
  { name: "text-overlap", desc: "layout guard reports a text overlap held 40 frames", video: "clean", lesson: { overlapFrames: 40 }, expect: { "layout.text": ["FAIL"] } },
  { name: "text-contact-transient", desc: "layout guard contact for 5 frames only (must be ignored)", video: "clean", lesson: { overlapFrames: 5 }, expect: {} },
];

const cleanup = () => {
  rmSync(courseDir, { recursive: true, force: true });
  rmSync(audioDir, { recursive: true, force: true });
  for (const d of existsSync(join(ROOT, "quality-reports")) ? readdirSync(join(ROOT, "quality-reports")) : []) if (d.startsWith("qaneg-")) rmSync(join(ROOT, "quality-reports", d), { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
};

try {
  if (existsSync(courseDir)) throw new Error(`${relative(ROOT, courseDir)} already exists — remove it first (left over from an aborted run?)`);
  mkdirSync(audioDir, { recursive: true });
  const wav = join(audioDir, "narration.wav");
  makeNarration(wav);
  const files: Record<string, string> = {};
  const v = (k: string) => (files[k] = join(tmp, `${k}.mp4`));
  video.clean(v("clean"), wav);
  video.black(v("black"), wav);
  video.noAudio(v("noAudio"), files.clean);
  video.silentAudio(v("silentAudio"), files.clean);
  video.audioLate(v("audioLate"), files.clean, wav);
  video.res720(v("res720"), wav);
  video.fps25(v("fps25"), wav);
  video.flash(v("flash"), wav);
  video.frozen(v("frozenGop600"), wav, 600);
  video.frozen(v("frozenGop250"), wav, 250);
  video.frozen(v("frozenToEnd"), wav, 600, true);
  for (const c of cases) {
    // qa.ts names the report folder after the video file, so give each case its own file name
    const file = join(tmp, `qaneg-${c.name}.mp4`);
    copyFileSync(files[c.video], file);
    qaRun(c, file);
    const last = results.at(-1)!;
    console.log(`${last.gap ? "GAP " : last.ok ? "PASS" : "FAIL"}  ${c.name.padEnd(22)} ${c.desc} → ${last.detail}`);
  }
} catch (e) {
  results.push({ name: "setup", desc: "fixture build", ok: false, detail: (e as Error).message.slice(0, 800) });
  console.error(`FAIL  setup: ${(e as Error).message.slice(0, 800)}`);
} finally {
  if (process.env.KEEP === "1") console.log(`kept: ${tmp}, ${relative(ROOT, courseDir)}, quality-reports/qaneg-*`);
  else cleanup();
}
const bad = results.filter((r) => !r.ok);
const gaps = results.filter((r) => r.gap);
console.log(`\n${results.length - bad.length - gaps.length}/${results.length} QA negative tests passed${gaps.length ? `; ${gaps.length} known QA gap(s): ${gaps.map((g) => g.name).join(", ")}` : ""}${bad.length ? ` — failing: ${bad.map((b) => b.name).join(", ")}` : ""}`);
process.exit(bad.length ? 1 : 0);
