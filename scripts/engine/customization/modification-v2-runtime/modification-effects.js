/**
 * Modification V2 effects -- DERIVED from the verified catalog, never baked into the Item and never trusted from Item flags.
 *
 * An installed instance only names WHICH definition is installed (typedDefinitionId), its state and its basis. The effect operations come
 * from the verified, pinned runtime catalog, and only from definitions whose mechanics are EFFECTS_CERTIFIED. An instance contributes when:
 *   - state === 'installed' (a deactivated or failed upgrade contributes nothing), and
 *   - it is canonical (the definition is runtime-selectable -- none is yet), or it was installed under the GM development policy while the
 *     development setting is on.
 * Provisional GM-adjudicated installs never automate effects (Q-029). Removing, deactivating or turning the setting off restores the
 * original behavior with no write. With no verified catalog loaded, nothing applies (fail closed).
 */
import { getVerifiedModificationData } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-store.js';
import { DEVELOPMENT_BASIS, isDevelopmentModeEnabled } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-development-mode.js';
import { isArmorItemEquipped, isEnergyShieldItem } from '/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js';

const TARGETS = Object.freeze({
  SHOTS_PER_POWER_PACK: 'weapon.reload.shotsPerPowerPack',
  STUN_DT_EQUIPMENT_BONUS: 'armor.protection.stunDamageThresholdEquipmentBonus',
  DAMAGE_TYPE_REDUCTION: 'armor.protection.damageTypeReduction',
  CRITICAL_DAMAGE_ADDITION: 'weapon.critical.critical_damage_addition',
  REROLL_NATURAL_ATTACK_1: 'weapon.capabilities.rerollNaturalAttack1',
});

/** Certified operations of the active instances on an Item, optionally for one target. */
export function activeEffectOperations(item, target = null, { data = getVerifiedModificationData(), developmentMode = isDevelopmentModeEnabled() } = {}) {
  const list = item?.flags?.['foundryvtt-swse']?.customization?.installedUpgrades;
  if (!Array.isArray(list) || !data?.ok) return [];
  const ops = [];
  for (const inst of list) {
    if (!inst || inst.state !== 'installed' || typeof inst.typedDefinitionId !== 'string') continue;
    const found = data.catalog.getTyped(inst.typedDefinitionId);
    if (!found || found.domain !== item.type || found.parent?.provenance?.mechanicalCertification !== 'EFFECTS_CERTIFIED') continue;
    const canonical = found.typed.runtimeSelectable === true && inst.provisional !== true;
    const development = inst.basis === DEVELOPMENT_BASIS && developmentMode === true;
    if (!canonical && !development) continue;
    for (const op of found.typed.effects?.operations ?? []) if (op && (!target || op.target === target)) ops.push({ ...op, instanceId: inst.instanceId, typedDefinitionId: inst.typedDefinitionId });
  }
  return ops;
}

/** Effective tracked shot capacity: the base pool multiplied by certified "shots per power pack" multipliers. */
export function effectiveShotCapacity(item, base, options = {}) {
  const n = Number(base);
  if (!Number.isFinite(n) || n <= 0) return Number.isFinite(n) ? n : 0;
  let factor = 1;
  for (const op of activeEffectOperations(item, TARGETS.SHOTS_PER_POWER_PACK, options)) {
    if (op.operation === 'multiply' && Number.isFinite(op.value) && op.value > 0) factor *= op.value;
  }
  return Math.floor(n * factor);
}

/**
 * Equipment bonus to the wearer's damage threshold against stun damage from the WORN armor's certified operations (Mesh Underlay).
 * Only equipped armor counts (an energy shield is not worn armor). Equipment bonuses do not stack with each other: the highest applies.
 * @returns {{value:number, source:string|null}}
 */
export function wornArmorStunThresholdBonus(actor, options = {}) {
  let value = 0; let source = null;
  for (const item of Array.from(actor?.items ?? [])) {
    if (item?.type !== 'armor' || !isArmorItemEquipped(item) || isEnergyShieldItem(item)) continue;
    for (const op of activeEffectOperations(item, TARGETS.STUN_DT_EQUIPMENT_BONUS, options)) {
      if (op.operation !== 'add' || op.bonusType !== 'equipment' || !Number.isFinite(op.value) || op.value <= value) continue;
      value = op.value; source = item.name ?? null;
    }
  }
  return { value, source };
}

