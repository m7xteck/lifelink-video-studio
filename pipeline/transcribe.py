"""Timestamped transcription with faster-whisper (runs locally; audio never leaves the machine).

Usage: python3 -I pipeline/transcribe.py <audio.wav> <out_dir> <lesson_id> [model]

Writes:
  <lesson_id>.transcript.json  segments + every word with start/end/probability
  <lesson_id>.txt              plain transcript
  <lesson_id>.srt              subtitle file (≤ 2 lines, ≤ 42 chars/line, ≤ 7 s per cue)
  <lesson_id>.uncertain.json   words the model was unsure of (probability < 0.5) — flagged for review
Nothing is invented: the text is exactly what the recogniser heard, and low-confidence words are flagged.
"""
import json, os, subprocess, sys, time
import numpy as np
from faster_whisper import WhisperModel

audio, out_dir, lesson_id = sys.argv[1], sys.argv[2], sys.argv[3]
model_name = sys.argv[4] if len(sys.argv) > 4 else os.environ.get("LIFELINK_WHISPER_MODEL", "small.en")
os.makedirs(out_dir, exist_ok=True)
t0 = time.time()
model = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)
# Decode with FFmpeg (16 kHz mono float) rather than PyAV, for robustness across library versions.
pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                                   capture_output=True, check=True).stdout, dtype=np.float32)
segments, info = model.transcribe(pcm, word_timestamps=True, vad_filter=False, beam_size=5, condition_on_previous_text=True)

segs, words = [], []
for s in segments:
    ws = [{"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 3)} for w in (s.words or [])]
    words.extend(ws)
    segs.append({"id": s.id, "start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(), "avg_logprob": round(s.avg_logprob, 3), "no_speech_prob": round(s.no_speech_prob, 3), "words": ws})

# Pauses ≥ 0.7 s are recorded — they are candidate section boundaries and must be preserved.
pauses = [{"after_word": i, "at": words[i]["end"], "dur": round(words[i + 1]["start"] - words[i]["end"], 3)}
          for i in range(len(words) - 1) if words[i + 1]["start"] - words[i]["end"] >= 0.7]

def ts(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s - int(s)) * 1000)):03}"

# Subtitle cues built from word timings (never from estimated reading speed).
cues, cur = [], []
def flush():
    if cur:
        cues.append((cur[0]["start"], cur[-1]["end"], " ".join(w["w"] for w in cur)))
        cur.clear()
for i, w in enumerate(words):
    if cur:
        text = " ".join(x["w"] for x in cur + [w])
        gap = w["start"] - cur[-1]["end"]
        if len(text) > 84 or w["end"] - cur[0]["start"] > 7 or gap > 0.7 or cur[-1]["w"][-1:] in ".?!":
            flush()
    cur.append(w)
flush()

def wrap(t, n=42):
    if len(t) <= n: return t
    cut = t.rfind(" ", 0, len(t) // 2 + 10)
    return t[:cut] + "\n" + t[cut + 1:] if cut > 0 else t

with open(os.path.join(out_dir, f"{lesson_id}.srt"), "w") as f:
    for i, (a, b, t) in enumerate(cues, 1):
        b = max(b, a + 0.8)
        if i < len(cues): b = min(b, cues[i][0] - 0.001)
        f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{wrap(t)}\n\n")
with open(os.path.join(out_dir, f"{lesson_id}.txt"), "w") as f:
    f.write("\n".join(s["text"] for s in segs) + "\n")
uncertain = [w for w in words if w["p"] < 0.5]
with open(os.path.join(out_dir, f"{lesson_id}.uncertain.json"), "w") as f:
    json.dump(uncertain, f, indent=1)
result = {"lessonId": lesson_id, "model": model_name, "language": info.language, "language_probability": round(info.language_probability, 3),
          "durationSec": round(info.duration, 3), "processingSec": round(time.time() - t0, 1), "wordCount": len(words),
          "uncertainWordCount": len(uncertain), "pauses": pauses, "segments": segs}
with open(os.path.join(out_dir, f"{lesson_id}.transcript.json"), "w") as f:
    json.dump(result, f, indent=1)
print(json.dumps({k: result[k] for k in ("lessonId", "model", "durationSec", "processingSec", "wordCount", "uncertainWordCount")}))
