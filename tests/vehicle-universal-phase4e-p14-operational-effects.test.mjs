import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import { getPublishedDerivedBase, getEffectiveVehicleDerived, getEffectiveVehicleInitiative, claimsPublishedSource } from '../scripts/domain/vehicles/vehicle-published-derived.js';
import { classifyVehicleActorSource } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import { ShieldMitigationResolver } from '../scripts/engine/combat/resolvers/shield-mitigation-resolver.js';

installSystemsResolver(); installFoundryStubs();
const { guardVehicleProvenance } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { SWSECombatDocument } = await import('../scripts/combat/swse-combat.js');
const { buildVehicleSheetContext } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const catalog = [...load('defense-systems'), ...load('movement-systems')];
const overlay = JSON.parse(readFileSync('data/vehicle-modifications/certification.json', 'utf8')).rows;
const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter', TIE = 'core-tie-fighter', ARC = 'core-arc-170-starfighter';
const rules = { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 40 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) };
const rec = a => a.flags.swse.universalVehicleSource.source;
const doc = key => {
  const d = structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === key));
  return Object.assign(d, { id: 'v1', type: 'vehicle', items: [], toObject() { const { toObject, ...rest } = this; return structuredClone(rest); } });
};
function install(a, id, installId) {
  const p = L.planVehicleInstallation({ record: rec(a), flags: a.flags, catalogEntry: { ...catalog.find(c => c.id === id), certification: overlay[id] }, installId, availableCredits: 1e9, rules, nonstandard: false });
  assert.equal(p.ok, true, id + ': ' + (p.reasons ?? []).join());
  a.flags.swse.vehicleInstallations = p.nextLedger;
}
function remove(a, installId) { a.flags.swse.vehicleInstallations = L.planVehicleUninstall({ record: rec(a), flags: a.flags, installId }).nextLedger; }
const builder = (() => {
  const code = readFileSync('scripts/actors/v2/vehicle-derived-builder.js', 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '').replace(/^export\s+\{[^}]*\};?/gm, '').replace(/\bexport\s+/g, '');
  const ctx = { getPublishedDerivedBase, getEffectiveVehicleDerived, claimsPublishedSource };
  runInNewContext(code + '\nglobalThis.build = buildVehicleDerived;', ctx);
  return ctx.build;
})();
const derive = a => { builder(a, a.system); return a.system.derived; };

test('derived Reflex (what attacks target) = printed + armor + Dex-modifier delta; removal restores', () => {
  const a = doc(XW); const printed = rec(a).defenses.reflex;
  install(a, 'armor-1', 'a1'); install(a, 'maneuvering-jets-2', 'j1');
  assert.equal(derive(a).defenses.reflex.total, printed + 2);
  assert.equal(a.system.derived.defenses.ref.total, printed + 2);
  assert.equal(a.system.derived.vehicleModifications.reflex.delta, 2);
  assert.equal(rec(a).defenses.reflex, printed, 'published record untouched');
  remove(a, 'a1'); remove(a, 'j1');
  assert.equal(derive(a).defenses.reflex.total, printed);
});

test('Initiative rolled in combat includes the certified Dexterity improvement', () => {
  const a = doc(XW); const printed = rec(a).abilities.initiativePrinted;
  install(a, 'maneuvering-jets-2', 'j1');
  assert.equal(getEffectiveVehicleInitiative(a), printed + 1);
  assert.equal(new SWSECombatDocument()._getInitiativeFormula({ actor: a }), `1d20 + ${printed + 1}`);
  assert.equal(getEffectiveVehicleDerived(a).pilotDexModifierDelta, 1, 'exposed for Pilot checks');
  remove(a, 'j1');
  assert.equal(new SWSECombatDocument()._getInitiativeFormula({ actor: a }), `1d20 + ${printed}`);
});

test('shield pool: an installed shield creates a live, depletable pool used by damage mitigation', () => {
  const a = doc(TIE);
  assert.equal(derive(a).shield, undefined, 'printed SR 0: no pool');
  install(a, 'shields-10', 's1');
  const d = derive(a);
  assert.deepEqual({ max: d.shield.max, current: d.shield.current, stored: d.shield.stored }, { max: 10, current: 0, stored: true }, 'starts empty until recharged');
  // recharge to the effective maximum is a valid runtime state; exceeding it is not
  assert.equal(guardVehicleProvenance(a, { 'system.shields.value': 10 }), undefined);
  a.system.shields.value = 10;
  assert.equal(classifyVehicleActorSource(a.toObject(), undefined, { mode: 'runtime' }).kind, 'canonical');
  assert.equal(guardVehicleProvenance(a, { 'system.shields.value': 11 }), false);
  assert.equal(guardVehicleProvenance(a, { 'system.shields.max': 10 }), false, 'the stored maximum stays the printed mirror');
  derive(a);
  const m = ShieldMitigationResolver.resolve({ damage: 15, actor: a });
  assert.equal(m.damageAfter, 5, 'SR 10 absorbs 10 of 15');
  // without the installation the same pool value is invalid
  remove(a, 's1');
  assert.equal(classifyVehicleActorSource(a.toObject(), undefined, { mode: 'runtime' }).kind, 'invalid-canonical');
});

test('published shields also feed the live pool (printed SR, never an invented one)', () => {
  const x = doc(XW); const d = derive(x);
  assert.equal(d.shield.max, rec(x).defenses.shieldRating);
  const unknown = actors.find(a => !Number.isFinite(rec(a).defenses?.shieldRating));
  if (unknown) { const u = Object.assign(structuredClone(unknown), { type: 'vehicle', items: [] }); u.toObject = () => structuredClone(unknown); builder(u, u.system); assert.equal(u.system.derived.shield, undefined); }
});

test('hyperdrive installation makes a hull hyperdrive-capable on the sheet; atmospheric speed is exposed, not auto-applied', () => {
  const t = doc(TIE); install(t, 'hyperdrive-3', 'h1');
  assert.equal(getEffectiveVehicleDerived(t).hyperdrive.class, 3);
  assert.equal(buildVehicleSheetContext(t, { editable: true }, {}).vehicleTypeFlags.supportsHyperdrive, true);
  const arc = doc(ARC); const before = derive(arc).speed.base;
  install(arc, 'atmospheric-thrusters', 't1');
  const d = derive(arc);
  assert.equal(d.speed.base, before, 'conditional (in atmosphere): no atmosphere state exists, so not applied automatically');
  assert.equal(d.vehicleModifications.atmosphericMovement[0].conditional, 'while flying in an atmosphere');
});

test('the sheet defenses panel shows the value used in play, with the printed value alongside', () => {
  const a = doc(XW); install(a, 'armor-1', 'a1');
  const ctx = buildVehicleSheetContext(a, { editable: true }, {});
  const ref = ctx.vehiclePanels.defensesPanel.defenses.find(r => r.key === 'ref');
  assert.equal(ref.total, String(rec(a).defenses.reflex + 1));
  assert.equal(ref.printed, String(rec(a).defenses.reflex));
});
