import { existsSync } from "node:fs";

/**
 * Remotion normally downloads its own Chrome. This cloud container already has
 * a Chromium headless shell, and the download host is not reachable, so we use
 * the pre-installed one. Override with LIFELINK_BROWSER on other machines.
 */
const candidates = [
  process.env.LIFELINK_BROWSER,
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell",
  "/opt/pw-browsers/headless_shell_as_downloaded/chrome-headless-shell",
  "/opt/pw-browsers/chromium",
].filter(Boolean) as string[];

export const BROWSER: string | null = candidates.find((p) => existsSync(p)) ?? null;
