import { FeatGrantEntitlementResolver } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js";
import { ForcePointFeatRules } from "/systems/foundryvtt-swse/scripts/engine/feats/force-point-feat-rules.js";

let registered = false;

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function getRegisteredSetting(moduleId, key, fallback = null) {
  try { return globalThis.game?.settings?.get?.(moduleId, key) ?? fallback; } catch (_err) { return fallback; }
}

function getForceTrainingAbilityKey() {
  const configured = getRegisteredSetting(globalThis.game?.system?.id || 'foundryvtt-swse', 'forceTrainingAttribute')
    ?? getRegisteredSetting('foundryvtt-swse', 'forceTrainingAttribute')
    ?? getRegisteredSetting('swse', 'forceTrainingAttribute')
    ?? 'wisdom';
  const key = String(configured || '').toLowerCase();
  if (key === 'cha' || key === 'charisma') return 'cha';
  return 'wis';
}

function getDraftAttributes(actor, shell = null) {
  const shellDraftAttributes = shell?.progressionSession?.draftSelections?.attributes
    ?? shell?.draftSelections?.attributes
    ?? shell?.committedSelections?.get?.('attributes')
    ?? null;
  const globalDraftAttributes = globalThis.game?.__swseActiveProgressionShell?.actor?.id === actor?.id
    ? globalThis.game.__swseActiveProgressionShell.progressionSession?.draftSelections?.attributes
    : null;
  return shellDraftAttributes || globalDraftAttributes || null;
}

function getAbilityData(actor, key) {
  const system = actor?.system || {};
  const aliases = key === 'cha' ? ['cha', 'charisma'] : ['wis', 'wisdom'];
  return aliases.map(alias => system.abilities?.[alias] || system.attributes?.[alias] || system.stats?.[alias]).find(Boolean) || {};
}

function getAbilityScore(actor, key, shell = null) {
  const draft = getDraftAttributes(actor, shell);
  const draftScore = draft?.finalValues?.[key]
    ?? draft?.values?.[key]
    ?? (Number.isFinite(Number(draft?.baseValues?.[key])) && Number.isFinite(Number(draft?.speciesMods?.[key]))
      ? Number(draft.baseValues[key]) + Number(draft.speciesMods[key])
      : null);
  if (Number.isFinite(Number(draftScore))) return Number(draftScore);

  const ability = getAbilityData(actor, key);
  const explicitScore = ability.score ?? ability.total ?? ability.value;
  if (Number.isFinite(Number(explicitScore))) return Number(explicitScore);

  const parts = ['base', 'racial', 'species', 'enhancement', 'misc', 'miscMod', 'temp'];
  let total = 0;
  let seen = false;
  for (const part of parts) {
    const number = Number(ability?.[part]);
    if (!Number.isFinite(number)) continue;
    total += number;
    seen = true;
  }
  return seen ? total : null;
}

function getAbilityModifier(actor, key, shell = null) {
  const score = getAbilityScore(actor, key, shell);
  if (Number.isFinite(Number(score))) return Math.floor((Number(score) - 10) / 2);

  const draft = getDraftAttributes(actor, shell);
  const draftMod = draft?.modifiers?.[key];
  if (Number.isFinite(Number(draftMod))) return Number(draftMod);

  const ability = getAbilityData(actor, key);
  const explicitModifier = ability.mod ?? ability.modifier;
  if (Number.isFinite(Number(explicitModifier))) return Number(explicitModifier);

  return 0;
}

function getPendingFeatEntries(shell) {
  const raw = [
    ...asArray(shell?.progressionSession?.draftSelections?.feats),
    ...asArray(shell?.draftSelections?.feats),
    ...asArray(shell?.draftSelections?.get?.('feats')),
    ...asArray(shell?.committedSelections?.get?.('feats')),
    ...asArray(shell?.buildIntent?.getSelection?.('feats'))
  ];
  return raw.map(entry => typeof entry === 'string' ? { name: entry } : entry).filter(Boolean);
}

function hasJediHeritage(actor, shell = null) {
  const owned = Array.from(actor?.items ?? []).some(item => item?.type === 'feat' && item?.system?.disabled !== true && normalizeName(item?.name) === 'jedi heritage');
  if (owned) return true;
  return getPendingFeatEntries(shell).some(entry => normalizeName(entry?.name ?? entry?.label ?? entry?.id ?? '') === 'jedi heritage');
}

function getJediHeritageAbilityScoreBonus(actor, shell = null) {
  if (!hasJediHeritage(actor, shell)) return 0;
  return Math.max(4, Number(ForcePointFeatRules.getForceTrainingAbilityScoreBonus(actor) ?? 0) || 0);
}

function getForceTrainingSlotsWithJediHeritage(actor, shell = null, original = null) {
  const abilityBonus = getJediHeritageAbilityScoreBonus(actor, shell);
  if (!abilityBonus) return Math.max(1, Number(original?.(actor, shell)) || 1);

  const key = getForceTrainingAbilityKey();
  const score = getAbilityScore(actor, key, shell);
  let adjustedModifier;
  if (Number.isFinite(Number(score))) {
    adjustedModifier = Math.floor(((Number(score) + abilityBonus) - 10) / 2);
  } else {
    adjustedModifier = getAbilityModifier(actor, key, shell) + Math.floor(abilityBonus / 2);
  }
  return Math.max(1, 1 + adjustedModifier);
}

export function registerForceTrainingEntitlementRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalGetForceTrainingSlotsPerInstance = FeatGrantEntitlementResolver.getForceTrainingSlotsPerInstance?.bind(FeatGrantEntitlementResolver);
  if (typeof originalGetForceTrainingSlotsPerInstance === 'function') {
    FeatGrantEntitlementResolver.getForceTrainingSlotsPerInstance = function swseForceTrainingSlotsWithJediHeritage(actor, shell = null) {
      return getForceTrainingSlotsWithJediHeritage(actor, shell, originalGetForceTrainingSlotsPerInstance);
    };
  }

  const originalResolveForFeat = FeatGrantEntitlementResolver.resolveForFeat?.bind(FeatGrantEntitlementResolver);
  if (typeof originalResolveForFeat === 'function') {
    FeatGrantEntitlementResolver.resolveForFeat = function swseResolveForceTrainingJediHeritage(actor, featEntry, index = 0, options = {}) {
      const entries = originalResolveForFeat(actor, featEntry, index, options);
      const abilityBonus = getJediHeritageAbilityScoreBonus(actor, options.shell || null);
      if (!abilityBonus) return entries;
      const key = getForceTrainingAbilityKey();
      for (const entry of entries) {
        if (entry?.grantType !== 'forcePowerSlots') continue;
        entry.jediHeritageAbilityScoreBonus = abilityBonus;
        entry.jediHeritageAbility = key;
        entry.countFormula = `max(1, 1 + ${key.toUpperCase()} modifier after Jedi Heritage +${abilityBonus} ability-score bonus)`;
        entry.notes = [...(Array.isArray(entry.notes) ? entry.notes : []), `Jedi Heritage: treat ${key.toUpperCase()} as ${abilityBonus} higher for Force Training power count only.`];
      }
      return entries;
    };
  }

  globalThis.SWSE ??= {};
  globalThis.SWSE.ForceTrainingEntitlementRuntime = { patched: true };
}

export default registerForceTrainingEntitlementRuntimePatches;
