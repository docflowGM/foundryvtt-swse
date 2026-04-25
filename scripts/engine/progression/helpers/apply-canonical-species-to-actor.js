/**
 * Canonical Species Materialization Helper
 *
 * PHASE 3: Apply Species Grant Ledger and pending species context to durable actor state.
 *
 * PURPOSE:
 * - Single seam for species application (no split-brain authority)
 * - Materialize pending species context into durable actor gameplay state
 * - Create natural weapons as real actor items
 * - Store structured movement data
 * - Register passive bonuses, feats, rerolls, flags
 * - Ensure idempotence (safe to call repeatedly)
 *
 * CONTRACT:
 * Input: Actor + PendingSpeciesContext (from Phase 2)
 * Output: Durable actor state ready for sheet rendering and gameplay
 * No re-derivation of species mechanics - uses ledger/context as single authority
 *
 * ACTOR SCHEMA CHANGES (from Phase 3):
 * - system.species: string - canonical species name
 * - system.speciesMovement: object - structured movement modes {walk, swim, fly, hover, glide, burrow, climb}
 * - flags.swse.speciesUuid: string - compendium UUID for re-resolution
 * - flags.swse.speciesSource: string - content source for audit
 * - flags.swse.speciesFeatsRequired: number - entitlements ref
 * - flags.swse.speciesBonusSpeed: number - movement bonus
 * - flags.swse.speciesTraitIds: array - trait IDs for prerequisites
 * - flags.swse.speciesTraits: object - trait metadata for visibility
 * - flags.swse.speciesLanguages: array - species-granted languages
 * - flags.swse.speciesPassiveBonuses: object - passive bonus registry
 * - flags.swse.speciesRerolls: array - reroll rights registration
 *
 * NATURAL WEAPON ITEM FLAGS (identification):
 * - flags.swse.isNaturalWeapon: true - marks as natural weapon
 * - flags.swse.speciesGranted: true - species-managed item
 * - flags.swse.sourceSpecies: string - which species granted it
 * - flags.swse.alwaysArmed: true - always counts as armed
 * - flags.swse.autoEquipped: true - auto-equip on materialization
 *
 * ARCHITECTURE:
 * applyCanonicalSpeciesToActor(actor, pendingContext)
 *   ├─ _materializeSpeciesIdentity()
 *   ├─ _materializeAbilities()
 *   ├─ _materializePhysical()
 *   ├─ _materializeMovement()
 *   ├─ _materializeLanguages()
 *   ├─ _materializeEntitlements()
 *   ├─ _materializeNaturalWeapons()
 *   ├─ _materializePassiveBonuses()
 *   ├─ _materializeTraitFlags()
 *   ├─ _materializeRerolls()
 *   ├─ _reconcileOldSpeciesItems()
 *   └─ _ensureIdempotence()
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * Apply canonical species to actor durably.
 *
 * This is the primary entry point for species materialization.
 * Called from ProgressionFinalizer after species is selected/confirmed.
 *
 * @param {Actor} actor - The actor to materialize species on
 * @param {Object} pendingContext - PendingSpeciesContext from Phase 2
 * @returns {Promise<{success: boolean, mutations: Object, error?: string}>}
 */
