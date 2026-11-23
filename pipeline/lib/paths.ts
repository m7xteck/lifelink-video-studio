import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../..");
export const P = {
  root: ROOT,
  inbox: join(ROOT, "media/inbox"),
  originals: join(ROOT, "media/originals"),
  working: join(ROOT, "media/working"),
  publicAudio: join(ROOT, "public/audio"),
  courses: join(ROOT, "courses"),
  renders: join(ROOT, "renders"),
  previews: join(ROOT, "previews"),
  qa: join(ROOT, "quality-reports"),
  locks: join(ROOT, ".locks"),
  cache: join(ROOT, ".cache"),
  designSystem: join(ROOT, "brand/design-system.json"),
};
export const lessonDir = (courseId: string, lessonId: string) => join(P.courses, courseId, lessonId);
export const renderDir = (lessonId: string) => join(P.renders, lessonId);
