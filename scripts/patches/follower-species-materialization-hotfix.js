import { FollowerCreator } from '/systems/foundryvtt-swse/scripts/apps/follower-creator.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { buildPendingSpeciesContext } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js';
import { applyCanonicalSpeciesToActor } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-species-to-actor.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { DerivedCalculator } from '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js';
import { SWSE_RACES } from '/systems/foundryvtt-swse/scripts/core/races.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.followerSpeciesMaterialization.v1');
const REGISTRY_PATCHED = Symbol.for('swse.followerSpeciesMaterialization.registry.v1');
const CREATOR_PATCHED = Symbol.for('swse.followerSpeciesMaterialization.creator.v1');
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function clonePlain(value) {
  try { return structuredClone(value); } catch (_err) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_jsonErr) { return value; }
  }
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function patchSpeciesRegistryCanonicalStats() {
  if (SpeciesRegistry[REGISTRY_PATCHED] || typeof SpeciesRegistry._normalizeEntry !== 'function') return;
  const originalNormalize = SpeciesRegistry._normalizeEntry.bind(SpeciesRegistry);

  SpeciesRegistry._normalizeEntry = function normalizeEntryWithCanonicalStats(doc) {
    const system = doc?.system || {};
    const canonical = system.canonicalStats && typeof system.canonicalStats === 'object'
      ? system.canonicalStats
      : null;
    if (!canonical) return originalNormalize(doc);

    const mergedSystem = {
      ...system,
      abilityMods: system.abilityMods ?? canonical.abilityMods,
      abilities: system.abilities ?? canonical.abilities,
      size: system.size ?? canonical.size,
      speed: system.speed ?? canonical.speed,
      movement: system.movement ?? canonical.movement,
      languages: Array.isArray(system.languages) && system.languages.length ? system.languages : canonical.languages,
      special: Array.isArray(system.special) && system.special.length ? system.special : canonical.special,
      canonicalTraits: Array.isArray(system.canonicalTraits) && system.canonicalTraits.length
        ? system.canonicalTraits
        : canonical.traits,
      variants: Array.isArray(system.variants) && system.variants.length ? system.variants : canonical.variants,
    };
    const proxy = Object.create(Object.getPrototypeOf(doc) || Object.prototype);
    Object.assign(proxy, doc, { system: mergedSystem });
    return originalNormalize(proxy);
  };

  Object.defineProperty(SpeciesRegistry, REGISTRY_PATCHED, { value: true });
}

function fallbackSpeciesMods(speciesName) {
  const target = normalizeName(speciesName);
  const entry = Object.values(SWSE_RACES).find(race => normalizeName(race?.label) === target);
  return { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ...(entry?.bonuses || {}) };
}

function contextSpeciesMods(context, speciesName) {
  const mods = context?.abilities || context?.ledger?.abilities || context?.identity?.doc?.abilityScores || {};
  const normalized = Object.fromEntries(ABILITY_KEYS.map(key => [key, finite(mods?.[key], 0)]));
  return Object.values(normalized).some(value => value !== 0) ? normalized : fallbackSpeciesMods(speciesName);
}

function templateBaseAbilities(mutation = {}) {
  const persistent = mutation.persistentChoices || {};
  const templateType = String(mutation.templateType || persistent.templateType || '').toLowerCase();
  const choice = String(persistent.abilityChoice || persistent.templateAbilityChoice || '').toLowerCase().slice(0, 3);
  const allowed = {
    aggressive: ['str', 'con'],
    defensive: ['dex', 'wis'],
    utility: ['int', 'cha'],
  }[templateType] || [];
  const selected = allowed.includes(choice) ? choice : allowed[0] || null;
  const result = {};
  for (const key of ABILITY_KEYS) {
    result[key] = {
      base: 10 + (selected === key ? 2 : 0),
      racial: 0,
      enhancement: 0,
      temp: 0,
    };
  }
  return result;
}

