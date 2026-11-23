import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export const ffprobe = (file: string) => JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", file], { encoding: "utf8" }),
);

/** Fully decode the file; any decoder error means the file is damaged. */
export const decodeCheck = (file: string) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"], { encoding: "utf8" });
  return { ok: r.status === 0 && !r.stderr.trim(), errors: r.stderr.trim().split("\n").filter(Boolean).slice(0, 10) };
};

export const sha256 = (file: string) => new Promise<string>((res, rej) => {
  const h = createHash("sha256");
  createReadStream(file).on("data", (d) => h.update(d)).on("end", () => res(h.digest("hex"))).on("error", rej);
});

export const ff = (args: string[]) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}\n${r.stderr.slice(-2000)}`);
  return r.stderr;
};
