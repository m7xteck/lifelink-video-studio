/**
 * Engine self-test: type-check, schema validation, approval gate, render of the 40 s
 * engine test, objective QA. Exit 0 only if everything passes.
 *   npm run test:engine
 */
import { execSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ManifestSchema } from "../src/schema/manifest";
import { P } from "./lib/paths";

const results: [string, boolean, string][] = [];
const step = (name: string, fn: () => string) => { try { results.push([name, true, fn()]); } catch (e) { results.push([name, false, (e as Error).message.slice(0, 300)]); } };

step("typecheck", () => { execSync("npx tsc -p .", { cwd: P.root, stdio: "pipe" }); return "ok"; });
step("manifests valid", () => {
  let n = 0;
  for (const c of readdirSync(P.courses)) for (const l of readdirSync(join(P.courses, c))) {
    try { ManifestSchema.parse(JSON.parse(readFileSync(join(P.courses, c, l, "manifest.json"), "utf8"))); n++; } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT" && !(e instanceof Error && /ENOTDIR/.test(e.message))) throw e; }
  }
  return `${n} manifests`;
});
step("render engine test", () => {
  const r = spawnSync("npx", ["tsx", "pipeline/render.ts", "--course", "_engine-tests", "--lesson", "test-001", "--label", "selftest"], { cwd: P.root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr.slice(-300));
  return r.stdout.trim().split("\n").at(-1)!;
});
step("QA engine test", () => {
  const dir = join(P.renders, "test-001/landscape");
  const v = readdirSync(dir).filter((f) => /_v\d{3}\.mp4$/.test(f)).sort().at(-1)!;
  const r = spawnSync("npx", ["tsx", "pipeline/qa.ts", "--course", "_engine-tests", "--lesson", "test-001", "--video", join(dir, v)], { cwd: P.root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stdout.split("\n").filter((x) => x.includes("FAIL")).join("; "));
  return r.stdout.split("\n")[0];
});
for (const [n, ok, d] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${n}: ${d}`);
process.exit(results.every((r) => r[1]) ? 0 : 1);
