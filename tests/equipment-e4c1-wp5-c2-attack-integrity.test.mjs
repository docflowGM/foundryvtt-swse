import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E4-C1 WP5-C2: R1 weapon document ownership, R2 virtual unarmed provenance, R3 vehicle routing honesty, R4 readiness freshness across async boundaries,
// R5 FireStateStore persistence truthfulness. Every negative case is deterministic and fails against the WP5-C1 head (c0d534d).
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


globalThis.foundry.utils = globalThis.foundry.utils ?? {}; globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
const pistol = (id, o = {}) => F.readiedWeapon(id, { key: F.PISTOL_KEY, ...o });
const REC = F.REC;
const unready = (w) => { Object.assign(w.system, REC('STOWED', null, [])); };

// ------------------------------------------------------------------------------------------------ R1 document ownership
{
  const real = pistol('own1'); real.uuid = 'Actor.a1.Item.own1'; const a = makeActor([real]);
  const g = A_.checkAttackSourceReadiness(a, real);
  assert.equal(g.ok, true); assert.equal(g.source, real, 'the authorized source IS the owned document');
  const lookalike = { ...real, flags: JSON.parse(JSON.stringify(real.flags)), system: JSON.parse(JSON.stringify(real.system)) };   // same id, same uuid, same record, different object
  assert.equal(lookalike.uuid, real.uuid); assert.notEqual(lookalike, real);
  assert.equal(A_.checkAttackSourceReadiness(a, lookalike).ok, false, 'a look-alike sharing the owned Item uuid is not an attack source');
  assert.equal(A_.checkAttackSourceReadiness(a, lookalike).reason, 'weapon-not-owned-by-attacker');
  zero(); assert.equal(await A_.rollAttack(a, lookalike, opts), null); noEffect();
  // a look-alike carrying DIFFERENT mechanical data under the owned uuid must not borrow the owned Item's readiness
  const stronger = { ...lookalike, system: { ...lookalike.system, damage: '9d99' } };
  zero(); assert.equal(await narrated(a, stronger), null); noEffect();
  ok('R1: a look-alike sharing the owned Item uuid or id is refused by every entry point; the authorized source is the exact owned document');
}

