/**
 * Modification V2 effects -- DERIVED, never baked into the Item.
 *
 * Consumers (AmmoSystem today) ask for the effective value of a property; it is computed from the base value and the certified effect
 * operations recorded on installed instances. Removing or deactivating an instance therefore restores the original behavior with no write.
 *
 * Only CANONICAL instances contribute: `provisional !== true`, `state === 'installed'`, and effect operations whose definition was
 * EFFECTS_CERTIFIED when installed (copied onto the instance by the install service). A provisional GM-adjudicated install never
 * automates an effect (owner policy Q-029); a deactivated upgrade contributes nothing (its effect status is GM adjudication, Q-023).
 * No canonical install exists yet: the first one needs its definition to become runtime-selectable (see the convergence PR).
 */
const TARGETS = Object.freeze({ SHOTS_PER_POWER_PACK: 'weapon.reload.shotsPerPowerPack' });

/** Certified operations of the active canonical instances on an Item, optionally for one target. */
export function activeEffectOperations(item, target = null) {
  const list = item?.flags?.['foundryvtt-swse']?.customization?.installedUpgrades;
  if (!Array.isArray(list)) return [];
  const ops = [];
  for (const inst of list) {
    if (!inst || inst.provisional === true || inst.state !== 'installed' || inst.effects?.certified !== true || !Array.isArray(inst.effects.operations)) continue;
    for (const op of inst.effects.operations) if (op && (!target || op.target === target)) ops.push({ ...op, instanceId: inst.instanceId });
  }
  return ops;
}

/** Effective tracked shot capacity: the base pool multiplied by certified "shots per power pack" multipliers. */
export function effectiveShotCapacity(item, base) {
  const n = Number(base);
  if (!Number.isFinite(n) || n <= 0) return Number.isFinite(n) ? n : 0;
  let factor = 1;
  for (const op of activeEffectOperations(item, TARGETS.SHOTS_PER_POWER_PACK)) {
    if (op.operation === 'multiply' && Number.isFinite(op.value) && op.value > 0) factor *= op.value;
  }
  return Math.floor(n * factor);
}

export { TARGETS as EFFECT_TARGETS };
export default { activeEffectOperations, effectiveShotCapacity, EFFECT_TARGETS: TARGETS };
