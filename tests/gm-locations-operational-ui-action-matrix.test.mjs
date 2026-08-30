import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Locations Phase 2 — operational UI action matrix (static).
//
// tests/gm-datapad-action-integrity-contract.test.mjs already proves every
// data-location-action value reaches a real controller branch. It does not
// prove a control carries the specific data-* identifiers that branch
// actually reads (e.g. lead-resolve needs BOTH data-actor-id and
// data-discovery-id — GMLocationsSurfaceController._findLead() silently
// returns null and warns if either is blank, which looks like "the button
// didn't work" with no indication why). This test proves, for every
// Phase 2 control newly rendered in locations.hbs, that its own element
// carries every data attribute its controller branch dereferences.

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('templates/apps/gm-datapad/surfaces/locations.hbs', root), 'utf8');
const controller = await readFile(new URL('scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js', root), 'utf8');

/** Every rendered element (button, in this template) carrying a given
 *  data-location-action value, as its full opening-tag source text. */
function elementsFor(action) {
  const re = /<(?:button|div)\b[^>]*?data-location-action="([a-z-]+)"[^>]*>/gs;
  const matches = [];
  let m;
  while ((m = re.exec(template))) {
    if (m[1] === action) matches.push(m[0]);
  }
  return matches;
}

const REQUIRED_ATTRS = {
  'lead-select-location': ['data-location-id'],
  'lead-create-intel': ['data-actor-id', 'data-discovery-id'],
  'lead-create-job': ['data-actor-id', 'data-discovery-id'],
  'lead-reveal-links': ['data-actor-id', 'data-discovery-id'],
  'lead-resolve': ['data-actor-id', 'data-discovery-id'],
  'remove-link': ['data-location-id', 'data-link-kind', 'data-link-value'],
  'remove-seed': ['data-location-id', 'data-seed-id'],
  'create-scene': ['data-location-id'],
  'open-scene': ['data-location-id'],
  'activate-scene': ['data-location-id'],
  'stage-encounter-seeds': ['data-location-id']
};

for (const [action, attrs] of Object.entries(REQUIRED_ATTRS)) {
  const elements = elementsFor(action);
  assert.ok(elements.length > 0, `expected at least one rendered control for data-location-action="${action}"`);
  for (const el of elements) {
    for (const attr of attrs) {
      assert.match(el, new RegExp(`${attr}="`), `every data-location-action="${action}" control must also carry ${attr} — element: ${el}`);
    }
  }
}

// Controller-side: prove the branch for each Phase 2 action really reads
// the attributes above (not a stale requirement from a refactor).
const CONTROLLER_READS = {
  'lead-select-location': ['dataset.locationId'],
  'lead-create-intel': ['dataset.actorId', 'dataset.discoveryId'],
  'lead-create-job': ['dataset.actorId', 'dataset.discoveryId'],
  'lead-reveal-links': ['dataset.actorId', 'dataset.discoveryId'],
  'lead-resolve': ['dataset.actorId', 'dataset.discoveryId'],
  'remove-link': ['dataset.linkKind', 'dataset.linkValue'],
  'remove-seed': ['dataset.seedId']
};
for (const [action, reads] of Object.entries(CONTROLLER_READS)) {
  const branchMatch = controller.match(new RegExp(`action === '${action}'[\\s\\S]{0,600}?\\n\\s*\\}`));
  assert.ok(branchMatch, `expected to find the controller branch for action === '${action}'`);
  for (const read of reads) {
    assert.ok(branchMatch[0].includes(read), `the '${action}' branch must read ${read} — branch:\n${branchMatch[0]}`);
  }
}

// Every Phase 2 action-value the template renders must appear in the GM
// Datapad action-integrity scanner's registry allowlist path implicitly by
// resolving to a real branch — spot check the exact set expected here
// against the template's actual rendered vocabulary, so a renamed/removed
// action fails this test even if the broader scanner still passes on
// something else.
const renderedActions = new Set(
  Array.from(template.matchAll(/data-location-action="([a-z-]+)"/g)).map(m => m[1])
);
const PHASE_2_ACTIONS = [
  'remove-link', 'remove-seed',
  'lead-select-location', 'lead-create-job', 'lead-create-intel', 'lead-reveal-links', 'lead-resolve',
  'create-scene', 'open-scene', 'activate-scene', 'stage-encounter-seeds'
];
for (const action of PHASE_2_ACTIONS) {
  assert.ok(renderedActions.has(action), `Phase 2 action "${action}" must be rendered somewhere in locations.hbs`);
}

console.log(`GM Locations operational UI action matrix passed (${PHASE_2_ACTIONS.length} Phase 2 actions verified: template attributes + controller reads agree).`);
