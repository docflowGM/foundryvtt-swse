import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-D-B1 -- mounting and host relationships (canMountOnRifle, canUseStandalone, rifleMountable, mountableOnMinimumWeaponSize, mountMechanicsDC, mountTimeMinutes, requiresGrenadeLauncher).
// Every weapon below is a canonical weapon under a deliberately WRONG name/Item projection; every ability that matters carries a
// canonical identity under a deliberately WRONG display name, so a pass cannot come from a name.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.window = globalThis.window ?? globalThis;
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { FireStateStore: FireStateStoreRef } = await import('/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js');
const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { resolveDamageComposition, buildDamageFormula } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { rollAttack, computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { resolveDamageDisposition } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js');
const ser = await import('/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js');
const { buildCensus, OUT_JSON } = await import('../tools/census-weapon-fire-state-area-selectors.mjs');
const { registry, registryData } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { installReadinessEnvironment, readyAllDirected } = await import('./helpers/ready-weapon-fixture.mjs');
await installReadinessEnvironment();

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
let uid = 0;
const FOCUS_ID = 'feat::saga-edition-core-rulebook::p89::weapon-focus';
const mk = (type, name, extra = {}) => ({ id: `i${++uid}`, type, name, flags: extra.flags ?? {}, system: extra.system ?? {} });
const focus = (choice, { name = 'Zxq Renamed Display Label', modifiers = true } = {}) => mk('feat', name, {
  flags: { swse: { canonicalFeat: { identityKey: FOCUS_ID } } },
  system: { selectedChoice: choice, ...(modifiers ? { abilityMeta: { modifiers: [{ target: 'attack.bonus', value: 1, type: 'untyped', enabled: true, predicates: ['attack.weapon-matches-selected-choice'] }] } } : {}) },
});
const specTalent = (choice, name = 'Qwv Another Label') => mk('talent', name, { flags: { swse: { id: 'swse.talent.weapon_specialization' } }, system: { selectedChoice: choice } });
const specFeat = (choice, name = 'Zxq Spec') => mk('feat', name, { flags: { swse: { canonicalFeat: { identityKey: 'feat::saga-edition-core-rulebook::p91::weapon-specialization' } } }, system: { selectedChoice: choice } });
const optionFeat = (name, optionId) => mk('feat', name, { system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: optionId }] } } });
const PROF = ['Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)', 'Weapon Proficiency (Simple Weapons)', 'Weapon Proficiency (Heavy Weapons)', 'Weapon Proficiency (Advanced Melee Weapons)'].map((n) => mk('feat', n));
const canon = (k, system = {}, extra = {}) => ({ id: `w${++uid}-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', damageType: 'sonic', equipped: true, ...system }, ...extra });
const legacy = (system = {}, name = 'Homebrew') => ({ id: `hb${++uid}`, name, type: 'weapon', flags: {}, system: { weaponCategory: 'ranged', damage: '2d6', damageType: 'energy', equipped: true, proficient: true, ...system } });
const makeActor = (o = {}) => readyAllDirected(makeActorRaw(o));
const makeActorRaw = ({ feats = [], items = [], level = 6, type = 'character', size = 'medium' } = {}) => {
  const actor = {
    id: 'a1', name: 'Tester', type, flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col([...PROF, ...feats, ...items]),
    system: { species: 'Human', bab: 6, level, size, attributes: { str: ab(0), dex: ab(0), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols', 'rifles', 'simple', 'heavy-weapons', 'advanced-melee'] },
  };
  for (const w of items) w.actor = actor;
  return actor;
};
const target = (id = 't1') => ({ id, name: `Dummy ${id}`, type: 'npc', flags: { swse: {} }, effects: [], items: col([]), getFlag() { return undefined; }, system: { size: 'medium', hp: { value: 30, max: 30 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } } } });
const setPath = (obj, path, value) => { const keys = path.split('.'); let o = obj; for (const k of keys.slice(0, -1)) o = (o[k] ??= {}); o[keys.at(-1)] = value; };
const total = async (actor, weapon, ctx = {}) => (await computeFinalAttackComposition(actor, weapon, ctx)).atkBonus;

// harness: roll stubs, owned-item writes, action economy, combat clock
const spent = { ammo: 0, actions: [], rolls: 0 };
const origs = { RE: RollEngine.safeRoll, post: SWSEChat.postRoll, spendAmmo: AmmoSystem.spendForWorkflow, upd: ActorEngine.updateOwnedItems, econ: ActionEconomyConsumption.spend, consume: AmmoSystem.consumeAmmunition, track: AmmoSystem.isTrackingEnabled };
let posted = [];
function installHarness({ econAllowed = true } = {}) {
  RollEngine.safeRoll = async (f) => { spent.rolls += 1; return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => { spent.ammo += 1; return { success: true, spent: false }; };
  ActorEngine.updateOwnedItems = async (actor, updates) => { for (const u of updates) { const item = actor.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(item, k, v); } };
  ActionEconomyConsumption.spend = async (actor, type) => { if (!econAllowed) return { allowed: false, permitted: false, rollback: async () => {} }; spent.actions.push(type); return { allowed: true, committed: true, rollback: async () => { spent.actions.pop(); } }; };
}
const restoreHarness = () => { RollEngine.safeRoll = origs.RE; SWSEChat.postRoll = origs.post; AmmoSystem.spendForWorkflow = origs.spendAmmo; ActorEngine.updateOwnedItems = origs.upd; ActionEconomyConsumption.spend = origs.econ; AmmoSystem.consumeAmmunition = origs.consume; AmmoSystem.isTrackingEnabled = origs.track; globalThis.game = undefined; };
const setRound = (round) => { globalThis.game = round === null ? { combat: null, user: { targets: { first: () => null } } } : { combat: { id: 'c1', started: true, round, combatants: [{ actor: { id: 'a1' } }] }, user: { targets: { first: () => null } } }; };
const reset = () => { spent.ammo = 0; spent.actions.length = 0; spent.rolls = 0; posted = []; notes.warn.length = 0; notes.error.length = 0; };
const attack = (actor, weapon, extra = {}) => rollAttack(actor, weapon, { target: target(), suppressChat: false, ...extra });


// ---- shared pieces ---------------------------------------------------------------------------------------------------------------------
const { evaluateRegisteredCondition, evaluateStructuralCondition, resolveTargetRequirements, evaluateConditionalDamage } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/special-mechanics.js');
const { resolveRangeEnvironment, canonicalDamageRangePenalty, resolveCanonicalRange } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/canonical-range.js');
const { resolveAutofireArea, resolveDetonation, validateDetonationTimer } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/area-shape.js');
const { markRerollWeaponDice } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const manifestTool = await import('../tools/census-weapon-phase-5d-i-a-inputs.mjs');
const packDoc = (pack, name, rename = 'Qzx Renamed Label') => {
  const d = fs.readFileSync(pack, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((x) => x.name === name);
  return { ...JSON.parse(JSON.stringify(d)), id: `p${++uid}`, name: rename };
};
const corpus = JSON.parse(fs.readFileSync('data/canonical/weapons.json', 'utf8'));
const rec = (k) => corpus.identities.find((i) => i.identityKey === k);
const withAmmo = (k, max = 100, system = {}) => canon(k, { ammunition: { current: max, max }, ...system });
const form = (identityKey, profileId = 'primary', extra = {}) => ({ weaponForm: { identityKey, profileId, ...extra } });
const dmg = (A, w, ctx = {}) => resolveDamageComposition(A, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId: 'primary' }, ...ctx });
const mods = (A, w, extra = {}) => CombatOptionResolver.collectAttackModifiers(A, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId: 'primary' }, ...extra });
const fx = (f) => Number(Function(`return ${String(f).replace(/^\s*1d20/, '0')}`)());
const formulas = [];
const origSafe = { RE: RollEngine.safeRoll, S: SWSERoll._safeRoll, W: globalThis.SWSE };
const stubRolls = () => {
  const stub = async (f) => { formulas.push(f); return { total: 16, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  RollEngine.safeRoll = stub; SWSERoll._safeRoll = stub; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stub } };
};
const unstubRolls = () => { RollEngine.safeRoll = origSafe.RE; SWSERoll._safeRoll = origSafe.S; globalThis.SWSE = origSafe.W; };
const bonusOf = async (A, w, extra = {}) => { reset(); formulas.length = 0; const r = await attack(A, w, extra); return r ? fx(formulas[0]) : null; };
const wfOf = () => posted.find((p) => p.context?.workflowContext)?.context.workflowContext;
const { WeaponAuthorityRegistry: WAR } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const registryClone = (mutate) => { const c = JSON.parse(JSON.stringify(registryData)); mutate(c); return new WAR(c); };

const reinstall = (opts) => { restoreHarness(); installHarness(opts); setRound(null); stubRolls(); AmmoSystem.consumeAmmunition = async (a, w, n) => ({ success: true, newAmmo: 50 - n, previousAmmo: 50 }); };
installHarness(); setRound(null); stubRolls();
AmmoSystem.consumeAmmunition = async (a, w, n) => ({ success: true, newAmmo: 50 - n, previousAmmo: 50 });
// =====================================================================================================================================
// Phase 5D-I-D-F -- ammunition / power source / reload: VERIFY the existing consumers first, then the new capabilities.
// Every weapon below is the canonical PRODUCTION projection (packs/weapons*.db) under a deliberately wrong Item name.
// =====================================================================================================================================
const idx = registryData.productionIdIndex ?? {};
const prod = {};
for (const f of fs.readdirSync('packs').filter((n) => n.endsWith('.db') && /^weapons/.test(n))) {
  for (const l of fs.readFileSync(`packs/${f}`, 'utf8').split('\n').filter(Boolean)) { const d = JSON.parse(l); prod[d._id] = d; }
}
const prodIdOf = Object.fromEntries(Object.entries(idx).map(([pid, k]) => [k, pid]));
const owned = (identityKey, system = {}) => {
  const d = JSON.parse(JSON.stringify(prod[prodIdOf[identityKey]]));
  return { ...d, id: `o${++uid}`, _id: undefined, name: 'Renamed Thing', system: { ...d.system, equipped: true, ...system } };
};
const reg = (k) => registryData.identities.find((i) => i.identityKey === k);
const swiftCount = () => spent.actions.filter((a) => a === 'swift').length;
const useRealAmmo = () => { AmmoSystem.spendForWorkflow = origs.spendAmmo; AmmoSystem.isTrackingEnabled = () => true; AmmoSystem.consumeAmmunition = origs.consume; };
const noRealAmmo = () => { AmmoSystem.isTrackingEnabled = origs.track; };
const ammoOf = (w) => w.system.ammunition.current;
const { mountRuleOf, hostEligibility } = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/host-mount.js');
// the coordinator-owned grip (`wielded`) comes from the readiness fixture and is not part of the operating state these assertions are about (E4-C1 WP5)
const readState = (w) => { const f = w.flags?.swse?.fireState; if (!f) return null; const { wielded, ...rest } = f; return Object.keys(rest).every((k) => k === 'v') ? null : rest; };
const rolling = (total, calls = []) => async (a, skill, opts) => { calls.push({ skill, opts }); return total === null ? null : { total }; };
const code = async (fn) => { try { await fn(); return null; } catch (e) { return e.code ?? e.message; } };

try {
// ---- A. the structured mount rule of each production weapon ------------------------------------------------------------------------
{
  const micro = FireStateStoreRef && rt.shapeOfWeapon?.(owned('weapon-micro-grenade-launcher'), {});
  const m = micro.mountRule;
  assert.equal(m.hostGroup, 'rifles'); assert.equal(m.standalone, true); assert.equal(m.configurationId, 'rifle-mounted');
  assert.deepEqual({ ...m.check }, { skill: 'mechanics', dc: 15, timeMinutes: 1 });
  const gl = rt.shapeOfWeapon(owned('weapon-grenade-launcher'), {}).mountRule;
  assert.equal(gl.hostGroup, 'rifles'); assert.deepEqual({ ...gl.check }, { skill: 'mechanics', dc: 15, timeMinutes: 1 }, 'the Grenade Launcher record now carries its published DC 15 Mechanics / 1 minute (builder amendment)'); assert.equal(gl.standalone, true);
  const laser = rt.shapeOfWeapon(owned('weapon-targeting-laser'), {}).mountRule;
  assert.equal(laser.minHostSize, 'Medium'); assert.equal(laser.hostGroup, null); assert.equal(laser.check, null);
  assert.equal(rt.shapeOfWeapon(owned('weapon-blaster-pistol'), {}).mountRule, null, 'a weapon that declares no mount rule has none');
  ok('mount rules are read from structured operation / configuration fields of the production records (name-independent)');
}
// ---- B. host eligibility (pure) -------------------------------------------------------------------------------------------------------
{
  const rule = mountRuleOf({ canMountOnRifle: true }, []);
  const host = (o = {}) => ({ source: 'canonical', groupKey: 'rifles', size: 'Medium', mountedHostId: null, ...o });
  assert.equal(hostEligibility(rule, host()).ok, true);
  assert.equal(hostEligibility(rule, host({ groupKey: 'pistols' })).reason, 'host-not-rifles');
  assert.equal(hostEligibility(rule, host({ source: 'legacy' })).reason, 'host-not-canonical');
  assert.equal(hostEligibility(rule, host({ mountedHostId: 'x' })).reason, 'host-is-itself-mounted');
  assert.equal(hostEligibility(rule, host(), { sameItem: true }).reason, 'host-is-the-weapon');
  assert.equal(hostEligibility(null, host()).reason, 'not-mountable');
  const laser = mountRuleOf({ mountableOnMinimumWeaponSize: 'Medium' }, []);
  for (const [size, okSize] of [['Tiny', false], ['Small', false], ['Medium', true], ['Large', true], ['Huge', true]]) assert.equal(hostEligibility(laser, host({ groupKey: 'pistols', size })).ok, okSize, size);
  assert.equal(mountRuleOf({ mountableOnMinimumWeaponSize: 'Gigantic' }, []), null, 'an unknown size declares no rule');
  ok('host eligibility: rifles group, canonical host, not itself, not already mounted, minimum size');
}
// ---- C. mount / unmount through the production store ------------------------------------------------------------------------------
{
  reinstall();
  const micro = owned('weapon-micro-grenade-launcher'), rifle = owned('weapon-blaster-rifle'), pistol = owned('weapon-blaster-pistol'), hb = legacy();
  const A = makeActor({ items: [micro, rifle, pistol, hb] });
  const S = FireStateStoreRef;
  // invalid hosts roll nothing and write nothing
  for (const [h, why] of [[pistol, 'host-not-rifles'], [hb, 'host-not-canonical'], [micro, 'host-is-the-weapon'], [owned('weapon-blaster-rifle'), 'host-not-owned']]) {
    const calls = []; reset();
    const r = await S.mountOnHost(A, micro, h, { skillRoller: rolling(30, calls) });
    assert.equal(r.ok, false); assert.equal(r.reason, why); assert.equal(calls.length, 0, `${why}: no check is rolled`); assert.equal(readState(micro), null, `${why}: nothing written`);
  }
  // cancelled / failed check: no mutation
  for (const [total, why] of [[null, 'check-cancelled'], [14, 'check-failed']]) {
    const calls = []; reset();
    const r = await S.mountOnHost(A, micro, rifle, { skillRoller: rolling(total, calls) });
    assert.equal(r.reason, why); assert.equal(calls.length, 1); assert.equal(calls[0].skill, 'mechanics'); assert.equal(readState(micro), null, `${why}: no partial mutation`);
    if (why === 'check-failed') assert.equal(r.check.dc, 15);
  }
  // success: Mechanics DC 15 met -> mounted on THAT host, rifle-mounted configuration, time reported (not simulated), no action spent
  reset();
  const calls = [];
  const ok1 = await S.mountOnHost(A, micro, rifle, { skillRoller: rolling(15, calls) });
  assert.equal(ok1.ok, true); assert.equal(ok1.check.success, true); assert.equal(ok1.timeMinutes, 1);
  assert.equal(readState(micro).mountedHostId, rifle.id); assert.equal(readState(micro).configurationId, 'rifle-mounted');
  assert.equal(spent.actions.length, 0, 'the record states minutes, not an action: none is spent');
  // idempotent: already on this host -> no second check
  const again = await S.mountOnHost(A, micro, rifle, { skillRoller: rolling(1, calls) });
  assert.equal(again.ok, true); assert.equal(again.alreadyMounted, true); assert.equal(calls.length, 1);
  // a host that already carries a mounted weapon is not itself a host
  const second = owned('weapon-micro-grenade-launcher'); A.items.push(second); second.actor = A;
  const rifleFlags = rifle.flags; rifle.flags = { ...rifleFlags, swse: { ...rifleFlags.swse, fireState: { v: 1, mountedHostId: 'other' } } };
  assert.equal((await S.mountOnHost(A, second, rifle, { skillRoller: rolling(30) })).reason, 'host-is-itself-mounted');
  rifle.flags = rifleFlags;
  // the mount configuration is entered only through the host flow; leaving it detaches
  reset();
  assert.equal((await S.setConfiguration(A, second, 'rifle-mounted')).reason, 'mount-requires-host'); assert.equal(readState(second), null);
  const back = await S.setConfiguration(A, micro, 'standalone');
  assert.equal(back.ok, true); assert.equal(readState(micro).mountedHostId, null); assert.equal(readState(micro).configurationId, 'standalone');
  // unmount
  await S.mountOnHost(A, micro, rifle, { skillRoller: rolling(20) });
  assert.equal(readState(micro).mountedHostId, rifle.id);
  const un = await S.unmountFromHost(A, micro); assert.equal(un.ok, true); assert.equal(readState(micro).mountedHostId, null);
  assert.equal((await S.unmountFromHost(A, pistol)).reason, 'not-mountable');
  ok('mount/unmount: invalid hosts roll and write nothing; cancelled / failed Mechanics check writes nothing; success records the host + configuration; idempotent; mount config only via the host flow');
}
{
  reinstall();
  const micro = owned('weapon-micro-grenade-launcher'), rifle = owned('weapon-blaster-rifle'), pistol = owned('weapon-blaster-pistol'), hb = legacy();
  const A = makeActor({ items: [micro, rifle, pistol, hb] });
  assert.equal(FireStateStoreRef.hasMountRule(micro), true); assert.equal(FireStateStoreRef.hasMountRule(pistol), false); assert.equal(FireStateStoreRef.hasMountRule(hb), false);
  assert.deepEqual(FireStateStoreRef.mountHostOptions(A, micro).map((o) => o.id), [rifle.id], 'only eligible canonical hosts are offered (not the pistol, not the homebrew, not itself)');
  assert.deepEqual(FireStateStoreRef.mountHostOptions(A, pistol), []);
  ok('host picker offers only eligible canonical hosts; non-mountable weapons offer none');
}
// ---- C2. mounted-form legality in the ATTACK path (not only the setter) ---------------------------------------------------------------
{
  reinstall();
  const mkL = () => { const micro = owned('weapon-micro-grenade-launcher'), rifle = owned('weapon-blaster-rifle'), pistol = owned('weapon-blaster-pistol'); return [makeActor({ items: [micro, rifle, pistol] }), micro, rifle, pistol]; };
  const viaOption = { configurationId: 'rifle-mounted' };
  for (const [label, opt] of [['attack option', viaOption]]) {
    let [A, micro, rifle] = mkL(); await FireStateStoreRef.setLoadedPayload(A, micro, 'weapon-frag-grenade');
    reset(); assert.equal(await attack(A, micro, opt), null, `${label}: mounted form with no recorded host is refused`); assert.equal(spent.rolls + spent.ammo + spent.actions.length, 0, `${label}: nothing spent`);
    assert.ok(FireStateStoreRef.previewReadiness(A, micro, rt.resolveAttackWeaponRuntime(micro, opt), opt).blockers.some((b) => b.reason === 'mount-host-required'));
    // standalone use stays available (explicit and default)
    reset(); assert.ok(await attack(A, micro, { configurationId: 'standalone' }), `${label}: standalone is legal`);
    reset(); assert.ok(await attack(A, micro, {}), 'default (standalone) is legal');
    // recorded eligible host: allowed
    await FireStateStoreRef.mountOnHost(A, micro, rifle, { skillRoller: rolling(20) });
    reset(); assert.ok(await attack(A, micro, opt), `${label}: recorded eligible host -> allowed`);
    reset(); assert.ok(await attack(A, micro, {}), 'the owned mounted configuration applies by default and is legal');
    // the recorded host is removed
    A.items = col(A.items.filter((i) => i.id !== rifle.id));
    reset(); assert.equal(await attack(A, micro, opt), null, `${label}: recorded host removed -> refused`); assert.equal(spent.rolls + spent.ammo + spent.actions.length, 0);
    reset(); assert.equal(await attack(A, micro, {}), null, 'and the owned mounted state is refused too');
    reset(); assert.ok(await attack(A, micro, { configurationId: 'standalone' }), 'standalone remains available after the host is gone');
  }
  // a recorded host that has become ineligible (forged / stale state: points at a pistol) is refused
  { const [A, micro, , pistol] = mkL(); await FireStateStoreRef.setLoadedPayload(A, micro, 'weapon-frag-grenade');
    micro.flags = { ...micro.flags, swse: { ...micro.flags.swse, fireState: { v: 1, mountedHostId: pistol.id, configurationId: 'rifle-mounted' } } };
    reset(); assert.equal(await attack(A, micro, viaOption), null, 'a recorded host that is not a rifle cannot satisfy the mounted form');
    assert.ok(FireStateStoreRef.previewReadiness(A, micro, rt.resolveAttackWeaponRuntime(micro, viaOption), viaOption).blockers.some((b) => b.reason === 'mount-host-ineligible')); }
  ok('mounted attack form: refused with no recorded host / removed host / ineligible host (explicit attack option and owned state), before any cost; standalone and valid mounted use stay legal');
}
// ---- C3. ownership of BOTH participants ---------------------------------------------------------------------------------------------
{
  reinstall();
  const micro = owned('weapon-micro-grenade-launcher'), rifle = owned('weapon-blaster-rifle');
  const A = makeActor({ items: [rifle] }); const B = makeActor({ items: [micro] }); B.id = 'a2';
  const calls = [];
  const r = await FireStateStoreRef.mountOnHost(A, micro, rifle, { skillRoller: rolling(30, calls) });
  assert.equal(r.reason, 'weapon-not-owned'); assert.equal(calls.length, 0, 'no check is rolled'); assert.equal(readState(micro), null); assert.equal(readState(rifle), null);
  const r2 = await FireStateStoreRef.mountOnHost(B, micro, rifle, { skillRoller: rolling(30, calls) });
  assert.equal(r2.reason, 'host-not-owned'); assert.equal(calls.length, 0); assert.equal(readState(micro), null);
  ok('cross-actor mount (host on A, attachment on B, either way) is refused before any roll or write');
}
// ---- C4. unmount ownership and persistence failure ------------------------------------------------------------------------------------
{
  reinstall();
  const micro = owned('weapon-micro-grenade-launcher'), rifle = owned('weapon-blaster-rifle');
  const A = makeActor({ items: [micro, rifle] }); const B = makeActor({ items: [] }); B.id = 'a2';
  await FireStateStoreRef.mountOnHost(A, micro, rifle, { skillRoller: rolling(20) });
  assert.equal(readState(micro).mountedHostId, rifle.id);
  // another actor cannot unmount it -- directly or through setConfiguration
  assert.equal((await FireStateStoreRef.unmountFromHost(B, micro)).reason, 'weapon-not-owned'); assert.equal(readState(micro).mountedHostId, rifle.id);
  assert.equal((await FireStateStoreRef.setConfiguration(B, micro, 'standalone')).reason, 'weapon-not-owned'); assert.equal(readState(micro).mountedHostId, rifle.id);
  // a rejected ActorEngine write: mount and unmount report failure and leave the local state untouched
  const realUpd = ActorEngine.updateOwnedItems; ActorEngine.updateOwnedItems = async () => { throw new Error('write rejected'); };
  const warn = console.warn; console.warn = () => {};
  try {
    assert.equal((await FireStateStoreRef.unmountFromHost(A, micro)).reason, 'persist-failed'); assert.equal(readState(micro).mountedHostId, rifle.id, 'not falsely unmounted');
    const fresh = owned('weapon-micro-grenade-launcher'); A.items.push(fresh); fresh.actor = A;
    const r = await FireStateStoreRef.mountOnHost(A, fresh, rifle, { skillRoller: rolling(20) });
    assert.equal(r.ok, false); assert.equal(r.reason, 'persist-failed'); assert.equal(readState(fresh), null, 'not falsely mounted');
    // ordinary combat-state writes keep their best-effort behaviour
    assert.equal(FireStateStoreRef.setWielding, undefined, 'the grip is coordinator-owned: FireStateStore has no wielding writer (WP5)');
    assert.equal((await FireStateStoreRef.setConfiguration(A, fresh, 'standalone')).ok, true);
  } finally { ActorEngine.updateOwnedItems = realUpd; console.warn = warn; }
  assert.equal((await FireStateStoreRef.unmountFromHost(A, micro)).ok, true); assert.equal(readState(micro).mountedHostId, null);
  ok('unmount (direct and via setConfiguration) requires the owning actor; a rejected write is reported as persist-failed with no falsely confirmed state; ordinary combat-state writes stay best-effort');
}
// ---- D. a mounted weapon whose host is gone is not fireable as mounted; unconfirmed is never a block -----------------------------
{
  reinstall();
  const micro = owned('weapon-micro-grenade-launcher'), rifle = owned('weapon-blaster-rifle');
  const A = makeActor({ items: [micro, rifle] });
  await FireStateStoreRef.mountOnHost(A, micro, rifle, { skillRoller: rolling(20) });
  const rtm = rt.resolveAttackWeaponRuntime(micro, { configurationId: 'rifle-mounted' });
  assert.equal(FireStateStoreRef.previewReadiness(A, micro, rtm, {}).blockers.some((b) => b.reason === 'mount-host-missing'), false);
  A.items = col(A.items.filter((i) => i.id !== rifle.id));
  const pre = FireStateStoreRef.previewReadiness(A, micro, rtm, {});
  assert.ok(pre.blockers.some((b) => b.reason === 'mount-host-missing'), 'the recorded host no longer exists'); assert.equal(pre.ready, false);
  const fresh = owned('weapon-micro-grenade-launcher'); const B = makeActor({ items: [fresh] });
  assert.equal(FireStateStoreRef.previewReadiness(B, fresh, rt.resolveAttackWeaponRuntime(fresh, {}), {}).blockers.length, 0, 'never mounted: no block (unknown is not false)');
  ok('a recorded host that no longer exists blocks; a never-mounted weapon is never blocked');
}
// ---- E. Targeting Laser (minimum host size) and Grenade Launcher (record states no DC) -------------------------------------------
{
  reinstall();
  const laser = owned('weapon-targeting-laser'), small = owned('lightsaber-chassis-short'), medium = owned('weapon-blaster-rifle'), gl = owned('weapon-grenade-launcher');
  const A = makeActor({ items: [laser, small, medium, gl] });
  const sizeOf = (w) => rt.shapeOfWeapon(w, {}).size;
  assert.equal(sizeOf(medium), 'Medium'); assert.notEqual(sizeOf(small), 'Medium');
  const calls = [];
  const bad = await FireStateStoreRef.mountOnHost(A, laser, small, { skillRoller: rolling(30, calls) });
  assert.ok(['host-too-small'].includes(bad.reason), bad.reason); assert.equal(readState(laser), null);
  const good = await FireStateStoreRef.mountOnHost(A, laser, medium, { skillRoller: rolling(30, calls) });
  assert.equal(good.ok, true); assert.equal(good.check, null); assert.equal(calls.length, 0, 'the laser record states no check'); assert.equal(readState(laser).mountedHostId, medium.id);
  const glCalls = [];
  for (const [total, why] of [[null, 'check-cancelled'], [14, 'check-failed']]) { const r = await FireStateStoreRef.mountOnHost(A, gl, medium, { skillRoller: rolling(total, glCalls) }); assert.equal(r.reason, why); assert.equal(readState(gl), null, `${why}: the Grenade Launcher does not mount`); }
  const g = await FireStateStoreRef.mountOnHost(A, gl, medium, { skillRoller: rolling(15, glCalls) });
  assert.equal(g.ok, true); assert.equal(g.check.dc, 15); assert.equal(g.timeMinutes, 1); assert.equal(glCalls.length, 3); assert.equal(glCalls[0].skill, 'mechanics'); assert.equal(readState(gl).mountedHostId, medium.id);
  ok('Targeting Laser needs a Medium or larger host; the Grenade Launcher mounts on a rifle only on the published DC 15 Mechanics check (cancel / fail write nothing)');
}
// ---- F. Electronet: fired only from a grenade launcher ------------------------------------------------------------------------------
{
  reinstall();
  const L = (launcher, k) => rt.resolveCanonicalDamage(launcher, { weaponForm: { identityKey: launcher.flags.swse.canonicalWeapon.identityKey, profileId: 'primary', loadedIdentityKey: k } });
  const gl = owned('weapon-grenade-launcher'), micro = owned('weapon-micro-grenade-launcher'), pistol = owned('weapon-blaster-pistol'), net = owned('weapon-electronet');
  const viaGl = L(gl, 'weapon-electronet');
  assert.equal(viaGl.delegatedFrom.payload, 'weapon-electronet'); assert.ok(viaGl.areaShape);
  assert.equal(await code(() => L(micro, 'weapon-electronet')), 'payload-not-accepted', 'a micro launcher is not a grenade launcher');
  assert.equal(L(pistol, 'weapon-electronet').delegatedFrom, undefined, 'a non-launcher never delegates (existing behavior)');
  // the grenade path is unchanged
  assert.equal(L(gl, 'weapon-frag-grenade').delegatedFrom.payload, 'weapon-frag-grenade');
  assert.equal(await code(() => L(gl, 'weapon-thermal-detonator')), 'payload-not-accepted');
  // attacked with directly it is refused BEFORE any roll or cost; the delegated launcher attack remains the legitimate path
  const A = makeActor({ items: [net, gl] }); reset();
  assert.equal(await attack(A, net), null, 'a direct electronet attack is refused'); assert.equal(spent.rolls + spent.ammo + spent.actions.length, 0, 'no roll, ammunition or action cost');
  assert.ok(FireStateStoreRef.previewReadiness(A, net, rt.resolveAttackWeaponRuntime(net, {}), {}).blockers.some((b) => b.reason === 'requires-grenade-launcher'));
  await FireStateStoreRef.setLoadedPayload(A, gl, 'weapon-electronet'); reset();
  assert.ok(await attack(A, gl), 'the launcher with the electronet loaded attacks');
  ok('Electronet is accepted by a grenade launcher (declaration, not a family guess), refused by a micro launcher, ignored by a non-launcher; a direct attack is refused before any cost, the loaded launcher attacks; the grenade path is unchanged');
}
// ---- G. attack, damage and ammo math unchanged by mounting ------------------------------------------------------------------------
{
  reinstall();
  const micro = owned('weapon-micro-grenade-launcher'), rifle = owned('weapon-blaster-rifle');
  const A = makeActor({ items: [micro, rifle] });
  const before = await bonusOf(A, micro, { loadedIdentityKey: 'weapon-frag-grenade' });
  const dBefore = rt.resolveCanonicalDamage(micro, { weaponForm: { identityKey: 'weapon-micro-grenade-launcher', profileId: 'primary', loadedIdentityKey: 'weapon-frag-grenade' } }).base;
  await FireStateStoreRef.mountOnHost(A, micro, rifle, { skillRoller: rolling(20) });
  const after = await bonusOf(A, micro, { loadedIdentityKey: 'weapon-frag-grenade' });
  const dAfter = rt.resolveCanonicalDamage(micro, { weaponForm: { identityKey: 'weapon-micro-grenade-launcher', profileId: 'primary', loadedIdentityKey: 'weapon-frag-grenade' } }).base;
  assert.equal(after, before, 'mounting changes no attack bonus'); assert.equal(dAfter, dBefore, 'nor the payload damage (the -2 dice adjustment is intact)');
  assert.ok(typeof before === 'number');
  ok('mounted vs standalone: identical attack bonus and payload damage');
}
} finally { noRealAmmo(); restoreHarness(); setRound(null); }
console.log(`weapon-phase-5d-i-d-b1-mounting: ${step} checks passed`);
