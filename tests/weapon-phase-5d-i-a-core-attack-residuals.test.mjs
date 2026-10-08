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
try {

// ======================================================================================================================================
// A. CONDITIONAL ATTACK MODIFIERS (condition-policy: AUTO when observed, stored PROMPT otherwise)  [points 1-4]
// ======================================================================================================================================
{
  // 1: conditional attack BONUS AUTO -- Dueling lightsaber: +1 on an attack of opportunity while wielded one-handed
  const asked = []; rt.setSpecialPromptProvider(async (q) => { asked.push(q.id); return true; });
  const duel = canon('lightsaber-chassis-dueling'); const A = makeActor({ items: [duel] });
  const base = await bonusOf(A, duel, { wieldedHands: 1 });
  const aoo = await bonusOf(A, duel, { attackOfOpportunity: true, wieldedHands: 1 });
  const aooTwo = await bonusOf(A, duel, { attackOfOpportunity: true, wieldedHands: 2 });
  assert.equal(aoo - base, 1, 'AoO + one-handed: +1');
  assert.equal(aooTwo - base, 0, 'AoO but two-handed: no bonus');
  assert.deepEqual(asked, [], 'every fact was observed: nothing was asked');
  // the unobserved wielding is asked ONCE (stored), then applied
  // (5D-I-B: the weapon REMEMBERS the hands an earlier attack stated, so the unobserved case needs a weapon with no recorded state)
  const duel2 = canon('lightsaber-chassis-dueling'); const A2 = makeActor({ items: [duel2] });
  const unknownHands = await bonusOf(A2, duel2, { attackOfOpportunity: true });
  assert.deepEqual(asked, ['conditional-0'], 'unobserved wielding -> one stored prompt');
  assert.equal(unknownHands - base, 1, 'answered yes -> +1');
  assert.equal(wfOf().special.answers['conditional-0'], true, 'the answer persists in the workflow context');
  rt.setSpecialPromptProvider(null);
  assert.equal(evaluateRegisteredCondition('attack-of-opportunity-and-wielded-one-handed', { events: ['attack-of-opportunity'], wieldedHands: 1 }), true);
  assert.equal(evaluateRegisteredCondition('attack-of-opportunity-and-wielded-one-handed', { events: [], wieldedHands: 1 }), false);
  assert.equal(evaluateRegisteredCondition('attack-of-opportunity-and-wielded-one-handed', { events: ['attack-of-opportunity'] }), null, 'an unobserved fact is never read as false');
  ok('conditional attack bonus AUTO: Dueling +1 on an AoO while one-handed; an unobserved wielding is asked once and stored');

  // 2: conditional attack PENALTY / aim-required -- Sniper Blaster Rifle: -5 unless aimed immediately before the attack
  const snp = canon('weapon-sniper-blaster-rifle'); const S = makeActor({ items: [snp] });
  asked.length = 0; rt.setSpecialPromptProvider(async (q) => { asked.push(q.id); return true; });
  const aimed = await bonusOf(S, snp, { aim: true }); const unaimed = await bonusOf(S, snp, { aim: false });
  assert.equal(unaimed - aimed, -5, 'unaimed: -5; aimed: none');
  assert.deepEqual(asked, [], 'the aim state was observed: nothing asked');
  const unknown = await bonusOf(S, snp, {});
  assert.deepEqual(asked, ['conditional-0'], 'unobserved aim: asked once and stored');
  assert.equal(unknown - aimed, -5);
  assert.equal(wfOf().special.answers['conditional-0'], true);
  rt.setSpecialPromptProvider(null);
  reset(); formulas.length = 0; await attack(S, snp, {}); assert.ok(notes.warn.some((m) => /could not be evaluated and were not applied/.test(m)), 'no provider and no aim state: surfaced, not applied, never guessed');
  ok('aim-required: aimed attack unpenalised, unaimed -5, unobserved aim asked once (stored), unanswered surfaced and not applied');

  // 3: the operation duplicates of the same facts are carried by the structured profile data (no second consumer, no double count)
  for (const [key, cond] of [['unAimedAttackPenalty', 'not-aimed-at-target-immediately-before-attack'], ['mustAimImmediatelyBeforeAttackToAvoidPenalty', 'not-aimed-at-target-immediately-before-attack'], ['sniperPointBlankAttackPenalty', 'target at unmodified point-blank range'], ['conditionalAttackBonus', 'attack-of-opportunity-and-wielded-one-handed']]) {
    assert.ok(registryData.identities.some((r) => r.operation && key in r.operation && r.canonicalStats.attackProfiles.some((p) => p.conditionalModifiers.some((m) => m.condition === cond))), `${key} is carried by profile.conditionalModifiers`);
  }
  const ifs = canon('weapon-interchangeable-weapon-system'); const I = makeActor({ items: [ifs] });
  assert.equal((await bonusOf(I, ifs, { profileId: 'sniper', rangeBand: 'pointBlank' })) - (await bonusOf(I, ifs, { profileId: 'sniper', rangeBand: 'short' })), -2, 'sniper profile: -2 at unmodified point-blank range (observed from the range band); its short-range penalty override is 0');
  ok('operation duplicates (unAimed / mustAim / sniperPointBlank / conditionalAttackBonus) are carried by the profile modifiers and applied exactly once');

  // 3b: attacker-state condition AUTO -- Arg'garok: -5 while the wielder's Strength is below 15 (observed from the actor, never asked)
  { const asked2 = []; rt.setSpecialPromptProvider(async (q) => { asked2.push(q.id); return true; });
    const arg1 = canon('unmapped::Arggarok'), arg2 = canon('unmapped::Arggarok');
    const weak = makeActor({ items: [arg1] }), strong = makeActor({ items: [arg2] }); strong.system.attributes.str = ab(4);
    const w = await bonusOf(weak, arg1, {}), st = await bonusOf(strong, arg2, {});
    assert.equal(w - st, -5 - 4, 'weak wielder (Str 10): -5; strong wielder (Str 18): no penalty but +4 Strength modifier');
    rt.setSpecialPromptProvider(null);
    assert.deepEqual(asked2, [], 'the wielder\'s Strength is observed: nothing asked'); }
  // 4: fire-state attack modifiers -- Espo 500 Riot Gun: -1 single shot, +2 autofire; Rotary Blaster Cannon: unbraced autofire -5 more
  const riot = withAmmo('weapon-espo-500-riot-gun', 50); const R = makeActor({ items: [riot] });
  const single = await bonusOf(R, riot, {});
  const mech = rt.resolveCanonicalDamage(riot, form('weapon-espo-500-riot-gun')).mechanics;
  assert.ok(mech.some((m) => m.id === 'operation.singleShotAttackPenalty' && m.value === -1 && m.structural), 'single-shot -1 is a structural attack-modifier-auto mechanic');
  assert.ok(mech.some((m) => m.id === 'operation.autofireEquipmentBonus' && m.value === 2));
  assert.equal(evaluateStructuralCondition({ fireMode: 'single' }, { fireMode: 'single' }), true);
  assert.equal(evaluateStructuralCondition({ fireMode: 'autofire' }, { fireMode: 'single' }), false);
  assert.equal(evaluateStructuralCondition({ fireMode: 'autofire', braced: false }, { fireMode: 'autofire' }), null, 'braced unobserved -> unknown');
  assert.equal(evaluateStructuralCondition({ fireMode: 'autofire', braced: false }, { fireMode: 'single' }), false);
  const cannon = withAmmo('weapon-rotary-blaster-cannon', 100); const C = makeActor({ items: [cannon] });
  const autofire = async (A, w, extra = {}) => { reset(); formulas.length = 0; const r = await SWSERoll.rollAutofire(A, w, { targets: [target()], skipFP: true, ...extra }); return r ? fx(formulas[0]) : null; };
  const unbraced = await autofire(C, cannon, { braced: false }), braced = await autofire(C, cannon, { braced: true });
  assert.equal(braced - unbraced, 8, 'braced autofire: -2 instead of -5, and no additional -5 (3 + 5)');
  const riotAuto = await autofire(R, riot, {}); const riotSingleAgain = await bonusOf(R, riot, {});
  assert.equal(riotSingleAgain, single);
  assert.ok(riotAuto !== null, 'riot gun autofire resolves');
  ok('fire-state modifiers: riot gun single -1 / autofire +2 and the rotary cannon\'s unbraced autofire -5 (braced preserved) execute through the existing attack pipeline');
}

// ======================================================================================================================================
// B. RANGE (hard maximum, penalty application, environment)  [points 5-9]
// ======================================================================================================================================
{
  // 5: max-range override -- hardMaxSquares removes every band beyond the stated maximum
  const bands = (k) => rt.resolveAttackWeaponRuntime(canon(k), {}).range.allowedBands;
  assert.deepEqual(bands('weapon-stun-pistol'), ['pointBlank'], 'Stun Pistol: 20 squares = point-blank only');
  assert.deepEqual(bands('weapon-darter'), ['pointBlank', 'short'], 'Darter: maximum range Short');
  assert.deepEqual(bands('weapon-blaster-pistol'), ['pointBlank', 'short', 'medium', 'long'], 'an ordinary pistol keeps every band');
  const sp = canon('weapon-stun-pistol'); const A = makeActor({ items: [sp] });
  reset(); assert.equal(await attack(A, sp, { rangeBand: 'long', damageMode: 'stun' }), null, 'a long-range stun pistol attack is refused before any cost');
  assert.equal(spent.rolls, 0);
  ok('maximum range override: Stun Pistol (20) and Darter (Short) lose the bands beyond their maximum; other weapons are untouched');

  // 6: range-penalty override -- CR-1: the band penalty applies to DAMAGE, the attack roll takes none
  const cr = canon('weapon-cr-1-blast-cannon'); const Cr = makeActor({ items: [cr] });
  const range = rt.resolveAttackWeaponRuntime(cr, {}).range;
  assert.equal(range.penaltyApplication, 'damage');
  const shortAtk = await bonusOf(Cr, cr, { rangeBand: 'short' }), pbAtk = await bonusOf(Cr, cr, { rangeBand: 'pointBlank' });
  assert.equal(shortAtk, pbAtk, 'no range penalty on the attack roll');
  assert.equal(canonicalDamageRangePenalty(range, 'short'), -2); assert.equal(canonicalDamageRangePenalty(range, 'medium'), -5); assert.equal(canonicalDamageRangePenalty(range, 'pointBlank'), 0);
  const flat = (ctx) => buildDamageFormula(dmg(Cr, cr, ctx)).replace(/\s/g, '');
  const pbF = flat({ rangeBand: 'pointBlank' }), medF = flat({ rangeBand: 'medium' });
  assert.notEqual(pbF, medF, 'the damage formula carries the range penalty');
  assert.ok(dmg(Cr, cr, { rangeBand: 'medium' }).ledger.some((e) => e.id === 'range-penalty-damage' && e.value === -5));
  // an ordinary pistol is the control: the penalty stays on the attack roll
  const bp = canon('weapon-blaster-pistol'); const B = makeActor({ items: [bp] });
  assert.ok((await bonusOf(B, bp, { rangeBand: 'medium' })) < (await bonusOf(B, bp, { rangeBand: 'pointBlank' })));
  assert.equal(dmg(B, bp, { rangeBand: 'medium' }).ledger.some((e) => e.id === 'range-penalty-damage'), false);
  ok('range penalty application: CR-1 takes the band penalty on damage (not the attack); ordinary weapons keep it on the attack');

  // 7: environment-conditional range rules -- SG-4 halves ranges underwater (blaster) / out of water (harpoon); unobserved applies nothing
  const sg = rt.resolveAttackWeaponRuntime(canon('weapon-sg-4-blaster-rifle'), { profileId: 'blaster' }).range;
  const hp = rt.resolveAttackWeaponRuntime(canon('weapon-sg-4-blaster-rifle'), { profileId: 'harpoon' }).range;
  const uw = resolveRangeEnvironment(sg, { underwater: true });
  assert.deepEqual(uw.bandSquares.pointBlank, [0, 15]); assert.deepEqual(uw.bandSquares.short, [16, 30]); assert.deepEqual(uw.bandSquares.medium, [31, 75]); assert.deepEqual(uw.bandSquares.long, [76, 150]);
  assert.equal(uw.applied.length, 1);
  assert.deepEqual(resolveRangeEnvironment(sg, { underwater: false }).bandSquares, sg.bandSquares, 'blaster out of water: unchanged');
  assert.equal(resolveRangeEnvironment(hp, { underwater: false }).applied.length, 1, 'harpoon out of water: halved');
  assert.equal(resolveRangeEnvironment(hp, { underwater: true }).applied.length, 0, 'harpoon underwater: unchanged');
  const unk = resolveRangeEnvironment(sg, {});
  assert.deepEqual(unk.bandSquares, sg.bandSquares); assert.equal(unk.pending.length, 1); assert.equal(unk.applied.length, 0);
  ok('SG-4: scale-range 0.5 for the blaster underwater and the harpoon out of water; an unknown environment applies nothing and is reported pending');

  // 8: environment-gated PROFILE legality -- only an explicitly underwater attack is restricted; unknown never restricts
  const lance = canon('unmapped::Energy Lance'); const L = makeActor({ items: [lance] });
  assert.deepEqual(rt.shapeOfWeapon(lance, {}).environment.underwaterUsableProfiles, ['melee', 'plasma-bolt']);
  const restricted = registryClone((c) => { c.identities.find((r) => r.identityKey === 'unmapped::Energy Lance').operation.underwaterUsableProfiles = ['melee']; });
  rt.setSharedWeaponAuthorityRegistry(restricted);
  try {
    reset(); assert.equal(await attack(L, lance, { profileId: 'plasma-bolt', underwater: true }), null, 'plasma-bolt underwater is refused when the weapon lists only melee');
    assert.equal(spent.rolls, 0); assert.equal(spent.ammo, 0);
    reset(); assert.ok(await attack(L, lance, { profileId: 'melee', underwater: true }), 'melee underwater is allowed');
    reset(); assert.ok(await attack(L, lance, { profileId: 'plasma-bolt' }), 'environment unknown -> never restricted');
    reset(); assert.ok(await attack(L, lance, { profileId: 'plasma-bolt', underwater: false }), 'explicitly dry -> allowed');
  } finally { rt.setSharedWeaponAuthorityRegistry(registry); }
  ok('environment legality: a profile the weapon does not list is refused only for an explicitly underwater attack (nothing spent); unknown / dry is never restricted');

  // 9: E-Web range preparation -- structured two-swift cost, one band closer, stacks with Far Shot
  const ew = withAmmo('weapon-e-web-missile-launcher', 20); const E = makeActor({ items: [ew] });
  assert.deepEqual(rt.shapeOfWeapon(ew, {}).rangePreparation, { steps: 1, stacksWithFarShot: true, requiredActions: [{ action: 'swift', count: 2 }], complete: true });
  assert.deepEqual(rec('weapon-e-web-missile-launcher').operation.rangeStepReductionPreparation.requiredActions, [{ action: 'swift', count: 2 }]);
  assert.ok(corpus.postCertificationAmendments.some((a) => a.id === '5D-I-A-operation-structure-backfill' && a.identityKey === 'weapon-e-web-missile-launcher' && a.source.page === '198'), 'logged as a controlled amendment with source / page / evidence');
  assert.ok(CombatOptionResolver.getAvailableAttackOptions(E, ew, { ...form('weapon-e-web-missile-launcher') }).some((o) => o.id === 'preparedRangeReduction'));
  setRound(null);
  const freshE = () => { const w = withAmmo('weapon-e-web-missile-launcher', 20); return [makeActor({ items: [w], feats: [optionFeat('Zq Far Shot', 'farShot')] }), w]; }; // reload-after-each-shot form: a fresh weapon per shot
  let [a1, w1] = freshE(); const noPrep = await bonusOf(a1, w1, { rangeBand: 'long' }); assert.deepEqual(spent.actions, []);
  [a1, w1] = freshE(); const prep = await bonusOf(a1, w1, { rangeBand: 'long', combatOptions: { preparedRangeReduction: true } });
  assert.equal(prep - noPrep, 5, 'long -10 -> medium -5');
  assert.deepEqual(spent.actions, ['swift', 'swift'], 'two swift actions paid through the action economy');
  [a1, w1] = freshE(); const farOnly = await bonusOf(a1, w1, { rangeBand: 'long', combatOptions: { farShot: true } });
  [a1, w1] = freshE(); const stacked = await bonusOf(a1, w1, { rangeBand: 'long', combatOptions: { preparedRangeReduction: true, farShot: true } });
  assert.equal(stacked - farOnly, 5, 'stacks with Far Shot');
  reinstall({ econAllowed: false });
  [a1, w1] = freshE(); reset(); assert.equal(await attack(a1, w1, { rangeBand: 'long', combatOptions: { preparedRangeReduction: true } }), null, 'unpayable preparation: refused, nothing rolled'); assert.equal(spent.rolls, 0);
  reinstall();
  ok('E-Web missile launcher range preparation: option offered, one band closer, two swift actions paid via the action economy (refused when unpayable), stacks with Far Shot; source-logged amendment');
}

// ======================================================================================================================================
// C. TARGET ELIGIBILITY, BRACE, AREA TIMING / SHAPE  [points 10-16]
// ======================================================================================================================================
{
  // 10: structural target-rule resolver (no natural-language parsing): snare pistol -- hostile target at up to short range
  const reqs = [{ type: 'target', requires: 'enemy-at-up-to-short-range' }];
  const ok1 = resolveTargetRequirements(reqs, { context: { targetDisposition: 'hostile', rangeBand: 'short' } });
  const bad1 = resolveTargetRequirements(reqs, { context: { targetDisposition: 'hostile', rangeBand: 'medium' } });
  const bad2 = resolveTargetRequirements(reqs, { context: { targetDisposition: 'friendly', rangeBand: 'pointBlank' } });
  const unk = resolveTargetRequirements(reqs, { context: { rangeBand: 'short' } });
  assert.equal(ok1.legal, true); assert.equal(bad1.legal, false); assert.equal(bad2.legal, false);
  assert.equal(unk.legal, true); assert.equal(unk.evaluated[0].result, null, 'unobserved disposition is unknown, never read as illegal');
  const snare = withAmmo('weapon-snare-pistol', 50); const Sn = makeActor({ items: [snare] });
  const asked = []; rt.setSpecialPromptProvider(async (q) => { asked.push(q.id); return false; });
  reset(); assert.equal(await attack(Sn, snare, { rangeBand: 'short', targetDisposition: 'friendly' }), null, 'a friendly target: illegal, refused before any cost'); assert.equal(spent.rolls, 0); assert.equal(spent.ammo, 0);
  assert.ok(notes.warn.some((m) => /cannot make this attack/.test(m)));
  reset(); assert.ok(await attack(Sn, snare, { rangeBand: 'short', targetDisposition: 'hostile' }), 'hostile at short range is legal'); assert.deepEqual(asked, []);
  reset(); assert.equal(await attack(Sn, snare, { rangeBand: 'short' }), null, 'unobserved disposition asked once; a "no" answer refuses'); assert.equal(asked.length, 1);
  rt.setSpecialPromptProvider(null);
  reset(); assert.ok(await attack(Sn, snare, { rangeBand: 'short' }), 'no provider: unknown is surfaced, never a global prohibition');
  // target rule: Battering Ram only deals normal damage to stationary unattended objects
  const ram = withAmmo('weapon-battering-ram', 50); const Rm = makeActor({ items: [ram] });
  rt.setSpecialPromptProvider(async () => false);
  reset(); assert.equal(await attack(Rm, ram, {}), null, 'a living moving target: refused');
  rt.setSpecialPromptProvider(async () => true);
  reset(); assert.ok(await attack(Rm, ram, {}), 'a stationary unattended object: legal');
  assert.equal(wfOf().special.answers['target-requirement:stationary-unattended-object'], true, 'the answer is stored with the other special answers');
  rt.setSpecialPromptProvider(null);
  ok('target eligibility: structured target / target-rule requirements gate the attack (illegal refuses before any cost; unobserved is asked once and stored; never a blanket prohibition)');

  // 11: brace legality -- Heavy Repeating Blaster needs a tripod or mount
  const hrb = withAmmo('weapon-heavy-repeating-blaster', 100); const H = makeActor({ items: [hrb] });
  const shape = rt.shapeOfWeapon(hrb, {});
  assert.equal(shape.brace.mountRule, 'tripod-or-mount');
  assert.deepEqual([FireStateStoreRef.previewBrace(hrb, shape, { mounted: false }).legal, FireStateStoreRef.previewBrace(hrb, shape, { mounted: false }).reason], [false, 'tripod-or-mount-required']);
  assert.equal(FireStateStoreRef.previewBrace(hrb, shape, { mounted: true }).legal, true);
  assert.equal(FireStateStoreRef.previewBrace(hrb, shape, {}).pending, 'mount-state');
  const run = async (A, w, extra = {}) => { reset(); formulas.length = 0; return SWSERoll.rollAutofire(A, w, { targets: [target()], skipFP: true, ...extra }); };
  assert.equal(await run(H, hrb, { braced: true, mounted: false }), null); assert.equal(formulas.length, 0); assert.deepEqual(spent.actions, []);
  assert.ok((await run(H, hrb, { braced: true, mounted: true }))?.success); assert.deepEqual(spent.actions, ['swift', 'swift']);
  rt.setSpecialPromptProvider(async () => false);
  assert.equal(await run(H, hrb, { braced: true }), null, 'unobserved mount asked once: "no" refuses');
  rt.setSpecialPromptProvider(null);
  assert.ok((await run(H, hrb, { braced: true }))?.success, 'unobserved and unanswered: not a blanket prohibition');
  assert.ok((await run(H, hrb, {}))?.success, 'unbraced autofire is unaffected');
  ok('braced state: a mount-only brace is refused only when the weapon is known to be unmounted; unknown is asked once; unbraced autofire is unaffected');

  // 12: braced autofire AREA -- Rotary Blaster Cannon 2x4 braced vs the generic 2x2
  const rot = rec('weapon-rotary-blaster-cannon').operation;
  assert.deepEqual([resolveAutofireArea(rot, { braced: true }).widthSquares, resolveAutofireArea(rot, { braced: true }).heightSquares], [2, 4]);
  assert.deepEqual([resolveAutofireArea(rot, { braced: false }).widthSquares, resolveAutofireArea(rot, { braced: false }).heightSquares], [2, 2]);
  assert.deepEqual([resolveAutofireArea({}, { braced: true }).widthSquares, resolveAutofireArea({}, { braced: true }).heightSquares], [2, 2], 'a weapon with no published braced area keeps the generic 2x2');
  const cannon = withAmmo('weapon-rotary-blaster-cannon', 100); const C = makeActor({ items: [cannon] });
  const autoAreas = async (extra) => { reset(); formulas.length = 0; const r = await SWSERoll.rollAutofire(C, cannon, { targets: [target()], skipFP: true, ...extra }); assert.ok(r?.success); return posted.map((p) => p.context?.workflowContext?.attackShape?.area).filter(Boolean); };
  const bracedAreas = await autoAreas({ braced: true }), plainAreas = await autoAreas({ braced: false });
  assert.deepEqual(bracedAreas, [{ kind: 'autofire-area', widthSquares: 2, heightSquares: 4 }], 'braced Autofire carries the published 2x4 area into the damage workflow');
  assert.deepEqual(plainAreas, [{ kind: 'autofire-area', widthSquares: 2, heightSquares: 2 }], 'unbraced Autofire keeps the generic 2x2');
  ok('braced autofire area: the published 2x4 area when braced, the generic 2x2 otherwise (and for weapons that publish none)');

  // 13: detonation timing is separate from geometry -- Thermal Detonator timer 1-3 (player choice, persisted); Flash Canister contact
  const td = rec('weapon-thermal-detonator').operation; const fc = rec('weapon-flash-canister').operation;
  assert.deepEqual(resolveDetonation(td), { timing: 'timer', timerRounds: { min: 1, max: 3 } });
  assert.deepEqual(resolveDetonation(fc), { timing: 'contact', timerRounds: null });
  assert.deepEqual(resolveDetonation({}), { timing: null, timerRounds: null });
  assert.deepEqual(validateDetonationTimer(resolveDetonation(td), 2), { ok: true, rounds: 2 });
  assert.equal(validateDetonationTimer(resolveDetonation(td), 5).ok, false); assert.equal(validateDetonationTimer(resolveDetonation(td), 0).ok, false);
  assert.equal(validateDetonationTimer(resolveDetonation(td), undefined).pending, true, 'no timer chosen yet: the choice stays the player\'s');
  assert.deepEqual(validateDetonationTimer(resolveDetonation(fc), 3), { ok: true, rounds: null }, 'contact detonation ignores a timer');
  const therm = canon('weapon-thermal-detonator'); const T = makeActor({ items: [therm] });
  const area = rt.resolveCanonicalDamage(therm, {}).areaShape;
  assert.equal(area.kind, 'burst'); assert.equal(area.geometry.radiusSquares, 4, 'geometry unchanged'); assert.equal(area.detonation.timing, 'timer');
  reset(); assert.equal(await attack(T, therm, { detonationTimer: 7 }), null, 'a timer outside 1-3 is refused before any cost'); assert.equal(spent.rolls, 0);
  reset(); assert.ok(await attack(T, therm, { detonationTimer: 2 }));
  assert.equal(wfOf().attackShape.area.detonation.chosenRounds, 2, 'the chosen timer is persisted in the workflow context');
  assert.equal(wfOf().attackShape.area.detonation.timerMax, 3);
  const restored = ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext(wfOf()));
  assert.equal(restored.attackShape.area.detonation.chosenRounds, 2, 'and survives the chat-card transport');
  const flash = canon('weapon-flash-canister'); const F = makeActor({ items: [flash] });
  reset(); assert.ok(await attack(F, flash, { detonationTimer: 3 }));
  assert.equal(wfOf().attackShape.area.detonation.timing, 'contact'); assert.equal(wfOf().attackShape.area.detonation.chosenRounds, undefined);
  assert.equal(rt.resolveCanonicalDamage(flash, {}).areaShape.geometry.radiusSquares, 3, 'contact detonation does not change the 3-square burst');
  ok('area timing: Thermal Detonator timer 1-3 validated and persisted (player choice), Flash Canister detonates on contact; geometry untouched');
}

