"""Tail a workflow journal and emit batched agent changes (one JSON line per batch) for the live board.
Usage: python3 -I pipeline/board-watch.py <workflow-transcript-dir> [interval_s]
Line: {"changes":[{"id","label","phase","state":"working|done","summary"}]}. Exits after the run's final result goes quiet for 10 min."""
import json, os, sys, time
d, interval = sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 20
path, pos, labels, idle = os.path.join(d, "journal.jsonl"), 0, {}, 0
# "tail" mode (3rd arg): learn labels from history silently, report only new events (used when re-arming)
if len(sys.argv) > 3 and sys.argv[3] == "tail" and os.path.exists(path):
    with open(path) as f:
        for line in f:
            try: e = json.loads(line)
            except Exception: continue
            if e.get("type") == "started": labels[e["agentId"]] = (e.get("label"), e.get("phase"))
        pos = f.tell()
while idle < 600:
    changes = []
    try:
        with open(path) as f:
            f.seek(pos); chunk = f.read(); pos = f.tell()
    except FileNotFoundError:
        chunk = ""
    for line in chunk.splitlines():
        try: e = json.loads(line)
        except Exception: continue
        if e.get("type") == "started":
            labels[e["agentId"]] = (e.get("label"), e.get("phase"))
            changes.append({"id": e["agentId"], "label": e.get("label"), "phase": e.get("phase"), "state": "working", "summary": ""})
        elif e.get("type") == "result":
            r = e.get("result"); s = ""
            if isinstance(r, str):
                try: r = json.loads(r)
                except Exception: s = r
            if isinstance(r, dict):
                s = r.get("summary") or (f'{r.get("verdict")} · {len(r.get("issues", []))} issues' if "verdict" in r else "") or (f'{len(r.get("sections", []))} sections outlined' if "sections" in r else "")
            lab, ph = labels.get(e.get("agentId"), (None, None))
            changes.append({"id": e.get("agentId"), "label": lab, "phase": ph, "state": "done", "summary": (s or "")[:120]})
    if changes:
        idle = 0; print(json.dumps({"changes": changes}), flush=True)
    else:
        idle += interval
    time.sleep(interval)
