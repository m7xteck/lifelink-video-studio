/**
 * Board v5 data contract (documentation/board/DATA-CONTRACT.md) as zod schemas, plus small shared helpers
 * used by board-sync.ts, board-inbox.ts and review-media.ts. Schemas are exported for reuse by the page
 * build and the tests.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { z } from "zod";

export const MAX_DOC_BYTES = 900 * 1024;
export const NARRATION_MAX = 140;

const src = z.string().min(1);
const iso = z.string().min(10);

// ---------- studio → board ----------

export const ItemSchema = z.object({
  id: z.string(), kind: z.enum(["approval", "failure", "decision", "review"]),
  title: z.string(), detail: z.string(),
  action: z.object({ label: z.string(), view: z.string(), ref: z.string() }),
  since: z.string().nullable(), source: src,
});
export type Item = z.infer<typeof ItemSchema>;

export const MetaSchema = z.object({ lastSync: iso, syncedBy: z.literal("studio session"), schema: z.literal(1), source: src });

export const OverviewSchema = z.object({
  courses: z.array(z.object({ id: z.string(), title: z.string(), lessonIds: z.array(z.string()), source: src })),
  activeLessonId: z.string().nullable(),
  attention: z.array(ItemSchema), nextActions: z.array(ItemSchema),
  recent: z.array(z.object({ at: z.string(), text: z.string(), kind: z.string(), source: src })),
  queueCounts: z.object({ queued: z.number().int(), running: z.number().int(), blocked: z.number().int(), failed: z.number().int(), done: z.number().int() }),
  source: src,
});

const StepState = z.enum(["done", "running", "queued", "blocked"]);
export const LessonSchema = z.object({
  id: z.string(), courseId: z.string(), title: z.string(), durationSec: z.number(),
  state: z.string(), source: src,
  stage: z.object({ current: z.string(), steps: z.array(z.object({ id: z.string(), label: z.string(), state: StepState, evidence: z.string(), source: src })) }),
  now: z.object({ text: z.string(), measured: z.literal(true), at: z.string().nullable(), source: src }),
  eta: z.object({ at: z.string(), basis: z.string() }).optional(),
  thumbnail: z.object({ assetUrl: z.string(), source: src }).optional(),
  chapters: z.array(z.object({ id: z.string(), title: z.string(), startSec: z.number(), endSec: z.number(), source: src })),
  scenes: z.array(z.object({
    id: z.string(), chapterId: z.string(), startSec: z.number(), endSec: z.number(), type: z.string(),
    narration: z.string().max(NARRATION_MAX), approval: z.enum(["none", "approved", "changes"]),
  })),
  scenesSource: src,
  renders: z.array(z.object({
    version: z.string(), label: z.string().nullable(), createdAt: z.string(), wallClockMin: z.number(),
    reusedSections: z.number().int(), totalSections: z.number().int(), output: z.string(), outputExists: z.boolean(),
    engineFingerprint: z.string().nullable(),
    qa: z.object({ result: z.string(), pass: z.number().int(), fail: z.number().int(), warn: z.number().int(), report: z.string() }).nullable(),
    source: src,
  })),
  qaIssues: z.array(z.object({ version: z.string(), check: z.string(), status: z.string(), detail: z.string(), atSec: z.number().optional(), source: src })),
  deliverables: z.array(z.object({ kind: z.string(), path: z.string(), exists: z.boolean(), bytes: z.number().int().optional(), source: src })),
  revisions: z.array(z.object({ at: z.string(), text: z.string(), source: src })),
});

export const TaskSchema = z.object({
  id: z.string(), kind: z.string(), owner: z.string(), status: z.string(),
  startedAt: z.string().nullable(), finishedAt: z.string().nullable(), attempts: z.number().int(), maxRetries: z.number().int(),
  lastError: z.string().nullable(), deps: z.array(z.string()), outputs: z.array(z.string()), note: z.string().nullable(), source: src,
});
export const JobsSchema = z.object({ lessonId: z.string(), tasks: z.array(TaskSchema), source: src });

export const EfficiencySchema = z.object({
  measured: z.object({
    fullRenders: z.array(z.object({ lesson: z.string(), version: z.string(), minutes: z.number(), reused: z.number().int(), total: z.number().int(), source: src })),
    agentRuns: z.array(z.object({ run: z.string(), agents: z.number().int(), tokensM: z.number(), outputK: z.number(), wallMin: z.number(), agentMin: z.number(), finished: z.boolean(), source: src })),
    qaFailRate: z.number().nullable(), qaFailRateBasis: z.string(),
    revisionsCount: z.number().int(), revisionsBasis: z.string(),
  }),
  insights: z.array(z.object({ title: z.string(), detail: z.string(), impact: z.enum(["high", "medium", "low"]), evidence: z.string(), action: z.string(), source: src })),
  estimates: z.array(z.object({ label: z.string(), value: z.string(), basis: z.string(), estimate: z.literal(true) })),
  notMeasured: z.array(z.string()),
  source: src,
});

const Sourced = z.object({ text: z.string(), source: src });
export const MemorySchema = z.object({
  locked: z.array(Sourced),
  openItems: z.array(z.object({ item: z.string(), state: z.string(), needed: z.string(), source: src })),
  proposal: z.object({ status: z.string(), version: z.string(), approvedBy: z.string().nullable(), summary: z.array(z.string()), source: src }),
  preferences: z.array(Sourced),
  rejected: z.array(z.object({ id: z.string(), date: z.string(), treatment: z.string(), by: z.string(), why: z.string(), instead: z.string(), source: src })),
  techniques: z.array(z.object({ id: z.string(), text: z.string(), source: src })),
  components: z.array(z.object({ name: z.string(), type: z.string(), status: z.string(), uses: z.number().int(), lastUsed: z.string().nullable(), source: src })),
  feedback: z.array(z.object({ date: z.string(), quote: z.string(), quoteType: z.string(), scope: z.string(), status: z.string(), lesson: z.string().nullable(), source: src })),
});

export const ReviewSchema = z.object({
  versions: z.array(z.object({
    version: z.string(), createdAt: z.string(),
    chapters: z.array(z.object({ chapterId: z.string(), title: z.string(), startSec: z.number(), endSec: z.number(), assetId: z.string().nullable(), url: z.string().nullable(), sizeBytes: z.number().int() })),
  })),
  thumbnail: z.object({ assetId: z.string().nullable(), url: z.string().nullable(), sizeBytes: z.number().int() }).optional(),
  source: src,
});

export const MediaIndexSchema = z.object({
  lessonId: z.string(), version: z.string(), createdAt: z.string(), input: z.string(),
  chapters: z.array(z.object({ chapterId: z.string(), title: z.string(), startSec: z.number(), endSec: z.number(), file: z.string(), sizeBytes: z.number().int() })),
  thumbnail: z.object({ file: z.string(), sizeBytes: z.number().int(), atSec: z.number() }).optional(),
});
export type MediaIndex = z.infer<typeof MediaIndexSchema>;

/** Which schema validates which db path. */
export const schemaFor = (collection: string): z.ZodTypeAny | null => ({
  "studio/meta": MetaSchema, "studio/overview": OverviewSchema,
} as Record<string, z.ZodTypeAny>)[collection] ?? ({ lessons: LessonSchema, jobs: JobsSchema, efficiency: EfficiencySchema, memory: MemorySchema, review: ReviewSchema } as Record<string, z.ZodTypeAny>)[collection.split("/")[0]] ?? null;

