/**
 * Background Grant Ledger Builder
 *
 * Canonical builder that normalizes raw background data and merges multiple
 * background selections into a structured ledger with stacking rules applied.
 *
 * SSOT Strategy:
 * - Input: Raw background objects from BackgroundRegistry (canonical source of truth)
 * - Output: Normalized Background Grant Ledger with all mechanical grants structured
 * - Rule-Based: Applies explicit stacking rules (class skills non-stacking, languages additive, etc.)
 *
 * Phase 1: Establishes the canonical pipeline
 * Phase 2+: Downstream systems consume this ledger
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class BackgroundGrantLedgerBuilder {
  /**
   * Build a Background Grant Ledger from one or more background selections
   *
   * @param {Array<string|Object>} backgroundRefs - Background IDs or objects to process
   * @param {Object} registry - BackgroundRegistry instance (with getBySlug, etc.)
   * @param {Object} options - Build options
   * @param {boolean} options.multiMode - true if multi-background mode is active
   * @returns {Promise<Object>} - Normalized Background Grant Ledger
   */
  static async build(backgroundRefs, registry, options = {}) {
    if (!backgroundRefs || backgroundRefs.length === 0) {
      return this._createEmptyLedger();
    }

    // Ensure array
    const refs = Array.isArray(backgroundRefs) ? backgroundRefs : [backgroundRefs];

    // Resolve all background references to canonical objects
    const resolvedBackgrounds = [];
    for (const ref of refs) {
      try {
        let bg;
        if (typeof ref === 'string') {
          bg = await registry.getBySlug(ref) || await registry.getByName(ref);
        } else {
          bg = ref;
        }
        if (bg) {
          resolvedBackgrounds.push(bg);
        }
      } catch (err) {
        SWSELogger.warn('[BackgroundGrantLedgerBuilder] Failed to resolve background:', ref, err);
      }
    }

    if (resolvedBackgrounds.length === 0) {
      return this._createEmptyLedger();
    }

    // Build the ledger
    return this._buildLedger(resolvedBackgrounds, options);
  }

  /**
   * Internal: Build the ledger from resolved backgrounds
   * @private
   */
  static _buildLedger(backgrounds, options = {}) {
    const ledger = {
      // Metadata
      selectedBackgroundIds: backgrounds.map(bg => bg.id || bg.slug),
      selectedBackgrounds: backgrounds,  // Keep raw for reference
      multiMode: options.multiMode || backgrounds.length > 1,
      buildTimestamp: Date.now(),

      // Merged grants (applying stacking rules)
      classSkills: this._mergeClassSkills(backgrounds),
      languages: this._mergeLanguages(backgrounds),
      bonuses: this._mergeBonuses(backgrounds),
      passiveEffects: this._collectPassiveEffects(backgrounds),

      // Metadata
      sources: this._collectSources(backgrounds),
      unresolved: this._collectUnresolvedItems(backgrounds),
      mergeStatus: 'success',
      warnings: []
    };

    return ledger;
  }

  // ===========================================================================
  // MERGE RULES
  // ===========================================================================

  /**
   * Merge class skill expansions using SET UNION (non-stacking)
   * Multiple backgrounds granting same skill → skill appears once
   *
   * @private
   */
  static _mergeClassSkills(backgrounds) {
    const grantedSet = new Set();  // Non-stacking
    const choices = [];             // Per-background choices
    const unresolved = [];

    for (const bg of backgrounds) {
      // Collect mechanical effect for class_skills
      const mechEffect = bg.mechanicalEffect || {};

      if (mechEffect.type === 'class_skills') {
        // Add granted skills to set (union)
        const grantedCount = mechEffect.count || 0;

        // We don't know which skills the player chose yet; track intent
        // relevantSkills are the options the player can choose from
        const relevantSkills = bg.relevantSkills || [];

        // Add to union (player will choose `grantedCount` from relevantSkills)
        choices.push({
          backgroundId: bg.id || bg.slug,
          backgroundName: bg.name,
          skillChoiceCount: grantedCount,
          fromSkills: relevantSkills,
          mechanics: {
            type: 'choice_from_list',
            count: grantedCount,
            options: relevantSkills
          }
        });

        // If mechanicalEffect has explicit skills list, include them
        if (mechEffect.skills && Array.isArray(mechEffect.skills)) {
          for (const skill of mechEffect.skills) {
            // Filter out UUIDs, keep named skills only
            if (typeof skill === 'string' && !skill.match(/^[a-f0-9]{16}$/)) {
              grantedSet.add(skill);
            }
          }
        }
      } else if (bg.trainedSkills && Array.isArray(bg.trainedSkills)) {
        // Legacy: trainedSkills field (if it exists)
        for (const skill of bg.trainedSkills) {
          grantedSet.add(skill);
        }
      }
    }

    return {
      granted: Array.from(grantedSet).sort(),  // Set union, sorted
      choices,
      mergeType: 'set_union',
      conflictResolution: 'dedup_no_benefit'    // Duplicates provide no extra value
    };
  }

  /**
   * Merge language grants (ADDITIVE)
   * Multiple backgrounds can stack language grants
   *
   * @private
   */
  static _mergeLanguages(backgrounds) {
    const fixedLanguages = new Set();
    const entitlements = [];

    for (const bg of backgrounds) {
      // bonusLanguage field (typical for planets)
      if (bg.bonusLanguage) {
        const langs = bg.bonusLanguage.split(/\s+or\s+/i).map(l => l.trim());
        for (const lang of langs) {
          if (lang) {
            fixedLanguages.add(lang);
          }
        }
      }

      // mechanicalEffect may also specify languages
      const mechEffect = bg.mechanicalEffect || {};
      if (mechEffect.languages && Array.isArray(mechEffect.languages)) {
        for (const lang of mechEffect.languages) {
          fixedLanguages.add(lang);
        }
      }
    }

    return {
      fixed: Array.from(fixedLanguages).sort(),
      entitlements,                              // Future: language picks/bonuses
      mergeType: 'additive',
      conflictResolution: 'dedup'
    };
  }

  /**
   * Merge skill bonuses (ADDITIVE - stacking)
   *
   * @private
   */
  static _mergeBonuses(backgrounds) {
    const untrainedBonuses = [];
    const flatBonuses = [];
    const conditionalBonuses = [];

    for (const bg of backgrounds) {
      const mechEffect = bg.mechanicalEffect || {};

      if (mechEffect.type === 'untrained_bonus') {
        // Bonus to untrained skill checks
        untrainedBonuses.push({
          backgroundId: bg.id || bg.slug,
          backgroundName: bg.name,
          value: mechEffect.value || 2,
          applicableSkills: mechEffect.skills || [],
          description: mechEffect.description
        });
      } else if (mechEffect.type === 'bonus') {
        // Generic bonus (e.g., grapple checks)
        flatBonuses.push({
          backgroundId: bg.id || bg.slug,
          backgroundName: bg.name,
          value: mechEffect.value || 2,
          target: mechEffect.target || 'unknown',
          description: mechEffect.description
        });
      }
    }

    return {
      untrained: untrainedBonuses,
      flat: flatBonuses,
      conditional: conditionalBonuses,
      mergeType: 'additive',
      stackingAllowed: true
    };
  }

  /**
   * Collect passive effects / special abilities (NOT merged)
   *
   * @private
   */
  static _collectPassiveEffects(backgrounds) {
    const effects = [];

    for (const bg of backgrounds) {
      const mechEffect = bg.mechanicalEffect || {};

      if (mechEffect.type === 'special_ability') {
        effects.push({
          backgroundId: bg.id || bg.slug,
          backgroundName: bg.name,
          type: 'special_ability',
          description: mechEffect.description || bg.specialAbility || '',
          source: 'mechanicalEffect',
          requiresRuntime: true,
          unresolved: true  // Special abilities need manual handler
        });
      } else if (bg.specialAbility && mechEffect.type !== 'class_skills' && mechEffect.type !== 'untrained_bonus' && mechEffect.type !== 'bonus') {
        // Legacy specialAbility field
        effects.push({
          backgroundId: bg.id || bg.slug,
          backgroundName: bg.name,
          type: 'special_ability',
          description: bg.specialAbility,
          source: 'specialAbility_legacy',
          requiresRuntime: true,
          unresolved: true
        });
      }
    }

    return effects;
  }

  /**
   * Collect source metadata
   * @private
   */
  static _collectSources(backgrounds) {
    const sources = new Set();
    for (const bg of backgrounds) {
      sources.add(bg.source || 'core');
    }
    return Array.from(sources).sort();
  }

  /**
   * Collect unresolved/manual-review items
   * @private
   */
  static _collectUnresolvedItems(backgrounds) {
    const unresolved = [];

    for (const bg of backgrounds) {
      const mechEffect = bg.mechanicalEffect || {};

      // Special abilities always need runtime support
      if (mechEffect.type === 'special_ability') {
        unresolved.push({
          backgroundId: bg.id || bg.slug,
          backgroundName: bg.name,
          issue: 'special_ability_runtime',
          description: `Special ability requires actor/session handler: ${mechEffect.description}`,
          phase: 'phase_2_actor_integration'
        });
      }

      // Reroll mechanics are complex
      if (mechEffect.description && mechEffect.description.toLowerCase().includes('reroll')) {
        unresolved.push({
          backgroundId: bg.id || bg.slug,
          backgroundName: bg.name,
          issue: 'reroll_mechanic',
          description: `Reroll mechanic requires dice hook integration: ${mechEffect.description}`,
          phase: 'phase_2_runtime_mechanics'
        });
      }
    }

    return unresolved;
  }

  // ===========================================================================
  // EMPTY LEDGER
  // ===========================================================================

  /**
   * Create empty ledger when no backgrounds selected
   * @private
   */
  static _createEmptyLedger() {
    return {
      selectedBackgroundIds: [],
      selectedBackgrounds: [],
      multiMode: false,
      buildTimestamp: Date.now(),

      classSkills: {
        granted: [],
        choices: [],
        mergeType: 'set_union',
        conflictResolution: 'dedup_no_benefit'
      },

      languages: {
        fixed: [],
        entitlements: [],
        mergeType: 'additive',
        conflictResolution: 'dedup'
      },

      bonuses: {
        untrained: [],
        flat: [],
        conditional: [],
        mergeType: 'additive',
        stackingAllowed: true
      },

      passiveEffects: [],
      sources: [],
      unresolved: [],
      mergeStatus: 'empty',
      warnings: []
    };
  }

  // ===========================================================================
  // EXPORT / SERIALIZATION
  // ===========================================================================

  /**
   * Convert ledger to JSON (safe for storage/transmission)
   */
  static toLedgerJSON(ledger) {
    return {
      selectedBackgroundIds: ledger.selectedBackgroundIds,
      multiMode: ledger.multiMode,
      buildTimestamp: ledger.buildTimestamp,

      classSkills: ledger.classSkills,
      languages: ledger.languages,
      bonuses: ledger.bonuses,
      passiveEffects: ledger.passiveEffects,

      sources: ledger.sources,
      unresolved: ledger.unresolved,
      mergeStatus: ledger.mergeStatus,
      warnings: ledger.warnings
    };
  }

  /**
   * Restore ledger from JSON
   */
  static fromLedgerJSON(json) {
    return {
      ...json,
      selectedBackgrounds: []  // Must be re-resolved from IDs if needed
    };
  }
}
