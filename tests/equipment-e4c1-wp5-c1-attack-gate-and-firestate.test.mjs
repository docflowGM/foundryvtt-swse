import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E4-C1 WP5-C1: (A) the equipment-readiness gate at the attack EXECUTION boundary, (B) FireStateStore in-memory synchronization integrity.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const F = await import('./helpers/ready-weapon-fixture.mjs');
const { SpeciesRegistry } = await F.installReadinessEnvironment();
const A_ = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const FS = await import('/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js');
const CR = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const J = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-transaction-journal.js');
const { fingerprintIntent } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js');
const Unarmed = await import('/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); a.filter = Array.prototype.filter.bind(a); return a; };
const PROF = ['Weapon Proficiency (Pistols)', 'Weapon Proficiency (Simple Weapons)', 'Weapon Proficiency (Advanced Melee Weapons)'].map((name, i) => ({ id: `pf${i}`, type: 'feat', name, flags: {}, system: {} }));
const makeActor = (weapons, extra = {}) => {
  const actor = {
    id: 'a1', name: 'Tester', type: 'character', flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col([...PROF, ...weapons]),
    system: { species: 'Human', size: 'Medium', bab: 6, level: 6, attributes: { str: ab(3), dex: ab(4), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols', 'simple', 'advanced-melee'] },
    ...extra,
  };
  for (const w of weapons) w.actor = actor;
  return actor;
};
const target = () => ({ id: 't1', name: 'Dummy', type: 'npc', flags: { swse: {} }, effects: [], items: col([]), getFlag() { return undefined; }, system: { size: 'medium', hp: { value: 30, max: 30 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } } } });

// ---- counters: every expenditure / roll / write / message ------------------------------------------------------------------------------------
const c = { ammo: 0, rolls: 0, chat: 0, econ: 0, itemWrites: 0 };
const zero = () => { for (const k of Object.keys(c)) c[k] = 0; notes.error.length = notes.warn.length = notes.info.length = 0; };
AmmoSystem.spendForWorkflow = async () => { c.ammo += 1; return { success: true, spent: false }; };
RollEngine.safeRoll = async (f) => { c.rolls += 1; return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
SWSEChat.postRoll = async () => { c.chat += 1; return {}; };
ActionEconomyConsumption.spend = async () => { c.econ += 1; return { allowed: true, committed: false, rollback: async () => {} }; };
ActorEngine.updateOwnedItems = async () => { c.itemWrites += 1; return []; };
const noEffect = () => assert.deepEqual(c, { ammo: 0, rolls: 0, chat: 0, econ: 0, itemWrites: 0 }, 'a readiness refusal spends, rolls, writes and posts nothing');
const refusedBy = (re) => assert.ok(notes.warn.some((m) => re.test(m)), `refusal message ${re} in ${JSON.stringify(notes.warn)}`);
const opts = { suppressChat: true, target: target() };
const narrated = (a, w) => A_.rollAttackAndDamageWithNarration(a, w, { suppressChat: true, target: target() });

// ------------------------------------------------------------------------------------------------ A. attack-execution gate
const pistol = (id, o = {}) => F.readiedWeapon(id, { key: F.PISTOL_KEY, ...o });
{
  zero(); const w = pistol('p1'); const a = makeActor([w]);
  const r = await A_.rollAttack(a, w, opts);
  assert.ok(r, 'a verified READIED weapon progresses to the roll'); assert.ok(c.rolls >= 1);
  zero(); const rn = await narrated(a, w); assert.ok(rn !== undefined);
  assert.ok(c.rolls >= 1, 'the narrated entry point progresses too');
  ok('A1: a verified READIED weapon passes the gate in rollAttack and rollAttackAndDamageWithNarration');
}
for (const [label, make, re] of [
  ['A2: EQUIPPED (held, not ready)', () => F.equippedWeapon('p2', { key: F.PISTOL_KEY }), /not verified ready \(equipped\)/],
  ['A3: STOWED', () => F.weaponItem('p3', { key: F.PISTOL_KEY }), /not verified ready \(stowed\)/],
  ['A4: declared READIED that fails verification (nonexistent appendage)', () => pistol('p4', { appendageIds: ['natural-arm-9'] }), /not verified ready/],
  ['A4b: declared READIED with no chosen grip', () => pistol('p4b', { wielded: null }), /not verified ready/],
  ['A4c: legacy equipped flag only', () => ({ id: 'p4c', type: 'weapon', name: 'x', flags: { swse: { canonicalWeapon: { identityKey: F.PISTOL_KEY } } }, system: { equipped: true } }), /not verified ready/],
  ['A4d: uncertified natural/integrated weapon identity', () => pistol('p4d', { flags: { swse: { isNaturalWeapon: true } } }), /not verified ready/],
]) {
  const w = make(); const a = makeActor([w]);
  zero(); assert.equal(await A_.rollAttack(a, w, opts), null); refusedBy(re); noEffect();
  zero(); assert.equal(await narrated(a, w), null); refusedBy(re); noEffect();
  ok(`${label} is refused by both entry points before any spend, roll, write or message`);
}
{
  const w = pistol('p5'); const a = makeActor([w], { system: { ...makeActor([]).system, species: 'Not A Species' } });
  zero(); assert.equal(await A_.rollAttack(a, w, opts), null); noEffect();
  const b = makeActor([pistol('p5b')]); const was = SpeciesRegistry._initialized; SpeciesRegistry._initialized = false;
  try { zero(); assert.equal(await A_.rollAttack(b, b.items.get('p5b'), opts), null); noEffect(); zero(); assert.equal(await narrated(b, b.items.get('p5b')), null); noEffect(); } finally { SpeciesRegistry._initialized = was; }
  ok('A5: missing species evidence (unknown species, registry unavailable) fails closed with nothing spent');
}
{
  const w = pistol('p6'); const a = makeActor([w]);
  const entry = J.addPreparedEntry([], { requestId: 'r1', intentDigest: fingerprintIntent('i'), planDigest: fingerprintIntent('p'), items: [{ id: 'p6', before: { 'system.weaponPosture': 'STOWED' }, target: { 'system.weaponPosture': 'READIED' } }], spend: { state: 'pending', actionType: 'move' } });
  a.flags.swse.equipmentTxn = J.toStored(entry);
  zero(); assert.equal(await A_.rollAttack(a, w, opts), null); refusedBy(/equipment-transaction|not verified ready/); noEffect();
  zero(); assert.equal(await narrated(a, w), null); noEffect();
  a.flags.swse.equipmentTxn = { schemaVersion: 1, entries: 'garbage' };
  zero(); assert.equal(await A_.rollAttack(a, w, opts), null); noEffect();
  a.flags.swse.equipmentTxn = J.toStored(J.transitionEntry(J.transitionEntry(entry, 'r1', 'APPLIED'), 'r1', 'FINALIZED'));
  zero(); assert.ok(await A_.rollAttack(a, w, opts), 'a FINALIZED journal releases the gate');
  ok('A6: an unresolved or unreadable equipment journal fails closed; FINALIZED releases it');
}
{
  const a = makeActor([]); const virt = Unarmed.buildVirtualUnarmedWeapon(a);
  { const g = A_.checkAttackSourceReadiness(a, virt); assert.equal(g.ok, true); assert.equal(g.path, 'virtual-unarmed'); assert.equal(g.source, virt); }
  const forged = pistol('p7', { flags: { swse: { virtual: true, unarmed: true } }, posture: 'STOWED', purpose: null, appendageIds: [], wielded: null }); const fa = makeActor([forged]);
  assert.equal(A_.checkAttackSourceReadiness(fa, forged).ok, false, 'an owned Item cannot claim the virtual exception by carrying its markers');
  zero(); await A_.rollAttack(a, virt, opts);
  assert.ok(!notes.warn.some((m) => /cannot attack:/.test(m)), 'the virtual strike is not refused by the readiness gate');
  ok('A7: the genuine virtual unarmed source stays eligible through its narrow authority; an Item with look-alike markers does not');
}
{
  const real = pistol('same-id'); const a = makeActor([real]);
  const { actor: _omit, ...plain } = real; const lookalike = JSON.parse(JSON.stringify(plain)); lookalike.actor = a;    // same id, same record, but not the owned document
  zero(); assert.equal(await A_.rollAttack(a, lookalike, opts), null); refusedBy(/not one of this actor's own weapons/); noEffect();
  zero(); assert.equal(await narrated(a, lookalike), null); noEffect();
  const stranger = pistol('stranger'); stranger.actor = a;     // claims the actor but is not in its items
  zero(); assert.equal(await A_.rollAttack(a, stranger, opts), null); noEffect();
  const other = makeActor([pistol('o1')]); other.id = 'other';
  zero(); assert.equal(await A_.rollAttack(a, other.items.get('o1'), opts), null); noEffect();
  ok("A8: a fabricated, look-alike (same id) or another actor's weapon is refused; ownership is the very document, not an id match");
}
{
  // no blanket vehicle exemption: a vehicle flag in the options proves nothing; only the router-verified installation (a vehicle actor that owns the Item) is routed to its own authority
  const w = pistol('v1', { posture: 'STOWED', purpose: null, appendageIds: [], wielded: null }); const a = makeActor([w]);
  for (const flagOpts of [{ isVehicleAttack: true }, { vehicle: true }, { vehicleActor: { id: 'v', type: 'vehicle', items: col([]) } }, { vehicleActor: a }]) {
    zero(); assert.equal(await A_.rollAttack(a, w, { ...opts, ...flagOpts }), null, JSON.stringify(Object.keys(flagOpts))); noEffect();
  }
  const veh = { id: 'veh1', type: 'vehicle', name: 'Ship', items: col([]), system: {}, flags: { swse: {} } };
  const gun = { id: 'gun1', type: 'weapon', name: 'Turbolaser', flags: { swse: {} }, system: {} }; veh.items.push(gun); gun.actor = veh;
  assert.equal(A_.checkAttackSourceReadiness(veh, gun, { abstractCrewQuality: 'average' }).path, 'vehicle-routed-weapon', 'a routed vehicle weapon keeps its existing vehicle attack path (routing evidence only)');
  const gunner = makeActor([]); gunner.id = 'gunner';
  assert.equal(A_.checkAttackSourceReadiness(gunner, gun, { vehicleActor: veh }).path, 'vehicle-routed-weapon', 'crew attacking with the vehicle-owned weapon keeps the crew path');
  const orphan = { id: 'gun2', type: 'weapon', name: 'Fake Turbolaser', flags: { swse: {} }, system: {} };
  assert.equal(A_.checkAttackSourceReadiness(gunner, orphan, { vehicleActor: veh }).ok, false, 'a vehicle weapon the vehicle does not own is not exempt');
  const src = (await import('node:fs')).readFileSync(new URL('../scripts/combat/rolls/attack-readiness-gate.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const gateBody = src.slice(src.indexOf('export function checkAttackSourceReadiness'), src.indexOf('function refuseUnreadyAttack'));
  assert.ok(gateBody.length > 200 && !/isVehicleAttack|rollOptions\.vehicle\b|options\.vehicle\b|\.isVehicle\b/.test(gateBody), 'the gate has no option-flag vehicle bypass');
  ok('A9: vehicle/crew execution keeps only the router-verified installation path; option flags and unowned vehicle weapons get no bypass');
}

{
  // the other exported execution entry points share the gate: SWSERoll.rollAttack / rollAutofire and Full Attack overrides
  const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
  const rifleW = F.weaponItem('r1', { key: 'weapon-blaster-rifle' }); const a = makeActor([rifleW]);
  zero(); assert.equal(await SWSERoll.rollAttack(a, rifleW, opts), null); refusedBy(/not verified ready/); noEffect();
  zero(); assert.equal(await SWSERoll.rollAutofire(a, rifleW, { targets: [target()], skipFP: true }), null); noEffect();
  zero(); assert.equal(await SWSERoll.rollFullAttack(a, { primaryWeapon: rifleW, skipDialog: true, target: target() }), null); noEffect();
  const readyRifle = F.readiedWeapon('r2', { key: 'weapon-blaster-rifle', appendageIds: ['natural-arm-1', 'natural-arm-2'], wielded: 'two-handed' }); const b = makeActor([readyRifle]);
  assert.equal(A_.checkAttackSourceReadiness(b, readyRifle).ok, true);
  ok('A10: SWSERoll.rollAttack, rollAutofire and Full Attack overrides refuse a non-ready source before any spend, roll, write or message');
}

// ------------------------------------------------------------------------------------------------ B. FireStateStore synchronization integrity
const setPath = (obj, path, value) => {
  const parts = path.split('.'); let node = obj;
  for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {});
  const last = parts.at(-1);
  if (last.startsWith('-=')) delete node[last.slice(2)]; else node[last] = JSON.parse(JSON.stringify(value));
};
/** A controllable persistence layer: the FireStateStore write pauses at a deferred barrier; `durable` is the document as the database holds it. */
function pausedPersistence({ refreshMemory }) {
  let release; const gate = new Promise((r) => { release = r; });
  let reached; const atBarrier = new Promise((r) => { reached = r; });
  const patches = [];
  ActorEngine.updateOwnedItems = async (actor, updates) => {
    patches.push(JSON.parse(JSON.stringify(updates)));
    reached(); await gate;
    // Foundry-like document merge of a field-scoped update (only when this variant says the Item is refreshed by the write)
    if (refreshMemory) for (const u of updates) { const item = actor.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(item, k, v); }
    return updates;
  };
  return { release, atBarrier, patches };
}
const coordinatorChangesGrip = (w) => {
  w.system.weaponPosture = 'READIED'; w.system.weaponOccupancy = { schemaVersion: 1, purpose: 'wield', appendageIds: ['natural-arm-1', 'natural-arm-2'] };
  w.flags.swse.fireState = { ...w.flags.swse.fireState, wielded: 'two-handed' };
};
const finalCheck = (a, w) => {
  const r = CR.getWeaponReadiness(a, w);
  assert.equal(w.flags.swse.fireState.wielded, 'two-handed', 'the coordinator-owned grip survives');
  assert.equal(r.grip.requiredHands != null, true); assert.equal(r.ready, true, 'readiness reflects the combined authoritative state');
};
const blade = (id, fire = {}) => F.readiedWeapon(id, { key: 'weapon-vibroblade', wielded: 'one-handed', appendageIds: ['natural-arm-1'] });
const withFire = (w, extra) => { w.flags.swse.fireState = { v: 1, wielded: 'one-handed', ...extra }; return w; };

for (const refreshMemory of [true, false]) {
  const tag = refreshMemory ? 'document refreshed by the write' : 'in-memory Item NOT refreshed by the write';
  // persistOwned (setStockState free)
  {
    const w = blade('b1'); const a = makeActor([w]); const pp = pausedPersistence({ refreshMemory });
    const done = FS.setStockState(a, w, 'extended', { free: true });
    await pp.atBarrier; coordinatorChangesGrip(w); pp.release(); const res = await done;
    assert.equal(res.ok, true); assert.equal(w.flags.swse.fireState.stock, 'extended', 'the authorized update survives');
    assert.deepEqual(Object.keys(pp.patches[0][0]).filter((k) => k !== '_id').sort(), ['flags.swse.fireState.stock'], 'only the owned field is persisted');
    finalCheck(a, w);
  }
  // clearReload
  {
    const w = withFire(blade('b2'), { needsReload: true, other: 'keep' }); const a = makeActor([w]); const pp = pausedPersistence({ refreshMemory });
    const done = FS.clearReload(a, w);
    await pp.atBarrier; coordinatorChangesGrip(w); w.flags.swse.fireState.concurrent = 'kept'; pp.release(); await done;
    assert.ok(!w.flags.swse.fireState.needsReload, 'the reload clear survives'); assert.equal(w.flags.swse.fireState.other, 'keep');
    assert.equal(w.flags.swse.fireState.concurrent, 'kept', 'an unrelated concurrent field is not reverted');
    finalCheck(a, w);
  }
  // commitFired (reload-required weapon)
  {
    const w = F.readiedWeapon('b3', { key: 'weapon-black-powder-pistol', wielded: 'one-handed', appendageIds: ['natural-arm-1'] }); const a = makeActor([w]); const pp = pausedPersistence({ refreshMemory });
    const rt = (await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js'));
    const runtime = rt.resolveAttackWeaponRuntime(w, {});
    const done = FS.commitFired(a, w, runtime, {}, []);
    await pp.atBarrier; w.flags.swse.fireState = { ...w.flags.swse.fireState, wielded: 'two-handed', concurrent: 'kept' }; w.system.weaponOccupancy = { schemaVersion: 1, purpose: 'wield', appendageIds: ['natural-arm-1', 'natural-arm-2'] }; pp.release(); await done;
    assert.equal(w.flags.swse.fireState.needsReload, true, 'the fired-shot record survives');
    assert.equal(w.flags.swse.fireState.wielded, 'two-handed'); assert.equal(w.flags.swse.fireState.concurrent, 'kept');
    assert.ok(!Object.keys(pp.patches[0][0]).some((k) => /wielded/.test(k)), 'the write never names the grip');
  }
  // primePreparedAttack
  {
    globalThis.game = { ...(globalThis.game ?? {}), combat: { id: 'c1', started: true, round: 1, combatants: [{ actorId: 'a1', actor: { id: 'a1' } }] } };
    const w = F.readiedWeapon('b4', { key: 'weapon-bryar-pistol', wielded: 'one-handed', appendageIds: ['natural-arm-1'] }); const a = makeActor([w]); const pp = pausedPersistence({ refreshMemory });
    const rt = (await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js'));
    const runtime = rt.resolveAttackWeaponRuntime(w, {});
    const done = FS.primePreparedAttack(a, w, runtime, {});
    await pp.atBarrier; w.flags.swse.fireState = { ...w.flags.swse.fireState, wielded: 'two-handed', concurrent: 'kept' }; pp.release(); const res = await done;
    assert.equal(res.ok, true, JSON.stringify(res)); assert.ok(w.flags.swse.fireState.primed, 'the priming survives');
    assert.equal(w.flags.swse.fireState.wielded, 'two-handed'); assert.equal(w.flags.swse.fireState.concurrent, 'kept');
    globalThis.game.combat = null;
  }
  ok(`B1 (${tag}): persistOwned, clearReload, commitFired and primePreparedAttack keep a concurrent coordinator grip change and unrelated fields while their own update survives`);
}

{
  // failed persistence never claims success: best-effort keeps the attack going but leaves the Item unchanged; strict throws
  ActorEngine.updateOwnedItems = async () => { throw new Error('write rejected'); };
  const warn = console.warn; console.warn = () => {};
  try {
    const w = blade('f1'); const a = makeActor([w]); const before = JSON.stringify(w.flags.swse.fireState ?? null);
    const res = await FS.setStockState(a, w, 'extended', { free: true });
    assert.equal(JSON.stringify(w.flags.swse.fireState ?? null), before, 'best-effort failure: the in-memory Item does not claim the update'); assert.notEqual(w.flags.swse.fireState?.stock, 'extended');
    assert.equal(res.state?.stock === 'extended', false);
    const w2 = withFire(blade('f2'), { needsReload: true }); const a2 = makeActor([w2]);
    await FS.clearReload(a2, w2); assert.equal(w2.flags.swse.fireState.needsReload, true, 'a failed reload-clear leaves the stored fact');
    const w3 = F.readiedWeapon('f3', { key: 'weapon-micro-grenade-launcher', wielded: 'one-handed', appendageIds: ['natural-arm-1'] }); const a3 = makeActor([w3]);
    const strict = await FS.setSizeTreatment(a3, w3, 'Small');
    assert.equal(strict.ok, false); assert.ok(['persist-failed', 'no-size-treatment', 'size-not-allowed'].includes(strict.reason), strict.reason);
    const h = F.readiedWeapon('f4', { key: 'unmapped::Darkstick', wielded: 'one-handed', appendageIds: ['natural-arm-1'] });
    assert.ok(!h.flags.swse.fireState?.heldTogetherIds);
  } finally { console.warn = warn; }
  ok('B2: a rejected write never leaves the in-memory Item claiming it was stored (best-effort keeps its established tolerance; strict operations still report persist-failed)');
}

{
  // pure delta semantics
  const d = FS.fireStateDeltaFor({ v: 1, wielded: 'one-handed', stock: 'retracted', gone: 1 }, { v: 1, wielded: 'two-handed', stock: 'extended' });
  assert.deepEqual(d, { set: { stock: 'extended' }, unset: ['gone'], initialize: false });
  assert.deepEqual(FS.fireStateUpdateFor({ v: 1, wielded: 'one-handed' }, { v: 1, wielded: 'two-handed' }), {});
  assert.deepEqual(FS.fireStateUpdateFor(null, { stock: 'extended' }), { 'flags.swse.fireState.stock': 'extended', 'flags.swse.fireState.v': 1 });
  ok('B3: the delta names only FireStateStore-owned changed keys (never the grip, never the whole record)');
}

// ------------------------------------------------------------------------------------------------ C. source-backed acceptance debt (pending, never falsely passing)
{
  const debt = [
    { id: 'EQ-002/darkstick-group', source: 'Galaxy at War p. 36', requirement: 'grouped darksticks: one weapon, 2d8 (1d6 single), >2 add nothing' },
    { id: 'EQ-003/combat-gloves', source: 'Core Rulebook p. 121', requirement: 'worn; +1 damage on unarmed hits; cannot be disarmed or dropped' },
    { id: 'EQ-003/stunning-gauntlet', source: 'Knights of the Old Republic Campaign Guide p. 202', requirement: 'worn; unarmed melee becomes stun, +1 stun damage; cannot be disarmed or dropped' },
    { id: 'EQ-003/tactical-tractor-beam', source: 'Galaxy at War p. 42', requirement: 'host mount or tripod (one size smaller, Medium two-handed); generator; crew regulation or -2; maintenance' },
  ];
  const manifest = JSON.parse((await import('node:fs')).readFileSync(new URL('../data/audits/equipment-acceptance-debt.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.items.slice(0, debt.length).map((i) => [i.id, i.source]), debt.map((d) => [d.id, d.source]));
  for (const id of ['EQ-003/worn-weapon-attack-execution', 'DATA-GAP/retrosaber-canonical-size', 'DOMAIN/homebrew-weapon-certification']) assert.ok(manifest.items.some((i) => i.id === id), id);
  assert.ok(manifest.items.every((i) => /^PENDING_/.test(i.status) && i.requirement && i.positiveTests.length), 'every item names its pending positive tests');
  ok('C1: source-backed future positive acceptance requirements are tracked in a traceable test-debt manifest (pending, not passing)');
}

console.log(`\nE4-C1 WP5-C1 attack gate and fire-state integrity: ${n} checks passed.`);
