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
import { validatePanel } from './PanelValidators.js';

export class PanelContextBuilder {
  constructor(actor, sheetInstance) {
    this.actor = actor;
    this.sheet = sheetInstance;
    this.system = actor.system;
    this.derived = actor.system?.derived ?? {};
  }

  /**
   * Validate a panel context and enforce contract
   * In strict mode: throws on validation errors
   * Otherwise: logs warnings and continues
   */
  _validatePanelContext(panelKey, panelData) {
    const result = validatePanel(panelKey, panelData);

    if (!result.valid) {
      const isStrict = CONFIG?.SWSE?.strictMode ?? false;
      const message = `[Panel Contract] ${panelKey} validation failed: ${result.errors.join(', ')}`;

      if (isStrict) {
        console.error(message, panelData);
        throw new Error(message);
      } else {
        console.warn(message, panelData);
      }
    }

    return result;
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

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('healthPanel', panel);

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

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('defensePanel', panel);

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

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('biographyPanel', panel);

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

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('inventoryPanel', panel);

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

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('talentPanel', panel);

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

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('featPanel', panel);

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

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('maneuverPanel', panel);

    return panel;
  }

  /**
   * Build the second wind panel context
   *
   * Contract: secondWindPanel
   * - healing: number (HP recovered per use)
   * - uses: number (current uses remaining)
   * - max: number (maximum uses per rest)
   * - hasUses: boolean (uses > 0)
   * - canEdit: boolean
   */
  buildSecondWindPanel() {
    const healing = Number(this.system.secondWind?.healing) || 0;
    const uses = Number(this.system.secondWind?.uses) || 0;
    const max = Number(this.system.secondWind?.max) || 1;

    const panel = {
      healing,
      uses,
      max,
      hasUses: uses > 0,
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('secondWindPanel', panel);

    return panel;
  }

  /**
   * Build the portrait panel context
   *
   * Contract: portraitPanel
   * - img: string (image URL)
   * - name: string (character name)
   * - canEdit: boolean
   */
  buildPortraitPanel() {
    const panel = {
      img: this.actor.img || '',
      name: this.actor.name || 'Unnamed',
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('portraitPanel', panel);

    return panel;
  }

  /**
   * Build the dark side points panel context
   *
   * Contract: darkSidePanel
   * - value: number (current dark side points)
   * - max: number (maximum possible)
   * - segments: [ { index, filled, color } ]
   * - canEdit: boolean
   */
  buildDarkSidePanel() {
    const dspValue = Number(this.system.darkSide?.value) || 0;
    const dspMax = Number(this.system.darkSide?.max) || 20;

    // Build segment array (each index is a clickable point)
    const segments = [];
    for (let i = 1; i <= dspMax; i++) {
      segments.push({
        index: i,
        filled: i <= dspValue,
        color: this._getDSPColor(i, dspMax)
      });
    }

    // Danger state: when DSP is within 2 of max
    const isDanger = dspValue >= dspMax - 2;

    const panel = {
      value: dspValue,
      max: dspMax,
      segments,
      danger: isDanger,
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('darkSidePanel', panel);

    return panel;
  }

  /**
   * Generate DSP color based on gradient from dark green (0) to dark red (max)
   * Uses HSL for smooth color transition through the spectrum
   *
   * @private
   * @param {number} index - Current segment index (1-based)
   * @param {number} maxDSP - Maximum DSP value
   * @returns {string} HSL color string
   */
  _getDSPColor(index, maxDSP) {
    const ratio = index / maxDSP;

    // Hue goes from green (120) to red (0)
    const hue = 120 - (120 * ratio);

    // Saturation stays high for vibrancy
    const saturation = 80;

    // Lightness: starts moderate (45%) and darkens toward max
    const lightness = 45 - (ratio * 20);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Build the force powers panel context
   *
   * Contract: forcePowersPanel
   * - hand: Array of available powers
   * - discard: Array of discarded powers
   * - secrets: Array of force secrets
   * - techniques: Array of force techniques
   * - hasHand: boolean
   * - hasDiscard: boolean
   * - hasSecrets: boolean
   * - hasTechniques: boolean
   * - canEdit: boolean
   *
   * NOTE: This panel is a lightweight wrapper around the existing forceSuite data.
   * The actual force item objects come directly from the actor's items collection.
   */
  buildForcePowersPanel() {
    // Extract force powers from actor items
    const forcePowers = (this.actor?.items ?? []).filter(i => i.type === 'force-power');

    // Organize into hand/discard based on system.discarded flag
    const hand = forcePowers.filter(p => !p.system?.discarded);
    const discard = forcePowers.filter(p => p.system?.discarded);

    // Extract secrets and techniques from derived (pre-computed by actor engine)
    const secrets = this.derived.forceSecrets?.list ?? [];
    const techniques = this.derived.forceTechniques?.list ?? [];

    const panel = {
      hand,
      discard,
      secrets,
      techniques,
      hasHand: hand.length > 0,
      hasDiscard: discard.length > 0,
      hasSecrets: secrets.length > 0,
      hasTechniques: techniques.length > 0,
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('forcePowersPanel', panel);

    return panel;
  }

  /**
   * Build the starship maneuvers panel context
   *
   * Contract: starshipManeuversPanel (standard ledger)
   * - entries: [ { id, name, summary } ]
   * - hasEntries: boolean
   * - totalCount: number
   * - emptyMessage: string
   */
  buildStarshipManeuversPanel() {
    // Extract starship maneuvers from derived data
    const maneuvers = this.derived.starshipManeuvers?.list ?? [];

    const entries = maneuvers.map(maneuver => ({
      id: maneuver.id || '',
      name: maneuver.name || '',
      summary: maneuver.summary || ''
    }));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No starship maneuvers known.'
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('starshipManeuversPanel', panel);

    return panel;
  }

  /**
   * Build the languages panel context
   *
   * Contract: languagesPanel
   * - entries: [ languageString ]
   * - hasEntries: boolean
   */
  buildLanguagesPanel() {
    const languages = this.system.languages || [];

    const panel = {
      entries: languages,
      hasEntries: languages.length > 0
    };

    return panel;
  }

  /**
   * Build the racial abilities panel context
   *
   * Contract: racialAbilitiesPanel
   * - entries: [ { name, summary, ... } ]
   * - hasEntries: boolean
   */
  buildRacialAbilitiesPanel() {
    const racialAbilities = this.derived.racialAbilities || [];

    const panel = {
      entries: racialAbilities,
      hasEntries: racialAbilities.length > 0
    };

    return panel;
  }

  /**
   * Build the armor summary panel context
   *
   * Contract: armorSummaryPanel
   * - equippedArmor: { name, armorType, reflexBonus, fortBonus, maxDexBonus, armorCheckPenalty, speedPenalty, weight, isPowered, upgradeSlots } | null
   * - canEdit: boolean
   */
  buildArmorSummaryPanel() {
    const equippedArmorItem = this.actor.items.find(item =>
      item.type === 'armor' && item.system?.equipped === true
    );

    const panel = {
      equippedArmor: equippedArmorItem ? {
        id: equippedArmorItem.id,
        name: equippedArmorItem.name,
        armorType: equippedArmorItem.system?.armorType,
        reflexBonus: equippedArmorItem.system?.reflexBonus,
        fortBonus: equippedArmorItem.system?.fortBonus,
        maxDexBonus: equippedArmorItem.system?.maxDexBonus,
        armorCheckPenalty: equippedArmorItem.system?.armorCheckPenalty,
        speedPenalty: equippedArmorItem.system?.speedPenalty,
        weight: equippedArmorItem.system?.weight,
        isPowered: equippedArmorItem.system?.isPowered,
        upgradeSlots: equippedArmorItem.system?.upgradeSlots
      } : null,
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('armorSummaryPanel', panel);
    return panel;
  }

  /**
   * Build the equipment ledger panel context
   *
   * Contract: equipmentLedgerPanel
   * - allEquipment: [ { id, name, category, quantity, weight, cost, equipped } ]
   * - totalEquipmentWeight: string (e.g., "45 lbs")
   * - canEdit: boolean
   */
  buildEquipmentLedgerPanel() {
    let totalEquipmentWeightNum = 0;

    const allEquipment = this.actor.items
      .filter(item => ['weapon', 'armor', 'equipment'].includes(item.type))
      .map(item => {
        const itemWeight = item.system?.weight ?? 0;
        const itemQty = item.system?.quantity ?? 1;
        const itemCost = item.system?.cost ?? 0;
        totalEquipmentWeightNum += itemWeight * itemQty;
        return {
          id: item.id,
          name: item.name,
          category: item.type === 'weapon' ? 'Weapon' :
                    item.type === 'armor' ? 'Armor' : 'Equipment',
          quantity: itemQty,
          weight: itemWeight ? `${itemWeight} lbs` : '—',
          cost: itemCost > 0 ? itemCost.toLocaleString() : '—',
          equipped: item.system?.equipped ?? false
        };
      })
      .sort((a, b) => {
        if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      });

    const panel = {
      allEquipment,
      totalEquipmentWeight: totalEquipmentWeightNum > 0 ? `${totalEquipmentWeightNum} lbs` : '',
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('equipmentLedgerPanel', panel);
    return panel;
  }

  /**
   * Build the combat notes panel context
   *
   * Contract: combatNotesPanel
   * - combatNotes: string
   * - canEdit: boolean
   */
  buildCombatNotesPanel() {
    const panel = {
      combatNotes: this.actor.flags?.swse?.sheetNotes?.specialCombatActions || '',
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('combatNotesPanel', panel);
    return panel;
  }

  /**
   * Build the relationships panel context
   *
   * Contract: relationshipsPanel
   * - relationships: [ { uuid, img, name, type, notes } ]
   * - hasAvailableFollowerSlots: boolean
   * - relationshipNotes: string
   * - canEdit: boolean
   */
  buildRelationshipsPanel() {
    const relationships = (this.actor.system?.relationships ?? []).map(rel => ({
      uuid: rel.uuid || '',
      img: rel.img || '',
      name: rel.name || '',
      type: rel.type || '',
      notes: rel.notes || ''
    }));

    // Calculate available follower slots (depends on game mechanics)
    // For now, always show the button (can be customized)
    const hasAvailableFollowerSlots = true;

    const panel = {
      relationships,
      hasAvailableFollowerSlots,
      relationshipNotes: this.actor.flags?.swse?.character?.relationshipNotes || '',
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('relationshipsPanel', panel);
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
      maneuverPanel: this.buildManeuverPanel(),
      secondWindPanel: this.buildSecondWindPanel(),
      portraitPanel: this.buildPortraitPanel(),
      darkSidePanel: this.buildDarkSidePanel(),
      forcePowersPanel: this.buildForcePowersPanel(),
      starshipManeuversPanel: this.buildStarshipManeuversPanel(),
      languagesPanel: this.buildLanguagesPanel(),
      racialAbilitiesPanel: this.buildRacialAbilitiesPanel(),
      armorSummaryPanel: this.buildArmorSummaryPanel(),
      equipmentLedgerPanel: this.buildEquipmentLedgerPanel(),
      combatNotesPanel: this.buildCombatNotesPanel(),
      relationshipsPanel: this.buildRelationshipsPanel()
    };
  }
}
