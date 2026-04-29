/**
 * Custom SWSE recovery session dialog
 * Replaces the default Foundry Dialog with a datapad-styled modal
 * Single-instance guard prevents duplicate prompts
 */

import SWSEApplicationV2 from '/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js';

export class RecoverySessionDialog extends SWSEApplicationV2 {
  // Single-instance guard: only one dialog can exist at a time
  static #instance = null;

  static DEFAULT_OPTIONS = {
    id: 'swse-recovery-session-dialog',
    classes: ['swse-recovery-dialog'],
    template: 'systems/foundryvtt-swse/templates/apps/progression-framework/dialogs/recovery-session-dialog.hbs',
    position: {
      width: 420,
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

  constructor(summary) {
    super();
    this.summary = summary;
    this.decision = null;
  }

  /**
   * Open the dialog, ensuring only one instance exists
   * @param {Object} summary - Session summary with preview, timestamp, etc.
   * @returns {Promise<boolean>} - true to resume, false to start fresh
   */
  static async prompt(summary) {
    // If a dialog already exists, focus it instead of creating another
    if (this.#instance) {
      this.#instance.bringToFront();
      return new Promise((resolve) => {
        this.#instance.onDecision = resolve;
      });
    }

    // Create new dialog
    const dialog = new this(summary);
    this.#instance = dialog;

    return new Promise((resolve) => {
      dialog.onDecision = (decision) => {
        this.#instance = null;
        resolve(decision);
      };
      dialog.render(true);
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      summary: this.summary,
      savedAt: new Date(this.summary.timestamp).toLocaleString(),
      preview: this.summary.preview || 'Previous progression session',
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._setupEventListeners();
  }

  _onClose(options) {
    // Called when dialog closes - handle the user's decision
    if (this.onDecision && this.decision !== null) {
      this.onDecision(this.decision);
    } else if (this.onDecision && this.decision === null) {
      // User clicked Cancel - treat as "don't resume"
      this.onDecision(false);
    }
    return super._onClose(options);
  }

  _setupEventListeners() {
    const html = this.element;
    if (!html) return;

    html.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const action = btn.dataset.action;
        this._handleAction(action);
      });
    });
  }

  _handleAction(action) {
    if (action === 'resume') {
      this.decision = true;
      this.close();
    } else if (action === 'start-fresh') {
      this.decision = false;
      this.close();
    } else if (action === 'close') {
      this.decision = null;
      this.close();
    }
  }

  async close(options = {}) {
    if (this.onDecision && this.decision !== null) {
      this.onDecision(this.decision);
    } else if (this.onDecision && this.decision === null) {
      // User clicked Cancel - treat as "don't resume"
      this.onDecision(false);
    }
    return super.close(options);
  }
}
