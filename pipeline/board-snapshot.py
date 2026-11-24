"""Snapshot of a workflow run for the live board: per-agent state, times, tokens, plus ETA per stage.
Usage: python3 -I pipeline/board-snapshot.py <workflow-transcript-dir> <plan.json> [--watch interval_s]
plan.json: {"phases":[{"phase":"Build","stage":"v2-components","total":7,"defaultMin":30}, ...],
            "after":[{"stage":"v2-render","min":110},{"stage":"v2-deliver","min":10}], "concurrency":2,
            "pairs":[["Plan","Review"]]}   # pairs: phase B item i starts after phase A item i (pipeline)
Prints one JSON line. With --watch, prints a line only when an agent starts/finishes, or every 15 min (token refresh).
Tokens = input + cache writes + cache reads + output, deduplicated per API message."""
import json, os, sys, time, glob
from datetime import datetime, timezone, timedelta

DIRS, plan = sys.argv[1].split(","), json.load(open(sys.argv[2]))  # several workflow runs: comma-separated
AGENT_DIR = {}
watch = float(sys.argv[sys.argv.index("--watch") + 1]) if "--watch" in sys.argv else None
_tok_cache = {}  # path -> (size, tokens, first_ts, last_ts)

def iso(dt): return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
def parse_ts(s):
    try: return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception: return None

