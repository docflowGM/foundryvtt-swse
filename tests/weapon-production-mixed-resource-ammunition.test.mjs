import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-A -- core attack / damage / range residual convergence (conditional attack modifiers, range, area timing, stun setting, Sport Hunter reroll).
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
const { rollAttack: rollAttackRaw, computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { ownAndReady, installReadinessEnvironment: installRE } = await import('./helpers/ready-weapon-fixture.mjs'); await installRE();
const rollAttack = (a, w, o) => rollAttackRaw(a, ownAndReady(a, w), o); // WP5-C1: the attacker draws (owns and READIES) the weapon it attacks with
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
const makeActor = ({ feats = [], items = [], level = 6, type = 'character', size = 'medium' } = {}) => {
  const actor = {
    id: 'a1', name: 'Tester', type, flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col([...PROF, ...feats, ...items]),
    system: { bab: 6, level, size, attributes: { str: ab(0), dex: ab(0), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols', 'rifles', 'simple', 'heavy-weapons', 'advanced-melee'] },
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
  ActorEngine.updateOwnedItems = async (actor, updates) => { for (const u of updates) { const item = actor.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(item, k, v); } return updates.map((u) => actor.items.get(u._id)).filter(Boolean); };   // resolves with the documents it changed, as Foundry does
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
// Production projection of MULTI-RESOURCE weapons (Heavy Variable Blaster, Ascension Gun, SG-4): the Item counter is the FIRST pool.
// =====================================================================================================================================
const idx = registryData.productionIdIndex ?? {};
const prod = {};
for (const f of fs.readdirSync('packs').filter((n) => n.endsWith('.db') && /^weapons/.test(n))) {
  for (const l of fs.readFileSync(`packs/${f}`, 'utf8').split('\n').filter(Boolean)) { const d = JSON.parse(l); prod[d._id] = d; }
}
const prodIdOf = Object.fromEntries(Object.entries(idx).map(([pid, k]) => [k, pid]));
const reg = (k) => registryData.identities.find((i) => i.identityKey === k);
const owned = (identityKey) => { const d = JSON.parse(JSON.stringify(prod[prodIdOf[identityKey]])); return { ...d, id: `o${++uid}`, _id: undefined, name: 'Renamed Thing', system: { ...d.system, equipped: true } }; };
const ammoOf = (w) => w.system.ammunition.current;

{
  const expected = { 'weapon-heavy-variable-blaster': [500, 'power-pack'], 'weapon-ascension-gun': [50, 'power-pack'], 'weapon-sg-4-blaster-rifle': [50, 'power-pack'] };
  for (const [id, [n, type]] of Object.entries(expected)) {
    const a = prod[prodIdOf[id]].system.ammunition;
    assert.deepEqual([a.current, a.max, a.type], [n, n, type], `${id}: the production projection carries the primary pool (was 0 / none)`);
    assert.equal(reg(id).canonicalStats.ammo.profiles[0].capacityShots, n, `${id}: = the first listed canonical pool`);
  }
  // every other multi-resource weapon with no stated capacity (Interchangeable Weapon System) still ships no pool
  assert.deepEqual(prod[prodIdOf['weapon-interchangeable-weapon-system']].system.ammunition, { type: 'none', current: 0, max: 0 });
  // no single-pool weapon changed: every identity whose ammo.mode is not 'multiple' still projects exactly its capacityShots
  for (const w of registryData.identities) {
    const cs = w.canonicalStats ?? {}; if (cs.ammo?.mode === 'multiple') continue;
    const cap = cs.ammo?.capacityShots ?? cs.resource?.capacityShots ?? null;
    const a = prod[prodIdOf[w.identityKey]]?.system?.ammunition; if (!a) continue;
    assert.equal(a.max, cap && cap > 0 ? cap : 0, `${w.identityKey}: single-pool projection unchanged`);
  }
  ok('projection: the three multi-resource weapons carry their first pool; Interchangeable Weapon System and every single-pool weapon are unchanged');
}

try {
  AmmoSystem.spendForWorkflow = origs.spendAmmo; AmmoSystem.isTrackingEnabled = () => true; AmmoSystem.consumeAmmunition = origs.consume;

  // Heavy Variable Blaster: power levels draw 1 / 10 / 20 from the 500-shot pack; the syntherope (ascension) mode never touches it
  { const hv = owned('weapon-heavy-variable-blaster'); const A = makeActor({ items: [hv] });
    assert.equal(ammoOf(hv), 500);
    for (const [p, n] of [['low', 1], ['medium', 10], ['high', 20]]) { const before = ammoOf(hv); reset(); assert.ok(await attack(A, hv, { profileId: p }), p); assert.equal(before - ammoOf(hv), n, `${p}: ${n} shots from the pack`); }
    const before = ammoOf(hv); reset(); assert.ok(await attack(A, hv, { profileId: 'ascension' })); assert.equal(ammoOf(hv), before, 'the syntherope mode never debits the power pack');
    hv.system.ammunition.current = 15;
    reset(); assert.equal(await attack(A, hv, { profileId: 'high' }), null, '20 shots from a 15-shot pack: refused'); assert.equal(spent.rolls, 0); assert.equal(ammoOf(hv), 15);
    reset(); assert.ok(await attack(A, hv, { profileId: 'medium' })); assert.equal(ammoOf(hv), 5);
    reset(); assert.equal(await attack(A, hv, { profileId: 'medium' }), null, 'only 5 left: refused');
    await AmmoSystem.reloadWeapon(A, hv); assert.equal(ammoOf(hv), 500, 'a reload refills the power pack');
  }
  // Ascension Gun and SG-4: the blaster draws from the pack, the secondary resource does not
  for (const [id, secondary, n] of [['weapon-ascension-gun', 'ascension', 50], ['weapon-sg-4-blaster-rifle', 'harpoon', 50]]) {
    const w = owned(id); const A = makeActor({ items: [w] });
    const blaster = reg(id).canonicalStats.attackProfiles[0].id;
    reset(); assert.ok(await attack(A, w, { profileId: blaster })); assert.equal(ammoOf(w), n - 1, `${id}: a blaster shot costs one pack shot`);
    reset(); assert.ok(await attack(A, w, { profileId: secondary })); assert.equal(ammoOf(w), n - 1, `${id}: the ${secondary} form does not debit the pack`);
  }
  // a weapon with no stated pool (Interchangeable Weapon System) is not tracked and attacks are unaffected
  { const iws = owned('weapon-interchangeable-weapon-system'); const A = makeActor({ items: [iws] });
    reset(); assert.ok(await attack(A, iws, {})); assert.equal(ammoOf(iws), 0); }
  ok('production path: Heavy Variable Blaster 1/10/20 from the 500-shot pack, refusal when short, syntherope mode untouched, reload refills; Ascension Gun / SG-4 secondary forms never debit the pack; IWS unaffected');
} finally { AmmoSystem.isTrackingEnabled = origs.track; restoreHarness(); setRound(null); }
console.log(`weapon-production-mixed-resource-ammunition: ${step} checks passed`);
