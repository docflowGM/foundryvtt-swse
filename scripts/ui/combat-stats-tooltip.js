/**
 * Combat Stats Breakdown Provider
 *
 * ARCHITECTURE NOTE: BREAKDOWN PROVIDER ONLY
 *
 * Provides normalized breakdown data for combat-derived statistics:
 * - Base Attack Bonus
 * - Grapple bonus
 * - Initiative
 *
 * Follows the same pattern as DefenseTooltip:
 * - Definitions live in glossary/i18n
 * - Breakdowns provide detailed composition
 * - All output normalized to unified breakdown structure
 */

import { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";

export class CombatStatsTooltip {

  /**
   * Initialize: register all combat stat breakdown providers.
   * Call this once during system init.
   */
  static registerProviders() {
    TooltipRegistry.registerBreakdownProvider('BaseAttackBonus', (actor) =>
      this.getBaseAttackBonusBreakdown(actor)
    );
    TooltipRegistry.registerBreakdownProvider('Grapple', (actor) =>
      this.getGrappleBreakdown(actor)
    );
    TooltipRegistry.registerBreakdownProvider('Initiative', (actor) =>
      this.getInitiativeBreakdown(actor)
    );
  }

  /**
   * Get normalized breakdown structure for Base Attack Bonus.
   * @param {Actor} actor
   * @returns {{title: string, definition: string, rows: Array, total: number}}
   */
  static getBaseAttackBonusBreakdown(actor) {
    const system = actor.system;
    const level = system.level || 1;
    const halfLevel = Math.floor(level / 2);
    const classBonus = system.baseAttackBonus?.classBonus || 0;
    const miscMod = system.baseAttackBonus?.miscMod || 0;

    const rows = [];

    // Base calculation
    rows.push({
      label: 'Base (½ Level)',
      value: halfLevel,
      semantic: 'neutral'
    });

    // Class bonus
    if (classBonus) {
      rows.push({
        label: 'Class bonus',
        value: classBonus,
        semantic: classBonus > 0 ? 'positive' : 'negative'
      });
    }

    // Misc modifier
    if (miscMod) {
      rows.push({
        label: 'Misc',
        value: miscMod,
        semantic: miscMod > 0 ? 'positive' : 'negative'
      });
    }

    // Modifiers from system
    const modifiers = this._getModifiersForTarget(actor, 'attack.bonus');
    modifiers.forEach(mod => {
      rows.push({
        label: mod.sourceName,
        value: mod.value,
        semantic: mod.value > 0 ? 'positive' : (mod.value < 0 ? 'negative' : 'neutral')
      });
    });

    const total = halfLevel + classBonus + miscMod + modifiers.reduce((sum, m) => sum + m.value, 0);

    return {
      title: 'Base Attack Bonus',
      definition: 'Your bonus to melee and ranged weapon attacks. Scales with character level.',
      rows,
      total
    };
  }

  /**
   * Get normalized breakdown structure for Grapple bonus.
   * Grapple = BAB + Strength modifier + size modifier + misc
   * @param {Actor} actor
   * @returns {{title: string, definition: string, rows: Array, total: number}}
   */
  static getGrappleBreakdown(actor) {
    const system = actor.system;
    const level = system.level || 1;
    const bab = Math.floor(level / 2);
    const strMod = system.attributes?.str?.mod || 0;
    const miscMod = system.grapple?.miscMod || 0;

    const rows = [];

    // Base components
    rows.push({
      label: 'Base Attack Bonus',
      value: bab,
      semantic: 'neutral'
    });

    rows.push({
      label: 'Strength modifier',
      value: strMod,
      semantic: strMod > 0 ? 'positive' : (strMod < 0 ? 'negative' : 'neutral')
    });

    // Misc modifier
    if (miscMod) {
      rows.push({
        label: 'Misc',
        value: miscMod,
        semantic: miscMod > 0 ? 'positive' : 'negative'
      });
    }

    // Modifiers
    const modifiers = this._getModifiersForTarget(actor, 'grapple');
    modifiers.forEach(mod => {
      rows.push({
        label: mod.sourceName,
        value: mod.value,
        semantic: mod.value > 0 ? 'positive' : (mod.value < 0 ? 'negative' : 'neutral')
      });
    });

    const total = bab + strMod + miscMod + modifiers.reduce((sum, m) => sum + m.value, 0);

    return {
      title: 'Grapple',
      definition: 'Your bonus to unarmed melee attacks and grappling. Derived from BAB and Strength.',
      rows,
      total
    };
  }

  /**
   * Get normalized breakdown structure for Initiative.
   * Initiative = Dexterity modifier + training bonus + misc
   * @param {Actor} actor
   * @returns {{title: string, definition: string, rows: Array, total: number}}
   */
  static getInitiativeBreakdown(actor) {
    const system = actor.system;
    const dexMod = system.attributes?.dex?.mod || 0;
    const miscMod = system.initiative?.miscMod || 0;

    const rows = [];

    // Dexterity modifier
    rows.push({
      label: 'Dexterity modifier',
      value: dexMod,
      semantic: dexMod > 0 ? 'positive' : (dexMod < 0 ? 'negative' : 'neutral')
    });

    // Misc modifier
    if (miscMod) {
      rows.push({
        label: 'Misc',
        value: miscMod,
        semantic: miscMod > 0 ? 'positive' : 'negative'
      });
    }

    // Modifiers
    const modifiers = this._getModifiersForTarget(actor, 'initiative');
    modifiers.forEach(mod => {
      rows.push({
        label: mod.sourceName,
        value: mod.value,
        semantic: mod.value > 0 ? 'positive' : (mod.value < 0 ? 'negative' : 'neutral')
      });
    });

    // Condition track penalty
    const conditionStep = system.conditionTrack?.current ?? 0;
    if (conditionStep > 0) {
      const conditionPenalties = { 1: -1, 2: -2, 3: -5, 4: -10 };
      const penalty = conditionPenalties[conditionStep] || 0;
      if (penalty !== 0) {
        rows.push({
          label: 'Condition Track',
          value: penalty,
          semantic: 'negative'
        });
      }
    }

    const total = dexMod + miscMod + modifiers.reduce((sum, m) => sum + m.value, 0) +
                  (conditionStep > 0 ? (conditionPenalties[conditionStep] || 0) : 0);

    return {
      title: 'Initiative',
      definition: 'How quickly you act in combat. Higher Initiative acts first. Based on Dexterity.',
      rows,
      total
    };
  }

  /**
   * Get modifiers for a specific target.
   * @private
   */
  static _getModifiersForTarget(actor, target) {
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
}

export default CombatStatsTooltip;
