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

// verified vs unverified weight: an explicit 0 is a verified zero; absent/blank/invalid/negative is counted as 0 but REPORTED
{
  const rep = E.carriedWeightReport(actor([
    it('equipment', { weight: 0 }, 'zero'), it('equipment', {}, 'missing'), it('equipment', { weight: '' }, 'blank'), it('equipment', { weight: 'abc' }, 'junk'),
    it('equipment', { weight: -2 }, 'neg'), it('equipment', { weight: 2 }, 'ok'), it('equipment', { economics: { weight: 1 } }, 'econ'), it('equipment', { quantity: 0 }, 'none-carried'),
  ]));
  assert.equal(rep.total, 3);
  assert.deepEqual(rep.unverified.map((x) => x.id).sort(), ['blank', 'junk', 'missing', 'neg']);
  assert.equal(rep.complete, false);
  assert.equal(E.carriedWeightReport(actor([it('equipment', { weight: 0 }), it('armor', { weight: 5 })])).complete, true);
  ok('explicit zero is verified; missing/blank/invalid/negative weight is flagged (and still contributes 0), zero-quantity rows are not flagged');
}
// shipped pack data contract: every weapon/armor/equipment record carries an explicit numeric system.weight (so nothing ships as an unverified zero)
{
  const fsx = await import('node:fs'); const path = await import('node:path');
  const bad = []; let n = 0;
  for (const f of fsx.readdirSync('packs').filter((x) => /^(weapons-|armor-|equipment-).*\.db$/.test(x) && !/vehicle/.test(x))) {
    for (const line of fsx.readFileSync(path.join('packs', f), 'utf8').split('\n')) {
      if (!line.trim()) continue; let r; try { r = JSON.parse(line); } catch { continue; }
      if (!['weapon', 'armor', 'equipment'].includes(r.type)) continue; n++;
      if (!E.itemWeightVerified({ system: r.system })) bad.push(`${f}:${r.name}`);
    }
  }
  assert.ok(n > 300, `scanned ${n} records`); assert.deepEqual(bad, [], 'records without a verified recorded weight');
  ok(`shipped gear packs: ${n} weapon/armor/equipment records all carry an explicit numeric weight`);
}
// canonical weapon registry parity: system.weight (what the engine reads) must equal canonicalStats.weightKg wherever both exist
{
  const fsx = await import('node:fs');
  const reg = JSON.parse(fsx.readFileSync('data/weapons/canonical-weapon-registry.json', 'utf8')).identities;
  const kg = new Map(reg.map((x) => [x.identityKey, x.canonicalStats?.weightKg ?? null]));
  let compared = 0; const diff = [];
  for (const f of fsx.readdirSync('packs').filter((x) => /^weapons-.*\.db$/.test(x))) {
    for (const line of fsx.readFileSync(`packs/${f}`, 'utf8').split('\n')) {
      if (!line.trim()) continue; let r; try { r = JSON.parse(line); } catch { continue; }
      const k = r.flags?.swse?.canonicalWeapon?.identityKey; const w = kg.get(k);
      if (r.type !== 'weapon' || w == null || r.system?.weight == null) continue;
      compared++; if (Number(r.system.weight) !== Number(w)) diff.push(`${r.name}: ${r.system.weight} vs ${w}`);
    }
  }
  assert.ok(compared > 100, `compared ${compared}`); assert.deepEqual(diff, []);
  ok(`weapon pack system.weight equals registry canonicalStats.weightKg for all ${compared} comparable records (registry has ${[...kg.values()].filter((v) => v == null).length} unrecorded)`);
}
// strict full-value parsing: malformed weights are never "verified" and never contribute a partial number
{
  const good = { 2: 2, 0: 0, 1.5: 1.5, '2': 2, ' 2.5 ': 2.5, '0': 0, '1,200': 1200, '1,200.5': 1200.5, '12': 12 };
  for (const [raw, want] of Object.entries(good)) { const v = E.parseWeightKg(isNaN(raw) ? raw : (raw.includes('.') || raw.includes(',') || raw.trim() !== raw ? raw : Number(raw))); assert.equal(v, want, `${JSON.stringify(raw)}`); }
  for (const raw of ['2kg', '2 kg', 'kg', '2abc', '1,2,3', '1,20', '1,2000', ',5', '5,', '1e3', '0x10', '2 3', '2.', '.5', '--2', '+2', '-2', -2, NaN, Infinity, -Infinity, '', '   ', null, undefined, true, false, [], [2], {}, { v: 2 }, () => 2]) {
    assert.equal(E.parseWeightKg(raw), null, `malformed ${typeof raw === 'string' ? JSON.stringify(raw) : String(raw)}`);
    const row = it('equipment', { weight: raw }, 'm');
    assert.equal(E.itemWeightVerified(row), false);
    assert.equal(E.itemUnitWeight(row), 0, 'malformed weight contributes nothing (never a partial parse)');
  }
  assert.equal(E.calculateCarriedWeight(actor([it('equipment', { weight: '2kg', quantity: 3 })])), 0);
  assert.deepEqual(E.carriedWeightReport(actor([it('equipment', { weight: '2kg' }, 'u')])).unverified.map((x) => x.id), ['u']);
  assert.equal(E.itemWeightVerified(it('equipment', { weight: '2.5' })), true); assert.equal(E.itemWeightVerified(it('equipment', { weight: 0 })), true);
  // the unit weight and the verified flag can never disagree
  for (const raw of [2, '2', '2kg', 'x', '', null, -1, 0, '1,200']) { const row = it('equipment', { weight: raw }); assert.equal(E.itemWeightVerified(row), E.parseWeightKg(raw) !== null); assert.equal(E.itemUnitWeight(row), E.parseWeightKg(raw) ?? 0); }
  ok('strict weight parsing: unit suffixes, mixed text, bad commas, exponent/hex, signs, booleans, objects and NaN are never verified and contribute 0');
}
console.log(`equipment-weight-convergence: ${n} checks ok`);
