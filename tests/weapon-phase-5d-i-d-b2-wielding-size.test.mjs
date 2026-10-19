import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-D-B2 -- effective size (tripod / chosen / worn), worn classification, two-handed design and the held-together rule.
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
const WS = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/wielding-size.js');
const OS = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/owned-state.js');
const { weaponMatchesText } = await import('/systems/foundryvtt-swse/scripts/engine/combat/weapon-target-gate-classifiers.js');
const { DualWieldCombatShapeResolver: DW } = await import('/systems/foundryvtt-swse/scripts/engine/combat/dual-wield-combat-shape-resolver.js');
// the coordinator-owned grip (`wielded`) comes from the readiness fixture and is not part of the operating state these assertions are about (E4-C1 WP5)
const readState = (w) => { const f = w.flags?.swse?.fireState; if (!f) return null; const { wielded, ...rest } = f; return Object.keys(rest).every((k) => k === 'v') ? null : rest; };
const shapeOf = (w) => rt.shapeOfWeapon(w, {});
const notesOf = (A, w, opt = {}) => FireStateStoreRef.previewReadiness(A, w, rt.resolveAttackWeaponRuntime(w, opt), opt).notes.map((n) => n.note);
const isLight = (A, w, ctx = {}) => weaponMatchesText(w, ['light'], { actor: A, wielderSize: A.system.size, abilityKey: 'weapon-finesse', ...ctx });
const ewp = (rename, choice) => ({ ...packDoc('packs/feats.db', 'Exotic Weapon Proficiency', rename), flags: { swse: { ...packDoc('packs/feats.db', 'Exotic Weapon Proficiency').flags.swse, choices: { weaponProficiency: choice } } } });
const AF = { autofire: true, attackMode: 'autofire' };
const used = () => spent.rolls + spent.ammo + spent.actions.length;
const S = FireStateStoreRef;

