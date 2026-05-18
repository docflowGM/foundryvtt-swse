/**
 * Background Pending Context Builder
 *
 * Canonical helper that converts selected background IDs into a structured
 * pending context using the Background Grant Ledger. This is the unified
 * entry point for progression to understand background-derived grants.
 *
 * Phase 2: Core integration point between background selection and
 * downstream steps (skills, languages, summary, etc.)
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { BackgroundGrantLedgerBuilder } from './background-grant-ledger-builder.js';
import { BackgroundLedgerCompatibility } from './background-ledger-compatibility.js';
import { BackgroundRegistry } from '/systems/foundryvtt-swse/scripts/registries/background-registry.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';

/**
 * Build pending background context from selected background IDs
 *
 * This is the canonical entry point for progression to get background-derived
 * context during character creation. It:
 * 1. Resolves background IDs to canonical objects
 * 2. Builds a normalized Background Grant Ledger
 * 3. Returns structured pending context for consumption by downstream steps
 *
 * @param {Array<string>|string|null} selectedBackgroundIds - Background ID(s) to process
 * @param {Object} options - Context options
 * @param {boolean} options.multiMode - true if multi-background house rule is active
 * @returns {Promise<Object>} - Structured pending background context
 *
 * Example output:
 * {
 *   selectedIds: ['alderaan', 'academic'],
 *   ledger: {Background Grant Ledger object},
 *   classSkills: ['Persuasion', 'Knowledge (Any)', 'Use Computer'],
 *   classSkillChoices: [{backgroundId, count, fromSkills}, ...],
 *   languages: {
 *     fixed: ['High Galactic'],
 *     entitlements: []
 *   },
 *   bonuses: {
 *     untrained: [{ value: 2, applicableSkills: [...] }],
 *     flat: []
 *   },
 *   passiveEffects: [{backgroundId, description, ...}],
 *   unresolved: [{backgroundId, issue, phase}],
 *   multiMode: true,
 *   mergeStatus: 'success'
 * }
 */
export async function buildPendingBackgroundContext(selectedBackgroundIds, options = {}) {
  try {
    // Normalize input
    const ids = Array.isArray(selectedBackgroundIds)
      ? selectedBackgroundIds
      : selectedBackgroundIds ? [selectedBackgroundIds] : [];

    // Ensure BackgroundRegistry is loaded
    await BackgroundRegistry.ensureLoaded();

    // Detect multi-mode from options or infer from count
    const multiMode = options.multiMode ?? (ids.length > 1);

    // Build the canonical ledger
    const ledger = await BackgroundGrantLedgerBuilder.build(ids, BackgroundRegistry, {
      multiMode
    });

    // Build pending skill choices from backgrounds
    const pendingChoices = _buildPendingBackgroundChoices(ledger);

    // Extract all background skill options (union of all allowed skills from pending choices)
    const backgroundSkillOptions = new Set();
    for (const choice of pendingChoices) {
      if (choice?.allowedSkills && Array.isArray(choice.allowedSkills)) {
        choice.allowedSkills.forEach(skill => backgroundSkillOptions.add(skill));
      }
    }

    // Extract structured context for downstream consumption
    const context = {
      // Selection metadata
      selectedIds: ledger.selectedBackgroundIds || [],
      selectedBackgrounds: ledger.selectedBackgrounds || [],
      multiMode: ledger.multiMode || false,

      // Canonical ledger (complete source of truth)
      ledger,

      // Flattened views for downstream steps
      // Note: classSkills here are NOT automatic - they represent pending CHOICES
      // Player must resolve: Event/Occupation choose 1, Homeworld choose 2
      classSkillChoices: BackgroundLedgerCompatibility.getClassSkillChoicesForProgression(ledger),
      languages: BackgroundLedgerCompatibility.getLanguageGrantsForLanguageStep(ledger),

      // Pending entitlements for progression (these become actual choices for Skills step)
      pendingChoices,

      // Background skill opportunities (all skills that can be chosen from backgrounds)
      backgroundSkillOptions: Array.from(backgroundSkillOptions),

      bonuses: ledger.bonuses || {},
      passiveEffects: BackgroundLedgerCompatibility.getPassiveEffectsForRuntime(ledger),

      // Metadata
      sources: ledger.sources || [],
      unresolved: BackgroundLedgerCompatibility.getUnresolvedItems(ledger),
      hasUnresolved: BackgroundLedgerCompatibility.hasUnresolved(ledger),
      mergeStatus: ledger.mergeStatus || 'unknown',
      warnings: ledger.warnings || []
    };

    SWSELogger.log('[BackgroundPendingContext] Built context:', {
      selectedCount: context.selectedIds.length,
      multiMode: context.multiMode,
      backgroundSkillOptionCount: context.backgroundSkillOptions.length,
      classSkillChoiceCount: context.classSkillChoices.length,
      languageCount: context.languages?.fixed?.length || 0,
      pendingChoiceCount: context.pendingChoices?.length || 0,
      unresolvedCount: context.unresolved?.length || 0
    });

    return context;
  } catch (err) {
    SWSELogger.error('[BackgroundPendingContext] Error building context:', err);
    return createEmptyPendingContext();
  }
}

