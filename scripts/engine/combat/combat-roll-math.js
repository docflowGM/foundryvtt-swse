/**
 * Combat Roll Math — Canonical Attack/Damage Resolver
 *
 * ARCHITECTURE: Single source of truth for combat bonus math.
 *
 * Both the actual roll path (attacks.js) and the breakdown/tooltip path
 * (weapons-engine.js → weapon-tooltip.js) delegate to resolveAttackBonus()
 * and resolveDamageBonus() here. This guarantees that sheets, tooltips, and
 * debug breakdowns never under- or over-report compared with the formulas
 * used in actual attack and damage rolls.
 *
 * Import graph:  attacks.js ──┐
 *                              ├──► combat-roll-math.js
 *               weapons-engine.js ┘
 *
 * Do NOT import attacks.js or weapons-engine.js from this module.
 */

import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { isNpcStatblockMode } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";
import {
  getDamageAbilityContribution,
  getHalfLevelDamageBonus,
  getRangePenalty,
  getWeaponAttackAbility,
  getWeaponFlatAttackBonus,
  getWeaponFlatDamageBonus,
  isVehicleWeapon
} from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function actorHasTalentNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names])
    .map(name => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean));
  if (!wanted.size) return false;
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'talent') return false;
      const key = String(item.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return wanted.has(key);
    });
  } catch (_err) {
    return false;
  }
}

function actorHasFeatNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names])
    .map(name => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean));
  if (!wanted.size) return false;
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'feat') return false;
      const key = String(item.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return wanted.has(key);
    });
  } catch (_err) {
    return false;
  }
}

function currentCombatEncounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
}

function inquisitionAttackBonus(actor, context = {}) {
  if (!actorHasTalentNamed(actor, 'Inquisition')) return 0;
  const target = getTargetActorFromOptions(context);
  if (!target || !actorHasFeatNamed(target, 'Force Sensitivity')) return 0;
  return 1;
}

function unsettlingPresenceAttackPenalty(actor) {
  const state = actor?.getFlag?.('swse', 'forceAdept.unsettlingPresence') ?? null;
  if (!state || state.encounterId !== currentCombatEncounterId()) return 0;
  return Number(state.attackPenalty ?? -2) || -2;
}

function actorIsProficientForAttack(actor, weapon) {
  const explicit = weapon?.system?.proficient;
  if (explicit !== false) return true;
  return actorHasTalentNamed(actor, 'Spacehound') && isVehicleWeapon(weapon);
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function normalizeRollKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
}

function buildEffectIntentRollContext(weapon, options = {}, extra = {}) {
  const system = weapon?.system ?? {};
  const weaponGroup = options.weaponGroup
    ?? system.weaponGroup ?? system.group ?? system.proficiencyGroup ?? system.category ?? '';
  const weaponCategory = options.weaponCategory ?? options.attackType
    ?? system.weaponCategory ?? system.category ?? system.type
    ?? system.meleeOrRanged ?? system.weaponRangeType ?? '';
  const damageType = options.damageType ?? system.damageType ?? system.damage?.type ?? '';
  const damageTypes = [
    ...asArray(options.damageTypes),
    ...asArray(system.damageTypes),
    ...asArray(damageType)
  ].map(normalizeRollKey).filter(Boolean);
  return {
    ...(options || {}),
    ...(extra || {}),
    item: weapon,
    itemId: weapon?.id ?? weapon?._id ?? options.itemId ?? options.weaponId ?? '',
    weapon,
    weaponId: weapon?.id ?? weapon?._id ?? options.weaponId ?? '',
    weaponGroup,
    group: weaponGroup,
    weaponCategory,
    category: weaponCategory,
    attackType: weaponCategory,
    damageType,
    damageTypes,
    customTags: Array.isArray(options.customTags) ? options.customTags : []
  };
}

