/**
 * PanelContextBuilder
 *
 * Dedicated context hydration for SVG-backed character sheet panels.
 * Each panel gets a dedicated builder method that returns a normalized,
 * contract-validated view model for its partial.
 *
 * This separates concerns:
 * - Partials read from specific panel objects only
 * - No reaching into giant sheet context
 * - All collections pre-normalized (arrays, numbers, booleans)
 * - Empty states explicit, not inferred
 */

import { PanelContextValidator } from './PanelContextValidator.js';
import { RowTransformers } from './RowTransformers.js';
import { validatePanelContract } from './PANEL_REGISTRY.js';

export class PanelContextBuilder {
  constructor(actor, sheetInstance) {
    this.actor = actor;
    this.sheet = sheetInstance;
    this.system = actor.system;
    this.derived = actor.system?.derived ?? {};
  }

  /**
   * Build the health & condition track panel context
   *
   * Contract: healthPanel
   * - hp: { value, max, percent, stateClass, canEdit }
   * - bonusHp: { value, hasBonus }
   * - shield: { max, current, rating }
   * - damageReduction: number
   * - conditionTrack: { current, max, canEdit }
   * - conditionSlots: [ { step, label, active, canEdit } ]
   * - showConditionTrack: boolean
   * - showShield: boolean
   * - showDamageReduction: boolean
   * - stateLabel: "Healthy"|"Wounded"|"Damaged"|"Critical"|"Dead"
   */
  buildHealthPanel() {
    const hp = this.system.hp || { value: 0, max: 1 };
    const hpValue = Number(hp.value) || 0;
    const hpMax = Number(hp.max) || 1;
    const hpPercent = Math.floor((hpValue / hpMax) * 100);

    // Determine HP state class
    let stateClass = 'state--healthy';
    let stateLabel = 'Healthy';
    if (hpValue <= 0) {
      stateClass = 'state--dead';
      stateLabel = 'Dead';
    } else if (this.derived.damage?.conditionHelpless) {
      stateClass = 'state--critical';
      stateLabel = 'Critical';
    } else if (hpValue <= hpMax * 0.5) {
      stateClass = 'state--critical';
      stateLabel = 'Critical';
    } else if (hpValue < hpMax) {
      const healthRatio = hpValue / hpMax;
      if (healthRatio > 0.75) {
        stateClass = 'state--wounded';
        stateLabel = 'Wounded';
      } else {
        stateClass = 'state--damaged';
        stateLabel = 'Damaged';
      }
    }

    // Bonus HP
    const bonusHpValue = Number(this.system.hpBonus) || 0;

    // Shield rating
    const shieldMax = Number(this.derived.shield?.max) || 0;
    const shieldCurrent = Number(this.derived.shield?.current) || 0;

    // Damage reduction
    const damageReduction = Number(this.system.damageReduction) || 0;

    // Condition track
    const ctCurrent = Number(this.system.conditionTrack?.current) || 0;
    const ctMax = 6;

    // Condition steps (normalized slots)
    const conditionSlots = [];
    for (let i = 0; i < ctMax; i++) {
      conditionSlots.push({
        step: i,
        label: `Level ${i}`,
        active: ctCurrent === i,
        canEdit: this.sheet.isEditable
      });
    }

    const panel = {
      hp: {
        value: hpValue,
        max: hpMax,
        percent: hpPercent,
        stateClass,
        canEdit: this.sheet.isEditable
      },
      bonusHp: {
        value: bonusHpValue,
        hasBonus: bonusHpValue > 0
      },
      shield: {
        max: shieldMax,
        current: shieldCurrent,
        rating: shieldMax > 0 ? shieldCurrent : 0,
        hasShield: shieldMax > 0
      },
      damageReduction,
      conditionTrack: {
        current: ctCurrent,
        max: ctMax,
        canEdit: this.sheet.isEditable
      },
      conditionSlots,
      stateLabel,
      stateClass,
      showConditionTrack: true,
      showShield: shieldMax > 0,
      showDamageReduction: damageReduction > 0
    };

    // Validate contract in dev mode
    if (CONFIG?.SWSE?.debug) {
      PanelContextValidator.validateHealthPanel(panel);
      validatePanelContract('healthPanel', panel);
    }

    return panel;
  }

