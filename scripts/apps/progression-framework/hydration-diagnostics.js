/**
 * hydration-diagnostics.js
 *
 * Diagnostic system for character progression hydration authority.
 * Detects blank/uninitialized steps and provides recovery strategies.
 *
 * Integration Points:
 * - Called from _prepareContext() during render hydration
 * - Logs diagnostics to console with structured format
 * - Returns diagnostic array for UI feedback
 *
 * Rules Enforced:
 * - Rule 8.1: Detect missing step descriptors
 * - Rule 8.2: Detect missing step plugins
 * - Rule 8.3: Detect blank HTML templates
 * - Rule 8.4: Detect invalid step data
 */

/**
 * HydrationDiagnosticsCollector
 *
 * Collects and formats diagnostic messages during hydration.
 * Each diagnostic is categorized as error/warning/info with recovery suggestions.
 */
export class HydrationDiagnosticsCollector {
  constructor(context = {}) {
    this.diagnostics = [];
    this.context = {
      currentStepIndex: context.currentStepIndex ?? 0,
      totalSteps: context.totalSteps ?? 0,
      stepId: context.stepId ?? null,
      pluginName: context.pluginName ?? null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add a diagnostic message
   */
  add(level, code, message, recovery, metadata = {}) {
    const diagnostic = {
      timestamp: this.context.timestamp,
      level,
      code,
      context: {
        currentStepIndex: this.context.currentStepIndex,
        totalSteps: this.context.totalSteps,
        stepId: this.context.stepId,
        pluginName: this.context.pluginName,
        ...metadata,
      },
      message,
      recovery,
    };

    this.diagnostics.push(diagnostic);
    return diagnostic;
  }

  /**
   * Rule 8.1: Missing step descriptor
   */
  detectMissingDescriptor(stepIndex, steps) {
    if (!steps || !Array.isArray(steps) || stepIndex >= steps.length) {
      return this.add(
        'error',
        'MISSING_STEP_DESCRIPTOR',
        `No step descriptor at index ${stepIndex} (total steps: ${steps?.length ?? 0})`,
        'Reset currentStepIndex to 0 and reload',
        { missingIndex: stepIndex, availableSteps: steps?.length ?? 0 }
      );
    }
    return null;
  }

  /**
   * Rule 8.2: Missing step plugin
   */
  detectMissingPlugin(stepId, stepPlugins) {
    if (!stepPlugins || !stepPlugins.has(stepId)) {
      return this.add(
        'error',
        'MISSING_STEP_PLUGIN',
        `No plugin registered for step "${stepId}"`,
        'Verify step plugin is registered in entry point or recompile',
        { missingStepId: stepId, registeredPlugins: [...(stepPlugins?.keys() ?? [])] }
      );
    }
    return null;
  }

  /**
   * Rule 8.3: Blank HTML template
   */
  detectBlankTemplate(stepId, html) {
    if (!html || typeof html !== 'string' || html.trim().length === 0) {
      return this.add(
        'warning',
        'BLANK_TEMPLATE',
        `Work surface template is blank or null for step "${stepId}"`,
        'Show placeholder UI. Check renderWorkSurface() returns valid template.',
        { stepId, htmlType: typeof html, htmlLength: html?.length ?? 0 }
      );
    }
    return null;
  }

  /**
   * Rule 8.4: Invalid step data
   */
  detectInvalidStepData(stepId, stepData) {
    if (!stepData || typeof stepData !== 'object') {
      return this.add(
        'warning',
        'INVALID_STEP_DATA',
        `Step data is not a valid object for "${stepId}": ${typeof stepData}`,
        'Use empty object {} as fallback. Check getStepData() returns object.',
        { stepId, actualType: typeof stepData, expectedType: 'object' }
      );
    }
    return null;
  }

  /**
   * Initialization failure
   */
  detectInitializationFailure(phase, error) {
    return this.add(
      'error',
      'INITIALIZATION_FAILURE',
      `Failed during ${phase}: ${error?.message ?? String(error)}`,
      'Check network, verify files exist, reload application',
      { phase, errorType: error?.name, errorStack: error?.stack }
    );
  }

  /**
   * Invariant violation: Steps array empty
   */
  detectEmptyStepsArray() {
    return this.add(
      'error',
      'EMPTY_STEPS_ARRAY',
      'Steps array is empty after initialization',
      'Verify _initializeSteps() discovered at least one step',
      {}
    );
  }

  /**
   * Invariant violation: Current step index out of bounds
   */
  detectInvalidStepIndex(currentIndex, totalSteps) {
    if (currentIndex < 0 || currentIndex >= totalSteps) {
      return this.add(
        'error',
        'INVALID_STEP_INDEX',
        `Current step index ${currentIndex} is out of bounds [0-${totalSteps - 1}]`,
        'Reset to 0, verify _initializeFirstStep() set valid index',
        { currentIndex, totalSteps, validRange: `0-${totalSteps - 1}` }
      );
    }
    return null;
  }

  /**
   * Invariant violation: Mentor state undefined
   */
  detectMissingMentor(mentor) {
    if (!mentor || typeof mentor !== 'object') {
      return this.add(
        'warning',
        'MISSING_MENTOR_STATE',
        'Mentor state is undefined or invalid',
        'Verify _initializeMentorState() completed or fallback loaded',
        { actualType: typeof mentor }
      );
    }
    return null;
  }

  /**
   * Species-specific: Detect details panel hydration failure
   * Checks if species details panel is blank despite having a focused item
   */
  detectSpeciesDetailsPanelFailure(stepId, focusedItem, detailsPanelHtml) {
    // Only check Species step
    if (stepId !== 'species') return null;

    // If no focused item, empty state is expected
    if (!focusedItem) return null;

    // If details panel is blank/empty, that's a failure
    if (!detailsPanelHtml || typeof detailsPanelHtml !== 'string' || detailsPanelHtml.trim().length === 0) {
      return this.add(
        'error',
        'SPECIES_DETAILS_PANEL_BLANK',
        `Species details panel is blank despite focused item: ${focusedItem?.name ?? focusedItem?.id}`,
        'Check SpeciesStep.renderDetailsPanel() returns valid template and data',
        {
          stepId: 'species',
          focusedItemId: focusedItem?.id,
          focusedItemName: focusedItem?.name,
          panelHtmlLength: detailsPanelHtml?.length ?? 0,
          isEmptyState: detailsPanelHtml?.includes?.('prog-details-empty') ?? false,
        }
      );
    }

    // If panel contains empty-state despite focused item, that's also a failure
    if (detailsPanelHtml.includes('prog-details-empty')) {
      return this.add(
        'warning',
        'SPECIES_DETAILS_RENDERING_EMPTY_STATE',
        `Species details panel rendered empty state despite having focused item: ${focusedItem?.name ?? focusedItem?.id}`,
        'Check SpeciesRegistry.getById() returns valid entry and normalizeDetailPanelData() completes successfully',
        {
          stepId: 'species',
          focusedItemId: focusedItem?.id,
          focusedItemName: focusedItem?.name,
        }
      );
    }

    return null;
  }

  /**
   * Species-specific: Detect missing IDs in species list rows
   * Checks if species cards are rendering without data-item-id attributes
   */
  detectSpeciesRowsMissingIds(stepId, workSurfaceHtml) {
    // Only check Species step
    if (stepId !== 'species') return null;

    if (!workSurfaceHtml || typeof workSurfaceHtml !== 'string') {
      return null; // Can't analyze
    }

    // Check if there are species rows without valid data-item-id
    const hasSpeciesRows = workSurfaceHtml.includes('data-item-id');
    const hasMissingIds = workSurfaceHtml.includes('data-item-id=""') ||
                          (hasSpeciesRows && workSurfaceHtml.match(/data-item-id=""/g) || []).length > 0;

    // Count empty vs valid IDs
    const emptyIdMatches = (workSurfaceHtml.match(/data-item-id=""/g) || []).length;
    const totalIdMatches = (workSurfaceHtml.match(/data-item-id/g) || []).length;

    if (hasMissingIds && emptyIdMatches > 0) {
      return this.add(
        'error',
        'SPECIES_ROWS_MISSING_IDS',
        `Species list has ${emptyIdMatches} rows with empty data-item-id attributes (out of ${totalIdMatches} total)`,
        'Fix SpeciesRegistry._normalizeEntry() to compute stable IDs. Check species compendium document structure.',
        {
          stepId: 'species',
          emptyIdCount: emptyIdMatches,
          totalRowCount: totalIdMatches,
          rowsWithIds: totalIdMatches - emptyIdMatches,
        }
      );
    }

    return null;
  }

  /**
   * Get all diagnostics of a specific level
   */
  getByLevel(level) {
    return this.diagnostics.filter((d) => d.level === level);
  }

  /**
   * Get errors only
   */
  getErrors() {
    return this.getByLevel('error');
  }

  /**
   * Get warnings only
   */
  getWarnings() {
    return this.getByLevel('warning');
  }

  /**
   * Check if any errors exist
   */
  hasErrors() {
    return this.getErrors().length > 0;
  }

  /**
   * Check if any warnings exist
   */
  hasWarnings() {
    return this.getWarnings().length > 0;
  }

  /**
   * Format for console output
   */
  formatConsole() {
    const groups = {
      error: this.getErrors(),
      warning: this.getWarnings(),
      info: this.getByLevel('info'),
    };

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([level, items]) => {
        const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
        return `${prefix} ${level.toUpperCase()} (${items.length})\n${items
          .map((d) => `  [${d.code}] ${d.message}\n    Recovery: ${d.recovery}`)
          .join('\n')}`;
      })
      .join('\n\n');
  }

  /**
   * Format for UI display
   */
  formatUI() {
    const errors = this.getErrors();
    const warnings = this.getWarnings();

    return {
      blocking: errors.map((d) => d.message),
      warning: warnings.map((d) => d.message),
      total: this.diagnostics.length,
    };
  }

  /**
   * Log all diagnostics to console
   */
  logToConsole() {
    if (this.diagnostics.length === 0) {
      console.log('[HYDRATION DIAGNOSTICS] ✅ No issues detected');
      return;
    }

    console.log('[HYDRATION DIAGNOSTICS]');
    console.log(this.formatConsole());

    // Also log full diagnostic objects for debugging
    if (this.getErrors().length > 0) {
      console.group('[HYDRATION DIAGNOSTICS] Error Details');
      this.getErrors().forEach((d) => console.table(d));
      console.groupEnd();
    }
  }

  /**
   * Export diagnostics as JSON
   */
  toJSON() {
    return {
      timestamp: this.context.timestamp,
      context: this.context,
      diagnostics: this.diagnostics,
      summary: {
        total: this.diagnostics.length,
        errors: this.getErrors().length,
        warnings: this.getWarnings().length,
      },
    };
  }
}

/**
 * Recovery strategies for common failure modes
 */
export class HydrationRecoveryStrategies {
  /**
   * Strategy 1: Fallback to first valid step
   */
  static fallbackToFirstStep(app, diagnostics) {
    if (!app.steps || app.steps.length === 0) {
      diagnostics.add(
        'error',
        'RECOVERY_FAILED_NO_STEPS',
        'Cannot fallback to first step: steps array is empty',
        'Application cannot proceed. Reload required.',
        {}
      );
      return false;
    }

    const oldIndex = app.currentStepIndex;
    app.currentStepIndex = 0;

    diagnostics.add(
      'info',
      'FALLBACK_APPLIED',
      `Reset current step index from ${oldIndex} to 0`,
      'Progression can continue from first step',
      { previousIndex: oldIndex }
    );

    return true;
  }

