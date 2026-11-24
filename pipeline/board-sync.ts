/**
 * Board v5 data sync (documentation/board/DATA-CONTRACT.md): builds one JSON document per db path from real
 * project files, plus docs.json (collection/doc_id/file list) and writes.json (ArtifactData batch `writes`
 * entries, op "set" with `file_path`; the caller adds `if_version` for documents that already exist).
 *
 *   npx tsx pipeline/board-sync.ts --root <repoRoot> --out <dir> [--journals <workflowsDir>]
 *        [--memory <production-memory dir>] [--jobs <production/jobs dir>] [--inbox-state <ArtifactData out_dir>]
 *        [--review-media <dir with media-index.json (+ upload-result.json)>] [--include-test]
 *
 * --root is read-only (it can be the main repo while this code lives in a worktree). The ledger and the
 * structured production memory default to this checkout (where they live today), falling back to --root.
 * Workflow journals are imported into a TEMPORARY copy of the ledger (never into --root or this checkout).
 */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { allTasks, importWorkflow, type Task } from "./lib/jobs";
import {
  argMap, clip, loadMergedLoose, narrationBetween, readInboxDir, readJson, schemaFor, writeDocs,
  type Item, type OutDoc, MediaIndexSchema,
} from "./lib/board-data";
import { buildReviewDoc } from "./review-media";

const CODE_ROOT = resolve(import.meta.dirname, "..");

export type SyncOpts = {
  root: string; journals?: string; memory?: string; jobsDir?: string; inboxState?: string;
  reviewMedia?: string; includeTest?: boolean; now?: string;
};

