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
import { buildHpViewModel, buildDefensesViewModel, buildAttributesViewModel, buildIdentityViewModel } from '/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/context.js';

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
    // PHASE 7.5: Consume canonical HP view-model instead of computing inline
    // buildHpViewModel is the single source of truth for HP data
    // This ensures header HP bar, HP numeric display, and resource panel all use the same values
    const hpViewModel = buildHpViewModel(this.actor);
    const hpValue = hpViewModel.current;
    const hpMax = hpViewModel.max;
    const hpTemp = hpViewModel.temp;
    const hpPercent = hpViewModel.percent;
    const tempPercent = Math.max(0, Math.min(100, Math.round((hpTemp / hpMax) * 100)));

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

    const bonusHpValue = Number(this.system.hpBonus) || 0;
    const shieldCurrent = Number(this.derived.shield?.current ?? this.system.currentSR ?? 0) || 0;
    const shieldMax = Number(this.derived.shield?.max ?? this.system.shieldRating ?? shieldCurrent) || 0;
    const shieldPercent = shieldMax > 0 ? Math.max(0, Math.min(100, Math.round((shieldCurrent / shieldMax) * 100))) : 0;
    const damageReductionValue = Number(this.system.damageReduction ?? 0) || 0;

    const ctCurrent = Number(this.system.conditionTrack?.current) || 0;
    const ctMax = 6;

    const conditionDefinitions = [
      { step: 0, label: 'Normal', description: 'No penalties.', severityClass: 'severity-normal', penalty: 0 },
      { step: 1, label: '-1', description: 'To all defenses, attacks, skill, and ability checks.', severityClass: 'severity-low', penalty: -1 },
      { step: 2, label: '-2', description: 'To all defenses, attacks, skill, and ability checks.', severityClass: 'severity-mid', penalty: -2 },
      { step: 3, label: '-5', description: 'To all defenses, attacks, skill, and ability checks.', severityClass: 'severity-high', penalty: -5 },
      { step: 4, label: '-10', description: 'To all defenses, attacks, skill, and ability checks. Move at half speed.', severityClass: 'severity-critical', penalty: -10 },
      { step: 5, label: 'Helpless', description: 'Unconscious or disabled.', severityClass: 'severity-helpless', penalty: null }
    ];

    const conditionSlots = conditionDefinitions.map(def => ({
      ...def,
      active: ctCurrent === def.step,
      canEdit: this.sheet.isEditable
    }));

    const filledSegments = Math.max(0, Math.min(20, Math.round((hpValue / hpMax) * 20)));
    const hpSegments = Array.from({ length: 20 }, (_, index) => {
      let colorClass = 'seg--green';
      if (index < 4) colorClass = 'seg--red';
      else if (index < 8) colorClass = 'seg--orange';
      else if (index < 12) colorClass = 'seg--yellow';
      else if (index < 16) colorClass = 'seg--yellowgreen';
      return {
        index,
        filled: index < filledSegments,
        colorClass
      };
    });

    const currentConditionPenalty = conditionDefinitions.find(def => def.step === ctCurrent) ?? conditionDefinitions[0];

    const panel = {
      hp: {
        value: hpValue,
        max: hpMax,
        temp: hpTemp,
        percent: hpPercent,
        tempPercent,
        stateClass,
        canEdit: this.sheet.isEditable,
        segments: hpSegments
      },
      bonusHp: {
        value: bonusHpValue,
        hasBonus: bonusHpValue > 0
      },
      shield: {
        max: shieldMax,
        current: shieldCurrent,
        rating: String(shieldCurrent),
        hasShield: shieldMax > 0,
        percent: shieldPercent
      },
      damageReduction: damageReductionValue > 0 ? String(damageReductionValue) : null,
      damageReductionValue,
      conditionTrack: {
        current: ctCurrent,
        max: ctMax,
        canEdit: this.sheet.isEditable
      },
      conditionSlots,
      currentConditionPenalty,
      stateLabel,
      stateClass,
      showConditionTrack: true,
      showShield: true,
      showDamageReduction: true
    };

    this._validatePanelContext('healthPanel', panel);

    return panel;
  }

  /**
   * Build the defenses panel context
   *
   * Contract: defensePanel
   * - defenses: [ { key, label, total, armorBonus, abilityMod, abilityModClass, classDef, miscMod, miscModClass, canEdit } ]
   * - hasDefenses: boolean
   * - canEdit: boolean
   *
   * DATA SOURCE: Reuses existing system.defenses + system.attributes
   * - Does NOT recompute math (all from stored engine data)
   * - Transforms shape only for template compatibility
   */
  buildDefensePanel() {
    // PHASE 7.5: Consume canonical defenses view-model instead of computing inline
    // buildDefensesViewModel is the single source of truth for defense data
    // This ensures header defenses, defense partial, and all combat displays use the same values
    const defensesViewModel = buildDefensesViewModel(this.derived);

    const system = this.system;
    const defenseKeyMap = [
      { key: 'fort', derivedKey: 'fortitude', label: 'Fortitude', abilityKey: 'str' },
      { key: 'ref', derivedKey: 'reflex', label: 'Reflex', abilityKey: 'dex' },
      { key: 'will', derivedKey: 'will', label: 'Will', abilityKey: 'wis' }
    ];

    const defenses = defenseKeyMap.map(({ key, derivedKey, label, abilityKey }) => {
      const defenseData = system.defenses?.[key] || {};
      const defenseViewModel = defensesViewModel[key];

      // Get ability modifier from system.attributes
      const abilityMod = system.attributes?.[abilityKey]?.mod ?? 0;

      // Get stored components
      const armorBonus = Number(defenseData.armorBonus) || 0;
      const classDef = Number(defenseData.classBonus) || 0;
      const miscMod = Number(defenseData.miscMod) || 0;
      // Use total from canonical view-model (same as header uses)
      const total = defenseViewModel.total ?? 10;

      // Derive CSS classes from modifier values
      const abilityModClass = abilityMod > 0 ? 'mod--positive' : abilityMod < 0 ? 'mod--negative' : 'mod--zero';
      const miscModClass = miscMod > 0 ? 'mod--positive' : miscMod < 0 ? 'mod--negative' : 'mod--zero';

      return {
        key,
        label,
        total,
        armorBonus,
        abilityMod,
        abilityModClass,
        classDef,
        miscMod,
        miscModClass,
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
    // PHASE 7.5: Consume canonical identity view-model instead of rebuilding
    // buildIdentityViewModel is the single source of truth for identity data
    // All identity displays use the same prepared bundle
    const identityViewModel = buildIdentityViewModel(this.actor);

    const identity = {
      ...identityViewModel,
      player: this.system.flags?.swse?.character?.player || '—',
      canEdit: this.sheet.isEditable
    };

    // Contract requires biography to be a string
    const biography = String(this.system.notes || '');

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
      // Filter out placeholder talents: those with default "New Talent" name and no description
      .filter(item => {
        const isPlaceholder = (item.name === 'New Talent' || item.name === 'NEW TALENT') &&
                              (!item.system?.description || item.system.description.trim() === '');
        return !isPlaceholder;
      })
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
      // Filter out placeholder feats: those with default "New Feat" name and no description
      .filter(item => {
        const isPlaceholder = (item.name === 'New Feat' || item.name === 'NEW FEAT') &&
                            (!item.system?.description || item.system.description.trim() === '');
        return !isPlaceholder;
      })
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
    const maxHp = Number(this.system.hp?.max) || 1;
    const baseHealing = Math.ceil(maxHp * 0.25);
    const storedHealing = Number(this.system.secondWind?.healing) || 0;
    const healing = storedHealing > 0 ? storedHealing : baseHealing;
    const uses = Number(this.system.secondWind?.uses) || 0;
    const max = Number(this.system.secondWind?.max) || 1;

    const panel = {
      baseHealing,
      healing,
      totalHealing: healing,
      uses,
      max,
      hasUses: uses > 0,
      canEdit: this.sheet.isEditable
    };

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
   * Build the combat stats panel context
   *
   * Contract: combatStatsPanel
   * - speed: { value, label }
   * - initiative: { value, label, skillKey }
   * - perception: { value, label, skillKey }
   * - baseAttack: { value, label }
   * - canEdit: boolean
   */
  buildCombatStatsPanel() {
    const speed = {
      value: Number(this.system.speed?.value) || 0,
      label: `${this.system.speed?.value || 0} ft.`
    };

    // Initiative: derived.initiative.total (from DerivedCalculator)
    const initiativeTotal = Number(this.derived.initiative?.total) || 0;
    const initiative = {
      value: initiativeTotal,
      label: `+${initiativeTotal}`,
      skillKey: 'initiative'
    };

    // Perception: derived.skills.perception.total (computed skill)
    const perceptionTotal = Number(this.derived.skills?.perception?.total) || 0;
    const perception = {
      value: perceptionTotal,
      label: `+${perceptionTotal}`,
      skillKey: 'perception'
    };

    // Base Attack Bonus: derived.bab (from BABCalculator)
    const babTotal = Number(this.derived.bab) || 0;
    const baseAttack = {
      value: babTotal,
      label: `+${babTotal}`
    };

    const panel = {
      speed,
      initiative,
      perception,
      baseAttack,
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('combatStatsPanel', panel);
    return panel;
  }

  /**
   * Build the resources panel context (Combat Metrics & Resources)
   *
   * PHASE 6: Canonical builder for all combat metrics and heroic resources
   * Consolidates mixed-source context into single display model
   *
   * Contract: resourcesPanel
   * - combatMetrics: { speed, initiative, perception, bab, grappleBonus, damageThreshold }
   * - resources: { forcePoints, destinyPoints, forcePointDie }
   */
  buildResourcesPanel() {
    const system = this.system;
    const derived = this.derived;

    // COMBAT METRICS - engine-owned sources
    const speed = Number(system.speed) || 0;
    const initiativeTotal = Number(derived.initiative?.total) || 0;
    const perceptionTotal = Number(derived.skills?.perception?.total) || 0;

    // BAB: system.baseAttackBonus is the authoritative editable field
    // Fallback to derived.bab only if system value not set
    const bab = Number(system.baseAttackBonus ?? derived.bab) || 0;

    const grappleBonus = Number(derived.grappleBonus) || 0;
    const damageThreshold = Number(derived.damageThreshold) || 0;

    // HEROIC RESOURCES - engine-owned sources
    const forcePointsValue = Number(system.forcePoints?.value) || 0;
    const forcePointsMax = Number(system.forcePoints?.max) || 0;
    const destinyPointsValue = Number(system.destinyPoints?.value) || 0;
    const destinyPointsMax = Number(system.destinyPoints?.max) || 0;

    // Force Point Die configuration (if system has it)
    const forcePointDie = system.forcePointDie || 'd6';

    const panel = {
      combatMetrics: {
        speed,
        initiativeTotal,
        perceptionTotal,
        bab,
        grappleBonus,
        damageThreshold,
        canEdit: this.sheet.isEditable
      },
      resources: {
        forcePointsValue,
        forcePointsMax,
        destinyPointsValue,
        destinyPointsMax,
        forcePointDie,
        canEdit: this.sheet.isEditable
      }
    };

    this._validatePanelContext('resourcesPanel', panel);
    return panel;
  }

  /**
   * Build the abilities panel context
   *
   * Contract: abilitiesPanel
   * - abilities: [ { key, label, value, modifier, modifierClass } ]
   */
  buildAbilitiesPanel() {
    // PHASE 7.5: Consume canonical attributes view-model instead of recomputing
    // buildAttributesViewModel is the single source of truth for ability data
    // All ability displays use the same prepared bundle
    const attributesViewModel = buildAttributesViewModel(this.actor);

    const abilities = Object.values(attributesViewModel).map(attr => ({
      ...attr,
      canEdit: this.sheet.isEditable
    }));

    const panel = {
      abilities,
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('abilitiesPanel', panel);
    return panel;
  }

  /**
   * Build the skills panel context
   *
   * Contract: skillsPanel
   * - skills: [ { key, label, bonus, trained, canEdit } ]
   */
  buildSkillsPanel() {
    const skillKeys = Object.keys(this.derived.skills || {});

    const skills = skillKeys.map(key => {
      const skillData = this.derived.skills?.[key] || {};
      const bonus = Number(skillData.total) || 0;
      const trained = this.system.skills?.[key]?.trained === true;

      return {
        key,
        label: skillData.label || key,
        bonus,
        trained,
        canEdit: this.sheet.isEditable
      };
    });

    const panel = {
      skills,
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('skillsPanel', panel);
    return panel;
  }
}
