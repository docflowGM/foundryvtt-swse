/**
 * Background Grant Ledger Compatibility Layer
 *
 * Provides adapters that allow existing call sites (chargen, progression,
 * actor materialization, etc.) to consume normalized Background Grant Ledger
 * data without requiring immediate changes to downstream code.
 *
 * This is a Phase 1 bridge that preserves backward compatibility while
 * establishing the canonical ledger as the future authority.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class BackgroundLedgerCompatibility {
  /**
   * Convert Background Grant Ledger to legacy characterData format
   * Allows chargen-*.js files to work with ledger without immediate changes
   *
   * @param {Object} ledger - Background Grant Ledger from builder
   * @returns {Object} - Legacy characterData.background format
   */
  static toLegacyChargenFormat(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty') {
      return null;
    }

    // Primary background (first selected in multi mode)
    const primaryBgId = ledger.selectedBackgroundIds[0];
    const primaryBg = ledger.selectedBackgrounds?.[0];

    if (!primaryBg) {
      return null;
    }

    // Build legacy background object
    const legacyBg = {
      id: primaryBg.id || primaryBg.slug,
      name: primaryBg.name,
      category: primaryBg.category,
      icon: primaryBg.icon || '',
      narrativeDescription: primaryBg.narrativeDescription || primaryBg.description || '',
      specialAbility: primaryBg.specialAbility || null,
      specialAbilities: primaryBg.specialAbilities || [],
      bonusLanguage: primaryBg.bonusLanguage || null,
      trainedSkills: primaryBg.trainedSkills || [],
      relevantSkills: primaryBg.relevantSkills || [],
      skillChoiceCount: primaryBg.skillChoiceCount || 0
    };

    return legacyBg;
  }

  /**
   * Convert Background Grant Ledger to legacy skills format
   * Provides trainedSkills list that chargen-skills.js expects
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {Array<string>} - List of trained skill names
   */
  static getTrainedSkillsForChargen(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty') {
      return [];
    }

    // In chargen context, we need the relevant skills the player can choose from
    // This is for marking class skills due to background
    const primaryBg = ledger.selectedBackgrounds?.[0];
    if (!primaryBg) {
      return [];
    }

    return primaryBg.trainedSkills || primaryBg.relevantSkills || [];
  }

  /**
   * Convert Background Grant Ledger to legacy bonus language format
   * Provides bonusLanguage that chargen-languages.js expects
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {string|null} - Bonus language (or null)
   */
  static getBonusLanguageForChargen(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty' || ledger.languages.fixed.length === 0) {
      return null;
    }

    // Return first language (primary background)
    return ledger.languages.fixed[0] || null;
  }

  /**
   * Convert Background Grant Ledger to actor update data format
   * Provides all grants structured for ActorEngine.updateActor()
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {Object} - updateData object for ActorEngine
   */
  static toActorUpdateData(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty') {
      return {};
    }

    const updateData = {};

    // Single-background mode: populate system fields
    if (ledger.selectedBackgroundIds.length === 1) {
      const bg = ledger.selectedBackgrounds[0];
      const categoryMap = {
        event: 'event',
        occupation: 'profession',
        planet: 'planetOfOrigin'
      };
      const systemField = categoryMap[bg.category];
      if (systemField) {
        updateData[`system.${systemField}`] = bg.name;
      }
    }

    // Multi-background mode: store full selection in notes or dedicated field
    if (ledger.multiMode && ledger.selectedBackgroundIds.length > 1) {
      const bgNames = ledger.selectedBackgroundIds
        .map(id => ledger.selectedBackgrounds.find(b => b.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      updateData['system.backgroundNotes'] = `Multi-background selection: ${bgNames}`;
    }

    // Background special abilities and conditional feat entitlements (metadata only).
    if (ledger.passiveEffects?.length) {
      updateData['system.backgroundSpecialAbilities'] = ledger.passiveEffects;
    }
    if (ledger.feats?.conditional?.length) {
      updateData['system.backgroundConditionalFeats'] = ledger.feats.conditional;
    }

    // Languages (primary)
    if (ledger.languages.fixed.length > 0) {
      updateData['system.languages'] = ledger.languages.fixed;
    }

    return updateData;
  }

  /**
   * Get class skill names from ledger for progression integration
   * Used by skills step to mark background-granted class skills
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {Array<string>} - Skill names to add to class skills
   */
  static getClassSkillsForProgression(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty') {
      return [];
    }

    // Return the granted skills (union)
    return ledger.classSkills.granted || [];
  }

  /**
   * Get class skill choices from ledger (player selection pending)
   * Used by progression framework to render skill choice UI
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {Array<Object>} - Choice descriptors for UI
   */
  static getClassSkillChoicesForProgression(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty') {
      return [];
    }

    return ledger.classSkills.choices || [];
  }

  /**
   * Get language grants from ledger for language subsystem
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {Object} - { fixed: Array, entitlements: Array }
   */
  static getLanguageGrantsForLanguageStep(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty') {
      return { fixed: [], entitlements: [] };
    }

    return {
      fixed: ledger.languages.fixed || [],
      entitlements: ledger.languages.entitlements || []
    };
  }

  /**
   * Get conditional feat grants from background event abilities.
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {Array<Object>} - Conditional feat grant descriptors
   */
  static getConditionalFeatGrantsForRuntime(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty') {
      return [];
    }

    return ledger.feats?.conditional || [];
  }

  /**
   * Get all passive effects (special abilities, etc.)
   * Marked as unresolved for Phase 2+ implementation
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {Array<Object>} - Passive effects from all selected backgrounds
   */
  static getPassiveEffectsForRuntime(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty') {
      return [];
    }

    return ledger.passiveEffects || [];
  }

  /**
   * Get all unresolved items requiring Phase 2+ work
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {Array<Object>} - Unresolved items
   */
  static getUnresolvedItems(ledger) {
    if (!ledger || ledger.mergeStatus === 'empty') {
      return [];
    }

    return ledger.unresolved || [];
  }

  /**
   * Check if ledger has unresolved items
   *
   * @param {Object} ledger - Background Grant Ledger
   * @returns {boolean} - true if any unresolved items exist
   */
  static hasUnresolved(ledger) {
    return ledger && ledger.unresolved && ledger.unresolved.length > 0;
  }

  /**
   * Log compatibility adapter usage (for audit/monitoring)
   */
  static logUsage(adapterName, ledger) {
    SWSELogger.debug('[BackgroundLedgerCompat] Adapter used:', {
      adapter: adapterName,
      backgroundCount: ledger?.selectedBackgroundIds?.length || 0,
      multiMode: ledger?.multiMode || false,
      timestamp: Date.now()
    });
  }
}

/**
 * Helper: Safely extract legacy background object for backward compatibility
 * Filters out multi-background complexity when only single selection expected
 */
export function getLegacySingleBackground(ledger) {
  return BackgroundLedgerCompatibility.toLegacyChargenFormat(ledger);
}

/**
 * Helper: Get all granted class skills from ledger
 */
export function getLedgerClassSkills(ledger) {
  return BackgroundLedgerCompatibility.getClassSkillsForProgression(ledger);
}

/**
 * Helper: Get bonus language from ledger
 */
export function getLedgerBonusLanguage(ledger) {
  return BackgroundLedgerCompatibility.getBonusLanguageForChargen(ledger);
}
