import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Datapad recovery — wizard progression contract.
//
// Static, source-text verification (the same jsdom-can't-construct-ApplicationV2
// limitation documented across the other GM Datapad / sheet contract tests
// applies here) that every live GM Datapad wizard's OPEN -> PAGE N -> BACK/NEXT
// -> SUBMIT/CLOSE contract is actually present end-to-end: the template
// renders every page and the footer controls, and the owning controller
// wires the matching open/back/next/step-button/submit selectors — not just
// that a selector string exists somewhere, but that template and controller
// agree on the same attribute names.

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

function countMatches(text, re) {
  return (text.match(re) ?? []).length;
}

const WIZARDS = [
  {
    name: 'Job Contract wizard',
    template: 'templates/apps/gm-datapad/surfaces/jobs/contract-wizard.hbs',
    openTemplate: 'templates/apps/gm-datapad/surfaces/jobs.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js',
    openSelector: 'data-gm-wizard-open="contract"',
    pageAttr: 'data-gm-wizard-page',
    minPages: 4,
    controls: ['data-gm-wizard-back', 'data-gm-wizard-next', 'data-gm-wizard-step-button', 'data-gm-wizard-close'],
    submitSelector: 'data-gm-wizard-submit'
  },
  {
    name: 'Faction Dossier wizard',
    template: 'templates/apps/gm-datapad/surfaces/factions.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js',
    openSelector: 'data-gm-wizard-open="faction"',
    pageAttr: 'data-gm-wizard-page',
    minPages: 3,
    controls: ['data-gm-wizard-back', 'data-gm-wizard-next', 'data-gm-wizard-step-button', 'data-gm-wizard-close'],
    submitSelector: 'data-gm-wizard-submit'
  },
  {
    name: 'Intel Compose wizard',
    template: 'templates/apps/gm-datapad/surfaces/intel.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMIntelSurfaceController.js',
    openSelector: null, // opened via server-rendered surface-state modal (patchSurfaceState + re-render), not a static in-DOM [data-*-open] toggle.
    pageAttr: 'data-intel-page',
    minPages: 6,
    controls: ['data-intel-action="wizard-back"', 'data-intel-action="wizard-next"'],
    submitSelector: null // Review page (page 6) submits via the record editor's own save form action, not a dedicated wizard-submit button.
  },
  {
    name: 'Locations Create/Import wizard',
    template: 'templates/apps/gm-datapad/surfaces/locations.hbs',
    controller: 'scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js',
    openSelector: null, // opened via server-rendered surface-state modal (patchSurfaceState({ modal: { type: 'create'|'import' } })), not a static in-DOM [data-*-open] toggle.
    pageAttr: 'data-wizard-page',
    minPages: 2,
    controls: ['data-location-action="wizard-back"', 'data-location-action="wizard-next"'],
    submitSelector: null
  }
];

for (const wizard of WIZARDS) {
  const templateText = await read(wizard.template);
  const controllerText = await read(wizard.controller);

  if (wizard.openSelector) {
    const openText = wizard.openTemplate ? await read(wizard.openTemplate) : templateText;
    assert.ok(openText.includes(wizard.openSelector), `[${wizard.name}] template must render its open control: ${wizard.openSelector}`);
  }

  const pageCount = countMatches(templateText, new RegExp(`${wizard.pageAttr}="\\d+"`, 'g'));
  assert.ok(pageCount >= wizard.minPages, `[${wizard.name}] expected at least ${wizard.minPages} rendered pages (${wizard.pageAttr}="N"), found ${pageCount}`);

  for (const control of wizard.controls) {
    assert.ok(templateText.includes(control), `[${wizard.name}] template must render: ${control}`);
    const bareAttr = control.split('=')[0];
    assert.ok(controllerText.includes(bareAttr), `[${wizard.name}] controller (${wizard.controller}) must wire: ${bareAttr}`);
  }

  if (wizard.submitSelector) {
    assert.ok(templateText.includes(wizard.submitSelector), `[${wizard.name}] template must render its submit control: ${wizard.submitSelector}`);
  }
}

// Job/Faction wizards share the same page-state contract (wizard.dataset.currentPage
// driving .is-active on [data-gm-wizard-page] panels, [data-gm-wizard-step-button]
// step chips, and back/next/submit visibility) — both controllers must agree
// on the attribute name so a template change to one cannot silently desync
// from the other's already-duplicated implementation.
{
  const jobs = await read('scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js');
  const factions = await read('scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js');
  assert.match(jobs, /wizard\.dataset\.currentPage/, 'Job Board wizard must drive page state via wizard.dataset.currentPage');
  assert.match(factions, /wizard\.dataset\.currentPage/, 'Faction wizard must drive page state via wizard.dataset.currentPage (same contract as the Job wizard)');
}

console.log(`GM Datapad wizard contract passed (${WIZARDS.length} wizards).`);