type RenderRec = {
  lesson: string; course: string; variant: string; version: string; label: string | null; createdAt: string;
  wallClockSec: number; reused: number; total: number; output: string; fingerprint: string | null;
  chunks: { sectionId: string; reused: boolean; seconds: number }[]; file: string;
  qa: null | { result: string; pass: number; fail: number; warn: number; report: string; createdAt: string; checks: any[] };
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const ls = (d: string) => (existsSync(d) ? readdirSync(d) : []);
const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory();

// ---------- markdown helpers (production-memory) ----------
const mdSection = (md: string, title: string) => {
  const lines = md.split("\n");
  const i = lines.findIndex((l) => l.startsWith("## ") && l.slice(3).startsWith(title));
  if (i < 0) return [];
  const j = lines.findIndex((l, k) => k > i && l.startsWith("## "));
  return lines.slice(i + 1, j < 0 ? undefined : j);
};
const mdBullets = (lines: string[]) => {
  const out: string[] = [];
  let inSub = false;
  for (const l of lines) {
    if (l.startsWith("- ")) { out.push(l.slice(2)); inSub = false; }
    else if (/^\s+- /.test(l)) inSub = true;
    else if (/^\s+\S/.test(l) && out.length && !inSub) out[out.length - 1] += " " + l.trim();
    else inSub = false;
  }
  return out.map((b) => b.replace(/\*\*/g, "").trim());
};
const mdRows = (lines: string[]) => lines.filter((l) => l.startsWith("|") && !/^\|[\s|:-]+\|$/.test(l))
  .map((l) => l.split("|").slice(1, -1).map((c) => c.trim().replace(/\*\*/g, "")));

// ---------- agent runs (journals) ----------
export const measureRun = (dir: string) => {
  let tokens = 0, output = 0, agentSec = 0, n = 0;
  let first = Infinity, last = -Infinity;
  for (const f of ls(dir).filter((x) => /^agent-.*\.jsonl$/.test(x))) {
    n++;
    const usage = new Map<string, any>();
    let a = Infinity, b = -Infinity;
    for (const line of readFileSync(join(dir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      let o: any;
      try { o = JSON.parse(line); } catch { continue; }
      if (o.timestamp) { const t = Date.parse(o.timestamp); if (t < a) a = t; if (t > b) b = t; }
      const m = o.message;
      if (m && typeof m === "object" && m.id && m.usage) usage.set(m.id, m.usage); // deduplicate per API message
    }
    for (const u of usage.values()) {
      tokens += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.output_tokens ?? 0);
      output += u.output_tokens ?? 0;
    }
    if (a !== Infinity) { agentSec += (b - a) / 1000; first = Math.min(first, a); last = Math.max(last, b); }
  }
  const journal = existsSync(join(dir, "journal.jsonl")) ? readFileSync(join(dir, "journal.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } }) : [];
  const started = new Set(journal.filter((j: any) => j.type === "started").map((j: any) => j.agentId));
  const results = new Set(journal.filter((j: any) => j.type === "result").map((j: any) => j.agentId));
  return {
    run: basename(dir), agents: n, tokensM: r1(tokens / 1e6), outputK: Math.round(output / 1e3),
    wallMin: first === Infinity ? 0 : Math.round((last - first) / 60000), agentMin: Math.round(agentSec / 60),
    finished: started.size > 0 && [...started].every((id) => results.has(id)),
    firstAt: first === Infinity ? null : new Date(first).toISOString(), lastAt: last === -Infinity ? null : new Date(last).toISOString(),
    tokens, output,
  };
};

// ---------- main build ----------
export const buildBoard = (o: SyncOpts): { docs: OutDoc[]; warnings: string[] } => {
  const root = resolve(o.root);
  const warnings: string[] = [];
  const now = o.now ?? new Date().toISOString();
  const rel = (p: string) => relative(root, p) || ".";
  const memDir = o.memory ?? (existsSync(join(CODE_ROOT, "production-memory/feedback-log.jsonl")) ? join(CODE_ROOT, "production-memory") : join(root, "production-memory"));
  const memRoot = resolve(memDir, "..");
  const memRel = (p: string) => relative(memRoot, p);
  const jobsDir = o.jobsDir ?? (isDir(join(CODE_ROOT, "production/jobs")) ? join(CODE_ROOT, "production/jobs") : join(root, "production/jobs"));
  const jobsRel = (p: string) => relative(resolve(jobsDir, "../.."), p);

  // ----- courses & lessons -----
  const coursesDir = join(root, "courses");
  const courseIds = ls(coursesDir).filter((c) => isDir(join(coursesDir, c)) && !c.startsWith("_") && (o.includeTest || !/test/i.test(c)));
  type L = { id: string; course: string; dir: string; meta: any; status: any; merged: ReturnType<typeof loadMergedLoose>; transcript: any; transcriptFile: string };
  const lessons: L[] = [];
  const courses = courseIds.map((c) => {
    const cj = readJson(join(coursesDir, c, "course.json"));
    const ids: string[] = (cj?.lessons ?? []).map((l: any) => l.lessonId).filter((id: string) => isDir(join(coursesDir, c, id)));
    for (const id of ls(join(coursesDir, c))) if (isDir(join(coursesDir, c, id)) && !ids.includes(id) && existsSync(join(coursesDir, c, id, "lesson.json"))) ids.push(id);
    for (const id of ids) {
      const dir = join(coursesDir, c, id);
      const tf = join(dir, "transcript", `${id}.transcript.json`);
      lessons.push({ id, course: c, dir, meta: readJson(join(dir, "lesson.json")), status: readJson(join(dir, "status.json")), merged: loadMergedLoose(dir), transcript: readJson(tf), transcriptFile: tf });
    }
    return { id: c, title: cj?.title ?? c, lessonIds: ids, source: rel(join(coursesDir, c, "course.json")) + (cj?.title ? "" : " (title not set: course id shown)") };
  });

  // ----- renders + QA -----
  const renders: RenderRec[] = [];
  for (const l of lessons) {
    const rdir = join(root, "renders", l.id);
    for (const variant of ls(rdir)) {
      if (!isDir(join(rdir, variant))) continue;
      for (const f of ls(join(rdir, variant)).filter((x) => x.endsWith(".render.json"))) {
        const j = readJson(join(rdir, variant, f));
        if (!j?.version) continue;
        const v = j.variant ?? variant;
        if (v.includes("sample") || v.includes("preview")) continue; // full renders only
        const qaFile = join(root, "quality-reports", l.id, `${l.id}_${v}_v${j.version}`, "report.json");
        const q = readJson(qaFile);
        const checks: any[] = q?.checks ?? [];
        renders.push({
          lesson: l.id, course: l.course, variant: v, version: j.version, label: j.label ?? null, createdAt: j.createdAt,
          wallClockSec: j.wallClockSec, reused: (j.chunks ?? []).filter((c: any) => c.reused).length, total: (j.chunks ?? []).length,
          output: j.output, fingerprint: j.engineFingerprint ?? null, chunks: j.chunks ?? [], file: rel(join(rdir, variant, f)),
          qa: q ? { result: q.result, pass: checks.filter((c) => c.status === "PASS").length, fail: checks.filter((c) => c.status === "FAIL").length, warn: checks.filter((c) => c.status === "WARN").length, report: rel(qaFile), createdAt: q.createdAt, checks } : null,
        });
      }
    }
  }
  renders.sort((a, b) => a.lesson.localeCompare(b.lesson) || a.version.localeCompare(b.version));

  // ----- ledger (+ journals imported into a temporary copy) -----
  const tmpJobs = mkdtempSync(join(tmpdir(), "board-sync-jobs-"));
  const runs: ReturnType<typeof measureRun>[] = [];
  const journalLesson = new Map<string, string>();
  let tasks: Task[] = [];
  try {
    if (isDir(jobsDir)) cpSync(jobsDir, tmpJobs, { recursive: true, filter: (s) => !s.endsWith(".lock") });
    if (o.journals && isDir(o.journals)) {
      const scripts = ls(join(CODE_ROOT, "workflows")).filter((f) => f.endsWith(".js"));
      for (const wf of ls(o.journals).filter((d) => isDir(join(o.journals!, d)) && existsSync(join(o.journals!, d, "journal.jsonl")))) {
        const script = scripts.find((s) => s.includes(wf));
        const text = script ? readFileSync(join(CODE_ROOT, "workflows", script), "utf8") : "";
        const lesson = lessons.find((l) => text.includes(l.id));
        runs.push(measureRun(join(o.journals, wf)));
        if (!lesson) { warnings.push(`journal ${wf}: no workflows/*${wf}*.js naming a known lesson; tasks not imported`); continue; }
        journalLesson.set(wf, lesson.id);
        importWorkflow(join(o.journals, wf), lesson.course, lesson.id, tmpJobs);
      }
    }
    tasks = allTasks({ root: tmpJobs });
  } finally { rmSync(tmpJobs, { recursive: true, force: true }); }
  const ledgerFile = (t: Task) => jobsRel(join(jobsDir, t.course, `${t.lesson}.jsonl`));
  const taskSource = (t: Task) => (t.source === "workflow-journal" ? "workflow-journal" : ledgerFile(t));

  // ----- production memory -----
  const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
  const feedback = read(join(memDir, "feedback-log.jsonl")).split("\n").filter((l) => l.trim()).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  const lockedMd = read(join(memDir, "brand/LOCKED.md")) || read(join(memDir, "brand-rules.md"));
  const lockedFile = existsSync(join(memDir, "brand/LOCKED.md")) ? join(memDir, "brand/LOCKED.md") : join(memDir, "brand-rules.md");
  const decisionsFile = join(memDir, "decisions.md");
  const decisionRows = mdRows(read(decisionsFile).split("\n")).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[0]));

  // ----- inbox state (viewer approvals) -----
  const inbox = o.inboxState ? readInboxDir(o.inboxState) : [];
  const approvals = inbox.filter((d) => d.collection === "approvals");

  // ----- per-lesson documents -----
  const docs: OutDoc[] = [];
  const attention: Item[] = [];
  const nextActions: Item[] = [];
  const recent: { at: string; text: string; kind: string; source: string }[] = [];
  const lessonLatest = new Map<string, string>();
  const typeUses = new Map<string, { uses: number; lessons: Set<string> }>();
  const short = (id: string) => id.split("-").pop()!;

  for (const l of lessons) {
    const m = l.merged;
    const st = l.status;
    const lr = renders.filter((r) => r.lesson === l.id);
    const latest = lr.at(-1);
    const lt = tasks.filter((t) => t.lesson === l.id);
    const statusFile = rel(join(l.dir, "status.json"));
    const manifestFile = rel(join(l.dir, "manifest.json"));

    for (const s of m?.scenes ?? []) {
      const u = typeUses.get(s.type) ?? { uses: 0, lessons: new Set() };
      u.uses++; u.lessons.add(l.id); typeUses.set(s.type, u);
    }

    // chapters & scenes
    const chapters = (m?.sections ?? []).map((s, i) => {
      const kicker = m!.scenes.find((x) => x.sectionId === s.id && x.props?.kicker)?.props?.kicker;
      return { id: s.id, title: s.title ?? kicker ?? `Chapter ${i + 1}`, startSec: s.startSec, endSec: s.endSec,
        source: s.title ? (m!.sectionFiles.includes(`${s.id}.json`) ? rel(join(l.dir, "sections", `${s.id}.json`)) : manifestFile) : kicker ? manifestFile + " (first kicker)" : "fallback: no title in section data" };
    });
    const refMatch = (ref: string) => { const p = ref.split(":"); return p[0] === "lesson" && (p[1] === l.id || p[1] === short(l.id) || l.id.endsWith(`-${p[1]}`)) ? p : null; };
    const chapterApproval = new Map<string, "approved" | "changes">();
    for (const a of approvals) {
      const d = a.data as any;
      const p = refMatch(String(d.itemRef ?? ""));
      if (!p || d.status !== "recorded") continue;
      const ci = p.indexOf("chapter");
      if (ci > 0 && p[ci + 1]) chapterApproval.set(p[ci + 1], d.decision === "approve" ? "approved" : "changes");
    }
    const scenes = (m?.scenes ?? []).map((s) => ({
      id: s.id, chapterId: s.sectionId, startSec: s.startSec, endSec: s.endSec, type: s.type,
      narration: narrationBetween(l.transcript, s.startSec, s.endSec), approval: chapterApproval.get(s.sectionId) ?? ("none" as const),
    }));

    // renders & QA issues
    const rendersOut = lr.map((r) => ({
      version: r.version, label: r.label, createdAt: r.createdAt, wallClockMin: r1(r.wallClockSec / 60),
      reusedSections: r.reused, totalSections: r.total, output: r.output, outputExists: existsSync(join(root, r.output)),
      engineFingerprint: r.fingerprint, qa: r.qa ? { result: r.qa.result, pass: r.qa.pass, fail: r.qa.fail, warn: r.qa.warn, report: r.qa.report } : null, source: r.file,
    }));
    const qaIssues = lr.flatMap((r) => (r.qa?.checks ?? []).filter((c) => c.status !== "PASS").flatMap((c) => {
      const items: string[] = Array.isArray(c.data) && c.data.length && c.data.every((x: unknown) => typeof x === "string") ? c.data : [c.detail];
      return items.slice(0, 40).map((d) => {
        const at = /(?:at|@|cue)\s*(\d+(?:\.\d+)?)s/.exec(d);
        return { version: r.version, check: c.id, status: c.status, detail: clip(d, 240), ...(at ? { atSec: Number(at[1]) } : {}), source: r.qa!.report };
      });
    }));

    // deliverables
    const delDir = join(root, "deliverables", l.course, l.id);
    const deliverables: { kind: string; path: string; exists: boolean; bytes?: number; source: string }[] = [];
    const kindOf = (f: string) => f.endsWith("_1080p.mp4") ? "master video" : f.endsWith(".srt") ? "subtitles" : f.endsWith(".transcript.json") ? "transcript (json)" : f.endsWith(".txt") ? "transcript (text)" : f.endsWith(".timeline.json") ? "timeline" : f.endsWith("_thumbnail.jpg") ? "thumbnail" : f.startsWith("qa-report") ? "QA report" : f.replace(/\.[a-z]+$/, "");
    if (isDir(delDir)) for (const f of ls(delDir)) deliverables.push({ kind: kindOf(f), path: rel(join(delDir, f)), exists: true, bytes: statSync(join(delDir, f)).size, source: rel(delDir) });
    else for (const [kind, pat] of [["master video", "<name>_1080p.mp4"], ["subtitles", "<name>.srt"], ["transcript (text)", "<name>.txt"], ["timeline", "<name>.timeline.json"], ["thumbnail", "<name>_thumbnail.jpg"], ["QA report", "qa-report.json"]])
      deliverables.push({ kind, path: rel(join(delDir, pat)), exists: false, source: "pipeline/package.ts (expected outputs); folder missing" });
    const prevDir = join(root, "previews", l.id);
    for (const f of ls(prevDir).filter((x) => x.endsWith(".mp4"))) deliverables.push({ kind: "preview", path: rel(join(prevDir, f)), exists: true, bytes: statSync(join(prevDir, f)).size, source: rel(prevDir) });
    for (const r of lr) deliverables.push({ kind: `full render v${r.version}`, path: r.output, exists: existsSync(join(root, r.output)), ...(existsSync(join(root, r.output)) ? { bytes: statSync(join(root, r.output)).size } : {}), source: r.file });

    // stage
    const running = lt.filter((t) => t.status === "running");
    const creative = st?.approval?.creative ?? "none";
    const steps = [
      { id: "ingest", label: "Recording ingested", state: l.meta ? "done" : "queued", evidence: l.meta ? `lesson.json imported ${l.meta.importedAt ?? ""}`.trim() : "no lesson.json", source: rel(join(l.dir, "lesson.json")) },
      { id: "transcribe", label: "Transcript", state: l.transcript ? "done" : "queued", evidence: l.transcript ? `${l.transcript.wordCount ?? "?"} words (${l.transcript.model ?? "?"})` : "no transcript.json", source: rel(l.transcriptFile) },
      { id: "plan", label: "Creative plan / scenes", state: m ? "done" : "queued", evidence: m ? `${m.sections.length} chapters, ${m.scenes.length} scenes` : "no manifest.json", source: manifestFile },
      { id: "approval", label: "Client approval (creative)", state: creative === "approved" ? "done" : "blocked", evidence: `status.json approval.creative = "${creative}", state ${st?.state ?? "?"}`, source: statusFile },
      { id: "build", label: "Build", state: running.length ? "running" : m?.scenes.length ? "done" : "queued", evidence: running.length ? `${running.length} task(s) recorded running` : m?.scenes.length ? `${m.scenes.length} scenes in manifest + sections` : "no scenes", source: running.length ? taskSource(running[0]) : manifestFile },
      { id: "render", label: "Full render", state: latest ? "done" : "queued", evidence: latest ? `v${latest.version} (${r1(latest.wallClockSec / 60)} min)` : "no full render record", source: latest?.file ?? rel(join(root, "renders", l.id)) },
      { id: "qa", label: "Automated QA", state: !latest?.qa ? "queued" : latest.qa.result === "PASS" ? "done" : "blocked", evidence: latest?.qa ? `v${latest.version}: ${latest.qa.result} (${latest.qa.pass} pass, ${latest.qa.fail} fail, ${latest.qa.warn} warn)` : "no QA report for the latest render", source: latest?.qa?.report ?? "quality-reports/" },
      { id: "deliver", label: "Delivery package", state: deliverables.some((d) => d.kind === "master video" && d.exists) ? "done" : "queued", evidence: isDir(delDir) ? `${ls(delDir).length} files` : "deliverables folder missing", source: rel(delDir) },
    ] as const;
    const current = steps.find((s) => s.state !== "done")?.id ?? "complete";

    // revisions & recent
    const revisions: { at: string; text: string; source: string }[] = [];
    for (const r of lr) revisions.push({ at: r.createdAt, text: `Full render v${r.version}${r.label ? `: ${r.label}` : ""}`, source: r.file });
    for (const f of feedback.filter((f) => f.lesson === l.id)) revisions.push({ at: f.date, text: clip(`Client (${f.quote_type}, ${f.status}): ${f.quote}`, 300), source: memRel(join(memDir, "feedback-log.jsonl")) });
    for (const t of lt.filter((t) => t.kind === "revision")) revisions.push({ at: t.createdAt ?? "", text: clip(`Revision task ${t.id} (${t.status}): ${t.note ?? ""}`, 300), source: taskSource(t) });
    revisions.sort((a, b) => a.at.localeCompare(b.at));

    for (const h of st?.history ?? []) recent.push({ at: h.at, text: `${l.id}: ${h.from ?? "—"} → ${h.to}: ${clip(h.note, 120)}`, kind: "status", source: statusFile });
    for (const r of lr) {
      recent.push({ at: r.createdAt, text: `${l.id} full render v${r.version} finished: ${r1(r.wallClockSec / 60)} min, ${r.reused}/${r.total} sections reused`, kind: "render", source: r.file });
      if (r.qa) recent.push({ at: r.qa.createdAt, text: `${l.id} QA v${r.version}: ${r.qa.result} (${r.qa.pass} pass, ${r.qa.fail} fail, ${r.qa.warn} warn)`, kind: "qa", source: r.qa.report });
    }
    const lastTask = lt.map((t) => t.finishedAt ?? t.startedAt ?? t.createdAt ?? "").sort().at(-1) ?? "";
    lessonLatest.set(l.id, [lastTask, latest?.createdAt ?? "", st?.history?.at(-1)?.at ?? ""].sort().at(-1)!);

    // now
    const wfRunning = [...new Set(running.map((t) => t.workflow ?? t.id))];
    const lastRunning = running.map((t) => t.startedAt ?? "").sort().at(-1) ?? null;
    const nowText = running.length
      ? `${running.length} task(s) recorded as running (${wfRunning.join(", ")}); no result recorded for them yet. Latest start ${lastRunning}.`
      : latest ? `Last verified result: full render v${latest.version}${latest.qa ? `, QA ${latest.qa.result}` : ""}. Nothing is recorded as running.` : `State ${st?.state ?? "unknown"}; nothing recorded as running.`;

    // attention items for this lesson
    if (st?.state === "AWAITING_APPROVAL" || creative === "pending") {
      const h = [...(st.history ?? [])].reverse().find((x: any) => x.to === "AWAITING_APPROVAL");
      attention.push({ id: `approval:${l.id}:creative`, kind: "approval", title: `${l.id}: creative approval not recorded`, detail: `status.json is ${st.state} with approval.creative = "${creative}"${h ? ` since ${h.at} (${clip(h.note, 120)})` : ""}. Nothing is approved until you say so.`, action: { label: "Review & decide", view: "approvals", ref: `lesson:${short(l.id)}:creative` }, since: h?.at ?? null, source: statusFile });
    }
    if (latest && st?.state && ["AWAITING_APPROVAL", "CREATIVE_PLAN_READY", "TRANSCRIBED"].includes(st.state))
      nextActions.push({ id: `reconcile:${l.id}:status`, kind: "decision", title: `${l.id}: reconcile status.json with the renders`, detail: `${lr.length} full render(s) exist (latest v${latest.version}, ${latest.createdAt}) but status.json still says ${st.state}. Record the client's approval with approve.ts once they give it, then move the state on.`, action: { label: "Open lesson", view: "lesson", ref: l.id }, since: latest.createdAt, source: statusFile });
    if (latest?.qa && latest.qa.result !== "PASS") for (const c of latest.qa.checks.filter((c) => c.status === "FAIL")) {
      attention.push({ id: `qa:${l.id}:v${latest.version}:${c.id}`, kind: "failure", title: `${l.id} v${latest.version}: QA check ${c.id} failed`, detail: clip(c.detail, 300), action: { label: "See QA", view: "lesson", ref: `${l.id}:qa:v${latest.version}` }, since: latest.qa.createdAt, source: latest.qa.report });
      nextActions.push({ id: `fix:${l.id}:${c.id}`, kind: "failure", title: `Fix ${c.id} before the next render of ${l.id}`, detail: clip(c.detail, 300), action: { label: "Open lesson", view: "lesson", ref: l.id }, since: latest.qa.createdAt, source: latest.qa.report });
    }
    if (latest && latest.qa?.checks && !approvals.some((a) => String((a.data as any).itemRef ?? "").includes(`v${latest.version}`)))
      attention.push({ id: `review:${l.id}:v${latest.version}`, kind: "review", title: `${l.id} v${latest.version} is ready to review`, detail: `Full render ${latest.output} (${r1(latest.wallClockSec / 60)} min render). Creative review status in the QA report: ${(readJson(join(root, latest.qa.report)) as any)?.creativeReview?.status ?? "not recorded"}.`, action: { label: "Open Review Centre", view: "review", ref: `${l.id}:v${latest.version}` }, since: latest.createdAt, source: latest.file });

    docs.push({ collection: "lessons", docId: l.id, data: {
      id: l.id, courseId: l.course, title: m?.manifest?.title ?? l.meta?.title ?? l.id, durationSec: m?.manifest?.durationSec ?? l.meta?.durationSec ?? 0,
      state: st?.state ?? "UNKNOWN", source: statusFile,
      stage: { current, steps: steps.map((s) => ({ ...s })) },
      now: { text: nowText, measured: true, at: running.length ? lastRunning : latest?.createdAt ?? null, source: running.length ? "workflow-journal" : latest?.file ?? statusFile },
      chapters, scenes, scenesSource: `${manifestFile} + ${rel(join(l.dir, "sections"))}/*.json; narration from ${rel(l.transcriptFile)} (current working files; they can differ from the latest render)`,
      renders: rendersOut, qaIssues, deliverables, revisions,
    } });

    docs.push({ collection: "jobs", docId: l.id, data: {
      lessonId: l.id, source: `${jobsRel(join(jobsDir, l.course, `${l.id}.jsonl`))} + imported workflow journals`,
      tasks: lt.map((t) => ({ id: t.id, kind: t.kind, owner: t.owner, status: t.status, startedAt: t.startedAt ?? null, finishedAt: t.finishedAt ?? null, attempts: t.attempts, maxRetries: t.maxRetries, lastError: t.lastError ?? null, deps: t.deps, outputs: t.outputs, note: t.note ? clip([t.note, t.summary].filter(Boolean).join(" · "), 300) : t.summary ? clip(t.summary, 300) : null, source: taskSource(t) })),
    } });
  }

  // ----- ledger-wide attention -----
  for (const t of tasks.filter((t) => t.status === "failed"))
    attention.push({ id: `job:${t.id}:failed`, kind: "failure", title: `Job failed: ${t.id}`, detail: clip(`${t.kind} (${t.owner}), attempt ${t.attempts}/${t.maxRetries}: ${t.lastError ?? "no error recorded"}`, 300), action: { label: t.attempts < t.maxRetries ? "Request retry" : "Open queue", view: "queue", ref: t.id }, since: t.finishedAt ?? null, source: taskSource(t) });
  for (const t of tasks.filter((t) => t.status === "blocked"))
    attention.push({ id: `job:${t.id}:blocked`, kind: "failure", title: `Blocked: ${t.id}`, detail: clip(t.note ?? "no note", 300), action: { label: "Open queue", view: "queue", ref: t.id }, since: t.updatedAt ?? null, source: taskSource(t) });
  for (const f of feedback.filter((f) => f.status === "pending" || f.status === "policy-candidate"))
    attention.push({ id: `decision:feedback:${f.date}:${clip(f.quote, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`, kind: "decision", title: f.status === "policy-candidate" ? "Should this become a rule for all lessons?" : "Open item waiting for a decision", detail: clip(f.quote, 300), action: { label: "Decide", view: "approvals", ref: `feedback:${f.date}` }, since: f.date, source: memRel(join(memDir, "feedback-log.jsonl")) });
  for (const r of mdRows(mdSection(lockedMd, "Not yet locked")).filter((r) => r[0] !== "Item"))
    attention.push({ id: `decision:brand:${r[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "")}`, kind: "decision", title: `Brand open item: ${clip(r[0], 80)}`, detail: clip(`${r[1]}. Needed: ${r[2]}`, 300), action: { label: "Decide", view: "approvals", ref: `brand:${r[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "")}` }, since: null, source: memRel(lockedFile) });
  const newInbox = inbox.filter((d) => d.data.status === "new");
  if (newInbox.length) nextActions.unshift({ id: "inbox:new", kind: "review", title: `${newInbox.length} board request(s) not yet processed`, detail: `Run pipeline/board-inbox.ts on the saved collections (${[...new Set(newInbox.map((d) => d.collection))].join(", ")}).`, action: { label: "Open approvals", view: "approvals", ref: "inbox" }, since: newInbox.map((d) => String(d.data.at ?? "")).sort()[0] || null, source: "board db (comments/approvals/requests)" });
  for (const r of runs.filter((r) => !r.finished))
    nextActions.push({ id: `import:${r.run}`, kind: "review", title: `Workflow ${r.run} has agents without a result`, detail: `${r.agents} agent transcripts; last activity ${r.lastAt}. Re-import the journal when it finishes so the ledger gets the results.`, action: { label: "Open agents", view: "agents", ref: r.run }, since: r.firstAt, source: "workflow-journal" });

  const order = { approval: 0, failure: 1, review: 2, decision: 3 } as const;
  attention.sort((a, b) => order[a.kind] - order[b.kind] || String(b.since ?? "").localeCompare(String(a.since ?? "")));

  // recent: workflows + decisions
  const byWf = new Map<string, Task[]>();
  for (const t of tasks.filter((t) => t.workflow)) byWf.set(t.workflow!, [...(byWf.get(t.workflow!) ?? []), t]);
  for (const [wf, ts] of byWf) {
    const end = ts.map((t) => t.finishedAt ?? t.startedAt ?? "").sort().at(-1) ?? "";
    recent.push({ at: end, text: `Workflow ${wf} (${journalLesson.get(wf) ?? ts[0].lesson}): ${ts.filter((t) => t.status === "done").length}/${ts.length} agent tasks done${ts.some((t) => t.status === "running") ? `, ${ts.filter((t) => t.status === "running").length} running` : ""}`, kind: "agents", source: "workflow-journal" });
  }
  for (const t of tasks.filter((t) => !t.workflow && (t.status === "done" || t.status === "failed")))
    recent.push({ at: t.finishedAt ?? "", text: `Job ${t.id} ${t.status}`, kind: "job", source: taskSource(t) });
  for (const r of decisionRows) recent.push({ at: r[0], text: clip(`Decision: ${r[1]} (${r[2]})`, 200), kind: "decision", source: memRel(decisionsFile) });
  recent.sort((a, b) => b.at.localeCompare(a.at));

  const qc = { queued: 0, running: 0, blocked: 0, failed: 0, done: 0 };
  for (const t of tasks) if (t.status in qc) qc[t.status as keyof typeof qc]++;
  const active = [...lessonLatest.entries()].sort((a, b) => b[1].localeCompare(a[1]))[0]?.[0] ?? null;

  docs.unshift({ collection: "studio", docId: "overview", data: {
    courses, activeLessonId: active, attention, nextActions, recent: recent.slice(0, 30), queueCounts: qc,
    source: "ledger, status.json, render records, QA reports, production-memory, board approvals",
  } });
  docs.unshift({ collection: "studio", docId: "meta", data: { lastSync: now, syncedBy: "studio session", schema: 1, source: "sync time (pipeline/board-sync.ts)" } });

  // ----- efficiency -----
  const insights: any[] = [];
  const renderTs = read(join(root, "pipeline/render.ts")).split("\n");
  const srcHashLine = renderTs.findIndex((l) => /hashFiles\(join\(P\.root,\s*"src"\)\)/.test(l));
  const byLesson = new Map<string, RenderRec[]>();
  for (const r of renders) byLesson.set(r.lesson, [...(byLesson.get(r.lesson) ?? []), r]);
  for (const [lesson, rs] of byLesson) rs.forEach((r, i) => {
    const prev = rs[i - 1];
    const mins = r1(r.wallClockSec / 60);
    if (prev && r.reused === 0 && prev.fingerprint !== r.fingerprint) insights.push({
      title: `v${r.version} re-rendered every section`, impact: "high",
      detail: `${lesson} v${r.version} re-rendered ${r.total}/${r.total} sections (${Math.round(mins)} min) because the engine fingerprint changed (${prev.fingerprint} → ${r.fingerprint})${srcHashLine >= 0 ? "; the engine hash covers all of src/, so any component edit invalidates every section" : ""}.`,
      evidence: `${r.file}: wallClockSec ${r.wallClockSec}, 0/${r.total} chunks reused, engineFingerprint ${r.fingerprint}; ${prev.file}: engineFingerprint ${prev.fingerprint}${srcHashLine >= 0 ? `; pipeline/render.ts:${srcHashLine + 1} hashes join(P.root, "src")` : ""}`,
      action: "Per-component section cache keys, so a component fix re-renders only the sections that use it.", source: r.file,
    });
    if (prev && r.reused > 0) insights.push({
      title: `v${r.version} reused ${r.reused}/${r.total} sections`, impact: "medium",
      detail: `${lesson} v${r.version} took ${mins} min with ${r.reused} of ${r.total} sections reused, against ${r1(prev.wallClockSec / 60)} min for v${prev.version} (${prev.reused}/${prev.total} reused).`,
      evidence: `${r.file}: wallClockSec ${r.wallClockSec}; ${prev.file}: wallClockSec ${prev.wallClockSec}`,
      action: "Keep fixes section-scoped (edit only the affected section files) so the cache does the rest.", source: r.file,
    });
  });
  const totTok = runs.reduce((s, r) => s + r.tokens, 0), totOut = runs.reduce((s, r) => s + r.output, 0);
  if (totTok > 0) insights.push({
    title: "Re-reading context drives token use", impact: "high",
    detail: `Output is ${r2((totOut / totTok) * 100)}% of the ${r1(totTok / 1e6)} M tokens processed across ${runs.length} workflow runs (${runs.reduce((s, r) => s + r.agents, 0)} agents); the rest is input and cached re-reads.`,
    evidence: runs.map((r) => `${r.run}: ${r.tokensM} M tokens, ${r.outputK} k output`).join("; ") + " (usage fields in agent transcripts, deduplicated per API message)",
    action: "Give agents only their slice (memory brief, cue-slice, per-section narration) instead of whole files.", source: "workflow-journal",
  });
  const fullQa = renders.filter((r) => r.qa);
  const failed = fullQa.filter((r) => r.qa!.result !== "PASS");
  const failCounts = new Map<string, string[]>();
  for (const r of fullQa) for (const c of r.qa!.checks.filter((c) => c.status === "FAIL")) failCounts.set(c.id, [...(failCounts.get(c.id) ?? []), `v${r.version}`]);
  for (const [check, vs] of failCounts) if (vs.length >= 2) insights.push({
    title: `${check} failed in ${vs.length} full renders`, impact: "high",
    detail: `QA check ${check} failed on ${vs.join(", ")}: the defect reached a full render each time.`,
    evidence: fullQa.filter((r) => vs.includes(`v${r.version}`)).map((r) => r.qa!.report).join("; "),
    action: "Run this check on the section files before rendering (deterministic gate), not after a full render.", source: fullQa[0].qa!.report,
  });
  const reviewTasks = tasks.filter((t) => /review/.test(t.kind) && /fixed: \d+/.test(`${t.note ?? ""} ${t.summary ?? ""}`));
  if (reviewTasks.length) {
    const sum = (k: string) => reviewTasks.reduce((s, t) => s + Number(new RegExp(`${k}: (\\d+)`).exec(`${t.note ?? ""} ${t.summary ?? ""}`)?.[1] ?? 0), 0);
    insights.push({
      title: "Late review keeps finding fixable defects", impact: "medium",
      detail: `${reviewTasks.length} review agents recorded ${sum("fixed")} fixes and ${sum("open")} open items after the build agents had already self-reviewed.`,
      evidence: `ledger summaries (${[...new Set(reviewTasks.map((t) => t.workflow ?? t.id))].join(", ")}): "fixed: N · open: M"`,
      action: "Move the mechanical checks (text-hold, cue-inside-scene, overlap) in front of agent review.", source: "workflow-journal",
    });
  }
  for (const r of runs.filter((r) => r.wallMin > 0)) insights.push({
    title: `${r.run}: ${r.agents} agents, ${r.agentMin} agent-min in ${r.wallMin} min wall clock`, impact: "low",
    detail: `Average parallelism ${r1(r.agentMin / r.wallMin)}×${r.finished ? "" : " (run not finished: figures so far)"}.`,
    evidence: `agent transcript timestamps in ${r.run} (first ${r.firstAt}, last ${r.lastAt})`, action: "Informational.", source: "workflow-journal",
  });

  const coldChunks = renders.flatMap((r) => r.chunks.filter((c) => !c.reused && c.seconds > 0).map((c) => c.seconds));
  const estimates: any[] = [];
  const warm = [...renders].filter((r) => r.reused > 0 && r.reused < r.total).sort((a, b) => b.reused - a.reused)[0];
  if (coldChunks.length && warm) {
    const mean = coldChunks.reduce((s, x) => s + x, 0) / coldChunks.length;
    const overhead = warm.wallClockSec - Math.max(...warm.chunks.filter((c) => !c.reused).map((c) => c.seconds));
    estimates.push({ label: "Re-render after a one-section change (cache intact)", value: `≈ ${Math.round((mean + overhead) / 60)} min`, basis: `mean render time of a non-reused section (${Math.round(mean)} s, n=${coldChunks.length}, from ${renders.map((r) => `v${r.version}`).join("/")}) plus the non-render overhead of v${warm.version} (wall clock minus its longest rendered section = ${Math.round(overhead)} s)`, estimate: true });
  }
  const cold = renders.filter((r) => r.reused === 0);
  if (cold.length && warm) estimates.push({ label: "Time the section cache saved on the latest partial render", value: `≈ ${Math.round((cold.at(-1)!.wallClockSec - warm.wallClockSec) / 60)} min`, basis: `v${cold.at(-1)!.version} cold wall clock (${r1(cold.at(-1)!.wallClockSec / 60)} min) minus v${warm.version} (${r1(warm.wallClockSec / 60)} min); machine load differed between the runs`, estimate: true });

  docs.push({ collection: "efficiency", docId: "summary", data: {
    measured: {
      fullRenders: renders.map((r) => ({ lesson: r.lesson, version: r.version, minutes: r1(r.wallClockSec / 60), reused: r.reused, total: r.total, source: r.file })),
      agentRuns: runs.map((r) => ({ run: r.run, agents: r.agents, tokensM: r.tokensM, outputK: r.outputK, wallMin: r.wallMin, agentMin: r.agentMin, finished: r.finished, source: "workflow-journal" })),
      qaFailRate: fullQa.length ? r2(failed.length / fullQa.length) : null,
      qaFailRateBasis: `${failed.length} of ${fullQa.length} full-render QA reports have result FAIL`,
      revisionsCount: [...byLesson.values()].reduce((s, rs) => s + Math.max(0, rs.length - 1), 0),
      revisionsBasis: "full re-renders after the first full render of each lesson (render records)",
    },
    insights, estimates,
    notMeasured: ["Money cost: the studio has no billing data.", "ETA: no measured basis for the remaining work, so none is shown."],
    source: "render records, QA reports, workflow journals, ledger",
  } });

  // ----- memory library -----
  const registry = readJson(join(root, "motion-library/registry.json"));
  const ds = readJson(join(root, "brand/design-system.json"));
  const lastRenderOf = (lessonIds: Set<string>) => renders.filter((r) => lessonIds.has(r.lesson)).map((r) => r.createdAt).sort().at(-1) ?? null;
  const prefMd = read(join(memDir, "preferences.md"));
  const proposalMd = read(join(memDir, "brand/PROPOSAL.md"));
  docs.push({ collection: "memory", docId: "library", data: {
    locked: mdBullets(mdSection(lockedMd, "Locked rules")).map((t) => ({ text: clip(t, 300), source: memRel(lockedFile) })),
    openItems: mdRows(mdSection(lockedMd, "Not yet locked")).filter((r) => r[0] !== "Item").map((r) => ({ item: r[0], state: r[1] ?? "", needed: r[2] ?? "", source: memRel(lockedFile) })),
    proposal: { status: ds?.status ?? "unknown", version: ds?.version ?? "unknown", approvedBy: ds?.approvedBy ?? null, summary: mdBullets(mdSection(proposalMd, "Summary")).map((b) => clip(b, 300)), source: "brand/design-system.json" + (proposalMd ? ` + ${memRel(join(memDir, "brand/PROPOSAL.md"))}` : "") },
    preferences: ["Confirmed by client", "Client direction"].flatMap((t) => mdBullets(mdSection(prefMd, t))).map((b) => ({ text: clip(b, 400), source: memRel(join(memDir, "preferences.md")) })),
    rejected: mdRows(read(join(memDir, "rejected.md")).split("\n")).filter((r) => /^R\d+/.test(r[0])).map((r) => ({ id: r[0], date: r[1] ?? "", treatment: clip(r[2] ?? "", 300), by: clip(r[3] ?? "", 200), why: clip(r[4] ?? "", 300), instead: clip(r[5] ?? "", 300), source: memRel(join(memDir, "rejected.md")) })),
    techniques: mdRows(read(join(memDir, "techniques.md")).split("\n")).filter((r) => /^T\d+/.test(r[0])).map((r) => ({ id: r[0], text: clip(r.slice(1).filter(Boolean).join(" — "), 400), source: memRel(join(memDir, "techniques.md")) })),
    components: (registry?.components ?? []).map((c: any) => {
      const u = typeUses.get(c.type);
      return { name: c.name, type: c.type, status: clip(c.status ?? "", 200), uses: u?.uses ?? 0, lastUsed: u ? lastRenderOf(u.lessons) : null, source: "motion-library/registry.json + scene counts in courses/*/*/manifest.json + sections" };
    }),
    feedback: feedback.map((f) => ({ date: f.date, quote: clip(f.quote, 500), quoteType: f.quote_type, scope: f.scope, status: f.status, lesson: f.lesson ?? null, source: memRel(join(memDir, "feedback-log.jsonl")) })),
  } });

  // ----- review media -----
  const rm = o.reviewMedia ?? join(CODE_ROOT, "review-media");
  for (const l of lessons) {
    const dirs = [rm, join(rm, l.id)].filter((d) => existsSync(join(d, "media-index.json")));
    const idx = dirs.map((d) => ({ d, i: MediaIndexSchema.safeParse(readJson(join(d, "media-index.json"))) })).filter((x) => x.i.success && x.i.data.lessonId === l.id);
    if (!idx.length) continue;
    const doc = buildReviewDoc(idx.map((x) => ({ index: x.i.data!, dir: x.d, attach: readJson(join(x.d, "upload-result.json")) })));
    docs.push({ collection: "review", docId: l.id, data: doc });
    if (doc.thumbnail?.url) {
      const ld = docs.find((d) => d.collection === "lessons" && d.docId === l.id)!.data as any;
      ld.thumbnail = { assetUrl: doc.thumbnail.url, source: "review-media upload (asset store)" };
    }
  }

  // ----- validate -----
  for (const d of docs) {
    const s = schemaFor(`${d.collection}/${d.docId}`) ?? schemaFor(d.collection);
    const r = s?.safeParse(d.data);
    if (!r?.success) throw new Error(`${d.collection}/${d.docId} does not match the contract schema: ${r?.error.message ?? "no schema"}`);
  }
  return { docs, warnings };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = argMap(process.argv.slice(2));
  if (typeof a.root !== "string" || typeof a.out !== "string") {
    console.error("usage: board-sync.ts --root <repoRoot> --out <dir> [--journals <workflowsDir>] [--memory <dir>] [--jobs <dir>] [--inbox-state <dir>] [--review-media <dir>] [--include-test]");
    process.exit(2);
  }
  const { docs, warnings } = buildBoard({ root: a.root, journals: a.journals as string | undefined, memory: a.memory as string | undefined, jobsDir: a.jobs as string | undefined, inboxState: a["inbox-state"] as string | undefined, reviewMedia: a["review-media"] as string | undefined, includeTest: a["include-test"] === true });
  const listed = writeDocs(resolve(a.out), docs);
  for (const w of warnings) console.error(`warning: ${w}`);
  for (const l of listed) console.log(`${(l.bytes / 1024).toFixed(1).padStart(8)} KB  ${l.collection}/${l.doc_id}`);
  console.log(`${listed.length} documents → ${resolve(a.out)} (docs.json, writes.json)`);
}