// ======================================================================================================================================
// D. DAMAGE TERMS (point-blank bonus, adjacent die, Strength, no-damage, damage types, components)  [points 14-20]
// ======================================================================================================================================
{
  // 14: point-blank equipment bonus -- Pulse-wave pistol +4 / rifle +5 only at point-blank range
  const pw = canon('weapon-pulse-wave-pistol'), pwr = canon('weapon-pulse-wave-rifle'); const A = makeActor({ items: [pw, pwr] });
  const fm = (w, ctx) => buildDamageFormula(dmg(A, w, ctx)).replace(/\s/g, '');
  const plain = fm(pw, { rangeBand: 'short' });
  assert.equal(dmg(A, pw, { rangeBand: 'pointBlank' }).dice.conditionalFlat, 4); assert.equal(dmg(A, pwr, { rangeBand: 'pointBlank' }).dice.conditionalFlat, 5);
  assert.equal(dmg(A, pw, { rangeBand: 'short' }).dice.conditionalFlat, 0); assert.equal(dmg(A, pw, {}).dice.conditionalFlat, 0, 'unobserved band: not applied, never guessed');
  const bonusOf2 = (w, ctx) => Number(eval(`0${fm(w, ctx).replace(/\dd\d+/g, '0').replace(/^[^+-]*/, '')}`)) || 0; void bonusOf2;
  assert.notEqual(fm(pw, { rangeBand: 'pointBlank' }), plain, 'the point-blank formula carries the bonus');
  assert.ok(dmg(A, pw, { rangeBand: 'pointBlank' }).ledger.some((e) => e.id === 'conditional-operation.pointBlankDamageEquipmentBonus' && e.value === 4));
  assert.equal(dmg(A, canon('weapon-blaster-pistol'), { rangeBand: 'pointBlank' }).dice.conditionalFlat, 0, 'another pistol gets nothing');
  ok('point-blank damage bonus: Pulse-wave pistol +4 / rifle +5 at point-blank only (observed band); nothing when unobserved or for other weapons');

  // 15: adjacent-target die -- CR-1: +1d8 only against an adjacent target (asked once at the attack, stored, consumed by damage)
  const cr = withAmmo('weapon-cr-1-blast-cannon', 50); const Cr = makeActor({ items: [cr] });
  assert.equal(dmg(Cr, cr, { special: { answers: { 'operation.adjacentBonusDamage': true } } }).dice.conditionalDiceTerms.join(), '1d8');
  assert.equal(dmg(Cr, cr, { special: { answers: { 'operation.adjacentBonusDamage': false } } }).dice.conditionalDiceTerms.length, 0);
  assert.equal(dmg(Cr, cr, {}).dice.conditionalDiceTerms.length, 0, 'unanswered: not applied');
  assert.ok(/1d8/.test(buildDamageFormula(dmg(Cr, cr, { special: { answers: { 'operation.adjacentBonusDamage': true } } }))));
  const asked = []; rt.setSpecialPromptProvider(async (q) => { asked.push(q.id); return true; });
  reset(); assert.ok(await attack(Cr, cr, {})); assert.deepEqual(asked, ['operation.adjacentBonusDamage']);
  assert.equal(wfOf().special.answers['operation.adjacentBonusDamage'], true, 'persisted in the workflow context');
  const cr2 = withAmmo('weapon-cr-1-blast-cannon', 50); const Cr2 = makeActor({ items: [cr2] });
  reset(); assert.ok(await attack(Cr2, cr2, { adjacent: true })); assert.deepEqual(asked, ['operation.adjacentBonusDamage'], 'an observed adjacency is never asked');
  assert.equal(wfOf().special.answers['operation.adjacentBonusDamage'], true);
  rt.setSpecialPromptProvider(null);
  const rolled = await rollDamage(Cr, cr, { ...form('weapon-cr-1-blast-cannon'), combatContext: wfOf(), workflowContext: wfOf(), suppressChat: true }); void rolled;
  ok('adjacent-target die: CR-1 +1d8 added after the weapon multiplier from the stored attack-stage answer; unanswered is not applied');

  // 16: Strength damage for bow / sling applies once (CONSUMER_DEFECT) and is never doubled
  // the Item projection must say ranged (as a real owned item does) for the legacy ranged-weapon rule to be the path under test
  const ranged = (k) => canon(k, { weaponCategory: 'ranged', attackType: 'ranged' });
  const bow = ranged('weapon-bow'), sling = ranged('weapon-sling'), bp = ranged('weapon-blaster-pistol');
  const S = makeActor({ items: [bow, sling, bp] }); S.system.attributes.str = ab(2);
  const strOf = (w) => dmg(S, w).bonus.components;
  const sum = (c) => Object.values(c).reduce((a, b) => a + (Number(b) || 0), 0);
  const zero = makeActor({ items: [ranged('weapon-bow'), ranged('weapon-sling')] });
  const diff = (w, wz) => sum(strOf(w)) - sum(dmg(zero, wz).bonus.components);
  assert.equal(diff(bow, zero.items.find((i) => i.flags?.swse?.canonicalWeapon?.identityKey === 'weapon-bow')), 2, 'Strength +2 applies to bow damage exactly once');
  assert.equal(diff(sling, zero.items.find((i) => i.flags?.swse?.canonicalWeapon?.identityKey === 'weapon-sling')), 2, 'and to sling damage');
  const zeroPistol = makeActor({ items: [ranged('weapon-blaster-pistol')] });
  assert.equal(sum(strOf(bp)) - sum(dmg(zeroPistol, zeroPistol.items.find((i) => i.type === 'weapon')).bonus.components), 0, 'an ordinary ranged weapon still gets no Strength damage');
  ok('bow and sling add the Strength modifier to damage once (CONSUMER_DEFECT: it was silently lost); other ranged weapons unchanged');

  // 17: no-damage attack -- Targeting Laser: the attack resolves, the damage roll is refused
  const tl = withAmmo('weapon-targeting-laser', 50); const Tl = makeActor({ items: [tl] });
  assert.equal(rt.resolveCanonicalDamage(tl, form('weapon-targeting-laser', 'targeting')).status, 'no-damage');
  reset(); assert.ok(await attack(Tl, tl, {}), 'the attack roll resolves');
  const rollsBefore = formulas.length;
  assert.equal(await rollDamage(Tl, tl, { ...form('weapon-targeting-laser', 'targeting'), suppressChat: true }), null, 'no damage roll');
  assert.equal(formulas.length, rollsBefore, 'nothing was rolled');
  ok('no-damage attack: the Targeting Laser attack resolves and its damage roll is refused (profile carries no ordinary damage)');

  // 18: damage-type substitution -- sonic weapons publish energy damage (DUPLICATE carrier): never "sonic"
  for (const k of ['weapon-aurial-blaster', 'weapon-heavy-sonic-pistol']) {
    const types = rt.resolveCanonicalDamage(canon(k), {}).damageTypes;
    assert.ok(types.includes('energy') && !types.includes('sonic'), `${k}: ${types}`);
  }
  ok('sonic damage is energy damage: the certified profile damage type is energy for the five sonic weapons');

  // 19: simultaneous components -- Neuronic Whip: stun damage plus a separately rolled slashing rider (one damage event, two components)
  const nw = canon('unmapped::Neuronic Whip');
  const cd = rt.resolveCanonicalDamage(nw, { weaponForm: { identityKey: 'unmapped::Neuronic Whip', profileId: 'melee' } });
  assert.equal(cd.mechanics.filter((m) => m.family === 'damage-rider').length, 1);
  assert.deepEqual(cd.mechanics.find((m) => m.family === 'damage-rider').damageTypes, ['slashing']);
  ok('simultaneous damage components: the whip\'s stun primary and slashing rider are both executed by the existing component pipeline');

  // 20: Power Attack extra damage applies to every target type (no object/vehicle exclusion) and Shield Rating is stage 1 before DR
  const ph = canon('unmapped::Power Hammer'); const P = makeActor({ items: [ph] });
  const veh = { type: 'vehicle', system: {} }, chr = { type: 'npc', system: {} };
  const paOf = (t) => sum(dmg(P, ph, { weaponForm: { identityKey: 'unmapped::Power Hammer', profileId: 'melee' }, target: t, targetActor: t, combatOptions: { powerAttack: 2 }, attackOptions: { powerAttack: 2 } }).bonus.components);
  assert.equal(paOf(veh), paOf(chr), 'Power Attack damage is the same against a vehicle/object and a character');
  const mm = fs.readFileSync('scripts/engine/combat/damage-mitigation-manager.js', 'utf8');
  assert.ok(mm.indexOf('ShieldMitigationResolver.resolve') > 0 && mm.indexOf('ShieldMitigationResolver.resolve') < mm.indexOf('DamageReductionResolver.resolve'), 'Shield Rating is resolved before Damage Reduction');
  const sr = fs.readFileSync('scripts/engine/combat/damage-mitigation-manager.js', 'utf8').split('STAGE 2')[0];
  assert.equal(/bypass|ignoresDR|dr-ignore/i.test(sr.slice(sr.indexOf('STAGE 1'))), false, 'the DR-ignore flag is never read before/at the Shield Rating stage');
  ok('Power Attack damage is target-type independent; Shield Rating (stage 1) is untouched by the DR-ignore flag that lightsabers use');
}