// ------------------------------------------------------------------------------------------------ R2 virtual unarmed provenance
{
  const a = makeActor([]); const b = makeActor([]); b.id = 'b2';
  const virt = Unarmed.buildVirtualUnarmedWeapon(a);
  assert.equal(Unarmed.isGenuineVirtualUnarmed(a, virt), true);
  assert.equal(A_.checkAttackSourceReadiness(a, virt).path, 'virtual-unarmed');
  // fabricated markers on a fresh object
  const forged = { id: 'swse-virtual-unarmed', name: 'Unarmed Strike', type: 'weapon', flags: { swse: { virtual: true, unarmed: true } }, system: { damage: '9d99', isUnarmed: true } };
  assert.equal(A_.checkAttackSourceReadiness(a, forged).ok, false, 'caller-supplied virtual/unarmed markers prove nothing');
  zero(); assert.equal(await A_.rollAttack(a, forged, opts), null); noEffect();
  // a copy of the genuine record (serialized, cloned, spread) is not the helper's record
  for (const copy of [JSON.parse(JSON.stringify(virt)), structuredClone(virt), { ...virt }]) assert.equal(A_.checkAttackSourceReadiness(a, copy).ok, false, 'a copy is not the authority\'s record');
  // altered damage record on the genuine object
  const tampered = Unarmed.buildVirtualUnarmedWeapon(a); tampered.system.damage = '9d99';
  assert.equal(A_.checkAttackSourceReadiness(a, tampered).ok, false, 'an edited damage record is refused');
  const flagged = Unarmed.buildVirtualUnarmedWeapon(a); flagged.flags.swse.martialArtsStep = 5;
  assert.equal(A_.checkAttackSourceReadiness(a, flagged).ok, false, 'an edited flag record is refused');
  // cross-actor reuse
  assert.equal(A_.checkAttackSourceReadiness(b, virt).ok, false, 'a strike built for one actor cannot be used by another');
  zero(); assert.equal(await A_.rollAttack(b, virt, opts), null); noEffect();
  // an owned Item can still not claim the exception
  const owned = pistol('own2', { flags: { swse: { virtual: true, unarmed: true } }, posture: 'STOWED', purpose: null, appendageIds: [], wielded: null }); const c2 = makeActor([owned]);
  assert.equal(A_.checkAttackSourceReadiness(c2, owned).ok, false);
  // legitimate variants built by the authority stay eligible and unchanged
  const grab = Unarmed.buildVirtualUnarmedWeapon(a, { name: 'Unarmed Grab', id: 'swse-virtual-unarmed-grab' });
  assert.equal(A_.checkAttackSourceReadiness(a, grab).ok, true);
  const plainDamage = Unarmed.buildVirtualUnarmedWeapon(a).system.damage;
  const slammer = Unarmed.buildVirtualUnarmedWeapon(a, { name: 'Slammer', id: 'swse-virtual-slammer', extraDamageDieSteps: 1, flagMarks: { slammerCrushExtraDie: true }, attackOptions: { slammer: true } });
  assert.equal(slammer.system.damage, Unarmed.increaseDamageDie(plainDamage, 1), 'Crush die-step increase is applied by the authority, in the same order as before');
  assert.equal(slammer.flags.swse.slammerCrushExtraDie, true); assert.equal(slammer.system.attackOptions.slammer, true);
  assert.equal(A_.checkAttackSourceReadiness(a, slammer).ok, true, 'the Slammer strike is authenticated, not cloned');
  const noCrush = Unarmed.buildVirtualUnarmedWeapon(a, { name: 'Slammer', id: 'swse-virtual-slammer', extraDamageDieSteps: 0, attackOptions: { slammer: true } });
  assert.equal(noCrush.system.damage, plainDamage); assert.equal(noCrush.flags.swse.slammerCrushExtraDie, undefined);
  zero(); assert.ok(await A_.rollAttack(a, virt, opts), 'the genuine strike still rolls'); assert.ok(c.rolls >= 1);
  ok('R2: virtual unarmed is authenticated through the unarmed helper: forged markers, copies, edited damage and cross-actor reuse are refused; genuine variants (grab, Slammer/Crush) stay eligible');
}

// ------------------------------------------------------------------------------------------------ R3 vehicle routing honesty
{
  const veh = { id: 'veh1', type: 'vehicle', name: 'Ship', items: col([]), system: {}, flags: { swse: {} } };
  const gun = { id: 'gun1', type: 'weapon', name: 'Turbolaser', flags: { swse: {} }, system: {} }; veh.items.push(gun); gun.actor = veh;
  const gunner = makeActor([]); gunner.id = 'gunner';
  const abs = A_.checkAttackSourceReadiness(veh, gun, { abstractCrewQuality: 'average' });
  assert.equal(abs.path, 'vehicle-routed-weapon'); assert.equal(abs.certification, 'routing-only', 'routing evidence is never reported as an installation certification');
  const crew = A_.checkAttackSourceReadiness(gunner, gun, { vehicleActor: veh });
  assert.equal(crew.path, 'vehicle-routed-weapon'); assert.equal(crew.certification, 'routing-only');
  assert.ok(![abs.path, crew.path, abs.certification, crew.certification].some((v) => /installation/.test(v)), 'no result claims an installation');
  // look-alike weapon sharing the id of the vehicle-owned Item
  const twin = { ...gun, flags: { swse: {} }, system: {} };
  assert.equal(A_.checkAttackSourceReadiness(gunner, twin, { vehicleActor: veh }).ok, false, 'a look-alike of the vehicle-owned weapon is not routed');
  // a vehicle context that is the firing actor itself, or a gunner that is a vehicle, is not a gunner route
  assert.equal(A_.checkAttackSourceReadiness(veh, gun, { vehicleActor: veh }).ok, false, 'a vehicle cannot be its own gunner');
  const gv = { id: 'veh2', type: 'vehicle', name: 'Other', items: col([]), system: {}, flags: { swse: {} } };
  assert.equal(A_.checkAttackSourceReadiness(gv, gun, { vehicleActor: veh }).ok, false, 'a vehicle-type firing actor is not a gunner');
  // the vehicle does not own the weapon the gunner holds; the weapon is the gunner's own Item and judged by hand readiness
  const own = pistol('g1', { posture: 'STOWED', purpose: null, appendageIds: [], wielded: null }); const g2 = makeActor([own]);
  assert.equal(A_.checkAttackSourceReadiness(g2, own, { vehicleActor: veh }).ok, false, 'naming a vehicle does not exempt a weapon the vehicle does not own');
  // no new permission flag
  for (const flagOpts of [{ vehicleMount: true }, { installed: true }, { operatorAuthorized: true }, { crewAssigned: true }]) assert.equal(A_.checkAttackSourceReadiness(g2, own, flagOpts).ok, false, JSON.stringify(flagOpts));
  ok('R3: vehicle weapons are reported as routing evidence only (no installation or operator certification claimed), look-alikes and self-gunner shapes fail closed, no new permission flag exists');
}

