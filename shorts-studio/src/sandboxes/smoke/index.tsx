import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { BridgeShort, BRIDGE_FRAMES } from '../../engine/bridge/Bridge';

// Smoke sandbox: renders the proven bridge world (the reference-quality 3D stack) to prove that
// the painted-world + ink + DOF + bloom + tone-map + grade chain works on this machine.
const Root: React.FC = () => (
  <Composition id="Smoke" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} width={1080} height={1920} fps={30} />
);

registerRoot(Root);
