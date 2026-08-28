/**
 * Shared step-navigation logic for the GM Datapad's `[data-gm-wizard]`
 * overlays (Job Contract wizard, Faction Dossier wizard). Both wizards
 * already used byte-identical page-transition logic, duplicated verbatim in
 * each controller — this is the one small shared helper that duplication
 * justifies (see docs/audits/gm-datapad-recovery-action-integrity.md §17),
 * not a general-purpose wizard engine: it owns exactly the DOM state
 * transition `[data-gm-wizard-page]`/`[data-gm-wizard-step-button]`/
 * back/next/submit visibility, nothing about validation, submission, or
 * per-surface behavior, which stay in each owning controller.
 *
 * Deliberately zero imports so it has no Foundry-runtime dependency and can
 * be unit-tested directly under plain Node (see
 * tests/gm-datapad-wizard-progression-execution.test.mjs).
 */

export const WIZARD_STEP_LABELS = {
  contract: ['Next: Objectives', 'Next: Briefing', 'Next: Publish', 'Create Contract'],
  faction: ['Next: Attach Actors', 'Next: Notes', 'Create Faction Dossier']
};

/**
 * Move a `[data-gm-wizard]` overlay to `page`, clamped to [1, page count],
 * and update every element whose visibility/label depends on the current
 * page: panel `.is-active`, step-chip `.is-active`/`.is-complete`, the
 * back/next/submit footer buttons' `hidden` state, and the Next button's
 * label (from WIZARD_STEP_LABELS, keyed by `wizard.dataset.gmWizard`).
 */
export function setWizardPage(wizard, page) {
  const max = wizard.querySelectorAll('[data-gm-wizard-page]').length || 1;
  const nextPage = Math.max(1, Math.min(max, Number(page) || 1));
  wizard.dataset.currentPage = String(nextPage);

  wizard.querySelectorAll('[data-gm-wizard-page]').forEach((panel) => {
    panel.classList.toggle('is-active', Number(panel.dataset.gmWizardPage) === nextPage);
  });
  wizard.querySelectorAll('[data-gm-wizard-step-button]').forEach((step) => {
    const stepNumber = Number(step.dataset.gmWizardStepButton) || 0;
    step.classList.toggle('is-active', stepNumber === nextPage);
    step.classList.toggle('is-complete', stepNumber < nextPage);
  });

  const kind = wizard.dataset.gmWizard || 'contract';
  const back = wizard.querySelector('[data-gm-wizard-back]');
  const next = wizard.querySelector('[data-gm-wizard-next]');
  const submit = wizard.querySelector('[data-gm-wizard-submit]');
  const current = wizard.querySelector('[data-gm-wizard-current]');
  if (current) current.textContent = String(nextPage);
  if (back) back.hidden = nextPage <= 1;
  if (next) {
    next.hidden = nextPage >= max;
    next.textContent = WIZARD_STEP_LABELS[kind]?.[nextPage - 1] || 'Next';
  }
  if (submit) submit.hidden = nextPage < max;

  return nextPage;
}
