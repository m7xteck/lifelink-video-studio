"""Audio QA helper: measures the time offset between the original narration and the
rendered video's audio track using envelope cross-correlation.
Usage: python3 -I qa_audio.py <original> <rendered.mp4> <start_sec> <dur_sec>
Prints JSON {lag_ms, peak_corr}."""
import json, subprocess, sys
import numpy as np

SR = 8000

def load(path, start=None, dur=None):
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", str(start), "-t", str(dur)]
    cmd += ["-i", path, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32)

def env(x):
    x = np.abs(x)
    k = int(SR * 0.004)
    return np.convolve(x, np.ones(k) / k, mode="same")

orig, rend, start, dur = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
a = env(load(orig, start, dur)); b = env(load(rend))
n = min(len(a), len(b)); a, b = a[:n] - a[:n].mean(), b[:n] - b[:n].mean()
if np.std(a) < 1e-7 or np.std(b) < 1e-7:
    print(json.dumps({"lag_ms": None, "peak_corr": 0.0, "note": "silent signal"})); sys.exit(0)
size = 1 << int(np.ceil(np.log2(2 * n)))
c = np.fft.irfft(np.fft.rfft(b, size) * np.conj(np.fft.rfft(a, size)), size)
maxlag = int(SR * 0.5)
lags = np.concatenate([np.arange(0, maxlag), np.arange(-maxlag, 0)])
vals = np.concatenate([c[:maxlag], c[-maxlag:]])
i = int(np.argmax(vals))
corr = float(vals[i] / (np.linalg.norm(a) * np.linalg.norm(b)))
print(json.dumps({"lag_ms": round(lags[i] * 1000 / SR, 2), "peak_corr": round(corr, 4)}))
