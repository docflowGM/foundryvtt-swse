import SWSEApplicationV2 from '/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js';

function getAppRoot(app) {
  if (app?.element instanceof HTMLElement) return app.element;
  if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
  return document.getElementById?.(app?.id) || null;
}

/**
 * AppV2 modal used by background grants that require a small follow-up choice.
 *
 * Replaces legacy Dialog usage so progression remains on the Foundry v13/v14
 * ApplicationV2 path. Supports either radio-style single choice or checkbox
 * multi-choice validation.
 */
export class BackgroundChoiceDialog extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = {
    ...SWSEApplicationV2.DEFAULT_OPTIONS,
    id: 'swse-background-choice-dialog',
    classes: [
      ...(SWSEApplicationV2.DEFAULT_OPTIONS?.classes || []),
      'swse-background-choice-dialog-app'
    ],
    position: {
      width: 520,
      height: 'auto'
    },
    window: {
      title: 'Background Choice',
      resizable: false,
      draggable: true,
      frame: true
    }
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/dialogs/background-choice-dialog.hbs'
    }
  };

  constructor({
    title = 'Background Choice',
    backgroundName = 'Background',
    prompt = '',
    choices = [],
    requiredCount = 1,
    inputType = 'checkbox',
    fieldName = 'backgroundChoice',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel'
  } = {}) {
    super({});
    this.title = title;
    this.backgroundName = backgroundName;
    this.prompt = prompt;
    this.choices = Array.isArray(choices) ? choices : [];
    this.requiredCount = Math.max(1, Number(requiredCount || 1));
    this.inputType = inputType === 'radio' ? 'radio' : 'checkbox';
    this.fieldName = fieldName || 'backgroundChoice';
    this.confirmLabel = confirmLabel;
    this.cancelLabel = cancelLabel;
    this.result = null;
    this.onDecision = null;
    this._settled = false;
  }

  static async prompt(options = {}) {
    const dialog = new this(options);
    return new Promise((resolve) => {
      dialog.onDecision = resolve;
      dialog.render(true);
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const isRadio = this.inputType === 'radio';
    const requiredText = isRadio
      ? 'Pick one option.'
      : `Pick exactly ${this.requiredCount} option${this.requiredCount === 1 ? '' : 's'}.`;

    return {
      ...context,
      title: this.title,
      backgroundName: this.backgroundName,
      prompt: this.prompt,
      requiredCount: this.requiredCount,
      requiredText,
      inputType: this.inputType,
      fieldName: this.fieldName,
      confirmLabel: this.confirmLabel,
      cancelLabel: this.cancelLabel,
      choices: this.choices.map((choice, index) => ({
        ...choice,
        value: String(choice?.value ?? choice?.label ?? ''),
        label: String(choice?.label ?? choice?.value ?? ''),
        hint: String(choice?.hint || ''),
        ability: String(choice?.ability || ''),
        abilityLabel: String(choice?.abilityLabel || ''),
        abilityClass: String(choice?.abilityClass || ''),
        checked: Boolean(choice?.checked ?? (isRadio ? index === 0 : index < this.requiredCount))
      })).filter(choice => choice.value && choice.label)
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = getAppRoot(this);
    if (!root) {
      console.warn('[BackgroundChoiceDialog] Unable to bind modal controls: root element missing');
      return;
    }

    root.style.zIndex = String(Math.max(Number(root.style.zIndex || 0), 120000));

    const form = root.querySelector('[data-background-choice-form]');
    const confirm = root.querySelector('[data-action="confirm-choice"]');
    const cancel = root.querySelector('[data-action="cancel-choice"]');

    const submitChoice = async (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      await this.#submit(root);
    };
    const cancelChoice = async (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      this.#settle(null);
      await this.close();
    };

    form?.addEventListener('submit', submitChoice);
    confirm?.addEventListener('click', submitChoice);
    cancel?.addEventListener('click', cancelChoice);

    // AppV2 can rehydrate part internals during the same render cycle. Keep a
    // delegated backup on the application root so the modal still resolves even
    // if direct button bindings were attached before the final form node landed.
    root.addEventListener('submit', async (event) => {
      if (!event.target?.matches?.('[data-background-choice-form]')) return;
      await submitChoice(event);
    });
    root.addEventListener('click', async (event) => {
      const action = event.target?.closest?.('[data-action]')?.dataset?.action;
      if (action === 'confirm-choice') await submitChoice(event);
      if (action === 'cancel-choice') await cancelChoice(event);
    });

    window.requestAnimationFrame(() => {
      root.querySelector(`input[name="${this.fieldName}"]`)?.focus?.();
    });
  }

  async #submit(root) {
    const selected = Array.from(root.querySelectorAll(`input[name="${this.fieldName}"]:checked`))
      .map(input => String(input.value || '').trim())
      .filter(Boolean);

    if (selected.length !== this.requiredCount) {
      const noun = this.requiredCount === 1 ? 'option' : 'options';
      ui.notifications?.warn?.(`Pick exactly ${this.requiredCount} ${noun}.`);
      return;
    }

    this.#settle(selected);
    await this.close();
  }

  #settle(value) {
    if (this._settled) return;
    this._settled = true;
    this.result = value;
    if (typeof this.onDecision === 'function') {
      const resolve = this.onDecision;
      this.onDecision = null;
      resolve(this.result);
    }
  }

  async close(options = {}) {
    if (!this._settled) this.#settle(null);
    return super.close(options);
  }
}