function resolvePendingContext(mutation = {}) {
  const persistent = mutation.persistentChoices || {};
  return mutation.pendingSpeciesContext
    || persistent.pendingSpeciesContext
    || persistent.speciesSelection?.pendingContext
    || persistent.species?.pendingContext
    || persistent.speciesData?.pendingContext
    || null;
}

function extractDamageReduction(context) {
  const entries = [
    ...(context?.traits || []),
    ...(context?.ledger?.traits || []),
    ...(context?.identity?.doc?.canonicalTraits || []),
  ];
  let best = 0;
  for (const trait of entries) {
    const name = String(trait?.name || '');
    const description = String(trait?.description || '');
    const text = `${name} ${description}`;
    const rules = Array.isArray(trait?.rules) ? trait.rules : [];
    for (const rule of rules) {
      const type = String(rule?.type || '').toLowerCase().replace(/[^a-z]/g, '');
      if (!['damagereduction', 'grantdamagereduction', 'dr'].includes(type)) continue;
      best = Math.max(best, finite(rule?.value ?? rule?.amount ?? rule?.dr, 0));
    }
    for (const pattern of [
      /damage\s+reduction\s*(?:\(dr\))?\s*([0-9]+)/i,
      /\bdr\s*([0-9]+)\b/i,
      /reduces?\s+(?:all\s+)?damage[^0-9]{0,30}([0-9]+)/i,
    ]) {
      const match = text.match(pattern);
      if (match) best = Math.max(best, finite(match[1], 0));
    }
  }
  return best;
}

async function applyMutationItems(actor, mutations = {}) {
  const deleteIds = Array.isArray(mutations.itemsToDelete) ? mutations.itemsToDelete.filter(Boolean) : [];
  if (deleteIds.length) {
    await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', deleteIds, {
      source: 'FollowerSpeciesMaterialization.deleteOldSpeciesItems',
    });
  }

  const existingKeys = new Set(Array.from(actor.items || []).map(item => {
    const abilityId = item.flags?.swse?.speciesAbilityId || item.flags?.swse?.sourceTrait || item.name;
    return `${item.type}:${abilityId}`;
  }));
  const items = (Array.isArray(mutations.itemsToCreate) ? mutations.itemsToCreate : []).filter(item => {
    const abilityId = item.flags?.swse?.speciesAbilityId || item.flags?.swse?.sourceTrait || item.name;
    const key = `${item.type}:${abilityId}`;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });
  if (items.length) {
    await ActorEngine.createEmbeddedDocuments(actor, 'Item', items, {
      source: 'FollowerSpeciesMaterialization.createSpeciesItems',
    });
  }
}

