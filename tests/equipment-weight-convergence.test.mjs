import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Carried weight has ONE authority (EncumbranceEngine, kg). Sheet panels, the ledger and derived encumbrance must agree with it.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const { EncumbranceEngine: E } = await import('/systems/foundryvtt-swse/scripts/engine/encumbrance/EncumbranceEngine.js');
const { RowTransformers } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/context/RowTransformers.js');

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const it = (type, system, id = Math.random().toString(36).slice(2)) => ({ id, type, name: id, system });
const actor = (items, str = 10) => ({ items, type: 'character', system: { attributes: { str: { total: str } }, size: 'medium' } });

// one item / multiple items / quantity
assert.equal(E.calculateCarriedWeight(actor([it('equipment', { weight: 2 })])), 2); ok('one item');
assert.equal(E.calculateCarriedWeight(actor([it('equipment', { weight: 2 }), it('weapon', { weight: 3.5 })])), 5.5); ok('multiple items');
assert.equal(E.calculateCarriedWeight(actor([it('equipment', { weight: 2, quantity: 5 })])), 10); ok('quantity > 1');
// zero quantity is zero, absent quantity is one
assert.equal(E.calculateCarriedWeight(actor([it('equipment', { weight: 2, quantity: 0 })])), 0); ok('explicit zero quantity carries nothing');
assert.equal(E.itemQuantity(it('equipment', {})), 1); assert.equal(E.itemQuantity(it('equipment', { quantity: '' })), 1); assert.equal(E.itemQuantity(it('equipment', { quantity: 'x' })), 1); ok('absent/invalid quantity defaults to 1');
// armor: worn AND carried-but-unworn both count
assert.equal(E.calculateCarriedWeight(actor([it('armor', { weight: 10, equipped: true })])), 10); ok('worn armor');
assert.equal(E.calculateCarriedWeight(actor([it('armor', { weight: 10, equipped: false })])), 10); ok('carried unworn armor');
// consumables (weight x quantity)
assert.equal(E.calculateCarriedWeight(actor([it('equipment', { weight: 0.5, quantity: 4, itemRole: 'consumable' })])), 2); ok('consumables');
// zero / missing / invalid / negative weight
assert.equal(E.calculateCarriedWeight(actor([it('equipment', { weight: 0 }), it('equipment', {}), it('equipment', { weight: 'abc' }), it('equipment', { weight: -4 })])), 0); ok('zero, missing, invalid, negative weight -> 0');
assert.equal(E.calculateCarriedWeight(actor([it('equipment', { economics: { weight: 3 } })])), 3); ok('economics.weight fallback (normalizer contract)');
assert.equal(E.calculateCarriedWeight(actor([it('equipment', { weight: '1,200' })])), 1200); ok('numeric string weight');
// non-gear types never count
assert.equal(E.calculateCarriedWeight(actor([it('feat', { weight: 99 }), it('talent', { weight: 99 }), it('class', { weight: 99 })])), 0); ok('non-gear types ignored');
assert.equal(E.calculateCarriedWeight(actor([])), 0); assert.equal(E.calculateCarriedWeight(null), 0); ok('empty / null actor');

// encumbrance state uses the same total
const heavy = actor([it('armor', { weight: 150 }), it('equipment', { weight: 60 })], 10); // capacity light 100, medium 200
const st = E.calculateEncumbrance(heavy);
assert.equal(st.totalWeight, E.calculateCarriedWeight(heavy)); assert.equal(st.state, 'heavy'); ok('encumbrance state total == carried weight (unworn armor now loads the actor)');

// sheet rows share the same unit weight / quantity readers
const row = RowTransformers.toInventoryRow(it('equipment', { weight: 2, quantity: 0 }), true);
assert.equal(row.quantity, 0); assert.equal(row.weight, 2); ok('inventory row preserves zero quantity and reads canonical unit weight');

// ledger + inventory panels agree with the engine
const { PanelContextBuilder } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js');
const items = [it('weapon', { weight: 3, quantity: 2 }), it('armor', { weight: 10, equipped: false }), it('equipment', { weight: 1.25, quantity: 0 }), it('equipment', { weight: 1 })];
const a = actor(items); a.items.get = (id) => items.find((i) => i.id === id);
const b = new PanelContextBuilder(a, { isEditable: true });
const authority = E.calculateCarriedWeight(a);
assert.equal(authority, 17);
const ledger = b.buildEquipmentLedgerPanel();
assert.equal(ledger.totalEquipmentWeight, `${authority} kg`); assert.ok(!JSON.stringify(ledger).includes('lbs')); ok('ledger total comes from the engine, in kg');
const inv = b.buildInventoryPanel();
assert.equal(inv.totalWeight, authority); ok('inventory panel total comes from the engine');
console.log(`equipment-weight-convergence: ${n} checks ok`);
