/**
 * MENTOR JUDGMENT ENGINE - Main Entry Point
 *
 * Exports all mentor judgment subsystems:
 * - Intensity Atoms: Weighted factors for confidence judgment
 * - Decision Logger: Structured judgment capture
 * - Reason Renderer: Explanation formatting
 *
 * This is an ENGINE-LAYER module. It has no side-effects on import
 * and can be used headlessly (no UI required).
 *
 * INTEGRATION:
 * - Called from SuggestionService to explain suggestions
 * - Optional: UI can consume explanations for tooltips/panels
 * - Never influences suggestion scoring or selection
 */

// Intensity atoms: weighted factors for judgment
export {
  INTENSITY_ATOMS,
  INTENSITY_ATOM_LIST,
  INTENSITY_LEVELS,
  INTENSITY_LEVEL_LIST,
  getIntensityLevel,
  calculateIntensity,
  isValidAtom,
  filterValidFactors
} from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-intensity-atoms.js';

// Decision logging: structured capture of mentor reasoning
export {
  logDecision,
  logMultipleDecisions,
  validateRecord,
  serializeRecord,
  deserializeRecord
} from './mentor-decision-logger.js';

// Reason rendering: explanation formatting
export {
  formatReasoning,
  formatShort,
  formatVerbose,
  formatDebug,
  hasSignificantIntensity,
  getIntensityDescription
} from './mentor-reason-renderer.js';
