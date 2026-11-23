import { mkdirSync, openSync, closeSync, unlinkSync, readFileSync, existsSync, writeSync } from "node:fs";
import { join } from "node:path";
import { P } from "./paths";

/**
 * Cross-process file lock (O_EXCL). Used so two jobs never write the same
 * lesson, and nothing modifies the shared design system concurrently.
 * Stale locks (dead PID) are reclaimed automatically.
 */
export const withLock = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  mkdirSync(P.locks, { recursive: true });
  const file = join(P.locks, `${name.replace(/[^\w.-]/g, "_")}.lock`);
  for (let attempt = 0; ; attempt++) {
    try {
      const fd = openSync(file, "wx");
      writeSync(fd, String(process.pid));
      closeSync(fd);
      break;
    } catch {
      if (existsSync(file)) {
        const pid = Number(readFileSync(file, "utf8"));
        if (pid && !alive(pid)) { unlinkSync(file); continue; }
      }
      if (attempt > 600) throw new Error(`Timed out waiting for lock ${name}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  try { return await fn(); } finally { try { unlinkSync(file); } catch {} }
};

const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
