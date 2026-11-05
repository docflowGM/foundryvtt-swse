import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DROID_SYSTEMS } from '../scripts/data/droid-systems.js';
import { resolveDroidComponentQuote } from '../scripts/domain/droids/droid-component-quote-authority.js';

// From audited printed source + official errata. Arithmetic ONLY.
// A successful quote must not be treated as physical-host authorization.
const evidence = JSON.parse(fs.readFileSync(
  'data/audits/droids/droid-component-sgd-errata-host-002-fixtures.json', 'utf8'
));
const close = (a, b, message) => assert.ok(
  typeof a === 'number' && Math.abs(a - b) < 1e-8,
  message + ': expected ' + b + ', observed ' + a
);

test('all 126 Core-errata SGD accessory arithmetic fixtures agree with one V2 resolver', () => {
  assert.equal(evidence.accessoryCategoryFixtures.length, 126);
  const bases = new Map(evidence.accessoryCategoryFixtures
    .filter(row => row.size === 'medium')
    .map(row => [row.component + ':' + row.variant, row.sourceArithmetic]));
  assert.equal(bases.size, 14, 'one independent medium base record per printed variant');
  // These three accessories have explicitly fixed published credit prices.
  // All others in this fixture group multiply printed credits by size.
  const flatCreditProducts = new Set([
    'Courier Compartments', 'Radiant Heat Element', 'Silence-Bubble Generator'
  ]);
  for (const row of evidence.accessoryCategoryFixtures) {
    const base = bases.get(row.component + ':' + row.variant);
    assert.ok(base, row.caseId + ': expected medium source base');
    const decision = resolveDroidComponentQuote({
      definition: {
        id: 'source-arithmetic-fixture',
        cost: flatCreditProducts.has(row.component)
          ? base.credits : factor => Math.ceil(base.credits * factor),
        weight: factor => base.kg * factor
      },
      category: 'accessory',
      sourcePath: 'accessories.source-arithmetic-fixture',
      size: row.size
    });
    assert.equal(decision.status, 'OK', row.caseId);
    assert.equal(decision.credits, row.sourceArithmetic.credits, row.caseId + ' credits');
    close(decision.kg, row.sourceArithmetic.kg, row.caseId + ' mass');
  }
});

test('all nine locomotion exceptions use ordinary size factor for mass, never accessory errata', () => {
  assert.equal(evidence.locomotionFixtures.length, 9);
  const named = new Map([
    ['Burrower Drive', DROID_SYSTEMS.locomotion.find(part => part.id === 'burrower')],
    ['Underwater Drive', DROID_SYSTEMS.locomotion.find(part => part.id === 'underwater')],
    ['Gyroscopic Stabilizers', DROID_SYSTEMS.locomotionEnhancements.find(part => part.id === 'gyroscopic-stabilizers')]
  ]);
  for (const row of evidence.locomotionFixtures) {
    const definition = named.get(row.component);
    assert.ok(definition, row.caseId);
    const decision = resolveDroidComponentQuote({
      definition, category: 'locomotion',
      sourcePath: row.component === 'Gyroscopic Stabilizers'
        ? 'locomotionEnhancements' : 'locomotion',
      size: row.size, speed: row.chosenSpeedSquares
    });
    assert.equal(decision.status, 'OK', row.caseId);
    assert.equal(decision.credits, row.expectedCredits, row.caseId + ' credits');
    close(decision.kg, row.expectedKg, row.caseId + ' mass');
  }
});

test('two physical-host source exceptions are still UNRESOLVED, not executable installation tests', () => {
  assert.equal(evidence.blockedHostFixtures.length, 2);
  const silence = evidence.blockedHostFixtures.find(row => row.component === 'Silence-Bubble Generator');
  const micro = evidence.blockedHostFixtures.find(row => row.component === 'Micro Shield');
  assert.equal(silence.hostLedgerPermission, 'NOT_ESTABLISHED_BY_SOURCE_LOCATION');
  assert.equal(micro.hostLedgerPermission, 'POSSESSION_NOT_SYSTEM');
  assert.equal(micro.handheldWeightKg, 'NOT_SEPARATELY_LISTED');
  // These are explicit HOLD assertions, not a fake claim to have exercised
  // Store, actor installedSystems, or the V13 physical-host transaction gate.
});
