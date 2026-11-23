import ds from "../../brand/design-system.json";
import { loadFont } from "@remotion/fonts";
import { Easing, staticFile } from "remotion";

/**
 * Fonts are LOCAL files declared in brand/design-system.json (fontFiles).
 * Renders never depend on a font CDN, and approved brand fonts slot in
 * by dropping files into public/fonts/<set>/ and updating the design system.
 */
for (const f of ds.fontFiles) {
  loadFont({ family: f.family, url: staticFile(f.file), weight: f.weight, style: f.style as "normal" | "italic" });
}

export const brand = ds;
export const colors = ds.colors;
export const type = ds.typography;
export const fonts = {
  display: `"${ds.typography.display.family}", Georgia, serif`,
  text: `"${ds.typography.text.family}", system-ui, sans-serif`,
};
export const isApprovedBrand = ds.status === "APPROVED";

const bez = (c: number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);
export const ease = {
  enter: bez(ds.motion.easing.enter),
  exit: bez(ds.motion.easing.exit),
  settle: bez(ds.motion.easing.settle),
};
export const motion = ds.motion;
export const layout = ds.layout;