/**
 * Damage reduction the WORN armor grants against one named damage type (Armor Reinforcement: DR 2 against piercing), from certified
 * "grant" operations. Highest per type. DamageReductionResolver matches these against the subtype the attack actually dealt and lets them
 * compete with every other applicable DR, highest only (D-016; Core Rulebook p.158).
 * @returns {Array<{damageType:string, amount:number, source:string|null}>}
 */
export function wornArmorDamageTypeReductions(actor, options = {}) {
  const best = new Map();
  for (const item of Array.from(actor?.items ?? [])) {
    if (item?.type !== 'armor' || !isArmorItemEquipped(item) || isEnergyShieldItem(item)) continue;
    for (const op of activeEffectOperations(item, TARGETS.DAMAGE_TYPE_REDUCTION, options)) {
      const type = typeof op.value?.damageType === 'string' ? op.value.damageType.toLowerCase() : null;
      const amount = Number(op.value?.dr);
      if (op.operation !== 'grant' || !type || !Number.isFinite(amount) || amount <= 0) continue;
      if (amount > (best.get(type)?.amount ?? 0)) best.set(type, { damageType: type, amount, source: item.name ?? null });
    }
  }
  return [...best.values()];
}

/**
 * Dice a certified weapon modification adds AFTER the critical multiplier (Durasteel Bonding, KotOR p.75: one die of the current weapon
 * damage die). "Current weapon damage die" is read from the formula actually rolled for this attack (die-size steps applied); when that
 * formula has no die or mixes die sizes there is no single current die, so nothing is added and the reason is returned.
 * @returns {{terms:string[], unresolved:Array<{instanceId:string, reason:string}>}}
 */
export function criticalPostMultiplierDice(weapon, rolledFormula, options = {}) {
  const terms = []; const unresolved = [];
  for (const op of activeEffectOperations(weapon, TARGETS.CRITICAL_DAMAGE_ADDITION, options)) {
    const count = Number(op.value?.diceCount);
    if (op.operation !== 'critical-post-multiplier-addition' || op.value?.dieType !== 'current_weapon_damage_die' || !Number.isInteger(count) || count <= 0) continue;
    const sizes = [...new Set([...String(rolledFormula ?? '').matchAll(/\d*d(\d+)/gi)].map((m) => Number(m[1])))];
    if (sizes.length === 1) terms.push(`${count}d${sizes[0]}`);
    else unresolved.push({ instanceId: op.instanceId, reason: sizes.length ? 'mixed weapon damage dice' : 'no weapon damage die' });
  }
  return { terms, unresolved };
}

/**
 * Attack rerolls a certified weapon modification grants for this attack roll (Enhanced Energy Projector, KotOR p.75: once per encounter,
 * reroll an attack whose die shows a natural 1 and keep the second result). Shaped as MetaResourceFeatResolver attack-reroll rules; the
 * once-per-encounter limit is spent through EncounterUseTracker when the reroll is made. Returns [] unless the die shows a natural 1.
 */
export function modificationAttackRerollRules(weapon, naturalD20, options = {}) {
  if (Number(naturalD20) !== 1 || !weapon) return [];
  const data = options.data ?? getVerifiedModificationData();
  const rules = [];
  for (const op of activeEffectOperations(weapon, TARGETS.REROLL_NATURAL_ATTACK_1, options)) {
    if (op.operation !== 'action-grant' || op.value?.trigger !== 'attack_die_natural_1' || op.value?.mustKeep !== 'second_roll' || Number(op.value?.oncePerEncounter) !== 1) continue;
    const name = data?.catalog?.getTyped?.(op.typedDefinitionId)?.parent?.name ?? 'Weapon modification';
    rules.push({
      id: `mod-${op.instanceId}`, sourceId: weapon.id ?? '', sourceName: name, label: name, cost: 'none', outcome: 'keepSecond',
      description: `${name}: reroll an attack roll whose die shows a natural 1; the second result must be kept. Once per encounter.`,
      rule: { type: 'ATTACK_REROLL', trigger: 'natural1', oncePer: 'encounter', source: 'modification-v2' },
    });
  }
  return rules;
}

export { TARGETS as EFFECT_TARGETS };
export default { activeEffectOperations, effectiveShotCapacity, wornArmorStunThresholdBonus, wornArmorDamageTypeReductions, criticalPostMultiplierDice, modificationAttackRerollRules, EFFECT_TARGETS: TARGETS };
