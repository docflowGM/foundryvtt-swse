/**
 * Defense Breakdown Tooltip System
 *
 * Provides breakdown data generators for defense values.
 * Integrates with TooltipRegistry as a breakdown provider.
 * Shows all sources contributing to final defense calculation:
 * - Base calculation (10 + abilities + class + misc)
 * - Armor modifiers
 * - Encumbrance penalties
 * - Condition modifiers
 * - Talent bonuses
 * - Special effects (dex loss, etc.)
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
  }

  /**
   * Get breakdown content (title + body) for a defense.
   * @param {Actor} actor
   * @param {string} defenseKey - 'reflex', 'fort', or 'will'
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
   * Get defense breakdown data from actor
   * @private
   */
  static getDefenseBreakdown(actor, defenseKey) {
    const system = actor.system;
    const defenseMap = {
      'reflex': { key: 'ref', label: 'Reflex', abilityKey: 'dex' },
      'fort': { key: 'fort', label: 'Fortitude', abilityKey: 'str' },
      'will': { key: 'will', label: 'Will', abilityKey: 'wis' }
    };

    const defenseInfo = defenseMap[defenseKey];
    if (!defenseInfo) return null;

    const defense = system.defenses?.[defenseInfo.key] || {};
    const abilityMod = system.attributes?.[defenseInfo.abilityKey]?.mod || 0;
    const halfLevel = Math.floor((system.level || 1) / 2);
    const classBonus = defense.classBonus || 0;
    const miscMod = defense.miscMod || 0;

    // Calculate subtotal
    const subtotal = 10 + halfLevel + abilityMod + classBonus + miscMod;

    // Get modifiers from ModifierEngine
    const modifierTarget = `defense.${defenseInfo.key}`;
    const modifiers = this.getModifiersForTarget(actor, modifierTarget);

    // Get total including modifiers
    const totalValue = defense.total || subtotal;

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
