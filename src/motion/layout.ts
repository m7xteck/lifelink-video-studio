import { useVideoConfig } from "remotion";
import { layout, type } from "../brand/tokens";

/** Orientation-aware layout so every component works in 16:9 and 9:16. */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const short = Math.min(width, height);
  const u = short / 1080; // type scale unit
  const safeX = Math.round(width * layout.safeAreaPct.x);
  const safeY = Math.round(height * layout.safeAreaPct.y);
  const size = (k: keyof typeof type.scale) => Math.max(type.minReadablePx, Math.round(type.scale[k] * u));
  return { width, height, portrait, u, safeX, safeY, innerW: width - safeX * 2, innerH: height - safeY * 2, size };
};
