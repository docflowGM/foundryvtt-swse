// Test helper: represents an actor whose authoritative derived calculation has been APPLIED for its current state, by
// stamping the existing derived-generation marker (system.derived.meta.appliedSignature) with the real source signature.
// Re-call after mutating an actor to represent a completed derived pass for the new state.
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
const { stampDerivedGeneration } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-generation.js');
export function settleDerived(actor) {
  stampDerivedGeneration(actor, actor.system, DerivedCalculator.getActorComputeSignature(actor));
  return actor;
}
export { DerivedCalculator };