  /**
   * Strategy 2: Show placeholder UI
   */
  static generatePlaceholderHTML() {
    return `
      <div class="prog-work-placeholder">
        <p>Step content is loading...</p>
        <button class="prog-btn" onclick="window.location.reload()">
          Retry
        </button>
      </div>
    `;
  }

  /**
   * Strategy 3: Skip unloadable plugins
   */
  static skipMissingPlugin(diagnostics, stepId) {
    diagnostics.add(
      'info',
      'SKIP_PLUGIN',
      `Skipping plugin for step "${stepId}". Details panel will be empty.`,
      'User can continue progression, details just unavailable',
      { skippedStepId: stepId }
    );

    return null; // Return null so calling code knows plugin is unavailable
  }

  /**
   * Strategy 4: Reload step plugins
   */
  static async reloadStepPlugins(app, diagnostics) {
    try {
      diagnostics.add(
        'info',
        'RELOAD_PLUGINS_STARTED',
        'Attempting to reload step plugins...',
        'Waiting for plugin discovery to complete',
        {}
      );

      // Call the app's step initialization
      await app._initializeSteps();

      diagnostics.add(
        'info',
        'RELOAD_PLUGINS_COMPLETE',
        `Successfully reloaded step plugins. Discovered ${app.steps?.length ?? 0} steps.`,
        'Plugins are now available',
        { discoveredSteps: app.steps?.length ?? 0 }
      );

      return true;
    } catch (error) {
      diagnostics.add(
        'error',
        'RELOAD_PLUGINS_FAILED',
        `Failed to reload step plugins: ${error.message}`,
        'Check browser console for detailed error. Manual reload may be required.',
        { errorType: error.name, errorMessage: error.message }
      );

      return false;
    }
  }
}

/**
 * Hydration validation helper
 * Validates initialization invariants and reports violations
 */
export class HydrationValidator {
  /**
   * Validate all initialization invariants
   */
  static validateInitialization(app, diagnostics) {
    const violations = [];

    // Invariant 1: Always have a current step
    if (app.currentStepIndex < 0 || !Number.isInteger(app.currentStepIndex)) {
      violations.push(
        diagnostics.add(
          'error',
          'INVARIANT_1_VIOLATION',
          'Current step index is invalid or negative',
          'Set currentStepIndex to 0',
          { currentStepIndex: app.currentStepIndex }
        )
      );
    }

    // Invariant 2: Steps array never empty
    if (!app.steps || app.steps.length === 0) {
      violations.push(
        diagnostics.detectEmptyStepsArray()
      );
    }

    // Invariant 3: Current plugin matches current step
    if (app.steps && app.steps.length > 0 && app.currentStepIndex < app.steps.length) {
      const currentDescriptor = app.steps[app.currentStepIndex];
      if (currentDescriptor && !app.stepPlugins.has(currentDescriptor.stepId)) {
        violations.push(
          diagnostics.detectMissingPlugin(currentDescriptor.stepId, app.stepPlugins)
        );
      }
    }

    // Invariant 4: Mentor state always defined
    violations.push(
      diagnostics.detectMissingMentor(app.mentor)
    );

    // Remove null entries
    return violations.filter((v) => v !== null);
  }

  /**
   * Validate a single step's hydration
   */
  static validateStepHydration(stepIndex, steps, stepPlugins, stepData, html, diagnostics) {
    const violations = [];

    // Check descriptor
    if (stepIndex >= steps.length) {
      violations.push(diagnostics.detectMissingDescriptor(stepIndex, steps));
    } else {
      const descriptor = steps[stepIndex];

      // Check plugin
      if (!stepPlugins.has(descriptor.stepId)) {
        violations.push(diagnostics.detectMissingPlugin(descriptor.stepId, stepPlugins));
      }

      // Check template
      violations.push(diagnostics.detectBlankTemplate(descriptor.stepId, html));

      // Check data
      violations.push(diagnostics.detectInvalidStepData(descriptor.stepId, stepData));
    }

    return violations.filter((v) => v !== null);
  }
}
