import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// D-016 -- the physical damage subtype (piercing/slashing/bludgeoning) of the attack form actually used flows from the attack's canonical
// damage-type structure, through the damage roll's workflow context, to the damage-mitigation authority, so a protection that names one
// subtype (Armor Reinforcement: DR 2 against piercing, KotOR p.75) applies only to that subtype. Core Rulebook p.120: "and" = both types at
// once; "or" = one chosen before the attack roll. Real canonical registry, real rollDamage, real serializer, real DamageResolutionEngine.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {};
globalThis.foundry.utils ??= {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.ui = { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const R = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const ser = await import('/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const P = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-install-service.js');
const store = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-store.js');
const { DamageResolutionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-resolution-engine.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const silent = async (fn) => { const e = console.error; const w = console.warn; console.error = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.error = e; console.warn = w; } };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
const attacker = { id: 'a1', name: 'Shooter', type: 'character', flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; }, items: col([]),
  system: { bab: 5, level: 6, attributes: { str: ab(2), dex: ab(3), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } } };
const canon = (k) => ({ id: `w-${k}`, name: k, type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', damageType: 'sonic' } });
const physicalOf = (k, ctx = {}) => R.physicalDamageTypesOf(rt.resolveCanonicalDamage(canon(k), ctx), ctx.damageType ?? null);

{
  assert.deepEqual(R.physicalDamageTypesOf({ damageTypeMode: 'single', damageTypes: ['piercing'] }), { types: ['piercing'], resolved: true });
  assert.deepEqual(R.physicalDamageTypesOf({ damageTypeMode: 'and', damageTypes: ['energy', 'piercing'] }), { types: ['piercing'], resolved: true });
  assert.deepEqual(R.physicalDamageTypesOf({ damageTypeMode: 'or', damageTypes: ['slashing', 'piercing'], selectedDamageType: 'slashing' }), { types: ['slashing'], resolved: true });
  assert.deepEqual(R.physicalDamageTypesOf({ damageTypeMode: 'or', damageTypes: ['slashing', 'piercing'] }, 'piercing'), { types: ['piercing'], resolved: true });
  assert.deepEqual(R.physicalDamageTypesOf({ damageTypeMode: 'or', damageTypes: ['slashing', 'piercing'] }), { types: [], resolved: false }, 'no recorded choice: nothing assumed');
  assert.deepEqual(R.physicalDamageTypesOf({ damageTypeMode: 'single', damageTypes: ['energy'] }), { types: [], resolved: true });
  ok('Core p.120 semantics: single = its type, "and" = every listed type, "or" = only the chosen type, an unrecorded "or" choice assumes nothing');
}
{
  assert.deepEqual(physicalOf('weapon-slugthrower-pistol').types, ['piercing']);
  assert.deepEqual(physicalOf('weapon-bowcaster').types, ['piercing'], 'energy and piercing');
  assert.deepEqual(physicalOf('weapon-stun-baton').types, ['bludgeoning']);
  assert.deepEqual(physicalOf('weapon-blaster-pistol').types, []);
  assert.deepEqual(physicalOf('weapon-vibroblade', { damageType: 'piercing' }).types, ['piercing']);
  assert.deepEqual(physicalOf('weapon-vibroblade', { damageType: 'slashing' }).types, ['slashing']);
  assert.equal(physicalOf('weapon-vibroblade').resolved, false);
  ok('the canonical registry\'s source-backed attack-profile types drive it (slugthrower piercing, bowcaster energy+piercing, vibroblade slashing-or-piercing by choice)');
}
const posted = [];
const realPost = SWSEChat.postRoll;
SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: async (f) => ({ total: 7, formula: f, dice: [] }) } };
const wfFor = async (k, ctx = {}) => { posted.length = 0; await silent(() => rollDamage(attacker, canon(k), ctx)); return posted.at(-1)?.context?.workflowContext ?? null; };
let wf = {};
try {
  wf.slug = await wfFor('weapon-slugthrower-pistol');
  wf.vibroP = await wfFor('weapon-vibroblade', { damageType: 'piercing' });
  wf.vibroS = await wfFor('weapon-vibroblade', { damageType: 'slashing' });
  wf.blaster = await wfFor('weapon-blaster-pistol');
} finally { SWSEChat.postRoll = realPost; }
{
  assert.deepEqual(wf.slug?.damage?.physicalDamageTypes, ['piercing'], JSON.stringify(wf.slug?.damage));
  assert.deepEqual(wf.vibroP.damage.physicalDamageTypes, ['piercing']);
  assert.deepEqual(wf.vibroS.damage.physicalDamageTypes, ['slashing']);
  assert.deepEqual(wf.blaster.damage.physicalDamageTypes ?? [], []);
  const round = ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext(wf.slug));
  assert.deepEqual(round.damage.physicalDamageTypes, ['piercing'], 'survives the chat-card encode/decode');
  assert.deepEqual(R.eventPhysicalDamageTypes({ workflowContext: round }), ['piercing']);
  ok('rollDamage records the subtype in the workflow context it posts, and it survives the chat-card round trip to the apply step');
}
{
  const readText = async (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  const data = await P.loadModificationData({ fetchText: readText });
  store.setVerifiedModificationData(data);
  let devOn = true;
  globalThis.game = { ...(globalThis.game ?? {}), settings: { get: (ns, key) => (key === 'modificationV2DevelopmentMode' ? devOn : undefined) }, user: { isGM: true, id: 'gm' } };
  const armor = { id: 'ar', name: 'Combat Jumpsuit', type: 'armor', system: { armorType: 'light', equipped: true }, flags: { 'foundryvtt-swse': { customization: { installedUpgrades: [
    { instanceId: 'i1', typedDefinitionId: 'kotor-accessory-armor-reinforcement::armor', domain: 'armor', state: 'installed', basis: 'DEVELOPMENT_GM_POLICY', provisional: true },
  ] } } } };
  const target = { id: 't', name: 'Target', type: 'npc', flags: { swse: {} }, effects: [], items: col([armor]), getFlag() { return undefined; },
    system: { size: 'medium', hp: { value: 40, max: 40 }, conditionTrack: { current: 0 }, derived: { damageThreshold: 30 } } };
  armor.actor = target;
  const hp = async (damageType, workflowContext) => (await silent(() => DamageResolutionEngine.resolveDamage({ actor: target, damage: 10, damageType, source: null, options: { workflowContext } }))).hpAfter;
  assert.equal(await hp('kinetic', wf.slug), 32, 'piercing: DR 2');
  assert.equal(await hp('kinetic', wf.vibroP), 32, 'vibroblade, piercing chosen: DR 2');
  assert.equal(await hp('kinetic', wf.vibroS), 30, 'vibroblade, slashing chosen: no DR (kinetic is not broadened)');
  assert.equal(await hp('kinetic', null), 30, 'no recorded subtype: no DR');
  assert.equal(await hp('energy', wf.blaster), 30, 'energy: no DR');
  armor.system.equipped = false; assert.equal(await hp('kinetic', wf.slug), 30, 'armor not worn'); armor.system.equipped = true;
  devOn = false; assert.equal(await hp('kinetic', wf.slug), 30, 'development setting off'); devOn = true;
  armor.flags['foundryvtt-swse'].customization.installedUpgrades[0].state = 'deactivated';
  assert.equal(await hp('kinetic', wf.slug), 30, 'deactivated');
  // the apply step: the real packet builder carries the decoded workflow context in packet.options, which ActorEngine.applyDamage forwards
  armor.flags['foundryvtt-swse'].customization.installedUpgrades[0].state = 'installed';
  const { buildDamagePacket, finalizeDamagePacketForTarget } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js');
  const viaPacket = async (wfc) => {
    const decoded = ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext(wfc));
    const packet = finalizeDamagePacketForTarget(buildDamagePacket({ attacker: null, target, weapon: null, amount: 10, options: { damageType: 'kinetic', hit: true }, workflowContext: decoded }), target);
    return (await silent(() => DamageResolutionEngine.resolveDamage({ actor: target, damage: packet.amount, damageType: packet.type, source: null, options: packet.options }))).hpAfter;
  };
  assert.equal(await viaPacket(wf.slug), 32, 'packet path: piercing DR 2');
  assert.equal(await viaPacket(wf.vibroS), 30, 'packet path: slashing, no DR');
  ok('the real damage resolver applies Armor Reinforcement DR 2 only to recorded piercing damage from worn armor (not slashing, not unrecorded, not energy; not when unworn, deactivated or the setting is off)');
  // Core Rulebook p.158 (owner ruling, D-016): with several DR values the applicable one that most benefits applies -- Armor Reinforcement
  // competes with generic / qualified DR, it never adds to it
  const withDR = async (dr, workflowContext, damageType = 'kinetic', extra = {}) => {
    target.system.damageReduction = dr;
    try { return 20 - (await silent(() => DamageResolutionEngine.resolveDamage({ actor: target, damage: 20, damageType, source: null, options: { workflowContext, ...extra } }))).damageToHP; }
    finally { target.system.damageReduction = 0; }
  };
  assert.equal(await withDR(5, wf.slug), 5, 'piercing, generic DR 5 + Armor Reinforcement 2: 5 reduced, not 7');
  assert.equal(await withDR(1, wf.slug), 2, 'piercing, generic DR 1 + Armor Reinforcement 2: 2 reduced, not 3');
  assert.equal(await withDR(0, wf.slug), 2, 'piercing, no other DR: 2');
  assert.equal(await withDR(0, wf.vibroS), 0, 'slashing only: nothing from Armor Reinforcement');
  assert.equal(await withDR(1, wf.vibroS), 1, 'slashing with generic DR 1: just the generic DR');
  assert.equal(await withDR(0, wf.vibroP), 2, '"or" form selected as piercing: 2');
  assert.equal(await withDR({ value: 5, exceptions: ['energy'] }, wf.slug), 5, 'a higher qualified DR (5/energy) applies to piercing and beats the 2');
  assert.equal(await withDR({ value: 5, exceptions: ['kinetic'] }, wf.slug), 2, 'DR 5/kinetic is bypassed by this kinetic damage; Armor Reinforcement 2 remains');
  assert.equal(await withDR(5, wf.slug, 'kinetic', { damageTags: ['bypass-dr'] }), 0, 'bypassed DR stays bypassed (bypass-dr tag), Armor Reinforcement included');
  // multi-component event: one selection for the event; the "against piercing" entry reaches only the kinetic component
  const multi = async (dr) => {
    target.system.damageReduction = dr;
    const comps = [{ key: 'base-damage', type: 'kinetic', damageTypes: ['kinetic'], amount: 6, rawAmount: 6 }, { key: 'rider', type: 'energy', damageTypes: ['energy'], amount: 6, rawAmount: 6 }];
    try { return 12 - (await silent(() => DamageResolutionEngine.resolveDamage({ actor: target, damage: 12, damageType: 'kinetic', source: null, options: { workflowContext: wf.slug, damageComponents: comps } }))).damageToHP; }
    finally { target.system.damageReduction = 0; }
  };
  assert.equal(await multi(0), 2, 'multi-component: DR 2 against piercing from the kinetic component only');
  assert.equal(await multi(5), 5, 'multi-component: generic DR 5 wins, not 7');
  ok('Core p.158: Armor Reinforcement competes with generic and qualified DR (highest applicable, never added), respects "or" selection and bypass, single- and multi-component');
}
console.log(`d016-physical-damage-type-flow: ${n} checks ok`);