export async function applyCanonicalSpeciesToActor(actor, pendingContext) {
  if (!actor) {
    SWSELogger.error('[CanonicalSpecies] applyCanonicalSpeciesToActor called with no actor');
    return { success: false, error: 'No actor provided' };
  }

  if (!pendingContext || !pendingContext.identity?.name) {
    SWSELogger.error('[CanonicalSpecies] applyCanonicalSpeciesToActor called with invalid context');
    return { success: false, error: 'Invalid pending species context' };
  }

  try {
    const mutations = {};

    // PHASE 1: Identity
    const identityMutations = _materializeSpeciesIdentity(actor, pendingContext);
    Object.assign(mutations, identityMutations);

    // PHASE 2: Abilities (racial modifiers)
    const abilityMutations = _materializeAbilities(actor, pendingContext);
    Object.assign(mutations, abilityMutations);

    // PHASE 3: Physical (size, base speed)
    const physicalMutations = _materializePhysical(actor, pendingContext);
    Object.assign(mutations, physicalMutations);

    // PHASE 4: Movement (structured multi-mode)
    const movementMutations = _materializeMovement(actor, pendingContext);
    Object.assign(mutations, movementMutations);

    // PHASE 5: Languages
    const languageMutations = _materializeLanguages(actor, pendingContext);
    Object.assign(mutations, languageMutations);

    // PHASE 6: Entitlements (feats, bonuses)
    const entitlementMutations = _materializeEntitlements(actor, pendingContext);
    Object.assign(mutations, entitlementMutations);

    // PHASE 7: Trait flags (for prerequisites)
    const flagMutations = _materializeTraitFlags(actor, pendingContext);
    Object.assign(mutations, flagMutations);

    // PHASE 8: Passive bonuses (skill, defense, etc.)
    const passiveMutations = _materializePassiveBonuses(actor, pendingContext);
    Object.assign(mutations, passiveMutations);

    // PHASE 9: Rerolls (durable registration)
    const rerollMutations = _materializeRerolls(actor, pendingContext);
    Object.assign(mutations, rerollMutations);

    // PHASE 10: Items (natural weapons) - async
    const itemMutations = await _materializeNaturalWeapons(actor, pendingContext);
    if (itemMutations.items) {
      mutations.itemsToCreate = itemMutations.items;
    }

    // PHASE 11: Idempotence check
    const idempotenceResults = _ensureIdempotence(actor, pendingContext, mutations);
    Object.assign(mutations, idempotenceResults.mutations);

    SWSELogger.log('[CanonicalSpecies] Species materialization complete:', {
      species: pendingContext.identity.name,
      actorId: actor.id,
      mutationCount: Object.keys(mutations).length,
      itemsToCreate: mutations.itemsToCreate?.length ?? 0,
    });

    return {
      success: true,
      mutations,
    };
  } catch (err) {
    SWSELogger.error('[CanonicalSpecies] Error applying species to actor:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Materialize species identity (name, source, UUID).
 * @private
 */
function _materializeSpeciesIdentity(actor, pendingContext) {
  const mutations = {};

  const speciesName = pendingContext.identity.name;
  const speciesSource = pendingContext.identity.source || 'Unknown';

  // Set system.species to canonical name
  mutations['system.species'] = speciesName;

  // Set system.race for backward compatibility
  mutations['system.race'] = speciesName;

  // Store UUID if available (for later re-resolution)
  if (pendingContext.identity.doc?.uuid) {
    mutations['flags.swse.speciesUuid'] = pendingContext.identity.doc.uuid;
  }

  // Store full species source for audit/tracing
  mutations['flags.swse.speciesSource'] = speciesSource;

  // Mark droid status if applicable
  if (speciesName.toLowerCase() === 'droid' || speciesName.toLowerCase().includes('droid')) {
    mutations['system.isDroid'] = true;
  }

  return mutations;
}

/**
 * Materialize ability score modifiers from species.
 * @private
 */
function _materializeAbilities(actor, pendingContext) {
  const mutations = {};

  const abilities = pendingContext.abilities || {};
  for (const [key, value] of Object.entries(abilities)) {
    if (value !== 0) {
      // Store as racial modifier in system.abilities.<key>.racial
      mutations[`system.abilities.${key}.racial`] = value;
    }
  }

  return mutations;
}

/**
 * Materialize physical characteristics (size, base speed).
 * @private
 */
function _materializePhysical(actor, pendingContext) {
  const mutations = {};

  const physical = pendingContext.physical || {};

  // Size
  if (physical.size) {
    mutations['system.size'] = physical.size.toLowerCase();
  }

  // Base speed (walk speed in squares)
  if (physical.movements?.walk) {
    mutations['system.speed'] = physical.movements.walk;
  }

  return mutations;
}

/**
 * Materialize structured movement modes into actor state.
 * Preserves multi-mode movement data beyond flat speed field.
 * @private
 */
function _materializeMovement(actor, pendingContext) {
  const mutations = {};

  const movements = pendingContext.physical?.movements || {};

  // Store structured movement data in system.speciesMovement
  // This preserves walk, swim, fly, hover, glide, burrow, climb separately
  const speciesMovement = {};
  for (const [mode, speed] of Object.entries(movements)) {
    if (speed !== null && speed !== undefined) {
      speciesMovement[mode] = speed;
    }
  }

  if (Object.keys(speciesMovement).length > 0) {
    mutations['system.speciesMovement'] = speciesMovement;
  }

  return mutations;
}

/**
 * Materialize languages granted by species.
 * @private
 */
function _materializeLanguages(actor, pendingContext) {
  const mutations = {};

  const languages = pendingContext.entitlements?.languages || [];
  if (languages.length > 0) {
    // Store in flags for now - sheet integration handles system.languages
    // This marks them as species-granted for later differentiation
    mutations['flags.swse.speciesLanguages'] = languages;
  }

  return mutations;
}

/**
 * Materialize entitlements (feats required, bonuses).
 * @private
 */
function _materializeEntitlements(actor, pendingContext) {
  const mutations = {};

  const entitlements = pendingContext.entitlements || {};

  // featsRequired is computed per RAW (Human gets 2, others get 1, NPC+1, Droid 0)
  // Store this for reference but let progression handle actual feat selection
  if (entitlements.featsRequired !== undefined) {
    mutations['flags.swse.speciesFeatsRequired'] = entitlements.featsRequired;
  }

  // Bonus speed (if any - movement modes beyond standard 6)
  if (entitlements.bonusSpeed && entitlements.bonusSpeed !== 0) {
    mutations['flags.swse.speciesBonusSpeed'] = entitlements.bonusSpeed;
  }

  return mutations;
}

/**
 * Materialize trait flags for prerequisite visibility.
 * Stores species-relevant trait tags as actor flags for prerequisite checks.
 * @private
 */
function _materializeTraitFlags(actor, pendingContext) {
  const mutations = {};

  const traits = pendingContext.traits || [];
  const traitIds = new Set();
  const traitFlags = {};

  // Collect trait identifiers for prerequisite checks
  for (const trait of traits) {
    if (trait.id) {
      traitIds.add(trait.id);
    }
    if (trait.name) {
      // Store trait name for backward compat lookups
      traitFlags[trait.name] = {
        classification: trait.classification,
        id: trait.id,
        type: trait.type,
      };
    }
  }

  // Store all trait IDs for prerequisite visibility
  if (traitIds.size > 0) {
    mutations['flags.swse.speciesTraitIds'] = Array.from(traitIds);
  }

  // Store trait metadata
  if (Object.keys(traitFlags).length > 0) {
    mutations['flags.swse.speciesTraits'] = traitFlags;
  }

  return mutations;
}

/**
 * Materialize passive bonuses from species traits.
 * Skill bonuses, defense bonuses, etc.
 * @private
 */
function _materializePassiveBonuses(actor, pendingContext) {
  const mutations = {};

  const traits = pendingContext.traits || [];
  const passiveBonuses = {};

  // Extract passive bonuses from trait classifications
  for (const trait of traits) {
    if (trait.classification === 'bonus' && trait.passive) {
      const passive = trait.passive;
      const bonusKey = `${passive.target}`;

      if (!passiveBonuses[bonusKey]) {
        passiveBonuses[bonusKey] = [];
      }

      passiveBonuses[bonusKey].push({
        value: passive.value,
        type: passive.bonusType,
        trait: trait.name,
        conditions: passive.conditions,
      });
    }
  }

  // Store passive bonuses for sheet/calculators to consume
  if (Object.keys(passiveBonuses).length > 0) {
    mutations['flags.swse.speciesPassiveBonuses'] = passiveBonuses;
  }

  return mutations;
}

/**
 * Materialize reroll rights as durable actor metadata.
 * @private
 */
function _materializeRerolls(actor, pendingContext) {
  const mutations = {};

  const traits = pendingContext.traits || [];
  const rerolls = [];

  // Extract reroll mechanics from traits
  for (const trait of traits) {
    if (trait.classification === 'reroll' && trait.rerolls) {
      for (const reroll of trait.rerolls) {
        rerolls.push({
          scope: reroll.scope,
          target: reroll.target,
          frequency: reroll.frequency,
          outcome: reroll.outcome,
          sourceTraitName: trait.name,
          sourceTraitId: trait.id,
        });
      }
    }
  }

  // Store reroll registry for roll hooks to consume
  if (rerolls.length > 0) {
    mutations['flags.swse.speciesRerolls'] = rerolls;
  }

  return mutations;
}

/**
 * Create natural weapons from species as real actor items.
 * These are materialized as weapon items marked with species-granted flag.
 * @private
 */
async function _materializeNaturalWeapons(actor, pendingContext) {
  const itemsToCreate = [];
  const ledger = pendingContext.ledger || {};
  const naturalWeapons = ledger.naturalWeapons || [];

  for (const nw of naturalWeapons) {
    const itemData = {
      name: nw.name || 'Natural Weapon',
      type: 'weapon',
      system: {
        category: nw.category || 'melee',
        type: nw.type || 'simple melee weapon',
        damage: {
          formula: nw.damage?.formula || '1d4',
          type: nw.damage?.type || 'bludgeoning',
        },
        attackAbility: nw.attackAbility || 'str',
        properties: nw.properties || {},
        // Mark as species-granted
        source: 'species-natural-weapon',
      },
      flags: {
        swse: {
          isNaturalWeapon: true,
          speciesGranted: true,
          sourceSpecies: pendingContext.identity.name,
          alwaysArmed: nw.properties?.alwaysArmed ?? true,
          autoEquipped: true,
        },
      },
    };

    itemsToCreate.push(itemData);
  }

  return { items: itemsToCreate };
}

/**
 * Reconcile old species items when species changes during chargen.
 * Identifies and marks items from previous species for cleanup.
 * @private
 */
function _reconcileOldSpeciesItems(actor, pendingContext) {
  const results = {
    itemsToDelete: [],
    itemsToUpdate: [],
  };

  const currentSpecies = pendingContext.identity.name;
  const speciesItems = (actor.items || []).filter(item =>
    item.flags?.swse?.speciesGranted && item.flags?.swse?.sourceSpecies
  );

  for (const item of speciesItems) {
    const sourceSpecies = item.flags.swse.sourceSpecies;
    if (sourceSpecies !== currentSpecies) {
      // Old species item - mark for deletion
      results.itemsToDelete.push(item.id);
    }
  }

  return results;
}

/**
 * Ensure idempotence: prevent duplicate weapons, stacked bonuses on reapply.
 * @private
 */
function _ensureIdempotence(actor, pendingContext, proposedMutations) {
  const results = { mutations: {} };

  // Check for existing species-granted natural weapons from SAME species
  const existingNaturalWeapons = (actor.items || []).filter(item =>
    item.type === 'weapon' &&
    item.flags?.swse?.isNaturalWeapon &&
    item.flags?.swse?.sourceSpecies === pendingContext.identity.name
  );

  // Reconcile old species items
  const reconciliation = _reconcileOldSpeciesItems(actor, pendingContext);
  if (reconciliation.itemsToDelete.length > 0) {
    results.mutations.itemsToDelete = reconciliation.itemsToDelete;
  }

  // If we have existing weapons from THIS species, we're re-applying
  // Don't create duplicates - but still update if needed
  if (existingNaturalWeapons.length > 0 && proposedMutations.itemsToCreate?.length > 0) {
    // Skip creation to avoid duplicates
    SWSELogger.log('[CanonicalSpecies] Skipping natural weapon creation (already exist)', {
      species: pendingContext.identity.name,
      existing: existingNaturalWeapons.length,
    });
    delete proposedMutations.itemsToCreate;
  }

  return results;
}

/**
 * Export for testing/audit: get all species mutations that would be applied
 */
export async function getSpeciesMutationPlan(actor, pendingContext) {
  const result = await applyCanonicalSpeciesToActor(actor, pendingContext);
  if (result.success) {
    return result.mutations;
  }
  throw new Error(result.error);
}
