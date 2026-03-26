/**
 * Droid Builder Step — Progression Framework Integration
 *
 * WAVE 12: Controlled migration of working droid builder logic into the progression shell.
 *
 * This step wraps the existing authoritative droid builder and exposes it as a shell-native step.
 * It preserves all purchasing logic, validation, and state management from the original builder.
 *
 * Architecture:
 * - Cannibalizes existing droid builder purchasing/validation logic
 * - Wraps in shell-friendly step interface
 * - Maintains clear adapter boundary between shell and subsystem logic
 * - Preserves full droid package in committed selection
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { DROID_SYSTEMS } from '../../../data/droid-systems.js';
import { swseLogger } from '../../../utils/logger.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';

export class DroidBuilderStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._droidState = null;
  }

  /**
   * Called when the shell navigates TO this step.
   * Initialize droid builder state.
   */
  async onStepEnter(shell) {
    // Ensure droid builder state exists
    if (!this._droidState) {
      this._droidState = this._initializeDroidState(shell.actor);
    }
  }

  /**
   * Initialize droid builder state from actor or defaults.
   */
  _initializeDroidState(actor) {
    if (!actor) {
      return null;
    }

    // Check if actor is a droid character
    const isDroid = actor?.system?.isDroid || false;
    if (!isDroid) {
      return null;
    }

    // Get house rule settings
    const baseCredits = game.settings.get('foundryvtt-swse', 'droidConstructionCredits') || 1000;

    // Initialize with actor's current droid state, or defaults
    const droidSystems = actor?.system?.droidSystems || {
      locomotion: null,
      processor: { id: 'heuristic', name: 'Heuristic Processor', cost: 0, weight: 5 },
      appendages: [],
      accessories: [],
      locomotionEnhancements: [],
      appendageEnhancements: [],
      totalCost: 0,
      totalWeight: 0
    };

    // Deep copy systems to avoid mutating actor data directly during building
    const systemsCopy = JSON.parse(JSON.stringify(droidSystems));

    return {
      isDroid: true,
      droidDegree: actor?.system?.droidDegree || '1st-degree',
      droidSize: actor?.system?.droidSize || 'medium',
      droidSystems: systemsCopy,
      droidCredits: {
        base: baseCredits,
        spent: actor?.system?.droidCredits?.spent || 0,
        remaining: baseCredits - (actor?.system?.droidCredits?.spent || 0)
      }
    };
  }

  /**
   * Provide step data to templates.
   */
  async getStepData(context) {
    if (!this._droidState) {
      return {};
    }

    // Build presentation data for templates
    const presentation = this._buildDroidPresentation();
    const readiness = this._validateDroidBuild();

    return {
      droidState: { ...this._droidState },
      presentation,
      readiness,
      buildComplete: readiness.isValid,
      buildIssues: readiness.issues,
    };
  }

  /**
   * Return selection state — droid builder works as a single configuration step.
   */
  getSelection() {
    return {
      selected: [this._droidState?.droidSize || ''],
      count: 1,
      isComplete: this._validateDroidBuild().isValid,
    };
  }

  /**
   * Return blocking issues that prevent advancing.
   */
  getBlockingIssues() {
    const readiness = this._validateDroidBuild();
    return readiness.isValid ? [] : readiness.issues;
  }

  /**
   * Build presentation-friendly droid data.
   */
  _buildDroidPresentation() {
    if (!this._droidState) return {};

    const sys = this._droidState.droidSystems;
    const credits = this._droidState.droidCredits;

    return {
      title: 'DROID CHASSIS CONFIGURATION',
      subtitle: 'Select systems and components to assemble your droid.',

      droidInfo: {
        degree: this._droidState.droidDegree,
        size: this._droidState.droidSize,
      },

      selectedSystems: {
        locomotion: sys.locomotion,
        processor: sys.processor,
        appendages: sys.appendages,
        accessories: sys.accessories,
        locomotionEnhancements: sys.locomotionEnhancements || [],
        appendageEnhancements: sys.appendageEnhancements || [],
      },

      buildTotals: {
        systemCount: this._countSelectedSystems(),
        totalCost: sys.totalCost || 0,
        totalWeight: sys.totalWeight || 0,
        creditsBase: credits.base,
        creditsSpent: credits.spent,
        creditsRemaining: credits.remaining,
      },

      availableSystems: {
        locomotion: DROID_SYSTEMS.locomotion,
        processors: DROID_SYSTEMS.processors,
        appendages: DROID_SYSTEMS.appendages,
        accessories: DROID_SYSTEMS.accessories,
        locomotionEnhancements: DROID_SYSTEMS.locomotionEnhancements || [],
        appendageEnhancements: DROID_SYSTEMS.appendageEnhancements || [],
      },

      costFactor: this._getCostFactor(),
    };
  }

  /**
   * Validate droid build completeness.
   */
  _validateDroidBuild() {
    const sys = this._droidState.droidSystems;
    const credits = this._droidState.droidCredits;
    const issues = [];

    // Check required systems
    if (!sys.locomotion) {
      issues.push('Locomotion system required');
    }

    if (!sys.processor) {
      issues.push('Processor required');
    }

    // Check appendages (must have at least one)
    if (!sys.appendages || sys.appendages.length === 0) {
      issues.push('At least one appendage required');
    }

    // Check budget
    if (credits.remaining < 0) {
      issues.push('Over budget - remove systems to proceed');
    }

    // Check for free Heuristic processor requirement
    if (sys.processor && sys.processor.id !== 'heuristic') {
      issues.push('Heuristic processor required for playable droids');
    }

    return {
      isValid: issues.length === 0,
      issues,
      summary: issues.length === 0
        ? `Droid chassis configuration complete. Ready to proceed.`
        : `${issues.length} requirement${issues.length !== 1 ? 's' : ''} not met.`,
    };
  }

  /**
   * Count selected systems for display.
   */
  _countSelectedSystems() {
    const sys = this._droidState.droidSystems;
    let count = 0;

    if (sys.locomotion) count++;
    if (sys.processor) count++;
    count += (sys.appendages || []).length;
    count += (sys.accessories || []).length;
    count += (sys.locomotionEnhancements || []).length;
    count += (sys.appendageEnhancements || []).length;

    return count;
  }

  /**
   * Get cost factor based on droid size.
   */
  _getCostFactor() {
    const size = this._droidState?.droidSize || 'medium';
    const costFactors = {
      'tiny': 5,
      'small': 2,
      'medium': 1,
      'large': 2,
      'huge': 5,
      'gargantuan': 10,
      'colossal': 20
    };
    return costFactors[size] || 1;
  }

  /**
   * Purchase a system.
   * Cannibalizes logic from original chargen-droid.js _onPurchaseSystem
   */
  purchaseSystem(category, id, subcategory = null) {
    if (!this._droidState) return false;

    const sys = this._droidState.droidSystems;
    const credits = this._droidState.droidCredits;
    let system = null;
    let cost = 0;

    try {
      if (category === 'locomotion') {
        system = DROID_SYSTEMS.locomotion.find(s => s.id === id);
        if (system) {
          const speed = this._calculateLocomotionSpeed(system);
          const weight = this._calculateWeight(system);
          cost = this._calculateLocomotionCost(system, speed);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for locomotion');
            return false;
          }

          // Remove old locomotion cost if replacing
          if (sys.locomotion) {
            credits.spent -= sys.locomotion.cost;
          }

          sys.locomotion = {
            id: system.id,
            name: system.name,
            cost,
            weight,
            speed
          };
        }
      } else if (category === 'processor') {
        system = DROID_SYSTEMS.processors.find(s => s.id === id);
        if (system) {
          cost = this._calculateProcessorCost(system);
          const weight = this._calculateProcessorWeight(system);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for processor');
            return false;
          }

          // Remove old processor cost if replacing
          if (sys.processor) {
            credits.spent -= sys.processor.cost;
          }

          sys.processor = {
            id: system.id,
            name: system.name,
            cost,
            weight
          };
        }
      } else if (category === 'appendage') {
        system = DROID_SYSTEMS.appendages.find(s => s.id === id);
        if (system) {
          const weight = this._calculateWeight(system);
          const isFreeHand = (id === 'hand' && this._countFreeHands() < 2);
          cost = isFreeHand ? 0 : this._calculateAppendageCost(system);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for appendage');
            return false;
          }

          sys.appendages.push({
            id: system.id,
            name: system.name,
            cost,
            weight
          });

          credits.spent += cost;
        }
      } else if (category === 'accessory') {
        const accessoryCategory = DROID_SYSTEMS.accessories[subcategory];
        system = accessoryCategory?.find(s => s.id === id);
        if (system) {
          cost = this._calculateAccessoryCost(system);
          const weight = this._calculateWeight(system);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for accessory');
            return false;
          }

          sys.accessories.push({
            id: system.id,
            name: system.name,
            category: subcategory,
            cost,
            weight,
            data: system
          });

          credits.spent += cost;
        }
      } else if (category === 'enhancement') {
        const enhancement = DROID_SYSTEMS.locomotionEnhancements?.find(e => e.id === id);
        if (enhancement) {
          cost = this._calculateEnhancementCost(enhancement);

          if (cost > credits.remaining) {
            swseLogger.warn('[DroidBuilderStep] Not enough credits for enhancement');
            return false;
          }

          if (!sys.locomotionEnhancements) sys.locomotionEnhancements = [];
          sys.locomotionEnhancements.push({
            id: enhancement.id,
            name: enhancement.name,
            cost,
            weight: 0
          });

          credits.spent += cost;
        }
      }

      // Update remaining and recalculate totals
      if (cost > 0 || category !== 'appendage') {
        credits.spent += cost;
      }
      credits.remaining = credits.base - credits.spent;
      this._recalculateTotals();

      return true;
    } catch (e) {
      swseLogger.error('[DroidBuilderStep.purchaseSystem]', e);
      return false;
    }
  }

  /**
   * Remove a system.
   * Cannibalizes logic from original chargen-droid.js _onRemoveSystem
   */
  removeSystem(category, id, subcategory = null) {
    if (!this._droidState) return false;

    const sys = this._droidState.droidSystems;
    const credits = this._droidState.droidCredits;

    try {
      if (category === 'locomotion') {
        if (sys.locomotion) {
          credits.spent -= sys.locomotion.cost;
          sys.locomotion = null;
        }
      } else if (category === 'processor') {
        if (sys.processor && sys.processor.id !== 'heuristic') {
          credits.spent -= sys.processor.cost;
          // Reset to free heuristic
          sys.processor = {
            id: 'heuristic',
            name: 'Heuristic Processor',
            cost: 0,
            weight: 5
          };
        }
      } else if (category === 'appendage') {
        const idx = sys.appendages.findIndex(a => a.id === id);
        if (idx >= 0) {
          const app = sys.appendages[idx];
          credits.spent -= app.cost;
          sys.appendages.splice(idx, 1);
        }
      } else if (category === 'accessory') {
        const idx = sys.accessories.findIndex(a => a.id === id);
        if (idx >= 0) {
          const acc = sys.accessories[idx];
          credits.spent -= acc.cost;
          sys.accessories.splice(idx, 1);
        }
      } else if (category === 'enhancement') {
        const idx = sys.locomotionEnhancements?.findIndex(e => e.id === id) ?? -1;
        if (idx >= 0) {
          const enh = sys.locomotionEnhancements[idx];
          credits.spent -= enh.cost;
          sys.locomotionEnhancements.splice(idx, 1);
        }
      }

      credits.remaining = credits.base - credits.spent;
      this._recalculateTotals();

      return true;
    } catch (e) {
      swseLogger.error('[DroidBuilderStep.removeSystem]', e);
      return false;
    }
  }

  /**
   * Helper: Count free hands.
   */
  _countFreeHands() {
    const appendages = this._droidState.droidSystems.appendages || [];
    return appendages.filter(a => a.id === 'hand' && a.cost === 0).length;
  }

  /**
   * Helper: Calculate locomotion speed.
   */
  _calculateLocomotionSpeed(system) {
    const size = this._droidState.droidSize || 'medium';
    return system.speeds?.[size] || system.speeds?.medium || 6;
  }

  /**
   * Helper: Calculate locomotion cost.
   */
  _calculateLocomotionCost(system, speed) {
    const costFactor = this._getCostFactor();
    if (typeof system.costFormula === 'function') {
      return system.costFormula(speed, costFactor);
    }
    return system.cost || 0;
  }

  /**
   * Helper: Calculate appendage cost.
   */
  _calculateAppendageCost(system) {
    const costFactor = this._getCostFactor();
    if (typeof system.cost === 'function') {
      return system.cost(costFactor);
    }
    return system.cost || 0;
  }

  /**
   * Helper: Calculate processor cost.
   */
  _calculateProcessorCost(system) {
    const costFactor = this._getCostFactor();
    // Heuristic is free in chargen
    if (system.id === 'heuristic') return 0;
    if (typeof system.costFormula === 'function') {
      return system.costFormula(costFactor);
    }
    return system.cost || 0;
  }

  /**
   * Helper: Calculate processor weight.
   */
  _calculateProcessorWeight(system) {
    const costFactor = this._getCostFactor();
    if (typeof system.weightFormula === 'function') {
      return system.weightFormula(costFactor);
    }
    return system.weight || 0;
  }

  /**
   * Helper: Calculate accessory cost.
   */
  _calculateAccessoryCost(system) {
    const costFactor = this._getCostFactor();
    if (typeof system.costFormula === 'function') {
      return system.costFormula(costFactor);
    }
    return system.cost || 0;
  }

  /**
   * Helper: Calculate enhancement cost.
   */
  _calculateEnhancementCost(enhancement) {
    const costFactor = this._getCostFactor();
    if (typeof enhancement.costFormula === 'function') {
      return enhancement.costFormula(costFactor);
    }
    if (typeof enhancement.cost === 'function') {
      return enhancement.cost(costFactor);
    }
    return enhancement.cost || 0;
  }

  /**
   * Helper: Calculate weight for any system.
   */
  _calculateWeight(system) {
    const costFactor = this._getCostFactor();
    if (typeof system.weightFormula === 'function') {
      return system.weightFormula(costFactor);
    }
    if (typeof system.weight === 'function') {
      return system.weight(costFactor);
    }
    return system.weight || 0;
  }

  /**
   * Recalculate build totals.
   * Cannibalizes logic from original chargen-droid.js _recalculateDroidTotals
   */
  _recalculateTotals() {
    const sys = this._droidState.droidSystems;
    let totalCost = 0;
    let totalWeight = 0;

    if (sys.locomotion) {
      totalCost += sys.locomotion.cost;
      totalWeight += sys.locomotion.weight;
    }

    if (sys.processor) {
      totalCost += sys.processor.cost;
      totalWeight += sys.processor.weight;
    }

    for (const app of (sys.appendages || [])) {
      totalCost += app.cost;
      totalWeight += app.weight;
    }

    for (const acc of (sys.accessories || [])) {
      totalCost += acc.cost;
      totalWeight += acc.weight;
    }

    for (const enh of (sys.locomotionEnhancements || [])) {
      totalCost += enh.cost;
      totalWeight += enh.weight || 0;
    }

    for (const enh of (sys.appendageEnhancements || [])) {
      totalCost += enh.cost;
      totalWeight += enh.weight || 0;
    }

    sys.totalCost = totalCost;
    sys.totalWeight = totalWeight;
  }

  /**
   * Return work surface rendering spec.
   */
  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/droid-builder-work-surface.hbs',
      data: stepData,
    };
  }

  /**
   * Return details panel rendering spec.
   */
  renderDetailsPanel(focusedItem) {
    if (!this._droidState) {
      return this.renderDetailsPanelEmptyState();
    }

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/droid-builder-details.hbs',
      data: {
        droidInfo: {
          degree: this._droidState.droidDegree,
          size: this._droidState.droidSize,
        },
        selectedSystems: this._droidState.droidSystems,
        categories: this._getSystemCategories(),
        creditsBase: this._droidState.droidCredits.base,
        creditsSpent: this._droidState.droidCredits.spent,
        creditsRemaining: this._droidState.droidCredits.remaining,
        totalCost: this._droidState.droidSystems.totalCost,
        totalWeight: this._droidState.droidSystems.totalWeight,
        systemCount: this._countSelectedSystems(),
      },
    };
  }

  /**
   * Get system category guide for details panel.
   */
  _getSystemCategories() {
    return [
      {
        name: 'Locomotion',
        description: 'How your droid moves (walking, hovering, rolling, etc.)',
        required: true
      },
      {
        name: 'Processor',
        description: 'The droid\'s "brain" - determines capabilities (always Heuristic for PC)',
        required: true
      },
      {
        name: 'Appendages',
        description: 'Limbs and manipulation tools (hands, legs, tools)',
        required: true,
        note: 'First 2 hands are free'
      },
      {
        name: 'Accessories',
        description: 'Optional systems (armor, sensors, shields, etc.)',
        required: false
      }
    ];
  }

  /**
   * Validate droid build state.
   */
  validate() {
    const readiness = this._validateDroidBuild();
    return {
      isValid: readiness.isValid,
      errors: readiness.isValid ? [] : readiness.issues,
      warnings: []
    };
  }

  /**
   * Return footer configuration overrides for droid builder.
   */
  getFooterConfig() {
    const readiness = this._validateDroidBuild();
    return {
      nextLabel: readiness.isValid ? 'Next: Attributes' : 'Complete Build',
      confirmLabel: 'Finalize',
      isBlocked: !readiness.isValid,
    };
  }

  /**
   * Return utility bar configuration for droid builder.
   */
  getUtilityBarConfig() {
    return {
      mode: 'droid-builder',
      showBudgetStatus: true,
      showSystemCount: true,
      showSearchBar: true,
    };
  }

  /**
   * Return mentor guidance text for this step.
   */
  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'droid-builder')
      || 'Make your choice wisely.';
  }

  /**
   * Called when user clicks "Ask Mentor".
   */
  async onAskMentor(shell) {
    // Could open a guidance modal or speak additional advice
    ui.notifications.info('Mentor: Select your droid systems within your budget.');
  }

  /**
   * Called after the step is rendered in the shell.
   * Wire up event handlers for the work surface.
   */
  async afterRender(shell, workSurfaceEl) {
    if (!workSurfaceEl || !this._droidState) {
      return;
    }

    try {
      // Tab switching
      const tabs = workSurfaceEl.querySelectorAll('.prog-droid-builder__tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => this._onTabClick(e, shell, workSurfaceEl));
      });

      // Accessory tabs
      const accTabs = workSurfaceEl.querySelectorAll('.accessory-tab');
      accTabs.forEach(tab => {
        tab.addEventListener('click', (e) => this._onAccessoryTabClick(e, workSurfaceEl));
      });

      // Purchase system buttons
      const purchaseButtons = workSurfaceEl.querySelectorAll('[data-action="purchase-system"]');
      purchaseButtons.forEach(btn => {
        btn.addEventListener('click', (e) => this._onPurchaseSystem(e, shell, workSurfaceEl));
      });

      // Remove system buttons
      const removeButtons = workSurfaceEl.querySelectorAll('[data-action="remove-system"]');
      removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => this._onRemoveSystem(e, shell, workSurfaceEl));
      });
    } catch (e) {
      swseLogger.error('[DroidBuilderStep.activateWorkSurface]', e);
    }
  }

  /**
   * Handle tab click to switch between system categories.
   */
  _onTabClick(event, shell, workSurfaceEl) {
    event.preventDefault();
    const category = event.currentTarget.dataset.category;

    // Update active tab
    workSurfaceEl.querySelectorAll('.prog-droid-builder__tab').forEach(t => {
      t.classList.remove('prog-droid-builder__tab--active');
    });
    event.currentTarget.classList.add('prog-droid-builder__tab--active');

    // Update active panel
    workSurfaceEl.querySelectorAll('.prog-droid-builder__panel').forEach(p => {
      p.classList.remove('prog-droid-builder__panel--active');
    });
    const panel = workSurfaceEl.querySelector(`[data-panel="${category}"]`);
    if (panel) {
      panel.classList.add('prog-droid-builder__panel--active');
    }
  }

  /**
   * Handle accessory tab click.
   */
  _onAccessoryTabClick(event, workSurfaceEl) {
    event.preventDefault();
    const tabName = event.currentTarget.dataset.accessoryTab;

    workSurfaceEl.querySelectorAll('.accessory-tab').forEach(t => {
      t.classList.remove('accessory-tab--active');
    });
    event.currentTarget.classList.add('accessory-tab--active');

    workSurfaceEl.querySelectorAll('.accessory-panel').forEach(p => {
      p.classList.remove('accessory-panel--active');
    });
    const panel = workSurfaceEl.querySelector(`[data-accessory-panel="${tabName}"]`);
    if (panel) {
      panel.classList.add('accessory-panel--active');
    }
  }

  /**
   * Handle system purchase button click.
   */
  _onPurchaseSystem(event, shell, workSurfaceEl) {
    event.preventDefault();
    const btn = event.currentTarget;
    const category = btn.dataset.category;
    const id = btn.dataset.id;
    const subcategory = btn.dataset.subcategory;

    const success = this.purchaseSystem(category, id, subcategory);

    if (success) {
      // Trigger shell re-render to reflect state changes
      shell.render();
      ui.notifications.info(`${id} system purchased`);
    } else {
      ui.notifications.warn('Unable to purchase system - check credits and requirements');
    }
  }

  /**
   * Handle system removal button click.
   */
  _onRemoveSystem(event, shell, workSurfaceEl) {
    event.preventDefault();
    const btn = event.currentTarget;
    const category = btn.dataset.category;
    const id = btn.dataset.id;
    const subcategory = btn.dataset.subcategory;

    const success = this.removeSystem(category, id, subcategory);

    if (success) {
      // Trigger shell re-render to reflect state changes
      shell.render();
      ui.notifications.info(`${id} system removed`);
    }
  }

  /**
   * Called when an item is focused (selected in work surface).
   * Droid builder doesn't use item focus.
   */
  async onItemFocused(itemId, shell) {
    // No-op for droid builder
  }

  /**
   * Called when an item is committed (via Choose button or footer).
   * Droid builder commits the entire build, not individual items.
   */
  async onItemCommitted(itemId, shell) {
    // Store committed droid package in shell's committed selections map
    const selection = {
      isDroid: true,
      droidDegree: this._droidState.droidDegree,
      droidSize: this._droidState.droidSize,
      droidSystems: JSON.parse(JSON.stringify(this._droidState.droidSystems)),
      droidCredits: JSON.parse(JSON.stringify(this._droidState.droidCredits)),
    };

    shell.committedSelections.set(this.descriptor.stepId, selection);
    swseLogger.debug('[DroidBuilderStep.onItemCommitted] Droid build committed', selection);
  }

  /**
   * Called when step is exited.
   */
  async onStepExit(shell) {
    // Automatically commit droid build when exiting this step
    if (this._validateDroidBuild().isValid && !shell.committedSelections.has(this.descriptor.stepId)) {
      await this.onItemCommitted(null, shell);
    }
  }
}