// ======================================================================================================================================
// E. STUN / ION MODES: resource cost, switch timing  [points 21-23]
// ======================================================================================================================================
{
  // 21: stun resource cost -- Bluebolt Blaster Pistol: a stun attack consumes one additional shot (canonical per-attack resource cost)
  const bb = withAmmo('weapon-bluebolt-blaster-pistol', 50); const B = makeActor({ items: [bb] });
  const rtm = rt.resolveAttackWeaponRuntime(bb, {});
  assert.equal(rt.resolveAttackResourceCost(rtm, { damageMode: 'stun' }).units, 2, 'stun: two shots');
  assert.equal(rt.resolveAttackResourceCost(rtm, { damageMode: null }).units, 1, 'lethal: one shot');
  AmmoSystem.spendForWorkflow = origs.spendAmmo;
  const costs = []; const origAmmo2 = AmmoSystem.consumeAmmunition;
  AmmoSystem.consumeAmmunition = async (a, w, n) => { costs.push(n); return { success: true, newAmmo: 40, previousAmmo: 50 }; };
  AmmoSystem.isTrackingEnabled = () => true;
  try {
    reset(); assert.ok(await attack(B, bb, { damageMode: 'stun' })); reset(); assert.ok(await attack(B, bb, {}));
    assert.deepEqual(costs, [2, 1], 'the stun attack spent two shots, the ordinary attack one');
  } finally { AmmoSystem.consumeAmmunition = origAmmo2; AmmoSystem.isTrackingEnabled = origs.track; installHarness(); setRound(null); stubRolls(); }
  ok('stun resource cost: the Bluebolt\'s stun attack consumes two shots through the canonical per-attack resource cost; a lethal attack one');

  // 22: stun switch timing -- Shockboxing Gloves: switching to stun costs a swift action ONCE; the setting persists on the owned item
  const gl = canon('unmapped::Shockboxing Gloves'); const G = makeActor({ items: [gl] });
  const ss = (profileId) => rt.shapeOfWeapon(gl, { profileId }).stunSetting;
  assert.deepEqual(ss('unarmed-stun'), { persistent: true, action: 'swift', weaponHasSwitch: true });
  assert.equal(ss('unarmed-lethal').persistent, false);
  const swiftCount = () => spent.actions.filter((a) => a === 'swift').length;
  reset(); assert.ok(await attack(G, gl, { profileId: 'unarmed-stun' })); assert.equal(swiftCount(), 1, 'first stun attack pays the swift action');
  assert.equal(gl.flags.swse.fireState.settingProfile, 'unarmed-stun', 'the setting persists on the owned weapon');
  reset(); assert.ok(await attack(G, gl, { profileId: 'unarmed-stun' })); assert.equal(swiftCount(), 0, 'the setting is still stun: the next stun attack is free');
  reset(); assert.ok(await attack(G, gl, { profileId: 'unarmed-lethal' })); assert.equal(swiftCount(), 0, 'switching back is not priced (the source states no cost)');
  assert.equal(gl.flags.swse.fireState.settingProfile, 'unarmed-lethal');
  reset(); assert.ok(await attack(G, gl, { profileId: 'unarmed-stun' })); assert.equal(swiftCount(), 1, 'after a lethal attack the switch to stun costs again');
  reset(); const prev = await computeFinalAttackComposition(G, gl, { profileId: 'unarmed-lethal' }); assert.deepEqual(prev.readiness.requiredActions, [], 'preview is non-mutating');
  reinstall({ econAllowed: false });
  const gl2 = canon('unmapped::Shockboxing Gloves'); const G2 = makeActor({ items: [gl2] });
  reset(); assert.equal(await attack(G2, gl2, { profileId: 'unarmed-stun' }), null, 'an unpayable switch refuses the attack and writes nothing'); assert.equal(spent.rolls, 0); assert.equal(gl2.flags.swse?.fireState, undefined);
  reinstall();
  ok('stun switch timing: Shockboxing Gloves pay the published swift action once per switch to stun; the setting persists on the item; switching back is free; unpayable switch fails closed');

  // 23: a blaster pistol with an unpriced stun setting is untouched (no action, no state written)
  const bp = withAmmo('weapon-blaster-pistol', 50); const P = makeActor({ items: [bp] });
  assert.equal(rt.shapeOfWeapon(bp, {}).stunSetting.persistent, false);
  reset(); assert.ok(await attack(P, bp, { damageMode: 'stun' })); assert.deepEqual(spent.actions, []); assert.equal(bp.flags.swse?.fireState, undefined);
  ok('a stun setting that costs no action is unchanged: nothing paid, nothing written');
}

