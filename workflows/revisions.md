# Revision workflow
1. Translate the request into timestamps → scene ids (`manifest.json`, storyboard).
2. Classify: lesson-specific | course-wide | global preference. If unclear, ask the client before generalising.
3. Change the smallest scope: scene props in the manifest; component code only if the issue is systemic (then re-check other lessons that use it — registry `usedIn`).
4. Re-render: unchanged sections come from cache. A new version file is written; old versions stay.
5. Run QA + quality-director on the changed region. Compare before/after frames.
6. Log in `production-memory/lesson-notes/<lesson>.md`: request (client's words), interpretation, change, versions.
If a full re-export is needed it's a technical re-encode of the cached sections, not a creative rebuild — say so.
