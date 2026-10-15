/**
 * Pending Species Context Builder
 *
 * Creates canonical pending species context for progression and legacy chargen.
 * Bridges Species Grant Ledger into both systems during character creation.
 *
 * Purpose: Transform selected species into a fully-normalized pending context that
 * can be consumed by progression engine, legacy chargen, and prerequisite checks.
 *
 * Usage:
 *   const pending = await buildPendingSpeciesContext(actor, speciesIdentity);
 *   // pending contains: identity, abilities, movements, traits, grants, entitlements
 *   // Ready for progression engine, chargen mutation, and prerequisite visibility
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SpeciesGrantLedgerBuilder } from '/systems/foundryvtt-swse/scripts/species/species-grant-ledger-builder.js';
import { resolveAbilityChoice } from '/systems/foundryvtt-swse/scripts/species/species-ability-choice.js';
import { checkPublicationSelection, isRecordedConfigurationRestore, getSoleSnapshotVersion } from '/systems/foundryvtt-swse/scripts/species/species-publication-selection.js';
import { applySpeciesVariantProfile } from '/systems/foundryvtt-swse/scripts/species/species-variant-profile.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { computeStartingFeatsRequired } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shared/species-patch.js';

/**
 * @typedef {Object} PendingSpeciesContext
 * @property {Object} identity - Species identity info
 * @property {string} identity.id - Stable ID
 * @property {string} identity.name - Display name
 * @property {string} identity.source - Content source
 * @property {Object} identity.doc - Original Foundry document (if available)
 *
 * @property {Object} physical - Physical characteristics
 * @property {string} physical.size - Size category
 * @property {Object} physical.movements - Movement modes {walk, swim, fly, ...}
 *
 * @property {Object} abilities - Ability score adjustments
 * @property {number} abilities.str
 * @property {number} abilities.dex
 * @property {number} abilities.con
 * @property {number} abilities.int
 * @property {number} abilities.wis
 * @property {number} abilities.cha
 *
 * @property {Array} traits - Classified traits from ledger
 *
 * @property {Object} entitlements - Species-based character entitlements
 * @property {number} entitlements.featsRequired - Based on species+actorType
 * @property {Array} entitlements.languages - Known languages
 * @property {Array} entitlements.skills - Trained skills (if applicable)
 * @property {number} entitlements.bonusSpeed - Speed modifier (if any)
 *
 * @property {Object} ledger - Full normalized Species Grant Ledger
 *
 * @property {Object} metadata
 * @property {number} metadata.createdAt - Timestamp
 * @property {string} metadata.source - "progression"|"chargen"
 */

/**
 * Build a complete pending species context for progression/chargen.
 *
 * This is the canonical bridge between:
 * - Phase 1: Species Grant Ledger (compendium + traits JSON)
 * - Phase 2: Progression engine (pending state)
 * - Phase 2: Legacy chargen (local mutations)
 * - Future: Actor grants and sheet rendering
 *
 * @param {Actor} actor - Current actor (may be null for new character)
 * @param {string|Object} speciesIdentity - Species name, ID, or document
 * @param {Object} options - Configuration
 * @param {string} options.source - Where this context came from ("progression"|"chargen")
 * @returns {Promise<PendingSpeciesContext|null>} Normalized context or null
 */
