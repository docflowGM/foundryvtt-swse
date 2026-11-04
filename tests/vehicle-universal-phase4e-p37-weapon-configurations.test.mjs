/**
 * WE-4: weapon configurations (Starships of the Galaxy Table 3-5, p. 47) as OPTIONS of a weapon purchase on the shared option carrier.
 * Owner rulings 2026-11-04: V-P6C-11 the printed "xN" is a TOTAL-cost multiplier of the base price (1,200 blaster cannon as a double
 * cannon = 3,600); V-P6C-10 the printed extra dice join the weapon's dice before the vehicle multiplier (4d10x2 double = 5d10x2);
 * alternatives within a group, one option per weapon, enhancements never on turbolasers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { S, world, install, shootD20, targetAt, state, catalogRow, catalogOf, GM_MOUNT, log } from './helpers/vehicle-weapon-world.mjs';
import * as E from '../scripts/domain/vehicles/vehicle-modification-effects.js';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import { resolveVehicleWeaponAuthority, resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';
import { classifyInstalledVehicleWeapon } from '../scripts/domain/vehicles/vehicle-attack-provenance.js';

const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const weapons = load('weapon-systems');
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
const printed = JSON.parse(readFileSync('data/audits/vehicles/p6a/print-verified-components-v2.json', 'utf8'));

// config id: [multiplier, extra dice, extra EP, autofire-eligible bases]
const CFG = { 'cannon-double': [3, 1, 0], 'cannon-quad': [5, 2, 1], 'fire-linked-2': [2, 1, 1], 'fire-linked-4': [4, 2, 2], 'cannon-enhancement': [2, 1, 1], 'cannon-enhancement-advanced': [5, 2, 2], 'autoblaster': [2, 0, 0] };
const BASES = {
  'blaster-cannon-light': [3, 'fighter', 1200, 1], 'blaster-cannon-medium': [4, 'fighter', 2500, 1], 'blaster-cannon-heavy': [5, 'fighter', 5500, 2],
  'laser-cannon-light': [3, 'fighter', 1500, 1], 'laser-cannon-medium': [4, 'fighter', 4000, 1], 'laser-cannon-heavy': [5, 'fighter', 6000, 2],
  'ion-cannon-light': [3, 'fighter', 2000, 1], 'ion-cannon-medium': [5, 'fighter', 3000, 2], 'ion-cannon-heavy': [3, 'frigate', 6000, 5],
  'turbolaser-light': [3, 'frigate', 5000, 2], 'turbolaser-medium': [5, 'frigate', 10000, 5], 'turbolaser-heavy': [7, 'frigate', 20000, 10]
};
const mult = id => (id.startsWith('turbolaser') || id === 'ion-cannon-heavy' ? 5 : 2);
const eligible = (cfg, base) => (cfg === 'autoblaster' ? base.startsWith('blaster') : cfg.startsWith('cannon-enhancement') ? !base.startsWith('turbolaser') : true);
const AUTOFIRE = new Set(['blaster-cannon-light', 'blaster-cannon-medium', 'blaster-cannon-heavy', 'laser-cannon-light', 'laser-cannon-medium', 'laser-cannon-heavy', 'ion-cannon-light', 'turbolaser-light']);
const damageOf = (base, dice) => `${BASES[base][0] + dice}d10x${mult(base)}${base.startsWith('ion') ? ' (Ion)' : ''}`;

test('SOURCE: every configuration row equals its PDF-verified cells; the registry carries the printed multiplier, dice and EP', () => {
  const pr = new Map();
  (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.source?.table === '3-5' && o.printedName) pr.set(o.printedName.toLowerCase(), o); Object.values(o).forEach(walk); } })(printed);
  const names = { 'cannon-double': 'cannon, double', 'cannon-quad': 'cannon, quad', 'fire-linked-2': 'fire-linked weapon, 2', 'fire-linked-4': 'fire-linked weapon, 4', 'cannon-enhancement': 'cannon enhancements', 'cannon-enhancement-advanced': 'cannon enhancements, advanced', 'autoblaster': 'autoblaster' };
  for (const [id, [m, dice, ep]] of Object.entries(CFG)) {
    const row = weapons.find(w => w.id === id), p = pr.get(names[id]), fx = E.EFFECTS[id];
    assert.ok(p, id); assert.equal(p.verification, 'PDF_VISUAL_REVIEW');
    assert.deepEqual([p.cost.kind, p.cost.value, p.emplacementPoints], ['multiplier', m, ep], id);
    assert.deepEqual([row.costType, row.costMultiplier, row.emplacementPoints], ['multiplier', m, ep], id);
    assert.deepEqual([fx.kind, fx.priceMultiplier, fx.extraDice, fx.extraEmplacementPoints], ['weapon-option', m, dice, ep], id);
    assert.equal(cert[id].status, 'MECHANIC_SPECIFIED'); assert.equal(cert[id].effectTest, 'tests/vehicle-universal-phase4e-p37-weapon-configurations.test.mjs');
  }
  // composition: dice before the multiplier; a type suffix and a capital multiplier survive
  assert.equal(E.composeWeaponDamage('4d10x2', 1), '5d10x2'); assert.equal(E.composeWeaponDamage('4d10x2', 2), '6d10x2');
  assert.equal(E.composeWeaponDamage('3d10x5 (Ion)', 2), '5d10x5 (Ion)'); assert.equal(E.composeWeaponDamage('4d10x2', 0), '4d10x2'); assert.equal(E.composeWeaponDamage('weird', 1), null);
  // alternatives share a group; triple is an alias of double and has no catalog row
  assert.equal(E.EFFECTS['cannon-double'].alternativesGroup, E.EFFECTS['cannon-quad'].alternativesGroup);
  assert.equal(E.EFFECTS['fire-linked-2'].alternativesGroup, E.EFFECTS['fire-linked-4'].alternativesGroup);
  assert.equal(E.EFFECTS['cannon-enhancement'].alternativesGroup, E.EFFECTS['cannon-enhancement-advanced'].alternativesGroup);
  assert.notEqual(E.EFFECTS['cannon-double'].alternativesGroup, E.EFFECTS['fire-linked-2'].alternativesGroup);
});

for (const [cfg, [m, dice, ep]] of Object.entries(CFG)) {
  test(`${cfg}: every eligible base weapon is bought at the TOTAL price, adds the printed EP and dice, fires and is removed; the ineligible are refused`, async () => {
    for (const [base, [d0, hull, price, baseEp]] of Object.entries(BASES)) {
      world({ hull });
      const c0 = state().owner.system.credits;
      if (!eligible(cfg, base)) {
        const r = await S.gmInstantInstall({ ownerActor: state().owner, vehicle: state().vehicle, catalogId: base, optionId: cfg, catalog: catalogOf(base, cfg), reason: 'refit', mount: GM_MOUNT });
        assert.equal(r.success, false, `${cfg} on ${base}`); assert.ok(r.reasons.includes('OPTION_BASE_WEAPON_INELIGIBLE'), `${base}: ${r.reasons}`);
        assert.equal(state().owner.system.credits, c0, 'nothing charged');
        continue;
      }
      const w = await install(base, cfg);
      const entry = L.readCertifiedInstallations(state().src.flags, state().src.flags.swse.universalVehicleSource.source.identity.sourceEntryKey).entries.at(-1);
      assert.equal(c0 - state().owner.system.credits, price * m, `${cfg} on ${base}: total price = base x ${m}`);
      assert.deepEqual([entry.priceCredits, entry.epCost, entry.executable], [price * m, baseEp + ep, true], `${cfg} ${base}`);
      assert.equal(entry.option.catalogId, cfg); assert.equal(entry.option.autofire, AUTOFIRE.has(base) && E.EFFECTS[cfg].autofireBases.includes(base), `${cfg} ${base} autofire eligibility`);
      assert.equal(w.system.damage, damageOf(base, dice), `${cfg} on ${base}: extra dice before the multiplier`);
      assert.equal(w.name, `${weapons.find(x => x.id === base).name} (${E.EFFECTS[cfg].label})`);
      assert.equal(classifyInstalledVehicleWeapon(state().vehicle, w).kind, 'CERTIFIED_INSTALLATION');
      const dmg = resolveVehicleWeaponDamage(w);
      assert.deepEqual([dmg.ok, dmg.formula, dmg.multiplier, dmg.damageType], [true, `${d0 + dice}d10`, mult(base), base.startsWith('ion') ? 'ion' : null]);
      assert.equal(buildDamageFormula(resolveDamageComposition(state().vehicle, w, { weapon: w })), `(${d0 + dice}d10) * ${mult(base)}`);
      // it fires through the one attack runtime
      const shot = await shootD20(15, w, targetAt(1), {});
      assert.ok(shot, `${cfg} ${base}: ${log.join('|')}`);
      // removal
      const rm = await S.uninstall({ ownerActor: state().owner, vehicle: state().vehicle, installId: entry.installId });
      assert.equal(rm.success, true);
      assert.equal(await shootD20(15, w, targetAt(1), {}), null, 'the removed weapon cannot fire');
    }
  });
}

test('the worked examples: 1,200 blaster cannon -> double 3,600 (5d10 not 4); 4d10x2 laser -> double 5d10x2, quad 6d10x2; ion keeps its type', async () => {
  world();
  const c0 = state().owner.system.credits;
  const dbl = await install('blaster-cannon-light', 'cannon-double');
  assert.equal(c0 - state().owner.system.credits, 3600);
  assert.equal(dbl.system.damage, '4d10x2');
  const quad = await install('laser-cannon-medium', 'cannon-quad', 'turret-2');
  assert.equal(quad.system.damage, '6d10x2');
  const dbl2 = await install('laser-cannon-medium', 'cannon-double', 'turret-3');
  assert.equal(dbl2.system.damage, '5d10x2');
  const ion = await install('ion-cannon-light', 'fire-linked-4', 'turret-4');
  assert.equal(ion.system.damage, '5d10x2 (Ion)'); assert.equal(resolveVehicleWeaponDamage(ion).damageType, 'ion');
});

test('one option per weapon; option rows are not weapons; a changed catalog row is refused; the seal covers the option', async () => {
  world({ hull: 'frigate' });
  const base = catalogRow('laser-cannon-light');
  const mount = S.normalizeMount(GM_MOUNT, { isGM: true, userId: 'gm1', now: 1 }).mount;
  const plan = (opt, o = {}) => L.planVehicleInstallation({ record: state().src.flags.swse.universalVehicleSource.source, flags: { swse: {} }, catalogEntry: base, option: opt, installId: 'x', availableCredits: 1e9,
    rules: { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 40 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) }, mount, nonstandard: false, ...o });
  const dbl = catalogRow('cannon-double');
  assert.equal(plan(dbl).entry.priceCredits, 4500);
  for (const bad of [{ ...dbl, costMultiplier: 1 }, { ...dbl, costType: 'flat' }, { ...dbl, damage: '+3d10' }, { ...dbl, emplacementPoints: 2 }, { ...dbl, certification: { status: 'SOURCE_VERIFIED' } }])
    assert.equal(plan(bad).ok, false, JSON.stringify(bad).slice(0, 60));
  // standalone purchase of an option is refused
  assert.ok(plan(null, { catalogEntry: dbl }).reasons.includes('WEAPON_OPTION_REQUIRES_A_BASE_WEAPON'));
  // the sealed option cannot be edited into a better one
  const w = await install('laser-cannon-light', 'cannon-double');
  const raw = state().src.flags.swse.vehicleInstallations;
  raw[0].option = { ...raw[0].option, catalogId: 'cannon-quad', extraDice: 2 };
  assert.equal(L.readCertifiedInstallations(state().src.flags, state().src.flags.swse.universalVehicleSource.source.identity.sourceEntryKey).entries.length, 0);
  assert.equal(await shootD20(15, w, targetAt(1), {}), null);
});
