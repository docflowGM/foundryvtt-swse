/**
 * Weapon Breakdown Tooltip System
 *
 * Provides breakdown data generators for weapon attack/damage values.
 * Integrates with TooltipRegistry as breakdown providers.
 * Shows all sources contributing to final calculations:
 * - Base damage calculation (dice + type)
 * - Attack bonus components (BAB, half level, ability, enhancement, proficiency)
 * - Damage bonus components (half level, ability, enhancement, two-handed, talents)
 * - All registered modifiers
 * - Weapon property effects
 */

import { SWSELogger as swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import WeaponsEngine from "/systems/foundryvtt-swse/scripts/engine/combat/weapons-engine.js";
import { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";

export class WeaponTooltip {

  /**
   * Initialize: register weapon breakdown providers with the registry.
   * Note: Weapon tooltips are currently handled by element-specific data attributes
   * and are not yet integrated with the registry's semantic lookup.
   * This is preserved for future expansion.
   */
  static registerProviders() {
    // Future: register semantic weapon providers here
  }

  /**
   * Get attack bonus breakdown text.
   * @param {Actor} actor
   * @param {Item} weapon
   * @returns {{title: string, body: string}}
   */
  static getAttackBreakdownContent(actor, weapon) {
    const breakdown = WeaponsEngine.getAttackBonusBreakdown(actor, weapon);
    const modifiers = this._getModifiersForTarget(actor, 'attack.bonus');

    let lines = [];
    lines.push('Attack Bonus Components:');
    for (const [source, value] of Object.entries(breakdown.components)) {
      if (value !== 0) {
        lines.push(`  ${source}: ${value > 0 ? '+' : ''}${value}`);
      }
    }
    lines.push(`  Subtotal: ${breakdown.total}`);

    if (modifiers.length > 0) {
      lines.push('');
      lines.push(`Active Modifiers (${modifiers.length}):`);
      modifiers.forEach(mod => {
        lines.push(`  ${mod.sourceName}: ${mod.value > 0 ? '+' : ''}${mod.value}`);
      });
    }

    const total = breakdown.total + (modifiers.reduce((sum, m) => sum + m.value, 0));
    lines.push('');
    lines.push(`Final Attack Bonus: ${total}`);

    return {
      title: `${weapon.name} — Attack Breakdown`,
      body: lines.join('\n')
    };
  }

  /**
   * Get damage bonus breakdown text.
   * @param {Actor} actor
   * @param {Item} weapon
   * @returns {{title: string, body: string}}
   */
  static getDamageBreakdownContent(actor, weapon) {
    const breakdown = WeaponsEngine.getDamageBonusBreakdown(actor, weapon);
    const modifiers = this._getModifiersForTarget(actor, 'damage.melee');
    const properties = this._getWeaponPropertyEffects(weapon);

    let lines = [];
    lines.push('Damage Bonus Components:');
    for (const [source, value] of Object.entries(breakdown.components)) {
      if (value !== 0) {
        lines.push(`  ${source}: ${value > 0 ? '+' : ''}${value}`);
      }
    }
    lines.push(`  Subtotal: ${breakdown.total}`);

    if (modifiers.length > 0) {
      lines.push('');
      lines.push(`Active Modifiers (${modifiers.length}):`);
      modifiers.forEach(mod => {
        lines.push(`  ${mod.sourceName}: ${mod.value > 0 ? '+' : ''}${mod.value}`);
      });
    }

    if (properties.length > 0) {
      lines.push('');
      lines.push('Properties:');
      properties.forEach(prop => {
        lines.push(`  ${prop.name}: ${prop.effect}`);
      });
    }

    const total = breakdown.total + (modifiers.reduce((sum, m) => sum + m.value, 0));
    lines.push('');
    lines.push(`Final Damage Bonus: ${total}`);

    return {
      title: `${weapon.name} — Damage Breakdown`,
      body: lines.join('\n')
    };
  }

  /**
   * Get attack bonus breakdown
   * @deprecated Use getAttackBreakdownContent instead
   */
  static getAttackBreakdown(actor, weapon) {
    const breakdown = WeaponsEngine.getAttackBonusBreakdown(actor, weapon);
    const modifiers = this._getModifiersForTarget(actor, 'attack.bonus');

    return {
      weaponName: weapon.name,
      components: breakdown.components,
      subtotal: breakdown.total,
      total: breakdown.total + (modifiers.reduce((sum, m) => sum + m.value, 0)),
      modifiers: modifiers,
      properties: []
    };
  }

  /**
   * Get damage bonus breakdown
   * @deprecated Use getDamageBreakdownContent instead
   */
  static getDamageBreakdown(actor, weapon) {
    const breakdown = WeaponsEngine.getDamageBonusBreakdown(actor, weapon);
    const modifiers = this._getModifiersForTarget(actor, 'damage.melee');
    const properties = this._getWeaponPropertyEffects(weapon);

    return {
      weaponName: weapon.name,
      baseDamage: WeaponsEngine.getBaseDamage(weapon),
      components: breakdown.components,
      subtotal: breakdown.total,
      total: breakdown.total + (modifiers.reduce((sum, m) => sum + m.value, 0)),
      modifiers: modifiers,
      properties: properties
    };
  }

  /**
   * Get modifiers for a specific target
   * @private
   */
  static _getModifiersForTarget(actor, target) {
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
   * Get weapon property effects
   * @private
   */
  static _getWeaponPropertyEffects(weapon) {
    const effects = [];
    const props = weapon.system?.weaponProperties || {};

    if (props.keen === true) {
      effects.push({
        name: 'Keen',
        effect: 'Crit range expanded by 1'
      });
    }

    if (props.flaming === true) {
      effects.push({
        name: 'Flaming',
        effect: '+1d6 fire damage'
      });
    }

    if (props.frost === true) {
      effects.push({
        name: 'Frost',
        effect: '+1d6 cold damage'
      });
    }

    if (props.shock === true) {
      effects.push({
        name: 'Shock',
        effect: '+1d6 sonic damage'
      });
    }

    if (props.vorpal === true) {
      effects.push({
        name: 'Vorpal',
        effect: 'On 20: instant kill'
      });
    }

    return effects;
  }
}

export default WeaponTooltip;
