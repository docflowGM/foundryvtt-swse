import { ITEM_TEMPLATE_CATALOG, calculateTemplateCost } from "/systems/foundryvtt-swse/scripts/data/gear-templates.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

/**
 * Gear Templates Engine
 *
 * First-wave implementation for weapon/armor template discovery, validation, and application.
 * Rare is tracked separately from legality; max templates per item is GM-configurable.
 */
export class GearTemplatesEngine {
  static getTemplateLimit() {
    const configured = Number(game.settings?.get('foundryvtt-swse', 'maxTemplatesPerItem') ?? 1);
    if (!Number.isFinite(configured)) return 1;
    return Math.max(1, Math.floor(configured));
  }

  static _getTemplateByKey(key) {
    return key ? ITEM_TEMPLATE_CATALOG[key] ?? null : null;
  }

  static _getAppliedTemplates(item) {
    const templates = item?.flags?.swse?.appliedTemplates;
    return Array.isArray(templates) ? templates : [];
  }

  static _getCategory(item) {
    if (!item) return 'unknown';
    if (item.type === 'lightsaber') return 'lightsaber';
    if (item.type === 'armor' || item.type === 'bodysuit') return 'armor';
    if (item.type === 'blaster') return 'weapon';
    if (item.type === 'weapon') return 'weapon';
    if (item.type === 'gear' || item.type === 'equipment') return 'gear';
    return 'unknown';
  }

  static getTemplateCost(templateKey, item = null) {
    const template = this._getTemplateByKey(templateKey);
    if (!template) return 0;
    const baseCost = Number(item?.system?.cost ?? 0) || 0;
    return calculateTemplateCost(baseCost, template);
  }

  static getAvailableTemplates(item) {
    const category = this._getCategory(item);
    if (!['weapon', 'armor'].includes(category)) return [];

    return Object.values(ITEM_TEMPLATE_CATALOG)
      .filter(template => Array.isArray(template.categories) && template.categories.includes(category))
      .filter(template => {
        if (typeof template.appliesTo === 'function') return !!template.appliesTo(item);
        return true;
      })
      .map(template => {
        const validation = this.canApplyTemplate(item, template.key);
        return {
          ...template,
          costPreview: this.getTemplateCost(template.key, item),
          incompatible: !validation.valid,
          incompatibilityReason: validation.reason || null
        };
      });
  }

  static canApplyTemplate(item, templateKey) {
    if (!item || !templateKey) {
      return { valid: false, reason: 'Item or template key missing' };
    }

    const template = this._getTemplateByKey(templateKey);
    if (!template) {
      return { valid: false, reason: 'Unknown template' };
    }

    const category = this._getCategory(item);
    if (!Array.isArray(template.categories) || !template.categories.includes(category)) {
      return { valid: false, reason: 'Template is not compatible with this item category' };
    }

    if (category === 'lightsaber' || category === 'droid' || category === 'gear') {
      return { valid: false, reason: 'Template not supported for this item category in the first-wave workbench' };
    }

    if (typeof template.appliesTo === 'function' && !template.appliesTo(item)) {
      return { valid: false, reason: 'Item does not satisfy this template’s requirements' };
    }

    const applied = this._getAppliedTemplates(item);
    const limit = this.getTemplateLimit();
    if (applied.length >= limit) {
      return { valid: false, reason: `Item already has the maximum number of templates (${limit})` };
    }

    if (applied.some(entry => entry?.templateKey === templateKey)) {
      return { valid: false, reason: 'This template is already applied to the item' };
    }

    if (!template.stackable && applied.length > 0) {
      const allowException = applied.every(existing => {
        const existingTemplate = this._getTemplateByKey(existing.templateKey);
        return existingTemplate?.stackingException && existingTemplate.stackingException === template.stackingException;
      });
      if (!allowException) {
        return { valid: false, reason: 'This template does not stack with templates already applied to the item' };
      }
    }

    return { valid: true, reason: '' };
  }

  static async applyTemplate(item, templateKey, actor = item?.actor) {
    const validation = this.canApplyTemplate(item, templateKey);
    if (!validation.valid) throw new Error(validation.reason);

    const applied = this._getAppliedTemplates(item);
    const nextApplied = [
      ...applied,
      {
        templateKey,
        appliedAt: game.time?.worldTime ?? Date.now(),
        costPaid: this.getTemplateCost(templateKey, item),
        rarity: !!this._getTemplateByKey(templateKey)?.rarity,
        effectiveRestriction: this._getTemplateByKey(templateKey)?.restriction ?? 'common'
      }
    ];

    const update = { 'flags.swse.appliedTemplates': nextApplied };
    if (actor && item?.isEmbedded) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: item.id, ...update }]);
    } else {
      // @mutation-exception: world-item - updating unowned item from world compendium
      await item.update(update);
    }
    return nextApplied;
  }

  static async removeTemplate(item, templateKey = null, actor = item?.actor) {
    const applied = this._getAppliedTemplates(item);
    let nextApplied = [];
    if (!templateKey) {
      nextApplied = [];
    } else {
      nextApplied = applied.filter(entry => entry?.templateKey !== templateKey);
    }

    const update = { 'flags.swse.appliedTemplates': nextApplied };
    if (actor && item?.isEmbedded) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: item.id, ...update }]);
    } else {
      // @mutation-exception: world-item - updating unowned item from world compendium
      await item.update(update);
    }
    return nextApplied;
  }
}
