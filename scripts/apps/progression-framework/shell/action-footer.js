/**
 * ActionFooter
 *
 * Manages data preparation for the progression shell's action footer region.
 * The footer is always present with three zones:
 *
 *   [Back]   |   [Center — remaining picks / status]   |   [Next / Confirm / Apply]
 *
 * The shell owns footer container + button rendering.
 * Step plugins provide getRemainingPicks(), getBlockingIssues(), getWarnings().
 *
 * Design notes:
 * - Center supports MULTIPLE items (array) to support dual talent counts
 * - Blocking issues prevent Next/Confirm; warnings appear as amber chips
 * - On last step: Next label becomes "Confirm" (chargen) or "Apply" (levelup)
 */

/**
 * @typedef {Object} FooterCenterItem
 * @property {string} label        - Display text (e.g. "2 trainings remaining")
 * @property {boolean} isWarning   - Yellow chip if true
 * @property {boolean} isBlocking  - Red chip, prevents advancing
 */

/**
 * @typedef {Object} FooterData
 * @property {{ enabled: boolean, label: string }} back
 * @property {FooterCenterItem[]} center
 * @property {{ enabled: boolean, label: string, isLastStep: boolean }} next
 * @property {string[]} blockingIssues
 * @property {string[]} warnings
 */

export class ActionFooter {
  /**
   * Build footer data for the current shell state.
   *
   * @param {Object} params
   * @param {import('./progression-shell.js').ProgressionShell} params.shell
   * @param {import('../steps/step-plugin-base.js').ProgressionStepPlugin|null} params.currentPlugin
   * @param {boolean} params.isLastStep
   * @param {'chargen'|'levelup'} params.mode
   * @returns {FooterData}
   */
  static build({ shell, currentPlugin, isLastStep, mode }) {
    const blockingIssues = currentPlugin?.getBlockingIssues() ?? [];
    const warnings = currentPlugin?.getWarnings() ?? [];
    const remainingPicks = currentPlugin?.getRemainingPicks() ?? [];
    const footerOverride = currentPlugin?.getFooterConfig() ?? {};

    // PHASE 3 UX: Get specific blocker explanation from plugin
    const blockerExplanation = blockingIssues.length > 0
      ? currentPlugin?.getBlockerExplanation?.() ?? null
      : null;

    const canAdvance = blockingIssues.length === 0 && !shell.isProcessing;

    // Center items: remaining picks + any blocking issues as chips
    const centerItems = [
      ...remainingPicks.map(pick => ({
        label: pick.label,
        isWarning: pick.isWarning,
        isBlocking: pick.count > 0 && !pick.isWarning, // Still required
      })),
    ];

    // Determine Next/Confirm label
    let nextLabel;
    if (isLastStep) {
      nextLabel = footerOverride.confirmLabel
        ?? (mode === 'levelup' ? 'Apply' : 'Confirm');
    } else {
      nextLabel = footerOverride.nextLabel ?? 'Next';
    }

    return {
      back: {
        enabled: shell.currentStepIndex > 0 && !shell.isProcessing,
        label: 'Back',
      },
      center: centerItems,
      next: {
        enabled: canAdvance,
        label: nextLabel,
        isLastStep,
        hidden: !!footerOverride.hideNext,
      },
      blockingIssues,
      warnings,
      // PHASE 3 UX: Specific explanation when blocked
      blockerExplanation,
    };
  }
}
