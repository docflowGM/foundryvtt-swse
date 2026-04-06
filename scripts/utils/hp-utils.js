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
    newMax = Math.max(1, patch["system.hp.max"]);
    newValue = Math.min(newValue, newMax);
  }

  if ("system.hp.temp" in patch) {
    newTemp = Math.max(0, patch["system.hp.temp"]);
  }

  return actor.update({
    "system.hp.value": newValue,
    "system.hp.max": newMax,
    "system.hp.temp": newTemp
  });
}