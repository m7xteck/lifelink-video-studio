import ds from "../../brand/design-system.json";
import { loadFont } from "@remotion/fonts";
import { Easing, staticFile } from "remotion";

/**
 * Fonts are LOCAL files declared in brand/design-system.json (fontFiles).
 * Renders never depend on a font CDN, and approved brand fonts slot in
 * by dropping files into public/fonts/<set>/ and updating the design system.
 */
for (const f of ds.fontFiles as { family: string; file: string; weight: string; style: string; ascentOverride?: string; descentOverride?: string; lineGapOverride?: string }[]) {
  loadFont({ family: f.family, url: staticFile(f.file), weight: f.weight, style: f.style, ascentOverride: f.ascentOverride, descentOverride: f.descentOverride, lineGapOverride: f.lineGapOverride });
}

export const brand = ds;
export const colors = ds.colors;
export const type = ds.typography;
/**
 * Font roles. `script` is the brand's display script (accents only); `display` is the
 * headline face (the text family in the LifeLink proposal); `text` is body/labels.
 */
export const fonts = {
  script: `"${ds.typography.display.family}", cursive`,
  display: `"${ds.typography.text.family}", system-ui, sans-serif`,
  text: `"${ds.typography.text.family}", system-ui, sans-serif`,
};
export const isApprovedBrand = ds.status === "APPROVED";
/** Shown on every render until the client approves the brand. Cannot be switched off by a manifest. */
// Brand locked ⇒ review renders say only "Preview for approval"; a final master (render.ts --final, lesson APPROVED) passes final:true and has none.
export const brandWatermark = isApprovedBrand ? "Preview for approval" : ds.status === "PROPOSAL" ? "Concept for approval · provisional brand" : "Engine test · neutral style · not LifeLink brand";
export const palette = (ds as { palette?: Record<string, string> }).palette ?? {};
export const texture = (ds as { texture?: { paperGrainOpacity: number; embossDepthPx: number } }).texture ?? { paperGrainOpacity: 0.06, embossDepthPx: 2 };
export const textStyle = {
  wordSpacing: (ds.typography as { wordSpacing?: { text: string } }).wordSpacing?.text ?? "normal",
};

const bez = (c: number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);
export const ease = {
  enter: bez(ds.motion.easing.enter),
  exit: bez(ds.motion.easing.exit),
  settle: bez(ds.motion.easing.settle),
};
export const motion = ds.motion;
export const layout = ds.layout;
