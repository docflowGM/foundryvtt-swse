import assert from 'node:assert/strict';
import { buildGmDatapadActionRegistry, unresolvedControls, SURFACES } from '../scripts/dev/gm-datapad-action-registry.mjs';

// GM Datapad recovery — action-integrity contract.
//
// Foundry's ApplicationV2 + global surface cannot be constructed under this
// repo's Node test harness (same limitation as tests/phase4-sheet-architecture-contract.test.mjs
// and tests/phase5-sheet-action-integrity-contract.test.mjs), so this is a
// source-text contract test: it derives, by scanning each registered GM
// Datapad surface's template tree (scripts/dev/gm-datapad-action-registry.mjs
// — not a hand-maintained control list), every literal-valued `data-*="..."`
// control rendered on that surface, and proves it reaches a real handler at
// one of two levels:
//
//   - ACTION-VALUE-LEVEL, for attributes that dispatch on their literal
//     value (data-gm-faction-action, data-location-action, data-intel-action,
//     data-trade-action, data-economy-action, data-skill-challenge-action,
//     bare data-action on store/bulletin/approvals, data-gm-v2-action): the
//     exact rendered value must appear as a real branch (switch/case,
//     `=== 'x'`, or a `[data-x="value"]` literal selector) in the file(s)
//     that actually own that dispatch — including multi-hop forwarding,
//     e.g. data-economy-action -> GMDatapad._handleEconomyRepairAction ->
//     HolonetMessengerService.threadAction's own switch.
//   - ATTRIBUTE-NAME-LEVEL, for everything else (ids/refs, tab/subtab
//     switches whose vocabulary is validated against sibling template
//     attributes rather than hardcoded strings, surface-id navigation
//     validated against the surface registry): the attribute name must have
//     a `dataset.<name>` read somewhere in the files allowed to wire that
//     surface.
//
// This MUST fail when a new data-attribute (or a new literal value of a
// dispatch attribute) is added to a live GM Datapad template with no
// matching wiring anywhere the scanner looks, without a matching allowlist
// entry in gm-datapad-action-registry.mjs.

const surfaces = await buildGmDatapadActionRegistry();

// 14 registered surfaces + the shared host-chrome entry (sidebar/dock/toolbar
// partials included directly from gm-datapad.hbs, outside any surface's own
// template tree, so they need a scan entry of their own).
assert.equal(Object.keys(surfaces).length, 15, 'expected all 14 registered GM Datapad surfaces plus the host-chrome entry to be scanned');

for (const surfaceId of Object.keys(SURFACES)) {
  const surface = surfaces[surfaceId];
  assert.ok(surface, `expected surface "${surfaceId}" in the registry`);
  assert.ok(surface.templateFiles.length > 0, `surface "${surfaceId}" resolved no templates — has its root template moved?`);
}
assert.ok(surfaces.host.templateFiles.length > 0, 'expected the host-chrome entry to resolve the sidebar/dock/toolbar partials');

const unresolved = unresolvedControls(surfaces);
assert.equal(
  unresolved.length,
  0,
  `Found ${unresolved.length} rendered GM Datapad control(s) with no reachable handler:\n` +
  unresolved.map(u => `  [${u.surfaceId}] ${u.attribute}  (in: ${u.templates.join(', ')})`).join('\n') +
  '\n\nEach one must become wired (add the matching dataset.<name> read, or the matching dispatch branch, ' +
  'to its owning controller), be declared a non-action marker in NON_ACTION_ATTRIBUTE_NAMES, or be removed ' +
  'from the template if proven dead — see docs/audits/gm-datapad-recovery-action-integrity.md.'
);

// Sanity checks: known always-live controls must be present at the right
// proof level, so this test cannot silently pass by scanning zero real
// controls or by falling back to the weaker attribute-name-level check for
// something that should be proven at action-value-level.
const jobsControls = surfaces.jobs.controls.map(c => c.attribute);
assert.ok(jobsControls.includes('data-gm-wizard-open'), 'sanity check: the Job contract wizard open control should be present in the registry');
assert.ok(jobsControls.includes('data-job-subtab-switch'), 'sanity check: the Job dossier/settlement subtab strip should be present in the registry');

const factionsControls = surfaces.factions.controls;
const approveSuggestion = factionsControls.find(c => c.attribute === 'data-gm-faction-action="approve-suggestion"');
assert.ok(approveSuggestion, 'sanity check: data-gm-faction-action="approve-suggestion" should be scanned at action-value level');
assert.equal(approveSuggestion.proof, 'action-value', 'approve-suggestion must be proven at action-value level, not merely attribute-name level');
assert.equal(approveSuggestion.status, 'ACTION_VALUE_HANDLED');

for (const record of ['reject-suggestion', 'remove-relationship']) {
  const entry = factionsControls.find(c => c.attribute === `data-gm-faction-action="${record}"`);
  assert.ok(entry, `sanity check: data-gm-faction-action="${record}" should be scanned at action-value level`);
  assert.equal(entry.status, 'ACTION_VALUE_HANDLED', `${record} must resolve to a real handler, not a placebo control`);
}

const actionValueControlCount = Object.values(surfaces).reduce((n, s) => n + s.controls.filter(c => c.proof === 'action-value').length, 0);
assert.ok(actionValueControlCount > 100, `expected a substantial share of scanned controls to be proven at action-value level (got ${actionValueControlCount})`);

console.log(`GM Datapad action-integrity contract passed (${Object.values(surfaces).reduce((n, s) => n + s.controls.length, 0)} controls across ${Object.keys(surfaces).length} entries, ${actionValueControlCount} proven at action-value level).`);
