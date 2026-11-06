import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const builder = readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', 'utf8');
const content = readFileSync('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', 'utf8');

const powerPanel = (() => {
  const src = builder.slice(builder.indexOf('export function buildVehiclePowerSummaryPanel('));
  const body = src.slice(0, src.indexOf('\n}\n') + 3).replace('export ', '');
  const ctx = { safeNumber: (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f) };
  runInNewContext(body + '\nglobalThis.f = buildVehiclePowerSummaryPanel;', ctx);
  return ctx.f;
})();

test('no power panel without a power rule context; no invented 350/250/600', () => {
  assert.equal(powerPanel({}, null), null);
  assert.equal(powerPanel({}, undefined), null);
  assert.doesNotMatch(builder, /safeNumber\(powerData\??\.(available|allocated|budget), (350|250|600)\)/);
  const p = powerPanel({}, { enabled: true, budget: 8, allocated: 6, available: 2 });
  assert.deepEqual([p.budget, p.allocated, p.available, p.overAllocated], [8, 6, 2, false]);
  const zero = powerPanel({}, { enabled: true, budget: 0, allocated: 0, available: 0 });
  assert.equal(zero.budget, 0, 'explicit zero is kept');
});

test('resource strip power entry is labelled Power and has no WIRE GAP/Phase 2 placeholders', () => {
  assert.doesNotMatch(builder, /WIRE GAP/);
  assert.doesNotMatch(builder, /: 'Phase 2'/);
  assert.match(builder, /key: 'ep', label: 'Power'/);
});

test('directional shield zones are suppressed for any non-positive-published SR', () => {
  assert.match(builder, /publicationView && !publicationView\.shield\.editable\s*\? null/);
  assert.match(content, /else if publicationView/);
  assert.match(content, /Directional shield management applies only to a published, positive shield rating/);
});
