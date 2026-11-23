/**
 * Recording ingestion.
 *
 *   npx tsx pipeline/ingest.ts --course <course-slug> [--inbox media/inbox]
 *
 * For every audio/video file in the inbox (sorted by filename, so name files
 * "01 Intro.m4a", "02 Communication.m4a", …):
 *  - checks it decodes fully (corruption check) and reads format/duration/metadata,
 *  - fingerprints it (SHA-256) so the same recording is never imported twice,
 *  - assigns a stable lesson ID (<course>-L01, -L02 …),
 *  - moves the original into media/originals/ and makes it read-only (never modified),
 *  - creates a lossless 48 kHz WAV working copy for the engine,
 *  - writes courses/<course>/<lesson>/lesson.json and status.json (IMPORTED → AUDIO_ANALYSED).
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { P, lessonDir } from "./lib/paths";
import { decodeCheck, ff, ffprobe, sha256 } from "./lib/media";
import { createStatus, transition } from "./lib/status";
import { withLock } from "./lib/lock";

const AUDIO_EXT = new Set([".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".opus", ".wma", ".aiff", ".aif", ".mp4", ".mov", ".webm", ".mkv"]);

export const ingest = async (course: string, inbox = P.inbox) => {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(course)) throw new Error("Course slug must be lowercase letters, numbers and dashes");
  mkdirSync(P.originals, { recursive: true }); mkdirSync(P.publicAudio, { recursive: true });
  const registryPath = join(P.courses, course, "course.json");
  mkdirSync(join(P.courses, course), { recursive: true });
  const registry = existsSync(registryPath) ? JSON.parse(readFileSync(registryPath, "utf8"))
    : { courseId: course, title: null, createdAt: new Date().toISOString(), lessons: [] as { lessonId: string; sha256: string; sourceName: string }[] };

  const files = readdirSync(inbox).filter((f) => AUDIO_EXT.has(extname(f).toLowerCase())).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const results: Record<string, unknown>[] = [];
  const save = () => writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  for (const f of files) {
    try {
      results.push(await ingestOne(f));
    } catch (e) {
      results.push({ file: f, error: (e as Error).message.split("\n")[0] });
    }
    save(); // checkpoint after every file
  }
  return results;

  async function ingestOne(f: string): Promise<Record<string, unknown>> {
    const src = join(inbox, f);
    const hash = await sha256(src);
    const dup = registry.lessons.find((l: { sha256: string }) => l.sha256 === hash);
    if (dup) return { file: f, skipped: `already imported as ${dup.lessonId}` };

    const dec = decodeCheck(src);
    let probe: { format: Record<string, unknown> & { tags?: Record<string, string> }; streams: Record<string, unknown>[] } | null = null;
    try { probe = ffprobe(src); } catch { probe = null; }
    const audio = probe?.streams.find((s) => s.codec_type === "audio") as Record<string, string | number> | undefined;
    if (!dec.ok || !audio || !probe) {
      const q = join(P.root, "media/quarantine"); mkdirSync(q, { recursive: true });
      renameSync(src, join(q, f));
      return { file: f, error: `unreadable or damaged (${!audio ? "no audio stream" : "decode errors"}) — moved to media/quarantine`, details: dec.errors.slice(0, 2).join(" | ") };
    }

    const n = registry.lessons.length + 1;
    const lessonId = `${course}-L${String(n).padStart(2, "0")}`;
    const ext = extname(f).toLowerCase();
    const original = join(P.originals, `${lessonId}${ext}`);
    if (existsSync(original)) throw new Error(`Refusing to overwrite existing original ${original}`);
    renameSync(src, original);
    chmodSync(original, 0o444);
    const working = join(P.publicAudio, `${lessonId}.wav`);
    ff(["-v", "error", "-i", original, "-vn", "-ar", "48000", "-c:a", "pcm_s16le", working]);
    const wprobe = ffprobe(working);

    const dir = lessonDir(course, lessonId);
    mkdirSync(dir, { recursive: true });
    const lesson = {
      lessonId, courseId: course, sequence: n, title: titleFromFilename(f), sourceName: f,
      original: relative(P.root, original), sha256: hash, workingAudio: relative(P.root, working),
      durationSec: Number(wprobe.format.duration),
      source: { format: probe.format.format_name, codec: audio.codec_name, sampleRate: Number(audio.sample_rate), channels: audio.channels, bitRate: Number(probe.format.bit_rate) || null, tags: probe.format.tags ?? {} },
      importedAt: new Date().toISOString(),
    };
    writeFileSync(join(dir, "lesson.json"), JSON.stringify(lesson, null, 2));
    createStatus(dir, course, lessonId, { original: lesson.original, sha256: hash });
    transition(dir, "AUDIO_ANALYSED", "Decoded fully, metadata extracted, working copy created", { durationSec: lesson.durationSec, decodeErrors: 0, workingAudio: lesson.workingAudio });
    registry.lessons.push({ lessonId, sha256: hash, sourceName: f });
    return { file: f, lessonId, durationSec: +lesson.durationSec.toFixed(2) };
  }
};

const titleFromFilename = (f: string) => basename(f, extname(f)).replace(/^\d+[\s._-]*/, "").replace(/[_-]+/g, " ").trim() || f;

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({ options: { course: { type: "string" }, inbox: { type: "string" } } });
  if (!values.course) { console.error("Usage: --course <course-slug>"); process.exit(2); }
  withLock(`course-${values.course}`, () => ingest(values.course!, values.inbox ?? P.inbox))
    .then((r) => { console.table(r); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
