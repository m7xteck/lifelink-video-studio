# The 12 production responsibilities — and how each is really implemented

Honest mapping. "Subagent" = a genuine Claude Code subagent definition in `.claude/agents/`
that runs as a separate model instance with its own context. "Module" = deterministic software.
"Director" = the main Claude session you talk to.

| # | Role | Subagent definition (.claude/agents/) |
|---|---|---|
| 1 | Executive Production Director | main session (CLAUDE.md) |
| 2 | Brand & Values Director | brand-guardian.md |
| 3 | Audio Intelligence Director | audio-intelligence.md |
| 4 | Course Narrative Director | course-narrative.md |
| 5 | Creative & Storyboard Director | creative-director.md |
| 6 | Motion Design Director | motion-designer.md |
| 7 | Engagement Director | engagement-director.md |
| 8 | Audio & Sound Director | sound-director.md |
| 9 | Production Orchestrator | production-orchestrator.md |
| 10 | Independent Quality Director (+ Proofreader) | quality-director.md, proofreader.md |
| 11 | Revision Director | revision-director.md |
| 12 | Asset & Production Memory Director | memory-keeper.md |

Run together as the "lifelink-production" workflow (one stage per phase, visible live). Definitions load as named subagents in sessions opened on this repository; in this session they run as general-purpose agents given the same role file.
