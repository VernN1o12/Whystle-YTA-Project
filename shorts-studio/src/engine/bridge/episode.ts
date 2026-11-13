// ============================================================
// Generic bridge episode definition
// ============================================================
import React from 'react';
import { Composition } from 'remotion';
import type { Format } from '../../studio.config';

export interface BridgeEpisodeDef {
  id: string;
  format: Format;
  totalFrames: number;
  shotCount: number;
  component: React.FC;
}

/** Register a bridge-style episode for use in Root.tsx */
export const defineBridgeEpisode = (def: BridgeEpisodeDef): BridgeEpisodeDef => def;