// ---------- board → studio (viewer writes) ----------

const viewerBase = { id: z.string(), by: z.string().optional(), at: z.string().optional(), status: z.string() };
export const CommentSchema = z.object({ ...viewerBase, lessonId: z.string(), version: z.string().optional(), chapterId: z.string().optional(), atSec: z.number().optional(), sceneId: z.string().optional(), text: z.string(), taskId: z.string().optional() });
export const ApprovalSchema = z.object({ ...viewerBase, itemRef: z.string(), decision: z.enum(["approve", "changes", "reject"]), note: z.string().default(""), recordedIn: z.string().optional() });
export const RequestSchema = z.object({ ...viewerBase, jobId: z.string(), action: z.enum(["retry", "cancel", "prioritise"]), note: z.string().default(""), result: z.string().optional() });
export const INBOX_COLLECTIONS = ["comments", "approvals", "requests"] as const;
export type InboxCollection = (typeof INBOX_COLLECTIONS)[number];

export type InboxDoc = { collection: InboxCollection; docId: string; version?: number; data: Record<string, unknown>; file: string };

/**
 * Read documents saved by ArtifactData `--out_dir` (<dir>/<collection>/<doc_id>.json). Tolerates a wrapper
 * ({id, version, data}) or a bare document, and an array/collection file ({documents|docs|items: [...]}).
 */
export const readInboxDir = (dir: string): InboxDoc[] => {
  const out: InboxDoc[] = [];
  if (!existsSync(dir)) return out;
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : f.endsWith(".json") ? [p] : []; });
  for (const file of walk(dir)) {
    const rel = relative(dir, file).split("/");
    const coll = (rel.find((s) => (INBOX_COLLECTIONS as readonly string[]).includes(s.replace(/\.json$/, ""))) ?? "").replace(/\.json$/, "") as InboxCollection;
    if (!coll) continue;
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(file, "utf8")); } catch { continue; }
    const list: unknown[] = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as any).documents ?? (raw as any).docs ?? (raw as any).items)
      ? ((raw as any).documents ?? (raw as any).docs ?? (raw as any).items) : [raw];
    for (const r of list) {
      if (!r || typeof r !== "object") continue;
      const o = r as Record<string, unknown>;
      const wrapped = o.data && typeof o.data === "object" && !Array.isArray(o.data) && ("version" in o || "doc_id" in o || "id" in o) && !("status" in o);
      const data = (wrapped ? o.data : o) as Record<string, unknown>;
      const docId = String((wrapped ? (o.doc_id ?? o.id) : undefined) ?? data.id ?? (list.length === 1 ? basename(file, ".json") : ""));
      if (!docId) continue;
      const version = typeof o.version === "number" ? o.version : typeof (o as any).__version === "number" ? (o as any).__version : undefined;
      out.push({ collection: coll, docId, version, data, file });
    }
  }
  return out;
};

