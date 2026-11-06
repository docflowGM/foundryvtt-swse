import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
registerFoundryPathLoader();

const { resolveDroidPartQuote, computeDroidPartCost, computeDroidPartWeight, hydrateDroidPart } =
  await import('../scripts/data/droid-part-schema.js');

function actor(size) {
  return { type: 'droid', system: { droidSystems: { size } } };
}

test('existing part-schema adapter consumes canonical V2 credits and kg', () => {
  const droid = actor('small');
  const q = resolveDroidPartQuote(droid, { id: 'plasteel-shell', cost: 0, weight: 0 });
  assert.equal(q.status, 'OK');
  assert.equal(q.credits, 800);
  assert.equal(q.kg, 2);
  assert.equal(computeDroidPartCost(droid, 'plasteel-shell'), 800);
  assert.equal(computeDroidPartWeight(droid, 'plasteel-shell'), 2);
  const hydrated = hydrateDroidPart({ id: 'plasteel-shell', cost: 0 }, { actor: droid });
  assert.equal(hydrated.cost, 800);
  assert.equal(hydrated.weight, 2);
  assert.equal(hydrated.quoteStatus, 'OK');
  assert.equal(hydrated.quoteBlockingReason, null);
});

test('old instance prices and mass cannot replace source authority', () => {
  const droid = actor('tiny');
  assert.equal(resolveDroidPartQuote(droid, { id: 'plasteel-shell', cost: 1, weight: 99 }).credits, 2000);
  assert.ok(Math.abs(resolveDroidPartQuote(droid, 'plasteel-shell').kg - .8) < 1e-9);
});

test('unrecognized or unknown size is blocked, not a free component', () => {
  assert.equal(resolveDroidPartQuote(actor('medium'), 'does-not-exist').status, 'BLOCKED');
  assert.equal(resolveDroidPartQuote(actor('not-a-size'), 'plasteel-shell').status, 'BLOCKED');
  assert.equal(computeDroidPartCost(actor('not-a-size'), 'plasteel-shell'), null);
  assert.equal(computeDroidPartWeight(actor('not-a-size'), 'plasteel-shell'), null);
});
