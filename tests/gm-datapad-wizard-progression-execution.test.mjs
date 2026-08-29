import assert from 'node:assert/strict';
import { setWizardPage, WIZARD_STEP_LABELS } from '../scripts/ui/shell/gm/utils/gm-wizard-navigation.js';

// GM Datapad recovery — wizard progression EXECUTION contract.
//
// tests/gm-datapad-wizard-contract.test.mjs proves the Job/Faction/Intel/
// Locations wizard templates and controllers agree on selector names. That
// is necessary but not sufficient: it does not prove clicking Next actually
// moves to the next page, that Back is disabled on page 1, or that the
// footer button labels/visibility update correctly per page (raised in
// review of PR #962 on this branch — a selector-presence test "mostly
// proves that data-intel-action appears in the controller... it does not
// strongly prove wizard-next reaches the correct state transition").
//
// This test closes that gap for the Job Contract and Faction Dossier
// wizards by actually EXECUTING the real page-transition function
// (scripts/ui/shell/gm/utils/gm-wizard-navigation.js's setWizardPage,
// extracted from what was previously duplicated inline in both
// GMJobBoardSurfaceController and GMFactionRelationshipSurfaceController)
// against a minimal fake DOM built to the real contract-wizard.hbs /
// factions.hbs wizard markup shape, and asserts real state transitions —
// not string presence.
//
// The Intel and Locations wizards' equivalent logic (_setWizardPage /
// _shiftWizardPage) could not be given the same treatment in this pass:
// those controller files use this codebase's `/systems/foundryvtt-swse/...`
// absolute import convention (required for the real Foundry runtime), which
// plain Node ESM cannot resolve without a custom loader — the same
// constraint documented in tests/phase4-sheet-architecture-contract.test.mjs
// for why GM/actor sheet controllers are verified by source-text contract
// rather than execution elsewhere in this suite. Their page-transition logic
// was verified correct by direct code reading during this recovery pass
// (see docs/audits/gm-datapad-recovery-action-integrity.md §6), which is a
// weaker guarantee than the execution proof below — documented as such
// rather than overstated.

class FakeElement {
  constructor(dataset = {}) {
    this.dataset = { ...dataset };
    this.hidden = false;
    this.textContent = '';
    this.children = [];
    this._classes = new Set();
  }

  get classList() {
    return {
      toggle: (name, force) => {
        const shouldHave = force === undefined ? !this._classes.has(name) : Boolean(force);
        if (shouldHave) this._classes.add(name); else this._classes.delete(name);
      },
      contains: (name) => this._classes.has(name)
    };
  }

  append(...children) {
    this.children.push(...children);
    return this;
  }

  querySelectorAll(selector) {
    const out = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, selector)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

function toCamelCase(kebab) {
  return kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function matchesSelector(el, selector) {
  const match = selector.match(/^\[data-([a-zA-Z-]+)\]$/);
  if (!match) throw new Error(`Unsupported selector in test fixture: ${selector}`);
  return el.dataset[toCamelCase(match[1])] !== undefined;
}

/** Builds a fake wizard matching contract-wizard.hbs's DOM shape for `pageCount` pages. */
function buildWizardFixture(kind, pageCount) {
  const wizard = new FakeElement({ gmWizard: kind });
  const pages = [];
  const steps = [];
  for (let i = 1; i <= pageCount; i++) {
    pages.push(new FakeElement({ gmWizardPage: String(i) }));
    steps.push(new FakeElement({ gmWizardStepButton: String(i) }));
  }
  const back = new FakeElement({ gmWizardBack: '' });
  const next = new FakeElement({ gmWizardNext: '' });
  const submit = new FakeElement({ gmWizardSubmit: '' });
  const current = new FakeElement({ gmWizardCurrent: '' });
  wizard.append(...pages, ...steps, back, next, submit, current);
  return { wizard, pages, steps, back, next, submit, current };
}

// --- Job Contract wizard (4 pages) ---
{
  const { wizard, pages, steps, back, next, submit, current } = buildWizardFixture('contract', 4);

  const onPage1 = setWizardPage(wizard, 1);
  assert.equal(onPage1, 1);
  assert.equal(wizard.dataset.currentPage, '1');
  assert.equal(pages[0].classList.contains('is-active'), true, 'page 1 panel must be active on open');
  assert.equal(pages[1].classList.contains('is-active'), false);
  assert.equal(steps[0].classList.contains('is-active'), true);
  assert.equal(steps[0].classList.contains('is-complete'), false);
  assert.equal(back.hidden, true, 'Back must be hidden on page 1');
  assert.equal(next.hidden, false, 'Next must be visible before the last page');
  assert.equal(next.textContent, WIZARD_STEP_LABELS.contract[0]);
  assert.equal(submit.hidden, true, 'Submit must be hidden before the last page');
  assert.equal(current.textContent, '1');

  setWizardPage(wizard, 2);
  assert.equal(pages[0].classList.contains('is-active'), false, 'leaving page 1 must deactivate its panel');
  assert.equal(pages[1].classList.contains('is-active'), true, 'entering page 2 must activate its panel');
  assert.equal(steps[0].classList.contains('is-complete'), true, 'step 1 must show complete once past it');
  assert.equal(back.hidden, false, 'Back must become visible past page 1');
  assert.equal(next.textContent, WIZARD_STEP_LABELS.contract[1]);

  setWizardPage(wizard, 4);
  assert.equal(pages[3].classList.contains('is-active'), true, 'final page panel must activate');
  assert.equal(next.hidden, true, 'Next must hide on the final page');
  assert.equal(submit.hidden, false, 'Submit must appear on the final page');
  assert.equal(next.textContent, WIZARD_STEP_LABELS.contract[3]);

  // Clamping: Next past the last page and Back past the first page must not
  // go out of range (the real click handlers call setWizardPage(wizard,
  // currentPage +/- 1) with no bounds check of their own — setWizardPage is
  // the only thing preventing an out-of-range page).
  assert.equal(setWizardPage(wizard, 99), 4, 'requesting a page beyond the last must clamp to the last page');
  assert.equal(setWizardPage(wizard, -5), 1, 'requesting a page before the first must clamp to page 1');
}

// --- Faction Dossier wizard (3 pages) — proves the extraction preserved the
// per-kind label lookup, not just the Contract wizard's own numbers.
{
  const { wizard, pages, back, next, submit } = buildWizardFixture('faction', 3);

  setWizardPage(wizard, 1);
  assert.equal(back.hidden, true);
  assert.equal(next.textContent, WIZARD_STEP_LABELS.faction[0]);
  assert.equal(submit.hidden, true);

  setWizardPage(wizard, 3);
  assert.equal(pages[2].classList.contains('is-active'), true);
  assert.equal(next.hidden, true);
  assert.equal(submit.hidden, false);
  assert.equal(next.textContent, WIZARD_STEP_LABELS.faction[2]);
}

// --- Both real controllers call setWizardPage from the shared module
// rather than a local duplicate (regression guard for the extraction).
{
  const { readFile } = await import('node:fs/promises');
  const root = new URL('../', import.meta.url);
  for (const rel of [
    'scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js',
    'scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js'
  ]) {
    const text = await readFile(new URL(rel, root), 'utf8');
    assert.match(text, /import \{ setWizardPage \} from ['"].*gm-wizard-navigation\.js['"]/, `${rel} must import the shared setWizardPage helper`);
    assert.doesNotMatch(text, /const setPage = \(wizard, page\) =>/, `${rel} must not still define a local duplicate of setWizardPage`);
  }
}

console.log('GM Datapad wizard progression execution contract passed.');
