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

    // Center items: remaining picks + any blocking issues as chips.
    // Keep the richer numeric fields so the shell footer can show a live
    // "Status: remaining/total X Remaining" readout instead of a generic READY.
    const centerItems = [
      ...remainingPicks.map(pick => ({
        label: pick.label,
        count: Number.isFinite(Number(pick.count)) ? Number(pick.count) : null,
        total: Number.isFinite(Number(pick.total)) ? Number(pick.total) : null,
        selected: Number.isFinite(Number(pick.selected)) ? Number(pick.selected) : null,
        isWarning: pick.isWarning,
        isBlocking: Number(pick.count || 0) > 0 && !pick.isWarning, // Still required
      })),
    ];

    const primaryRemaining = centerItems.find(item => Number.isFinite(Number(item.count))) || null;
    const status = this._buildStatusReadout(primaryRemaining, blockingIssues);

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
      status,
      // PHASE 3 UX: Specific explanation when blocked
      blockerExplanation,
    };
  }

  static _buildStatusReadout(primaryRemaining, blockingIssues = []) {
    if (!primaryRemaining) {
      return {
        text: blockingIssues.length > 0 ? 'Blocked' : 'Ready',
        isComplete: blockingIssues.length === 0,
        remaining: 0,
        total: 0,
      };
    }

    const remaining = Math.max(0, Number(primaryRemaining.count || 0));
    const total = Number.isFinite(Number(primaryRemaining.total))
      ? Math.max(0, Number(primaryRemaining.total))
      : null;
    const rawLabel = String(primaryRemaining.label || 'Selections').trim() || 'Selections';
    const cleanLabel = rawLabel.replace(/^✓\s*/, '').replace(/\s+remaining$/i, '').trim() || 'Selections';
    const text = total !== null && total > 0
      ? `${remaining}/${total} ${cleanLabel} Remaining`
      : (remaining > 0 ? `${remaining} ${cleanLabel} Remaining` : `0 ${cleanLabel} Remaining`);

    return {
      text,
      isComplete: remaining <= 0 && blockingIssues.length === 0,
      remaining,
      total: total ?? 0,
      label: cleanLabel,
    };
  }
}