export async function buildPendingSpeciesContext(actor, speciesIdentity, options = {}) {
  const { source = 'progression' } = options;

  try {
    // PHASE 4: Special handling for Near-Human with customization package
    if (typeof speciesIdentity === 'object' && speciesIdentity.speciesName === 'Near-Human') {
      const nearHumanPackage = speciesIdentity;
      SWSELogger.log('[PendingSpeciesContext] Detected Near-Human package - delegating to customization handler');
      return await _buildNearHumanContext(actor, nearHumanPackage, options);
    }

    // Step 1: Resolve species identity to registry entry
    const speciesEntry = await _resolveSpeciesEntry(speciesIdentity);
    if (!speciesEntry) {
      SWSELogger.warn('[PendingSpeciesContext] Could not resolve species identity:', speciesIdentity);
      return null;
    }

    // Step 2: Apply selected variant profile, if any, then build full Species Grant Ledger.
    const selectedVariantId = typeof speciesIdentity === 'object'
      ? (speciesIdentity.variantId || speciesIdentity.selectedVariantId || speciesIdentity.selectedVariant?.id || null)
      : null;
    // Project owner ruling RD-001: a species published in more than one verified profile needs an explicit
    // version; nothing silently defaults to a sourcebook. This is the single choke point for every assignment
    // path (chargen step, drag-and-drop, templates, followers). An existing actor is never re-evaluated when the
    // request merely restores the configuration the actor itself already records (species name and variant id);
    // that evidence comes from the actor, never from a caller-supplied flag.
    if (!isRecordedConfigurationRestore(actor, speciesEntry, selectedVariantId)) {
      const publication = checkPublicationSelection(speciesEntry, selectedVariantId);
      if (!publication.ok) {
        SWSELogger.warn(`[PendingSpeciesContext] ${speciesEntry.name} requires an explicit published version (${publication.code}); no context built`, {
          requestedVariantId: selectedVariantId ?? null,
          source,
        });
        return null;
      }
    }
    // A species published exactly once applies its sole verified profile (no choice exists, nothing is inherited
    // from the legacy base record). An explicit selection always wins.
    const effectiveVariantId = selectedVariantId || getSoleSnapshotVersion(speciesEntry)?.id || null;
    const selectedVariant = effectiveVariantId
      ? (speciesEntry.variants || []).find(variant => String(variant?.id) === String(effectiveVariantId))
      : null;
    // Complete-snapshot variants never inherit base traits/natural weapons/languages
    // (species-variant-profile.js); a malformed snapshot throws and fails closed below.
    const variantAppliedSpeciesEntry = selectedVariant
      ? applySpeciesVariantProfile(speciesEntry, selectedVariant)
      : speciesEntry;
    const suppliedAbilityChoice = typeof speciesIdentity === 'object'
      ? (speciesIdentity.selectedAbilityChoice || speciesIdentity.abilityChoiceSelection || null)
      : null;
    // A within-profile ability choice is validated here for EVERY assignment path. The published option (not the
    // caller's payload) supplies the modifiers; nothing is defaulted. An existing actor that merely restores its
    // recorded configuration may omit the choice (its racial scores already hold it).
    const recordedChoice = actor?.flags?.swse?.speciesAbilityChoice ?? null;
    const restoring = isRecordedConfigurationRestore(actor, speciesEntry, selectedVariantId);
    const choiceCheck = resolveAbilityChoice(variantAppliedSpeciesEntry, suppliedAbilityChoice ?? (restoring && recordedChoice?.id ? { id: recordedChoice.id } : null));
    // An existing actor whose option was never recorded cannot be rematerialized exactly (the option is not inferred);
    // fail closed so its stored racial modifiers are preserved.
    if (!choiceCheck.ok) {
      SWSELogger.warn(`[PendingSpeciesContext] ${speciesEntry.name} requires a valid published ability choice (${choiceCheck.code}); no context built`, { requested: suppliedAbilityChoice?.id ?? null, source });
      return null;
    }
    // Species that publish no selectable-modifier choice keep the previous pass-through (e.g. Human's template payload).
    const selectedAbilityChoice = choiceCheck.required ? choiceCheck.choice : suppliedAbilityChoice;
    if (selectedVariant && variantAppliedSpeciesEntry.variantFallbackFields?.length) {
      SWSELogger.warn(`[PendingSpeciesContext] Legacy overlay variant "${selectedVariant.id}" inherits base fields: ${variantAppliedSpeciesEntry.variantFallbackFields.join(', ')}`);
    }
    const effectiveSpeciesEntry = _applyAbilityChoiceProfile(variantAppliedSpeciesEntry, selectedAbilityChoice);

    const ledger = await SpeciesGrantLedgerBuilder.build(effectiveSpeciesEntry, effectiveSpeciesEntry.supplementaryTraits || null);
    if (!ledger) {
      SWSELogger.warn('[PendingSpeciesContext] Failed to build ledger for:', speciesEntry.name);
      return null;
    }

    // Step 3: Extract entitlements (feats, languages, bonuses)
    const actorType = actor?.type ?? 'character';
    const isDroid = actor?.system?.isDroid ?? false;
    const entitlements = _extractEntitlements(speciesEntry.name, actorType, isDroid, ledger);

    // Step 4: Build complete context
    const context = {
      identity: {
        id: speciesEntry.id,
        name: speciesEntry.name,
        source: effectiveSpeciesEntry.source || speciesEntry.source || 'Unknown',
        doc: effectiveSpeciesEntry, // Keep effective profile for reference
        baseDoc: speciesEntry,
        variant: effectiveSpeciesEntry.selectedVariant || null,
        abilityChoice: selectedAbilityChoice ? { ...selectedAbilityChoice } : null,
      },

      physical: {
        size: ledger.physical?.size || 'Medium',
        movements: ledger.physical?.movements || { walk: 6 },
      },

      abilities: {
        str: ledger.abilities?.str ?? 0,
        dex: ledger.abilities?.dex ?? 0,
        con: ledger.abilities?.con ?? 0,
        int: ledger.abilities?.int ?? 0,
        wis: ledger.abilities?.wis ?? 0,
        cha: ledger.abilities?.cha ?? 0,
      },

      traits: ledger.traits || [],

      entitlements,

      ledger, // Full ledger for downstream use

      metadata: {
        createdAt: Date.now(),
        source,
        actorType,
        selectedVariant: effectiveSpeciesEntry.selectedVariant || null,
        abilityChoice: selectedAbilityChoice ? { ...selectedAbilityChoice } : null,
        attributeGenerationOverride: _buildAttributeGenerationOverride(effectiveSpeciesEntry, selectedAbilityChoice),
        droidBuilder: ledger.rules?.droidBuilder || null,
        speciesRules: ledger.rules || {},
      },
    };

    SWSELogger.log('[PendingSpeciesContext] Built context for:', {
      species: speciesEntry.name,
      variant: selectedVariant?.label || null,
      source,
      actorType,
      featsRequired: entitlements.featsRequired,
      hasTraits: context.traits?.length ?? 0,
    });

    return context;
  } catch (err) {
    SWSELogger.error('[PendingSpeciesContext] Error building context:', err);
    return null;
  }
}




