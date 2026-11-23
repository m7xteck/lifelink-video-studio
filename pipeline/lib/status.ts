import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Explicit production states. Every change is appended to history with a
 * timestamp and evidence (file paths, measurements) so state can always be
 * recovered from disk rather than from conversation memory.
 */
export const STATES = [
  "IMPORTED", "AUDIO_ANALYSED", "TRANSCRIBED", "CREATIVE_PLAN_READY", "AWAITING_APPROVAL",
  "APPROVED", "IN_PRODUCTION", "PREVIEW_RENDERED", "QA_IN_PROGRESS", "REVISION_REQUIRED",
  "QA_PASSED", "FINAL_RENDERED", "DELIVERED", "FAILED",
] as const;
export type State = (typeof STATES)[number];

const NEXT: Record<State, State[]> = {
  IMPORTED: ["AUDIO_ANALYSED", "FAILED"],
  AUDIO_ANALYSED: ["TRANSCRIBED", "FAILED"],
  TRANSCRIBED: ["CREATIVE_PLAN_READY", "FAILED"],
  CREATIVE_PLAN_READY: ["AWAITING_APPROVAL", "FAILED"],
  AWAITING_APPROVAL: ["APPROVED", "CREATIVE_PLAN_READY"],
  APPROVED: ["IN_PRODUCTION"],
  IN_PRODUCTION: ["PREVIEW_RENDERED", "FAILED"],
  PREVIEW_RENDERED: ["QA_IN_PROGRESS", "IN_PRODUCTION"],
  QA_IN_PROGRESS: ["QA_PASSED", "REVISION_REQUIRED", "FAILED"],
  REVISION_REQUIRED: ["IN_PRODUCTION", "AWAITING_APPROVAL"],
  QA_PASSED: ["FINAL_RENDERED", "IN_PRODUCTION"],
  FINAL_RENDERED: ["DELIVERED", "IN_PRODUCTION"],
  DELIVERED: ["IN_PRODUCTION"],
  FAILED: ["IMPORTED", "AUDIO_ANALYSED", "TRANSCRIBED", "IN_PRODUCTION", "QA_IN_PROGRESS"],
};

export type StatusFile = {
  lessonId: string; courseId: string; state: State;
  approval: { creative: "none" | "pending" | "approved" | "changes-requested"; by?: string; at?: string; note?: string };
  history: { from: State | null; to: State; at: string; note: string; evidence: Record<string, unknown> }[];
};

export const statusPath = (dir: string) => join(dir, "status.json");

export const readStatus = (dir: string): StatusFile | null =>
  existsSync(statusPath(dir)) ? JSON.parse(readFileSync(statusPath(dir), "utf8")) : null;

export const createStatus = (dir: string, courseId: string, lessonId: string, evidence: Record<string, unknown>) => {
  const s: StatusFile = {
    lessonId, courseId, state: "IMPORTED", approval: { creative: "none" },
    history: [{ from: null, to: "IMPORTED", at: new Date().toISOString(), note: "Recording ingested", evidence }],
  };
  mkdirSync(dirname(statusPath(dir)), { recursive: true });
  writeFileSync(statusPath(dir), JSON.stringify(s, null, 2));
  return s;
};

export const transition = (dir: string, to: State, note: string, evidence: Record<string, unknown> = {}, opts: { force?: boolean } = {}) => {
  const s = readStatus(dir);
  if (!s) throw new Error(`No status.json in ${dir}`);
  if (!opts.force && s.state !== to && !NEXT[s.state].includes(to)) {
    throw new Error(`Illegal transition ${s.state} → ${to} for ${s.lessonId}`);
  }
  // Approval gate: production may never start without explicit creative approval.
  if (to === "IN_PRODUCTION" && s.approval.creative !== "approved" && !opts.force) {
    throw new Error(`${s.lessonId}: creative plan not approved — cannot enter production`);
  }
  s.history.push({ from: s.state, to, at: new Date().toISOString(), note, evidence });
  s.state = to;
  writeFileSync(statusPath(dir), JSON.stringify(s, null, 2));
  return s;
};

export const recordApproval = (dir: string, decision: StatusFile["approval"]["creative"], by: string, note = "") => {
  const s = readStatus(dir);
  if (!s) throw new Error(`No status.json in ${dir}`);
  s.approval = { creative: decision, by, at: new Date().toISOString(), note };
  writeFileSync(statusPath(dir), JSON.stringify(s, null, 2));
  return s;
};
