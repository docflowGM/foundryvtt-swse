import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function normalizeKey(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function martialArtsLevel(actor) {
  let level = 0;
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    const text = `${normalizeKey(item.name)} ${normalizeKey(item.system?.slug)}`;
    if (text.includes('martial-arts-iii') || text.includes('martial-arts-3')) level = Math.max(level, 3);
    else if (text.includes('martial-arts-ii') || text.includes('martial-arts-2')) level = Math.max(level, 2);
    else if (text.includes('martial-arts-i') || text.includes('martial-arts-1')) level = Math.max(level, 1);
  }
  return level;
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseMartialArtsRuntimePatched === true) return;
  const original = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof original !== 'function') return;

  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, context = {}) {
    const result = original(actor, weapon, context) ?? {};
    try {
      const level = martialArtsLevel(actor);
      if (level > 0) {
        result.flags ??= {};
        result.breakdown ??= [];
        result.flags.martialArtsLevel = level;
        result.flags.unarmedDoesNotProvokeAoO = true;
        result.defenseModifiers ??= [];
        result.defenseModifiers.push({
          target: 'defense.reflex',
          type: 'dodge',
          value: level,
          source: `Martial Arts ${['I', 'II', 'III'][level - 1]}`,
          duration: 'passive'
        });
        result.breakdown.push({ label: `Martial Arts ${['I', 'II', 'III'][level - 1]} Reflex Defense`, value: level, type: 'defense' });
      }
    } catch (err) {
      SWSELogger.warn('[MartialArtsRuntime] Failed to apply martial arts modifiers', { error: err });
    }
    return result;
  };

  CombatOptionResolver.__swseMartialArtsRuntimePatched = true;
}

export function registerMartialArtsRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  SWSELogger.log('[MartialArtsRuntime] Runtime patches registered');
}

export default registerMartialArtsRuntimePatches;
