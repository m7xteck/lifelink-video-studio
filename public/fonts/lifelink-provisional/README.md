# Provisional LifeLink fonts (NOT approved, licence unconfirmed)

| File | Source | Status |
|---|---|---|
| `AustralianMirages-Bold.ttf` | Client upload 2026-11-23. Fikryal Studio, "Fikryal Studio License" | Loads in renderer. **Commercial video licence needs confirming** |
| `Geneva-22Soft.ttf` | Client upload 2026-11-23. Metadata "22 Soft 1992", family "Geneva" (not Apple's Geneva) | **Original, untouched.** Rejected by Chromium's font sanitiser (legacy 1992 tables) |
| `Geneva-22Soft.rebuilt.ttf` | Technical rebuild of the above with fontTools (tables recompiled; legacy device tables dropped) | Used for rendering. Verified identical glyph outlines, character map and advance widths. **Licence unknown; confirm a rebuild is permitted** |

Font files are excluded from Git until licences are confirmed (see `.gitignore`).
SHA-256 of originals: Australian Mirages `e352b651…2a83`, Geneva `75b11449…a9a4`.
