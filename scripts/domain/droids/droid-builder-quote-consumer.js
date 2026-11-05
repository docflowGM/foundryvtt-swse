/**
 * Shared source-quote decision for draft PC and follower droids.
 *
 * BOTH the interactive builder and its preview call this service. It derives
 * dependent inputs from the selected chassis instead of copying arithmetic
 * into a UI or a state mutator.
 *
 * A numeric quote is NOT a publication/host/ownership permission. Those
 * remain separate migration gates.
 */
import { DROID_SYSTEMS } from '../../data/droid-systems.js';
import { resolveDroidBuilderQuote } from './droid-component-quote-authority.js';

const blocked = reason => ({
  status: 'BLOCKED', credits: null, kg: null, blockingReason: reason
});

export function quoteDroidBuilderSelection({
  definition, category, subcategory = null, size,
  droidSystems = null, speed = null, variant = null,
  appendageBaseCost = null, appendageBaseWeight = null,
  operationPhase = 'INITIAL_BUILD'
} = {}) {
  if (!definition || typeof definition !== 'object') {
    return blocked('No published component definition was selected');
  }
  const group = category === 'enhancement'
    ? (subcategory === 'appendageEnhancement' ? 'appendageEnhancement' : 'locomotionEnhancement')
    : category;
  const installed = droidSystems || {};
  let baseLocomotionCost = null;

  if (group === 'locomotionEnhancement') {
    const current = installed.locomotion;
    const baseDef = DROID_SYSTEMS.locomotion?.find(part => part.id === current?.id);
    if (!baseDef) return blocked('A source-known locomotion platform is required');
    const base = resolveDroidBuilderQuote({
      definition: baseDef, category: 'locomotion', size, speed: current.speed,
      operationPhase, locomotionSlotOrdinal: operationPhase === 'INITIAL_BUILD' ? 1 : null,
      restrictedLocomotion: operationPhase === 'INITIAL_BUILD' ? false : null
    });
    if (base.status !== 'OK') {
      return blocked('Base locomotion quote is unresolved');
    }
    baseLocomotionCost = base.credits;
  }

  const installedShields = (installed.accessories || [])
    .map(part => DROID_SYSTEMS.accessories?.shields?.find(def => def.id === part.id)?.sr ?? null)
    .filter(sr => Number.isInteger(sr));
  // A single installed shield rating is the only unambiguous SR base.
  const selectedInstalledShieldRating = installedShields.length === 1 ? installedShields[0] : null;
  const derivedSpeed = group === 'locomotionEnhancement'
    ? (installed.locomotion?.speed ?? null) : speed;

  return resolveDroidBuilderQuote({
    definition, category: group, subcategory, size,
    speed: derivedSpeed, variant,
    appendageBaseCost, appendageBaseWeight, baseLocomotionCost,
    selectedInstalledShieldRating,
    operationPhase,
    locomotionSlotOrdinal: group === 'locomotion' && operationPhase === 'INITIAL_BUILD' ? 1 : null,
    restrictedLocomotion: group === 'locomotion' && operationPhase === 'INITIAL_BUILD' ? false : null
  });
}