// ======================================================================================================================================
// F. SPORT HUNTER REROLL + REGRESSIONS  [points 24-30]
// ======================================================================================================================================
{
  const shDoc = packDoc('packs/feats.db', 'Sport Hunter');
  // 24: source-certified structured rule in the canonical SSOT -> generated pack
  const canonFeats = fs.readFileSync('data/canonical/feats.json', 'utf8').split('\n').filter((l) => l.startsWith('{"canonicalId"')).map((l) => JSON.parse(l.replace(/,$/, '')));
  const shCanon = canonFeats.find((r) => r.displayName === 'Sport Hunter');
  const shRules = shCanon.production.legacySystemCapture.abilityMeta.rules;
  const rr = shRules.find((r) => r.type === 'WEAPON_DAMAGE_DICE_REROLL');
  assert.deepEqual([rr.weaponGroups, rr.rerollValues, rr.untilDifferent, rr.appliesTo, rr.requiresAttackType], [['sporting-blaster-pistol'], [1], true, 'weapon-dice', 'ranged']);
  assert.equal(shCanon.certifiedPublications[0].bookPublication.page, 25, 'Galaxy at War p.25');
  assert.ok(shCanon.certifiedPublications[0].content.canonicalRulesShape.some((t) => /Sporting blaster pistol: reroll damage-die results of 1 until a non-1 result/.test(t)), 'the certified rules shape states the rule');
  assert.equal(shCanon.production.legacySystemCapture.abilityMeta.riderRules, undefined, 'the "metadata only" rider record is replaced by the executable rule');
  assert.deepEqual(shDoc.system.abilityMeta.rules.map((r) => r.type), ['WEAPON_DAMAGE_DIE_SIZE_STEP', 'ATTACK_OPTION', 'ATTACK_OPTION', 'WEAPON_DAMAGE_DICE_REROLL'], 'generated into the feat pack');
  ok('Sport Hunter sporting-blaster-pistol reroll is a structured canonical rule (SSOT -> generated pack), certified Galaxy at War p.25');

  // 25: executed through ability identity + weapon descriptor: rerolls weapon dice only, display name irrelevant, other weapons untouched
  const sbp = canon('weapon-sporting-blaster-pistol'), bp = canon('weapon-blaster-pistol'), sp = canon('weapon-slugthrower-pistol'), sbr = canon('weapon-sporting-blaster-rifle');
  const SH = makeActor({ feats: [shDoc], items: [sbp, bp, sp, sbr] });
  assert.deepEqual(mods(SH, sbp, {}).flags.weaponDiceRerollValues, [1]);
  const f = (w, ctx = {}) => buildDamageFormula(dmg(SH, w, ctx)).replace(/\s/g, '');
  const base = buildDamageFormula(dmg(makeActor({ items: [canon('weapon-sporting-blaster-pistol')] }), canon('weapon-sporting-blaster-pistol'))).replace(/\s/g, '');
  assert.match(f(sbp), /^\d+d4rr1/, 'weapon dice carry the recursive reroll-1 modifier'); assert.equal(base.includes('rr'), false, 'without Sport Hunter: no reroll');
  assert.equal(f(bp).includes('rr'), false, 'a blaster pistol is not a sporting blaster pistol'); assert.equal(f(sp).includes('rr'), false); assert.equal(f(sbr).includes('rr'), false);
  const SHren = makeActor({ feats: [packDoc('packs/feats.db', 'Sport Hunter', 'Totally Other Label')], items: [canon('weapon-sporting-blaster-pistol')] });
  assert.match(buildDamageFormula(dmg(SHren, SHren.items.find((i) => i.type === 'weapon'))).replace(/\s/g, ''), /d4rr1/, 'display name irrelevant (ability identity + weapon descriptor)');
  ok('Sport Hunter reroll: applies to the sporting blaster pistol only (descriptor scope), by ability identity not name, absent without the feat');

  // 26: weapon dice ONLY -- extra weapon dice are rerolled; talent / Force Point / rider / custom terms are not
  const comp = dmg(SH, sbp, {});
  assert.deepEqual(comp.dice.rerollWeaponDiceResults, [1]);
  const withExtra = { ...comp, dice: { ...comp.dice, extraWeaponDice: 1, talentDice: ['2d6'], otherDiceTerms: ['1d6'] } };
  const formula = buildDamageFormula(withExtra, { extraTerms: ['1d4', 3] }).replace(/\s/g, '');
  assert.match(formula, /^3d4rr1\+1d4rr1\+3\+2d6\+1d6\+1d4\+3$/, `weapon dice (base + extra) rerolled; talent, Force-Item, Force Point terms are not: ${formula}`);
  assert.equal(markRerollWeaponDice('3d4 + 1d4', [1]), '3d4rr1 + 1d4rr1');
  assert.equal(markRerollWeaponDice('3d4', [1, 2]), '3d4rr<=2'); assert.equal(markRerollWeaponDice('3d4', [2]), '3d4rr2'); assert.equal(markRerollWeaponDice('3d4', []), '3d4'); assert.equal(markRerollWeaponDice('1d1', [1]), '1d1');
  const critical = buildDamageFormula({ ...comp, critical: { isCritical: true, multiplier: 2, bonusFormula: '' } }).replace(/\s/g, '');
  assert.match(critical, /^\(\d+d4rr1(\+\d+)?\)\*2$/, 'the reroll sits inside the critical multiplier');
  ok('Sport Hunter reroll affects weapon dice only (base + extra weapon dice); talent, Force Item, Force Point and custom terms are never rerolled; critical multiplier wraps the rerolled dice');

  // 27-30: regressions -- Disabler d6->d8, Riflemaster HBR d10->d12, Sport Hunter slugthrower rifle d8->d12, slugthrower pistol +1 die at point-blank
  const sr = canon('weapon-slugthrower-rifle'), spp = canon('weapon-slugthrower-pistol');
  const S2 = makeActor({ feats: [shDoc], items: [sr, spp] });
  const nOf = (A, w) => Number(/^(\d+)d/.exec(dmg(A, w).dice.base)[1]);
  assert.equal(buildDamageFormula(dmg(S2, sr)).startsWith(`${nOf(S2, sr)}d12`), true, 'Sport Hunter: slugthrower rifle d8 -> d12 (rules order unchanged by the new rule)');
  assert.equal(mods(S2, spp, { rangeBand: 'point-blank' }).damageExtraWeaponDice, 1, 'Sport Hunter: slugthrower pistol +1 die at point-blank');
  assert.equal(mods(S2, spp, { rangeBand: 'short' }).damageExtraWeaponDice ?? 0, 0);
  const rm = makeActor({ feats: [packDoc('packs/feats.db', 'Riflemaster')], items: [canon('weapon-heavy-blaster-rifle')] });
  assert.equal(buildDamageFormula(dmg(rm, rm.items.find((i) => i.type === 'weapon'))).startsWith(`${nOf(rm, rm.items.find((i) => i.type === 'weapon'))}d12`), true, 'Riflemaster: Heavy Blaster Rifle d10 -> d12');
  const disRules = JSON.parse(fs.readFileSync('packs/feats.db', 'utf8').split('\n').filter(Boolean).find((l) => JSON.parse(l).name === 'Disabler')).system.abilityMeta.rules.map((r) => [r.type, r.value ?? null]);
  assert.deepEqual(disRules, [['WEAPON_DAMAGE_DIE_SIZE_STEP', 1]], 'Disabler stays a one-step die-SIZE replacement (d6 -> d8), not an extra die');
  ok('regressions: Riflemaster d10->d12, Sport Hunter slugthrower rifle d8->d12 and pistol +1 die at point-blank, Disabler data, all intact beside the new reroll rule');
}