  /**
   * Build the defenses panel context
   *
   * Contract: defensePanel
   * - defenses: [ { key, label, total, armor, ability, class, misc, canEdit } ]
   * - hasDefenses: boolean
   */
  buildDefensePanel() {
    const headerDefenses = this.derived.defenses || {};

    const defenses = ['ref', 'fort', 'will'].map(key => {
      const def = headerDefenses[key] || {};
      return {
        key,
        label: { ref: 'Reflex', fort: 'Fortitude', will: 'Will' }[key],
        total: Number(def.total) || 10,
        armorBonus: Number(def.armorBonus) || 0,
        abilityMod: Number(def.abilityMod) || 0,
        abilityModClass: def.abilityMod > 0 ? 'positive' : def.abilityMod < 0 ? 'negative' : 'zero',
        classDef: Number(def.classDef) || 0,
        miscMod: Number(def.miscMod) || 0,
        miscModClass: def.miscMod > 0 ? 'positive' : def.miscMod < 0 ? 'negative' : 'zero',
        canEdit: this.sheet.isEditable
      };
    });

    const panel = {
      defenses,
      hasDefenses: defenses.length > 0,
      canEdit: this.sheet.isEditable
    };

    if (CONFIG?.SWSE?.debug) {
      PanelContextValidator.validateDefensePanel(panel);
      validatePanelContract('defensePanel', panel);
    }

    return panel;
  }

  /**
   * Build the biography/character record header panel
   *
   * Contract: biographyPanel
   * - identity: { name, class, level, species, size, age, gender, height, weight, homeworld, profession, background, destinyPoints }
   * - biography: { ... }
   */
  buildBiographyPanel() {
    const identity = {
      name: this.actor.name || 'Unnamed',
      class: this.system.class || '—',
      level: Number(this.system.level) || 1,
      species: this.system.race || '—',
      size: this.system.size || '—',
      age: this.system.flags?.swse?.character?.age || '—',
      gender: this.system.flags?.swse?.character?.gender || '—',
      height: this.system.flags?.swse?.character?.height || '—',
      weight: this.system.flags?.swse?.character?.weight || '—',
      homeworld: this.system.planetOfOrigin || '—',
      profession: this.system.profession || '—',
      background: this.system.event || '—',
      destinyPoints: {
        value: Number(this.system.destinyPoints?.value) || 0,
        max: Number(this.system.destinyPoints?.max) || 0
      },
      canEdit: this.sheet.isEditable
    };

    const biography = {
      notes: this.system.notes || '',
      relationshipNotes: this.system.flags?.swse?.character?.relationshipNotes || '',
      canEdit: this.sheet.isEditable
    };

    const panel = {
      identity,
      biography
    };

    if (CONFIG?.SWSE?.debug) {
      PanelContextValidator.validateBiographyPanel(panel);
      validatePanelContract('biographyPanel', panel);
    }

    return panel;
  }