// ------------------------------------------------------------------------------------------------ R4 freshness across async boundaries
{
  const realHooks = globalThis.Hooks;
  const origPreflight = AmmoSystem.preflightAmmunition; const origSpend = AmmoSystem.spendForWorkflow; const origRollback = AmmoSystem.rollbackSpend;
  let rollbacks = 0;
  try {
    // (1) equipment changes after the last pre-spend await: refused before ANY expenditure
    { const w = pistol('r4a'); const a = makeActor([w]);
      AmmoSystem.preflightAmmunition = () => { unready(w); return { ok: true }; };
      zero(); assert.equal(await A_.rollAttack(a, w, opts), null); noEffect(); refusedBy(/checked again after attack preparation/); }
    AmmoSystem.preflightAmmunition = origPreflight;
    // (2) equipment changes while the ammunition is being paid: refused before the dice, the payment is given back
    { const w = pistol('r4b'); const a = makeActor([w]); AmmoSystem.rollbackSpend = async () => { rollbacks += 1; };
      AmmoSystem.spendForWorkflow = async () => { c.ammo += 1; unready(w); return { success: true, spent: true }; };
      zero(); rollbacks = 0; assert.equal(await A_.rollAttack(a, w, opts), null);
      assert.equal(c.rolls, 0, 'no dice after the source stopped being ready'); assert.equal(rollbacks, 1, 'the ammunition payment is rolled back'); refusedBy(/checked again after ammunition payment/); assert.equal(c.chat, 0); }
    // (2b) the narrated entry point
    { const w = pistol('r4c'); const a = makeActor([w]); AmmoSystem.rollbackSpend = async () => { rollbacks += 1; };
      AmmoSystem.spendForWorkflow = async () => { c.ammo += 1; unready(w); return { success: true, spent: true }; };
      zero(); rollbacks = 0; assert.equal(await narrated(a, w), null); assert.equal(c.rolls, 0); assert.equal(rollbacks, 1); }
    AmmoSystem.spendForWorkflow = origSpend; AmmoSystem.rollbackSpend = origRollback;

    // (3) SWSERoll entry points and Full Attack: equipment changes during the pre-roll hook (the dialog / hook boundary)
    const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
    const hookMutating = (fn) => { globalThis.Hooks = { ...realHooks, callAll: (name) => { if (/preAttack|PRE_ATTACK|preRoll/i.test(String(name))) fn(); } }; };
    { const w = pistol('r4d'); const a = makeActor([w]); let fired = 0; hookMutating(() => { fired += 1; unready(w); });
      zero(); assert.equal(await SWSERoll.rollAttack(a, w, { ...opts, skipFP: true }), null); assert.ok(fired >= 1, 'the boundary was crossed'); noEffect(); refusedBy(/checked again after the attack dialog/); }
    { const w = F.readiedWeapon('r4e', { key: 'weapon-blaster-rifle', appendageIds: ['natural-arm-1', 'natural-arm-2'], wielded: 'two-handed' }); const a = makeActor([w]); let fired = 0;
      hookMutating(() => { fired += 1; unready(w); });
      zero(); assert.equal(await SWSERoll.rollAutofire(a, w, { targets: [target()], skipFP: true }), null); assert.ok(fired >= 1); assert.equal(c.rolls, 0); assert.equal(c.ammo, 0); }
    { // Full Attack: the FINALIZED configuration is gated, not only the overrides
      const p = pistol('r4f'); const o = F.readiedWeapon('r4g', { key: F.PISTOL_KEY, appendageIds: ['natural-arm-2'], wielded: 'one-handed' }); const a = makeActor([p, o]); a.system.forcePoints = { value: 0, max: 0 };
      globalThis.Hooks = realHooks; zero();
      const base = await SWSERoll.rollFullAttack(a, { primaryWeapon: p, offhandWeapon: o, skipDialog: true, target: target(), skipFP: true });
      assert.ok(base && base.results.length >= 2, `baseline full attack rolls every finalized attack (${base?.results?.length})`);
      let fired = 0; hookMutating(() => { fired += 1; unready(o); });
      zero(); a.items.forEach((i) => { if (i === o) Object.assign(i.system, REC('READIED', 'wield', ['natural-arm-2'])); });
      assert.equal(await SWSERoll.rollFullAttack(a, { primaryWeapon: p, offhandWeapon: o, skipDialog: true, target: target() }), null, 'a finalized attack weapon that stopped being ready refuses the whole full attack');
      assert.ok(fired >= 1); assert.equal(c.rolls, 0, 'no attack was rolled'); refusedBy(/checked again after the Full Attack configuration/);
      // in-loop: the second weapon stops being ready after the first attack is rolled
      globalThis.Hooks = realHooks; Object.assign(o.system, REC('READIED', 'wield', ['natural-arm-2']));
      const origSafe = SWSERoll._safeRoll; let n = 0; SWSERoll._safeRoll = async (...args) => { const r = await origSafe.apply(SWSERoll, args); n += 1; if (n === 1) unready(o); return r; };
      zero(); const partial = await SWSERoll.rollFullAttack(a, { primaryWeapon: p, offhandWeapon: o, skipDialog: true, target: target(), skipFP: true });
      SWSERoll._safeRoll = origSafe;
      assert.equal(partial.results.length, 1, 'the loop stops at the first attack whose source is no longer ready; the one already rolled stands'); refusedBy(/checked again after attack 2/);
    }
  } finally { globalThis.Hooks = realHooks; AmmoSystem.preflightAmmunition = origPreflight; AmmoSystem.spendForWorkflow = origSpend; AmmoSystem.rollbackSpend = origRollback; }
  ok('R4: equipment changed during a dialog / hook / payment boundary is caught before the next expenditure or roll (rollAttack, narrated, SWSERoll.rollAttack / rollAutofire / rollFullAttack, loop), with payments given back');
}

