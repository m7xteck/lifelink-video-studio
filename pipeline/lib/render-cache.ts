import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

/**
 * Section cache keys for render.ts.
 *
 * key = hash( scenes touching the section window ±1.5 s (as before), frame range, size, encoder, watermark
 *           + SHARED engine hash: everything under src/ except src/components (compositions, motion, brand,
 *             schema, illustrations, scenes, Root.tsx, index.ts, …), brand/design-system.json,
 *             public/fonts and public/textures
 *           + COMPONENT hash: only the component files used by the scene types in that window, found by
 *             parsing src/scenes/SceneRenderer.tsx (imports + `case "type": return <X`) and following each
 *             component's relative imports under src/components transitively )
 *
 * If a scene type cannot be mapped to a component file, that section hashes ALL of src/components
 * (safe fallback) and the type is reported in `unmapped`.
 */

export const OVERLAP_SEC = 1.5; // ≥ MAX_SCENE_OVERLAP_SEC: neighbours whose cross-dissolve spills into the chunk

type HashCache = Map<string, string>;
const fileHash = (abs: string, root: string, cache: HashCache) => {
  let h = cache.get(abs);
  if (!h) {
    h = createHash("sha256").update(rel(root, abs)).update(readFileSync(abs)).digest("hex");
    cache.set(abs, h);
  }
  return h;
};
const rel = (root: string, abs: string) => relative(root, abs).split(sep).join("/");

const walk = (dir: string, skip: (abs: string) => boolean = () => false): string[] => {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (skip(p)) continue;
    if (statSync(p).isDirectory()) out.push(...walk(p, skip)); else out.push(p);
  }
  return out;
};

const hashList = (files: string[], root: string, cache: HashCache) => {
  const h = createHash("sha256");
  for (const f of [...files].sort()) h.update(fileHash(f, root, cache));
  return h.digest("hex").slice(0, 16);
};

/** Files whose change must invalidate every section. */
export const sharedEngineFiles = (root: string): string[] => {
  const components = join(root, "src/components");
  return [
    ...walk(join(root, "src"), (p) => p === components),
    ...[join(root, "brand/design-system.json")].filter(existsSync),
    ...walk(join(root, "public/fonts")),
    ...walk(join(root, "public/textures")),
  ];
};

const IMPORT_RE = /(?:import|export)\s[^;]*?from\s*["'](\.{1,2}\/[^"']+)["']|import\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;
const resolveImport = (fromFile: string, spec: string): string | null => {
  const base = resolve(dirname(fromFile), spec);
  for (const c of [base, `${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};

/** A component file plus every file under src/components it imports, transitively. */
const componentClosure = (entry: string, componentsDir: string): string[] => {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(IMPORT_RE)) {
      const r = resolveImport(f, m[1] ?? m[2]);
      if (r && r.startsWith(componentsDir + sep) && !seen.has(r)) stack.push(r);
    }
  }
  return [...seen].sort();
};

export type ComponentMap = { byType: Map<string, string[]>; allComponents: string[] };

/** scene type → component files (absolute), parsed from src/scenes/SceneRenderer.tsx. */
export const buildComponentMap = (root: string): ComponentMap => {
  const componentsDir = join(root, "src/components");
  const rendererFile = join(root, "src/scenes/SceneRenderer.tsx");
  const byType = new Map<string, string[]>();
  const allComponents = walk(componentsDir);
  if (!existsSync(rendererFile)) return { byType, allComponents };
  const src = readFileSync(rendererFile, "utf8");
  const identToFile = new Map<string, string>();
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    const file = resolveImport(rendererFile, m[2]);
    if (!file || !file.startsWith(componentsDir + sep)) continue;
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()!.trim();
      if (name && !name.startsWith("type ")) identToFile.set(name, file);
    }
  }
  for (const m of src.matchAll(/case\s+["']([\w-]+)["']\s*:\s*return\s*<\s*([A-Z]\w*)/g)) {
    const file = identToFile.get(m[2]);
    if (file) byType.set(m[1], componentClosure(file, componentsDir));
  }
  return { byType, allComponents };
};

type SceneLike = { id: string; type: string; startSec: number; endSec: number };
type SectionLike = { id: string; startSec: number; endSec: number };
export type ManifestLike = { fps: number; durationSec: number; width: number; height: number; watermark?: string | null; sections: SectionLike[]; scenes: SceneLike[] };

export type KeyOpts = {
  root: string; portrait: boolean; scale: number; encoder: Record<string, unknown>;
  winFrom?: number; winTo?: number; watermark?: string | null;
  /** reuse across calls (tests); computed when omitted */
  componentMap?: ComponentMap;
};

export type ChunkPlan = {
  sectionId: string; f0: number; f1: number; key: string;
  types: string[]; componentFiles: string[]; unmapped: string[];
  sharedHash: string; componentHash: string;
};

export const touchingScenes = <S extends SceneLike>(scenes: S[], s: number, e: number) =>
  scenes.filter((sc) => sc.startSec < e + OVERLAP_SEC && sc.endSec + OVERLAP_SEC > s);

/** Plan every section chunk inside the window, with its cache key. Pure: no rendering, no writes. */
export const planChunks = (manifest: ManifestLike, o: KeyOpts): { sharedHash: string; plans: ChunkPlan[] } => {
  const cache: HashCache = new Map();
  const fps = manifest.fps;
  const winFrom = o.winFrom ?? 0;
  const winTo = Math.min(o.winTo ?? manifest.durationSec, manifest.durationSec);
  const totalFrames = Math.ceil(manifest.durationSec * fps);
  const sharedHash = hashList(sharedEngineFiles(o.root), o.root, cache);
  const cmap = o.componentMap ?? buildComponentMap(o.root);
  const watermark = o.watermark !== undefined ? o.watermark : manifest.watermark ?? null;
  const plans: ChunkPlan[] = [];
  for (const sec of manifest.sections) {
    const s = Math.max(sec.startSec, winFrom), e = Math.min(sec.endSec, winTo);
    if (e <= s) continue;
    const f0 = Math.round(s * fps);
    // The final chunk always rounds UP so the last syllable of narration is never clipped.
    const f1 = (e >= manifest.durationSec - 1e-6 ? totalFrames : Math.min(totalFrames, Math.round(e * fps))) - 1;
    if (f1 < f0) continue;
    const touching = touchingScenes(manifest.scenes, s, e);
    const types = [...new Set(touching.map((t) => t.type))].sort();
    const unmapped = types.filter((t) => !cmap.byType.has(t));
    const componentFiles = unmapped.length ? cmap.allComponents : [...new Set(types.flatMap((t) => cmap.byType.get(t)!))].sort();
    const componentHash = hashList(componentFiles, o.root, cache);
    const key = createHash("sha256").update(JSON.stringify({
      touching, f0, f1, fps, portrait: o.portrait, scale: o.scale, sharedHash, componentHash,
      encoder: o.encoder, watermark, w: manifest.width, h: manifest.height,
    })).digest("hex").slice(0, 16);
    plans.push({ sectionId: sec.id, f0, f1, key, types, componentFiles: componentFiles.map((f) => rel(o.root, f)), unmapped, sharedHash, componentHash });
  }
  return { sharedHash, plans };
};
