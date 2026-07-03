import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const SPECIES_ORIGIN_FEATS = new Map([
  ['unwavering focus', { group: 'focus', ruleType: 'SPECIES_FOCUS_METADATA' }],
  ['galactic alliance military training', { group: 'military_training', ruleType: 'SPECIES_MILITARY_TRAINING_METADATA' }],
  ['increased resistance', { group: 'resistance', ruleType: 'SPECIES_RESISTANCE_METADATA' }],
  ['primitive warrior', { group: 'combat_origin', ruleType: 'SPECIES_COMBAT_ORIGIN_METADATA' }],
  ['pitiless warrior', { group: 'combat_origin', ruleType: 'SPECIES_COMBAT_ORIGIN_METADATA' }],
  ['scion of dorin', { group: 'origin_heritage', ruleType: 'SPECIES_HERITAGE_METADATA' }],
  ['confident success', { group: 'reroll_or_success', ruleType: 'SPECIES_SUCCESS_METADATA' }],
  ['strong bellow', { group: 'species_attack', ruleType: 'SPECIES_ATTACK_METADATA' }],
  ['quick comeback', { group: 'recovery', ruleType: 'SPECIES_RECOVERY_METADATA' }],
  ['ample foraging', { group: 'survival', ruleType: 'SPECIES_SURVIVAL_METADATA' }],
  ['sharp senses', { group: 'senses', ruleType: 'SPECIES_SENSES_METADATA' }],
  ['republic military training', { group: 'military_training', ruleType: 'SPECIES_MILITARY_TRAINING_METADATA' }],
  ['wroshyr rage', { group: 'rage', ruleType: 'SPECIES_RAGE_METADATA' }],
  ['binary mind', { group: 'mental', ruleType: 'SPECIES_MENTAL_METADATA' }],
  ['justice seeker', { group: 'combat_origin', ruleType: 'SPECIES_COMBAT_ORIGIN_METADATA' }],
  ['veteran spacer', { group: 'spacefaring', ruleType: 'SPECIES_SPACEFARING_METADATA' }],
  ['keen scent', { group: 'senses', ruleType: 'SPECIES_SENSES_METADATA' }],
  ['separatist military training', { group: 'military_training', ruleType: 'SPECIES_MILITARY_TRAINING_METADATA' }],
  ['resurgent vitality', { group: 'recovery', ruleType: 'SPECIES_RECOVERY_METADATA' }],
  ['sith military training', { group: 'military_training', ruleType: 'SPECIES_MILITARY_TRAINING_METADATA' }],
  ['perfect intuition', { group: 'reroll_or_senses', ruleType: 'SPECIES_INTUITION_METADATA' }],
  ['nikto survival', { group: 'survival', ruleType: 'SPECIES_SURVIVAL_METADATA' }],
  ['mandalorian training', { group: 'military_training', ruleType: 'SPECIES_MILITARY_TRAINING_METADATA' }],
  ['perfect swimmer', { group: 'movement', ruleType: 'SPECIES_MOVEMENT_METADATA' }],
  ['imperial military training', { group: 'military_training', ruleType: 'SPECIES_MILITARY_TRAINING_METADATA' }],
  ['flawless pilot', { group: 'vehicle_skill', ruleType: 'SPECIES_SKILL_METADATA' }],
  ['survivor of ryloth', { group: 'survival', ruleType: 'SPECIES_SURVIVAL_METADATA' }],
  ['disarming charm', { group: 'social', ruleType: 'SPECIES_SOCIAL_METADATA' }],
  ['mind of reason', { group: 'mental', ruleType: 'SPECIES_MENTAL_METADATA' }],
  ['inborn resilience', { group: 'resistance', ruleType: 'SPECIES_RESISTANCE_METADATA' }],
  ['devastating bellow', { group: 'species_attack', ruleType: 'SPECIES_ATTACK_METADATA' }],
  ['warrior heritage', { group: 'combat_origin', ruleType: 'SPECIES_COMBAT_ORIGIN_METADATA' }],
  ['lasting influence', { group: 'social', ruleType: 'SPECIES_SOCIAL_METADATA' }],
  ['fringe benefits', { group: 'background', ruleType: 'SPECIES_BACKGROUND_METADATA' }],
  ['rebel military training', { group: 'military_training', ruleType: 'SPECIES_MILITARY_TRAINING_METADATA' }],
  ['mon calamari shipwright', { group: 'crafting', ruleType: 'SPECIES_CRAFTING_METADATA' }],
  ['regenerative healing', { group: 'recovery', ruleType: 'SPECIES_RECOVERY_METADATA' }],
  ['instinctive perception', { group: 'senses', ruleType: 'SPECIES_SENSES_METADATA' }],
  ['master tracker', { group: 'tracking', ruleType: 'SPECIES_TRACKING_METADATA' }],
  ['hunter\'s instincts', { group: 'tracking', ruleType: 'SPECIES_TRACKING_METADATA' }],
  ['jedi heritage', { group: 'force_origin', ruleType: 'SPECIES_FORCE_ORIGIN_METADATA' }],
  ['bothan will', { group: 'mental', ruleType: 'SPECIES_MENTAL_METADATA' }],
  ['fast swimmer', { group: 'movement', ruleType: 'SPECIES_MOVEMENT_METADATA' }],
  ['bowcaster marksman', { group: 'weapon_origin', ruleType: 'SPECIES_WEAPON_METADATA' }],
  ['spacer\'s surge', { group: 'spacefaring', ruleType: 'SPECIES_SPACEFARING_METADATA' }],
  ['wookiee grip', { group: 'weapon_origin', ruleType: 'SPECIES_WEAPON_METADATA' }],
  ['shrewd bargainer', { group: 'social', ruleType: 'SPECIES_SOCIAL_METADATA' }],
  ['deep sight', { group: 'senses', ruleType: 'SPECIES_SENSES_METADATA' }],
  ['thick skin', { group: 'resistance', ruleType: 'SPECIES_RESISTANCE_METADATA' }],
  ['darkness dweller', { group: 'environment', ruleType: 'SPECIES_ENVIRONMENT_METADATA' }],
  ['imperceptible liar', { group: 'social', ruleType: 'SPECIES_SOCIAL_METADATA' }],
  ['clawed subspecies', { group: 'natural_weapon', ruleType: 'SPECIES_NATURAL_WEAPON_METADATA' }],
  ['read the winds', { group: 'senses', ruleType: 'SPECIES_SENSES_METADATA' }],
  ['sure climber', { group: 'movement', ruleType: 'SPECIES_MOVEMENT_METADATA' }],
  ['gungan weapon master', { group: 'weapon_origin', ruleType: 'SPECIES_WEAPON_METADATA' }],
  ['nature specialist', { group: 'survival', ruleType: 'SPECIES_SURVIVAL_METADATA' }],
  ['forest stalker', { group: 'environment', ruleType: 'SPECIES_ENVIRONMENT_METADATA' }]
]);

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getSpeciesOriginRules(item) {
  return asArray(item?.system?.abilityMeta?.speciesOriginRules);
}

