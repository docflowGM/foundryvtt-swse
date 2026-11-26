// Leaf readers for the owned fire state (no engine imports): shared by FireStateStore and the equipment-state reader
// so the two do not form a static import cycle. FireStateStore re-exports both names unchanged.
import { shapeOfWeapon } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-consumer.js";

export const readFireState = (weapon) => weapon?.flags?.swse?.fireState ?? weapon?.getFlag?.('swse', 'fireState') ?? null;

/** The owned configuration selection that decides the weapon's SHAPE (and so its required hands); nothing else, so it cannot recurse into readiness. */
export function ownedConfigurationSelection(weapon) {
  const state = readFireState(weapon);
  if (!state || typeof state.configurationId !== 'string') return {};
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return {}; }
  return shape.source === 'canonical' && shape.configuration?.ids?.includes(state.configurationId) ? { configurationId: state.configurationId } : {};
}
