import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, unlinkSync, writeSync } from "node:fs";
import { hostname } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { P } from "./paths";

/**
 * File-ownership claims: before an agent edits a shared file it claims the path.
 * One claim file per normalised repo path under .locks/claims/, created with O_EXCL
 * (exactly one process can create it). A claim held by another owner is refused.
 * A claim is stale (reclaimable) when its PID is dead on this host, or it is older
 * than its TTL (default 2 h). Only the owner can release a claim.
 *
 * Claims made from the CLI record no PID unless --pid is given (the CLI process
 * exits at once), so they expire by TTL only. Library callers record process.pid.
 */

export const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;
export const claimsDir = () => process.env.LIFELINK_CLAIMS_DIR || join(P.locks, "claims");

export type Claim = { path: string; owner: string; pid: number | null; host: string; at: string; ttlMs: number };
export type ClaimView = Claim & { stale: boolean; staleReason?: string };
export type ClaimResult = { ok: true; claimed: string[] } | { ok: false; conflicts: ClaimView[]; claimed: [] };

/** Repo-relative POSIX path ("src/components/X.tsx"); paths outside the repo stay absolute. */
export const normalise = (p: string, root = P.root) => {
  const abs = resolve(root, p);
  const rel = relative(root, abs);
  const out = rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel : abs;
  return out.split(sep).join("/");
};

const claimFile = (norm: string, dir = claimsDir()) => {
  const slug = norm.replace(/[^\w.-]+/g, "_").slice(-80);
  const hash = createHash("sha1").update(norm).digest("hex").slice(0, 12);
  return join(dir, `${slug}.${hash}.claim`);
};

const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === "EPERM"; } };

const view = (c: Claim, ttlOverride?: number): ClaimView => {
  const ttl = ttlOverride ?? c.ttlMs ?? DEFAULT_TTL_MS;
  if (c.pid && c.host === hostname() && !alive(c.pid)) return { ...c, stale: true, staleReason: `process ${c.pid} is no longer running` };
  if (Date.now() - Date.parse(c.at) > ttl) return { ...c, stale: true, staleReason: `older than ${Math.round(ttl / 60000)} min` };
  return { ...c, stale: false };
};

const readClaim = (file: string): Claim | null => {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
};

const tryCreate = (file: string, c: Claim): boolean => {
  try {
    const fd = openSync(file, "wx");
    try { writeSync(fd, JSON.stringify(c)); } finally { closeSync(fd); }
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw e;
  }
};

const sleepSync = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Reclaiming a stale claim is serialised by a short directory-wide lock, so two reclaimers can't both win. */
const withReclaimLock = <T>(dir: string, fn: () => T): T => {
  const lock = join(dir, ".reclaim.lock");
  const t0 = Date.now();
  for (;;) {
    try { const fd = openSync(lock, "wx"); writeSync(fd, String(process.pid)); closeSync(fd); break; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        const pid = Number(readFileSync(lock, "utf8"));
        if ((pid && !alive(pid)) || Date.now() - statSync(lock).mtimeMs > 30_000) { unlinkSync(lock); continue; }
      } catch { continue; }
      if (Date.now() - t0 > 15_000) throw new Error("Timed out waiting for the claims reclaim lock");
      sleepSync(5 + Math.random() * 10);
    }
  }
  try { return fn(); } finally { try { unlinkSync(lock); } catch {} }
};

export type ClaimOpts = { owner: string; ttlMs?: number; pid?: number | null; dir?: string; root?: string };

/** All-or-nothing: either every path is claimed by `owner`, or none (paths taken in this call are released). */
export const claim = (paths: string[], o: ClaimOpts): ClaimResult => {
  if (!o.owner) throw new Error("claim needs an owner");
  const dir = o.dir ?? claimsDir();
  mkdirSync(dir, { recursive: true });
  const taken: string[] = [];
  const conflicts: ClaimView[] = [];
  for (const p of paths) {
    const norm = normalise(p, o.root);
    const file = claimFile(norm, dir);
    const mine: Claim = { path: norm, owner: o.owner, pid: o.pid === undefined ? process.pid : o.pid, host: hostname(), at: new Date().toISOString(), ttlMs: o.ttlMs ?? DEFAULT_TTL_MS };
    for (let i = 0; ; i++) {
      if (tryCreate(file, mine)) { taken.push(norm); break; }
      const cur = readClaim(file);
      if (!cur) { if (i < 50) { sleepSync(2); continue; } conflicts.push({ ...mine, owner: "(unreadable claim file)", stale: false }); break; }
      if (cur.owner === o.owner) break; // already ours: keep the original claim
      const v = view(cur, o.ttlMs);
      if (!v.stale) { conflicts.push(v); break; }
      const won = withReclaimLock(dir, () => {
        const again = readClaim(file);
        if (again && (again.owner !== cur.owner || again.at !== cur.at)) return false; // someone reclaimed it first
        if (again) try { unlinkSync(file); } catch {}
        return tryCreate(file, mine);
      });
      if (won) { taken.push(norm); break; }
      if (i > 5) { const c2 = readClaim(file); conflicts.push(c2 ? view(c2, o.ttlMs) : { ...mine, owner: "(contended)", stale: false }); break; }
    }
    if (conflicts.length) break;
  }
  if (conflicts.length) {
    for (const n of taken) release([n], { owner: o.owner, dir, root: o.root });
    return { ok: false, conflicts, claimed: [] };
  }
  return { ok: true, claimed: paths.map((p) => normalise(p, o.root)) };
};

export type ReleaseResult = { released: string[]; notHeld: string[]; refused: ClaimView[] };

/** Only the owner may release. Paths with no claim are reported as notHeld. */
export const release = (paths: string[], o: { owner: string; dir?: string; root?: string }): ReleaseResult => {
  const dir = o.dir ?? claimsDir();
  const r: ReleaseResult = { released: [], notHeld: [], refused: [] };
  for (const p of paths) {
    const norm = normalise(p, o.root);
    const file = claimFile(norm, dir);
    const cur = existsSync(file) ? readClaim(file) : null;
    if (!cur) { r.notHeld.push(norm); continue; }
    if (cur.owner !== o.owner) { r.refused.push(view(cur)); continue; }
    try { unlinkSync(file); r.released.push(norm); } catch { r.notHeld.push(norm); }
  }
  return r;
};

/** Current holder of a path, or null when free. */
export const check = (p: string, o: { dir?: string; root?: string; ttlMs?: number } = {}): ClaimView | null => {
  const file = claimFile(normalise(p, o.root), o.dir ?? claimsDir());
  const cur = existsSync(file) ? readClaim(file) : null;
  return cur ? view(cur, o.ttlMs) : null;
};

export const listClaims = (o: { dir?: string; ttlMs?: number } = {}): ClaimView[] => {
  const dir = o.dir ?? claimsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".claim")).flatMap((f) => {
    const c = readClaim(join(dir, f));
    return c ? [view(c, o.ttlMs)] : [];
  }).sort((x, y) => x.path.localeCompare(y.path));
};

/** Convenience for scripts: claim, run, always release. Throws if the claim is refused. */
export const withClaims = async <T>(paths: string[], o: ClaimOpts, fn: () => Promise<T> | T): Promise<T> => {
  const r = claim(paths, o);
  if (!r.ok) throw new Error(`Claim refused: ${r.conflicts.map((c) => `${c.path} held by ${c.owner} since ${c.at}`).join("; ")}`);
  try { return await fn(); } finally { release(r.claimed, o); }
};
