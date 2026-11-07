#!/usr/bin/env node
/**
 * READ-ONLY probe (U-0 addendum, F7). Not part of the test suite and asserts
 * nothing: it runs the REAL DroidCustomizationEngine (Foundry-shim harness,
 * fake ActorEngine) against droids whose component evidence is held in
 * different sources, and prints preview + applied wallet outcome per case.
 *   node tools/probes/probe-droid-garage-resale-evidence.mjs [--json]
 */
import { registerFoundryPathLoader } from '../../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../../tests/helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader();
const SYSTEM_ID = 'foundryvtt-swse';
const PART = 'plasteel-shell';
const { resetFakeActorEngine } = await import('../../tests/helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { DroidCustomizationEngine } = await import('../../scripts/engine/customization/droid-customization-engine.js');
const { computeDroidPartCost, normalizeDroidPartId, getDroidPartDefinition } = await import('../../scripts/data/droid-part-schema.js');

function droid({ ledger = {}, droidSystems = {}, items = [], flags = {}, credits = 10000, stock = false } = {}) {
  const actor = {
    id: 'droid-1', name: 'Probe', type: 'droid', uuid: 'Actor.droid-1', isOwner: true,
    system: { credits, ...(stock ? { droidCalculationMode: 'stock-statblock' } : {}), droidSystems: { size: 'medium', ...droidSystems }, installedSystems: ledger },
    img: '', items, effects: [], flags: { [SYSTEM_ID]: {}, swse: {}, ...flags },
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    toObject() { return JSON.parse(JSON.stringify({ system: actor.system, name: actor.name, img: actor.img, items: actor.items, effects: actor.effects, flags: actor.flags })); }
  };
  return actor;
}
const def = getDroidPartDefinition(PART);
const mirrorRecord = { id: PART, name: 'Plasteel Shell' };
const armorItem = { id: 'item-1', name: 'Plasteel Shell', type: 'equipment', flags: { [SYSTEM_ID]: { droidPart: { id: PART } } }, system: { droidPart: { id: PART } } };

const cases = [
  ['1 mirror-only (droidSystems.armor, empty ledger)', () => droid({ droidSystems: { armor: mirrorRecord } })],
  ['2 embedded Item only (no ledger)', () => droid({ items: [armorItem] })],
  ['3a disabled ledger entry (installed:false)', () => droid({ ledger: { [PART]: { installed: false } } })],
  ['3b malformed ledger entry (string)', () => droid({ ledger: { [PART]: 'junk' } })],
  ['4 valid confirmed ledger entry (control)', () => droid({ ledger: { [PART]: { installedAt: 1 } } })],
  ['5 mixed: ledger says installed:false, mirror says installed', () => droid({ ledger: { [PART]: { installed: false } }, droidSystems: { armor: mirrorRecord } })],
  ['7 stock-statblock display-only factory systems', () => droid({ droidSystems: { armor: mirrorRecord }, stock: true })]
];

const out = [];
for (const [label, make] of cases) {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, actors: { get: () => null, [Symbol.iterator]: () => [][Symbol.iterator]() }, users: [] } });
  const a = make();
  const expected = Math.floor(computeDroidPartCost(a, { id: PART }) * 0.5);
  const prev = DroidCustomizationEngine.previewDroidCustomization(a, { remove: [PART] });
  resetFakeActorEngine();
  const b = make();
  const applied = await DroidCustomizationEngine.applyDroidCustomization(b, { remove: [PART] });
  const again = await DroidCustomizationEngine.applyDroidCustomization(b, { remove: [PART] });
  out.push({
    case: label, expectedResaleIfPaid: expected,
    previewSuccess: prev.success, previewResale: prev.preview?.totalRemoveSale ?? null, previewError: prev.error ?? null,
    applySuccess: applied.success, walletBefore: 10000, walletAfter: b.system.credits ?? null,
    walletDelta: (b.system.credits ?? 10000) - 10000, applyError: applied.error ?? null,
    ledgerKeysAfter: Object.keys(b.system.installedSystems ?? {}),
    repeatRemovalSuccess: again.success, walletAfterRepeat: b.system.credits
  });
}
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 2));
else for (const r of out) console.log(`${r.case}\n   preview=${r.previewSuccess} resale=${r.previewResale} | apply=${r.applySuccess} walletDelta=${r.walletDelta} ledgerAfter=[${r.ledgerKeysAfter}] | repeat=${r.repeatRemovalSuccess} walletAfterRepeat=${r.walletAfterRepeat}\n   err: ${r.previewError ?? r.applyError ?? '-'}`);
