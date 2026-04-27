/**
 * Customization Safety & Validation Engine
 *
 * Handles edge cases, legacy data recovery, and runtime safety for first-wave customization.
 *
 * This engine is the authority for:
 * - Defensive legacy data normalization
 * - Validation at apply-time (not just preview-time)
 * - Duplicate apply protection
 * - Template cap enforcement (engine-level, not UI-only)
 * - Stripped-area lockout verification
 * - Overflow state detection and recovery
 *
 * Key principle: Apply revalidates fully, even after preview. UI state is not trusted.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/core/logger.js';
import { MELEE_UPGRADES } from '/systems/foundryvtt-swse/scripts/data/melee-upgrades.js';
import { GEAR_MODS } from '/systems/foundryvtt-swse/scripts/data/gear-mods.js';
import { ARMOR_UPGRADES } from '/systems/foundryvtt-swse/scripts/data/armor-upgrades.js';

// Track in-flight mutations to prevent duplicate apply
const MUTATION_IN_FLIGHT = new Map();

const SAFE_DEFAULTS = {
  maxTemplatesPerItem: 1,
  supportedCategories: ['weapon', 'blaster', 'armor', 'gear'],
  strippedAreaTypes: ['damage', 'range', 'design', 'stun_setting', 'autofire', 'defensive_material', 'joint_protection']
};

export class SafetyEngine {
  /**
   * Normalize customization state from potentially malformed item data
   * Defensive: preserves usable data, normalizes to safe defaults for missing/invalid data
   * Does NOT mutate the item; just normalizes the state object
   */
  static normalizeCustomizationState(item) {
    const warnings = [];
    const customization = item?.flags?.['foundryvtt-swse']?.customization;

    // If no customization flag exists, recover from legacy data sources
    if (!customization) {
      const legacyState = this.#recoverFromLegacySources(item, warnings);
      return {
        success: true,
        normalizedState: legacyState,
        warnings,
        isLegacy: warnings.length > 0,
        isMalformed: false
      };
    }

    // Normalize installed upgrades
    const installedUpgrades = this.#normalizeUpgradeInstances(
      customization.installedUpgrades ?? [],
      warnings
    );

    // Normalize applied templates with cap enforcement
    const appliedTemplates = this.#normalizeTemplateInstances(
      customization.appliedTemplates ?? [],
      warnings
    );

    // Check for template overflow
    const maxTemplates = SAFE_DEFAULTS.maxTemplatesPerItem;
    if (appliedTemplates.length > maxTemplates) {
      warnings.push(`Template cap exceeded: ${appliedTemplates.length} templates, max is ${maxTemplates}`);
    }

    // Normalize structural state
    const structural = {
      sizeIncreaseApplied: !!customization.structural?.sizeIncreaseApplied,
      strippedAreas: Array.isArray(customization.structural?.strippedAreas)
        ? customization.structural.strippedAreas.filter(area => SAFE_DEFAULTS.strippedAreaTypes.includes(area))
        : []
    };

    // Normalize operation log
    const operationLog = Array.isArray(customization.operationLog) ? customization.operationLog : [];

    const isMalformed = warnings.length > 0;

    return {
      success: true,
      normalizedState: {
        structural,
        installedUpgrades,
        appliedTemplates,
        operationLog
      },
      warnings,
      isLegacy: false,
      isMalformed
    };
  }

  /**
   * Validate a customization apply operation before committing
   * This runs AFTER preview to catch any changes made to the item between preview and apply
   */
  static validateCustomizationApply(item, operation, context = {}) {
    const warnings = [];
    const validationErrors = [];
    let blockingReason = null;

    // Check if this item's category is supported
    const category = item.type || item.system?.category;
    if (!SAFE_DEFAULTS.supportedCategories.includes(category)) {
      blockingReason = `Category '${category}' is not supported for this customization system`;
      return { success: false, warnings, validationErrors: [blockingReason], blockingReason };
    }

    // Normalize current state to detect any issues
    const normalization = this.normalizeCustomizationState(item);
    if (normalization.isMalformed) {
      warnings.push(...normalization.warnings);
    }

    // Validate operation type
    if (!operation || !operation.type) {
      blockingReason = 'Invalid operation: missing type';
      return { success: false, warnings, validationErrors: [blockingReason], blockingReason };
    }

    // Apply-type-specific validation
    switch (operation.type) {
      case 'install':
        return this.#validateInstallOperation(item, operation, normalization.normalizedState, warnings, validationErrors);
      case 'remove':
        return this.#validateRemoveOperation(item, operation, normalization.normalizedState, warnings, validationErrors);
      case 'applyTemplate':
        return this.#validateTemplateOperation(item, operation, normalization.normalizedState, warnings, validationErrors);
      default:
        blockingReason = `Unknown operation type: ${operation.type}`;
        return { success: false, warnings, validationErrors: [blockingReason], blockingReason };
    }
  }

  /**
   * Guard against in-flight mutations to prevent duplicate apply from double-click
   */
  static guardAgainstDuplicateApply(itemId, operationKey) {
    const key = `${itemId}:${operationKey}`;
    if (MUTATION_IN_FLIGHT.has(key)) {
      return {
        allowed: false,
        reason: 'Operation already in progress'
      };
    }
    return { allowed: true };
  }

  /**
   * Mark an operation as in-flight
   */
  static markOperationInFlight(itemId, operationKey) {
    const key = `${itemId}:${operationKey}`;
    MUTATION_IN_FLIGHT.set(key, Date.now());
    // Auto-cleanup after 30 seconds
    setTimeout(() => MUTATION_IN_FLIGHT.delete(key), 30000);
  }

  /**
   * Clear in-flight mark (call on success or error)
   */
  static clearOperationInFlight(itemId, operationKey) {
    const key = `${itemId}:${operationKey}`;
    MUTATION_IN_FLIGHT.delete(key);
  }

  /**
   * Check if a category is supported for first-wave customization
   */
  static isCategorySupported(categoryOrItem) {
    let category = categoryOrItem;
    if (categoryOrItem && typeof categoryOrItem === 'object') {
      category = categoryOrItem.type || categoryOrItem.system?.category;
    }
    return SAFE_DEFAULTS.supportedCategories.includes(category);
  }

  /**
   * Get category validation result with message
   */
  static validateCategory(item) {
    const category = item?.type || item?.system?.category;
    if (!category) {
      return { allowed: false, reason: 'unknown_category', blockingReason: 'Item category is not defined' };
    }
    if (!this.isCategorySupported(category)) {
      return { allowed: false, reason: `unsupported_category_${category}`, blockingReason: `Category '${category}' is not supported for customization` };
    }
    return { allowed: true };
  }

  /**
   * Check if an item has overflow state (used for UI warnings)
   */
  static getOverflowState(item, slotState) {
    if (!slotState) return null;

    const overflow = [];
    if (slotState.usedSlots > slotState.totalAvailable) {
      overflow.push(`Slot overflow: ${slotState.usedSlots}/${slotState.totalAvailable} slots used`);
    }

    const customization = item?.flags?.['foundryvtt-swse']?.customization;
    if (customization?.appliedTemplates?.length > SAFE_DEFAULTS.maxTemplatesPerItem) {
      overflow.push(`Template cap exceeded: ${customization.appliedTemplates.length} templates (max: ${SAFE_DEFAULTS.maxTemplatesPerItem})`);
    }

    return overflow.length > 0 ? { overflow, isCapped: true } : null;
  }

  /**
   * Get summary of normalization issues for user display
   */
  static getNormalizationSummary(item) {
    const result = this.normalizeCustomizationState(item);
    if (!result.isMalformed) {
      return null;
    }

    return {
      message: 'This item has legacy or incomplete customization data',
      details: result.warnings,
      isMalformed: true,
      isRecovered: true
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE VALIDATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  static #recoverFromLegacySources(item, warnings) {
    // Recover strippedAreas from legacy strippedFeatures
    const strippedFeatures = item?.system?.strippedFeatures ?? {};
    const strippedAreas = [];
    if (strippedFeatures.damage) strippedAreas.push('damage');
    if (strippedFeatures.range) strippedAreas.push('range');
    if (strippedFeatures.design) strippedAreas.push('design');
    if (strippedFeatures.stun) strippedAreas.push('stun_setting');
    if (strippedFeatures.autofire) strippedAreas.push('autofire');
    if (strippedFeatures.defensiveMaterial) strippedAreas.push('defensive_material');
    if (strippedFeatures.jointProtection) strippedAreas.push('joint_protection');

    // Recover installed upgrades from legacy system.installedUpgrades
    const legacyInstalled = Array.isArray(item?.system?.installedUpgrades) ? item.system.installedUpgrades.map((upg, index) => ({
      instanceId: upg.id || `legacy_${index}`,
      upgradeKey: upg.key || upg.name?.toLowerCase?.().replace(/[^a-z0-9]+/g, '_') || `legacy_${index}`,
      slotCost: Number(upg.slotsUsed) || 0,
      operationCost: Number(upg.cost) || 0,
      restriction: upg.restriction || 'common',
      installedAt: 0,
      installSource: 'legacy',
      appliedEffects: {}
    })) : [];

    // Recover installed upgrades from legacy flag keys
    const legacyFlagKeys = [];
    for (const key of (item?.flags?.swse?.meleeUpgrades ?? [])) {
      const entry = MELEE_UPGRADES[key];
      legacyFlagKeys.push({
        instanceId: `legacy_flag_${key}`,
        upgradeKey: key,
        slotCost: 1,
        operationCost: Number(entry?.costCredits) || 0,
        restriction: entry?.restriction || 'common',
        installedAt: 0,
        installSource: 'legacy',
        appliedEffects: {}
      });
    }
    for (const key of (item?.flags?.swse?.gearMods ?? [])) {
      const entry = GEAR_MODS[key];
      legacyFlagKeys.push({
        instanceId: `legacy_flag_${key}`,
        upgradeKey: key,
        slotCost: 1,
        operationCost: Number(entry?.costCredits) || 0,
        restriction: entry?.restriction || 'common',
        installedAt: 0,
        installSource: 'legacy',
        appliedEffects: {}
      });
    }
    for (const key of (item?.flags?.swse?.armorUpgrades ?? [])) {
      const entry = ARMOR_UPGRADES[key];
      legacyFlagKeys.push({
        instanceId: `legacy_flag_${key}`,
        upgradeKey: key,
        slotCost: 1,
        operationCost: Number(entry?.costCredits) || 0,
        restriction: entry?.restriction || 'common',
        installedAt: 0,
        installSource: 'legacy',
        appliedEffects: {}
      });
    }

    // Merge and deduplicate
    const mergedInstalled = [...legacyInstalled];
    for (const inst of legacyFlagKeys) {
      if (!mergedInstalled.some(existing => existing.upgradeKey === inst.upgradeKey)) {
        mergedInstalled.push(inst);
        warnings.push(`Recovered legacy flag upgrade: ${inst.upgradeKey}`);
      }
    }

    // Recover applied templates from legacy system fields
    const appliedTemplates = [item?.system?.gearTemplate, item?.system?.gearTemplateSecondary].filter(Boolean).map((templateKey, index) => ({
      instanceId: `legacy_template_${index}`,
      templateKey,
      source: item?.system?.restriction || 'common',
      stackOrder: index,
      effectiveRestriction: item?.system?.restriction || 'common',
      operationCost: Number(item?.system?.templateCost) || 0,
      appliedEffects: {}
    }));

    if (appliedTemplates.length > 0) {
      warnings.push(`Recovered ${appliedTemplates.length} legacy template(s)`);
    }

    return {
      structural: {
        sizeIncreaseApplied: !!item?.system?.sizeIncreaseApplied,
        strippedAreas
      },
      installedUpgrades: mergedInstalled,
      appliedTemplates,
      operationLog: []
    };
  }

  static #normalizeUpgradeInstances(instances, warnings) {
    if (!Array.isArray(instances)) {
      warnings.push('Invalid installedUpgrades data: not an array');
      return [];
    }

    const normalized = [];
    const seenIds = new Set();

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      if (!inst) continue;

      const instanceId = inst.instanceId || inst.id || `legacy_upgrade_${i}`;

      // Detect duplicates
      if (seenIds.has(instanceId)) {
        warnings.push(`Duplicate upgrade instance ID detected: ${instanceId}`);
        continue;
      }
      seenIds.add(instanceId);

      // Normalize fields with safe defaults
      normalized.push({
        instanceId,
        upgradeKey: inst.upgradeKey || inst.key || 'unknown',
        slotCost: Number(inst.slotCost ?? 0),
        operationCost: Number(inst.operationCost ?? inst.cost ?? 0),
        restriction: inst.restriction || 'common',
        installedAt: Number(inst.installedAt ?? 0),
        installSource: inst.installSource || 'unknown',
        appliedEffects: inst.appliedEffects || {}
      });
    }

    return normalized;
  }

  static #normalizeTemplateInstances(instances, warnings) {
    if (!Array.isArray(instances)) {
      warnings.push('Invalid appliedTemplates data: not an array');
      return [];
    }

    const normalized = [];
    const seenIds = new Set();

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      if (!inst) continue;

      const instanceId = inst.instanceId || `legacy_template_${i}`;

      // Detect duplicates
      if (seenIds.has(instanceId)) {
        warnings.push(`Duplicate template instance ID detected: ${instanceId}`);
        continue;
      }
      seenIds.add(instanceId);

      // Normalize fields
      normalized.push({
        instanceId,
        templateKey: inst.templateKey || 'unknown',
        source: inst.source || inst.restriction || 'common',
        stackOrder: Number(inst.stackOrder ?? i),
        effectiveRestriction: inst.effectiveRestriction || 'common',
        operationCost: Number(inst.operationCost ?? 0),
        appliedEffects: inst.appliedEffects || {}
      });
    }

    return normalized;
  }

  static #validateInstallOperation(item, operation, customizationState, warnings, errors) {
    const { upgradeKey, slotCost } = operation;

    // Check for duplicate install
    if (customizationState.installedUpgrades.some(upg => upg.upgradeKey === upgradeKey)) {
      return {
        success: false,
        warnings,
        validationErrors: [`Upgrade '${upgradeKey}' is already installed`],
        blockingReason: 'Duplicate upgrade'
      };
    }

    // Check slot availability
    const totalSlots = customizationState.installedUpgrades.reduce((sum, upg) => sum + (upg.slotCost ?? 0), 0);
    if (totalSlots + slotCost > 10) {  // Assume 10-slot standard; should be parameterized
      return {
        success: false,
        warnings,
        validationErrors: [`Installing this upgrade would exceed available slots`],
        blockingReason: 'Insufficient slots'
      };
    }

    return { success: true, warnings, validationErrors: [], blockingReason: null };
  }

  static #validateRemoveOperation(item, operation, customizationState, warnings, errors) {
    const { instanceId } = operation;

    // Check that instance exists
    if (!customizationState.installedUpgrades.some(upg => upg.instanceId === instanceId)) {
      return {
        success: false,
        warnings,
        validationErrors: [`Upgrade instance '${instanceId}' not found`],
        blockingReason: 'Instance not found'
      };
    }

    return { success: true, warnings, validationErrors: [], blockingReason: null };
  }

  static #validateTemplateOperation(item, operation, customizationState, warnings, errors) {
    const { templateKey, type: opType } = operation;
    const maxTemplates = SAFE_DEFAULTS.maxTemplatesPerItem;

    // Check template cap if applying
    if (opType === 'applyTemplate' || opType === 'apply') {
      if (customizationState.appliedTemplates.length >= maxTemplates) {
        return {
          success: false,
          warnings,
          validationErrors: [`Maximum templates (${maxTemplates}) already applied`],
          blockingReason: 'Template cap reached'
        };
      }

      // Check for duplicate
      if (customizationState.appliedTemplates.some(t => t.templateKey === templateKey)) {
        return {
          success: false,
          warnings,
          validationErrors: [`Template '${templateKey}' is already applied`],
          blockingReason: 'Duplicate template'
        };
      }
    }

    return { success: true, warnings, validationErrors: [], blockingReason: null };
  }
}
