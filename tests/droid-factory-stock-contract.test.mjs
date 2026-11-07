import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, actors: { get: () => null }, users: [] } });
const { DroidFactory } = await import('../scripts/engine/droids/droid-factory.js');
const { StockDroidNormalizer } = await import('../scripts/domain/droids/stock-droid-normalizer.js');

// F5: a stock droid is created in stock-statblock mode via the importer; if it
// cannot be normalized the creation FAILS (no raw clone that would double-count).
const stock = { _id: 'npc-r2', name: 'R2 Unit', type: 'droid', system: { HP: 10, reflexDefense: 12 }, items: [], flags: {} };
const plan = DroidFactory.buildMutationPlan({ droidActor: stock, name: 'Bought R2' });
const data = plan.create.actors[0].data;
assert.equal(data.system.droidCalculationMode, 'stock-statblock', 'purchased stock droid is in stock-statblock mode');
assert.equal(data.flags?.swse?.stockDroidImport?.importMode, 'statblock');
assert.equal(data._id, undefined);

const original = StockDroidNormalizer.normalizeStockDroidRecord;
StockDroidNormalizer.normalizeStockDroidRecord = () => { throw new Error('boom'); };
try {
  assert.throws(() => DroidFactory.buildMutationPlan({ droidActor: stock }), e => e.code === 'STOCK_DROID_NORMALIZATION_FAILED');
} finally { StockDroidNormalizer.normalizeStockDroidRecord = original; }

// A non-stock custom droid template keeps its own fidelity (ledger included).
const custom = { name: 'Custom', type: 'droid', system: { installedSystems: { x: { id: 'x' } } }, items: [], flags: {} };
const c = DroidFactory.buildMutationPlan({ droidActor: custom }).create.actors[0].data;
assert.deepEqual(Object.keys(c.system.installedSystems), ['x']);
console.log('Droid factory stock contract tests passed.');
