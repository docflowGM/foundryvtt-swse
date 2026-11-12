/**
 * Derived-calculation lifecycle, read through the EXISTING derived-generation authority
 * (actors/derived/derived-generation.js). `system.derived` is prepared asynchronously after every actor update, so
 * "the calculation has not finished" is a normal transient state, never a character error.
 *
 *   current     : the destination was stamped with the signature of the CURRENT source state
 *   pending     : a signature is computable but the destination does not (yet) carry it
 *   unavailable : the actor exposes no computable signature (cannot establish completion)
 *
 * Read-only. No timers: completion is observed through the applied-signature stamp (and the `swseDerivedApplied` event).
 */
import { DerivedCalculator } from '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js';
import { getDerivedAppliedSignature, getDerivedGeneration } from '/systems/foundryvtt-swse/scripts/actors/derived/derived-generation.js';

export function derivedLifecycle(actor) {
  let expected = null;
  try { expected = DerivedCalculator.getActorComputeSignature(actor) ?? null; } catch (_err) { expected = null; }
  const applied = getDerivedAppliedSignature(actor);
  const generation = getDerivedGeneration(actor);
  const state = !expected ? 'unavailable' : (applied === expected ? 'current' : 'pending');
  return { state, expected, applied, generation };
}

export const isDerivedCurrent = (actor) => derivedLifecycle(actor).state === 'current';

export default { derivedLifecycle, isDerivedCurrent };
