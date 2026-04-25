/**
 * Canonical Background Materialization Helper
 *
 * PHASE 3: Apply Background Grant Ledger and pending background context to durable actor state.
 *
 * PURPOSE:
 * - Single seam for background materialization (no split-brain authority)
 * - Materialize pending background context into durable actor gameplay state
 * - Store class-skill expansions (accounting for RAW choice vs. house rule auto-grant)
 * - Materialize language grants from backgrounds
 * - Apply skill bonuses (especially Occupation +2 untrained competence)
 * - Register passive effects/features
 * - Support single and multi-background modes with proper typed slots
 * - Ensure idempotence (safe to call repeatedly)
 *
 * CONTRACT:
 * Input: Actor + PendingBackgroundContext (from Phase 2)
 * Output: Durable actor state ready for sheet rendering and gameplay
 * No re-derivation of background mechanics - uses ledger/context as single authority
 *
 * ACTOR SCHEMA CHANGES (from Phase 3):
 * - system.background: string|object - canonical background name (or full object for multi-bg)
 * - system.profession: string - Occupation category background name
 * - system.planetOfOrigin: string - Planet/Homeworld category background name
 * - system.event: string - Event category background name
 * - flags.swse.backgroundLedger: object - canonical Background Grant Ledger (full authority)
 * - flags.swse.backgroundMode: string - 'single' or 'multi' (house rule mode)
 * - flags.swse.backgroundSelectedIds: array - selected background IDs
 * - flags.swse.backgroundClassSkills: array - class skills from backgrounds
 * - flags.swse.backgroundClassSkillChoices: array - pending skill choices needing resolution
 * - flags.swse.backgroundLanguages: array - languages from backgrounds
 * - flags.swse.backgroundBonuses: object - bonuses {untrained: [], flat: [], conditional: []}
 * - flags.swse.backgroundPassiveEffects: array - passive abilities/features
 * - flags.swse.occupationUntrainedBonuses: array - +2 competence bonuses for Occupation skills
 *
 * BACKGROUND CLASSIFICATION:
 * - 'event' (Event background): category='event', chooses 1 skill, no language
 * - 'occupation' (Profession/Occupation): category='occupation', chooses 1 skill, +2 untrained competence
 * - 'planet' (Homeworld/Planet of Origin): category='planet', chooses 2 skills, fixed bonus language
 *
 * ARCHITECTURE:
 * applyCanonicalBackgroundsToActor(actor, pendingContext)
 *   ├─ _materializeBackgroundIdentity()
 *   ├─ _materializeClassSkills()
 *   ├─ _materializeLanguages()
 *   ├─ _materializeSkillBonuses()
 *   ├─ _materializePassiveEffects()
 *   ├─ _materializeLedgerStorage()
 *   ├─ _reconcileOldBackgroundState()
 *   └─ _ensureIdempotence()
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * Apply canonical backgrounds to actor durably.
 *
 * This is the primary entry point for background materialization.
 * Called from ProgressionFinalizer after backgrounds are selected/confirmed.
 *
 * @param {Actor} actor - The actor to materialize backgrounds on
 * @param {Object} pendingContext - PendingBackgroundContext from Phase 2
 * @returns {Promise<{success: boolean, mutations: Object, error?: string}>}
 */