function hasSpeciesOriginRule(item, source) {
  const wanted = normalizeName(source);
  return getSpeciesOriginRules(item).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
}

function ruleForFeat(name) {
  const normalized = normalizeName(name);
  const meta = SPECIES_ORIGIN_FEATS.get(normalized);
  if (!meta) return null;
  return {
    type: meta.ruleType,
    id: normalized.replace(/\s+/g, '_'),
    label: name,
    source: name,
    bucket: 'Species & Origin',
    subbucket: 'Species Traits',
    group: meta.group,
    automationStatus: 'metadata_only',
    requiresSourceTextBeforeMutation: true,
    summary: 'Species-origin feat classified for future species, skill, recovery, movement, or combat workflow integration. No roll, defense, recovery, movement, or damage mutation is applied by this metadata-only pass.'
  };
}

async function normalizeSpeciesOriginFeat(item, options = {}) {
  if (options?.swseSpeciesOriginFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rule = ruleForFeat(item.name);
  if (!rule) return false;
  if (hasSpeciesOriginRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'species_origin_metadata',
      'system.abilityMeta.applicationScope': 'species_origin_context',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.speciesOriginRules': [
        ...getSpeciesOriginRules(item),
        rule
      ]
    }], {
      source: 'SpeciesOriginFeatNormalization.normalize',
      swseSpeciesOriginFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[SpeciesOriginFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerSpeciesOriginFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeSpeciesOriginFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeSpeciesOriginFeat(item, options));
  SWSELogger.log('[SpeciesOriginFeatNormalization] Hooks registered');
}

export default registerSpeciesOriginFeatNormalizationHooks;