/**
 * Apply a selected species ability-choice package to the effective species
 * profile. This is used for species such as Arkanian Offshoot (+2 Str or Dex,
 * -2 Con) while keeping one visible species row in the browser.
 * @private
 */
function _applyAbilityChoiceProfile(speciesEntry, selectedChoice) {
  if (!speciesEntry || !selectedChoice) return speciesEntry;
  const abilityChoice = speciesEntry.abilityChoice || speciesEntry.system?.abilityChoice || null;
  if (!abilityChoice || typeof abilityChoice !== 'object') return speciesEntry;

  const choiceMods = selectedChoice.mods && typeof selectedChoice.mods === 'object'
    ? selectedChoice.mods
    : null;
  if (!choiceMods) return speciesEntry;

  const fixed = _normalizeAbilityMap(abilityChoice.fixed || {});
  const chosen = _normalizeAbilityMap(choiceMods || {});
  const abilityScores = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ...fixed, ...chosen };
  return {
    ...speciesEntry,
    abilityScores,
    selectedAbilityChoice: {
      id: selectedChoice.id || selectedChoice.ability || 'choice',
      label: selectedChoice.label || selectedChoice.ability || 'Choice',
      mods: chosen,
    },
  };
}

function _normalizeAbilityMap(raw = {}) {
  const keyMap = {
    str: 'str', strength: 'str', Str: 'str', Strength: 'str', STR: 'str',
    dex: 'dex', dexterity: 'dex', Dex: 'dex', Dexterity: 'dex', DEX: 'dex',
    con: 'con', constitution: 'con', Con: 'con', Constitution: 'con', CON: 'con',
    int: 'int', intelligence: 'int', Int: 'int', Intelligence: 'int', INT: 'int',
    wis: 'wis', wisdom: 'wis', Wis: 'wis', Wisdom: 'wis', WIS: 'wis',
    cha: 'cha', charisma: 'cha', Cha: 'cha', Charisma: 'cha', CHA: 'cha',
  };
  const out = {};
  for (const [key, value] of Object.entries(raw || {})) {
    const normalized = keyMap[key] || String(key || '').toLowerCase();
    if (!['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(normalized)) continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric !== 0) out[normalized] = numeric;
  }
  return out;
}

function _buildAttributeGenerationOverride(speciesEntry, selectedChoice) {
  const abilityChoice = speciesEntry?.abilityChoice || speciesEntry?.system?.abilityChoice || null;
  if (!abilityChoice || abilityChoice.type !== 'fixedArray') return null;

  const fixedScores = {
    str: 15,
    dex: 13,
    con: 10,
    int: 12,
    wis: 10,
    cha: 8,
    ..._normalizeAbilityMap(abilityChoice.fixedScores || speciesEntry?.fixedAbilityScores || {}),
  };

  const bonusChoices = Array.isArray(abilityChoice.bonusChoices) && abilityChoice.bonusChoices.length
    ? abilityChoice.bonusChoices.map(key => String(key).toLowerCase()).filter(key => ['str','dex','con','int','wis','cha'].includes(key))
    : ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const allocationPoints = Number(abilityChoice.allocationPoints ?? abilityChoice.bonusPoints ?? abilityChoice.bonusValue ?? 2) || 2;
  const maxPerAbility = Number(abilityChoice.maxPerAbility ?? 1) || 1;
  const selectedAbility = selectedChoice?.ability || selectedChoice?.id || null;
  const allocations = {};
  if (selectedAbility && bonusChoices.includes(selectedAbility)) {
    allocations[selectedAbility] = Math.min(allocationPoints, Number(abilityChoice.bonusValue ?? allocationPoints) || allocationPoints);
  }

  const finalScores = { ...fixedScores };
  for (const [ability, amount] of Object.entries(allocations)) {
    finalScores[ability] = Number(finalScores[ability] || 0) + Number(amount || 0);
  }

  return {
    mode: 'fixed-array-plus-choice',
    label: abilityChoice.label || 'Republic Clone fixed array',
    helpText: abilityChoice.helpText || 'Republic Clones start from their canonical array, then choose one ability score to increase by 2.',
    fixedScores,
    bonusChoices,
    allocationPoints,
    maxPerAbility,
    singleScore: abilityChoice.singleScore === true,
    houseRuleAllocation: abilityChoice.houseRuleAllocation ? { ...abilityChoice.houseRuleAllocation } : null,
    allocationMode: abilityChoice.allocationMode || (abilityChoice.singleScore === true ? 'single-score' : 'level-4-two-abilities'),
    requiresGmApprovalOnOverride: abilityChoice.requiresGmApprovalOnOverride !== false,
    selectedBonusAbility: selectedAbility,
    allocations,
    finalScores,
  };
}

/**
 * Resolve species identity to a registry entry.
 * Accepts: string (name/id), document object, or registry entry.
 *
 * @private
 */
async function _resolveSpeciesEntry(speciesIdentity) {
  // Already a registry entry
  if (speciesIdentity && speciesIdentity.id && speciesIdentity.name) {
    return speciesIdentity;
  }

  // String: lookup in registry
  if (typeof speciesIdentity === 'string') {
    // Try direct ID lookup first
    const byId = SpeciesRegistry.getById(speciesIdentity);
    if (byId) return byId;

    // Try name lookup
    const all = SpeciesRegistry.getAll() || [];
    return all.find(s => s.name?.toLowerCase() === speciesIdentity.toLowerCase()) || null;
  }

  // Document object: extract identity
  if (speciesIdentity && typeof speciesIdentity === 'object') {
    const name = speciesIdentity.name;
    if (name) {
      return _resolveSpeciesEntry(name);
    }
  }

  return null;
}

/**
 * Extract species-based entitlements from ledger and identity.
 * Computes feats, languages, and special bonuses.
 *
 * Phase 10A: Also accounts for species that have a bonus-feat choice trait
 * (id === 'bonus-feat' with frequency === 'choice') in their ledger — these
 * species get an extra feat entitlement beyond the base RAW count just like
 * Humans do, because the rule grants them one additional player-chosen feat.
 *
 * @private
 */
function _extractEntitlements(speciesName, actorType, isDroid, ledger) {
  // Base feat count from RAW species+actorType rules.
  const baseFeatCount = computeStartingFeatsRequired({
    isHuman: speciesName === 'Human',
    isNPC: actorType === 'npc',
    isDroid,
  });

  // Phase 10A: Check for bonus-feat-choice grants from ledger traits.
  // If a non-Human species has a bonus-feat choice (frequency='choice') trait,
  // it grants one additional player-chosen feat beyond the RAW base count.
  // Human already gets the +1 via isHuman=true in computeStartingFeatsRequired.
  // Specific feat grants (frequency='always') are materialized as items, not choices.
  const hasBonusFeatChoiceTrait = !isDroid && speciesName !== 'Human' && (ledger?.traits || []).some(
    t => t.classification === 'grant'
      && t.source === 'bonusFeat'
      && (t.grants || []).some(g => g.grantType === 'feat' && g.frequency === 'choice')
  );
  const featsRequired = hasBonusFeatChoiceTrait ? baseFeatCount + 1 : baseFeatCount;

  const entitlements = {
    featsRequired,
    languages: [],
    skills: [],
    bonusSpeed: 0,
  };

  // Languages from ledger
  if (ledger.languages && Array.isArray(ledger.languages)) {
    entitlements.languages = [...ledger.languages];
  }

  // Trained skills (if any species grant them)
  if (ledger.skills && Array.isArray(ledger.skills)) {
    entitlements.skills = [...ledger.skills];
  }

  // Structured species rules for downstream grant filters and builder steps
  entitlements.speciesRules = ledger.rules || {};
  entitlements.suppressedClassProficiencies = ledger.rules?.suppressedClassProficiencies || [];

  // Movement bonus (if any)
  if (ledger.physical?.movements?.walk) {
    // Calculate speed bonus vs standard 6 (30 ft)
    const standard = 6;
    const actual = ledger.physical.movements.walk;
    if (actual > standard) {
      entitlements.bonusSpeed = actual - standard;
    }
  }

  return entitlements;
}

/**
 * Apply pending species context to actor's system data (for chargen/progression).
 * Non-destructive: prepares data without persisting to actor.
 *
 * Used by chargen to mutate this.characterData without actor persistence.
 * Used by progression to build patches for later application.
 *
 * @param {Object} targetSystem - System data object to mutate (characterData, system)
 * @param {PendingSpeciesContext} context - Pending context from buildPendingSpeciesContext
 * @returns {Object} Mutated target (same reference)
 */
export function applyPendingSpeciesContext(targetSystem, context) {
  if (!targetSystem || !context) return targetSystem;

  // Identity
  targetSystem.species = context.identity.name;
  targetSystem.speciesSource = context.identity.source;

  // Physical
  targetSystem.size = context.physical.size;
  if (context.physical.movements?.walk) {
    targetSystem.speed = context.physical.movements.walk;
  }

  // Abilities (as modifiers)
  if (!targetSystem.abilities) targetSystem.abilities = {};
  for (const [key, value] of Object.entries(context.abilities)) {
    if (!targetSystem.abilities[key]) {
      targetSystem.abilities[key] = {};
    }
    targetSystem.abilities[key].racial = value;
  }

  // Entitlements
  targetSystem.featsRequired = context.entitlements.featsRequired;
  targetSystem.languages = context.entitlements.languages;

  // Size-based modifiers (ref defense, stealth)
  const sizeModifiers = _computeSizeModifiers(context.physical.size);
  if (sizeModifiers) {
    targetSystem.sizeModifiers = sizeModifiers;
  }

  return targetSystem;
}

/**
 * Compute size-based defense and skill modifiers per SWSE rules.
 *
 * @private
 */
function _computeSizeModifiers(size) {
  const modifiers = {
    'Fine': { reflex: 8, stealth: 16 },
    'Diminutive': { reflex: 4, stealth: 12 },
    'Tiny': { reflex: 2, stealth: 8 },
    'Small': { reflex: 1, stealth: 5 },
    'Medium': { reflex: 0, stealth: 0 },
    'Large': { reflex: -1, stealth: -5 },
    'Huge': { reflex: -2, stealth: -10 },
    'Gargantuan': { reflex: -5, stealth: -12 },
    'Colossal': { reflex: -10, stealth: -16 },
  };

  return modifiers[size] || modifiers['Medium'];
}

/**
 * Build a grants object for progression engine from pending context.
 * Extracts grants that should be materialized during species confirmation.
 *
 * @param {PendingSpeciesContext} context
 * @returns {Object} Grants structure for progression system
 */
export function extractGrantsFromPendingSpecies(context) {
  if (!context) return {};

  const grants = {};

  // Feats from traits (if any trait provides feat grants)
  const traitFeats = (context.traits || [])
    .filter(t => t.classification === 'grant' && t.grants?.some(g => g.grantType === 'feat'))
    .flatMap(t => t.grants || [])
    .filter(g => g.grantType === 'feat');

  if (traitFeats.length > 0) {
    grants.feats = traitFeats.map(f => f.target);
  }

  // Languages
  if (context.entitlements.languages?.length > 0) {
    grants.languages = context.entitlements.languages;
  }

  // Skills (if species provides any trained skills)
  if (context.entitlements.skills?.length > 0) {
    grants.skills = context.entitlements.skills;
  }

  // Natural weapons
  if (context.ledger?.naturalWeapons?.length > 0) {
    grants.naturalWeapons = context.ledger.naturalWeapons;
  }

  return grants;
}
