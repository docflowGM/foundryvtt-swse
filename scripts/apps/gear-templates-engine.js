/**
 * Gear Templates Engine
 * Handles template application, validation, and cost calculation
 */


async function _updateOwnedItemOrDocument(item, updates) {
  const actor = item?.actor;
  if (actor?.updateOwnedItem) return actor.updateOwnedItem(item, updates);
  return item.update(updates);
}
import TEMPLATES from '../../data/gear-templates.json' with { type: 'json' };

export class GearTemplatesEngine {

  /**
   * Get available templates for an item
   */
  static getAvailableTemplates(item) {
    const itemType = item.type;
    const templates = [];

    if (itemType === 'weapon') {
      // Weapon-specific templates
      for (const [key, template] of Object.entries(TEMPLATES.weaponTemplates)) {
        if (this._isTemplateCompatible(item, template)) {
          templates.push({ key, ...template, category: 'weapon' });
        }
      }
      // General templates applicable to weapons
      for (const [key, template] of Object.entries(TEMPLATES.generalTemplates)) {
        if (this._isGeneralTemplateCompatibleWithWeapon(item, template)) {
          templates.push({ key, ...template, category: 'general' });
        }
      }
    }

    if (itemType === 'armor') {
      // Armor-specific templates
      for (const [key, template] of Object.entries(TEMPLATES.armorTemplates)) {
        if (this._isTemplateCompatible(item, template)) {
          templates.push({ key, ...template, category: 'armor' });
        }
      }
      // General templates applicable to armor
      for (const [key, template] of Object.entries(TEMPLATES.generalTemplates)) {
        if (this._isGeneralTemplateCompatibleWithArmor(item, template)) {
          templates.push({ key, ...template, category: 'general' });
        }
      }
    }

    return templates;
  }

  /**
   * Check if a template is compatible with an item
   */
  static _isTemplateCompatible(item, template) {
    if (!template.restrictions || template.restrictions.length === 0) {
      return true;
    }

    const system = item.system;

    for (const restriction of template.restrictions) {
      switch (restriction) {
        case 'stunOrIon':
          // Check if weapon has stun or ion capability
          if (!this._hasStunOrIon(item)) return false;
          break;
        case 'stun':
          if (!this._hasStun(item)) return false;
          break;
        case 'advancedMeleeOrSimpleMelee':
          if (!this._isAdvancedOrSimpleMelee(item)) return false;
          break;
        case 'preLegacyPowered':
          // Would need era/date check - for now allow all powered weapons
          if (!this._isPoweredWeapon(item)) return false;
          break;
        case 'blaster':
          if (!this._isBlaster(item)) return false;
          break;
        case 'simpleMelee':
          if (!this._isSimpleMelee(item)) return false;
          break;
        case 'fortBonus':
          if (!system.fortitudeBonus || system.fortitudeBonus <= 0) return false;
          break;
        default:
          return true;
      }
    }

    return true;
  }

  static _isGeneralTemplateCompatibleWithWeapon(item, template) {
    const restrictions = template.restrictions?.weapon || [];
    if (restrictions.length === 0) return true;

    for (const restriction of restrictions) {
      switch (restriction) {
        case 'rangedEnergy':
          if (!this._isRangedEnergy(item)) return false;
          break;
        case 'meleeSlashingPiercing':
          if (!this._isMeleeSlashingOrPiercing(item)) return false;
          break;
        case 'meleeNonEnergy':
          if (!this._isMeleeNonEnergy(item)) return false;
          break;
        case 'rangedStun':
          if (!this._isRangedWithStun(item)) return false;
          break;
        default:
          return true;
      }
    }

    return true;
  }

  static _isGeneralTemplateCompatibleWithArmor(item, template) {
    const restrictions = template.restrictions?.armor || [];
    if (restrictions.length === 0) return true;

    for (const restriction of restrictions) {
      switch (restriction) {
        case 'fortBonus':
          if (!item.system.fortitudeBonus || item.system.fortitudeBonus <= 0) return false;
          break;
        default:
          return true;
      }
    }

    return true;
  }

  // Helper methods for weapon type checks
  static _hasStunOrIon(item) {
    const props = item.system.properties || [];
    return props.includes('stun') || props.includes('ion') || item.system.damageType === 'ion';
  }

  static _hasStun(item) {
    const props = item.system.properties || [];
    return props.includes('stun');
  }

  static _isAdvancedOrSimpleMelee(item) {
    const category = item.system.weaponCategory?.toLowerCase() || '';
    const melee = item.system.meleeOrRanged?.toLowerCase() === 'melee';
    return melee && (category.includes('simple') || category.includes('advanced') || category.includes('exotic'));
  }

