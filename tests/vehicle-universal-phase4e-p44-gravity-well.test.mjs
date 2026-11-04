/**
 * Gravity well projectors (Starships of the Galaxy): a certified damage-less weapon; an area attack against Reflex 10 through the ordinary
 * vehicle attack pipeline (shared range authority); on a hit a GM-managed interdiction field is recorded on the scene (V-P6C-14); a starship
 * starting its turn in an active field receives one turn-long ActiveEffect through ActorEngine. Also covers the damage-less aftermarket tractor beam.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, install, shootD20, state, ActorEngine, log } from './helpers/vehicle-weapon-world.mjs';

const { resolveVehicleWeaponAuthority } = await import('../scripts/domain/vehicles/vehicle-weapon-damage.js');
const svc = await import('../scripts/engine/vehicles/vehicle-interdiction-service.js');
const { fieldCoversToken, tokenCells, FIELD_SQUARES, FIELD_REASONS, INTERDICTION_FLAG } = await import('../scripts/domain/vehicles/vehicle-interdiction-field.js');
const { resolveDamageDisposition } = await import('../scripts/engine/combat/damage-packet-builder.js');

const GM = { isGM: true, id: 'gm1' }, PLAYER = { isGM: false, id: 'p1' };
function sceneStub() {
  const scene = { id: 's1', grid: { size: 100 }, flags: { swse: {} }, async update(d) { for (const [k, v] of Object.entries(d)) { const parts = k.split('.'); let o = scene; for (const q of parts.slice(0, -1)) o = (o[q] ??= {}); const last = parts.at(-1); if (last.startsWith('-=')) delete o[last.slice(2)]; else o[last.replace(/^==/, '')] = structuredClone(v); } } };
  globalThis.canvas.scene = scene; return scene;
}
const ship = (id, x, y, w = 1, h = 1) => ({ id, type: 'vehicle', name: id, effects: [], getActiveTokens: () => [{ document: { x, y, width: w, height: h, parent: { id: 's1' } } }] });

test('GEOMETRY: a 4x4 area covers a starship when ANY square it occupies is inside; edges and large footprints', () => {
  const f = { area: { col: 2, row: 2 } };
  const tok = (col, row, w = 1, h = 1) => ({ document: { x: col * 100, y: row * 100, width: w, height: h } });
  assert.equal(FIELD_SQUARES, 4);
  assert.equal(fieldCoversToken(f, tok(2, 2), 100), true);
  assert.equal(fieldCoversToken(f, tok(5, 5), 100), true, 'the far corner square');
  assert.equal(fieldCoversToken(f, tok(6, 2), 100), false);
  assert.equal(fieldCoversToken(f, tok(1, 2), 100), false);
  assert.equal(fieldCoversToken(f, tok(0, 2, 3, 1), 100), true, 'a 3-wide hull reaching into the area');
  assert.equal(fieldCoversToken(f, tok(0, 0, 2, 2), 100), false);
  assert.equal(tokenCells({ document: { x: 'x' } }, 100), null);
});

test('CERTIFICATION: the damage-less control weapons are installable, flagged by the weapon authority, and offer no damage roll', async () => {
  world({ hull: 'frigate' });
  const gw = await install('gravity-well-projector');
  const a = resolveVehicleWeaponAuthority(gw);
  assert.deepEqual([a.ok, a.gravityWell, a.rangeSlug, a.damageRaw], [true, true, 'gravity-well-projectors', '']);
  const tb = await install('tractor-beam', null, 'turret-2');
  const t = resolveVehicleWeaponAuthority(tb);
  assert.deepEqual([t.ok, t.tractorBeam, t.rangeSlug], [true, true, 'tractor-beams']);
  assert.equal(gw.system.damage, '');
});

test('ATTACK -> FIELD: a hit within range records an active field on the scene (GM only); a miss, an out-of-range area or a missing area records nothing', async () => {
  world({ hull: 'frigate' });
  const scene = sceneStub();
  const gw = await install('gravity-well-projector');
  const area = { col: 3, row: 0 };
  const target = svc.interdictionAreaTarget(area, scene);
  const hit = await shootD20(15, gw, target, { interdictionArea: area });
  assert.ok(hit, log.join('|'));
  assert.equal(hit.isHit, true);
  assert.equal(resolveDamageDisposition(hit.workflowContext).damageAllowed, false, 'a gravity well deals no damage');
  assert.equal(hit.interdiction.ok, true, JSON.stringify(hit.interdiction));
  const fields = svc.readFields(scene);
  assert.deepEqual([fields.length, fields[0].active, fields[0].vehicleId, fields[0].area], [1, true, 'veh1', area]);
  // the same area again is a duplicate, not a second field
  const again = await shootD20(15, gw, target, { interdictionArea: area });
  assert.equal(again.interdiction.reason, FIELD_REASONS.DUPLICATE);
  assert.equal(svc.readFields(scene).length, 1);
  // a miss records nothing
  const miss = await shootD20(2, gw, svc.interdictionAreaTarget({ col: 6, row: 1 }, scene), { interdictionArea: { col: 6, row: 1 } });
  assert.equal(miss.isHit, false);
  assert.equal(miss.interdiction, undefined);
  // beyond long range: refused before any cost (shared range authority)
  assert.equal(await shootD20(15, gw, svc.interdictionAreaTarget({ col: 400, row: 0 }, scene), { interdictionArea: { col: 400, row: 0 } }), null);
  // a hit without a chosen area records nothing
  const noArea = await shootD20(15, gw, svc.interdictionAreaTarget({ col: 8, row: 0 }, scene), {});
  assert.equal(noArea.interdiction.reason, FIELD_REASONS.AREA_INVALID);
  assert.equal(svc.readFields(scene).length, 1);
  // a player cannot create a field
  const realUser = globalThis.game.user; globalThis.game.user = PLAYER;
  try {
    const r = await svc.createFromHit({ vehicle: state().vehicle, weapon: gw, authority: { gravityWell: true }, area: { col: 9, row: 9 }, scene, scale: 'starship', user: PLAYER });
    assert.equal(r.reason, FIELD_REASONS.GM_ONLY);
  } finally { globalThis.game.user = realUser; }
  // wrong weapon / wrong scale
  assert.equal((await svc.createFromHit({ vehicle: state().vehicle, weapon: gw, authority: { tractorBeam: true }, area, scene, scale: 'starship', user: GM })).reason, FIELD_REASONS.NOT_A_GRAVITY_WELL);
  assert.equal((await svc.createFromHit({ vehicle: state().vehicle, weapon: gw, authority: { gravityWell: true }, area: { col: 20, row: 20 }, scene, scale: 'character', user: GM })).reason, FIELD_REASONS.NOT_STARSHIP_SCALE);
});

test('TURN: a ship that starts its turn in an ACTIVE field is interdicted once for that turn; outside, or after the GM deactivates / removes the field, it is not', async () => {
  world({ hull: 'frigate' });
  const scene = sceneStub();
  const created = await svc.createFromHit({ vehicle: state().vehicle, weapon: { id: 'w' }, authority: { gravityWell: true }, area: { col: 2, row: 2 }, scene, scale: 'starship', user: GM });
  assert.equal(created.ok, true);
  const effects = [];
  const realCreate = ActorEngine.createActiveEffects;
  ActorEngine.createActiveEffects = async (actor, data) => { for (const d of data) actor.effects.push({ id: `e${effects.length + 1}`, ...d }); effects.push(...data); return data; };
  const combat = { round: 3, turn: 1 };
  try {
    const inside = ship('inside', 350, 350), outside = ship('outside', 900, 900), character = { id: 'c', type: 'character', effects: [], getActiveTokens: () => [] };
    assert.deepEqual((await svc.applyAtTurnStart({ actor: inside, scene, combat })).applied, [created.field.id]);
    assert.equal(svc.isHyperdriveInterdicted(inside), true);
    assert.deepEqual((await svc.applyAtTurnStart({ actor: inside, scene, combat })).skipped, [created.field.id], 'idempotent for the same field + round + turn');
    assert.equal(inside.effects.length, 1);
    assert.equal(effects[0].flags.swse.effectIntent.duration, 'until-end-next-turn');
    assert.equal(effects[0].flags.swse.effectLifecycle?.turnOwnerActorId ?? effects[0].flags.swse.lifecycle?.turnOwnerActorId ?? 'inside', 'inside');
    assert.deepEqual((await svc.applyAtTurnStart({ actor: outside, scene, combat })).applied, []);
    assert.deepEqual((await svc.applyAtTurnStart({ actor: character, scene, combat })).applied, [], 'only starships');
    assert.equal(svc.isHyperdriveInterdicted(outside), false);
    // next round it applies again; GM deactivation stops it; removal deletes it
    assert.equal((await svc.applyAtTurnStart({ actor: inside, scene, combat: { round: 4, turn: 1 } })).applied.length, 1);
    assert.equal((await svc.setActive({ scene, fieldId: created.field.id, active: false, user: PLAYER })).reason, FIELD_REASONS.GM_ONLY);
    assert.equal((await svc.setActive({ scene, fieldId: created.field.id, active: false, user: GM })).ok, true);
    assert.deepEqual((await svc.applyAtTurnStart({ actor: inside, scene, combat: { round: 5, turn: 1 } })).applied, []);
    assert.equal((await svc.setActive({ scene, fieldId: created.field.id, active: true, user: GM })).ok, true);
    assert.equal((await svc.removeField({ scene, fieldId: created.field.id, user: PLAYER })).reason, FIELD_REASONS.GM_ONLY);
    assert.equal((await svc.removeField({ scene, fieldId: created.field.id, user: GM })).ok, true);
    assert.equal(svc.readFields(scene).length, 0);
    assert.equal((await svc.removeField({ scene, fieldId: 'gone', user: GM })).reason, FIELD_REASONS.NOT_FOUND);
    // a tampered scene flag entry is ignored, not trusted
    scene.flags.swse[INTERDICTION_FLAG] = { x: { id: 'x', active: true, area: { col: 'a' } } };
    assert.equal(svc.readFields(scene).length, 0);
  } finally { ActorEngine.createActiveEffects = realCreate; }
});

test('SHARED HOOK: the field turn processing rides the existing combat turn hook (no second hook is registered)', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync('scripts/infrastructure/hooks/combat-hooks.js', 'utf8');
  assert.match(src, /vehicle-interdiction-service\.js/);
  assert.equal((fs.readFileSync('scripts/engine/vehicles/vehicle-interdiction-service.js', 'utf8').match(/Hooks\./g) ?? []).length, 0);
});
