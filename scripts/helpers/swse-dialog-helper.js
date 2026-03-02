/**
 * Dialog Helper for SWSE system
 * Provides standardized dialog creation methods with V2-safe positioning options.
 */
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

export default class SWSEDialogHelper {
  /**
   * Standard dialog options (AppV2) with legacy aliases supported.
   * @param {Object} overrides
   * @returns {Object}
   */
  static getDefaultOptions(overrides = {}) {
    const base = {
      classes: ['swse', 'swse-dialog'],
      position: { width: 400, height: 'auto' },
      window: { resizable: false }
    };

    const merged = foundry.utils.mergeObject(base, overrides ?? {}, { inplace: false });

    // Legacy aliases
    if (merged.width !== undefined) {merged.position = merged.position ?? {}; merged.position.width = merged.width;}
    if (merged.height !== undefined) {merged.position = merged.position ?? {}; merged.position.height = merged.height;}
    if (merged.resizable !== undefined) {merged.window = merged.window ?? {}; merged.window.resizable = merged.resizable;}
    if (merged.left !== undefined) {merged.position = merged.position ?? {}; merged.position.left = merged.left;}
    if (merged.top !== undefined) {merged.position = merged.position ?? {}; merged.position.top = merged.top;}

    return merged;
  }

  /**
   * Show a confirmation dialog.
   * @returns {Promise<boolean>}
   */
  static async confirm({ title, content, yes, no, options = {} }) {
    return SWSEDialogV2.confirm({
      title,
      content,
      yes,
      no,
      options: this.getDefaultOptions(options)
    });
  }

  /**
   * Show a prompt dialog.
   */
  static async prompt({ title, content, label = 'Confirm', callback, options = {} }) {
    return SWSEDialogV2.prompt({
      title,
      content,
      label,
      callback,
      options: this.getDefaultOptions(options)
    });
  }

  /**
   * Show a custom dialog with multiple buttons.
   */
  static async show({ title, content, buttons, render, close, default: defaultButton, options = {} }) {
    return SWSEDialogV2.wait(
      {
        title,
        content,
        buttons: this._processButtons(buttons, (value) => value),
        render,
        close,
        default: defaultButton
      },
      this.getDefaultOptions(options)
    );
  }

  /**
   * Process button configuration to preserve callbacks.
   * @private
   */
  static _processButtons(buttons, _resolve) {
    const processed = {};
    for (const [key, button] of Object.entries(buttons ?? {})) {
      processed[key] = {
        ...button,
        callback: (html) => (button.callback ? button.callback(html) : key)
      };
    }
    return processed;
  }

  /**
   * Show a simple alert dialog.
   */
  static async alert(title, message, options = {}) {
    return SWSEDialogV2.wait(
      {
        title,
        content: `<p>${message}</p>`,
        buttons: {
          ok: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'OK',
            callback: () => true
          }
        },
        default: 'ok'
      },
      this.getDefaultOptions(options)
    );
  }
}