// ------------------------------------------------------------------------------------------------ R5 FireStateStore persistence truthfulness
const setPath = (obj, path, value) => { const parts = path.split('.'); let node = obj; for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {}); const last = parts.at(-1); if (last.startsWith('-=')) delete node[last.slice(2)]; else node[last] = JSON.parse(JSON.stringify(value)); };
const blade = (id) => F.readiedWeapon(id, { key: 'weapon-vibroblade', wielded: 'one-handed', appendageIds: ['natural-arm-1'] });
{
  const warn = console.warn; console.warn = () => {};
  const origUpdate = ActorEngine.updateOwnedItems;
  try {
    // persisted vs unchanged vs failed
    ActorEngine.updateOwnedItems = async (actor, updates) => { for (const u of updates) { const item = actor.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(item, k, v); } return updates; };
    { const w = blade('s1'); const a = makeActor([w]);
      const first = await FS.setStockState(a, w, 'extended', { free: true }); assert.equal(first.ok, true); assert.equal(first.persistence, 'persisted');
      const again = await FS.setStockState(a, w, 'extended', { free: true }); assert.equal(again.ok, true); assert.equal(again.persistence, 'unchanged', 'an already-stored state is unchanged, not a failure and not a write'); }
    ActorEngine.updateOwnedItems = async () => { throw new Error('write rejected'); };
    { const w = blade('s2'); const a = makeActor([w]); const before = JSON.stringify(w.flags.swse.fireState ?? null);
      const r = await FS.setStockState(a, w, 'extended', { free: true });
      assert.equal(r.ok, false); assert.equal(r.reason, 'persist-failed'); assert.equal(r.persistence, 'failed'); assert.notEqual(r.state?.stock, 'extended', 'a failed write never reports the requested state');
      assert.equal(JSON.stringify(w.flags.swse.fireState ?? null), before); }
    // every best-effort setter reports the failure
    { const w = F.readiedWeapon('s3', { key: 'weapon-micro-grenade-launcher', wielded: 'one-handed', appendageIds: ['natural-arm-1'] }); const a = makeActor([w]);
      const m = await FS.setMounted(a, w, true); assert.equal(m.ok, false); assert.equal(m.reason, 'persist-failed');
      const l = await FS.setLoadedPayload(a, w, 'weapon-frag-grenade'); assert.equal(l.ok, false); assert.equal(l.reason, 'persist-failed'); }
    // clearReload
    { const w = blade('s4'); w.flags.swse.fireState = { v: 1, wielded: 'one-handed', needsReload: true }; const a = makeActor([w]);
      const r = await FS.clearReload(a, w); assert.equal(r.outcome, 'failed'); assert.equal(r.persisted, false); assert.equal(w.flags.swse.fireState.needsReload, true, 'the awaiting-reload fact is still stored');
      assert.equal(await FS.clearReload(a, blade('s4b')), null, 'nothing awaiting a reload: null'); }
    // action expenditure before a failed write is given back
    { let rb = 0; ActionEconomyConsumption.spend = async () => { c.econ += 1; return { allowed: true, committed: true, rollback: async () => { rb += 1; } }; };
      const w = blade('s5'); const a = makeActor([w]);
      const r = await FS.setStockState(a, w, 'extended'); assert.equal(r.ok, false); assert.equal(r.reason, 'persist-failed'); assert.equal(rb, 1, 'the Move action paid for a stock change that was not recorded is rolled back');
      ActionEconomyConsumption.spend = async () => { c.econ += 1; return { allowed: true, committed: false, rollback: async () => {} }; }; }
    // post-attack recording is intentionally best-effort but truthful
    { const w = F.readiedWeapon('s6', { key: 'weapon-black-powder-pistol', wielded: 'one-handed', appendageIds: ['natural-arm-1'] }); const a = makeActor([w]);
      const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js'); const runtime = rt.resolveAttackWeaponRuntime(w, {});
      const r = await FS.commitFired(a, w, runtime, {}, []);
      assert.equal(r.bestEffort, true); assert.equal(r.outcome, 'failed'); assert.equal(r.persisted, false); assert.ok(!w.flags.swse.fireState?.needsReload, 'the Item does not claim the shot was recorded');
      zero(); const notePre = notes.error.length;
      assert.ok(await A_.rollAttack(a, w, opts), 'the attack itself still resolved (best-effort tolerance is established behavior)'); assert.ok(notes.error.length === notePre); }
  } finally { console.warn = warn; ActorEngine.updateOwnedItems = origUpdate; }
  ok('R5: persistence outcomes are persisted / unchanged / failed; failed writes are never reported as success, spent actions are given back, post-attack recording stays best-effort but truthful');
}

console.log(`\nE4-C1 WP5-C2 attack integrity: ${n} checks passed.`);
