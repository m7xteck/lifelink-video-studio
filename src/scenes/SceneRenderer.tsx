import React from "react";
import type { Scene } from "../schema/manifest";
import { SectionTitle } from "../components/SectionTitle";
import { KineticStatement } from "../components/KineticStatement";
import { QuietReflection } from "../components/QuietReflection";
import { StepsDiagram } from "../components/StepsDiagram";
import { ConnectionMetaphor } from "../components/ConnectionMetaphor";
import { Comparison } from "../components/Comparison";
import { Takeaway } from "../components/Takeaway";

/** Maps a manifest scene "type" to its motion-library component. */
export const SceneRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case "sectionTitle": return <SectionTitle scene={scene} />;
    case "kineticStatement": return <KineticStatement scene={scene} />;
    case "quietReflection": return <QuietReflection scene={scene} />;
    case "stepsDiagram": return <StepsDiagram scene={scene} />;
    case "connectionMetaphor": return <ConnectionMetaphor scene={scene} />;
    case "comparison": return <Comparison scene={scene} />;
    case "takeaway": return <Takeaway scene={scene} />;
  }
};
