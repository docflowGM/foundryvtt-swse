import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

// === CANONICAL HP MUTATION HELPER ===
export async function applyHPMutation(actor, patch) {
  if (!actor || !patch) return;

  const current = foundry.utils.getProperty(actor, "system.hp.value") ?? 0;
  const max = foundry.utils.getProperty(actor, "system.hp.max") ?? 0;
  const temp = foundry.utils.getProperty(actor, "system.hp.temp") ?? 0;

  let newValue = current;
  let newMax = max;
  let newTemp = temp;

  if ("system.hp.value" in patch) {
    newValue = Math.clamped(patch["system.hp.value"], 0, newMax);
  }

  if ("system.hp.max" in patch) {
    throw new Error('applyHPMutation() cannot write system.hp.max directly. Update builder inputs and use ActorEngine.recomputeHP().');
  }

  if ("system.hp.temp" in patch) {
    newTemp = Math.max(0, patch["system.hp.temp"]);
  }

  return ActorEngine.updateActor(actor, {
    "system.hp.value": newValue,
    "system.hp.temp": newTemp
  }, { source: 'hp-utils.applyHPMutation' });
}