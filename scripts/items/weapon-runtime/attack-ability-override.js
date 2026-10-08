// Phase 5D-B -- attack-ability provenance. A generated/projected system.attackAttribute is NOT player intent; a genuine
// player choice is recorded explicitly as flags.swse.attackAbilityOverride by the player-edit paths (item sheet, weapon
// config dialog) via attackAbilityOverrideFlagsFor(). Readers: combat-stat-rules.js#getWeaponAttackAbility.
export const ABILITY_KEYS = Object.freeze(['str', 'dex', 'con', 'int', 'wis', 'cha']);
// the projection (tools/lib/canonical-weapons-projection.mjs) and item-defaults only ever write these two
export const PROJECTED_ATTACK_ABILITIES = Object.freeze(new Set(['str', 'dex']));
export const ATTACK_ABILITY_OVERRIDE_FLAG = 'attackAbilityOverride';

export function readAttackAbilityOverride(weapon) {
  const v = String(weapon?.flags?.swse?.[ATTACK_ABILITY_OVERRIDE_FLAG] ?? '').toLowerCase();
  return ABILITY_KEYS.includes(v) ? v : null;
}

/** Flags patch to merge into a weapon update when the submitted attack ability is a CHANGE from the stored value; else null. */
export function attackAbilityOverrideFlagsFor(currentValue, submittedValue) {
  const submitted = String(submittedValue ?? '').toLowerCase();
  if (!ABILITY_KEYS.includes(submitted)) return null;
  if (submitted === String(currentValue ?? '').toLowerCase()) return null;
  return { swse: { [ATTACK_ABILITY_OVERRIDE_FLAG]: submitted } };
}
