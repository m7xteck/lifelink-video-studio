/**
 * Records a creative decision from the client. Only the client's explicit words
 * should trigger this — silence is never approval.
 *   npx tsx pipeline/approve.ts --course <id> --lesson <id> --decision approved|changes-requested --note "client quote"
 */
import { parseArgs } from "node:util";
import { lessonDir } from "./lib/paths";
import { readStatus, recordApproval, transition } from "./lib/status";

const { values } = parseArgs({ options: { course: { type: "string" }, lesson: { type: "string" }, decision: { type: "string" }, note: { type: "string", default: "" }, by: { type: "string", default: "client" } } });
const dir = lessonDir(values.course!, values.lesson!);
const d = values.decision as "approved" | "changes-requested";
if (!["approved", "changes-requested"].includes(d)) throw new Error("--decision must be approved or changes-requested");
const s = readStatus(dir)!;
if (s.state !== "AWAITING_APPROVAL" && s.state !== "REVISION_REQUIRED") throw new Error(`${values.lesson} is ${s.state}; nothing awaiting approval`);
recordApproval(dir, d, values.by!, values.note);
if (d === "approved") transition(dir, "APPROVED", "Client approved creative plan", { note: values.note });
else transition(dir, s.state === "AWAITING_APPROVAL" ? "CREATIVE_PLAN_READY" : "IN_PRODUCTION", "Client requested changes", { note: values.note }, { force: s.state === "REVISION_REQUIRED" });
console.log(`${values.lesson}: ${d}`);