async function materializeFollowerSpecies(follower, mutation = {}) {
  if (!follower || follower.type !== 'npc') return;
  const persistent = mutation.persistentChoices || {};
  const fixedProfile = persistent.fixedFollowerProfile || mutation.fixedFollowerProfile || null;
  if (persistent.droidConfig?.isDroid || fixedProfile?.noSpeciesSelection === true) return;

  const speciesName = String(fixedProfile?.speciesName || mutation.speciesName || persistent.speciesName || persistent.species?.name || follower.system?.race || '').trim();
  if (!speciesName) return;

  let context = resolvePendingContext(mutation);
  if (!context?.identity?.name) {
    context = await buildPendingSpeciesContext(follower, speciesName, { source: 'follower' });
  }
  if (!context?.identity?.name) {
    swseLogger.warn('[FollowerSpeciesMaterialization] Could not build canonical species context', { follower: follower.name, speciesName });
    return;
  }

  // Followers start at 10 in every ability. The selected follower template adds
  // +2 to one legal ability; species adjustments remain racial modifiers.
  const cleanAbilities = templateBaseAbilities(mutation);
  const speciesMods = contextSpeciesMods(context, speciesName);
  context = clonePlain(context);
  context.abilities = speciesMods;
  if (context.ledger) context.ledger.abilities = { ...speciesMods };

  const materialization = await applyCanonicalSpeciesToActor(follower, context);
  if (!materialization?.success) {
    throw new Error(materialization?.error || `Unable to materialize ${speciesName}`);
  }

  const mutations = materialization.mutations || {};
  const updateData = {};
  for (const key of ABILITY_KEYS) {
    updateData[`system.attributes.${key}.base`] = cleanAbilities[key].base;
    updateData[`system.attributes.${key}.racial`] = speciesMods[key];
    updateData[`system.attributes.${key}.enhancement`] = finite(follower.system?.attributes?.[key]?.enhancement, 0);
    updateData[`system.attributes.${key}.temp`] = finite(follower.system?.attributes?.[key]?.temp, 0);
  }
  for (const [path, value] of Object.entries(mutations)) {
    if (path.startsWith('system.') || path.startsWith('flags.')) updateData[path] = value;
  }

  const conTotal = cleanAbilities.con.base + speciesMods.con
    + finite(updateData['system.attributes.con.enhancement'], 0)
    + finite(updateData['system.attributes.con.temp'], 0);
  const conMod = Math.floor((conTotal - 10) / 2);
  const level = Math.max(1, finite(mutation.targetHeroicLevel ?? mutation.followerState?.level ?? follower.system?.level, 1));
  const newMax = Math.max(1, 10 + level + conMod);
  const oldMax = Math.max(1, finite(follower.system?.hp?.max, newMax));
  const oldValue = Math.max(0, finite(follower.system?.hp?.value, oldMax));
  updateData['system.hp.max'] = newMax;
  updateData['system.hp.value'] = Math.max(0, Math.min(newMax, newMax - Math.max(0, oldMax - oldValue)));

  const damageReduction = extractDamageReduction(context);
  if (damageReduction > 0) updateData['system.damageReduction'] = Math.max(finite(follower.system?.damageReduction, 0), damageReduction);

  // Stored follower defense totals are only caches. DerivedCalculator owns totals.
  for (const key of ['fortitude', 'reflex', 'will']) updateData[`system.defenses.${key}.total`] = 0;

  await ActorEngine.updateActor(follower, updateData, {
    source: 'FollowerSpeciesMaterialization.applyCanonicalSpecies',
    isRecomputeHPCall: true,
  });
  await applyMutationItems(follower, mutations);
  DerivedCalculator.clearCaches?.(follower.id);

  swseLogger.log('[FollowerSpeciesMaterialization] Applied full species package', {
    follower: follower.name,
    species: speciesName,
    abilities: Object.fromEntries(ABILITY_KEYS.map(key => [key, cleanAbilities[key].base + speciesMods[key]])),
    damageReduction,
    speciesItemsCreated: mutations.itemsToCreate?.length || 0,
  });
}

function patchFollowerCreator() {
  if (FollowerCreator[CREATOR_PATCHED]) return;
  const originalCreate = FollowerCreator.createFollowerFromMutation.bind(FollowerCreator);
  const originalUpdate = FollowerCreator.updateFollowerFromMutation.bind(FollowerCreator);

  FollowerCreator.createFollowerFromMutation = async function patchedCreateFollowerFromMutation(owner, mutation) {
    const follower = await originalCreate(owner, mutation);
    if (follower) await materializeFollowerSpecies(follower, mutation);
    return follower;
  };

  FollowerCreator.updateFollowerFromMutation = async function patchedUpdateFollowerFromMutation(follower, mutation) {
    const success = await originalUpdate(follower, mutation);
    if (success) await materializeFollowerSpecies(follower, mutation);
    return success;
  };

  Object.defineProperty(FollowerCreator, CREATOR_PATCHED, { value: true });
}

export function registerFollowerSpeciesMaterializationHotfix() {
  if (globalThis[REGISTERED]) return;
  globalThis[REGISTERED] = true;
  patchSpeciesRegistryCanonicalStats();
  patchFollowerCreator();
}
