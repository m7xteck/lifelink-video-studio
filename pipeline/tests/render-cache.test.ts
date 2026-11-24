/**
 * Per-component section cache keys (pipeline/lib/render-cache.ts, used by render.ts). No rendering.
 * Uses the real L01 manifest and engine source from the main repo READ-ONLY: src/ and the design
 * system are copied to a temp root, and only the copies are edited.
 */
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildComponentMap, planChunks, touchingScenes, type ManifestLike } from "../lib/render-cache";

const MAIN = "/home/user/lifelink-video-studio";
const WORKTREE = fileURLToPath(new URL("../..", import.meta.url));
const SOURCE = existsSync(join(MAIN, "src/scenes/SceneRenderer.tsx")) ? MAIN : WORKTREE;
const MANIFEST = join(SOURCE, "courses/lifelink-course/lifelink-course-L01/manifest.json");
const encoder = { codec: "h264", crf: 16, pixelFormat: "yuv420p", imageFormat: "jpeg", jpegQuality: 92, colorSpace: "bt709", scale: 1 };

const freshRoot = () => {
  const root = mkdtempSync(join(tmpdir(), "render-cache-test-"));
  cpSync(join(SOURCE, "src"), join(root, "src"), { recursive: true });
  cpSync(join(SOURCE, "brand/design-system.json"), join(root, "brand/design-system.json"));
  return root;
};
const loadManifest = (): ManifestLike => JSON.parse(readFileSync(MANIFEST, "utf8"));
const keys = (m: ManifestLike, root: string) =>
  new Map(planChunks(m, { root, portrait: false, scale: 1, encoder }).plans.map((p) => [p.sectionId, p.key]));
const changed = (a: Map<string, string>, b: Map<string, string>) => [...a.keys()].filter((k) => a.get(k) !== b.get(k)).sort();
const touch = (file: string) => appendFileSync(file, "\n// cache-test edit\n");

test("SceneRenderer map covers every scene type in L01 and follows imports transitively", () => {
  const root = freshRoot();
  const m = loadManifest();
  const cmap = buildComponentMap(root);
  const types = [...new Set(m.scenes.map((s) => s.type))];
  assert.deepEqual(types.filter((t) => !cmap.byType.has(t)), [], "every L01 scene type maps to a component");
  assert.ok(cmap.byType.get("kineticStatement")!.some((f) => f.endsWith("src/components/KineticStatement.tsx")));
  // brand components that import the shared stage helper must include it
  const withStage = [...cmap.byType.values()].filter((files) => files.some((f) => f.endsWith("src/components/brand/stage.tsx")));
  if (existsSync(join(root, "src/components/brand/stage.tsx"))) assert.ok(withStage.length > 0, "stage.tsx reached through a component's relative import");
  const { plans } = planChunks(m, { root, portrait: false, scale: 1, encoder });
  assert.equal(plans.length, m.sections.length);
  assert.ok(plans.every((p) => p.unmapped.length === 0));
  rmSync(root, { recursive: true, force: true });
});

test("(a) editing one component changes keys only for sections whose window uses that type", () => {
  const root = freshRoot();
  const m = loadManifest();
  const cmap = buildComponentMap(root);
  const before = keys(m, root);
  // pick a type used by some sections but not all, whose entry file no other type depends on
  const secTypes = m.sections.map((sec) => ({ id: sec.id, types: new Set(touchingScenes(m.scenes, sec.startSec, sec.endSec).map((s) => s.type)) }));
  const candidates = [...cmap.byType.keys()].filter((t) => {
    const users = secTypes.filter((s) => s.types.has(t)).length;
    const entry = cmap.byType.get(t)!.find((f) => !f.endsWith("stage.tsx"))!;
    const shared = [...cmap.byType.entries()].some(([o, files]) => o !== t && files.includes(entry));
    return users > 0 && users < m.sections.length && !shared;
  });
  assert.ok(candidates.length > 0, "a component used by only some sections exists");
  for (const t of candidates.slice(0, 3)) {
    const entry = cmap.byType.get(t)!.find((f) => !f.endsWith("stage.tsx"))!;
    touch(entry);
    const after = keys(m, root);
    const expected = secTypes.filter((s) => s.types.has(t)).map((s) => s.id).sort();
    assert.deepEqual(changed(before, after), expected, `editing ${t}'s component changes only ${expected.join(", ")}`);
    for (const [k, v] of after) before.set(k, v);
  }
  // a component no L01 scene uses changes nothing
  const unused = [...cmap.byType.keys()].find((t) => !m.scenes.some((s) => s.type === t));
  if (unused) {
    touch(cmap.byType.get(unused)!.find((f) => !f.endsWith("stage.tsx"))!);
    assert.deepEqual(changed(before, keys(m, root)), [], `editing unused ${unused} changes no key`);
  }
  rmSync(root, { recursive: true, force: true });
});

test("(b) editing a shared engine file or the design system changes every key", () => {
  const root = freshRoot();
  const m = loadManifest();
  const all = m.sections.map((s) => s.id).sort();
  let before = keys(m, root);
  touch(join(root, "src/motion/time.tsx"));
  let after = keys(m, root);
  assert.deepEqual(changed(before, after), all);
  before = after;
  touch(join(root, "src/scenes/SceneRenderer.tsx"));
  after = keys(m, root);
  assert.deepEqual(changed(before, after), all);
  before = after;
  appendFileSync(join(root, "brand/design-system.json"), " ");
  assert.deepEqual(changed(before, keys(m, root)), all);
  rmSync(root, { recursive: true, force: true });
});

test("(c) editing one scene's props changes only its section and neighbours within ±1.5 s", () => {
  const root = freshRoot();
  const m = loadManifest();
  const before = keys(m, root);
  const expectFor = (sc: ManifestLike["scenes"][number]) =>
    m.sections.filter((sec) => sc.startSec < sec.endSec + 1.5 && sc.endSec + 1.5 > sec.startSec).map((s) => s.id).sort();
  const sectionOf = (sc: { startSec: number }) => m.sections.find((s) => sc.startSec >= s.startSec && sc.startSec < s.endSec)!;

  // a scene well inside a section → only that section
  const inner = m.scenes.find((sc) => { const sec = sectionOf(sc); return sc.startSec > sec.startSec + 2 && sc.endSec < sec.endSec - 2; })!;
  const m1: ManifestLike = { ...m, scenes: m.scenes.map((s) => (s.id === inner.id ? { ...s, props: { ...(s as { props?: object }).props, __edited: 1 } } : s)) };
  assert.deepEqual(changed(before, keys(m1, root)), [sectionOf(inner).id]);
  assert.deepEqual(expectFor(inner), [sectionOf(inner).id]);

  // the first scene of a later section → that section and the previous one (its ±1.5 s window reaches it)
  const idx = 3;
  const first = m.scenes.filter((s) => Math.abs(s.startSec - m.sections[idx].startSec) < 0.01)[0];
  const m2: ManifestLike = { ...m, scenes: m.scenes.map((s) => (s.id === first.id ? { ...s, props: { ...(s as { props?: object }).props, __edited: 2 } } : s)) };
  const got = changed(before, keys(m2, root));
  assert.deepEqual(got, expectFor(first));
  assert.ok(got.includes(m.sections[idx - 1].id) && got.includes(m.sections[idx].id) && got.length < m.sections.length);
  rmSync(root, { recursive: true, force: true });
});
