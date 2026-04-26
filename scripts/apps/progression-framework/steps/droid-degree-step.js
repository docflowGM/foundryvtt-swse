/**
 * DroidDegreeStep — Droid Identity Selection
 *
 * Lightweight progression step for selecting droid degree (and optionally size).
 * This is the first real choice in custom droid chargen after intro.
 *
 * Used by: Custom droid creation path
 * Skipped by: Standard droid model path
 *
 * Output: droidDegree, droidSize written to session.draftSelections.droid
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { DROID_DEGREE_PACKAGES } from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-trait-rules.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class DroidDegreeStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._selectedDegree = null;
    this._selectedSize = 'medium';
    this._focusedDegreeId = null;
  }

  async onStepEnter(shell) {
    // Pre-load from session or actor if available
    const existingDroid = shell.progressionSession?.draftSelections?.droid;
    if (existingDroid) {
      this._selectedDegree = existingDroid.droidDegree || null;
      this._selectedSize = existingDroid.droidSize || 'medium';
    }

    swseLogger.debug('[DroidDegreeStep] Step entered', {
      selectedDegree: this._selectedDegree,
      selectedSize: this._selectedSize
    });
  }

  async getStepData(context) {
    const degreeOptions = Object.entries(DROID_DEGREE_PACKAGES).map(([id, pkg]) => ({
      id,
      name: pkg.name,
      description: pkg.description,
      typicalRoles: pkg.typicalRoles,
      abilityMods: pkg.abilityMods,
      isSelected: id === this._selectedDegree,
      isFocused: id === this._focusedDegreeId
    }));

    return {
      degreeOptions,
      selectedDegree: this._selectedDegree,
      selectedSize: this._selectedSize,
      isComplete: !!this._selectedDegree,
      sizeOptions: [
        { id: 'small', name: 'Small', description: 'Tracked locomotion, base speed 4' },
        { id: 'medium', name: 'Medium', description: 'Walking locomotion, base speed 6 (default)' }
      ]
    };
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    const abortController = new AbortController();
    const { signal } = abortController;

    // Degree selection
    shell.element.querySelectorAll('[data-degree-id]').forEach(btn => {
      btn.addEventListener('click', e => this._onSelectDegree(e, shell), { signal });
    });

    // Size selection
    shell.element.querySelectorAll('[data-size-id]').forEach(btn => {
      btn.addEventListener('click', e => this._onSelectSize(e, shell), { signal });
    });
  }

  _onSelectDegree(event, shell) {
    event.preventDefault();
    const degreeId = event.currentTarget.dataset.degreeId;
    this._selectedDegree = degreeId;

    swseLogger.debug('[DroidDegreeStep] Degree selected', { degreeId });
    this._rerender(shell);
  }

  _onSelectSize(event, shell) {
    event.preventDefault();
    const sizeId = event.currentTarget.dataset.sizeId;
    this._selectedSize = sizeId;

    swseLogger.debug('[DroidDegreeStep] Size selected', { sizeId });
    this._rerender(shell);
  }

  async onItemCommitted(item, shell) {
    if (!this._selectedDegree) {
      swseLogger.warn('[DroidDegreeStep] Attempted to commit without degree selected');
      return;
    }

    // Write to session
    if (!shell.progressionSession.draftSelections.droid) {
      shell.progressionSession.draftSelections.droid = {};
    }

    shell.progressionSession.draftSelections.droid.droidDegree = this._selectedDegree;
    shell.progressionSession.draftSelections.droid.droidSize = this._selectedSize;

    // Update session context for downstream steps
    if (shell.progressionSession.droidContext) {
      shell.progressionSession.droidContext.degree = this._selectedDegree;
      shell.progressionSession.droidContext.size = this._selectedSize;
      shell.progressionSession.droidContext.degreePackage = DROID_DEGREE_PACKAGES[this._selectedDegree];
    }

    swseLogger.debug('[DroidDegreeStep] Committed', {
      degree: this._selectedDegree,
      size: this._selectedSize
    });
  }

  getSelection() {
    return {
      selected: this._selectedDegree ? [this._selectedDegree] : [],
      count: this._selectedDegree ? 1 : 0,
      isComplete: !!this._selectedDegree
    };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/droid-degree-step.hbs',
      data: stepData
    };
  }

  _rerender(shell) {
    if (shell?.render) {
      shell.render();
    }
  }
}
