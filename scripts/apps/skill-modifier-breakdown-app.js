/**
 * SkillModifierBreakdownApp — ApplicationV2 Migration
 *
 * Popout panel for viewing and editing skill modifier breakdown.
 * Displays canonical modifiers from ModifierEngine (read-only).
 * Allows adding/removing/toggling custom modifiers.
 *
 * Architecture:
 * - Reads from: actor.system.derived.modifiers[`skill.${skillKey}`]
 * - Writes to: actor.system.customModifiers
 * - Never does math (always through ModifierEngine)
 * - AppV2 compliant
 */

import BaseSWSEAppV2 from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/engine/effects/modifiers/ModifierEngine.js";
import { ModifierTypes } from "/systems/foundryvtt-swse/engine/effects/modifiers/ModifierTypes.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class SkillModifierBreakdownApp extends BaseSWSEAppV2 {
  constructor(actor, skillKey, options = {}) {
    super(options);

    this.actor = actor;
    this.skillKey = String(skillKey).trim();
    this.skillName = actor?.system?.skills?.[this.skillKey]?.name || this.skillKey;

    // Instance state
    this.derivedModifiers = null;
    this.customModifiers = [];
    this.isAddingCustom = false;
    this.newCustomData = { sourceName: '', type: 'untyped', value: 0 };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'skill-modifier-breakdown',
      title: 'Skill Modifier Breakdown',
      template: 'modules/foundryvtt-swse/templates/apps/skill-modifier-breakdown.hbs',
      position: {
        width: 360,
        height: 'auto'
      },
      window: {
        resizable: false,
        draggable: true
      },
      classes: ['skill-modifier-breakdown']
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const target = `skill.${this.skillKey}`;

    // Get canonical modifiers from derived data
    const derivedMods = this.actor?.system?.derived?.modifiers?.breakdown?.[target];
    this.derivedModifiers = derivedMods || { total: 0, applied: [], breakdown: [] };

    // Get custom modifiers for this target
    const allCustom = Array.isArray(this.actor?.system?.customModifiers)
      ? this.actor.system.customModifiers
      : [];
    this.customModifiers = allCustom.filter(m => m.target === target);

    return foundry.utils.mergeObject(context, {
      actor: this.actor,
      skillKey: this.skillKey,
      skillName: this.skillName,
      target: target,
      total: this.derivedModifiers.total || 0,

      // Applied modifiers from ModifierEngine
      appliedModifiers: (this.derivedModifiers.applied || []).map(mod => ({
        id: mod.id,
        sourceName: mod.sourceName,
        source: mod.source,
        type: mod.type,
        value: mod.value,
        description: mod.description,
        isCustom: mod.source === 'custom',
        canRemove: mod.source === 'custom' // Only custom can be removed
      })),

      // Custom modifiers for editing
      customModifiers: this.customModifiers.map((mod, idx) => ({
        index: idx,
        id: mod.id,
        sourceName: mod.sourceName,
        type: mod.type,
        value: mod.value,
        enabled: mod.enabled !== false
      })),

      // UI state
      isAddingCustom: this.isAddingCustom,
      newCustomData: this.newCustomData,
      modifierTypes: Object.values(ModifierTypes.ModifierType),

      // Helpers
      hasModifiers: (this.derivedModifiers.applied || []).length > 0,
      hasCustom: this.customModifiers.length > 0
    });
  }

  wireEvents() {
    const root = this.element;

    // Add Custom Modifier button
    const addBtn = root.querySelector('[data-action="add-custom"]');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.isAddingCustom = true;
        this.render();
      });
    }

    // Cancel Add Custom
    const cancelBtn = root.querySelector('[data-action="cancel-custom"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.isAddingCustom = false;
        this.newCustomData = { sourceName: '', type: 'untyped', value: 0 };
        this.render();
      });
    }

    // Submit new custom modifier
    const submitBtn = root.querySelector('[data-action="submit-custom"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._submitCustomModifier();
      });
    }

    // Remove custom modifier
    root.querySelectorAll('[data-action="remove-custom"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const index = Number(e.currentTarget.dataset.index);
        this._removeCustomModifier(index);
      });
    });

    // Toggle custom modifier enabled state
    root.querySelectorAll('[data-action="toggle-custom"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const index = Number(e.currentTarget.dataset.index);
        this._toggleCustomModifier(index);
      });
    });

    // Update form fields in add custom section
    const sourceInput = root.querySelector('input[name="sourceName"]');
    if (sourceInput) {
      sourceInput.addEventListener('change', (e) => {
        this.newCustomData.sourceName = e.currentTarget.value;
      });
    }

    const typeSelect = root.querySelector('select[name="type"]');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        this.newCustomData.type = e.currentTarget.value;
      });
    }

    const valueInput = root.querySelector('input[name="value"]');
    if (valueInput) {
      valueInput.addEventListener('change', (e) => {
        this.newCustomData.value = Number(e.currentTarget.value) || 0;
      });
    }
  }

  /**
   * Submit new custom modifier
   * @private
   */
  async _submitCustomModifier() {
    const { sourceName, type, value } = this.newCustomData;

    // Validate
    if (!sourceName || sourceName.trim() === '') {
      ui.notifications.warn('Source name required');
      return;
    }

    if (!Object.values(ModifierTypes.ModifierType).includes(type)) {
      ui.notifications.warn('Invalid modifier type');
      return;
    }

    if (!Number.isFinite(value)) {
      ui.notifications.warn('Value must be a number');
      return;
    }

    // Create custom modifier
    const customMod = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: 'custom',
      sourceName: sourceName.trim(),
      target: `skill.${this.skillKey}`,
      type: type,
      value: value,
      enabled: true
    };

    // Add to actor
    const customModifiers = Array.isArray(this.actor.system.customModifiers)
      ? [...this.actor.system.customModifiers]
      : [];
    customModifiers.push(customMod);

    // Update actor (triggers prepareDerivedData → ModifierEngine runs)
    await ActorEngine.updateActor(this.actor, { 'system.customModifiers': customModifiers });

    // Reset form
    this.isAddingCustom = false;
    this.newCustomData = { sourceName: '', type: 'untyped', value: 0 };

    ui.notifications.info(`Added custom modifier: ${sourceName}`);
    this.render();
  }

  /**
   * Remove custom modifier
   * @private
   */
  async _removeCustomModifier(index) {
    if (index < 0 || index >= this.customModifiers.length) {
      ui.notifications.error('Invalid custom modifier index');
      return;
    }

    const modToRemove = this.customModifiers[index];
    const customModifiers = Array.isArray(this.actor.system.customModifiers)
      ? this.actor.system.customModifiers.filter(m => m.id !== modToRemove.id)
      : [];

    await ActorEngine.updateActor(this.actor, { 'system.customModifiers': customModifiers });

    ui.notifications.info(`Removed custom modifier: ${modToRemove.sourceName}`);
    this.render();
  }

  /**
   * Toggle custom modifier enabled state
   * @private
   */
  async _toggleCustomModifier(index) {
    if (index < 0 || index >= this.customModifiers.length) {
      ui.notifications.error('Invalid custom modifier index');
      return;
    }

    const customModifiers = Array.isArray(this.actor.system.customModifiers)
      ? this.actor.system.customModifiers.map((m, i) => {
          if (i === index) {
            return { ...m, enabled: m.enabled !== false ? false : true };
          }
          return m;
        })
      : [];

    await ActorEngine.updateActor(this.actor, { 'system.customModifiers': customModifiers });
    this.render();
  }
}

export default SkillModifierBreakdownApp;