export async function applyCanonicalBackgroundsToActor(actor, pendingContext) {
  if (!actor) {
    SWSELogger.error('[CanonicalBackgrounds] applyCanonicalBackgroundsToActor called with no actor');
    return { success: false, error: 'No actor provided' };
  }

  if (!pendingContext) {
    SWSELogger.error('[CanonicalBackgrounds] applyCanonicalBackgroundsToActor called with invalid context');
    return { success: false, error: 'Invalid pending background context' };
  }

  try {
    const mutations = {};

    // PHASE 1: Identity (background names for display fields)
    const identityMutations = _materializeBackgroundIdentity(actor, pendingContext);
    Object.assign(mutations, identityMutations);

    // PHASE 2: Class skills (from backgrounds, respecting RAW choices and house rules)
    const skillMutations = _materializeClassSkills(actor, pendingContext);
    Object.assign(mutations, skillMutations);

    // PHASE 3: Languages (fixed grants and entitlements)
    const languageMutations = _materializeLanguages(actor, pendingContext);
    Object.assign(mutations, languageMutations);

    // PHASE 4: Skill bonuses (especially Occupation +2 untrained competence)
    const bonusMutations = _materializeSkillBonuses(actor, pendingContext);
    Object.assign(mutations, bonusMutations);

    // PHASE 5: Passive effects/features
    const effectsMutations = _materializePassiveEffects(actor, pendingContext);
    Object.assign(mutations, effectsMutations);

    // PHASE 6: Store canonical ledger for runtime authority
    const ledgerMutations = _materializeLedgerStorage(actor, pendingContext);
    Object.assign(mutations, ledgerMutations);

    // PHASE 7: Idempotence check (prevent duplicate bonuses on reapply)
    const idempotenceResults = _ensureIdempotence(actor, pendingContext, mutations);
    Object.assign(mutations, idempotenceResults.mutations);

    SWSELogger.log('[CanonicalBackgrounds] Background materialization complete:', {
      backgroundCount: pendingContext.selectedIds?.length ?? 0,
      multiMode: pendingContext.multiMode ?? false,
      actorId: actor.id,
      mutationCount: Object.keys(mutations).length,
      classSkillsCount: mutations['flags.swse.backgroundClassSkills']?.length ?? 0,
      languageCount: mutations['flags.swse.backgroundLanguages']?.length ?? 0,
    });

    return {
      success: true,
      mutations,
    };
  } catch (err) {
    SWSELogger.error('[CanonicalBackgrounds] Error applying backgrounds to actor:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Materialize background identity (names in category-specific display fields).
 * For multi-background mode, stores names in their respective category fields.
 * @private
 */
function _materializeBackgroundIdentity(actor, pendingContext) {
  const mutations = {};

  const selectedBgs = pendingContext.selectedBackgrounds || [];
  const multiMode = pendingContext.multiMode || false;

  // For single-background, store in generic system.background
  if (!multiMode && selectedBgs.length === 1) {
    const bg = selectedBgs[0];
    mutations['system.background'] = bg.name || '';
  }

  // For multi-background or category-specific storage, populate category fields
  for (const bg of selectedBgs) {
    const category = bg.category || '';

    if (category === 'occupation') {
      mutations['system.profession'] = bg.name || '';
    } else if (category === 'planet') {
      mutations['system.planetOfOrigin'] = bg.name || '';
    } else if (category === 'event') {
      mutations['system.event'] = bg.name || '';
    }
  }

  // Store multi-background mode indicator
  if (multiMode) {
    mutations['flags.swse.backgroundMode'] = 'multi';
  } else {
    mutations['flags.swse.backgroundMode'] = 'single';
  }

  // Store selected background IDs for audit/tracing
  mutations['flags.swse.backgroundSelectedIds'] = pendingContext.selectedIds || [];

  return mutations;
}

/**
 * Materialize class-skill expansions from background grants.
 * Respects RAW choice logic (pending choices) vs. house rule auto-grant.
 * @private
 */
function _materializeClassSkills(actor, pendingContext) {
  const mutations = {};

  const classSkillChoices = pendingContext.classSkillChoices || [];
  const classSkills = new Set();

  // Collect all class skills from pending choices
  // classSkillChoices is array of {allowedSkills: [...], resolved: [...], isAutoResolved: bool}
  for (const choice of classSkillChoices) {
    if (!choice) continue;

    // If house rule auto-resolved, add all resolved skills
    if (choice.isAutoResolved && Array.isArray(choice.resolved)) {
      for (const skill of choice.resolved) {
        classSkills.add(skill);
      }
    }
    // If RAW choice (pending resolution), we don't add anything yet
    // (player hasn't selected which specific skills to add as class skills)
    // These will be materialized later when choice is resolved in Skills step
  }

  // Store class skills for actor sheet to consume
  // Sheet will merge these with class-granted skills
  if (classSkills.size > 0) {
    mutations['flags.swse.backgroundClassSkills'] = Array.from(classSkills);
  }

  // Store pending skill choices for skills step to consume later
  if (classSkillChoices.length > 0) {
    mutations['flags.swse.backgroundClassSkillChoices'] = classSkillChoices;
  }

  return mutations;
}

/**
 * Materialize language grants from backgrounds.
 * Fixed languages from Homeworld, entitlements for selection.
 * @private
 */
function _materializeLanguages(actor, pendingContext) {
  const mutations = {};

  const languages = pendingContext.languages || {};
  const fixedLanguages = languages.fixed || [];
  const languageEntitlements = languages.entitlements || [];

  // Store fixed languages (Homeworld bonus language)
  if (fixedLanguages.length > 0) {
    mutations['flags.swse.backgroundLanguages'] = fixedLanguages;
  }

  // Store entitlements for later resolution if any
  // (typically handled by Language step)
  if (languageEntitlements.length > 0) {
    mutations['flags.swse.backgroundLanguageEntitlements'] = languageEntitlements;
  }

  return mutations;
}

/**
 * Materialize skill bonuses from backgrounds.
 * Primary case: Occupation +2 competence to untrained checks with relevant skills.
 * @private
 */
function _materializeSkillBonuses(actor, pendingContext) {
  const mutations = {};

  const bonuses = pendingContext.bonuses || {};
  const untrainedBonuses = bonuses.untrained || [];
  const flatBonuses = bonuses.flat || [];
  const conditionalBonuses = bonuses.conditional || [];

  // Collect Occupation-specific +2 untrained competence bonuses
  // These are always applied regardless of which skill the player chose
  const occupationUntrainedBonuses = [];
  const pendingChoices = pendingContext.pendingChoices || [];

  for (const choice of pendingChoices) {
    if (choice && choice.occupationUntrainedBonus) {
      occupationUntrainedBonuses.push(choice.occupationUntrainedBonus);
    }
  }

  // Store Occupation bonuses separately for skill calculators to consume
  if (occupationUntrainedBonuses.length > 0) {
    mutations['flags.swse.occupationUntrainedBonuses'] = occupationUntrainedBonuses;
  }

  // Store generic bonuses structure
  const bonusesObj = {};
  if (untrainedBonuses.length > 0) {
    bonusesObj.untrained = untrainedBonuses;
  }
  if (flatBonuses.length > 0) {
    bonusesObj.flat = flatBonuses;
  }
  if (conditionalBonuses.length > 0) {
    bonusesObj.conditional = conditionalBonuses;
  }

  if (Object.keys(bonusesObj).length > 0) {
    mutations['flags.swse.backgroundBonuses'] = bonusesObj;
  }

  return mutations;
}

/**
 * Materialize passive effects/features from backgrounds.
 * @private
 */
function _materializePassiveEffects(actor, pendingContext) {
  const mutations = {};

  const passiveEffects = pendingContext.passiveEffects || [];

  // Store passive effects for sheet/runtime to consume
  if (passiveEffects.length > 0) {
    mutations['flags.swse.backgroundPassiveEffects'] = passiveEffects;
  }

  return mutations;
}

/**
 * Store canonical Background Grant Ledger on actor for runtime authority.
 * This is the source of truth for background mechanics during gameplay.
 * @private
 */
function _materializeLedgerStorage(actor, pendingContext) {
  const mutations = {};

  const ledger = pendingContext.ledger || null;

  // Store full ledger for runtime authority
  if (ledger) {
    mutations['flags.swse.backgroundLedger'] = ledger;
  }

  return mutations;
}

/**
 * Ensure idempotence: prevent duplicate bonuses/skills when reapplying.
 * Checks if backgrounds were already materialized and reconciles state.
 * @private
 */
function _ensureIdempotence(actor, pendingContext, proposedMutations) {
  const results = { mutations: {} };

  const currentMode = actor.flags?.swse?.backgroundMode ?? 'single';
  const newMode = pendingContext.multiMode ? 'multi' : 'single';
  const currentIds = actor.flags?.swse?.backgroundSelectedIds ?? [];
  const newIds = pendingContext.selectedIds || [];

  // Check if we're re-applying the same backgrounds
  const idsMatch = currentIds.length === newIds.length &&
    currentIds.every(id => newIds.includes(id));

  // If backgrounds haven't changed, skip skill/bonus replication
  if (idsMatch && currentMode === newMode) {
    SWSELogger.log('[CanonicalBackgrounds] Backgrounds unchanged, skipping skill duplication', {
      backgrounds: newIds,
      mode: newMode,
    });
    // Still apply identity updates (in case names changed)
    // but skip class skill/bonus mutations to prevent duplication
    if (proposedMutations['flags.swse.backgroundClassSkills']) {
      delete proposedMutations['flags.swse.backgroundClassSkills'];
    }
    if (proposedMutations['flags.swse.occupationUntrainedBonuses']) {
      delete proposedMutations['flags.swse.occupationUntrainedBonuses'];
    }
  }

  // If switching between single and multi mode, or changing background selection,
  // clear old background state to prevent confusion
  if (!idsMatch || currentMode !== newMode) {
    // Old state will be overwritten by new mutations anyway
    SWSELogger.log('[CanonicalBackgrounds] Background selection changed, updating state', {
      oldIds: currentIds,
      newIds: newIds,
      oldMode: currentMode,
      newMode: newMode,
    });
  }

  return results;
}

/**
 * Export for testing/audit: get all background mutations that would be applied
 */
export async function getBackgroundMutationPlan(actor, pendingContext) {
  const result = await applyCanonicalBackgroundsToActor(actor, pendingContext);
  if (result.success) {
    return result.mutations;
  }
  throw new Error(result.error);
}