// ---------- shared helpers ----------

export const readJson = <T = any>(p: string): T | null => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
export const clip = (s: string, n: number) => { const t = s.replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

/** Manifest merged with sections/*.json (same rules as pipeline/sections.ts loadMerged, without schema validation, read-only). */
export type LooseScene = { id: string; sectionId: string; startSec: number; endSec: number; type: string; props?: any };
export type LooseSection = { id: string; title?: string; startSec: number; endSec: number };
export const loadMergedLoose = (lessonDirPath: string): { manifest: any; sections: LooseSection[]; scenes: LooseScene[]; sectionFiles: string[] } | null => {
  const base = readJson(join(lessonDirPath, "manifest.json"));
  if (!base) return null;
  let sections: LooseSection[] = base.sections ?? [];
  let scenes: LooseScene[] = base.scenes ?? [];
  const sdir = join(lessonDirPath, "sections");
  const sectionFiles = existsSync(sdir) ? readdirSync(sdir).filter((f) => f.endsWith(".json")).sort() : [];
  for (const f of sectionFiles) {
    const sf = readJson(join(sdir, f));
    if (!sf?.section?.id) continue;
    sections = sections.filter((s) => s.id !== sf.section.id).concat(sf.section);
    scenes = scenes.filter((s) => s.sectionId !== sf.section.id).concat(sf.scenes ?? []);
  }
  sections.sort((a, b) => a.startSec - b.startSec);
  scenes.sort((a, b) => a.startSec - b.startSec);
  return { manifest: base, sections, scenes, sectionFiles };
};

/** Words spoken inside [from, to) from a transcript.json ({segments:[{words:[{w,start,end}]}]}). */
export const narrationBetween = (transcript: any, from: number, to: number, max = NARRATION_MAX): string => {
  if (!transcript?.segments) return "";
  const words: string[] = [];
  for (const seg of transcript.segments) {
    if (seg.end < from || seg.start > to) continue;
    for (const w of seg.words ?? []) { const mid = (w.start + w.end) / 2; if (mid >= from && mid < to) words.push(String(w.w).trim()); }
  }
  return clip(words.join(" "), max);
};

/** Write JSON files plus docs.json / writes.json (ArtifactData batch entries; chunked to ≤ 50 entries and ≤ ~900 KB each). */
export type OutDoc = { collection: string; docId: string; data: unknown; ifVersion?: number; op?: "set" | "update" };
export const writeDocs = (outDir: string, docs: OutDoc[]) => {
  mkdirSync(outDir, { recursive: true });
  const listed: { collection: string; doc_id: string; file: string; bytes: number; op: string; if_version?: number }[] = [];
  for (const d of docs) {
    const file = join(outDir, `${d.collection.replace(/\//g, "__")}__${d.docId}.json`);
    const text = JSON.stringify(d.data, null, 1);
    const bytes = Buffer.byteLength(text);
    if (bytes > MAX_DOC_BYTES) throw new Error(`${d.collection}/${d.docId} is ${bytes} bytes (limit ${MAX_DOC_BYTES})`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    listed.push({ collection: d.collection, doc_id: d.docId, file, bytes, op: d.op ?? "set", ...(d.ifVersion ? { if_version: d.ifVersion } : {}) });
  }
  const writes = listed.map((l) => ({ op: l.op, collection: l.collection, doc_id: l.doc_id, file_path: l.file, ...(l.if_version ? { if_version: l.if_version } : {}) }));
  // A batch body is limited to 1 MiB and 50 entries: split so each batch stays below ~900 KB.
  const batches: typeof writes[] = [];
  let cur: typeof writes = [], size = 0;
  listed.forEach((l, i) => {
    if (cur.length && (cur.length >= 50 || size + l.bytes > MAX_DOC_BYTES)) { batches.push(cur); cur = []; size = 0; }
    cur.push(writes[i]); size += l.bytes;
  });
  if (cur.length) batches.push(cur);
  writeFileSync(join(outDir, "writes.json"), JSON.stringify(writes, null, 1));
  batches.forEach((b, i) => writeFileSync(join(outDir, `writes-batch-${i + 1}.json`), JSON.stringify(b, null, 1)));
  writeFileSync(join(outDir, "docs.json"), JSON.stringify({ docs: listed, batches: batches.map((b, i) => ({ file: join(outDir, `writes-batch-${i + 1}.json`), entries: b.length })) }, null, 1));
  return listed;
};

export const argMap = (argv: string[]) => {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) { out[a.slice(2)] = next; i++; } else out[a.slice(2)] = true;
  }
  return out;
};
