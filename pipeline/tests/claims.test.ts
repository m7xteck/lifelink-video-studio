/** File-claim tests: npx tsx --test pipeline/tests/*.test.ts  (temp dirs only). */
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../lib/claims";

// Child mode for the race test: wait for a shared start time, then try to claim one path.
if (process.env.CLAIMS_CHILD) {
  const { claim } = await import("../lib/claims");
  const startAt = Number(process.env.START_AT);
  while (Date.now() < startAt) await new Promise((r) => setTimeout(r, 2));
  const r = claim(["src/components/Shared.tsx"], { owner: process.env.CLAIMS_CHILD, dir: process.env.LIFELINK_CLAIMS_DIR, pid: null } /* winner exits at once: TTL-only so its claim is not instantly stale */);
  process.exit(r.ok ? 0 : 2);
}


const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), "claims-test-"));
const run = (args: string[], env: Record<string, string>) => new Promise<{ code: number; out: string; err: string }>((res) => {
  const p = spawn(process.execPath, ["--import", "tsx", ...args], { cwd: ROOT, env: { ...process.env, ...env } });
  let out = "", err = "";
  p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
  p.on("close", (code) => res({ code: code ?? -1, out, err }));
});

test("a second owner is refused and told who holds the claim; paths are normalised", () => {
  const dir = tmp();
  assert.ok(C.claim(["src/a.tsx", "./src/b.tsx"], { owner: "L01:fix:sec-03", dir }).ok);
  const r = C.claim([join(ROOT, "src/a.tsx")], { owner: "L01:fix:sec-04", dir });
  assert.equal(r.ok, false);
  if (!r.ok) { assert.equal(r.conflicts[0].owner, "L01:fix:sec-03"); assert.equal(r.conflicts[0].path, "src/a.tsx"); }
  // same owner re-claiming is fine
  assert.ok(C.claim(["src/a.tsx"], { owner: "L01:fix:sec-03", dir }).ok);
  // all-or-nothing: a refused multi-path claim leaves nothing behind
  assert.equal(C.claim(["src/c.tsx", "src/b.tsx"], { owner: "other", dir }).ok, false);
  assert.equal(C.check("src/c.tsx", { dir }), null);
  assert.deepEqual(C.listClaims({ dir }).map((c) => c.path), ["src/a.tsx", "src/b.tsx"]);
  rmSync(dir, { recursive: true, force: true });
});

test("release by a non-owner is refused; owner release frees the path", () => {
  const dir = tmp();
  C.claim(["brand/design-system.json"], { owner: "owner-1", dir });
  const bad = C.release(["brand/design-system.json"], { owner: "owner-2", dir });
  assert.equal(bad.refused.length, 1); assert.equal(bad.released.length, 0);
  assert.equal(C.check("brand/design-system.json", { dir })!.owner, "owner-1");
  assert.deepEqual(C.release(["brand/design-system.json"], { owner: "owner-1", dir }).released, ["brand/design-system.json"]);
  assert.equal(C.check("brand/design-system.json", { dir }), null);
  rmSync(dir, { recursive: true, force: true });
});

test("stale claims (dead PID, or older than TTL) are reclaimable", async () => {
  const dir = tmp();
  // dead PID: a child process that has already exited
  const dead = await new Promise<number>((res) => { const p = spawn(process.execPath, ["-e", ""]); p.on("close", () => res(p.pid!)); });
  assert.ok(C.claim(["x.ts"], { owner: "crashed-agent", pid: dead, dir }).ok);
  assert.equal(C.check("x.ts", { dir })!.stale, true);
  const r = C.claim(["x.ts"], { owner: "new-agent", dir });
  assert.ok(r.ok);
  assert.equal(C.check("x.ts", { dir })!.owner, "new-agent");
  // TTL: claim without PID, then backdate it past the TTL
  assert.ok(C.claim(["y.ts"], { owner: "old", pid: null, dir }).ok);
  assert.equal(C.claim(["y.ts"], { owner: "new", dir, ttlMs: 60_000 }).ok, false);
  const f = readdirSync(dir).find((n) => n.startsWith("y.ts."))!;
  writeFileSync(join(dir, f), JSON.stringify({ ...C.check("y.ts", { dir })!, at: new Date(Date.now() - 3 * 3600_000).toISOString() }));
  assert.ok(C.claim(["y.ts"], { owner: "new", dir }).ok); // default TTL 2 h
  rmSync(dir, { recursive: true, force: true });
});

test("CLI: claim, refusal exit 2 with holder, check, release", async () => {
  const dir = tmp();
  const env = { LIFELINK_CLAIMS_DIR: dir };
  assert.equal((await run(["pipeline/claims.ts", "claim", "src/a.tsx", "--owner", "t1"], env)).code, 0);
  const refused = await run(["pipeline/claims.ts", "claim", "src/a.tsx", "--owner", "t2"], env);
  assert.equal(refused.code, 2); assert.match(refused.err, /held by t1/);
  assert.equal((await run(["pipeline/claims.ts", "check", "src/a.tsx"], env)).code, 2);
  assert.equal((await run(["pipeline/claims.ts", "check", "src/a.tsx", "--owner", "t1"], env)).code, 0);
  assert.equal((await run(["pipeline/claims.ts", "release", "src/a.tsx", "--owner", "t2"], env)).code, 2);
  assert.equal((await run(["pipeline/claims.ts", "release", "src/a.tsx", "--owner", "t1"], env)).code, 0);
  assert.match((await run(["pipeline/claims.ts", "check", "src/a.tsx"], env)).out, /free/);
  rmSync(dir, { recursive: true, force: true });
});

test("concurrent claim race between processes: exactly one winner", async () => {
  for (const scenario of ["fresh", "stale"] as const) {
    const dir = tmp();
    if (scenario === "stale") {
      const dead = await new Promise<number>((res) => { const p = spawn(process.execPath, ["-e", ""]); p.on("close", () => res(p.pid!)); });
      C.claim(["src/components/Shared.tsx"], { owner: "crashed", pid: dead, dir, root: ROOT });
    }
    const startAt = String(Date.now() + 2500);
    const res = await Promise.all(Array.from({ length: 6 }, (_, i) =>
      run([fileURLToPath(import.meta.url)], { LIFELINK_CLAIMS_DIR: dir, CLAIMS_CHILD: `agent-${i}`, START_AT: startAt })));
    const winners = res.filter((r) => r.code === 0).length;
    assert.equal(winners, 1, `${scenario}: ${res.map((r) => r.code + r.err).join(" | ")}`);
    assert.equal(res.filter((r) => r.code === 2).length, 5);
    assert.match(C.check("src/components/Shared.tsx", { dir })!.owner, /^agent-\d$/);
    rmSync(dir, { recursive: true, force: true });
  }
});
