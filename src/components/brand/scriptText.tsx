/**
 * Word gaps for the LifeLink Script face inside SVG <text>.
 *
 * The script font's space glyph is almost zero-width. The earlier fix split words into adjacent <tspan dx=…> runs with no
 * space between them; Chrome shapes the whole string as one run, so the script's joining glyphs (e.g. "l"+"r") form one
 * cluster and the dx gap lands one letter late ("financialr ealities"). Keeping a real space and widening it with
 * `word-spacing` gives the gap to the space glyph itself, so it always falls exactly between the words.
 */
export const SCRIPT_GAP_EM = 0.22;

/** Props to spread on an SVG <text> set in the script face: the real text plus a word gap of `SCRIPT_GAP_EM` × size. */
export const scriptGap = (size: number): { style: { wordSpacing: string } } => ({ style: { wordSpacing: `${(size * SCRIPT_GAP_EM).toFixed(1)}px` } });
