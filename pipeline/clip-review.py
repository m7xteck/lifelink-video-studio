"""Video-based review material for one stretch of a rendered lesson.
Usage: python3 -I pipeline/clip-review.py <video.mp4> <transcript.json> <from_s> <to_s> <out_dir> [fps=6]
Writes to out_dir:
  clip.mp4        the stretch with its audio (for people and before/after comparisons)
  strip-NN.png    filmstrips: frames at `fps`, each stamped with its time and the narration words being spoken then
  motion.png      motion energy per frame (mean abs frame difference) — spikes = pops/jolts, flat runs = stillness
  motion.json     the same numbers + detected spikes (frame-to-frame change > 3× the local median and > 2.0)
What this does NOT do: nobody "listens". Sync is checked against Whisper word timestamps; audio presence/offset is checked by qa.ts."""
import json, os, subprocess, sys
import numpy as np

video, tjson, t0, t1, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
fps = float(sys.argv[6]) if len(sys.argv) > 6 else 6
os.makedirs(out, exist_ok=True)
dur = t1 - t0

subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(t0), "-t", str(dur), "-i", video, "-c:v", "libx264", "-crf", "20", "-preset", "veryfast",
                "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", os.path.join(out, "clip.mp4")], check=True)

# words spoken around each sampled time
t = json.load(open(tjson))
words = [w for s in t.get("segments", []) for w in s.get("words", [])]
def spoken(at, span=0.6):
    return " ".join(w["w"].strip() for w in words if w["start"] <= at + span / 2 and w["end"] >= at - span / 2)

# frames at fps (scaled to 480 px wide)
W, H = 480, 270
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(t0), "-t", str(dur), "-i", video, "-vf", f"fps={fps},scale={W}:{H}",
                      "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)

from PIL import Image, ImageDraw, ImageFont
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
except Exception: font = ImageFont.load_default()
COLS, ROWS = 6, 5
per = COLS * ROWS
for k in range(0, len(frames), per):
    sheet = Image.new("RGB", (COLS * W, ROWS * (H + 34)), (20, 20, 20))
    for j, fr in enumerate(frames[k:k + per]):
        i = k + j; at = t0 + i / fps
        x, y = (j % COLS) * W, (j // COLS) * (H + 34)
        sheet.paste(Image.fromarray(fr), (x, y))
        d = ImageDraw.Draw(sheet)
        m, s = divmod(at, 60)
        d.text((x + 4, y + H + 2), f"{int(m)}:{s:05.2f}", fill=(255, 220, 120), font=font)
        d.text((x + 4, y + H + 17), spoken(at)[:62], fill=(230, 230, 230), font=font)
    sheet.save(os.path.join(out, f"strip-{k // per:02d}.png"))

# motion energy on full-rate frames (small, grayscale)
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(t0), "-t", str(dur), "-i", video, "-vf", "scale=320:180,format=gray",
                      "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
g = np.frombuffer(raw, np.uint8).reshape(-1, 180, 320).astype(np.int16)
e = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))
med = np.array([np.median(e[max(0, i - 15):i + 16]) for i in range(len(e))])
spikes = [{"t": round(t0 + (i + 1) / 30, 2), "energy": round(float(e[i]), 2)} for i in range(len(e)) if e[i] > max(2.0, 3 * med[i])]
json.dump({"from": t0, "to": t1, "energy": [round(float(v), 3) for v in e], "spikes": spikes}, open(os.path.join(out, "motion.json"), "w"))
img = Image.new("RGB", (1200, 220), (250, 248, 243)); d = ImageDraw.Draw(img)
mx = max(3.0, float(e.max()) if len(e) else 3.0)
for i in range(1, len(e)):
    x0, x1 = (i - 1) * 1200 / len(e), i * 1200 / len(e)
    d.line([(x0, 210 - e[i - 1] / mx * 190), (x1, 210 - e[i] / mx * 190)], fill=(57, 97, 188), width=2)
for s in spikes:
    x = (s["t"] - t0) * 1200 / dur; d.line([(x, 10), (x, 210)], fill=(175, 62, 70), width=1)
d.text((6, 4), f"motion energy {t0:.1f}-{t1:.1f}s  (red = spike)", fill=(80, 0, 2), font=font)
img.save(os.path.join(out, "motion.png"))
print(json.dumps({"out": out, "frames": int(len(frames)), "strips": (len(frames) + per - 1) // per, "spikes": len(spikes)}))