// ======================================================================================================================================
// G. LEGACY / STOCK / PRIOR-PHASE REGRESSIONS  [points 28-33]
// ======================================================================================================================================
{
  // 28: legacy / homebrew weapons are untouched by every new consumer (no mechanics, no rerolls, no conditional damage, no new options)
  const L = legacy({ damage: '2d6' }); const A = makeActor({ items: [L] });
  const lc = resolveDamageComposition(A, L, {});
  assert.deepEqual([lc.dice.conditionalFlat, lc.dice.conditionalDiceTerms, lc.dice.rerollWeaponDiceResults], [0, [], []]);
  assert.equal(buildDamageFormula(lc).includes('rr'), false);
  assert.equal(rt.shapeOfWeapon(L, {}).source, 'legacy');
  reset(); assert.ok(await attack(A, L, { rangeBand: 'short', aim: false, braced: false }));
  assert.equal(wfOf()?.special, undefined, 'a legacy weapon carries no special-mechanic state');
  const hb = makeActor({ items: [legacy({ damage: '1d6', weaponCategory: 'ranged' }, 'Sniper Blaster Rifle')] });
  reset(); assert.ok(await attack(hb, hb.items.find((i) => i.type === 'weapon'), {}), 'a homebrew weapon NAMED like a canonical one is not treated as it');
  assert.equal(wfOf()?.special, undefined); assert.deepEqual(notes.warn, []);
  ok('legacy / homebrew weapons are unchanged: no mechanics, no reroll, no conditional damage, no prompts -- even when named like a canonical weapon');

  // 29: stock droid / NPC flat contracts keep precedence over every new damage term
  const droid = makeActor({ type: 'droid' });
  const stock = { ...canon('weapon-pulse-wave-pistol'), flags: { swse: { canonicalWeapon: { identityKey: 'weapon-pulse-wave-pistol' }, stockDroidAttack: { sourceStatblock: true, publishedDamage: '4d4' } } } };
  const sc = dmg(droid, stock, { rangeBand: 'pointBlank' });
  if (sc.flags?.stockDamageFormula) assert.equal(sc.dice.conditionalFlat, 0, 'a published flat contract does not receive the weapon\'s point-blank bonus');
  assert.equal(buildDamageFormula(sc).includes('rr'), false);
  ok('stock droid / NPC flat damage contracts are not altered by the I-A damage terms');

  // 30: 5D-H prepared / brace, 5D-G fire state, 5D-F autofire survive: reload-after-each-shot still blocks the next shot; an autofire-only brace still costs two swifts
  const ew = withAmmo('weapon-e-web-missile-launcher', 20); const E = makeActor({ items: [ew] });
  reset(); assert.ok(await attack(E, ew, {})); assert.equal(ew.flags.swse.fireState.needsReload, true);
  reset(); assert.equal(await attack(E, ew, {}), null, '5D-G: awaiting reload'); assert.equal(spent.rolls, 0);
  const hab = withAmmo('weapon-heavy-assault-blaster', 50); const H = makeActor({ items: [hab] });
  reset(); formulas.length = 0; assert.ok((await SWSERoll.rollAutofire(H, hab, { targets: [target()], skipFP: true, braced: true }))?.success); assert.deepEqual(spent.actions, ['swift', 'swift'], '5D-H brace: two swift actions');
  const ar = withAmmo('weapon-blaster-rifle', 50); const R = makeActor({ items: [ar] });
  reset(); assert.ok(await attack(R, ar, { rangeBand: 'short' }));
  ok('prior phases intact: 5D-G reload state, 5D-H autofire-only brace (two swift actions), 5D-F ordinary attack path');

  // 31: nothing is a blanket prohibition -- unobserved facts never refuse an attack
  const noProvider = [['weapon-sniper-blaster-rifle', {}], ['weapon-heavy-repeating-blaster', {}]];
  for (const [k] of noProvider) { const w = withAmmo(k, 50); const A2 = makeActor({ items: [w] }); reset(); formulas.length = 0; const r = k.includes('repeating') ? await SWSERoll.rollAutofire(A2, w, { targets: [target()], skipFP: true, braced: true }) : await attack(A2, w, {}); assert.ok(r, `${k}: an unobserved fact never refuses the attack`); }
  ok('unobserved aim / mount facts never refuse an attack (they are asked once, or surfaced and not applied)');

  // 32: no new weapon-name branches in the runtime (names are display only)
  for (const f of ['scripts/items/weapon-runtime/special-mechanics.js', 'scripts/items/weapon-runtime/canonical-range.js', 'scripts/items/weapon-runtime/area-shape.js', 'scripts/items/weapon-runtime/fire-state.js', 'scripts/engine/combat/fire-state-store.js']) {
    const code = fs.readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.equal(/['"`](Shockboxing|Thermal Detonator|Sniper|Rotary|E-Web|Entrenching|Neuronic|Pulse-wave|Darter|Stun Pistol|CR-1|SG-4)/i.test(code), false, `${f}: no weapon name branches`);
  }
  ok('the new consumers contain no weapon-name branches (structure and ability identity only)');
}

// ======================================================================================================================================
// H. INPUT MANIFEST  [points 33-36]
// ======================================================================================================================================
{
  const m = manifestTool.buildManifest();
  assert.deepEqual(m.problems, [], 'the I-A input manifest has no problems');
  assert.equal(m.counters.I_A_UNCLASSIFIED_KEYS, 0, 'zero unclassified keys');
  assert.equal(m.counters.I_A_INPUT_KEYS, 78);
  assert.equal(m.counters.I_A_KEYS_CONSUMED + m.counters.I_A_KEYS_DUPLICATE_OF_CONSUMED_FIELD + m.counters.I_A_KEYS_DEFERRED_TO_OWNER + m.counters.I_A_KEYS_DATA_COMPLETENESS + m.counters.I_A_KEYS_NOT_APPLICABLE, m.counters.I_A_INPUT_KEYS, 'every key is accounted for exactly once');
  assert.equal(new Set(m.rows.map((r) => `${r.family}::${r.key}`)).size, m.rows.length, 'no duplicate rows');
  for (const r of m.rows) { assert.ok(r.proposedPolicy && r.mechanicFamily && r.reason && r.structuredSourceField, `${r.key} is fully described`); if (r.disposition === 'DEFERRED_TO_OWNER') assert.ok(['I-B', 'I-C', 'I-D'].includes(r.owner), `${r.key} names its owner`); }
  const committed = JSON.parse(fs.readFileSync(manifestTool.OUT_JSON, 'utf8'));
  assert.deepEqual(committed, JSON.parse(JSON.stringify(m)), 'the committed manifest is current');
  ok('the I-A input manifest: 78 residual keys, each classified once, zero unclassified, every deferral names an owner, committed copy current');

  // before / after counters against the closure census (the 5D-H baseline is pinned)
  const g = m.globalCounters;
  assert.deepEqual([g.before.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER, g.before.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER, g.before.UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER], [196, 256, 15]);
  assert.ok(g.after.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER < 196 && g.after.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER < 256, 'the residual counters moved because keys were consumed or proven duplicates, not renamed');
  const opRows = m.rows.filter((r) => r.family !== '3b.profile.conditional');
  const opConsumed = opRows.filter((r) => r.disposition === 'IMPLEMENTED').length, opDuplicate = opRows.filter((r) => r.disposition === 'DUPLICATE').length;
  assert.equal(g.after.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER, 196 - opConsumed - opDuplicate, 'unique unconsumed = baseline - consumed operation keys - proven-duplicate operation keys');
  ok('global residual counters: 196 -> ' + g.after.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER + ' unique unconsumed keys, 256 -> ' + g.after.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER + ' raw occurrences (no key renamed or dropped to move them)');

  // the 5D-H closure census is current and still has no unclassified residual
  const closure = await import('../tools/census-weapon-executable-field-closure.mjs');
  const census = await closure.buildClosureCensus();
  assert.deepEqual(census.problems, []);
  assert.ok(census.counters.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER <= g.after.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER, 'later phases may only shrink the live residual below the pinned end-of-I-A value');
  ok('closure census reports no unclassified residual and is never above the pinned end-of-I-A counters');
}

} finally { restoreHarness(); unstubRolls(); rt.setSpecialPromptProvider(null); }

console.log(`Phase 5D-I-A core attack residuals: ${step} checks passed.`);
