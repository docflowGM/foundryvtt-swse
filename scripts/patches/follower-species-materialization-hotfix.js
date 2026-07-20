import { FollowerCreator } from '/systems/foundryvtt-swse/scripts/apps/follower-creator.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { buildPendingSpeciesContext } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js';
import { applyCanonicalSpeciesToActor } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-species-to-actor.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { DerivedCalculator } from '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js';
import { SWSE_RACES } from '/systems/foundryvtt-swse/scripts/core/races.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.followerSpeciesMaterialization.v2');
const REGISTRY_PATCHED = Symbol.for('swse.followerSpeciesMaterialization.registry.v2');
const CREATOR_PATCHED = Symbol.for('swse.followerSpeciesMaterialization.creator.v2');
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

function normalizeAbilityMods(raw = {}) {
  return Object.fromEntries(ABILITY_KEYS.map(key => [key, finite(raw?.[key], 0)]));
}

function patchSpeciesRegistryCanonicalStats() {
  if (SpeciesRegistry[REGISTRY_PATCHED] || typeof SpeciesRegistry._normalizeEntry !== 'function') return;
  const originalNormalize = SpeciesRegistry._normalizeEntry.bind(SpeciesRegistry);

  SpeciesRegistry._normalizeEntry = function normalizeEntryWithCanonicalStats(doc) {
    // Always normalize the real Foundry document first. Creating a pseudo-document
    // with the DataModel prototype breaks Foundry v13 DocumentStatsField shimming
    // because the pseudo-document has no valid _source/flags state.
    const entry = originalNormalize(doc);
    const system = doc?.system || {};
    const canonical = system.canonicalStats && typeof system.canonicalStats === 'object'
      ? system.canonicalStats
      : null;
    if (!canonical) return entry;

    const canonicalMods = normalizeAbilityMods(canonical.abilityMods || canonical.abilityScores || {});
    const hasCanonicalMods = Object.values(canonicalMods).some(value => value !== 0);
    const canonicalMovement = canonical.movement && typeof canonical.movement === 'object'
      ? clonePlain(canonical.movement)
      : null;

    return {
      ...entry,
      abilityScores: hasCanonicalMods ? canonicalMods : entry.abilityScores,
      abilityMods: hasCanonicalMods ? { ...canonicalMods } : entry.abilityMods,
      size: entry.size || canonical.size || null,
      speed: Number.isFinite(Number(entry.speed)) ? Number(entry.speed) : finite(canonical.speed ?? canonicalMovement?.walk, 6),
      movement: entry.movement && Object.keys(entry.movement).length ? entry.movement : (canonicalMovement || entry.movement),
      languages: Array.isArray(entry.languages) && entry.languages.length
        ? entry.languages
        : (Array.isArray(canonical.languages) ? [...canonical.languages] : []),
      abilities: Array.isArray(entry.abilities) && entry.abilities.length
        ? entry.abilities
        : (Array.isArray(canonical.special) ? [...canonical.special] : []),
      canonicalTraits: Array.isArray(entry.canonicalTraits) && entry.canonicalTraits.length
        ? entry.canonicalTraits
        : (Array.isArray(canonical.traits) ? clonePlain(canonical.traits) : []),
      variants: Array.isArray(entry.variants) && entry.variants.length
        ? entry.variants
        : (Array.isArray(canonical.variants) ? clonePlain(canonical.variants) : []),
    };
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
  const normalized = normalizeAbilityMods(mods);
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
    // Followers receive species traits, natural weapons, and activated species
    // abilities, but never species bonus feats. Canonical materialization only
    // creates weapons/combat-actions here; this guard keeps that contract explicit.
    if (item?.type === 'feat') return false;
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

  const level = Math.max(1, finite(mutation.targetHeroicLevel ?? mutation.followerState?.level ?? follower.system?.level, 1));
  const newMax = Math.max(1, 10 + level);
  const oldMax = Math.max(1, finite(follower.system?.hp?.max, newMax));
  const oldValue = Math.max(0, finite(follower.system?.hp?.value, oldMax));
  updateData['system.hp.max'] = newMax;
  updateData['system.hp.value'] = Math.max(0, Math.min(newMax, newMax - Math.max(0, oldMax - oldValue)));

  const damageReduction = extractDamageReduction(context);
  if (damageReduction > 0) updateData['system.damageReduction'] = Math.max(finite(follower.system?.damageReduction, 0), damageReduction);

  // Followers have no Force Points, Destiny Points, Destinies, or species bonus
  // feat entitlement, even though they still receive the species' actual traits.
  updateData['flags.swse.speciesFeatsRequired'] = 0;
  updateData['system.forcePoints.value'] = 0;
  updateData['system.forcePoints.max'] = 0;
  updateData['system.destinyPoints.value'] = 0;
  updateData['system.destinyPoints.max'] = 0;

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
    hp: newMax,
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