function getBasicEffectIntentBonus(actor, target, weapon, options = {}, extra = {}) {
  try {
    return ModifierEngine.getEffectIntentModifierTotalForContext(
      actor, target, buildEffectIntentRollContext(weapon, options, extra), { includeBroad: true }
    );
  } catch (err) {
    console.warn(`[SWSE] Failed to apply Basic effect intents for ${target}`, err);
    return 0;
  }
}

function actorHpValueForSithEffects(actor) {
  return Number(
    actor?.system?.hp?.value ??
    actor?.system?.hitPoints?.value ??
    actor?.system?.attributes?.hp?.value ?? 1
  ) || 0;
}

function sourceActorStillThreatening(sourceActorId) {
  if (!sourceActorId) return true;
  const source = game?.actors?.get?.(sourceActorId) ?? null;
  if (!source) return true;
  return actorHpValueForSithEffects(source) > 0;
}

function activeSithCommanderEffect(actor, key) {
  const state = actor?.getFlag?.('swse', `sithCommander.${key}`) ?? null;
  if (!state || state.encounterId !== currentCombatEncounterId()) return null;
  if (key === 'focusTerror') {
    const round = Number(game?.combat?.round ?? 0) || 0;
    const expires = Number(state.expiresAfterRound ?? 0) || 0;
    if (expires > 0 && round > expires) return null;
  }
  if (key === 'inciteRage' && !sourceActorStillThreatening(state.sourceActorId)) return null;
  return state;
}

function sithCommanderAttackModifier(actor) {
  let total = 0;
  const focus = activeSithCommanderEffect(actor, 'focusTerror');
  if (focus) total += Number(focus.attackPenalty ?? -2) || -2;
  const rage = activeSithCommanderEffect(actor, 'inciteRage');
  if (rage) total += Number(rage.attackBonus ?? 1) || 1;
  return total;
}

function rapidAlchemyDamageBonusInternal(actor, weapon) {
  const state = rapidAlchemyState(actor);
  if (!state?.sacrificePending) return 0;
  return weaponMatchesId(weapon, state.weaponId) ? Number(state.damageBonus ?? 5) || 5 : 0;
}

function forceItemState(weapon) {
  return weapon?.getFlag?.('swse', 'forceItem') ?? weapon?.flags?.swse?.forceItem ?? null;
}

