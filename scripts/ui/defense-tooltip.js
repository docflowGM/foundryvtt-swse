/**
 * Defense Breakdown Tooltip System
 *
 * ARCHITECTURE NOTE: BREAKDOWN PROVIDER ONLY
 *
 * This module provides BREAKDOWN DATA for defenses—i.e., "where did this number come from?"
 *
 * ✗ Does NOT provide definition content ("what is this?")
 * ✓ Definitions live in: TooltipGlossary.ReflexDefense, .FortitudeDefense, .WillDefense, .FlatFooted
 * ✓ Definitions are localized in: lang/en.json SWSE.Discovery.Tooltip.*Defense
 *
 * BREAKDOWN RESPONSIBILITY:
 * - Register breakdown providers with TooltipRegistry.registerBreakdownProvider()
 * - Generate detailed math breakdowns showing all components:
 *   * Base calculation (10 + abilities + class + misc)
 *   * Armor modifiers
 *   * Encumbrance penalties
 *   * Condition modifiers
 *   * Talent bonuses
 *   * Special effects (dex loss, etc.)
 *
 * This separation keeps the system maintainable:
 * - Short "what is it" in glossary/definitions
 * - Detailed "how is it calculated" in this provider
 * - No duplication or conflation of concerns
 */

import { SWSELogger as swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";

export class DefenseTooltip {

  /**
   * Initialize: register all defense breakdown providers with the registry.
   * Call this once during system init.
   */
  static registerProviders() {
    TooltipRegistry.registerBreakdownProvider('ReflexDefense', (actor) =>
      this.getBreakdownContent(actor, 'reflex')
    );
    TooltipRegistry.registerBreakdownProvider('FortitudeDefense', (actor) =>
      this.getBreakdownContent(actor, 'fort')
    );
    TooltipRegistry.registerBreakdownProvider('WillDefense', (actor) =>
      this.getBreakdownContent(actor, 'will')
    );
    TooltipRegistry.registerBreakdownProvider('FlatFooted', (actor) =>
      this.getBreakdownContent(actor, 'flatfooted')
    );
  }

  /**
   * Get breakdown content (title + body) for a defense.
   * Used for hover tooltips. For pinned cards, use getBreakdownStructure().
   * @param {Actor} actor
   * @param {string} defenseKey - 'reflex', 'fort', 'will', or 'flatfooted'
   * @returns {{title: string, body: string}}
   */
  static getBreakdownContent(actor, defenseKey) {
    const data = this.getDefenseBreakdown(actor, defenseKey);
    if (!data) {
      return { title: 'Defense', body: 'Unable to calculate breakdown.' };
    }

    let body = this.generateBreakdownText(data, defenseKey);
    return {
      title: `${data.label} Defense Breakdown`,
      body: body
    };
  }

  /**
   * Get normalized breakdown structure for pinned card rendering.
   * @param {Actor} actor
   * @param {string} defenseKey - 'reflex', 'fort', 'will', or 'flatfooted'
   * @returns {{title: string, definition: string, rows: Array, total: number}}
   */
  static getBreakdownStructure(actor, defenseKey) {
    const data = this.getDefenseBreakdown(actor, defenseKey);
    if (!data) {
      return {
        title: 'Defense',
        definition: 'Unable to calculate breakdown.',
        rows: [],
        total: 0
      };
    }

    // Map defense keys to glossary definitions
    const defenseMap = {
      'reflex': 'Dodge and quick reactions.',
      'fort': 'Physical toughness and constitution.',
      'will': 'Mental fortitude and resolve.',
      'flatfooted': 'Defense when caught by surprise.'
    };

    const rows = [];

    // Base components (always shown)
    rows.push({
      label: 'Base',
      value: 10,
      semantic: 'neutral'
    });

    if (data.halfLevel) {
      rows.push({
        label: '½ Level',
        value: data.halfLevel,
        semantic: 'neutral'
      });
    }

    if (data.abilityMod) {
      rows.push({
        label: `${this._getAbilityName(defenseKey)} mod`,
        value: data.abilityMod,
        semantic: data.abilityMod > 0 ? 'positive' : 'negative'
      });
    }

    if (data.classBonus) {
      rows.push({
        label: 'Class bonus',
        value: data.classBonus,
        semantic: 'positive'
      });
    }

    if (data.miscMod) {
      rows.push({
        label: 'Misc',
        value: data.miscMod,
        semantic: data.miscMod > 0 ? 'positive' : (data.miscMod < 0 ? 'negative' : 'neutral')
      });
    }

    // Active modifiers (from derived data)
    if (data.modifiers && data.modifiers.length > 0) {
      data.modifiers.forEach(mod => {
        rows.push({
          label: mod.sourceName,
          value: mod.value,
          semantic: mod.value > 0 ? 'positive' : (mod.value < 0 ? 'negative' : 'neutral')
        });
      });
    }

    // Special effects as negative rows
    if (data.specialEffects && data.specialEffects.length > 0) {
      data.specialEffects.forEach(effect => {
        rows.push({
          label: effect.name,
          value: 0, // Effects don't have direct numeric value; they're informational
          semantic: 'negative'
        });
      });
    }

    return {
      title: `${data.label} Defense`,
      definition: defenseMap[defenseKey] || 'Defense calculation.',
      rows: rows,
      total: data.totalValue
    };
  }

  /**
   * Generate human-readable breakdown text.
   * @private
   */
  static generateBreakdownText(data, defenseKey) {
    let lines = [];

    // Base calculation
    lines.push('Base Calculation:');
    lines.push('  Base: 10');
    if (data.halfLevel) lines.push(`  ½ Level: +${data.halfLevel}`);
    if (data.abilityMod) lines.push(`  Ability: ${data.abilityMod > 0 ? '+' : ''}${data.abilityMod}`);
    if (data.classBonus) lines.push(`  Class: +${data.classBonus}`);
    if (data.miscMod) lines.push(`  Misc: ${data.miscMod > 0 ? '+' : ''}${data.miscMod}`);
    lines.push(`  Subtotal: ${data.subtotal}`);

    // Modifiers
    if (data.modifiers && data.modifiers.length > 0) {
      lines.push('');
      lines.push(`Active Modifiers (${data.modifiers.length}):`);
      data.modifiers.forEach(mod => {
        lines.push(`  ${mod.sourceName}: ${mod.value > 0 ? '+' : ''}${mod.value}`);
      });
    }

    // Special effects
    if (data.specialEffects && data.specialEffects.length > 0) {
      lines.push('');
      lines.push('Special Effects:');
      data.specialEffects.forEach(effect => {
        lines.push(`  ${effect.name}`);
        if (effect.description) lines.push(`    ${effect.description}`);
      });
    }

    lines.push('');
    lines.push(`Final Defense: ${data.totalValue}`);

    return lines.join('\n');
  }

  /**
   * Get defense breakdown data from actor.
   * Flat-footed is calculated without Dex bonus.
   * @private
   */
  static getDefenseBreakdown(actor, defenseKey) {
    const system = actor.system;
    const defenseMap = {
      'reflex': { key: 'ref', label: 'Reflex', abilityKey: 'dex' },
      'fort': { key: 'fort', label: 'Fortitude', abilityKey: 'str' },
      'will': { key: 'will', label: 'Will', abilityKey: 'wis' },
      'flatfooted': { key: 'ref', label: 'Flat-Footed', abilityKey: null } // Uses reflex calculation but no dex
    };

    const defenseInfo = defenseMap[defenseKey];
    if (!defenseInfo) return null;

    const defense = system.defenses?.[defenseInfo.key] || {};
    const abilityMod = defenseKey === 'flatfooted' ? 0 : (system.attributes?.[defenseInfo.abilityKey]?.mod || 0);
    const halfLevel = Math.floor((system.level || 1) / 2);
    const classBonus = defense.classBonus || 0;
    const miscMod = defense.miscMod || 0;

    // Calculate subtotal
    const subtotal = 10 + halfLevel + abilityMod + classBonus + miscMod;

    // Get modifiers from ModifierEngine
    const modifierTarget = `defense.${defenseInfo.key}`;
    const modifiers = this.getModifiersForTarget(actor, modifierTarget);

    // Get total including modifiers (but not dex for flatfooted)
    const totalValue = defenseKey === 'flatfooted' ? subtotal : (defense.total || subtotal);

    return {
      label: defenseInfo.label,
      key: defenseInfo.key,
      halfLevel,
      abilityMod,
      classBonus,
      miscMod,
      subtotal,
      modifiers,
      totalValue,
      specialEffects: this.getSpecialEffects(actor, defenseKey)
    };
  }

  /**
   * Helper: Get ability name from defense key.
   * @private
   */
  static _getAbilityName(defenseKey) {
    const abilityMap = {
      'reflex': 'Dexterity',
      'fort': 'Strength',
      'will': 'Wisdom',
      'flatfooted': 'None'
    };
    return abilityMap[defenseKey] || 'Unknown';
  }

  /**
   * Get all modifiers affecting a specific defense target
   * @private
   */
  static getModifiersForTarget(actor, target) {
    // Try to get modifiers from derived data if available
    const breakdown = actor.system.derived?.modifiers?.[target];
    if (breakdown && breakdown.modifiers) {
      return breakdown.modifiers.map(mod => ({
        sourceName: mod.description || mod.source,
        source: mod.source,
        type: mod.type,
        value: mod.value,
        description: mod.description
      }));
    }

    return [];
  }

  /**
   * Get special effects affecting defense (e.g., dex loss from encumbrance)
   * @private
   */
  static getSpecialEffects(actor, defenseKey) {
    const effects = [];

    // Check for encumbrance dex loss
    if (actor.system.derived?.encumbrance?.removeDexToReflex && defenseKey === 'reflex') {
      effects.push({
        type: 'penalty',
        name: 'Dex Loss (Encumbrance)',
        description: 'Heavy load or overencumbered removes Dex bonus to Reflex'
      });
    }

    // Check for condition track penalties
    const ctStep = actor.system.conditionTrack?.current ?? 0;
    if (ctStep >= 1 && ctStep <= 4) {
      const conditionPenalties = { 1: 1, 2: 2, 3: 5, 4: 10 };
      const penalty = conditionPenalties[ctStep] || 0;
      if (penalty > 0) {
        effects.push({
          type: 'penalty',
          name: 'Condition Track',
          description: `−${penalty} all defenses`
        });
      }
    }

    return effects;
  }
}

export default DefenseTooltip;
