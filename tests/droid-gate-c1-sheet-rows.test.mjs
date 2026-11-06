import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Droid Gate C-1 -- the V2 droid sheet's Systems read model shows ONE ROW PER
// PHYSICAL appendage. The resolver used to dedupe by canonical part id, which
// would collapse two hands into one row and make a second purchase look like
// a no-op. The sheet performs no mechanical calculation here: it reads the
// identity the ledger/mirror already carry.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { DroidSystemsResolver } = await import('../scripts/sheets/v2/droid-sheet/droid-systems-resolver.js');

function droidWith({ installedSystems = {}, appendages = [] } = {}) {
  return { id: 'd1', type: 'droid', name: 'Test', items: [], system: { droidSystems: { size: 'medium', appendages }, installedSystems } };
}
const hand = (n, slot) => ({ id: 'hand', instanceId: `inst-aaaaaa0${n}`, locationId: `appendage-slot-${slot}` });
const ledgerOf = (rows) => Object.fromEntries(rows.map(r => [`hand--${r.instanceId}`, { ...r, category: 'appendage', slot: 'appendage' }]));

// 1. Two hands -> two rows, each with its own identity and its own slot.
{
  const rows = [hand(1, 1), hand(2, 2)];
  const out = new DroidSystemsResolver(droidWith({ installedSystems: ledgerOf(rows), appendages: rows })).resolve();
  assert.equal(out.appendages.items.length, 2, 'two physical hands are two rows');
  assert.deepEqual(out.appendages.items.map(i => i.instanceId).sort(), ['inst-aaaaaa01', 'inst-aaaaaa02']);
  assert.equal(new Set(out.appendages.items.map(i => i.locationId)).size, 2);
}

// 2. Five appendages stay five rows (no collapse by kind, no cap).
{
  const rows = [hand(1, 1), hand(2, 2), { id: 'claw', instanceId: 'inst-bbbbbb03', locationId: 'appendage-slot-3' },
    { id: 'tool', instanceId: 'inst-cccccc04', locationId: 'appendage-slot-4' }, { id: 'tool', instanceId: 'inst-cccccc05', locationId: 'appendage-slot-5' }];
  const out = new DroidSystemsResolver(droidWith({ installedSystems: ledgerOf(rows), appendages: rows })).resolve();
  assert.equal(out.appendages.items.length, 5);
}

// 3. (Also a regression guard: resolving ANY builder-configured part used to throw
// `installedIds.map is not a function` because the resolver passes a Set.)
// Legacy behavior preserved: a part-keyed hand with no identity is still one row,
// and a ledger-only instance is not duplicated by its own mirror row.
{
  const legacy = new DroidSystemsResolver(droidWith({ installedSystems: { hand: { id: 'hand', installed: true } }, appendages: [{ id: 'hand' }] })).resolve();
  assert.equal(legacy.appendages.items.length, 1, 'legacy evidence is still a single row');
  const rows = [hand(1, 1)];
  const both = new DroidSystemsResolver(droidWith({ installedSystems: ledgerOf(rows), appendages: rows })).resolve();
  assert.equal(both.appendages.items.length, 1, 'ledger entry and its mirror row are one physical appendage');
}

console.log('Droid Gate C-1 sheet row tests passed.');