/**
 * Build pending skill-choice entitlements from Background Grant Ledger
 *
 * Respects the 'backgroundSkillGrantMode' house rule:
 * - 'raw_choice' (default): RAW Requirements
 *   * Event: player chooses 1 skill from background's relevant skill list
 *   * Occupation: player chooses 1 skill + gets +2 competence to untrained checks with all relevant skills
 *   * Homeworld: player chooses 2 skills + gets fixed bonus language
 *
 * - 'grant_all_listed_skills': All listed relevant skills become class skills
 *   * Event: all listed relevant skills become class skills
 *   * Occupation: all listed relevant skills become class skills + +2 competence bonus
 *   * Homeworld: all listed relevant skills become class skills + fixed bonus language
 *
 * Each pending choice becomes an entitlement that the Skills step must resolve (or auto-resolves if house rule).
 *
 * @private
 */
function _buildPendingBackgroundChoices(ledger) {
  const choices = [];

  if (!ledger || !ledger.selectedBackgrounds) return choices;

  // Check house rule setting
  const skillGrantMode = HouseRuleService.getString('backgroundSkillGrantMode', 'raw_choice');
  const grantAll = skillGrantMode === 'grant_all_listed_skills';

  for (const bg of ledger.selectedBackgrounds) {
    if (!bg) continue;

    const relevantSkills = bg.relevantSkills || [];
    if (relevantSkills.length === 0) continue;

    const categoryLabel = {
      event: 'Event',
      occupation: 'Occupation',
      planet: 'Homeworld'
    }[bg.category] || bg.category;

    const choiceCount = bg.skillChoiceCount || 0;

    // Under house rule, auto-resolve by granting all listed skills
    const resolved = grantAll ? relevantSkills : [];
    const isRequired = !grantAll && choiceCount > 0;
    const quantity = grantAll ? relevantSkills.length : choiceCount;

    if (quantity === 0 && !grantAll) continue; // Skip if no choice needed and no house rule

    // Create pending choice entitlement
    choices.push({
      id: `background_skill_choice_${bg.id}`,
      type: 'background_class_skill_pick',
      sourceBackgroundId: bg.id || bg.slug,
      sourceBackgroundName: bg.name,
      category: bg.category,
      categoryLabel,
      allowedSkills: relevantSkills,
      quantity,
      resolved,                                    // Auto-populated if house rule, empty if RAW choice pending
      isRequired,
      isAutoResolved: grantAll,                   // Flag indicates house rule auto-resolution
      description: grantAll
        ? `${categoryLabel} Background: Grant all ${relevantSkills.length} listed skills as class skills (house rule: grant all)`
        : `${categoryLabel} Background: Choose ${quantity} skill(s) from the available options`,

      // Special handling for Occupation: always grant +2 competence to untrained checks
      // This applies regardless of house rule (it's a separate effect)
      occupationUntrainedBonus: bg.category === 'occupation' ? {
        value: 2,
        applicableSkills: relevantSkills,
        type: 'untrained_competence'
      } : null
    });
  }

  return choices;
}