try {
// ---- A. the structured size / worn / design rules of the production records (names are wrong on purpose) ---------------------------
{
  const lf = shapeOf(owned('weapon-lightfoil')).sizeRules;
  assert.equal(lf.beneficial.size, 'Small'); assert.equal(lf.tripod, null);
  for (const k of ['lightsaber-chassis-archaic-lightfoil', 'lightsaber-chassis-modern-lightfoil']) assert.equal(shapeOf(owned(k)).sizeRules.beneficial.size, 'Small', k);
  assert.deepEqual({ ...shapeOf(owned('weapon-e-web-repeating-blaster')).sizeRules.tripod }, { mode: 'absolute', size: 'Large' });
  for (const k of ['weapon-e-web-missile-launcher', 'weapon-flame-cannon', 'weapon-tactical-tractor-beam']) assert.deepEqual({ ...shapeOf(owned(k)).sizeRules.tripod }, { mode: 'one-smaller', size: null }, k);
  for (const k of ['unmapped::Stunning Gauntlet', 'unmapped::Vibroknucklers']) assert.equal(shapeOf(owned(k)).sizeRules.belowWearer, 2, k);
  assert.equal(shapeOf(owned('weapon-blaster-pistol')).sizeRules, null);
  assert.equal(shapeOf(owned('weapon-vibrosword')).designedTwoHanded, true); assert.equal(shapeOf(owned('weapon-vibroblade')).designedTwoHanded, false);
  assert.equal(shapeOf(owned('weapon-concealed-dart-launcher')).worn.wearLocation, 'wrist'); assert.equal(shapeOf(owned('weapon-wrist-rocket-launcher')).worn.wearLocation, 'forearm');
  assert.equal(shapeOf(owned('weapon-wrist-blaster')).worn.wearLocation, 'wrist', 'bracelet/jewelry is a wrist item'); assert.equal(shapeOf(owned('weapon-wrist-blaster')).worn.worn, 'bracelet/jewelry');
  assert.equal(shapeOf(owned('weapon-blaster-pistol')).worn, null);
  const dk = shapeOf(owned('unmapped::Darkstick')); assert.equal(dk.heldTogether, true); assert.equal(dk.heldTogetherProfileId, 'melee-grouped');
  assert.ok(shapeOf(owned('weapon-concealed-dart-launcher')).descriptor.tokens.includes('worn-wrist'));
  ok('size rules, designed-two-handed, worn locations and the held-together rule are read from structured fields of the production records');
}
// ---- B. the shared effective-size resolver (pure) -------------------------------------------------------------------------------------
{
  const med = WS.sizeIndexOf('Medium');
  assert.deepEqual(['Small', 'Medium', 'Large', 'Huge'].map((z) => WS.classifySize(WS.sizeIndexOf(z), med)), ['light', 'one-handed', 'two-handed', 'too-large'], 'Core Rulebook p.120 for a Medium wielder');
  assert.equal(WS.classifySize(WS.sizeIndexOf('Colossal'), med), 'too-large'); assert.equal(WS.classifySize(-1, med), null);
  const R = (rules, size, actor, st) => WS.resolveEffectiveWieldingSize({ size, sizeRules: rules }, actor, st);
  const one = WS.sizeRulesOf({ tripodTreatsAsOneSizeSmallerForWielding: true }, []), abs = WS.sizeRulesOf({ tripodEffectiveSize: 'Large' }, []);
  const off = R(one, 'Huge', 'Medium', { tripodMounted: false }), on = R(one, 'Huge', 'Medium', { tripodMounted: true }), unk = R(one, 'Huge', 'Medium', {});
  assert.deepEqual([off.classification, off.legal, off.effectiveSize, off.source], ['too-large', false, 'Huge', 'base']); assert.equal(off.reason, 'too-large-to-wield');
  assert.deepEqual([on.classification, on.legal, on.effectiveSize, on.source, on.requiredHands, on.sizeDelta], ['two-handed', true, 'Large', 'tripod', 2, 1]);
  assert.deepEqual([unk.legal, unk.pending, unk.classification], [null, 'tripod', null], 'unknown tripod status is neither true nor false');
  assert.equal(R(abs, 'Huge', 'Medium', { tripodMounted: true }).effectiveSize, 'Large'); assert.equal(R(abs, 'Huge', 'Medium', { tripodMounted: true }).sizeDelta, 1, 'an absolute size is not reduced a second time');
  assert.equal(R(one, 'Huge', 'Large', { tripodMounted: true }).classification, 'one-handed');
  assert.equal(R(one, 'Gargantuan', 'Medium', { tripodMounted: true }).legal, false, 'still too large after the reduction');
  assert.equal(R(null, 'Large', 'Medium', { tripodMounted: true }).source, 'base', 'no tripod rule: mounting changes nothing');
  assert.equal(R(null, 'Huge', 'Medium', {}).legal, false);
  const ben = WS.sizeRulesOf({ mayTreatAsSizeWhenBeneficial: 'Small' }, []);
  assert.equal(R(ben, 'Medium', 'Medium', {}).classification, 'one-handed'); assert.equal(R(ben, 'Medium', 'Medium', { beneficialSizeChoice: 'Small' }).classification, 'light');
  assert.equal(R(ben, 'Medium', 'Medium', { beneficialSizeChoice: 'Tiny' }).source, 'base', 'a size the record does not allow is ignored');
  const worn = WS.sizeRulesOf({ sizeRule: 'two_sizes_smaller_than_wearer' }, []);
  assert.deepEqual([R(worn, null, 'Medium', {}).effectiveSize, R(worn, null, 'Medium', {}).classification], ['Tiny', 'light']);
  assert.equal(R(worn, null, 'Diminutive', {}).effectiveSize, 'Fine', 'clamped to the smallest canonical size'); assert.equal(R(worn, null, 'Fine', {}).effectiveSize, 'Fine');
  assert.equal(R(null, null, 'Medium', {}).classification, null, 'no size: nothing is decided'); assert.equal(R(null, 'Large', null, {}).legal, true);
  assert.equal(WS.sizeRulesOf({ sizeRule: 'three_sizes_bigger' }, []), null);
  // resolveWielding consumes the result: explicit grip > owned grip > mandatory grip; the class never overrides a legal explicit choice
  const c = OS.wieldingConstraintsOf({});
  assert.deepEqual([OS.resolveWielding(c, { sizing: on }).hands, OS.resolveWielding(c, { sizing: on }).source], [2, 'size']);
  assert.equal(OS.resolveWielding(c, { option: 1, sizing: on }).reason, 'requires-two-hands');
  assert.equal(OS.resolveWielding(c, { option: 2, sizing: R(null, 'Medium', 'Medium', {}) }).legal, true, 'a one-handed class weapon may be voluntarily wielded two-handed');
  assert.equal(OS.resolveWielding(c, { sizing: R(null, 'Medium', 'Medium', {}) }).hands, undefined, 'a one-handed class weapon leaves the grip to the wielder');
  assert.equal(OS.resolveWielding(c, { sizing: off }).reason, 'too-large-to-wield'); assert.equal(OS.resolveWielding(c, { sizing: unk }).legal, true);
  assert.equal(OS.resolveWielding(OS.wieldingConstraintsOf({ cannotWieldTwoHanded: true }), { sizing: on }).reason, 'cannot-wield-two-handed');
  ok('effective size: Core p.120 classes, tripod only when established (unknown stays pending), absolute size not double-reduced, chosen size only if allowed, worn offset clamped; resolveWielding order');
}
// ---- C. the light-weapon classification consumes the effective size (production path) -----------------------------------------------
{
  reinstall();
  const lf = owned('weapon-lightfoil'), axe = owned('unmapped::Axe'), gaunt = owned('unmapped::Stunning Gauntlet'), knuck = owned('unmapped::Vibroknucklers');
  const A = makeActor({ items: [lf, axe, gaunt, knuck] });
  assert.equal(isLight(A, lf), false, 'an unchosen "whenever beneficial" is not applied');
  assert.equal(isLight(A, lf, { beneficialSizeChoice: 'Small' }), true, 'the explicit attack option applies the choice');
  assert.equal(isLight(A, axe, { beneficialSizeChoice: 'Small' }), false, 'a weapon that declares no option cannot claim it');
  assert.equal((await S.setSizeTreatment(A, lf, 'Small')).ok, true); assert.equal(readState(lf).sizeTreatment, 'Small');
  assert.equal(isLight(A, lf), true, 'the owned choice');
  assert.equal(DW.resolve(A, { primaryWeapon: owned('weapon-blaster-pistol'), offhandWeapon: lf }).offHand.isLightWeapon, true, 'the dual-wield classifier agrees');
  assert.equal((await S.setSizeTreatment(A, lf, null)).ok, true); assert.equal(isLight(A, lf), false);
  axe.flags = { ...axe.flags, swse: { ...axe.flags.swse, fireState: { v: 1, sizeTreatment: 'Small', mounted: true } } };
  assert.equal(isLight(A, axe), false, 'forged state without a record rule is ignored');
  assert.equal(isLight(A, gaunt), true); assert.equal(isLight(A, knuck), true);
  assert.equal(isLight(makeActor({ items: [gaunt], size: 'small' }), gaunt), true);
  ok('light-weapon classification: an explicit or owned Small choice counts (only if allowed); forged state ignored; worn items are below their wearer');
}
// ---- D. owned-state API: ownership, allowed size, persistence ----------------------------------------------------------------------------
{
  reinstall();
  const lf = owned('weapon-lightfoil'), pistol = owned('weapon-blaster-pistol'), ew = owned('weapon-e-web-repeating-blaster');
  const A = makeActor({ items: [lf, pistol, ew] }); const B = makeActor({ items: [] }); B.id = 'a2';
  assert.equal((await S.setSizeTreatment(B, lf, 'Small')).reason, 'weapon-not-owned'); assert.equal(readState(lf), null);
  assert.equal((await S.setSizeTreatment(A, pistol, 'Small')).reason, 'no-size-treatment'); assert.equal((await S.setSizeTreatment(A, lf, 'Tiny')).reason, 'size-not-allowed'); assert.equal(readState(lf), null);
  const realUpd = ActorEngine.updateOwnedItems; ActorEngine.updateOwnedItems = async () => { throw new Error('rejected'); }; const warn = console.warn; console.warn = () => {};
  try { assert.equal((await S.setSizeTreatment(A, lf, 'Small')).reason, 'persist-failed'); assert.equal(readState(lf), null, 'not falsely recorded'); } finally { ActorEngine.updateOwnedItems = realUpd; console.warn = warn; }
  assert.deepEqual({ ...S.sizeTreatmentOptions(lf) }, { size: 'Small', current: null }); assert.equal(S.sizeTreatmentOptions(pistol), null);
  assert.equal((await S.setMounted(B, ew, true)).reason, 'weapon-not-owned'); assert.equal(readState(ew), null);
  assert.ok(notesOf(A, ew).some((n) => /depends on whether it is tripod mounted/.test(n)), 'unknown tripod state is reported, not decided');
  assert.equal((await S.setMounted(A, ew, true)).ok, true);
  assert.ok(notesOf(A, ew).some((n) => /^Large weapon for a Medium wielder: two-handed/.test(n) && /tripod mounted; base Huge/.test(n)));
  assert.ok(notesOf(A, ew, { mounted: false }).some((n) => /too large to wield/.test(n)), 'an explicit attack option wins over the owned state');
  await S.setMounted(A, pistol, true); assert.equal(notesOf(A, pistol).some((n) => /tripod/.test(n)), false);
  ok('size choice API: ownership, allowed size, rejected write reports persist-failed; tripod state is owner-only, shown only for weapons that declare it');
}
// ---- E. the size class in the REAL attack path (refusals happen before any roll / cost) -----------------------------------------------------
{
  reinstall();
  const vs = owned('weapon-vibrosword'); const med = makeActor({ items: [vs] }); med.system.attributes.str = ab(4);
  reset(); assert.equal(await attack(med, vs, { wieldedHands: 1 }), null, 'Large for a Medium wielder is two-handed: one hand is refused'); assert.equal(used(), 0); assert.ok(notes.warn.some((m) => /wielding/.test(m)));
  reset(); assert.ok(await attack(med, vs, {}), 'no grip chosen: the mandatory two-handed grip is established by the size class'); assert.equal(wfOf().attackShape.wieldedHands, 2); assert.deepEqual({ ...wfOf().attackShape.weaponSizeClass }, { classification: 'two-handed', effectiveSize: 'Large', source: 'base' });
  const ability = (A, w, hands) => resolveDamageComposition(A, w, { weaponForm: { identityKey: 'weapon-vibrosword', profileId: 'melee' }, wieldedHands: hands }).bonus.components.Ability ?? 0;
  assert.equal(ability(med, vs, 2), 8); assert.equal(ability(med, vs, 1), 4);
  const big = makeActor({ items: [vs], size: 'large' });
  reset(); assert.ok(await attack(big, vs, { wieldedHands: 1 })); reset(); assert.ok(await attack(big, vs, { wieldedHands: 2 }), 'one-handed class: a voluntary two-handed grip is legal');
  // a caller-supplied vehicle assertion proves nothing: the same oversized weapon is refused for a Small wielder whatever flags the options carry
  const small = makeActor({ items: [vs], size: 'small' });
  for (const forged of [{ vehicleWeapon: true }, { starshipWeapon: true }, { weaponSystem: true }, { vehicleWeapon: true, vehicleActor: { type: 'vehicle', id: 'fake', items: col([]) } }, { vehicleActor: makeActor({ items: [] }) }]) {
    reset(); assert.equal(await attack(small, vs, forged), null, `forged ${Object.keys(forged).join('+')}: refused`); assert.equal(used(), 0, 'before any cost');
  }
  reset(); assert.equal(await attack(small, vs, {}), null);
  // a genuine installation: a vehicle-type actor that owns this very weapon Item
  { const vw = owned('weapon-vibrosword'); const V = { id: 'veh1', name: 'Hull', type: 'vehicle', flags: { swse: {} }, items: col([vw]), system: { size: 'huge' } }; vw.actor = V;
    reset(); await attack(small, vw, { vehicleActor: V }); assert.equal(notes.warn.concat(notes.error).some((m) => /wielding: too large|wielding: requires two hands/.test(m)), false, 'a verified vehicle installation is not gated by the personal size class');
    const other = owned('weapon-vibrosword'); const V2 = { id: 'veh2', type: 'vehicle', flags: { swse: {} }, items: col([]), system: {} };
    reset(); assert.equal(await attack(small, other, { vehicleActor: V2 }), null, 'a vehicle that does not own the weapon is no installation'); }
  // tripod: the E-Web missile launcher (Huge) and the flame cannon (Large)
  const em = owned('weapon-e-web-missile-launcher'), fc = owned('weapon-flame-cannon'), er = owned('weapon-e-web-repeating-blaster');
  const T = makeActor({ items: [em, fc, er] });
  reset(); assert.equal(await attack(T, em, { mounted: false }), null, 'Huge and not on a tripod: too large'); assert.equal(used(), 0);
  reset(); assert.ok(await attack(T, em, { mounted: true }), 'on a tripod: treated as Large, two-handed'); assert.equal(wfOf().attackShape.wieldedHands, 2); assert.equal(wfOf().attackShape.weaponSizeClass.effectiveSize, 'Large');
  reset(); assert.equal(await attack(T, em, { mounted: true, wieldedHands: 1 }), null, 'a tripod reduces the size by ONE: Large still needs two hands');
  reset(); assert.equal(await attack(T, fc, { mounted: false, wieldedHands: 1 }), null, 'Large flame cannon off a tripod: two-handed class'); reset(); assert.ok(await attack(T, fc, { mounted: true, wieldedHands: 1 }), 'on a tripod it is Medium: one hand');
  // an unestablished tripod state is asked (once, stored) and never guessed; the answer is the SAME context for hands, size class and the carried snapshot
  const askedIds = []; const answer = (v) => rt.setSpecialPromptProvider(async (q) => { askedIds.push(q.id); return v; });
  answer(true); const em2 = owned('weapon-e-web-missile-launcher'); const T4 = makeActor({ items: [em2] });
  reset(); assert.ok(await attack(T4, em2, {})); assert.ok(askedIds.includes('requirement:mounted')); assert.equal(readState(em2).mounted, true); assert.deepEqual([wfOf().attackShape.weaponSizeClass.source, wfOf().attackShape.wieldedHands], ['tripod', 2]);
  const n0 = askedIds.length; await S.clearReload(T4, em2); reset(); assert.ok(await attack(T4, em2, {})); assert.equal(askedIds.length, n0, 'the stored answer is not asked again');
  answer(false); const em3 = owned('weapon-e-web-missile-launcher'); const T5 = makeActor({ items: [em3] }); reset(); assert.equal(await attack(T5, em3, {}), null, '"no tripod": too large'); assert.equal(used(), 0); assert.equal(readState(em3).mounted, false);
  answer(null); const em4 = owned('weapon-e-web-missile-launcher'); const T6 = makeActor({ items: [em4] }); reset(); const unk = await attack(T6, em4, {});
  assert.ok(unk, 'unanswered: not refused (unknown is not false)'); assert.equal(wfOf().attackShape.weaponSizeClass, undefined, 'and no size class is claimed'); assert.equal(readState(em4)?.mounted, undefined);
  answer(true); reset(); assert.ok(await attack(T, er, AF)); assert.equal(readState(er).mounted, true); assert.equal(wfOf().attackShape.weaponSizeClass.source, 'tripod');
  rt.setSpecialPromptProvider(async () => false); const er2 = owned('weapon-e-web-repeating-blaster'); const T2 = makeActor({ items: [er2] }); reset(); assert.equal(await attack(T2, er2, AF), null, '"no tripod": refused'); rt.setSpecialPromptProvider(null);
  const fc2 = owned('weapon-flame-cannon'); const T3 = makeActor({ items: [fc2] }); reset(); assert.ok(await attack(T3, fc2, {}), 'both answers are legal for the flame cannon: nothing is asked and nothing refused');
  // tripod-dependent GRIP: a Medium wielder's Large flame cannon is two-handed off a tripod and one-handed on one; an unanswered tripod question never authorizes the one-handed grip
  { const fcT = (extra = {}) => { const w = owned('weapon-flame-cannon'); return [makeActor({ items: [w], ...extra }), w]; };
    let [A, w] = fcT(); reset(); assert.equal(await attack(A, w, { mounted: false, wieldedHands: 1 }), null, 'tripod false + one hand: refused'); assert.equal(used(), 0);
    [A, w] = fcT(); reset(); assert.ok(await attack(A, w, { mounted: true, wieldedHands: 1 }), 'tripod true + one hand: accepted'); assert.deepEqual([wfOf().attackShape.weaponSizeClass.classification, wfOf().attackShape.wieldedHands], ['one-handed', 1]);
    [A, w] = fcT(); reset(); assert.ok(await attack(A, w, { mounted: false, wieldedHands: 2 }), 'two hands is legal either way'); assert.equal(wfOf().attackShape.weaponSizeClass.classification, 'two-handed');
    // unknown + one hand: asked once BEFORE the modifiers; the answer is the single resolved context
    const ids = []; rt.setSpecialPromptProvider(async (q) => { ids.push(q.id); return true; });
    [A, w] = fcT(); reset(); assert.ok(await attack(A, w, { wieldedHands: 1 })); assert.deepEqual(ids, ['requirement:mounted'], 'asked once'); assert.equal(readState(w).mounted, true); assert.deepEqual([wfOf().attackShape.weaponSizeClass.source, wfOf().attackShape.weaponSizeClass.classification, wfOf().attackShape.wieldedHands], ['tripod', 'one-handed', 1]);
    ids.length = 0; await S.clearReload(A, w); reset(); assert.ok(await attack(A, w, { wieldedHands: 1 })); assert.deepEqual(ids, [], 'stored: not asked again');
    rt.setSpecialPromptProvider(async () => false); [A, w] = fcT(); reset(); assert.equal(await attack(A, w, { wieldedHands: 1 }), null, 'answered "no tripod": one hand refused'); assert.equal(used(), 0);
    rt.setSpecialPromptProvider(async () => null); [A, w] = fcT(); reset(); assert.equal(await attack(A, w, { wieldedHands: 1 }), null, 'unanswered: cannot masquerade as verified one-handed use'); assert.ok(notes.warn.some((m) => /grip requires tripod confirmation/.test(m))); assert.equal(used(), 0); assert.equal(readState(w)?.mounted, undefined, 'and nothing is guessed into the owned state');
    ids.length = 0; rt.setSpecialPromptProvider(async (q) => { ids.push(q.id); return null; }); [A, w] = fcT(); reset(); assert.ok(await attack(A, w, { wieldedHands: 2 })); assert.deepEqual(ids, [], 'a grip legal under both answers asks nothing');
    reset(); assert.ok(await attack(A, w, {})); assert.deepEqual(ids, [], 'no grip stated: nothing to decide, nothing asked'); rt.setSpecialPromptProvider(null);
    // the attack-stage modifiers see the final resolved grip: the same attack bonus with the answer given up front or asked mid-attack
    [A, w] = fcT(); const bUp = await bonusOf(A, w, { mounted: true, wieldedHands: 1 });
    rt.setSpecialPromptProvider(async () => true); const [A2, w2] = fcT(); const bAsk = await bonusOf(A2, w2, { wieldedHands: 1 }); rt.setSpecialPromptProvider(null); assert.equal(bAsk, bUp); }
  // a rifle host is not a tripod
  const micro = owned('weapon-micro-grenade-launcher'), rifle = owned('weapon-blaster-rifle'); const H = makeActor({ items: [micro, rifle] });
  await S.mountOnHost(H, micro, rifle, { skillRoller: async () => ({ total: 30 }) }); assert.equal(readState(micro).mounted, undefined); assert.equal(notesOf(H, micro).some((n) => /tripod/.test(n)), false);
  // the carried size class wins over a later change of the live Item (a completed attack is never recomputed from altered state)
  { const baton = owned('unmapped::Club/Baton'); const Bt = makeActor({ items: [baton] }); Bt.system.attributes.str = ab(4);
    const form = { identityKey: 'unmapped::Club/Baton', profileId: rt.shapeOfWeapon(baton, {}).profileId };
    const ab2 = (extra) => resolveDamageComposition(Bt, baton, { weaponForm: form, wieldedHands: 2, ...extra }).bonus.components.Ability ?? 0;
    assert.equal(ab2({}), 4, 'light for a Medium wielder: not doubled'); assert.equal(ab2({ attackShape: { weaponSizeClass: { classification: 'one-handed' } } }), 8, 'the attack was resolved as NOT light: the carried class decides'); }
  // the published heavy-weapon brace: the Huge Heavy Blaster Cannon is treated as Large while braced, for a Medium or larger wielder
  { reinstall(); setRound(3); const hbc = owned('weapon-heavy-blaster-cannon'); const hb = makeActor({ items: [hbc] });
    reset(); assert.ok(await attack(hb, hbc, {}), 'Medium wielder, braced with this attack'); assert.deepEqual(spent.actions, ['swift', 'swift']);
    assert.deepEqual({ ...wfOf().attackShape.weaponSizeClass }, { classification: 'two-handed', effectiveSize: 'Large', source: 'prepared' }); assert.equal(wfOf().attackShape.wieldedHands, 2);
    reset(); assert.ok(await attack(hb, hbc, {})); assert.deepEqual(spent.actions, [], 'already braced this round'); assert.equal(wfOf().attackShape.weaponSizeClass.source, 'prepared');
    reset(); assert.equal(await attack(hb, hbc, { wieldedHands: 1 }), null, 'braced Large is two-handed for a Medium wielder');
    // a Small wielder cannot brace it either (minimum wielder size Medium)
    const hs = owned('weapon-heavy-blaster-cannon'); const sm = makeActor({ items: [hs], size: 'small' }); reset(); assert.equal(await attack(sm, hs, {}), null); assert.equal(used(), 0); assert.ok(notes.warn.some((m) => /below minimum wielder size/.test(m)));
    // a Large wielder is exempt from the brace: no actions, and it is NOT treated as braced (Huge is two-handed for it)
    const hl = owned('weapon-heavy-blaster-cannon'); const lg = makeActor({ items: [hl], size: 'large' }); reset(); assert.ok(await attack(lg, hl, {})); assert.deepEqual(spent.actions, []); assert.deepEqual([wfOf().attackShape.weaponSizeClass.source, wfOf().attackShape.weaponSizeClass.effectiveSize], ['base', 'Huge']);
    // the preparation cannot be bypassed: when its actions cannot be paid the attack is refused and no size override is granted
    reinstall({ econAllowed: false }); setRound(3); const hu = owned('weapon-heavy-blaster-cannon'); const mu = makeActor({ items: [hu] }); reset(); assert.equal(await attack(mu, hu, {}), null, 'unpayable brace: refused'); assert.equal(spent.rolls, 0);
    reinstall(); setRound(null); }
  // lightfoil: the grip stays refused whatever size is chosen; the explicit choice attacks normally
  const lf = owned('weapon-lightfoil'); const L = makeActor({ items: [lf] });
  reset(); assert.equal(await attack(L, lf, { wieldedHands: 2 }), null); assert.equal(used(), 0);
  reset(); assert.equal(await attack(L, lf, { wieldedHands: 2, beneficialSizeChoice: 'Small' }), null, 'choosing Small does not make two-handed use legal');
  reset(); assert.ok(await attack(L, lf, { wieldedHands: 1, beneficialSizeChoice: 'Small' }));
  reset(); const a0 = await bonusOf(L, lf, { wieldedHands: 1 }); const a1 = await bonusOf(L, lf, { wieldedHands: 1, beneficialSizeChoice: 'Small' }); assert.equal(a1, a0, 'no attack bonus is introduced by the choice');
  // the tripod answer given up front or asked mid-attack yields the same attack bonus (the stage modifiers are evaluated once, with the resolved context)
  { const e1 = owned('weapon-e-web-missile-launcher'), e2 = owned('weapon-e-web-missile-launcher'); const E1 = makeActor({ items: [e1] }), E2 = makeActor({ items: [e2] });
    const b1 = await bonusOf(E1, e1, { mounted: true }); answer(true); const b2 = await bonusOf(E2, e2, {}); rt.setSpecialPromptProvider(null); assert.equal(b2, b1); }
  ok('real attack path: forged vehicle flags refused, verified vehicle installation honoured; tripod resolved once (asked, never guessed) and carried; braced cannon uses its published Large size (Small cannot, Large exempt, unpayable refused); lightfoil choice adds no bonus');
}
// ---- F. Darkstick: held together = one weapon, 2d8 -- FAIL-CLOSED under E4-C1 WP5 (decision EQ-002) -----------------------------------------------
// The clean-break occupancy model gives every weapon its own appendages and cannot represent several identical weapons sharing one hand, and the
// legacy grouping depended on retired fields (equipped booleans, isOffhand). Until the owner rules on EQ-002 NO group is ever honoured: only
// the primary is held, the grouped profile cannot be selected, and no group is inferred from stored ids or from Item order.
{
  reinstall();
  const prof = () => ewp('Zq Exotic Label', { weaponIdentity: 'unmapped::Darkstick' });
  const mk = (n, extra = {}) => Array.from({ length: n }, () => owned('unmapped::Darkstick', extra));
  const profileOf = async (A, w, opt = {}) => { reset(); const r = await attack(A, w, opt); return r ? wfOf().weaponForm.profileId : null; };
  const [d1, d2, d3] = mk(3); const P = makeActor({ items: [d1, d2, d3], feats: [prof()] });
  assert.equal(shapeOf(d1).heldTogether, true, 'the canonical declaration is unchanged data'); assert.equal(shapeOf(d1).heldTogetherProfileId, 'melee-grouped');
  const opt0 = S.heldTogetherOptions(P, d1); assert.deepEqual(opt0.candidates, [], 'EQ-002: no candidate group is offered');
  // a group statement is refused and nothing is honoured
  const stored = await S.setHeldTogether(P, d1, [d2.id]);
  assert.deepEqual([stored.ok, stored.reason], [false, 'member-not-equipped'], 'a group statement is refused: members can never be held (EQ-002)');
  assert.equal(S.heldGroupOf(P, d1).ok, false); assert.equal(S.heldGroupOf(P, d1).count, 1);
  assert.equal(await profileOf(P, d1), 'melee'); assert.equal(rt.resolveCanonicalDamage(d1, { weaponForm: { identityKey: 'unmapped::Darkstick', profileId: 'melee' } }).base, '1d6');
  assert.equal(await profileOf(P, d1, { profileId: 'melee-grouped' }), null, 'the grouped profile cannot be selected'); assert.equal(used(), 0);
  // a forged / foreign stored group is no different
  { const [a, b] = mk(2); const NP = makeActor({ items: [a, b] }); a.flags = { ...a.flags, swse: { ...a.flags.swse, fireState: { v: 1, heldTogetherIds: [b.id] } } };
    assert.equal(await profileOf(NP, a), 'melee'); assert.equal(await profileOf(NP, a, { profileId: 'melee-grouped' }), null);
    const thief = makeActor({ items: [], feats: [prof()] }); thief.id = 'a9'; const [m] = mk(1); thief.items.push(m); m.actor = thief;
    assert.equal(S.heldGroupOf(thief, a).reason, 'primary-not-owned'); }
  // the thrown profile keeps its own damage; other weapons and two pistols are unaffected
  assert.equal(await profileOf(P, d1, { profileId: 'thrown' }), 'thrown');
  { const [a] = mk(1); const A = makeActor({ items: [a], feats: [prof()] }); reset(); assert.equal(await attack(A, a, { profileId: 'melee-grouped' }), null); assert.equal(used(), 0); }
  assert.equal(shapeOf(d1).operation.returnOnAttackExceedsReflexBy, 5);
  // no off-hand is inferred from Item order: with two ready sticks the planner asks for an explicit choice
  const two = DW.resolve(P, { primaryWeapon: d1 }); assert.equal(two.offHand?.weapon ?? null, null, 'no off-hand is inferred (E4-C1 WP5)');
  ok('Darkstick held-together groups fail closed (EQ-002): no candidate, no honoured group, grouped profile unselectable, thrown/other weapons unaffected, no inferred off-hand');
}
// ---- G. worn classification is shown and decides nothing else -------------------------------------------------------------------------
{
  reinstall();
  const dart = owned('weapon-concealed-dart-launcher'), rock = owned('weapon-wrist-rocket-launcher'), wb = owned('weapon-wrist-blaster'), pistol = owned('weapon-blaster-pistol');
  const A = makeActor({ items: [dart, rock, wb, pistol] });
  assert.ok(notesOf(A, dart).includes('worn on the wrist')); assert.ok(notesOf(A, rock).includes('worn on the forearm')); assert.ok(notesOf(A, wb).includes('worn on the wrist'));
  assert.equal(notesOf(A, pistol).some((n) => /^worn/.test(n)), false);
  for (const w of [dart, rock, wb]) { reset(); assert.ok(await attack(A, w, {}), 'a worn weapon attacks normally (no hand rule is invented)'); }
  assert.equal(shapeOf(dart).dualWield.wornNotHeld, false, 'a wrist location alone does not claim the hand-free / second-weapon rules');
  const gaunt = owned('unmapped::Stunning Gauntlet'); const G = makeActor({ items: [gaunt] }); reset(); assert.ok(await attack(G, gaunt, {}), 'a worn light item is not gated by size');
  // disarm protection stays with the existing authority: the gauntlet (separate published rule) is immune, the wrist weapons are not made immune by their location
  const { resolveDisarmProtection } = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-weapon-context.js');
  assert.equal((await resolveDisarmProtection(G, {})).refused, false, 'EQ-003: a worn gauntlet is not a verified READIED weapon, so the categorical protection is withheld (fail closed) until worn-weapon certification is ruled on');
  assert.equal((await resolveDisarmProtection(makeActor({ items: [owned('weapon-wrist-rocket-launcher')] }), {})).refused, false, 'a forearm location alone grants no disarm immunity');
  ok('wrist / forearm weapons are classified and shown; no hand, disarm or attack rule is invented; the below-wearer gauntlet attacks normally');
}
// ---- H. the two-handed Strength rule keeps its edges (the production-record ordering fix) --------------------------------------------------------
{
  reinstall();
  const comp = (A, w, form, extra = {}) => resolveDamageComposition(A, w, { weaponForm: form, ...extra }).bonus.components.Ability ?? 0;
  const vs = owned('weapon-vibrosword'); const vform = { identityKey: 'weapon-vibrosword', profileId: 'melee' };
  const at = (str) => { const A = makeActor({ items: [vs] }); A.system.attributes.str = ab(str); return A; };
  assert.deepEqual([comp(at(4), vs, vform, { wieldedHands: 2 }), comp(at(4), vs, vform, { wieldedHands: 1 }), comp(at(4), vs, vform, {})], [8, 4, 4], 'nonlight melee: doubled only when wielded two-handed');
  assert.deepEqual([comp(at(0), vs, vform, { wieldedHands: 2 }), comp(at(-1), vs, vform, { wieldedHands: 2 }), comp(at(-1), vs, vform, { wieldedHands: 1 })], [0, -1, -1], 'zero and negative modifiers are never doubled');
  const baton = owned('unmapped::Club/Baton'); const bf = { identityKey: 'unmapped::Club/Baton', profileId: rt.shapeOfWeapon(baton, {}).profileId }; const bA = makeActor({ items: [baton] }); bA.system.attributes.str = ab(4);
  assert.equal(comp(bA, baton, bf, { wieldedHands: 2 }), comp(bA, baton, bf, { wieldedHands: 1 }), 'a light weapon is not doubled two-handed');
  // explicit alternative ability expressions keep their meaning
  const alt = (ability) => { const w = owned('weapon-vibrosword'); w.system = { ...w.system, combat: { ...w.system.combat, damage: { ...w.system.combat.damage, ability } } }; const A = makeActor({ items: [w] }); A.system.attributes.str = ab(4); A.system.attributes.dex = ab(3); return comp(A, w, vform, { wieldedHands: 2 }); };
  assert.deepEqual([alt('none'), alt('dex'), alt('dex2'), alt('str2')], [0, 3, 6, 8], 'none / dex / dex2 / str2 are unchanged and not doubled again');
  // ranged and thrown weapons do not gain the two-handed doubling; vehicle weapons add no personal ability
  const pistol = owned('weapon-blaster-pistol'); const pA = makeActor({ items: [pistol] }); pA.system.attributes.str = ab(4);
  assert.equal(comp(pA, pistol, { identityKey: 'weapon-blaster-pistol', profileId: 'primary' }, { wieldedHands: 2 }), 0);
  const dk = owned('unmapped::Darkstick'); const dA = makeActor({ items: [dk] }); dA.system.attributes.str = ab(4);
  assert.equal(comp(dA, dk, { identityKey: 'unmapped::Darkstick', profileId: 'thrown' }, { wieldedHands: 2 }), comp(dA, dk, { identityKey: 'unmapped::Darkstick', profileId: 'thrown' }, { wieldedHands: 1 }), 'thrown: no doubling');
  const vw = owned('weapon-vibrosword'); vw.system = { ...vw.system, vehicleWeapon: true }; const vA = makeActor({ items: [vw] }); vA.system.attributes.str = ab(4);
  assert.equal(comp(vA, vw, vform, { wieldedHands: 2 }), 0, 'a vehicle weapon adds no personal Strength');
  // the Long-Handle Lightsaber's forgo-doubling choice is still the single modifier
  const lh = owned('lightsaber-chassis-longhandle'); const lA = makeActor({ items: [lh] }); lA.system.attributes.str = ab(4);
  assert.equal(comp(lA, lh, { identityKey: 'lightsaber-chassis-longhandle', profileId: 'two-handed-base-override' }, { wieldedHands: 2, attackShape: { wieldedHands: 2, forgoDoubleStrength: true } }), 4);
  ok('two-handed Strength rule: doubled only for nonlight melee wielded two-handed; zero / negative, light, explicit ability, ranged, thrown, vehicle and forgo-doubling cases unchanged');
}
} finally { noRealAmmo(); restoreHarness(); setRound(null); }
console.log(`weapon-phase-5d-i-d-b2-wielding-size: ${step} checks passed`);
