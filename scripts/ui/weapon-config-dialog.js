/**
 * Weapon Configuration Dialog — ApplicationV2 Migration
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

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SWSELogger as swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class WeaponConfigDialog extends BaseSWSEAppV2 {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'weapon-config-dialog',
      title: 'Weapon Configuration',
      template: 'systems/foundryvtt-swse/templates/ui/weapon-config-dialog.hbs',
      position: {
        width: 500,
        height: 700
      },
      window: {
        resizable: true
      },
      classes: ['swse-dialog', 'weapon-config']
    });
  }

  constructor(weapon, options = {}) {
    super(options);
    this.weapon = weapon;
  }

  /**
   * Prepare data for template rendering
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const weaponData = this.weapon.system || {};

    return foundry.utils.mergeObject(context, {
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
    });
  }

  /**
   * Register dialog event listeners (ApplicationV2 contract)
   */
  wireEvents() {
    const root = this.element;

    // Property toggle listeners
    root.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => this._onPropertyToggle(e));
    });

    // Damage dice input validation
    const damageDiceInput = root.querySelector('input[name="damageDice"]');
    if (damageDiceInput) {
      damageDiceInput.addEventListener('change', (e) => this._validateDamageInput(e));
    }

    // Save button
    const saveBtn = root.querySelector('button.save-config');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this._saveConfiguration());
    }

    // Cancel button
    const cancelBtn = root.querySelector('button.cancel-config');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // Reset to defaults button
    const resetBtn = root.querySelector('button.reset-defaults');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this._resetToDefaults());
    }
  }

  /**
   * Handle property toggle
   * @private
   */
  _onPropertyToggle(event) {
    const checkbox = event.target;
    const property = checkbox.name;
    const isChecked = checkbox.checked;
    const root = this.element;

    // Validation: Can't be both light and two-handed
    if (property === 'isLight' && isChecked) {
      root.querySelector('input[name="isTwoHanded"]').checked = false;
    }
    if (property === 'isTwoHanded' && isChecked) {
      root.querySelector('input[name="isLight"]').checked = false;
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
   *
   * ⚠️ GOVERNANCE: Routes through actor's updateOwnedItem to ensure:
   * - MutationInterceptor authorization checking
   * - Proper actor recomputation after weapon configuration change
   * - Integrity validation after configuration applied
   *
   * @private
   */
  async _saveConfiguration() {
    try {
      const root = this.element;
      const updates = {
        system: {
          proficient: root.querySelector('input[name="proficient"]').checked,
          equipped: root.querySelector('input[name="equipped"]').checked,
          dualWielded: root.querySelector('input[name="dualWielded"]').checked,
          wieldedTwoHanded: root.querySelector('input[name="wieldedTwoHanded"]').checked,

          damageDice: parseInt(root.querySelector('input[name="damageDice"]').value),
          damageDiceType: root.querySelector('select[name="damageDiceType"]').value,
          damageType: root.querySelector('select[name="damageType"]').value,
          attackAttribute: root.querySelector('select[name="attackAttribute"]').value,
          attackBonus: parseInt(root.querySelector('input[name="attackBonus"]').value) || 0,
          criticalRange: root.querySelector('input[name="criticalRange"]').value,
          criticalMultiplier: root.querySelector('input[name="criticalMultiplier"]').value,

          weaponProperties: {
            isLight: root.querySelector('input[name="isLight"]').checked,
            isTwoHanded: root.querySelector('input[name="isTwoHanded"]').checked,
            keen: root.querySelector('input[name="keen"]').checked,
            flaming: root.querySelector('input[name="flaming"]').checked,
            frost: root.querySelector('input[name="frost"]').checked,
            shock: root.querySelector('input[name="shock"]').checked,
            vorpal: root.querySelector('input[name="vorpal"]').checked
          }
        }
      };

      // PHASE 5: Route through ActorEngine via updateOwnedItem
      const actor = this.weapon.parent;
      if (!actor) {
        throw new Error(`Weapon has no parent actor`);
      }
      await actor.updateOwnedItem(this.weapon, updates);

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
  _resetToDefaults() {
    const root = this.element;
    root.querySelector('input[name="proficient"]').checked = true;
    root.querySelector('input[name="equipped"]').checked = false;
    root.querySelector('input[name="dualWielded"]').checked = false;
    root.querySelector('input[name="wieldedTwoHanded"]').checked = false;

    root.querySelector('input[name="damageDice"]').value = 1;
    root.querySelector('select[name="damageDiceType"]').value = 'd6';
    root.querySelector('select[name="damageType"]').value = 'kinetic';
    root.querySelector('select[name="attackAttribute"]').value = 'str';
    root.querySelector('input[name="attackBonus"]').value = 0;

    root.querySelector('input[name="isLight"]').checked = false;
    root.querySelector('input[name="isTwoHanded"]').checked = false;
    root.querySelector('input[name="keen"]').checked = false;
    root.querySelector('input[name="flaming"]').checked = false;
    root.querySelector('input[name="frost"]').checked = false;
    root.querySelector('input[name="shock"]').checked = false;
    root.querySelector('input[name="vorpal"]').checked = false;

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
