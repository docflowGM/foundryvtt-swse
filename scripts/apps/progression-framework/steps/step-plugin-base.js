/**
 * ProgressionStepPlugin — abstract base class for all step plugins.
 *
 * Each step in the progression shell is backed by a ProgressionStepPlugin
 * subclass. The shell calls lifecycle hooks and delegates all step-specific
 * rendering, validation, and mentor context to the plugin.
 *
 * OWNERSHIP CONTRACT:
 * - Progression legality         → Rules engine only
 * - Prerequisite checks          → Rules engine validators
 * - Mutation application         → Governance / ActorEngine
 * - Selection state              → Step plugin (this class)
 * - UI rendering                 → Step plugin + shell template
 * - Suggestion ranking           → SuggestionEngineCoordinator (called by plugin)
 * - Mentor dialogue              → MentorRail + plugin's getMentorContext()
 * - Validation display           → Shell action footer (data from plugin)
 * - Modal display                → Shell modal host
 * - Step discovery               → Progression engine (queried by shell)
 */

/**
 * Sentinel error thrown by all unimplemented methods.
 */
class NotImplementedError extends Error {
  constructor(methodName, pluginClass) {
    super(`${pluginClass}.${methodName}() is not implemented`);
    this.name = 'NotImplementedError';
  }
}

export class ProgressionStepPlugin {
  constructor(descriptor) {
    if (!descriptor) throw new Error('ProgressionStepPlugin requires a StepDescriptor');
    this._descriptor = descriptor;
  }

  // ---------------------------------------------------------------------------
  // Identity (from StepDescriptor)
  // ---------------------------------------------------------------------------

  /** @returns {import('./step-descriptor.js').StepDescriptor} */
  get descriptor() {
    return this._descriptor;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Called when the shell navigates TO this step.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onStepEnter(shell) {
    // Default: no-op. Subclasses may load data, update mentor, etc.
  }

  /**
   * Called when the shell navigates AWAY from this step.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onStepExit(shell) {
    // Default: no-op. Subclasses may clean up state.
  }

  /**
   * Called when async data is available for this step.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onDataReady(shell) {
    // Default: no-op. Subclasses load lists, populate options, etc.
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  /**
   * Return data needed by the work-surface template.
   * @param {Object} context - Shell context
   * @returns {Promise<Object>}
   */
  async getStepData(context) {
    throw new NotImplementedError('getStepData', this.constructor.name);
  }

  /**
   * Return current selection state for this step.
   * @returns {{ selected: string[], count: number, isComplete: boolean }}
   */
  getSelection() {
    throw new NotImplementedError('getSelection', this.constructor.name);
  }

  /**
   * Called when a user focuses an item (single click — details panel updates, no commit).
   * @param {string} itemId
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onItemFocused(itemId, shell) {
    // Default: no-op. Subclasses update focusedItem on shell.
  }

  /**
   * Called when a user hovers over an item (visual polish only — no commit, no details update).
   * @param {string} itemId
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onItemHovered(itemId, shell) {
    // Default: no-op. Subclasses may trigger lightweight mentor flavor.
  }

  /**
   * Called when a user commits an item (Choose button or footer Next/Confirm).
   * This is the ONLY way to commit — single click and hover must never commit.
   * @param {string} itemId
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onItemCommitted(itemId, shell) {
    throw new NotImplementedError('onItemCommitted', this.constructor.name);
  }

  /**
   * Called when a user deselects an item.
   * @param {string} itemId
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onItemDeselected(itemId, shell) {
    // Default: no-op.
  }

  // ---------------------------------------------------------------------------
  // Validation (data from engine validators — plugin does NOT own rules)
  // ---------------------------------------------------------------------------

  /**
   * Run engine validators and return result.
   * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
   */
  validate() {
    throw new NotImplementedError('validate', this.constructor.name);
  }

  /**
   * Return blocking issues that prevent advancing to the next step.
   * @returns {string[]}
   */
  getBlockingIssues() {
    throw new NotImplementedError('getBlockingIssues', this.constructor.name);
  }

  /**
   * Return non-blocking warnings to display in the footer.
   * @returns {string[]}
   */
  getWarnings() {
    return [];
  }

  /**
   * Return remaining pick counts for the footer center display.
   * Returns an array to support dual talent counts (heroic + class).
   * @returns {Array<{ label: string, count: number, isWarning: boolean }>}
   */
  getRemainingPicks() {
    return [];
  }

  // ---------------------------------------------------------------------------
  // UI Region Content
  // ---------------------------------------------------------------------------

  /**
   * Return template spec for the summary panel (left column).
   * Override in subclasses to provide build-summary context.
   * Return null to leave the panel empty (default behavior).
   * @param {Object} context - Shell context
   * @returns {{ template: string, data: Object } | null}
   */
  renderSummaryPanel(context) {
    return null;
  }

  /**
   * Return template spec for the work-surface region.
   * @param {Object} stepData - Data from getStepData()
   * @returns {{ template: string, data: Object } | null}
   */
  renderWorkSurface(stepData) {
    throw new NotImplementedError('renderWorkSurface', this.constructor.name);
  }

  /**
   * Return template spec for the details panel when an item is focused.
   * Must always return a template — return renderDetailsPanelEmptyState() when focusedItem is null.
   * @param {Object|null} focusedItem
   * @returns {{ template: string, data: Object }}
   */
  renderDetailsPanel(focusedItem) {
    if (!focusedItem) return this.renderDetailsPanelEmptyState();
    throw new NotImplementedError('renderDetailsPanel', this.constructor.name);
  }

  /**
   * Return empty-state template spec for the details panel.
   * Called when nothing is focused. Must always return a valid template.
   * @returns {{ template: string, data: Object }}
   */
  renderDetailsPanelEmptyState() {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: {
        message: 'Select an item to see details.',
        icon: this._descriptor.icon,
      },
    };
  }

