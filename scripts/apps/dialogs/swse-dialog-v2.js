// scripts/apps/dialogs/swse-dialog-v2.js
/**
 * SWSEDialogV2
 *
 * AppV2 replacement for Foundry V1 Dialog.
 *
 * Design goals:
 * - Invocation-compatible with common `Dialog.*` patterns (confirm/prompt/new Dialog).
 * - Stable AppV2 lifecycle (HandlebarsApplicationMixin(ApplicationV2)).
 * - No jQuery dependency. A small DOM-backed shim is provided to legacy callbacks.
 *
 * NOTE: This is a "surface safety" layer for Run 1. Markup refactors belong in Run 2+.
 */

import SWSEApplicationV2 from '../base/swse-application-v2.js';
import { domQuery } from '../../utils/dom-query-shim.js';

export class SWSEDialogV2 extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = {
    tag: 'div',
    classes: ['swse', 'swse-dialog', 'swse-dialog-v2'],
    position: { width: 450, height: 'auto' },
    window: { title: 'Dialog', resizable: false, draggable: true, frame: true }
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/dialogs/swse-generic-dialog.hbs'
    }
  };

  constructor(data = {}, options = {}) {
    const normalized = SWSEDialogV2._normalizeOptions(options, data);
    super(normalized);

    this.data = data ?? {};
    this._resolver = null;
    this._resolved = false;
  }

  /** Support legacy `render(true)` signature */
  render(force = false, options = {}) {
    if (typeof force === 'boolean') return super.render({ force, ...options });
    return super.render(force);
  }

  async _prepareContext(_options) {
    const buttons = SWSEDialogV2._buttonsToArray(this.data?.buttons ?? {});
    return {
      content: this.data?.content ?? '',
      buttons
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    // Wire button clicks
    for (const btn of root.querySelectorAll('[data-action]')) {
      btn.addEventListener('click', async (ev) => {
        const action = ev.currentTarget?.dataset?.action;
        await this._handleAction(action);
      });
    }

    // Run legacy render hook if provided
    if (typeof this.data?.render === 'function') {
      try {
        this.data.render(domQuery(root));
      } catch (err) {
        console.error('SWSEDialogV2 render() callback failed', err);
      }
    }
  }

  async close(options = {}) {
    if (!this._resolved) {
      this._resolved = true;
      this._resolver?.(null);
      this._resolver = null;
    }

    if (typeof this.data?.close === 'function') {
      try {
        this.data.close();
      } catch (err) {
        console.error('SWSEDialogV2 close() callback failed', err);
      }
    }

    return super.close(options);
  }

  /** Show and resolve on button selection (or null on close). */
  static async wait(data = {}, options = {}) {
    return new Promise((resolve) => {
      const app = new SWSEDialogV2(data, options);
      app._resolver = resolve;
      app.render(true);
    });
  }

  /** Dialog.confirm compatible wrapper. */
  static async confirm({ title = 'Confirm', content = '', yes, no, defaultYes = true, options = {} } = {}) {
    const buttons = {
      yes: {
        icon: '<i class="fas fa-check"></i>',
        label: game?.i18n?.localize?.('Yes') ?? 'Yes',
        callback: (html) => {
          try { return typeof yes === 'function' ? yes(html) : true; }
          finally { /* no-op */ }
        }
      },
      no: {
        icon: '<i class="fas fa-times"></i>',
        label: game?.i18n?.localize?.('No') ?? 'No',
        callback: (html) => {
          try { return typeof no === 'function' ? no(html) : false; }
          finally { /* no-op */ }
        }
      }
    };

    const result = await SWSEDialogV2.wait(
      { title, content, buttons, default: defaultYes ? 'yes' : 'no' },
      options
    );

    // If callbacks returned explicit booleans, respect them; otherwise infer by button.
    if (result === true || result === false) return result;
    if (result === 'yes') return true;
    if (result === 'no') return false;
    return Boolean(defaultYes);
  }

  /** Dialog.prompt compatible wrapper. */
  static async prompt({ title = 'Prompt', content = '', label = 'Confirm', callback, options = {} } = {}) {
    const buttons = {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label,
        callback: (html) => (typeof callback === 'function' ? callback(html) : true)
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game?.i18n?.localize?.('Cancel') ?? 'Cancel',
        callback: () => null
      }
    };

    return SWSEDialogV2.wait({ title, content, buttons, default: 'ok' }, options);
  }

  /** Internal: translate V1-style Dialog options into AppV2 options. */
  static _normalizeOptions(v1 = {}, data = {}) {
    const o = foundry.utils.mergeObject({}, v1 ?? {});

    // V1 sizing aliases
    if (o.width !== undefined) {o.position = o.position ?? {}; o.position.width = o.width;}
    if (o.height !== undefined) {o.position = o.position ?? {}; o.position.height = o.height;}

    // V1 position aliases
    if (o.left !== undefined) {o.position = o.position ?? {}; o.position.left = o.left;}
    if (o.top !== undefined) {o.position = o.position ?? {}; o.position.top = o.top;}

    // V1 resizable/draggable aliases
    if (o.resizable !== undefined) {o.window = o.window ?? {}; o.window.resizable = o.resizable;}
    if (o.draggable !== undefined) {o.window = o.window ?? {}; o.window.draggable = o.draggable;}

    // Title (prefer data.title)
    const title = data?.title ?? o?.window?.title ?? SWSEDialogV2.DEFAULT_OPTIONS.window.title;
    o.window = foundry.utils.mergeObject({ title }, o.window ?? {});

    // Ensure unique id unless provided
    if (!o.id) o.id = `swse-dialog-${foundry.utils.randomID()}`;

    // Ensure tag
    if (!o.tag) o.tag = SWSEDialogV2.DEFAULT_OPTIONS.tag;

    // Classes
    if (o.classes) {
      const base = SWSEDialogV2.DEFAULT_OPTIONS.classes ?? [];
      o.classes = Array.from(new Set([...base, ...o.classes]));
    }

    return o;
  }

  static _buttonsToArray(buttons) {
    return Object.entries(buttons ?? {}).map(([action, btn]) => ({
      action,
      label: btn?.label ?? action,
      icon: btn?.icon ?? '',
      cssClass: btn?.class ?? btn?.cssClass ?? '',
      isDefault: (this.data?.default ?? '') === action
    }));
  }

  async _handleAction(action) {
    const buttons = this.data?.buttons ?? {};
    const btn = buttons?.[action];

    const root = this.element instanceof HTMLElement ? this.element : null;
    const htmlArg = root ? domQuery(root) : domQuery([]);

    let result = action;
    if (btn && typeof btn.callback === 'function') {
      try {
        result = await btn.callback(htmlArg);
      } catch (err) {
        console.error(`SWSEDialogV2 button callback failed: ${action}`, err);
      }
    }

    if (!this._resolved) {
      this._resolved = true;
      this._resolver?.(result);
      this._resolver = null;
    }

    await this.close();
  }
}

// Expose globally for mechanical Run-1 replacements (Dialog -> SWSEDialogV2).
globalThis.SWSEDialogV2 = SWSEDialogV2;
