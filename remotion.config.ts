import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";
import { BROWSER } from "./pipeline/lib/browser";

// Master format: 1080p H.264, yuv420p for universal playback.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
if (BROWSER && existsSync(BROWSER)) Config.setBrowserExecutable(BROWSER);
