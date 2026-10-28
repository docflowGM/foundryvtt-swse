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

try {
// ---- A. carriers: the operation key is a duplicate of a structured field a production consumer already reads ----------------------
{
  const cap = (k) => reg(k).canonicalStats.ammo.capacityShots;
  const pack = (k) => prod[prodIdOf[k]].system.ammunition;
  const cases = [
    ['capacityGrenades', 'weapon-micro-grenade-launcher', 4],
    ['oneShotCapacity', 'weapon-wrist-blaster', 1],
    ['singleShot', 'weapon-wrist-rocket-launcher', 1],
  ];
  for (const [key, id, n] of cases) {
    assert.equal(reg(id).operation[key], key === 'capacityGrenades' ? n : true, `${id}.operation.${key}`);
    assert.equal(cap(id), n, `${id}: canonical capacityShots`);
    assert.equal(pack(id).max, n, `${id}: the production projection AmmoSystem reads (system.ammunition.max)`);
    assert.equal(pack(id).current, n, `${id}: ships full`);
  }
  assert.equal(reg('weapon-wrist-rocket-launcher').canonicalStats.attackProfiles[0].firingConstraints.reloadRequiredAfterEachShot, true, 'singleShot also carried by reloadRequiredAfterEachShot');
  const sd = reg('weapon-sonic-disruptor');
  assert.deepEqual(sd.operation.specialRateOfFire, { canFire: 'once every other round', minimumRoundsBetweenShots: 1 });
  const fc = sd.canonicalStats.attackProfiles[0].firingConstraints;
  assert.deepEqual([fc.firesOnAlternatingRounds, fc.cooldownRounds, fc.maxShotsPerRound, fc.prohibitsMultiShotAbilities], [true, 1, 1, true], 'specialRateOfFire carrier: the profile firingConstraints');
  for (const id of ['weapon-variable-blaster', 'weapon-heavy-variable-blaster']) {
    const modes = reg(id).canonicalStats.modeProfiles.filter((m) => ['low', 'medium', 'high'].includes(m.id));
    assert.equal(reg(id).operation.powerLevelSwitchAction, 'swift');
    assert.deepEqual([...new Set(modes.map((m) => m.switchAction))], ['swift'], `${id}: powerLevelSwitchAction carried by modeProfiles[].switchAction`);
  }
  ok('carriers: capacityGrenades / oneShotCapacity / singleShot == canonical capacity == the production ammunition projection; specialRateOfFire == firingConstraints; powerLevelSwitchAction == modeProfiles[].switchAction');
}

// ---- B. production path: capacity + spend + reload through the REAL AmmoSystem ---------------------------------------------------
{
  useRealAmmo();
  // micro grenade launcher: four grenades, one per attack, refuses the fifth, a full-round reload restores four
  const mgl = owned('weapon-micro-grenade-launcher'); const A = makeActor({ items: [mgl] });
  for (let i = 4; i >= 1; i--) { reset(); assert.ok(await attack(A, mgl, {}), `shot ${5 - i}`); assert.equal(ammoOf(mgl), i - 1); }
  reset(); assert.equal(await attack(A, mgl, {}), null, 'the fifth attack is refused: the magazine is empty'); assert.equal(spent.rolls, 0, 'no roll when refused'); assert.deepEqual(spent.actions, [], 'no action spent when refused');
  assert.equal((await AmmoSystem.reloadWeapon(A, mgl)).reloadAmount, 4); assert.equal(ammoOf(mgl), 4);
  // E4-C1 WP5-C1 (EQ-003): the Wrist Blaster and Wrist Rocket Launcher are worn and never READIED, so the attack gate refuses them before any ammunition is
  // touched. Their one-shot capacity / reload cycle are acceptance debt (EQ-003/worn-weapon-attack-execution); the declared capacity data is asserted instead.
  const wb = owned('weapon-wrist-blaster'); const B = makeActor({ items: [wb] });
  reset(); assert.equal(await attack(B, wb, {}), null); assert.equal(ammoOf(wb), 1, 'a refused attack spends no energy'); assert.equal(spent.rolls, 0);
  const wr = owned('weapon-wrist-rocket-launcher'); const C = makeActor({ items: [wr] });
  reset(); assert.equal(await attack(C, wr, {}), null); assert.equal(ammoOf(wr), 1); assert.equal(wr.flags?.swse?.fireState?.needsReload, undefined);
  // a LEGACY (uncertified) weapon is refused by the gate too and writes nothing
  const lg = legacy({ ammunition: { current: 1, max: 1 } }); const L = makeActor({ items: [lg] });
  reset(); assert.equal(await attack(L, lg, {}), null); assert.deepEqual(Object.keys(lg.flags?.swse?.fireState ?? {}).filter((k) => k !== 'v' && k !== 'wielded'), [], 'legacy: no fire state written');
  noRealAmmo(); restoreHarness(); reinstall();
  ok('capacity production path: grenade launcher 4 -> refused at empty; worn wrist weapons and uncertified legacy weapons are refused by the gate and spend nothing');
}

// ---- C. specialRateOfFire: Sonic Disruptor fires once every other round -------------------------------------------------------------
{
  const sd = owned('weapon-sonic-disruptor'); const A = makeActor({ items: [sd] });
  setRound(1); reset(); assert.ok(await attack(A, sd, {}), 'round 1: fires');
  reset(); assert.equal(await attack(A, sd, {}), null, 'round 1 again: one shot per round');
  setRound(2); reset(); assert.equal(await attack(A, sd, {}), null, 'round 2: the alternate round');
  setRound(3); reset(); assert.ok(await attack(A, sd, {}), 'round 3: fires');
  const t = rt.shapeOfWeapon(sd, {}).temporal.map((c) => c.family);
  assert.ok(t.includes('alternate-round') || t.some((f) => /alternate/.test(f)), 'the alternate-round constraint is the consumer');
  // multi-shot abilities are prohibited
  assert.equal(rt.shapeOfWeapon(sd, {}).temporal.some((c) => c.maxShots === 1), true);
  setRound(null);
  ok('specialRateOfFire: Sonic Disruptor fires round 1, not round 2, again round 3; one shot per round');
}

// ---- D. powerLevelSwitchAction: a swift action per change of power level; resource multipliers ----------------------------------------
{
  for (const [id, mult] of [['weapon-variable-blaster', { low: 1, medium: 5, high: 10 }], ['weapon-heavy-variable-blaster', { low: 1, medium: 10, high: 20 }]]) {
    const vb = canon(id); const A = makeActor({ items: [vb] });
    const costOf = (p) => rt.resolveAttackResourceCost(rt.resolveAttackWeaponRuntime(vb, { profileId: p }), {}).units;
    for (const p of ['low', 'medium', 'high']) assert.equal(costOf(p), mult[p], `${id} ${p}: ${mult[p]} shots per attack`);
    const seq = [['low', 0], ['medium', 1], ['medium', 0], ['high', 1], ['low', 1]];
    for (const [p, swift] of seq) { reset(); assert.ok(await attack(A, vb, { profileId: p })); assert.equal(swiftCount(), swift, `${id}: ${p} -> ${swift} swift`); }
    // an unpayable change refuses the attack and writes nothing
    reinstall({ econAllowed: false });
    const vb2 = canon(id); const A2 = makeActor({ items: [vb2] });
    reset(); assert.equal(await attack(A2, vb2, { profileId: 'medium' }), null, 'cannot pay the swift: the attack is refused'); assert.equal(spent.rolls, 0); assert.deepEqual(Object.keys(vb2.flags?.swse?.fireState ?? {}).filter((k) => k !== 'v' && k !== 'wielded'), []);
    reinstall();
  }
  ok('powerLevelSwitchAction: a swift action per change of power level (free at the baseline and when unchanged), 1/5/10 and 1/10/20 shots, unpayable switch fails closed');
}


// ---- E. power-source REQUIREMENTS (requiresEnergyCell(s) / requiresPowerPack(s)): one reusable capability --------------------------
{
  const req = (id) => rt.powerSourceRequirementOf(reg(id).operation);
  const expected = {
    'lightsaber-chassis-archaic-lightfoil': ['energy-cell', 1], 'lightsaber-chassis-guard-shoto': ['energy-cell', 1],
    'lightsaber-chassis-longhandle': ['energy-cell', 1], 'lightsaber-chassis-modern-lightfoil': ['energy-cell', 1],
    'unmapped::Contact Stunner': ['energy-cell', 1], 'unmapped::Shock Whip': ['energy-cell', 1], 'unmapped::Tehkla Blade': ['energy-cell', 1],
    'unmapped::San-Ni Staff': ['energy-cell', 2], 'unmapped::Vibro-Saw': ['energy-cell', 2], 'weapon-gungan-electropole': ['energy-cell', 2],
    'unmapped::Blastsword': ['power-pack', 1], 'weapon-battering-ram': ['power-pack', 4],
  };
  for (const [id, [kind, count]] of Object.entries(expected)) {
    const r = req(id);
    assert.deepEqual([r?.kind, r?.count], [kind, count], `${id}: ${kind} x${count}`);
  }
  // every weapon that carries any of the four keys is covered by this one reader, and no other weapon gets a requirement
  const keyed = registryData.identities.filter((w) => ['requiresEnergyCell', 'requiresEnergyCells', 'requiresPowerPack', 'requiresPowerPacks'].some((k) => k in (w.operation ?? {}))).map((w) => w.identityKey).sort();
  assert.deepEqual(keyed, Object.keys(expected).sort(), 'exactly the twelve weapons that carry a requires* key');
  for (const w of registryData.identities) if (!keyed.includes(w.identityKey)) assert.equal(rt.powerSourceRequirementOf(w.operation), null, `${w.identityKey}: no requirement`);
  assert.equal(rt.powerSourceLabel(req('weapon-battering-ram')), '4 power packs');
  assert.equal(rt.powerSourceLabel(req('unmapped::Blastsword')), 'a power pack');
  assert.equal(rt.powerSourceLabel(req('lightsaber-chassis-guard-shoto')), 'an energy cell');
  // malformed values declare nothing
  assert.equal(rt.powerSourceRequirementOf({ requiresEnergyCells: 0 }), null);
  assert.equal(rt.powerSourceRequirementOf({ requiresPowerPack: false }), null);
  assert.equal(rt.powerSourceRequirementOf({ requiresEnergyCell: 'yes' }), null);
  ok('power-source requirement: one reader covers all 12 weapons / 4 keys (kind + count); other weapons and malformed values declare nothing');

  // behaviour through the real attack path
  for (const id of ['lightsaber-chassis-guard-shoto', 'unmapped::San-Ni Staff', 'unmapped::Blastsword', 'weapon-battering-ram']) {
    const w = canon(id); const A = makeActor({ items: [w] });
    const ammoBefore = JSON.stringify(w.system.ammunition ?? null);
    const preview = async (o = {}) => (await computeFinalAttackComposition(A, w, o)).readiness;
    // unknown: requirement is shown, the attack is NOT blocked, nothing consumed
    let r = await preview(); assert.equal(r.ready, true, `${id}: unconfirmed never blocks`);
    assert.equal(r.powerSource.state, 'unknown'); assert.match(r.notes.find((n) => n.family === 'power-source').note, /not confirmed installed/);
    reset(); assert.ok(await attack(A, w, {}), `${id}: attacks with an unconfirmed source`); assert.equal(JSON.stringify(w.system.ammunition ?? null), ammoBefore, `${id}: a requirement is not a per-shot ammunition cost`);
    // installed
    assert.equal((await FireStateStoreRef.setPowerSourceState(A, w, 'installed')).ok, true);
    r = await preview(); assert.equal(r.powerSource.state, 'installed'); assert.match(r.notes.find((n) => n.family === 'power-source').note, /confirmed installed/);
    reset(); assert.ok(await attack(A, w, {}));
    // missing: refuses BEFORE any cost
    assert.equal((await FireStateStoreRef.setPowerSourceState(A, w, 'missing')).ok, true);
    reset(); assert.equal(await attack(A, w, {}), null, `${id}: confirmed missing -> the attack is refused`); assert.equal(spent.rolls, 0); assert.deepEqual(spent.actions, []);
    assert.match(notes.warn.at(-1) ?? '', /power source is confirmed missing/);
    // a one-attack option overrides the owned state either way and leaves it untouched
    reset(); assert.ok(await attack(A, w, { powerSourceInstalled: true })); assert.equal(w.flags.swse.fireState.powerSource, 'missing', 'the option does not rewrite the owned state');
    // unconfirmed again -> proceeds
    assert.equal((await FireStateStoreRef.setPowerSourceState(A, w, null)).ok, true);
    reset(); assert.ok(await attack(A, w, {}));
    const optMissing = makeActor({ items: [] }); void optMissing;
    reset(); assert.equal(await attack(A, w, { powerSourceInstalled: false }), null, 'an explicit per-attack "missing" blocks that attack');
  }
  // refusals of the setter
  const sh = canon('lightsaber-chassis-guard-shoto'); const SA = makeActor({ items: [sh] });
  assert.equal((await FireStateStoreRef.setPowerSourceState(SA, sh, 'charged')).reason, 'invalid-power-source-state');
  const pistol = canon('weapon-blaster-pistol'); const PA = makeActor({ items: [pistol] });
  assert.equal((await FireStateStoreRef.setPowerSourceState(PA, pistol, 'installed')).reason, 'no-power-source-requirement');
  const lg = legacy({ requiresEnergyCell: true }); const LA = makeActor({ items: [lg] });
  assert.equal((await FireStateStoreRef.setPowerSourceState(LA, lg, 'missing')).ok, false, 'legacy / custom weapons have no canonical requirement');
  reset(); assert.equal(await attack(LA, lg, {}), null, 'E4-C1 WP5-C1: an uncertified legacy weapon is refused by the attack gate');
  ok('power source: unconfirmed never blocks and consumes nothing; installed is shown; confirmed missing refuses before any cost; per-attack option overrides without rewriting state; legacy untouched');
}

// ---- F. secondCrewReloadAction: E-Web missile launcher ----------------------------------------------------------------------------
{
  useRealAmmo();
  const crewSpends = [];
  const origSpend = ActionEconomyConsumption.spend;
  const installCrewEcon = (allowed = true) => { ActionEconomyConsumption.spend = async (actor, type) => { if (!allowed) return { allowed: false, permitted: false, rollback: async () => {} }; crewSpends.push({ actor: actor.id, type }); return { allowed: true, committed: true, rollback: async () => { crewSpends.pop(); } }; }; };
  const crewActor = (id) => ({ ...makeActor({ items: [] }), id, name: `Crew ${id}` });
  const fresh = async () => {
    const ew = owned('weapon-e-web-missile-launcher'); const G = makeActor({ items: [ew] }); G.id = 'gunner';
    installCrewEcon(true);
    reset(); assert.ok(await attack(G, ew, {}), 'the gunner fires');
    crewSpends.length = 0;
    return { ew, G };
  };
  {
    const { ew, G } = await fresh();
    assert.equal(ammoOf(ew), 0); assert.equal(ew.flags.swse.fireState.needsReload, true);
    reset(); assert.equal(await attack(G, ew, {}), null, 'cannot fire again before the reload');
    const C = crewActor('crew-1');
    // no crew -> nothing happens
    for (const bad of [undefined, null, {}, G]) {
      const r = await FireStateStoreRef.reloadBySecondCrew(G, ew, bad); assert.equal(r.ok, false); assert.equal(r.reason, 'second-crew-required');
    }
    assert.deepEqual(crewSpends, [], 'no crew member is invented: nothing spent'); assert.equal(ammoOf(ew), 0); assert.equal(ew.flags.swse.fireState.needsReload, true);
    // crew supplied -> Move action charged to the CREW, the existing AmmoSystem reload restores the launcher
    const ok1 = await FireStateStoreRef.reloadBySecondCrew(G, ew, C);
    assert.equal(ok1.ok, true); assert.equal(ok1.action, 'move'); assert.deepEqual(ok1.chargedTo, { id: 'crew-1', name: 'Crew crew-1' });
    assert.deepEqual(crewSpends, [{ actor: 'crew-1', type: 'move' }], 'exactly one Move, charged to the crew member, never the gunner');
    assert.equal(ammoOf(ew), 1, 'AmmoSystem restored the pool'); assert.equal(ew.flags.swse.fireState.needsReload, undefined, 'awaiting-reload cleared');
    // no double reload / double spend
    const again = await FireStateStoreRef.reloadBySecondCrew(G, ew, C); assert.equal(again.ok, false); assert.equal(again.reason, 'already-loaded');
    assert.equal(crewSpends.length, 1, 'the second call spent nothing');
    reset(); assert.ok(await attack(G, ew, {}), 'fires again after the crew reload');
  }
  {
    // the crew member cannot pay the Move -> nothing reloads
    const { ew, G } = await fresh(); installCrewEcon(false);
    const r = await FireStateStoreRef.reloadBySecondCrew(G, ew, crewActor('crew-2')); assert.equal(r.reason, 'crew-action-unavailable');
    assert.equal(ammoOf(ew), 0); assert.equal(ew.flags.swse.fireState.needsReload, true);
    // a failed reload gives the crew's action back
    installCrewEcon(true); const origReload = AmmoSystem.reloadWeapon; AmmoSystem.reloadWeapon = async () => ({ success: false, message: 'boom' });
    const f = await FireStateStoreRef.reloadBySecondCrew(G, ew, crewActor('crew-3')); AmmoSystem.reloadWeapon = origReload;
    assert.equal(f.reason, 'reload-failed'); assert.deepEqual(crewSpends, [], 'the failed reload rolled the crew action back'); assert.equal(ammoOf(ew), 0);
    // a weapon with no second-crew reload is not eligible
    const wr = owned('weapon-black-powder-pistol'); const W = makeActor({ items: [wr] }); W.id = 'solo';
    assert.equal((await FireStateStoreRef.reloadBySecondCrew(W, wr, crewActor('crew-4'))).reason, 'no-second-crew-reload');
    const lg = legacy({ ammunition: { current: 0, max: 1 } }); const L = makeActor({ items: [lg] });
    assert.equal((await FireStateStoreRef.reloadBySecondCrew(L, lg, crewActor('crew-5'))).reason, 'no-second-crew-reload');
  }
  {
    // IN an active combat the crew member must be a combatant of that combat and their Move must really be recorded
    const { ew, G } = await fresh();
    const inCombat = (...ids) => { globalThis.game = { ...(globalThis.game ?? {}), combat: { id: 'c1', started: true, round: 1, combatants: ids.map((id) => ({ actor: { id } })) }, user: { targets: { first: () => null } } }; };
    inCombat('gunner', 'crew-1');
    // an unrelated world actor: refused, nothing mutated, no free reload
    const stranger = crewActor('stranger');
    const refused = await FireStateStoreRef.reloadBySecondCrew(G, ew, stranger);
    assert.equal(refused.ok, false); assert.equal(refused.reason, 'crew-not-in-combat');
    assert.deepEqual(crewSpends, [], 'nothing spent'); assert.equal(ammoOf(ew), 0); assert.equal(ew.flags.swse.fireState.needsReload, true, 'still awaiting reload');
    // the gunner as crew / no crew: still refused in combat
    assert.equal((await FireStateStoreRef.reloadBySecondCrew(G, ew, G)).reason, 'second-crew-required');
    assert.equal((await FireStateStoreRef.reloadBySecondCrew(G, ew, null)).reason, 'second-crew-required');
    // a combatant crew member whose Move is not actually recorded (committed: false) is refused and rolled back
    ActionEconomyConsumption.spend = async (actor, type) => { crewSpends.push({ actor: actor.id, type }); return { allowed: true, committed: false, rollback: async () => { crewSpends.pop(); } }; };
    const notCommitted = await FireStateStoreRef.reloadBySecondCrew(G, ew, crewActor('crew-1'));
    assert.equal(notCommitted.reason, 'crew-action-not-committed'); assert.deepEqual(crewSpends, []); assert.equal(ammoOf(ew), 0);
    // an eligible combatant: exactly one Move on that actor
    installCrewEcon(true);
    const good = await FireStateStoreRef.reloadBySecondCrew(G, ew, crewActor('crew-1'));
    assert.equal(good.ok, true); assert.deepEqual(crewSpends, [{ actor: 'crew-1', type: 'move' }]); assert.equal(ammoOf(ew), 1);
    // the gunner NOT in the combat but the crew in it: the combat does not apply to the gunner's reload (established out-of-combat policy)
    reset(); assert.ok(await attack(G, ew, {})); crewSpends.length = 0; inCombat('crew-1');
    const outOfCombatGunner = await FireStateStoreRef.reloadBySecondCrew(G, ew, crewActor('stranger'));
    assert.equal(outOfCombatGunner.ok, true, 'no combat for the gunner: the out-of-combat policy applies');
    globalThis.game = { ...(globalThis.game ?? {}), combat: null };
  }
  ActionEconomyConsumption.spend = origSpend;
  noRealAmmo(); restoreHarness(); reinstall();
  ok('second-crew reload: Move charged to the supplied crew member only; no crew / the gunner as crew -> nothing; no double reload; unpayable or failed reload leaves state and returns the action; other / legacy weapons ineligible');
}

// ---- G. the sheet reload workflow: tracking off, second crew, mortar single shell --------------------------------------------------
{
  globalThis.CONFIG = globalThis.CONFIG ?? { SWSE: {}, Actor: {}, Item: {}, statusEffects: [] };
  globalThis.localStorage = globalThis.localStorage ?? { getItem() { return null; }, setItem() {}, removeItem() {} };
  globalThis.foundry.applications.sheets = globalThis.foundry.applications.sheets ?? { ActorSheetV2: class {}, ItemSheetV2: class {}, JournalSheet: class {} };
  globalThis.foundry.applications.ux = globalThis.foundry.applications.ux ?? { DragDrop: { implementation: class {} }, TextEditor: { implementation: {} } };
  globalThis.Hooks = { callAll() {}, on() {}, once() {}, off() {} };
  const { SWSEV2CharacterLikeSheet } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-like-sheet.js');
  const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
  const proto = SWSEV2CharacterLikeSheet.prototype;
  useRealAmmo();
  const origPrompt = SWSEDialogV2.prompt;
  const charges = [];
  const mkSheet = (actor) => ({ actor, requestSurfaceRender: async () => {}, _deriveCombatActionEconomyType: () => 'standard', _spendActionEconomy: async (type) => { charges.push({ actor: actor.id, type }); return { allowed: true, permitted: true, committed: false, rollback: async () => false }; }, _chooseReloadMode: proto._chooseReloadMode });
  const run = (sheet, ctx = {}, opts = {}) => proto._executeReloadCombatWorkflow.call(sheet, { action: { id: 'reload' }, ...ctx }, opts);
  globalThis.game = { ...(globalThis.game ?? {}), actors: { get: (id) => (id === 'crew-9' ? { id: 'crew-9', name: 'Crew Nine' } : null) }, combat: null, user: { targets: { first: () => null } } };

  // tracking OFF + awaiting reload: the wrist rocket launcher must be reloadable (it used to stay blocked forever)
  AmmoSystem.isTrackingEnabled = () => false;
  // E4-C1 WP5-C1: the reload cycle is exercised on a READIED single-shot reload-required weapon (the worn wrist launcher is refused by the attack gate, EQ-003)
  { const wr = owned('weapon-black-powder-pistol'); const A = makeActor({ items: [wr] }); A.id = 'solo'; A.name = 'Solo';
    reset(); assert.ok(await attack(A, wr, {})); assert.equal(wr.flags.swse.fireState.needsReload, true);
    charges.length = 0; const res = await run(mkSheet(A), { weaponId: wr.id }); 
    assert.equal(res?.success, true, 'reload resolved with ammunition tracking off'); assert.equal(wr.flags.swse.fireState.needsReload, undefined);
    assert.deepEqual(charges, [{ actor: 'solo', type: 'standard' }], 'the reload action is charged once');
    reset(); assert.ok(await attack(A, wr, {}), 'fires again');
    // tracking off and NOT awaiting: nothing to resolve, nothing spent
    charges.length = 0; wr.flags.swse.fireState.needsReload = false;
    const idle = await run(mkSheet(A), { weaponId: wr.id }); assert.equal(idle?.reason, 'ammo-tracking-disabled'); assert.deepEqual(charges, []);
  }
  AmmoSystem.isTrackingEnabled = () => true;

  // second crew through the sheet workflow
  { const ew = owned('weapon-e-web-missile-launcher'); const G = makeActor({ items: [ew] }); G.id = 'gunner'; G.name = 'Gunner';
    reset(); assert.ok(await attack(G, ew, {}));
    const crewSpends = []; const origSpend = ActionEconomyConsumption.spend;
    ActionEconomyConsumption.spend = async (a, type) => { crewSpends.push({ actor: a.id, type }); return { allowed: true, committed: true, rollback: async () => {} }; };
    charges.length = 0;
    const res = await run(mkSheet(G), { weaponId: ew.id }, { secondCrewActorId: 'crew-9' });
    assert.equal(res.ok, true); assert.deepEqual(crewSpends, [{ actor: 'crew-9', type: 'move' }], 'Move charged to the crew member'); assert.deepEqual(charges, [], 'the gunner is not charged');
    assert.equal(ammoOf(ew), 1); assert.equal(ew.flags.swse.fireState.needsReload, undefined);
    // no crew chosen: the dialog's "reload it myself" keeps the ordinary reload (nothing is invented)
    reset(); assert.ok(await attack(G, ew, {})); crewSpends.length = 0; charges.length = 0;
    SWSEDialogV2.prompt = async () => 'full';
    const solo = await run(mkSheet(G), { weaponId: ew.id }); assert.equal(solo.success, true); assert.deepEqual(crewSpends, []); assert.deepEqual(charges, [{ actor: 'gunner', type: 'standard' }]);
    // cancelling the dialog does nothing at all
    reset(); assert.ok(await attack(G, ew, {})); charges.length = 0; SWSEDialogV2.prompt = async () => null;
    assert.equal(await run(mkSheet(G), { weaponId: ew.id }), null); assert.deepEqual(charges, []); assert.equal(ew.flags.swse.fireState.needsReload, true);
    SWSEDialogV2.prompt = origPrompt; ActionEconomyConsumption.spend = origSpend;
  }

  // tracking OFF x second crew (the intersection): the Move is charged to the crew, the awaiting-reload state clears, the numerical pool is NOT touched
  { const ew = owned('weapon-e-web-missile-launcher'); const G = makeActor({ items: [ew] }); G.id = 'gunner'; G.name = 'Gunner';
    AmmoSystem.isTrackingEnabled = () => false;
    reset(); assert.ok(await attack(G, ew, {})); assert.equal(ew.flags.swse.fireState.needsReload, true);
    ew.system.ammunition.current = 0; // an untracked pool is left exactly as it is
    const crewSpends = []; const origSpend = ActionEconomyConsumption.spend;
    ActionEconomyConsumption.spend = async (a, type) => { crewSpends.push({ actor: a.id, type }); return { allowed: true, committed: true, rollback: async () => {} }; };
    charges.length = 0;
    const res = await run(mkSheet(G), { weaponId: ew.id }, { secondCrewActorId: 'crew-9' });
    assert.equal(res.ok, true); assert.deepEqual(crewSpends, [{ actor: 'crew-9', type: 'move' }], 'Move charged to the crew member'); assert.deepEqual(charges, [], 'not to the gunner');
    assert.equal(ew.flags.swse.fireState.needsReload, undefined, 'awaiting-reload cleared'); assert.equal(ammoOf(ew), 0, 'the untracked numerical pool was not manipulated');
    assert.equal(res.reload.reloadAmount, 0);
    reset(); assert.ok(await attack(G, ew, {}), 'fires again');
    ActionEconomyConsumption.spend = origSpend; AmmoSystem.isTrackingEnabled = () => true;
  }

  // mortar: the single-shell FIRING method (Galaxy at War p.40); the five-shell automatic-feed magazine is intact
  { assert.equal(typeof AmmoSystem.loadSingleRound, 'undefined', 'single-shell use is not a magazine refill helper');
    const ml = owned('weapon-mortar-launcher'); const A = makeActor({ items: [ml] }); A.id = 'mort'; A.name = 'Mortar Team';
    assert.equal(reg('weapon-mortar-launcher').operation.canSingleLoadShell, true); assert.equal(ammoOf(ml), 5);
    const optionIds = (actor, weapon) => (CombatOptionResolver.getAttackOptionsWithState(actor, weapon, {}) ?? []).map((o) => o.id ?? o.option?.id);
    assert.ok(optionIds(A, ml).includes('singleShellLaunch'), 'the mortar offers the single-shell firing mode');
    const mg0 = owned('weapon-micro-grenade-launcher'); const B0 = makeActor({ items: [mg0] });
    assert.ok(!optionIds(B0, mg0).includes('singleShellLaunch'), 'no other weapon offers it');
    // the magazine feeds each ordinary shot
    reset(); assert.ok(await attack(A, ml, {})); assert.equal(ammoOf(ml), 4, 'ordinary shot: one shell from the magazine');
    // single shell: fires without touching the magazine, no reload action, no refill
    reset(); assert.ok(await attack(A, ml, { combatOptions: { singleShellLaunch: true } })); assert.equal(ammoOf(ml), 4, 'the magazine is neither used nor refilled'); assert.deepEqual(spent.actions, [], 'no separate action is charged');
    // with an EMPTY magazine the ordinary shot is refused but the single shell still fires
    ml.system.ammunition.current = 0;
    reset(); assert.equal(await attack(A, ml, {}), null, 'empty magazine: ordinary shot refused'); assert.equal(spent.rolls, 0);
    reset(); assert.ok(await attack(A, ml, { combatOptions: { singleShellLaunch: true } }), 'a supplied shell fires through the open tube'); assert.equal(ammoOf(ml), 0, 'the magazine stays empty');
    reset(); assert.equal(await attack(A, ml, { combatOptions: { singleShellLaunch: '0' } }), null, 'option off -> the ordinary (empty) magazine rule');
    // the option is honoured only for a weapon that declares the method
    const mg = owned('weapon-micro-grenade-launcher'); const B = makeActor({ items: [mg] });
    reset(); assert.ok(await attack(B, mg, { combatOptions: { singleShellLaunch: true } })); assert.equal(ammoOf(mg), 3, 'the asserted option changes nothing for a launcher that does not declare it');
    // the sheet reload still offers no single-round "refill": the mortar's reload is the ordinary magazine reload
    const viaSheet = await run(mkSheet(A), { weaponId: ml.id }, { loadSingleRound: true });
    assert.equal(viaSheet.reloadAmount, 5, 'a reload refills the whole magazine (the single-round option no longer exists)'); assert.equal(ammoOf(ml), 5);
    // ammunition tracking OFF: the single shell fires, nothing is counted either way
    AmmoSystem.isTrackingEnabled = () => false;
    reset(); assert.ok(await attack(A, ml, { combatOptions: { singleShellLaunch: true } })); assert.equal(ammoOf(ml), 5);
    reset(); assert.ok(await attack(A, ml, {})); assert.equal(ammoOf(ml), 5, 'untracked ordinary shot: pool untouched');
    AmmoSystem.isTrackingEnabled = () => true;
    // legacy untouched
    const lg = legacy({ ammunition: { current: 1, max: 5 } }); const L = makeActor({ items: [lg] });
    reset(); assert.equal(await attack(L, lg, { combatOptions: { singleShellLaunch: true } }), null); assert.equal(lg.system.ammunition.current, 1, 'E4-C1 WP5-C1: an uncertified legacy weapon is refused by the gate and spends nothing');
  }
  SWSEDialogV2.prompt = origPrompt; noRealAmmo(); restoreHarness(); reinstall();
  ok('sheet reload workflow: tracking-off awaiting-reload still resolves; second crew charged to the crew only; solo / cancel keep the ordinary reload / nothing; tracking-off second crew leaves the untracked pool alone; the mortar single-shell is a firing mode that skips the magazine');
}

// ---- H. a stated distance beyond every band is out of range: refused, never rolled with no penalty --------------------------------
{
  const pistol = canon('weapon-blaster-pistol'); const A = makeActor({ items: [pistol] });
  const comp = async (o) => (await computeFinalAttackComposition(A, pistol, o));
  reset(); assert.ok(await attack(A, pistol, { distanceSquares: 30 }), '30 squares: Short for a pistol');
  assert.equal((await comp({ distanceSquares: 30 })).attackBonusResolution.components['Range Penalty'], -2);
  reset(); assert.equal(await attack(A, pistol, { distanceSquares: 100 }), null, '100 squares is beyond a pistol\'s 80: refused'); assert.equal(spent.rolls, 0); assert.deepEqual(spent.actions, []);
  assert.match(notes.warn.concat(notes.error).join(' '), /out of range/i);
  for (const bad of [-1, 'far', NaN]) { reset(); assert.equal(await attack(A, pistol, { distanceSquares: bad }), null, `${bad}: invalid`); }
  reset(); assert.ok(await attack(A, pistol, { distanceSquares: 100, rangeBand: 'long' }), 'an explicit band wins: the player named it');
  reset(); assert.ok(await attack(A, pistol, {}), 'no distance stated: nothing to validate (unknown is not out of range)');
  // the discblade: thrown 12 squares max; pistol range with the talent extends it
  const disc = canon('weapon-discblade'); const without = makeActor({ items: [disc] });
  const dTalent = canon('weapon-discblade'); const withTal = makeActor({ items: [dTalent], feats: [], });
  withTal.items = col([...withTal.items, mk('talent', 'Distant Discblade Throw')]);
  reset(); assert.ok(await attack(without, disc, { profileId: 'thrown', distanceSquares: 12 }));
  reset(); assert.equal(await attack(without, disc, { profileId: 'thrown', distanceSquares: 30 }), null, 'a thrown discblade cannot reach 30 squares');
  reset(); assert.ok(await attack(withTal, dTalent, { profileId: 'thrown', distanceSquares: 30 }), 'with Distant Discblade Throw the pistol range reaches 30');
  reset(); assert.equal(await attack(withTal, dTalent, { profileId: 'thrown', distanceSquares: 90 }), null, 'but not 90');
  // a melee form ignores a distance
  const sword = canon('lightsaber-chassis-dueling'); const S = makeActor({ items: [sword] });
  reset(); assert.ok(await attack(S, sword, { distanceSquares: 500 }), 'melee: the distance is not a range band question');
  ok('stated distance: beyond every band (or invalid) refuses the attack before any cost; explicit band wins; no distance is unknown; the talent extends the discblade; melee ignores it');
}

} finally { noRealAmmo(); restoreHarness(); setRound(null); }
console.log(`weapon-phase-5d-i-d-f-ammo-power-reload: ${step} checks passed`);
