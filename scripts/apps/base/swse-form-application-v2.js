// scripts/apps/base/swse-form-application-v2.js
import SWSEApplicationV2 from './swse-application-v2.js';

/**
 * SWSE FormApplicationV2 base
 *
 * AppV2 contract:
 * - No jQuery in render lifecycle
 * - Forms are handled via ApplicationV2 `form.handler`
 * - Subclasses may still implement legacy `_updateObject(event, data)` for convenience
 */
export default class SWSEFormApplicationV2 extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    tag: 'form',
    window: {
      contentClasses: ['standard-form']
    },
    form: {
      handler: SWSEFormApplicationV2.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    }
  });

  /**
   * V2 form handler.
   *
   * Bridges to legacy `_updateObject(event, data)` where `data` is an expanded object.
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onSubmit(event, form, formData) {
    try {
      const expanded = foundry.utils.expandObject(formData?.object ?? {});
      if (typeof this._updateObject === 'function') {
        return await this._updateObject(event, expanded);
      }
      if (typeof this._onSubmit === 'function') {
        return await this._onSubmit(event, form, expanded, formData);
      }
      return null;
    } catch (err) {
      console.error(`[${this.constructor?.name ?? 'SWSEFormApplicationV2'}] Form submit failed`, err);
      ui?.notifications?.error?.(err?.message ?? 'Form submit failed');
      return null;
    }
  }
}