def agent_file_stats(aid):
    p = os.path.join(AGENT_DIR.get(aid, DIRS[0]), f"agent-{aid}.jsonl")
    if not os.path.exists(p): return 0, None, None
    size = os.path.getsize(p)
    c = _tok_cache.get(p)
    if c and c[0] == size: return c[1], c[2], c[3]
    seen, tok, first, last = set(), 0, None, None
    with open(p) as f:
        for line in f:
            try: e = json.loads(line)
            except Exception: continue
            ts = e.get("timestamp")
            if ts:
                first = first or ts; last = ts
            m = e.get("message") or {}
            u = m.get("usage") if isinstance(m, dict) else None
            mid = m.get("id") if isinstance(m, dict) else None
            if u and mid not in seen:
                seen.add(mid)
                tok += sum(int(u.get(k) or 0) for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"))
    _tok_cache[p] = (size, tok, first, last)
    return tok, first, last

def job_state(s, now):
    """Real progress for a non-agent stage. Render: frames done from the render log (measured), time left from the measured rate (estimate)."""
    done_marker = s.get("doneWhen")
    if done_marker and os.path.exists(done_marker):
        txt = open(done_marker, errors="ignore").read()
        if s.get("doneText", "") in txt:
            return {"state": "done", "label": s.get("label"), "finishedAt": iso(datetime.fromtimestamp(os.path.getmtime(done_marker), timezone.utc)), "summary": s.get("doneSummary", "Finished")}
    log = s.get("log")
    if not log or not os.path.exists(log):
        return {"state": "queued", "label": s.get("label")}
    txt = open(log, errors="ignore").read()
    import re
    started = datetime.fromtimestamp(os.stat(log).st_ctime, timezone.utc)
    try: started = datetime.fromtimestamp(os.stat(log).st_birthtime, timezone.utc)
    except Exception: pass
    if s.get("startedAt"): started = parse_ts(s["startedAt"]) or started
    total = s.get("totalFrames") or 1
    secs = re.findall(r"section (\S+): (?:rendered (\d+) frames|cached \(frames (\d+)[–-](\d+)\))", txt)
    frames = sum(int(r[1]) if r[1] else int(r[3]) - int(r[2]) + 1 for r in secs)
    pct = re.findall(r"section (\S+): (\d+)%", txt)
    if pct and (not secs or pct[-1][0] != secs[-1][0]): frames += int(pct[-1][1]) / 100 * total / max(1, s.get("sections", 16))
    if "done →" in txt:
        qa = s.get("qaMin", 15)
        return {"state": "working", "label": s.get("label"), "startedAt": iso(started), "remainingMin": qa, "summary": "Render finished; automatic checks running"}
    frac = min(0.999, frames / total)
    el = (now - started).total_seconds() / 60
    rem = (el / frac * (1 - frac) if frac > 0.02 else s["min"]) + s.get("qaMin", 15)
    return {"state": "working", "label": s.get("label"), "startedAt": iso(started), "remainingMin": rem,
            "summary": f"{frac * 100:.0f}% of frames rendered ({len(secs)} of {s.get('sections', 16)} sections) — measured; time left from the measured speed"}

def snapshot():
    agents, order = {}, []
    for d in DIRS:
      jp = os.path.join(d, "journal.jsonl")
      if not os.path.exists(jp): continue
      for line in open(jp):
            try: e = json.loads(line)
            except Exception: continue
            if e.get("type") == "started":
                AGENT_DIR[e["agentId"]] = d
                a = agents.setdefault(e["agentId"], {"id": e["agentId"]}); a.update(label=e.get("label"), phase=e.get("phase"), state="working"); order.append(e["agentId"])
            elif e.get("type") == "result" and e.get("agentId") in agents:
                r = e.get("result"); s = r if isinstance(r, str) else json.dumps(r) if r is not None else ""
                agents[e["agentId"]].update(state="done", summary=" ".join(s.split())[:160])
    now = datetime.now(timezone.utc)
    for a in agents.values():
        a["tokens"], f, l = agent_file_stats(a["id"])
        a["startedAt"] = f
        if a["state"] == "done": a["finishedAt"] = l
    # ---- ETA: list-schedule the remaining work on `concurrency` slots ----
    phases = {p["phase"]: p for p in plan["phases"]}
    def dur_min(a):
        s, e = parse_ts(a.get("startedAt") or ""), parse_ts(a.get("finishedAt") or "")
        return (e - s).total_seconds() / 60 if s and e else None
    avg = {}
    for ph in phases:
        ds = [dur_min(a) for a in agents.values() if a.get("phase") == ph and a["state"] == "done" and dur_min(a)]
        k = max(0, 3 - len(ds))  # blend with the default until 3 agents of this phase have finished
        avg[ph] = (sum(ds) + phases[ph]["defaultMin"] * k) / (len(ds) + k)
    slots = [now] * plan.get("concurrency", 2)
    busy = []  # remaining time of working agents occupies slots
    for a in agents.values():
        if a["state"] == "working":
            s = parse_ts(a.get("startedAt") or "") or now
            rem = max(avg[a["phase"]] - (now - s).total_seconds() / 60, 3)
            busy.append((a["phase"], now + timedelta(minutes=rem)))
    stage_end = {p["stage"]: None for p in plan["phases"]}
    for ph, end in busy: stage_end[phases[ph]["stage"]] = max(filter(None, [stage_end[phases[ph]["stage"]], end]))
    slots = sorted([end for _, end in busy] + [now] * max(0, plan.get("concurrency", 2) - len(busy)))[: plan.get("concurrency", 2)]
    started = {ph: sum(1 for a in agents.values() if a.get("phase") == ph) for ph in phases}
    done_at = {ph: [parse_ts(a.get("finishedAt") or "") for a in agents.values() if a.get("phase") == ph and a["state"] == "done"] for ph in phases}
    pair = {b: a for a, b in plan.get("pairs", [])}
    # remaining items per phase, in order; paired phase items become ready when their partner item finishes
    finish_times = {ph: sorted(t for t in done_at[ph] if t) + sorted(e for p2, e in busy if p2 == ph) for ph in phases}
    queue = []
    for p in plan["phases"]:
        ph = p["phase"]
        for i in range(started[ph], p["total"]): queue.append((ph, i))
    pending = list(queue)
    while pending:
        progressed = False
        for item in list(pending):
            ph, i = item
            if ph in pair:
                src = finish_times[pair[ph]]
                if len(src) <= i: continue
                ready = src[i]
            else:
                # a non-paired phase waits for the previous non-paired phase to finish entirely (barrier)
                idx = [x["phase"] for x in plan["phases"]].index(ph)
                prevs = [q for q in plan["phases"][:idx] if q["phase"] not in pair]
                ready = now
                if prevs:
                    pq = prevs[-1]
                    if len(finish_times[pq["phase"]]) < pq["total"]: continue
                    ready = max(finish_times[pq["phase"]] + [now])
            slots.sort(); start = max(slots[0], ready); end = start + timedelta(minutes=avg[ph])
            slots[0] = end; finish_times[ph].append(end); pending.remove(item); progressed = True
            st = phases[ph]["stage"]; stage_end[st] = max(filter(None, [stage_end[st], end]))
            break
        if not progressed: break
    t = max([x for x in stage_end.values() if x] + [now])
    for p in plan["phases"]:
        if stage_end[p["stage"]] is None and started[p["phase"]] >= p["total"]: stage_end[p["stage"]] = now  # finished
    jobs = []  # non-agent work (render, review…) shown as tasks so the bar and "working now" stay truthful
    prev_done = True
    for s in plan.get("after", []):
        st = job_state(s, now)
        if st["state"] == "done":
            stage_end[s["stage"]] = parse_ts(st.get("finishedAt") or "") or now
        else:
            mins = st.get("remainingMin", s["min"]) if st["state"] == "working" else s["min"]
            t = max(t, now) + timedelta(minutes=mins); stage_end[s["stage"]] = t
        jobs.append({"id": f"job-{s['stage']}", "label": st.get("label") or s.get("label") or s["stage"], "phase": None, "stage": s["stage"],
                     "state": st["state"], "summary": st.get("summary", ""), "startedAt": st.get("startedAt"), "finishedAt": st.get("finishedAt"), "tokens": 0, "kind": "job"})
    stages = {}
    for p in plan["phases"]:
        mine = [a for a in agents.values() if a.get("phase") == p["phase"]]
        prev = stages.get(p["stage"], {"agentsTotal": 0, "agentsDone": 0, "tokens": 0})  # several phases may share one stage
        stages[p["stage"]] = {"agentsTotal": prev["agentsTotal"] + p["total"], "agentsDone": prev["agentsDone"] + sum(a["state"] == "done" for a in mine),
                              "tokens": prev["tokens"] + sum(a["tokens"] for a in mine), "etaAt": iso(stage_end[p["stage"]]) if stage_end[p["stage"]] else None}
    for s in plan.get("after", []): stages[s["stage"]] = {"etaAt": iso(stage_end[s["stage"]])}
    for s_ in plan.get("after", []): stages[s_["stage"]]["state"] = next(j["state"] for j in jobs if j["stage"] == s_["stage"])
    alist = [agents[i] for i in dict.fromkeys(order)] + jobs
    return {"at": iso(now), "etaAt": iso(t), "tokens": sum(a["tokens"] for a in agents.values()),
            "agentsDone": sum(a["state"] == "done" for a in alist), "agentsTotal": sum(p["total"] for p in plan["phases"]) + len(jobs),
            "stages": stages, "agents": alist}

def board_doc(s):
    """The single board/run document the live page reads (one write per update)."""
    stage_of = {p["phase"]: p["stage"] for p in plan["phases"]}
    agents = [{"id": a["id"], "name": a.get("label") or a["id"], "stage": a.get("stage") or stage_of.get(a.get("phase"), "other"), "state": a["state"], "order": i,
               "summary": a.get("summary", ""), "startedAt": a.get("startedAt"), "finishedAt": a.get("finishedAt"), "tokens": a["tokens"]}
              for i, a in enumerate(s["agents"])]
    for p in plan["phases"]:  # queued placeholders so the board shows what is still to come
        have = sum(1 for a in agents if a["stage"] == p["stage"])
        for k in range(have, p["total"]):
            agents.append({"id": f"{p['stage']}-q{k}", "name": (p.get("names") or [])[k] if k < len(p.get("names") or []) else f"{p['phase']} agent {k + 1}",
                           "stage": p["stage"], "state": "queued", "order": 100 + len(agents), "tokens": 0})
    doc = dict(plan.get("run", {}))
    doc.update(updatedAt=s["at"], etaAt=s["etaAt"], tokens=s["tokens"], agentsDone=s["agentsDone"], agentsTotal=s["agentsTotal"], stageStats=s["stages"], agents=agents)
    return doc

out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
def emit(s):
    if out:
        json.dump(board_doc(s), open(out, "w"))
        print(json.dumps({"at": s["at"], "done": s["agentsDone"], "total": s["agentsTotal"], "eta": s["etaAt"], "tokens": s["tokens"],
                          "working": [a.get("label") for a in s["agents"] if a["state"] == "working"]}), flush=True)
    else:
        print(json.dumps(s), flush=True)

if not watch:
    emit(snapshot()); sys.exit()
last_key, last_emit = None, 0
while True:
    s = snapshot()
    key = tuple((a["id"], a["state"]) for a in s["agents"])
    if key != last_key or time.time() - last_emit > 900:
        emit(s); last_key, last_emit = key, time.time()
    if s["agentsDone"] >= s["agentsTotal"]: break
    time.sleep(watch)
