/**
 * DroidModelStep — Standard Droid Model Selection
 *
 * Progression step wrapper around the existing StockDroidImportWizard.
 * Lets users browse and import a published droid model for the standard-model path.
 *
 * Used by: Standard droid model creation path
 * Skipped by: Custom droid creation path
 *
 * Output: droidDegree, droidSize, droidSystems prefilled from imported model,
 *         written to session.draftSelections.droid
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { StockDroidImportWizard } from '/systems/foundryvtt-swse/scripts/apps/stock-droid-import-wizard.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class DroidModelStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._selectedModel = null;
    this._importWizard = null;
  }

  async onStepEnter(shell) {
    // Pre-load from session if available (user navigating back)
    const existingDroid = shell.progressionSession?.draftSelections?.droid;
    if (existingDroid?.modelId) {
      this._selectedModel = {
        id: existingDroid.modelId,
        name: existingDroid.modelName,
        data: existingDroid // Full model data
      };
    }

    swseLogger.debug('[DroidModelStep] Step entered', {
      hasExistingModel: !!this._selectedModel
    });
  }

  async getStepData(context) {
    return {
      selectedModel: this._selectedModel,
      isComplete: !!this._selectedModel,
      guidance: 'Select a published droid model to use as your character. You can customize systems and add a heroic class afterward.'
    };
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    const abortController = new AbortController();
    const { signal } = abortController;

    // Browse/Import button
    const browseBtn = shell.element.querySelector('[data-action="browse-models"]');
    if (browseBtn) {
      browseBtn.addEventListener('click', e => this._onBrowseModels(e, shell), { signal });
    }

    // Clear selection button
    const clearBtn = shell.element.querySelector('[data-action="clear-model"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', e => this._onClearModel(e, shell), { signal });
    }
  }

  async _onBrowseModels(event, shell) {
    event.preventDefault();

    // Launch the existing stock droid import wizard
    this._importWizard = new StockDroidImportWizard({
      onSelect: (modelData) => this._onModelSelected(modelData, shell),
      onCancel: () => this._onWizardCanceled()
    });

    if (this._importWizard.render) {
      this._importWizard.render(true);
    }
  }

  _onModelSelected(modelData, shell) {
    if (!modelData) {
      swseLogger.warn('[DroidModelStep] Model selection cancelled');
      return;
    }

    this._selectedModel = {
      id: modelData.id || modelData.name,
      name: modelData.name,
      data: modelData
    };

    swseLogger.debug('[DroidModelStep] Model selected', {
      modelId: this._selectedModel.id,
      modelName: this._selectedModel.name
    });

    // Close wizard
    if (this._importWizard?.close) {
      this._importWizard.close();
    }

    // Re-render to show selected model
    this._rerender(shell);
  }

  _onWizardCanceled() {
    swseLogger.debug('[DroidModelStep] Model selection wizard canceled');
    if (this._importWizard?.close) {
      this._importWizard.close();
    }
  }

  _onClearModel(event, shell) {
    event.preventDefault();
    this._selectedModel = null;

    swseLogger.debug('[DroidModelStep] Model selection cleared');
    this._rerender(shell);
  }

  async onItemCommitted(item, shell) {
    if (!this._selectedModel) {
      swseLogger.warn('[DroidModelStep] Attempted to commit without model selected');
      return;
    }

    // Write imported model data to session
    if (!shell.progressionSession.draftSelections.droid) {
      shell.progressionSession.draftSelections.droid = {};
    }

    const modelData = this._selectedModel.data;

    // Pre-fill droid fields from imported model
    shell.progressionSession.draftSelections.droid.modelId = this._selectedModel.id;
    shell.progressionSession.draftSelections.droid.modelName = this._selectedModel.name;
    shell.progressionSession.draftSelections.droid.isStandardModel = true;
    shell.progressionSession.draftSelections.droid.droidDegree = modelData.degree || '1st-degree';
    shell.progressionSession.draftSelections.droid.droidSize = modelData.size || 'medium';

    // Pre-fill droid systems from model
    if (modelData.systems) {
      shell.progressionSession.draftSelections.droid.droidSystems = JSON.parse(JSON.stringify(modelData.systems));
    }

    // Track total cost for RAW validation (max 5000 for standard models)
    shell.progressionSession.draftSelections.droid.standardModelBaseCost = modelData.cost || 0;

    // Update session context
    if (shell.progressionSession.droidContext) {
      shell.progressionSession.droidContext.degree = modelData.degree || '1st-degree';
      shell.progressionSession.droidContext.size = modelData.size || 'medium';
      shell.progressionSession.droidContext.isStandardModel = true;
    }

    swseLogger.debug('[DroidModelStep] Standard model committed', {
      modelId: this._selectedModel.id,
      modelName: this._selectedModel.name,
      degree: modelData.degree,
      size: modelData.size,
      baseCost: modelData.cost
    });
  }

  getSelection() {
    return {
      selected: this._selectedModel ? [this._selectedModel.id] : [],
      count: this._selectedModel ? 1 : 0,
      isComplete: !!this._selectedModel
    };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/droid-model-step.hbs',
      data: stepData
    };
  }

  _rerender(shell) {
    if (shell?.render) {
      shell.render();
    }
  }
}
