import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { DarkSideScoreAccessPolicy } from "/systems/foundryvtt-swse/scripts/engine/darkside/dark-side-score-access-policy.js";

/**
 * Dark Side Score panel view-model — extracted from PanelContextBuilder so
 * the segment-building/authorization logic is a single, lightweight,
 * dependency-thin production function that both the sheet builder and
 * tests exercise directly, rather than a test-only mirror of it.
 */

/**
 * Generate a DSP segment color from a gradient: dark green (0) to dark red (max).
 * @param {number} index - Segment index (0-based)
 * @param {number} maxDSP - Maximum DSP value
 * @returns {string} HSL color string
 */
export function getDSPColor(index, maxDSP) {
  const ratio = maxDSP > 0 ? index / maxDSP : 0;
  const hue = 120 - (120 * ratio);
  const saturation = 80;
  const lightness = 45 - (ratio * 20);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Build the 0..max inclusive segment array for the Dark Side Score track.
 * @param {number} value - Current DSP value
 * @param {number} max - Maximum DSP value
 * @param {(index: number, max: number) => string} [colorResolver]
 * @returns {{index: number, filled: boolean, current: boolean, color: string}[]}
 */
export function buildDarkSideSegments(value, max, colorResolver = getDSPColor) {
  const segments = [];
  for (let i = 0; i <= max; i++) {
    segments.push({
      index: i,
      filled: i <= value,
      current: i === value,
      color: colorResolver(i, max)
    });
  }
  return segments;
}

/**
 * Build the full darkSidePanel contract object: value, max, segments,
 * danger, canEdit, readOnlyReason.
 *
 * @param {Actor} actor
 * @param {object} [options]
 * @param {boolean} [options.sheetEditable=true]
 * @param {object} [options.user] - defaults to game.user
 * @returns {object} darkSidePanel contract
 */
export function buildDarkSidePanelContext(actor, { sheetEditable = true, user = game?.user } = {}) {
  const value = DSPEngine.getValue(actor);
  const max = DSPEngine.getMax(actor);
  const accessOptions = { user, sheetEditable };

  return {
    value,
    max,
    segments: buildDarkSideSegments(value, max),
    danger: value >= max - 2,
    canEdit: DarkSideScoreAccessPolicy.canEdit(actor, accessOptions),
    readOnlyReason: DarkSideScoreAccessPolicy.getReadOnlyReason(actor, accessOptions)
  };
}
