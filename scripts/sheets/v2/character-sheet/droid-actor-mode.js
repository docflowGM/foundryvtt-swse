/**
 * Deprecated compatibility shim.
 *
 * Droid and NPC actor-sheet mode helpers now live in actor-sheet-mode.js so all
 * character-like actors share one mode adapter and one actor shell path.
 */

export {
  applyActorSheetModeClasses,
  buildActorSheetModeContext,
  isDroidActor,
  isNpcActor
} from './actor-sheet-mode.js';