/**
 * Create an empty pending context (when no backgrounds selected)
 */
export function createEmptyPendingContext() {
  return {
    selectedIds: [],
    selectedBackgrounds: [],
    multiMode: false,

    ledger: {
      selectedBackgroundIds: [],
      multiMode: false,
      classSkills: { granted: [], choices: [] },
      languages: { fixed: [], entitlements: [] },
      bonuses: { untrained: [], flat: [], conditional: [] },
      passiveEffects: [],
      unresolved: [],
      mergeStatus: 'empty'
    },

    classSkills: [],
    classSkillChoices: [],
    backgroundSkillOptions: [],
    languages: { fixed: [], entitlements: [] },
    pendingChoices: [],
    bonuses: { untrained: [], flat: [], conditional: [] },
    passiveEffects: [],

    sources: [],
    unresolved: [],
    hasUnresolved: false,
    mergeStatus: 'empty',
    warnings: []
  };
}

/**
 * Merge pending background context into broader pending character state
 *
 * Used by buildIntent/progressionSession to integrate background context
 * into the overall pending state.
 *
 * @param {Object} pendingState - Current pending character state
 * @param {Object} backgroundContext - From buildPendingBackgroundContext()
 * @returns {Object} - Updated pending state with background context integrated
 */
export function mergeBackgroundContextIntoPendingState(pendingState, backgroundContext) {
  if (!pendingState) pendingState = {};
  if (!backgroundContext) return pendingState;

  return {
    ...pendingState,
    background: {
      selectedIds: backgroundContext.selectedIds,
      selectedBackgrounds: backgroundContext.selectedBackgrounds,
      multiMode: backgroundContext.multiMode,
      classSkills: backgroundContext.classSkills,
      classSkillChoices: backgroundContext.classSkillChoices,
      backgroundSkillOptions: backgroundContext.backgroundSkillOptions,
      pendingChoices: backgroundContext.pendingChoices,
      languages: backgroundContext.languages,
      bonuses: backgroundContext.bonuses,
      passiveEffects: backgroundContext.passiveEffects,
      ledger: backgroundContext.ledger,
      hasUnresolved: backgroundContext.hasUnresolved
    }
  };
}

/**
 * Get background-derived class skills from pending state
 *
 * Helper for integration points that need just the class skills.
 *
 * @param {Object} pendingState - Pending character state
 * @returns {Array<string>} - Class skill names
 */
export function getPendingBackgroundClassSkills(pendingState) {
  return pendingState?.background?.classSkills || [];
}

/**
 * Get background-derived languages from pending state
 *
 * @param {Object} pendingState - Pending character state
 * @returns {Array<string>} - Language names
 */
export function getPendingBackgroundLanguages(pendingState) {
  const sources = [
    pendingState?.background?.languages?.fixed,
    pendingState?.languages?.fixed,
    pendingState?.ledger?.languages?.fixed,
    pendingState?.background?.ledger?.languages?.fixed,
  ];
  const out = [];
  for (const source of sources) {
    if (Array.isArray(source)) out.push(...source);
  }
  return Array.from(new Set(out.filter(Boolean)));
}

/**
 * Check if pending state has any unresolved background effects
 *
 * @param {Object} pendingState - Pending character state
 * @returns {boolean} - true if unresolved effects present
 */
export function pendingBackgroundHasUnresolved(pendingState) {
  return pendingState?.background?.hasUnresolved ?? false;
}

/**
 * Get the canonical Background Grant Ledger from pending state
 *
 * For advanced integrations that need full ledger data.
 *
 * @param {Object} pendingState - Pending character state
 * @returns {Object|null} - Background Grant Ledger or null
 */
export function getPendingBackgroundLedger(pendingState) {
  return pendingState?.background?.ledger || null;
}
