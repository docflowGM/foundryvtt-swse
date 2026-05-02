import SWSEApplicationV2 from '/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js';

export class CustomLanguageDialog extends SWSEApplicationV2 {
  static #instance = null;

  static DEFAULT_OPTIONS = {
    id: 'swse-custom-language-dialog',
    classes: ['swse-custom-language-dialog-app'],
    template: 'systems/foundryvtt-swse/templates/apps/progression-framework/dialogs/custom-language-dialog.hbs',
    position: {
      width: 440,
      height: 'auto',
    },
    window: {
      positioned: true,
      resizable: false,
      minimizable: false,
      frame: true,
    },
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, this.DEFAULT_OPTIONS);
  }

  constructor({ suggestedName = '' } = {}) {
    super();
    this.suggestedName = suggestedName;
    this.result = null;
    this.onDecision = null;
  }

  static async prompt({ suggestedName = '' } = {}) {
    if (this.#instance) {
      this.#instance.bringToFront();
      return new Promise((resolve) => {
        this.#instance.onDecision = resolve;
      });
    }

    const dialog = new this({ suggestedName });
    this.#instance = dialog;

    return new Promise((resolve) => {
      dialog.onDecision = (value) => {
        this.#instance = null;
        resolve(value);
      };
      dialog.render(true);
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      suggestedName: this.suggestedName,
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    const form = root.querySelector('.swse-custom-language-dialog__form');
    const input = root.querySelector('[name="languageName"]');
    const cancel = root.querySelector('[data-action="cancel"]');
    const close = root.querySelector('[data-action="close"]');
    const confirm = root.querySelector('[data-action="confirm"]');

    const submit = (ev) => {
      ev?.preventDefault?.();
      const raw = input?.value ?? '';
      const name = String(raw).trim();
      if (!name) {
        input?.focus();
        return;
      }
      this.result = name;
      this.close();
    };

    form?.addEventListener('submit', submit);
    confirm?.addEventListener('click', submit);
    cancel?.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.result = null;
      this.close();
    });
    close?.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.result = null;
      this.close();
    });

    window.requestAnimationFrame(() => {
      input?.focus();
      input?.select();
    });
  }

  async close(options = {}) {
    if (typeof this.onDecision === 'function') {
      this.onDecision(this.result);
      this.onDecision = null;
    }
    return super.close(options);
  }
}
