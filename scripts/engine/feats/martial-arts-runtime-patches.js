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

function martialArtsProfile(actor) {
  const owned = new Set();
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    const text = `${normalizeKey(item.name)} ${normalizeKey(item.system?.slug)}`;
    if (text.includes('martial-arts-iii') || text.includes('martial-arts-3')) owned.add(3);
    else if (text.includes('martial-arts-ii') || text.includes('martial-arts-2')) owned.add(2);
    else if (text.includes('martial-arts-i') || text.includes('martial-arts-1')) owned.add(1);
  }
  return {
    level: Math.max(0, ...owned),
    count: owned.size
  };
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseMartialArtsRuntimePatched === true) return;
  const original = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof original !== 'function') return;

  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, context = {}) {
    const result = original(actor, weapon, context) ?? {};
    try {
      const profile = martialArtsProfile(actor);
      if (profile.count > 0) {
        result.flags ??= {};
        result.breakdown ??= [];
        result.flags.martialArtsLevel = profile.level;
        result.flags.martialArtsDodgeBonus = profile.count;
        result.defenseModifiers ??= [];
        result.defenseModifiers.push({
          target: 'defense.reflex',
          type: 'dodge',
          value: profile.count,
          source: 'Martial Arts',
          duration: 'passive',
          stacking: 'dodge'
        });
        result.breakdown.push({ label: `Martial Arts Reflex Defense (+${profile.count} dodge)`, value: profile.count, type: 'defense' });
      }
    } catch (err) {
      SWSELogger.warn('[MartialArtsRuntime] Failed to apply martial arts reflex metadata', { error: err });
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
