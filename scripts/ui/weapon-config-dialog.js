/**
 * Weapon Configuration Dialog — V2 Compliant Weapon Management UI
 *
 * Provides a UI for configuring structured weapon properties and talent flags.
 * Replaces name-based detection with explicit configuration controls.
 *
 * Features:
 * - Weapon property toggles (light, two-handed, keen, flaming, etc.)
 * - Proficiency flag setting
 * - Enhancement bonus configuration
 * - Damage configuration (dice, type)
 * - Attack attribute selection
 */

import { SWSELogger as swseLogger } from '../../utils/logger.js';

export class WeaponConfigDialog extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'weapon-config-dialog',
      title: 'Weapon Configuration',
      template: 'systems/foundryvtt-swse/templates/ui/weapon-config-dialog.hbs',
      width: 500,
      height: 700,
      resizable: true,
      classes: ['swse-dialog', 'weapon-config']
    });
  }

  constructor(weapon, options = {}) {
    super(weapon, options);
    this.weapon = weapon;
  }

  /**
   * Prepare data for template rendering
   */
  async getData() {
    const weaponData = this.weapon.system || {};

    return {
      weapon: this.weapon,
      weaponName: this.weapon.name,
      system: weaponData,
      properties: {
        // Basic properties
        proficient: weaponData.proficient ?? true,
        equipped: weaponData.equipped ?? false,
        dualWielded: weaponData.dualWielded ?? false,
        wieldedTwoHanded: weaponData.wieldedTwoHanded ?? false,

        // Weapon size/handling
        isLight: weaponData.weaponProperties?.isLight ?? false,
        isTwoHanded: weaponData.weaponProperties?.isTwoHanded ?? false,

        // Special properties
        keen: weaponData.weaponProperties?.keen ?? false,
        flaming: weaponData.weaponProperties?.flaming ?? false,
        frost: weaponData.weaponProperties?.frost ?? false,
        shock: weaponData.weaponProperties?.shock ?? false,
        vorpal: weaponData.weaponProperties?.vorpal ?? false,

        // Damage configuration
        damageDice: weaponData.damageDice ?? 1,
        damageDiceType: weaponData.damageDiceType ?? 'd6',
        damageType: weaponData.damageType ?? 'kinetic',
        attackAttribute: weaponData.attackAttribute ?? 'str',
        attackBonus: weaponData.attackBonus ?? 0,
        criticalRange: weaponData.criticalRange ?? '20',
        criticalMultiplier: weaponData.criticalMultiplier ?? 'x2'
      },
      options: {
        damageDiceTypes: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'],
        damageTypes: ['kinetic', 'energy', 'fire', 'cold', 'acid', 'sonic', 'force'],
        attackAttributes: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
        weaponCategories: ['simple', 'martial', 'exotic', 'improvised']
      }
    };
  }

  /**
   * Register dialog event listeners
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Property toggle listeners
    html.find('input[type="checkbox"]').on('change', (e) => {
      this._onPropertyToggle(e);
    });

    // Damage dice input validation
    html.find('input[name="damageDice"]').on('change', (e) => {
      this._validateDamageInput(e);
    });

    // Save button
    html.find('button.save-config').on('click', () => {
      this._saveConfiguration(html);
    });

    // Cancel button
    html.find('button.cancel-config').on('click', () => {
      this.close();
    });

    // Reset to defaults button
    html.find('button.reset-defaults').on('click', () => {
      this._resetToDefaults(html);
    });
  }

  /**
   * Handle property toggle
   * @private
   */
  _onPropertyToggle(event) {
    const checkbox = event.target;
    const property = checkbox.name;
    const isChecked = checkbox.checked;

    // Validation: Can't be both light and two-handed
    if (property === 'isLight' && isChecked) {
      document.querySelector('input[name="isTwoHanded"]').checked = false;
    }
    if (property === 'isTwoHanded' && isChecked) {
      document.querySelector('input[name="isLight"]').checked = false;
    }
  }

  /**
   * Validate damage dice input
   * @private
   */
  _validateDamageInput(event) {
    const input = event.target;
    const value = parseInt(input.value);

    if (isNaN(value) || value < 1 || value > 20) {
      input.value = 1;
      ui.notifications.warn('Damage dice must be between 1 and 20');
    }
  }

  /**
   * Save weapon configuration
   * @private
   */
  async _saveConfiguration(html) {
    try {
      const updates = {
        system: {
          proficient: html.find('input[name="proficient"]').prop('checked'),
          equipped: html.find('input[name="equipped"]').prop('checked'),
          dualWielded: html.find('input[name="dualWielded"]').prop('checked'),
          wieldedTwoHanded: html.find('input[name="wieldedTwoHanded"]').prop('checked'),

          damageDice: parseInt(html.find('input[name="damageDice"]').val()),
          damageDiceType: html.find('select[name="damageDiceType"]').val(),
          damageType: html.find('select[name="damageType"]').val(),
          attackAttribute: html.find('select[name="attackAttribute"]').val(),
          attackBonus: parseInt(html.find('input[name="attackBonus"]').val()) || 0,
          criticalRange: html.find('input[name="criticalRange"]').val(),
          criticalMultiplier: html.find('input[name="criticalMultiplier"]').val(),

          weaponProperties: {
            isLight: html.find('input[name="isLight"]').prop('checked'),
            isTwoHanded: html.find('input[name="isTwoHanded"]').prop('checked'),
            keen: html.find('input[name="keen"]').prop('checked'),
            flaming: html.find('input[name="flaming"]').prop('checked'),
            frost: html.find('input[name="frost"]').prop('checked'),
            shock: html.find('input[name="shock"]').prop('checked'),
            vorpal: html.find('input[name="vorpal"]').prop('checked')
          }
        }
      };

      await this.weapon.update(updates);

      swseLogger.info(`[WeaponConfigDialog] Updated weapon: ${this.weapon.name}`);
      ui.notifications.info(`Weapon "${this.weapon.name}" configuration saved`);

      this.close();
    } catch (err) {
      swseLogger.error(`[WeaponConfigDialog] Error saving configuration:`, err);
      ui.notifications.error(`Failed to save weapon configuration: ${err.message}`);
    }
  }

  /**
   * Reset to default values
   * @private
   */
  _resetToDefaults(html) {
    html.find('input[name="proficient"]').prop('checked', true);
    html.find('input[name="equipped"]').prop('checked', false);
    html.find('input[name="dualWielded"]').prop('checked', false);
    html.find('input[name="wieldedTwoHanded"]').prop('checked', false);

    html.find('input[name="damageDice"]').val(1);
    html.find('select[name="damageDiceType"]').val('d6');
    html.find('select[name="damageType"]').val('kinetic');
    html.find('select[name="attackAttribute"]').val('str');
    html.find('input[name="attackBonus"]').val(0);

    html.find('input[name="isLight"]').prop('checked', false);
    html.find('input[name="isTwoHanded"]').prop('checked', false);
    html.find('input[name="keen"]').prop('checked', false);
    html.find('input[name="flaming"]').prop('checked', false);
    html.find('input[name="frost"]').prop('checked', false);
    html.find('input[name="shock"]').prop('checked', false);
    html.find('input[name="vorpal"]').prop('checked', false);

    ui.notifications.info('Weapon configuration reset to defaults');
  }

  /**
   * Open weapon configuration dialog
   * @static
   * @param {Item} weapon - Weapon item to configure
   */
  static async open(weapon) {
    if (!weapon || weapon.type !== 'weapon') {
      ui.notifications.error('Invalid weapon item');
      return;
    }

    const dialog = new this(weapon);
    return dialog.render(true);
  }
}

export default WeaponConfigDialog;
