import React from "react";
import { Composition, registerRoot } from "remotion";
import { ToonShort } from "../../engine/toon";
import { SLICE } from "./scene";

// Phase 1 sandbox: renders the reference slice with the real toon engine.
const Slice: React.FC = () => <ToonShort scene={SLICE} shot="S1" />;

const Root: React.FC = () => (
  <Composition id="Slice" component={Slice} durationInFrames={90} width={1080} height={1920} fps={30} />
);

registerRoot(Root);