function forceItemAttackBonus(actor, weapon) {
  const state = forceItemState(weapon);
  if (String(state?.attuned?.actorId ?? '') !== String(actor?.id ?? '')) return 0;
  return Number(state.attuned.attackBonus ?? 1) || 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported helpers (re-used by attacks.js)
// ─────────────────────────────────────────────────────────────────────────────

export function getTargetActorFromOptions(options = {}) {
  return options.target ?? game.user?.targets?.first?.()?.actor ?? null;
}

export function weaponMatchesId(weapon, id) {
  if (!weapon || !id) return false;
  return String(weapon.id ?? weapon._id ?? '') === String(id);
}

export function rapidAlchemyState(actor) {
  const state = actor?.getFlag?.('swse', 'rapidAlchemy') ?? null;
  if (!state || state.encounterId !== currentCombatEncounterId()) return null;
  return state;
}

export function rapidAlchemyAttackBonus(actor, weapon) {
  const state = rapidAlchemyState(actor);
  if (!state?.active || state?.sacrificed === true) return 0;
  return weaponMatchesId(weapon, state.weaponId) ? Number(state.attackBonus ?? 2) || 2 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical resolvers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the complete attack bonus for a weapon from all SWSE factors.
 *
 * This is the single source of truth used by both actual attack rolls
 * (attacks.js) and the debug/tooltip breakdown (weapons-engine.js).
 *
 * Roll-invocation-only modifiers (fightingDefensively, customModifier,
 * situationalBonus, sequencePenalty) are NOT included here — they are
 * added explicitly in attacks.js after this function returns.
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {string|null} actionId - TalentActionLinker action key, if any
 * @param {Object} context - Roll/sheet context (rangeBand, target, etc.)
 * @returns {{ total: number, components: Object, flags: Object }}
 */
export function resolveAttackBonus(actor, weapon, actionId = null, context = {}) {
  // NPC statblock: honour stored flat bonus unchanged
  if (actor?.type === 'npc' && isNpcStatblockMode(actor)) {
    const npc = weapon?.flags?.swse?.npc;
    if (npc?.useFlat === true && Number.isFinite(npc.flatAttackBonus)) {
      const flat = Number(npc.flatAttackBonus) || 0;
      return { total: flat, components: { 'NPC Flat': flat }, flags: { npcFlat: true } };
    }
  }

  const bab = SchemaAdapters.getBAB(actor);
  const attackOptionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);

  // RAW: BAB + ability mod. BAB already carries level-based attack progression.
  // Weapon Finesse / Mighty Throw ability substitutions live in the option resolver.
  const abilityKey = getWeaponAttackAbility(actor, weapon);
  const abilityMod = SchemaAdapters.getAbilityMod(actor, abilityKey) + Number(attackOptionModifiers.attackAbilityBonus || 0);

  const miscBonus = getWeaponFlatAttackBonus(weapon);
  const rangePenalty = getRangePenalty(weapon, context);
  const rageModifiers = RageEngine.collectAttackModifiers(actor, weapon, context);

  // Condition Track penalty — authoritative derived source
  const ctPenalty = actor.system?.derived?.damage?.conditionPenalty ??
                    actor.system?.conditionTrack?.penalty ?? 0;

  // Active-effect attack penalty (computed by DerivedCalculator)
  const attackPenalty = actor.system?.attackPenalty ?? 0;

  const proficient = actorIsProficientForAttack(actor, weapon);
  const proficiencyPenalty = proficient ? 0 : -5;

  let talentBonus = 0;
  const TalentActionLinker = window.SWSE?.TalentActionLinker;
  if (actionId && TalentActionLinker?.MAPPING) {
    const bonusInfo = TalentActionLinker.calculateBonusForAction(actor, actionId);
    talentBonus = bonusInfo?.value ?? 0;
  }

  let stateBonus = 0;
  try {
    if (actor?.items) {
      const enrichedContext = { weapon, ...context };
      for (const item of actor.items) {
        if (item.system?.executionModel !== 'PASSIVE' || item.system?.subType !== 'STATE') continue;
        const meta = item.system?.abilityMeta;
        if (!meta?.modifiers || !Array.isArray(meta.modifiers)) continue;
        for (const modifier of meta.modifiers) {
          const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
          const appliesToAttack = targets.some(t => t === 'attack' || t === 'attack.bonus');
          if (!appliesToAttack) continue;
          const predicatesMatch = evaluateStatePredicates(actor, modifier.predicates || [], enrichedContext);
          // Fail-closed: only allow explicitly opted-in legacy state attack bonuses
          if (modifier.allowLegacyStateAttackBonus !== true) continue;
          if (predicatesMatch && modifier.value) stateBonus += modifier.value;
        }
      }
    }
  } catch (err) {
    console.error('[SWSE] Error evaluating PASSIVE/STATE in attack bonus:', err);
  }

  const basicEffectBonus = getBasicEffectIntentBonus(actor, 'global.attack', weapon, context, { rollType: 'attack' });
  const combatOptionBonus = attackOptionModifiers.attackBonus || 0;
  const rageBonus = rageModifiers.attackBonus || 0;
  const sithMod = sithCommanderAttackModifier(actor);
  const inquisitionMod = inquisitionAttackBonus(actor, context);
  const unsettlingMod = unsettlingPresenceAttackPenalty(actor);
  const rapidAlchemyMod = rapidAlchemyAttackBonus(actor, weapon);
  const forceItemMod = forceItemAttackBonus(actor, weapon);

  const total =
    bab + abilityMod + miscBonus + rangePenalty + attackPenalty + ctPenalty +
    proficiencyPenalty + talentBonus + stateBonus + combatOptionBonus + rageBonus +
    sithMod + inquisitionMod + unsettlingMod + rapidAlchemyMod + forceItemMod + basicEffectBonus;

  const components = { 'BAB': bab };
  components[`Ability (${abilityKey.toUpperCase()})`] = abilityMod;
  if (miscBonus !== 0) components['Enhancement'] = miscBonus;
  if (rangePenalty !== 0) components['Range Penalty'] = rangePenalty;
  if (attackPenalty !== 0) components['Attack Penalty'] = attackPenalty;
  if (ctPenalty !== 0) components['CT Penalty'] = ctPenalty;
  if (proficiencyPenalty !== 0) components['Proficiency'] = proficiencyPenalty;
  if (talentBonus !== 0) components['Talent'] = talentBonus;
  if (stateBonus !== 0) components['State'] = stateBonus;
  if (combatOptionBonus !== 0) components['Combat Option'] = combatOptionBonus;
  if (rageBonus !== 0) components['Rage'] = rageBonus;
  if (sithMod !== 0) components['Sith Commander'] = sithMod;
  if (inquisitionMod !== 0) components['Inquisition'] = inquisitionMod;
  if (unsettlingMod !== 0) components['Unsettling Presence'] = unsettlingMod;
  if (rapidAlchemyMod !== 0) components['Rapid Alchemy'] = rapidAlchemyMod;
  if (forceItemMod !== 0) components['Force Item'] = forceItemMod;
  if (basicEffectBonus !== 0) components['Effect Intent'] = basicEffectBonus;

  return { total, components, flags: {} };
}

/**
 * Resolve the complete flat damage bonus for a weapon from all SWSE factors.
 *
 * This is the single source of truth used by both actual damage rolls
 * (attacks.js) and the debug/tooltip breakdown (weapons-engine.js).
 *
 * Die-formula modifiers (damageDieStepIncreases, damageExtraWeaponDice,
 * criticalDamageDieStepBonus) are NOT included here — they govern the
 * die expression itself and are handled in attacks.js at roll time.
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {Object} context - Roll/sheet context
 * @returns {{ total: number, components: Object, flags: Object }}
 */
export function resolveDamageBonus(actor, weapon, context = {}) {
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);

  // damageBaseOnly: only weapon's own flat bonus applies (plus any option bonus)
  if (optionModifiers?.flags?.damageBaseOnly === true) {
    const enhancement = getWeaponFlatDamageBonus(weapon);
    const optDmgBonus = optionModifiers.damageBonus || 0;
    const total = enhancement + optDmgBonus;
    const components = { 'Enhancement (Base Only)': enhancement };
    if (optDmgBonus !== 0) components['Combat Option'] = optDmgBonus;
    return { total, components, flags: { damageBaseOnly: true } };
  }

  const halfLvl = getHalfLevelDamageBonus(actor, weapon, { ...context, weapon, isWeaponDamage: true });
  const abilityMod = getDamageAbilityContribution(actor, weapon);
  const enhancement = getWeaponFlatDamageBonus(weapon);
  const rageMod = RageEngine.collectAttackModifiers(actor, weapon, context).damageBonus || 0;
  const rapidAlchemyMod = rapidAlchemyDamageBonusInternal(actor, weapon);
  const basicEffectBonus = getBasicEffectIntentBonus(actor, 'global.damage', weapon, context, { rollType: 'damage' });
  const combatOptionDamage = optionModifiers.damageBonus || 0;

  const total = halfLvl + enhancement + abilityMod + rageMod + rapidAlchemyMod + basicEffectBonus + combatOptionDamage;

  const components = {};
  if (halfLvl !== 0) components['½ Level'] = halfLvl;
  components['Ability'] = abilityMod;
  if (enhancement !== 0) components['Enhancement'] = enhancement;
  if (rageMod !== 0) components['Rage'] = rageMod;
  if (rapidAlchemyMod !== 0) components['Rapid Alchemy'] = rapidAlchemyMod;
  if (basicEffectBonus !== 0) components['Effect Intent'] = basicEffectBonus;
  if (combatOptionDamage !== 0) components['Combat Option'] = combatOptionDamage;

  return { total, components, flags: { damageBaseOnly: false } };
}
