/**
 * Vehicle tractor beams (Core, Tractor Beams) as a thin adapter over weapon-control-effects / GrappleStateEngine: the hold, its per-turn
 * maintenance, the range break and the size limit are the EXISTING control engine's; only the declaration and the call are vehicle-specific.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './helpers/vehicle-weapon-world.mjs';

const { vehicleTractorDeclaration, applyVehicleTractorBeam, tractorMoveSquares, vehicleTractorInRange } = await import('../scripts/engine/vehicles/vehicle-tractor-beam.js');
const { GrappleStateEngine } = await import('../scripts/engine/combat/grapple-state-engine.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const { SWSEGrappling } = await import('../scripts/combat/systems/grappling-system.js');
const { CONTROL_END_REASONS } = await import('../scripts/items/weapon-runtime/control-rules.js');

const veh = (size = 'colossal') => ({ id: 'v1', type: 'vehicle', name: 'Cruiser', system: { size }, items: new Map() });
const tgt = (size) => ({ id: 't1', type: 'vehicle', name: 'Target', system: { size } });

test('DECLARATION: built by the control engine\'s own builder; scale sets the move; no hurl; the beam\'s printed grapple and the range check ride along', () => {
  const d = vehicleTractorDeclaration({ vehicle: veh('colossal'), scale: 'starship', controllerGrapple: 36 });
  assert.equal(d.tractor.maxSize, 'colossal');
  assert.deepEqual([d.tractor.move.squares, d.tractor.hurl.squares, d.tractor.controllerGrapple, d.tractor.rangeCheck], [1, 0, 36, 'vehicle-weapon-range']);
  assert.equal(vehicleTractorDeclaration({ vehicle: veh(), scale: 'character' }).tractor.move.squares, 10);
  assert.equal(tractorMoveSquares('starship'), 1);
  assert.ok(CONTROL_END_REASONS.includes('out-of-range'));
});

test('ACQUIRE: size limit, opposed grapple (the beam\'s printed bonus), then the shared grab state', async () => {
  world();
  const calls = [];
  const realAdvance = GrappleStateEngine.advancePair, realRoll = RollEngine.safeRoll, realBonus = SWSEGrappling._rollGrappleBonus;
  GrappleStateEngine.advancePair = async (a, d, state, opts) => { calls.push({ state, control: opts.control }); };
  SWSEGrappling._rollGrappleBonus = async () => 20;
  let att = 30, def = 10;       // forced totals: attacker's roll is the first, defender's the second
  let n = 0;
  RollEngine.safeRoll = async formula => ({ total: (n++ % 2 === 0) ? att : def, formula });
  try {
    const vehicle = veh('colossal'), weapon = { id: 'w1', name: 'tractor beam' }, authority = { ok: true, tractorBeam: true, tractorGrapple: 36 };
    const larger = await applyVehicleTractorBeam({ vehicle: veh('huge'), weapon, authority, target: tgt('colossal'), scale: 'starship' });
    assert.deepEqual([larger.applied, larger.reason], [false, 'target-too-large'], 'a larger target is not held (deferred: Core lets the beam pull ITSELF toward it)');
    assert.equal(calls.length, 0);
    att = 5; def = 30;
    const lost = await applyVehicleTractorBeam({ vehicle, weapon, authority, target: tgt('colossal'), scale: 'starship' });
    assert.deepEqual([lost.applied, lost.reason], [false, 'opposed-check-lost']);
    assert.equal(calls.length, 0, 'a lost opposed check creates no state');
    att = 30; def = 10;
    const won = await applyVehicleTractorBeam({ vehicle, weapon, authority, target: tgt('large'), scale: 'starship' });
    assert.equal(won.applied, true, JSON.stringify(won));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].state, 'grabbed');
    assert.deepEqual([calls[0].control.tractor.moveSquares, calls[0].control.tractor.controllerGrapple, calls[0].control.tractor.rangeCheck], [1, 36, 'vehicle-weapon-range']);
    assert.equal(calls[0].control.controllerId, 'v1');
    assert.equal((await applyVehicleTractorBeam({ vehicle, weapon, authority: { ok: true }, target: tgt('large') })).reason, 'not-a-tractor-beam');
  } finally { GrappleStateEngine.advancePair = realAdvance; RollEngine.safeRoll = realRoll; SWSEGrappling._rollGrappleBonus = realBonus; }
});

test('RANGE: a controller without the beam weapon keeps the hold (nothing measurable); the printed vehicle grapple replaces the BAB/Strength computation', async () => {
  assert.equal(await vehicleTractorInRange({ controller: veh(), target: tgt('large'), control: { source: { weaponId: 'gone' } } }), true);
  const { publishedVehicleGrappleBonus } = await import('../scripts/domain/vehicles/vehicle-weapon-damage.js');
  assert.equal(publishedVehicleGrappleBonus({ type: 'character' }), null);
});