  /**
   * Return utility bar configuration for this step.
   * Must always return a config — never null.
   * @returns {import('../shell/utility-bar.js').UtilityBarConfig}
   */
  getUtilityBarConfig() {
    return { mode: 'minimal' };
  }

  /**
   * Return the utility bar display mode for this step.
   * @returns {'rich' | 'compact' | 'minimal' | 'summary'}
   */
  getUtilityBarMode() {
    return 'minimal';
  }

  /**
   * Return footer overrides for this step, or null to use shell defaults.
   * @returns {{ nextLabel?: string, confirmLabel?: string } | null}
   */
  getFooterConfig() {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Mentor
  // ---------------------------------------------------------------------------

  /**
   * Return mentor guidance text for this step (spoken on step enter via AurebeshTranslator).
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {string}
   */
  getMentorContext(shell) {
    return '';
  }

  /**
   * Called when the user clicks "Ask Mentor".
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {Promise<void>}
   */
  async onAskMentor(shell) {
    // Default: no-op. Subclasses open suggestion modal or speak guidance.
  }

  /**
   * Return mentor interaction mode for this step.
   * - 'context-only': mentor speaks via dialogue box (AurebeshTranslator)
   * - 'interactive': opens suggestion modal (feat/talent steps)
   * @returns {'context-only' | 'interactive'}
   */
  getMentorMode() {
    return 'context-only';
  }

  /**
   * Get the current global validation state for this build.
   * Phase 2: Global Validation - use this in steps that need to check build coherence.
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @returns {{ isValid: boolean, errors: string[], warnings: string[], conflicts: string[], suggestions: string[] }}
   */
  getGlobalValidation(shell) {
    if (!shell?.validateBuild) return { isValid: true, errors: [], warnings: [], conflicts: [], suggestions: [] };
    return shell.validateBuild();
  }

  // ---------------------------------------------------------------------------
  // Post-Render Lifecycle (Wiring fine-grained DOM handlers)
  // ---------------------------------------------------------------------------

  /**
   * Called by shell._onRender() after every render with the work-surface element.
   * Use to wire fine-grained DOM event handlers (e.g. Near-Human builder controls).
   * @param {import('../shell/progression-shell.js').ProgressionShell} shell
   * @param {HTMLElement} workSurfaceEl
   * @returns {Promise<void>}
   */
  async afterRender(shell, workSurfaceEl) {
    // Default: no-op
  }
}
