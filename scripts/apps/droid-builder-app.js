/**
 * Droid Builder Application (AppV2-Compliant)
 * Phase 1: Skeleton builder for degree and size selection
 * Proves document-driven architecture before adding full feature set
 */

import { DroidValidationEngine } from '../engine/droid-validation-engine.js';
import SWSEApplication from './base/swse-application.js';

export class DroidBuilderApp extends SWSEApplication {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    // UI state: in-memory copy of droid systems for validation
    this.droidSystems = this._initializeDroidSystems();
    this.currentStep = 'intro';
  }

  /**
   * Initialize droid systems from actor or create empty
   */
  _initializeDroidSystems() {
    if (this.actor?.system?.droidSystems) {
      return foundry.utils.deepClone(this.actor.system.droidSystems);
    }
    return {
      degree: '',
      size: 'Medium',
      locomotion: { id: '', name: '', cost: 0, speed: 0 },
      processor: { id: '', name: '', cost: 0, bonus: 0 },
      appendages: [],
      accessories: [],
      credits: { total: 2000, spent: 0, remaining: 2000 }
    };
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEApplication.DEFAULT_OPTIONS ?? {},
    {
      classes: ['swse', 'droid-builder-app', 'swse-app'],
      template: 'systems/foundryvtt-swse/templates/apps/droid-builder.hbs',
      position: { width: 800, height: 650 },
      title: 'Droid Builder (Seraphim)',
      resizable: true,
      draggable: true
    }
  );

  /**
   * AppV2 contract: Bridge legacy DEFAULT_OPTIONS to defaultOptions
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

  /**
   * Prepare all context from state
   * AppV2 pattern: all rendering context computed here
   */
  async _prepareContext(options) {
    const context = {};

    context.actor = this.actor;
    context.currentStep = this.currentStep;
    context.droidSystems = this.droidSystems;

    // Available degrees
    context.degrees = [
      { id: 'Third-Degree', label: 'Third-Degree Droid' },
      { id: 'Second-Degree', label: 'Second-Degree Droid' },
      { id: 'First-Degree', label: 'First-Degree Droid' }
    ];

    // Available sizes
    context.sizes = [
      { id: 'Tiny', label: 'Tiny' },
      { id: 'Small', label: 'Small' },
      { id: 'Medium', label: 'Medium' },
      { id: 'Large', label: 'Large' },
      { id: 'Huge', label: 'Huge' }
    ];

    // Budget info
    context.budget = DroidValidationEngine.calculateBudget(this.droidSystems);

    // Validation state
    const validation = DroidValidationEngine.validateDroidConfiguration(this.droidSystems);
    context.isValid = validation.valid;
    context.validationErrors = validation.errors;

    return context;
  }

  /**
   * Bind events
   * AppV2 pattern: _onRender only binds events, no logic
   */
  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    // Degree selection
    root.querySelectorAll('.select-degree').forEach(el => {
      el.addEventListener('click', this._onSelectDegree.bind(this));
    });

    // Size selection
    root.querySelectorAll('.select-size').forEach(el => {
      el.addEventListener('click', this._onSelectSize.bind(this));
    });

    // Next step
    const nextBtn = root.querySelector('.next-step');
    if (nextBtn) {
      nextBtn.addEventListener('click', this._onNextStep.bind(this));
    }

    // Finalize button
    const finalizeBtn = root.querySelector('.finalize-droid');
    if (finalizeBtn) {
      finalizeBtn.addEventListener('click', this._onFinalizeDroid.bind(this));
    }

    // Reset button
    const resetBtn = root.querySelector('.reset-droid');
    if (resetBtn) {
      resetBtn.addEventListener('click', this._onResetDroid.bind(this));
    }
  }

  /**
   * Select droid degree
   */
  async _onSelectDegree(event) {
    event.preventDefault();
    const degree = event.currentTarget.dataset.degree;
    this.droidSystems.degree = degree;
    await this.render(false);
  }

  /**
   * Select droid size
   */
  async _onSelectSize(event) {
    event.preventDefault();
    const size = event.currentTarget.dataset.size;
    this.droidSystems.size = size;
    await this.render(false);
  }

  /**
   * Move to next step
   */
  async _onNextStep(event) {
    event.preventDefault();

    if (this.currentStep === 'intro') {
      // Validate degree selection
      if (!this.droidSystems.degree) {
        ui.notifications.warn('Please select a droid degree');
        return;
      }
      this.currentStep = 'size';
    } else if (this.currentStep === 'size') {
      // Validate size selection
      if (!this.droidSystems.size) {
        ui.notifications.warn('Please select a droid size');
        return;
      }
      this.currentStep = 'review';
    }

    await this.render(true);
  }

  /**
   * Finalize droid configuration
   * Single atomic mutation to actor
   */
  async _onFinalizeDroid(event) {
    event.preventDefault();

    // Validate complete configuration
    const validation = DroidValidationEngine.validateDroidConfiguration(this.droidSystems);
    if (!validation.valid) {
      ui.notifications.error(
        `Cannot finalize: ${validation.errors.join('; ')}`
      );
      return;
    }

    // Confirm
    const confirmed = await Dialog.confirm({
      title: 'Finalize Droid Configuration?',
      content: `
        <p><strong>Degree:</strong> ${this.droidSystems.degree}</p>
        <p><strong>Size:</strong> ${this.droidSystems.size}</p>
        <p><strong>Spent:</strong> ${this.droidSystems.credits.spent} / ${this.droidSystems.credits.total} credits</p>
        <hr/>
        <p>This configuration will be saved to the droid.</p>
      `
    });

    if (!confirmed) {return;}

    // ATOMIC UPDATE: Only mutation in entire builder
    try {
      await this.actor.update({
        'system.droidSystems': this.droidSystems
      });

      ui.notifications.info(`Droid configuration saved to ${this.actor.name}!`);
      this.close();
    } catch (err) {
      ui.notifications.error(`Failed to save droid: ${err.message}`);
    }
  }

  /**
   * Reset builder
   */
  async _onResetDroid(event) {
    event.preventDefault();

    const confirmed = await Dialog.confirm({
      title: 'Reset Droid Builder?',
      content: '<p>Discard all changes and start over?</p>'
    });

    if (!confirmed) {return;}

    this.droidSystems = this._initializeDroidSystems();
    this.currentStep = 'intro';
    await this.render(true);
  }

  /**
   * Static method to open the builder
   */
  static async open(actor) {
    if (!actor) {
      ui.notifications.error('No actor provided to droid builder');
      return;
    }

    const app = new DroidBuilderApp(actor);
    app.render(true);
  }
}
