import { colorSounds, colorSoundsBoard, TOTAL as CS_TOTAL } from './color-sounds';
import { Invisible1600, Invisible1600Board, TOTAL as INVISIBLE_1600_TOTAL } from './invisible-1600';
import { MarsColonySurvival, MarsColonySurvivalBoard, TOTAL as MARS_COLONY_SURVIVAL_TOTAL } from './mars-colony-survival';

// The live catalogue. The old 2D bridge episodes are archived in legacy/; the painted toon engine
// only registers episodes that have a data-only timeline + shots pair.
export const colorSoundsEpisode = {
  id: 'colorSounds',
  format: 'shorts' as const,
  total: CS_TOTAL,
  shotCount: 12,
  Main: colorSounds,
  Board: colorSoundsBoard,
};

export const MarsColonySurvivalEpisode = {
  id: 'MarsColonySurvival',
  format: 'shorts' as const,
  total: MARS_COLONY_SURVIVAL_TOTAL,
  shotCount: 31,
  Main: MarsColonySurvival,
  Board: MarsColonySurvivalBoard,
};

export const Invisible1600Episode = {
  id: 'Invisible1600',
  format: 'shorts' as const,
  total: INVISIBLE_1600_TOTAL,
  shotCount: 12,
  Main: Invisible1600,
  Board: Invisible1600Board,
};

export const EPISODES = [colorSoundsEpisode, Invisible1600Episode, MarsColonySurvivalEpisode];