  static _isPoweredWeapon(item) {
    // Check if weapon uses energy/power
    return item.system.damageType === 'energy' || item.system.ammunition?.type === 'power pack';
  }

  static _isBlaster(item) {
    const name = item.name?.toLowerCase() || '';
    const category = item.system.weaponCategory?.toLowerCase() || '';
    return name.includes('blaster') || category.includes('blaster') || item.system.damageType === 'energy';
  }

  static _isSimpleMelee(item) {
    const category = item.system.weaponCategory?.toLowerCase() || '';
    const melee = item.system.meleeOrRanged?.toLowerCase() === 'melee';
    return melee && category.includes('simple');
  }

  static _isRangedEnergy(item) {
    const ranged = item.system.meleeOrRanged?.toLowerCase() === 'ranged';
    return ranged && item.system.damageType === 'energy';
  }

  static _isMeleeSlashingOrPiercing(item) {
    const melee = item.system.meleeOrRanged?.toLowerCase() === 'melee';
    const damageType = item.system.damageType?.toLowerCase() || '';
    return melee && (damageType.includes('slashing') || damageType.includes('piercing') || damageType === 'kinetic');
  }

  static _isMeleeNonEnergy(item) {
    const melee = item.system.meleeOrRanged?.toLowerCase() === 'melee';
    return melee && item.system.damageType !== 'energy';
  }

  static _isRangedWithStun(item) {
    const ranged = item.system.meleeOrRanged?.toLowerCase() === 'ranged';
    return ranged && this._hasStun(item);
  }

  /**
   * Calculate the cost to apply a template
   */
  static calculateTemplateCost(item, template) {
    const baseCost = Number(item.system.cost || 0);

    if (template.cost.flat !== undefined) {
      return template.cost.flat;
    }

    const percentCost = Math.floor((baseCost * template.cost.percent) / 100);
    const minimumCost = template.cost.minimum || 0;

    return Math.max(percentCost, minimumCost);
  }

  /**
   * Check if template can be applied (stacking rules)
   */
  static canApplyTemplate(item, templateKey) {
    const currentTemplate = item.system.gearTemplate;

    // No template applied yet
    if (!currentTemplate) return { valid: true };

    // Same template already applied
    if (currentTemplate === templateKey) {
      return { valid: false, reason: 'This template is already applied.' };
    }

    // Check if either template can stack
    const newTemplate = this._getTemplateByKey(templateKey);
    const oldTemplate = this._getTemplateByKey(currentTemplate);

    const canStack = newTemplate?.canStack || oldTemplate?.canStack;

    if (!canStack) {
      return {
        valid: false,
        reason: 'Templates cannot be stacked (except Prototype and Cortosis Weave/Phrik Alloy).'
      };
    }

    // Special case: can only stack Prototype + Cortosis/Phrik
    const validStackPairs = [
      ['prototype', 'cortosisWeave'],
      ['cortosisWeave', 'prototype']
    ];

    const pairValid = validStackPairs.some(pair =>
      (pair[0] === currentTemplate && pair[1] === templateKey) ||
      (pair[1] === currentTemplate && pair[0] === templateKey)
    );

    if (!pairValid) {
      return {
        valid: false,
        reason: 'Only Prototype and Cortosis Weave/Phrik Alloy can be stacked together.'
      };
    }

    return { valid: true };
  }

  /**
   * Get template by key
   */
  static _getTemplateByKey(key) {
    return TEMPLATES.weaponTemplates[key] ||
           TEMPLATES.armorTemplates[key] ||
           TEMPLATES.generalTemplates[key];
  }

  /**
   * Apply template to item
   */
  static async applyTemplate(item, templateKey) {
    const template = this._getTemplateByKey(templateKey);
    if (!template) return;

    const cost = this.calculateTemplateCost(item, template);
    const currentTemplate = item.system.gearTemplate;

    const updates = {
      'system.gearTemplate': templateKey,
      'system.templateCost': cost
    };

    // If stacking, preserve the old template
    if (currentTemplate && template.canStack) {
      updates['system.gearTemplateSecondary'] = currentTemplate;
    }

    // Mark as Rare
    if (!item.system.availability || item.system.availability === 'Standard') {
      updates['system.availability'] = 'Rare';
    }

    await _updateOwnedItemOrDocument(item, updates);

    ui.notifications.info(`${template.name} template applied to ${item.name}!`);
  }

  /**
   * Remove template from item
   */
  static async removeTemplate(item) {
    const updates = {
      'system.gearTemplate': null,
      'system.gearTemplateSecondary': null,
      'system.templateCost': 0
    };

    await _updateOwnedItemOrDocument(item, updates);
    ui.notifications.info(`Template removed from ${item.name}.`);
  }
}
