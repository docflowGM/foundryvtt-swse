/**
 * CustomRollDialog
 *
 * V2 Application surface for the right-sidebar custom roll launcher.
 * The dialog collects roll intent only; formula construction and execution are
 * delegated to CustomRollEngine.
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { getActorSheetTheme, buildActorSheetThemeStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import { getActorSheetMotionStyle, buildActorSheetMotionStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-motion-registry.js";
import { CustomRollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll/custom-roll-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class CustomRollDialog extends BaseSWSEAppV2 {
  static #instance = null;

  static DEFAULT_OPTIONS = {
    id: 'swse-custom-roll-dialog',
    tag: 'section',
    window: {
      title: 'Custom Roll',
      width: 460,
      height: 'auto',
      resizable: false
    },
    classes: ['swse', 'swse-custom-roll-app', 'swse-datapad-container']
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/custom-roll/custom-roll-dialog.hbs'
    }
  };

  static open(options = {}) {
    if (this.#instance?.rendered) {
      this.#instance.bringToFront?.();
      return this.#instance;
    }
    this.#instance = new this(options);
    this.#instance.render(true);
    return this.#instance;
  }

  async close(options = {}) {
    if (CustomRollDialog.#instance === this) CustomRollDialog.#instance = null;
    return super.close(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = CustomRollEngine.getDefaultActor();
    const themeKey = getActorSheetTheme(actor?.getFlag?.('foundryvtt-swse', 'sheetTheme') ?? SettingsHelper.getString('sheetTheme', 'holo'));
    const motionStyle = getActorSheetMotionStyle(actor?.getFlag?.('foundryvtt-swse', 'sheetMotionStyle') ?? SettingsHelper.getString('sheetMotionStyle', 'standard'));

    return foundry.utils.mergeObject(context, {
      actorName: actor?.name ?? '',
      hasActor: !!actor,
      diceOptions: CustomRollEngine.getDiceOptions(),
      rollModeOptions: CustomRollEngine.getRollModeOptions(),
      defaultRollMode: CustomRollEngine.getDefaultRollMode(),
      themeKey,
      motionStyle,
      themeStyleInline: buildActorSheetThemeStyle(themeKey),
      motionStyleInline: buildActorSheetMotionStyle(motionStyle)
    });
  }

  wireEvents() {
    this.onRoot('submit', '[data-swse-custom-roll-form]', this.#onSubmit.bind(this));
    this.onRoot('click', '[data-action="cancel"]', (event) => {
      event.preventDefault();
      this.close();
    });
    this.onRoot('click', '[data-action="reset"]', (event) => {
      event.preventDefault();
      this.#resetForm();
    });
    this.onRoot('change', 'input[name="rollSource"]', () => this.#syncRollSource());
    this.#syncRollSource();
  }

  async #onSubmit(event, form) {
    event.preventDefault();
    form = form ?? event.target?.closest?.('[data-swse-custom-roll-form]');
    if (!form) return;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      await CustomRollEngine.execute({
        actor: CustomRollEngine.getDefaultActor(),
        rollSource: data.rollSource,
        die: data.die,
        customFormula: data.customFormula,
        modifier: data.modifier,
        dc: data.dc,
        rollMode: data.rollMode,
        label: data.label || 'Custom Roll'
      });
    } catch (err) {
      SWSELogger.error('[CustomRollDialog] Custom roll failed:', err);
      ui?.notifications?.error?.(err?.message ?? 'Custom roll failed.');
    }
  }

  #resetForm() {
    const form = this.element?.querySelector?.('[data-swse-custom-roll-form]');
    if (!form) return;
    form.reset();
    this.#syncRollSource();
  }

  #syncRollSource() {
    const form = this.element?.querySelector?.('[data-swse-custom-roll-form]');
    if (!form) return;
    const source = form.querySelector('input[name="rollSource"]:checked')?.value === 'formula' ? 'formula' : 'die';
    form.dataset.rollSource = source;
  }
}

export default CustomRollDialog;
