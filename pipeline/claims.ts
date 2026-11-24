/**
 * File-ownership claims CLI (one O_EXCL claim file per repo path under .locks/claims/).
 *
 *   npx tsx pipeline/claims.ts claim   <path...> --owner <task-id> [--ttl 2h] [--pid <long-lived pid>]
 *   npx tsx pipeline/claims.ts release <path...> --owner <task-id>
 *   npx tsx pipeline/claims.ts check   <path> [--owner <task-id>]
 *   npx tsx pipeline/claims.ts list    [--json]
 *
 * claim is all-or-nothing. Exit codes: 0 ok / free / held by --owner, 1 usage error,
 * 2 refused or held by someone else (the holder is printed).
 * --ttl accepts 90m, 2h, 30s or milliseconds. Stale claims (dead PID or older than TTL) are reclaimable.
 * LIFELINK_CLAIMS_DIR overrides the claims directory (tests use temp dirs).
 */
import { parseArgs } from "node:util";
import { check, claim, DEFAULT_TTL_MS, listClaims, release, type ClaimView } from "./lib/claims";

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: { owner: { type: "string" }, ttl: { type: "string" }, pid: { type: "string" }, json: { type: "boolean", default: false } },
});
const [cmd, ...paths] = positionals;
const usage = (m: string): never => { console.error(m); process.exit(1); };

const parseTtl = (s?: string) => {
  if (!s) return DEFAULT_TTL_MS;
  const m = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/.exec(s.trim());
  if (!m) usage(`Bad --ttl "${s}" (use e.g. 90m, 2h, 30s)`);
  const n = Number(m![1]);
  return n * ({ ms: 1, s: 1000, m: 60_000, h: 3_600_000 }[m![2] as "ms" | "s" | "m" | "h"] ?? 1);
};
const ttlMs = parseTtl(a.ttl);
const who = (c: ClaimView) => `${c.path} is held by ${c.owner} since ${c.at}${c.pid ? ` (pid ${c.pid} on ${c.host})` : ""}${c.stale ? ` [STALE: ${c.staleReason}]` : ""}`;

switch (cmd) {
  case "claim": {
    if (!paths.length) usage("claim needs at least one path");
    const owner = a.owner ?? usage("--owner <task-id> is required");
    const r = claim(paths, { owner, ttlMs, pid: a.pid ? Number(a.pid) : null });
    if (!r.ok) { for (const c of r.conflicts) console.error(`REFUSED: ${who(c)}`); process.exit(2); }
    for (const p of r.claimed) console.log(`claimed ${p} for ${owner}`);
    break;
  }
  case "release": {
    if (!paths.length) usage("release needs at least one path");
    const r = release(paths, { owner: a.owner ?? usage("--owner <task-id> is required") });
    for (const p of r.released) console.log(`released ${p}`);
    for (const p of r.notHeld) console.log(`not claimed: ${p}`);
    for (const c of r.refused) console.error(`REFUSED (not the owner): ${who(c)}`);
    if (r.refused.length) process.exit(2);
    break;
  }
  case "check": {
    if (paths.length !== 1) usage("check takes exactly one path");
    const c = check(paths[0], { ttlMs: a.ttl ? ttlMs : undefined });
    if (!c) { console.log(`free: ${paths[0]}`); break; }
    console.log(who(c));
    if (!c.stale && c.owner !== a.owner) process.exit(2);
    break;
  }
  case "list": {
    const all = listClaims();
    if (a.json) console.log(JSON.stringify(all, null, 2));
    else if (!all.length) console.log("(no claims)");
    else console.table(all.map((c) => ({ path: c.path, owner: c.owner, since: c.at.replace("T", " ").slice(0, 19), pid: c.pid ?? "", stale: c.stale ? c.staleReason : "" })));
    break;
  }
  default:
    usage("usage: npx tsx pipeline/claims.ts claim|release|check|list [paths] --owner <task-id> [--ttl 2h] [--pid n] [--json]");
}
