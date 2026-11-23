# Environment capability report: 2026-11-23

Session type: **Claude Code on the web** (cloud container, Linux, 4 CPU cores, 15 GB RAM, ~58 GB free disk).
Every item marked "verified" was tested in this session.

## Verified working
| Capability | Evidence |
|---|---|
| Executable dev environment | Node v22.23.5, npm 10.9.9, Git 2.43, Python 3.13 |
| Remotion 4.0.546 install + render | 40 s 1080p lesson rendered in ~72 s (≈ 1.8× real time). A 60-min lesson would take an estimated ~1.8 h per full render; revisions re-render only changed sections |
| Browser renderer | Pre-installed Chromium headless shell (Remotion's own download host is blocked; not needed) |
| FFmpeg / FFprobe 6.1.1 | libx264, AAC; used for chunk joining, audio mux, QA analysis |
| Speech transcription | faster-whisper 1.2.1 (`small.en`), word timestamps, transcript word-perfect on a test clip, SRT generated |
| Audio analysis | EBU R128 loudness, sync cross-correlation (0 ms offset measured), pause detection |
| Inspect & export MP4 | ffprobe checks, frame extraction, contact sheets; I can view frames as images |
| Subagents | Claude Code subagents available (definitions in `.claude/agents/`) |
| Background jobs | Supported within a session |
| Portrait 9:16 recomposition | 1080×1920 render passed QA |
| Section cache & targeted revision | Changing one scene re-rendered only its section (35 s vs 72 s) |

## Available but not yet tested
- Separate parallel cloud sessions (each with its own container) for genuine parallel rendering. This needs a shared GitHub repository first.
- Larger Whisper models (`medium.en`, `large-v3`) for higher accuracy on real recordings.
- Transcription speed on long recordings (short tests: ~3–4 s per clip, including model load).

## Unavailable / blocked
| Item | Status | Fix |
|---|---|---|
| **Persistent storage** | No GitHub repository is connected and the GitHub token in this container is invalid. The container is temporary, so work is lost when the session is reclaimed unless it is pushed somewhere | Client creates a **private** GitHub repo and connects GitHub to Claude (see below) |
| Google Fonts / font CDNs from the renderer | The headless browser rejects the network proxy's certificate | Solved: fonts are stored locally (also better for reproducibility) |
| Remotion's Chrome download host | Blocked | Solved: pre-installed Chromium is used |
| Paid AI image/video/music generators, stock libraries | Not available, not assumed | Not needed; visuals are code-generated |
| Monitoring after the session ends | Nothing runs between sessions | Re-open a session; state recovers from files |

## Network changes made (approved by client via prompt)
Added to the environment's allowed hosts: `huggingface.co`, `cas-bridge.xethub.hf.co`, `us.aws.cdn.hf.co` (Whisper model download only).

## Limits to keep in mind
- Upload size per chat attachment is limited. Very long recordings may need compressing (e.g. MP3/M4A at 128 kbps is fine for speech) or splitting.
- Rendering is CPU-only. One heavy job (render or transcription) at a time per container.
- Raw media and renders must not go into normal Git (size, privacy). See STORAGE.md.
