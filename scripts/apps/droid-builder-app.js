/**
 * Droid Builder Application (AppV2-Compliant)
 * Phase 1: Skeleton builder for degree and size selection
 * Phase 2: Full system selection (locomotion, manipulators, sensors, processor, armor, weapons, accessories)
 */

import { DroidValidationEngine } from '../engine/droid-validation-engine.js';
import { StepController } from './step-controller.js';
import SWSEApplication from './base/swse-application.js';

export class DroidBuilderApp extends SWSEApplication {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    // UI state: in-memory copy of droid systems for validation
    this.droidSystems = this._initializeDroidSystems();
    this.currentStep = 'intro';

    // Initialize StepController for Phase 2
    this.stepController = new StepController(
      this.droidSystems,
      this.actor,
      DroidBuilderApp.SYSTEM_CATALOG
    );

    // Track if user came from back navigation (for auto-prune)
    this.comeFromBack = false;
  }

  /**
   * Initialize droid systems from actor or create empty
   * Includes all Phase 2 systems
   */
  _initializeDroidSystems() {
    if (this.actor?.system?.droidSystems) {
      return foundry.utils.deepClone(this.actor.system.droidSystems);
    }
    return {
      // Degree and size (Phase 1)
      degree: '',
      size: 'Medium',

      // Phase 2 single-select systems
      locomotion: { id: '', name: '', cost: 0, speed: 0 },
      processor: { id: '', name: '', cost: 0, bonus: 0 },
      armor: { id: '', name: '', cost: 0, bonus: 0 },

      // Phase 2 multi-select systems
      appendages: [],
      sensors: [],
      weapons: [],
      accessories: [],

      // Budget tracking
      credits: { total: 2000, spent: 0, remaining: 2000 }
    };
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEApplication.DEFAULT_OPTIONS ?? {},
    {
      classes: ['swse', 'droid-builder-app', 'swse-app'],
      template: 'systems/foundryvtt-swse/templates/apps/droid-builder.hbs',
      position: { width: 800, height: 700 },
      title: 'Droid Builder (Seraphim)',
      resizable: true,
      draggable: true
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // PHASE 2 STEP CONFIGURATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Step metadata for all 7 Phase 2 steps + review
   * Each step is processed by StepController with identical logic
   */
  static STEP_CONFIG = {
    locomotion: {
      label: 'Select Locomotion',
      stepNumber: 1,
      total: 8,
      selectionType: 'single',
      required: true,
      mutation: 'locomotion',
      validation: 'validateLocomotion'
    },

    manipulators: {
      label: 'Select Manipulators',
      stepNumber: 2,
      total: 8,
      selectionType: 'multiple',
      required: true,
      mutation: 'appendages',
      validation: 'validateAppendages'
    },

    sensors: {
      label: 'Select Sensors',
      stepNumber: 3,
      total: 8,
      selectionType: 'multiple',
      required: false,
      mutation: 'sensors',
      validation: 'validateSensors'
    },

    processor: {
      label: 'Select Processor',
      stepNumber: 4,
      total: 8,
      selectionType: 'single',
      required: true,
      mutation: 'processor',
      validation: 'validateProcessor'
    },

    armor: {
      label: 'Select Armor',
      stepNumber: 5,
      total: 8,
      selectionType: 'single',
      required: true,
      mutation: 'armor',
      validation: 'validateArmor'
    },

    weapons: {
      label: 'Select Weapons',
      stepNumber: 6,
      total: 8,
      selectionType: 'multiple',
      required: false,
      mutation: 'weapons',
      validation: 'validateWeapons'
    },

    accessories: {
      label: 'Select Accessories',
      stepNumber: 7,
      total: 8,
      selectionType: 'multiple',
      required: false,
      mutation: 'accessories',
      validation: 'validateAccessories'
    }
  };

  /**
   * Step order for navigation
   */
  static STEP_ORDER = [
    'intro',
    'size',
    'locomotion',
    'manipulators',
    'sensors',
    'processor',
    'armor',
    'weapons',
    'accessories',
    'review'
  ];

  /**
   * System catalogs (temporary placeholders)
   * TODO: Load from compendiums or config later
   */
  static SYSTEM_CATALOG = {
    locomotion: [
      { id: 'treads', name: 'Treads', cost: 200, speed: 20 },
      { id: 'wheels', name: 'Wheels', cost: 150, speed: 25 },
      { id: 'legs', name: 'Legs', cost: 300, speed: 20 },
      { id: 'hover', name: 'Hover Repulsors', cost: 450, speed: 30 },
      { id: 'flight', name: 'Flight Servos', cost: 600, speed: 40 }
    ],
    manipulators: [
      { id: 'hand', name: 'Manipulator Hand', cost: 150, dexBonus: 1 },
      { id: 'gripper', name: 'Gripper Claw', cost: 100, dexBonus: 0 },
      { id: 'tentacle', name: 'Tentacle', cost: 200, dexBonus: 2 },
      { id: 'saw', name: 'Cutting Saw', cost: 300, dexBonus: 0 },
      { id: 'probe', name: 'Probe Arm', cost: 120, dexBonus: 0 }
    ],
    sensors: [
      { id: 'optical', name: 'Optical Sensors', cost: 350, searchBonus: 1 },
      { id: 'thermal', name: 'Thermal Imaging', cost: 500, searchBonus: 2 },
      { id: 'motion', name: 'Motion Detector', cost: 250, searchBonus: 1 },
      { id: 'radiation', name: 'Radiation Detector', cost: 400, searchBonus: 1 },
      { id: 'olfactory', name: 'Olfactory Sensors', cost: 150, searchBonus: 1 }
    ],
    processor: [
      { id: 'simple', name: 'Simple Processor', cost: 200, bonus: 0 },
      { id: 'standard', name: 'Standard Processor', cost: 350, bonus: 1 },
      { id: 'advanced', name: 'Advanced Processor', cost: 600, bonus: 2 },
      { id: 'elite', name: 'Elite Processor', cost: 1000, bonus: 3 }
    ],
    armor: [
      { id: 'light', name: 'Light Armor', cost: 150, bonus: 1 },
      { id: 'medium', name: 'Medium Armor', cost: 300, bonus: 2 },
      { id: 'heavy', name: 'Heavy Armor', cost: 500, bonus: 3 },
      { id: 'reinforced', name: 'Reinforced Plating', cost: 800, bonus: 4 }
    ],
    weapons: [
      { id: 'blaster', name: 'Blaster Pistol', cost: 400, damage: '3d6' },
      { id: 'rifle', name: 'Blaster Rifle', cost: 600, damage: '4d6' },
      { id: 'laser', name: 'Laser Cannon', cost: 1000, damage: '5d6' },
      { id: 'flamer', name: 'Flamethrower', cost: 800, damage: '4d6' }
    ],
    accessories: [
      { id: 'holo', name: 'Holographic Projector', cost: 200 },
      { id: 'comlink', name: 'Enhanced Comlink', cost: 100 },
      { id: 'medical', name: 'Medical Kit', cost: 300 },
      { id: 'toolkit', name: 'Repair Tool Kit', cost: 250 },
      { id: 'translation', name: 'Translation Matrix', cost: 150 }
    ]
  };

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
    context.budget = this.stepController.getBudget();

    // Validation state
    const validation = DroidValidationEngine.validateDroidConfiguration(this.droidSystems);
    context.isValid = validation.valid;
    context.validationErrors = validation.errors;

    // Phase 2: Step-specific context
    const stepConfig = DroidBuilderApp.STEP_CONFIG[this.currentStep];
    if (stepConfig) {
      context.stepConfig = stepConfig;
      context.availableItems = this.stepController.getAvailable(this.currentStep);
      context.selectedItems = this.stepController.getSelected(stepConfig);

      // Mark items with affordability and selection status
      const selectedIds = Array.isArray(context.selectedItems)
        ? context.selectedItems.map(s => s.id)
        : (context.selectedItems?.id ? [context.selectedItems.id] : []);

      context.availableItems = context.availableItems.map(item => ({
        ...item,
        canAfford: this.stepController.canAddItem(item),
        isSelected: selectedIds.includes(item.id)
      }));
    }

    // Navigation availability
    context.canGoNext = !!this._getNextStepName(this.currentStep);
    context.canGoBack = !!this._getPrevStepName(this.currentStep);

    // Step info
    context.stepNumber = stepConfig?.stepNumber || 0;
    context.totalSteps = stepConfig?.total || 0;

    return context;
  }

  /**
   * Bind events
   * AppV2 pattern: _onRender only binds events, no logic
   */
  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    // Phase 1: Degree selection
    root.querySelectorAll('.select-degree').forEach(el => {
      el.addEventListener('click', this._onSelectDegree.bind(this));
    });

    // Phase 1: Size selection
    root.querySelectorAll('.select-size').forEach(el => {
      el.addEventListener('click', this._onSelectSize.bind(this));
    });

    // Phase 2: Single-select items (radio buttons)
    root.querySelectorAll('input[type="radio"][name="system-select"]').forEach(el => {
      el.addEventListener('change', this._onItemSelected.bind(this));
    });

    // Phase 2: Multi-select items (checkboxes)
    root.querySelectorAll('input[type="checkbox"][name="system-select"]').forEach(el => {
      el.addEventListener('change', this._onItemToggled.bind(this));
    });

    // Navigation buttons
    const nextBtn = root.querySelector('.next-step');
    if (nextBtn) {
      nextBtn.addEventListener('click', this._onNextStep.bind(this));
    }

    const backBtn = root.querySelector('.back-step');
    if (backBtn) {
      backBtn.addEventListener('click', this._onBackStep.bind(this));
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

    // Update budget bar width
    const budgetBar = root.querySelector('.budget-bar');
    if (budgetBar) {
      const total = parseInt(budgetBar.dataset.budgetTotal) || 1;
      const spent = parseInt(budgetBar.dataset.budgetSpent) || 0;
      const percent = Math.min((spent / total) * 100, 100);
      const spentElement = budgetBar.querySelector('.budget-spent');
      if (spentElement) {
        spentElement.style.width = `${percent}%`;
      }
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
   * Handle single-select item (radio button)
   */
  async _onItemSelected(event) {
    event.preventDefault();

    const stepName = event.target.dataset.step;
    const itemId = event.target.value;
    const config = DroidBuilderApp.STEP_CONFIG[stepName];

    if (!config) {
      ui.notifications.error(`Unknown step: ${stepName}`);
      return;
    }

    const result = await this.stepController.selectItem(stepName, itemId, config);

    if (!result.success) {
      ui.notifications.error(result.error);
      return;
    }

    await this.render(false); // Update budget display
  }

  /**
   * Handle multi-select item (checkbox)
   */
  async _onItemToggled(event) {
    event.preventDefault();

    const stepName = event.target.dataset.step;
    const itemId = event.target.value;
    const add = event.target.checked;
    const config = DroidBuilderApp.STEP_CONFIG[stepName];

    if (!config) {
      ui.notifications.error(`Unknown step: ${stepName}`);
      return;
    }

    const result = await this.stepController.toggleItem(stepName, itemId, add, config);

    if (!result.success) {
      ui.notifications.error(result.error);
      return;
    }

    await this.render(false); // Update budget display
  }

  /**
   * Move to next step
   * Handles all Phase 1 (intro, size) and Phase 2 (locomotion through accessories) steps
   */
  async _onNextStep(event) {
    event.preventDefault();

    const nextStepName = this._getNextStepName(this.currentStep);
    if (!nextStepName) return;

    // Phase 1: Intro and Size (no StepController)
    if (this.currentStep === 'intro') {
      if (!this.droidSystems.degree) {
        ui.notifications.warn('Please select a droid degree');
        return;
      }
      this.currentStep = nextStepName;
      await this.render(true);
      return;
    }

    if (this.currentStep === 'size') {
      if (!this.droidSystems.size) {
        ui.notifications.warn('Please select a droid size');
        return;
      }
      this.currentStep = nextStepName;
      await this.render(true);
      return;
    }

    // Phase 2: All system selection steps use StepController
    const currentConfig = DroidBuilderApp.STEP_CONFIG[this.currentStep];
    if (currentConfig) {
      const validationFn = DroidValidationEngine[currentConfig.validation];
      if (!validationFn) {
        ui.notifications.error(`No validation function for ${this.currentStep}`);
        return;
      }

      // Validate and check progression
      const result = await this.stepController.nextStep(
        this.currentStep,
        nextStepName,
        validationFn,
        currentConfig,
        DroidBuilderApp.STEP_ORDER
      );

      if (!result.success) {
        ui.notifications.error(result.errors.join('; '));
        return;
      }

      // Handle auto-pruning if user came from back-edit
      if (this.comeFromBack && result.prunedSteps?.length > 0) {
        ui.notifications.info(
          `${result.prunedSteps.length} selection(s) cleared due to incompatibility.`
        );
      }
      this.comeFromBack = false;

      // Advance
      this.currentStep = nextStepName;
      await this.render(true);
      return;
    }

    // Review step: just go to finalize
    if (this.currentStep === 'review') {
      this.currentStep = nextStepName; // Should be null; do nothing
      return;
    }
  }

  /**
   * Go back to previous step
   */
  async _onBackStep(event) {
    event.preventDefault();

    const prevStepName = this._getPrevStepName(this.currentStep);
    if (!prevStepName) return;

    // Record back navigation for auto-prune on next
    await this.stepController.backStep(this.currentStep, prevStepName);

    this.currentStep = prevStepName;
    this.comeFromBack = true; // Flag for auto-prune on next
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
        <p><strong>Locomotion:</strong> ${this.droidSystems.locomotion?.name || 'None'}</p>
        <p><strong>Appendages:</strong> ${this.droidSystems.appendages?.length || 0}</p>
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
    this.comeFromBack = false;
    await this.render(true);
  }

  /**
   * Get next step in sequence
   */
  _getNextStepName(current) {
    const order = DroidBuilderApp.STEP_ORDER;
    const idx = order.indexOf(current);
    return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  }

  /**
   * Get previous step in sequence
   */
  _getPrevStepName(current) {
    const order = DroidBuilderApp.STEP_ORDER;
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
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
