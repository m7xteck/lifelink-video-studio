import React from "react";
import { Composition } from "remotion";
import { Lesson, calculateLessonMetadata, type LessonProps } from "./compositions/Lesson";
import demo from "../courses/_engine-tests/test-001/manifest.json";
import type { Manifest } from "./schema/manifest";

/**
 * Two compositions share one engine. Any lesson manifest can be passed as
 * input props: `--props='{"manifest": ...}'` (the pipeline does this for you).
 */
export const RemotionRoot: React.FC = () => {
  const defaults: LessonProps = { manifest: demo as unknown as Manifest };
  return (
    <>
      <Composition id="Lesson" component={Lesson} calculateMetadata={calculateLessonMetadata}
        defaultProps={defaults} fps={30} width={1920} height={1080} durationInFrames={300} />
      <Composition id="LessonPortrait" component={Lesson} calculateMetadata={calculateLessonMetadata}
        defaultProps={{ ...defaults, orientation: "portrait" }} fps={30} width={1080} height={1920} durationInFrames={300} />
    </>
  );
};
