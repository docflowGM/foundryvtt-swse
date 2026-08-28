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
// attribute rendered on that surface, and asserts each one resolves to a
// `dataset.<name>` read (or an equivalent `[data-name]` selector) in that
// surface's own controller, the GM Datapad host, or one of the shared GM
// services (smart-drop, drag-drop, the Holonet composer, or the shared
// settings controller).
//
// This MUST fail when a new data-attribute is added to a live GM Datapad
// template with no matching wiring anywhere the scanner looks, without a
// matching allowlist entry in gm-datapad-action-registry.mjs.

const surfaces = await buildGmDatapadActionRegistry();

assert.equal(Object.keys(surfaces).length, 14, 'expected all 14 registered GM Datapad surfaces to be scanned');

for (const surfaceId of Object.keys(SURFACES)) {
  const surface = surfaces[surfaceId];
  assert.ok(surface, `expected surface "${surfaceId}" in the registry`);
  assert.ok(surface.templateFiles.length > 0, `surface "${surfaceId}" resolved no templates — has its root template moved?`);
}

const unresolved = unresolvedControls(surfaces);
assert.equal(
  unresolved.length,
  0,
  `Found ${unresolved.length} rendered GM Datapad control(s) with no reachable handler:\n` +
  unresolved.map(u => `  [${u.surfaceId}] ${u.attribute}  (in: ${u.templates.join(', ')})`).join('\n') +
  '\n\nEach one must become wired (add the matching dataset.<name> read to its owning controller), ' +
  'be declared a non-action marker in NON_ACTION_ATTRIBUTE_NAMES, or be removed from the template if proven dead — ' +
  'see docs/audits/gm-datapad-recovery-action-integrity.md.'
);

// Sanity check: a known always-live control must be present so this test
// cannot silently pass by scanning zero real controls.
const jobsControls = surfaces.jobs.controls.map(c => c.attribute);
assert.ok(jobsControls.includes('data-gm-wizard-open'), 'sanity check: the Job contract wizard open control should be present in the registry');
assert.ok(jobsControls.includes('data-job-subtab-switch'), 'sanity check: the Job dossier/settlement subtab strip should be present in the registry');

console.log(`GM Datapad action-integrity contract passed (${Object.values(surfaces).reduce((n, s) => n + s.controls.length, 0)} controls across ${Object.keys(surfaces).length} surfaces).`);
