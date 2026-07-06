import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function normalizeKey(value) {
  return String(value ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); } catch (_err) { return []; }
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function flattenChoiceValues(value, results = []) {
  if (!value) return results;
  if (Array.isArray(value)) {
    for (const entry of value) flattenChoiceValues(entry, results);
    return results;
  }
  if (typeof value === 'string') {
    results.push(value);
    return results;
  }
  if (typeof value === 'object') {
    for (const key of ['value', 'id', 'group', 'weapon', 'weaponGroup', 'label', 'name', 'choice', 'selected']) {
      if (value[key]) flattenChoiceValues(value[key], results);
    }
    if (Array.isArray(value.targets)) flattenChoiceValues(value.targets, results);
  }
  return results;
}

function weaponText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [weapon?.name, system.weaponType, system.weaponGroup, system.group, system.category, system.type, system.subtype, system.itemType, system.sourceType, Array.isArray(system.traits) ? system.traits.join(' ') : system.traits, Array.isArray(system.properties) ? system.properties.join(' ') : system.properties];
  return fields.map(normalizeKey).filter(Boolean).join(' ');
}

function weaponMatchesChoice(weapon, choice) {
  const wanted = normalizeKey(choice);
  if (!wanted) return false;
  const text = weaponText(weapon);
  if (text.includes(wanted)) return true;
  if (wanted.includes('pistol') && text.includes('pistol')) return true;
  if (wanted.includes('rifle') && text.includes('rifle')) return true;
  if (wanted.includes('lightsaber') && text.includes('lightsaber')) return true;
  if ((wanted.includes('advanced-melee') || wanted.includes('advancedmelee')) && text.includes('advanced-melee')) return true;
  if ((wanted.includes('simple') && wanted.includes('melee')) && text.includes('simple') && text.includes('melee')) return true;
  if ((wanted.includes('simple') && wanted.includes('ranged')) && text.includes('simple') && text.includes('ranged')) return true;
  if (wanted.includes('unarmed') && text.includes('unarmed')) return true;
  return false;
}

function featChoiceMatchesWeapon(item, weapon) {
  const values = [];
  flattenChoiceValues(item?.system?.selectedChoice, values);
  flattenChoiceValues(item?.system?.selectedChoices, values);
  flattenChoiceValues(item?.system?.choiceMeta?.selectedChoice, values);
  return values.map(String).some(choice => weaponMatchesChoice(weapon, choice));
}

function targetIdFromContext(context = {}) {
  return String(context.targetId ?? context.target?.id ?? context.target?.uuid ?? context.targetActor?.id ?? context.workflowContext?.targetId ?? '').replace(/^Actor\./, '');
}

function activeRelentlessState(actor, context = {}) {
  const states = [
    context.relentlessAttack,
    context.workflowContext?.relentlessAttack,
    actor?.getFlag?.('swse', 'relentlessAttack'),
    actor?.getFlag?.('foundryvtt-swse', 'relentlessAttack'),
    actor?.system?.combatState?.relentlessAttack
  ].filter(Boolean);
  const targetId = targetIdFromContext(context);
  for (const state of states) {
    if (!state || state.consumed === true) continue;
    const stateTargetId = String(state.targetId ?? state.targetActorId ?? state.missedTargetId ?? '').replace(/^Actor\./, '');
    if (stateTargetId && targetId && stateTargetId !== targetId) continue;
    if (state.expires === 'expired') continue;
    return state;
  }
  return null;
}

function actorHasMatchingRelentlessAttack(actor, weapon) {
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    if (normalizeKey(item.name) !== 'relentless-attack') continue;
    if (featChoiceMatchesWeapon(item, weapon)) return true;
  }
  return false;
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseRelentlessAttackPatched === true) return;
  const original = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof original !== 'function') return;

  CombatOptionResolver.collectAttackModifiers = function patchedRelentlessAttackCollect(actor, weapon, options = {}) {
    const result = original(actor, weapon, options) ?? {};
    try {
      const state = activeRelentlessState(actor, options);
      if (!state) return result;
      if (!actorHasMatchingRelentlessAttack(actor, weapon)) return result;
      const value = Number(state.attackBonus ?? state.bonus ?? 2) || 2;
      result.attackBonus = (result.attackBonus || 0) + value;
      result.flags ??= {};
      result.flags.relentlessAttackBonus = true;
      result.flags.relentlessAttackBonusType = 'competence';
      result.breakdown ??= [];
      result.breakdown.push({ label: 'Relentless Attack (competence)', value, type: 'attack' });
      return result;
    } catch (err) {
      SWSELogger.warn('[RelentlessAttackRuntime] Failed to apply follow-up bonus', { error: err });
      return result;
    }
  };

  CombatOptionResolver.__swseRelentlessAttackPatched = true;
}

export function registerRelentlessAttackRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  SWSELogger.log('[RelentlessAttackRuntime] Runtime patches registered');
}

export default registerRelentlessAttackRuntimePatches;
