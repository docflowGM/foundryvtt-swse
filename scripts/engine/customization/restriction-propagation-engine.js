/**
 * RESTRICTION PROPAGATION ENGINE (Phase F)
 *
 * Derives effective restriction of a customized item.
 * Most restrictive of: base + installed upgrades + applied templates.
 *
 * Rare is tracked separately from restriction hierarchy.
 * An item can be:
 * - common + not rare
 * - common + rare
 * - restricted + not rare
 * - restricted + rare
 * etc.
 *
 * Restriction hierarchy:
 * common(0) < licensed(1) < restricted(2) < military(3) < illegal(4)
 *
 * Final restriction = most restrictive of all components.
 * Final rarity = true if any component is rare.
 */

import { getUpgradeDefinition } from "/systems/foundryvtt-swse/scripts/engine/customization/upgrade-catalog.js";
import { getTemplateDefinition } from "/systems/foundryvtt-swse/scripts/engine/customization/template-engine.js";
import { RESTRICTION_HIERARCHY } from "/systems/foundryvtt-swse/scripts/engine/customization/restriction-model.js";

export class RestrictionPropagationEngine {

  constructor() {
    // Hierarchy already defined in restriction-model.js
  }

  /**
   * Calculate effective restriction of a customized item.
   * Derives from: base + all installed upgrades + all templates.
   * Returns most restrictive.
   */
  getEffectiveRestriction(item) {
    try {
      const restrictions = [];

      // Base item restriction
      const baseRestriction = item.system?.restriction || 'common';
      restrictions.push(String(baseRestriction).toLowerCase());

      // Restrictions from installed upgrades
      const customState = item.flags?.["foundryvtt-swse"]?.customization || {};
      for (const upgradInstance of customState.installedUpgrades || []) {
        const upgradeDef = getUpgradeDefinition(upgradInstance.upgradeKey);
        if (upgradeDef && upgradeDef.restrictions) {
          restrictions.push(String(upgradeDef.restrictions).toLowerCase());
        }
      }

      // Restrictions from templates
      for (const templateInstance of customState.appliedTemplates || []) {
        const templateDef = getTemplateDefinition(templateInstance.templateKey);
        if (templateDef && templateDef.restriction) {
          restrictions.push(String(templateDef.restriction).toLowerCase());
        }
      }

      // Find most restrictive
      return this.getMostRestrictive(...restrictions);
    } catch (err) {
      console.error('[RestrictionPropagationEngine] getEffectiveRestriction error:', err);
      return 'common';
    }
  }

  /**
   * Check if item is rare (any component is rare).
   */
  isItemRare(item) {
    try {
      // Check if base item marked rare
      if (item.system?.rare === true) return true;

      const customState = item.flags?.["foundryvtt-swse"]?.customization || {};

      // Check upgrades (unlikely, but possible)
      for (const upgradInstance of customState.installedUpgrades || []) {
        const upgradeDef = getUpgradeDefinition(upgradInstance.upgradeKey);
        if (upgradeDef && upgradeDef.rarity === true) {
          return true;
        }
      }

      // Check templates (more common)
      for (const templateInstance of customState.appliedTemplates || []) {
        const templateDef = getTemplateDefinition(templateInstance.templateKey);
        if (templateDef && templateDef.rarity === true) {
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('[RestrictionPropagationEngine] isItemRare error:', err);
      return false;
    }
  }

  /**
   * Get full restriction profile for display/validation.
   */
  getRestrictionProfile(item) {
    try {
      const baseRestriction = item.system?.restriction || 'common';
      const effectiveRestriction = this.getEffectiveRestriction(item);
      const isRare = this.isItemRare(item);

      return {
        baseRestriction: String(baseRestriction).toLowerCase(),
        effectiveRestriction,
        changed: effectiveRestriction !== String(baseRestriction).toLowerCase(),
        isRare,
        restrictions: {
          baseRestriction: String(baseRestriction).toLowerCase(),
          upgradeRestrictions: this._getUpgradeRestrictions(item),
          templateRestrictions: this._getTemplateRestrictions(item)
        }
      };
    } catch (err) {
      console.error('[RestrictionPropagationEngine] getRestrictionProfile error:', err);
      return {
        baseRestriction: 'common',
        effectiveRestriction: 'common',
        changed: false,
        isRare: false,
        restrictions: {
          baseRestriction: 'common',
          upgradeRestrictions: [],
          templateRestrictions: []
        }
      };
    }
  }

  /**
   * Helper: determine most restrictive of multiple restrictions.
   */
  getMostRestrictive(...restrictions) {
    let mostRestrictive = 'common';
    let highestLevel = RESTRICTION_HIERARCHY.COMMON;

    for (const restriction of restrictions) {
      if (!restriction) continue;

      const level = RESTRICTION_HIERARCHY[String(restriction).toUpperCase()];
      if (level === undefined) {
        continue;
      }

      if (level > highestLevel) {
        mostRestrictive = String(restriction).toLowerCase();
        highestLevel = level;
      }
    }

    return mostRestrictive;
  }

  /**
   * Check if a restriction is more restrictive than another.
   */
  isMoreRestrictive(restriction, thanRestriction) {
    const level1 = RESTRICTION_HIERARCHY[String(restriction).toUpperCase()] ?? -1;
    const level2 = RESTRICTION_HIERARCHY[String(thanRestriction).toUpperCase()] ?? -1;
    return level1 > level2;
  }

  /**
   * Get all restrictions contributed by installed upgrades.
   */
  _getUpgradeRestrictions(item) {
    const customState = item.flags?.["foundryvtt-swse"]?.customization || {};
    const restrictions = [];

    for (const upgradInstance of customState.installedUpgrades || []) {
      const upgradeDef = getUpgradeDefinition(upgradInstance.upgradeKey);
      if (upgradeDef && upgradeDef.restrictions) {
        restrictions.push({
          upgradeKey: upgradInstance.upgradeKey,
          upgradeName: upgradeDef.name,
          restriction: String(upgradeDef.restrictions).toLowerCase()
        });
      }
    }

    return restrictions;
  }

  /**
   * Get all restrictions contributed by applied templates.
   */
  _getTemplateRestrictions(item) {
    const customState = item.flags?.["foundryvtt-swse"]?.customization || {};
    const restrictions = [];

    for (const templateInstance of customState.appliedTemplates || []) {
      const templateDef = getTemplateDefinition(templateInstance.templateKey);
      if (templateDef && templateDef.restriction) {
        restrictions.push({
          templateKey: templateInstance.templateKey,
          templateName: templateDef.name,
          restriction: String(templateDef.restriction).toLowerCase()
        });
      }
    }

    return restrictions;
  }
}

export default RestrictionPropagationEngine;