  /**
   * Build the inventory/gear panel context
   *
   * Contract: inventoryPanel
   * - entries: [ { id, name, img, type, quantity, weight, equipped, rarity, tags, canEdit, canDelete } ]
   * - grouped: { category: [ entries ] } (Weapons, Armor, Equipment)
   * - hasEntries: boolean
   * - totalWeight: number
   * - equippedArmor: { name, type, defenses, modifiers } | null
   */
  buildInventoryPanel() {
    const items = this.actor.items || [];

    // Normalize all inventory rows
    const entries = items
      .filter(item => ['weapon', 'equipment', 'armor'].includes(item.type))
      .map(item => RowTransformers.toInventoryRow(item, this.sheet.isEditable));

    // Group entries by type category for card-based display
    const typeToCategory = {
      weapon: 'Weapons',
      armor: 'Armor',
      equipment: 'Equipment'
    };

    const grouped = {};
    ['Weapons', 'Armor', 'Equipment'].forEach(cat => {
      grouped[cat] = [];
    });

    entries.forEach(entry => {
      const category = typeToCategory[entry.type] || 'Equipment';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(entry);
    });

    // Remove empty groups for template simplicity
    for (const category of Object.keys(grouped)) {
      if (grouped[category].length === 0) {
        delete grouped[category];
      }
    }

    // Calculate total weight
    const totalWeight = entries.reduce((sum, item) => {
      const weight = Number(item.weight) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + (weight * qty);
    }, 0);

    // Find equipped armor
    const equippedArmorItem = items.find(item =>
      item.type === 'armor' && item.system?.equipped === true
    );
    const equippedArmor = equippedArmorItem
      ? RowTransformers.toArmorSummaryRow(equippedArmorItem)
      : null;

    const panel = {
      entries,
      grouped,
      hasEntries: entries.length > 0,
      totalWeight,
      equippedArmor,
      emptyMessage: 'No equipment found.',
      canEdit: this.sheet.isEditable
    };

    if (CONFIG?.SWSE?.debug) {
      PanelContextValidator.validateInventoryPanel(panel);
      validatePanelContract('inventoryPanel', panel);
    }

    return panel;
  }

  /**
   * Build the talents/feats panel context
   *
   * Contract: talentPanel
   * - entries: [ { id, name, img, type, source, cost, tags, canEdit, canDelete } ]
   * - grouped: { groupKey: [ entries ] } if applicable
   * - hasEntries: boolean
   * - totalCount: number
   */
  buildTalentPanel() {
    const items = this.actor.items || [];

    // Normalize talent/feat rows
    const entries = items
      .filter(item => item.type === 'talent')
      .map(item => RowTransformers.toTalentRow(item, this.sheet.isEditable));

    // Group by tree if available
    const grouped = {};
    entries.forEach(entry => {
      const group = entry.group || 'Unclassified';
      grouped[group] ??= [];
      grouped[group].push(entry);
    });

    const panel = {
      entries,
      grouped,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No talents known yet.',
      canEdit: this.sheet.isEditable
    };

    if (CONFIG?.SWSE?.debug) {
      PanelContextValidator.validateTalentPanel(panel);
      validatePanelContract('talentPanel', panel);
    }

    return panel;
  }

  /**
   * Build the feats panel context
   */
  buildFeatPanel() {
    const items = this.actor.items || [];

    const entries = items
      .filter(item => item.type === 'feat')
      .map(item => RowTransformers.toFeatRow(item, this.sheet.isEditable));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No feats selected.',
      canEdit: this.sheet.isEditable
    };

    if (CONFIG?.SWSE?.debug) {
      PanelContextValidator.validateFeatPanel(panel);
      validatePanelContract('featPanel', panel);
    }

    return panel;
  }

  /**
   * Build the maneuvers panel context
   */
  buildManeuverPanel() {
    const items = this.actor.items || [];

    const entries = items
      .filter(item => item.type === 'maneuver')
      .map(item => RowTransformers.toManeuverRow(item, this.sheet.isEditable));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No maneuvers known yet.',
      canEdit: this.sheet.isEditable
    };

    if (CONFIG?.SWSE?.debug) {
      PanelContextValidator.validateManeuverPanel(panel);
      validatePanelContract('maneuverPanel', panel);
    }

    return panel;
  }

  /**
   * Assemble all panel contexts into final context object
   *
   * Returns an object keyed by panel name, where each panel is a dedicated
   * view model that partials read from exclusively.
   */
  buildAllPanels() {
    return {
      healthPanel: this.buildHealthPanel(),
      defensePanel: this.buildDefensePanel(),
      biographyPanel: this.buildBiographyPanel(),
      inventoryPanel: this.buildInventoryPanel(),
      talentPanel: this.buildTalentPanel(),
      featPanel: this.buildFeatPanel(),
      maneuverPanel: this.buildManeuverPanel()
    };
  }
}
