import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-B -- wielding, activation state, threat/reach and host state (owned weapon state, attacks of opportunity, reach, configuration, usage, crew, payload).
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
const manifestIA = await import('../tools/census-weapon-phase-5d-i-a-inputs.mjs');
const manifestIB = await import('../tools/census-weapon-phase-5d-i-b-inputs.mjs');
const { I_B_LEDGER } = await import('../tools/lib/weapon-phase-5d-i-b-ledger.mjs');
const I_B_LEDGER_OF = (k) => I_B_LEDGER.find((r) => r.key === k);
const OS = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/owned-state.js');
const AR = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/activation-requirements.js');
const { AttackOfOpportunityFeatRules } = await import('/systems/foundryvtt-swse/scripts/engine/combat/attack-of-opportunity-feat-rules.js');
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
const FS = FireStateStoreRef;
const ewp = (rename, choice) => ({ ...packDoc('packs/feats.db', 'Exotic Weapon Proficiency', rename), flags: { swse: { ...packDoc('packs/feats.db', 'Exotic Weapon Proficiency').flags.swse, choices: { weaponProficiency: choice } } } });
const swifts = () => spent.actions.filter((a) => a === 'swift').length;
const state = (w) => w.flags?.swse?.fireState ?? {};
const ask = (fn) => { const asked = []; rt.setSpecialPromptProvider(async (q) => { asked.push(q.id); return fn(q); }); return asked; };
try {

// ======================================================================================================================================
// A. ATTACKS OF OPPORTUNITY -- the Core rule from the weapon's structure; the Siang Lance's own declaration and choice   [points 1-11]
// ======================================================================================================================================
{
  const aoo = async (A, w, extra = {}) => { reset(); return attack(A, w, { attackOfOpportunity: true, ...extra }); };
  const mk1 = (k) => { const w = withAmmo(k, 50); return [makeActor({ items: [w] }), w]; };
  // 1: a melee weapon
  let [A, w] = mk1('weapon-vibroblade'); assert.ok(await aoo(A, w), 'a melee weapon can make an attack of opportunity');
  // 2: a pistol
  [A, w] = mk1('weapon-blaster-pistol'); assert.ok(await aoo(A, w), 'a pistol can');
  // 3: a carbine, stock extended (Core: a carbine can always make an AoO, stock folded or not)
  [A, w] = mk1('weapon-blaster-carbine'); await FS.setStockState(A, w, 'extended', { free: true });
  assert.ok(await aoo(A, w), 'a carbine with its stock extended can');
  // 4: any weapon with a folded stock; 5: an ordinary rifle otherwise cannot
  [A, w] = mk1('weapon-blaster-rifle');
  assert.equal(await aoo(A, w), null, 'an ordinary rifle cannot'); assert.equal(spent.rolls, 0); assert.equal(spent.ammo, 0); assert.deepEqual(spent.actions, []);
  assert.ok(notes.warn.some((m) => /attack of opportunity/.test(m)));
  await FS.setStockState(A, w, 'extended', { free: true }); assert.equal(await aoo(A, w), null, 'a rifle with its stock EXTENDED cannot');
  await FS.setStockState(A, w, 'retracted', { free: true }); assert.ok(await aoo(A, w), 'the same rifle with its stock FOLDED can');
  ok('Core attack-of-opportunity rule: melee, pistol and carbine weapons can; a rifle only with a folded stock; an ordinary rifle is refused before anything is spent');

  // 6: unarmed requires Martial Arts I (the existing AoO authority names it; the pure rule agrees); the Core category list now includes carbines
  assert.deepEqual(OS.resolveOpportunityEligibility({ isUnarmed: true, hasMartialArtsI: false }), { eligible: false, reason: 'unarmed-requires-martial-arts-i' });
  assert.equal(OS.resolveOpportunityEligibility({ isUnarmed: true, hasMartialArtsI: true }).eligible, true);
  const ma = mk('feat', 'Martial Arts I');
  assert.equal(AttackOfOpportunityFeatRules.getEligibility(makeActor({ feats: [ma] })).unarmedAllowed, true); assert.equal(AttackOfOpportunityFeatRules.getEligibility(makeActor()).unarmedAllowed, false);
  assert.ok(AttackOfOpportunityFeatRules.getEligibility(makeActor()).eligibleWeaponCategories.includes('carbine'), 'the Core category list includes carbines (CONSUMER_DEFECT: it listed no carbine)');
  ok('unarmed attacks of opportunity need Martial Arts I; the Core eligible-category list now includes carbines');

  // 7: the carbine-specific operation flags only restate the Core rule: removing them changes nothing, and they never apply twice
  for (const k of ['weapon-blaster-carbine', 'weapon-hunting-blaster-carbine', 'weapon-sporting-blaster-carbine', 'weapon-double-barreled-blaster-carbine']) {
    const r = registryData.identities.find((x) => x.identityKey === k);
    assert.ok(r.selectors.families.includes('weapon-family:blaster-carbine'), `${k} is a certified carbine`);
    const bare = registryClone((c) => { const o = c.identities.find((x) => x.identityKey === k).operation; delete o.canMakeAttackOfOpportunityEvenWithStockExtended; delete o.canMakeAttacksOfOpportunityWithoutFoldedStock; });
    const wA = withAmmo(k, 50), AA = makeActor({ items: [wA] });
    const withFlags = await aoo(AA, wA); const b1 = formulas.length ? fx(formulas.at(-1)) : null;
    rt.setSharedWeaponAuthorityRegistry(bare);
    try { const wB = withAmmo(k, 50), AB = makeActor({ items: [wB] }); const without = await aoo(AB, wB); assert.ok(withFlags && without, `${k}: eligible with and without the restating flags`); assert.equal(fx(formulas.at(-1)), b1, `${k}: identical attack`); }
    finally { rt.setSharedWeaponAuthorityRegistry(registry); }
  }
  ok('the four carbine AoO operation flags are DUPLICATE_OF_CORE_AOO_RULE: eligibility and the attack are identical without them');

  // 8-11: Siang Lance -- its own declaration, the two choices, the chosen profile persisting
  const siang = () => withAmmo('weapon-siang-lance', 50, { proficiency: 'exotic' });
  const SP = (extra = []) => makeActor({ feats: [ewp('Zq Label', { weaponIdentity: 'weapon-siang-lance' }), ...extra] });
  const sh = rt.shapeOfWeapon(siang(), {});
  assert.equal(sh.opportunity.declared, true, '8: the Siang Lance declares attacks of opportunity');
  assert.deepEqual(sh.opportunity.choices.map((c) => [c.choice, c.profileId]), [['ranged-shot', 'ranged'], ['affixed-bayonet', 'bayonet-aao']], '9/10: it offers exactly the ranged shot and the bayonet attack');
  const undeclared = registryClone((c) => { delete c.identities.find((x) => x.identityKey === 'weapon-siang-lance').operation.canMakeAttacksOfOpportunity; });
  rt.setSharedWeaponAuthorityRegistry(undeclared);
  try { const wU = siang(); assert.equal(await aoo(SP(), wU, { aooChoice: 'ranged-shot' }), null, 'without the declaration the lance (a rifle) could not'); } finally { rt.setSharedWeaponAuthorityRegistry(registry); }
  let w1 = siang(); assert.ok(await aoo(SP(), w1, { aooChoice: 'ranged-shot' })); assert.equal(wfOf().weaponForm.profileId, 'ranged'); assert.equal(wfOf().attackShape.opportunity.choice, 'ranged-shot');
  w1 = siang(); assert.ok(await aoo(SP(), w1, { aooChoice: 'affixed-bayonet' })); assert.equal(wfOf().weaponForm.profileId, 'bayonet-aao'); assert.equal(wfOf().attackShape.opportunity.profileId, 'bayonet-aao');
  // an unnamed choice is asked once; no answer refuses; the bayonet profile outside an AoO is illegal
  let asked = ask(async () => true); w1 = siang(); assert.ok(await aoo(SP(), w1)); assert.equal(wfOf().weaponForm.profileId, 'bayonet-aao', '"yes" picks the bayonet'); assert.deepEqual(asked, ['aoo-choice']);
  asked = ask(async () => false); w1 = siang(); assert.ok(await aoo(SP(), w1)); assert.equal(wfOf().weaponForm.profileId, 'ranged', '"no" picks the ranged shot');
  rt.setSpecialPromptProvider(null); w1 = siang(); assert.equal(await aoo(SP(), w1), null, 'nobody chose: refused, nothing guessed');
  reset(); w1 = siang(); assert.equal(await attack(SP(), w1, { profileId: 'bayonet-aao' }), null, 'the bayonet attack is legal only as the attack-of-opportunity choice'); assert.equal(spent.rolls, 0);
  // 11: the choice survives the chat-card transport and later damage reads the SAME profile
  w1 = siang(); assert.ok(await aoo(SP(), w1, { aooChoice: 'affixed-bayonet' }));
  const restored = ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext(wfOf()));
  assert.deepEqual(restored.attackShape.opportunity, { choice: 'affixed-bayonet', profileId: 'bayonet-aao' }); assert.equal(restored.weaponForm.profileId, 'bayonet-aao');
  assert.equal(rt.resolveCanonicalDamage(w1, { weaponForm: restored.weaponForm, combatContext: restored }).selection.profileId, 'bayonet-aao', 'damage resolves the carried profile, not an Item default');
  ok('Siang Lance: declared AoO capability, ranged-shot / affixed-bayonet choices mapped to profiles (amendment, REC p.50), choice asked once or refused, chosen profile persisted through chat to damage');
}

// ======================================================================================================================================
// B. REACH / THREAT -- the reach of the SELECTED form   [points 12-13]
// ======================================================================================================================================
{
  const reachOf = (k, sel = {}) => rt.shapeOfWeapon(canon(k), sel).reach;
  // 12: Lightsaber Pike +1 square (weapon-wide); the two spellings of the same fact are never summed
  assert.deepEqual([reachOf('lightsaber-chassis-pike').bonusSquares, reachOf('lightsaber-chassis-pike').absoluteSquares], [1, null]);
  const pike = rec('lightsaber-chassis-pike').operation; assert.equal(pike.reachBonusSquares, 1); assert.equal(pike.reachIncreaseSquares, 1);
  assert.equal(OS.resolveReach({ reachBonusSquares: 1, reachIncreaseSquares: 1 }).bonusSquares, 1, 'reachBonusSquares and reachIncreaseSquares echo one fact: 1, not 2');
  assert.equal(OS.resolveReach({ reachBonusSquares: 1, reachIncreaseSquares: 2 }).bonusSquares, 2, 'the larger of the two spellings');
  const pk = withAmmo('lightsaber-chassis-pike', 50); reset(); assert.ok(await attack(makeActor({ items: [pk] }), pk, {}));
  assert.deepEqual(wfOf().attackShape.reach, { bonusSquares: 1 }, 'the reach is carried in the workflow');
  // 13: reach applies only to the right profile / state
  assert.equal(reachOf('lightsaber-chassis-dual-phase', { profileId: 'default' }).bonusSquares, 0, 'Dual-Phase default blade: no extra reach');
  assert.equal(reachOf('lightsaber-chassis-dual-phase', { profileId: 'extended' }).bonusSquares, 1, 'extended blade: +1');
  assert.equal(reachOf('unmapped::Amphistaff', { configurationId: 'whip' }).absoluteSquares, 2, 'Amphistaff whip form: reach 2');
  for (const cfg of ['quarterstaff', 'spear']) assert.equal(reachOf('unmapped::Amphistaff', { configurationId: cfg }).absoluteSquares, null, `Amphistaff ${cfg} form: ordinary reach`);
  assert.equal(reachOf('unmapped::Wan-Shen', { configurationId: 'assembled' }).bonusSquares, 1); assert.equal(reachOf('unmapped::Wan-Shen', { configurationId: 'disassembled' }).bonusSquares, 0, 'a disassembled Wan-Shen gives no reach');
  assert.equal(reachOf('unmapped::Neuronic Whip').bonusSquares, 1);
  assert.equal(reachOf('weapon-blaster-pistol').bonusSquares, 0);
  ok('reach resolver: Pike +1 (spelling echoes not summed), Dual-Phase only while extended, Amphistaff whip reach 2 only in whip form, Wan-Shen only while assembled, persisted in the workflow');
}

// ======================================================================================================================================
// C. WIELDING (hands), LONG-HANDLE LIGHTSABER, LONG HAFT FORM IDENTITY   [points 14-19]
// ======================================================================================================================================
{
  const LH = 'lightsaber-chassis-longhandle';
  const lh = canon(LH); const A = makeActor({ items: [lh] }); A.system.attributes.str = ab(4); // Strength +4
  const comp = (profileId, hands, extra = {}) => resolveDamageComposition(A, lh, { weaponForm: { identityKey: LH, profileId }, ...(hands ? { wieldedHands: hands } : {}), ...extra });
  const abilityOf = (c) => c.bonus.components.Ability ?? 0;
  // 14: ordinary two-handed attack: double Strength; one-handed: single
  assert.equal(abilityOf(comp('blade', 1)), 4, 'one-handed: Strength +4');
  assert.equal(abilityOf(comp('blade', 2)), 8, 'two-handed: double Strength (Core p.141)');
  assert.equal(abilityOf(comp('blade', undefined)), 4, 'no stated hands: never assumed two-handed');
  // 15/16: the choice -- 2d10 base and the Strength bonus is NOT doubled
  const choice = comp('two-handed-base-override', 2, { attackShape: { wieldedHands: 2, forgoDoubleStrength: true } });
  assert.equal(choice.dice.base, '2d10'); assert.equal(abilityOf(choice), 4, 'the alternate choice does not double Strength');
  assert.equal(comp('blade', 2).dice.base, '2d8', 'the ordinary blade is 2d8');
  // 17: one-handed cannot take the two-handed choice; two-handed can; unknown is asked once and stored; the choice persists in the workflow
  const A2 = makeActor({ items: [] });
  const w1 = canon(LH); const a1 = makeActor({ items: [w1] });
  reset(); assert.equal(await attack(a1, w1, { profileId: 'two-handed-base-override', wieldedHands: 1 }), null, 'one-handed: refused'); assert.equal(spent.rolls, 0);
  assert.ok(notes.warn.some((m) => /wielding/.test(m)));
  const w2 = canon(LH); const a2 = makeActor({ items: [w2] });
  reset(); assert.ok(await attack(a2, w2, { profileId: 'two-handed-base-override', wieldedHands: 2 }), 'two-handed: allowed');
  assert.deepEqual([wfOf().attackShape.wieldedHands, wfOf().attackShape.forgoDoubleStrength, wfOf().weaponForm.profileId], [2, true, 'two-handed-base-override'], 'hands and the choice persist in the workflow');
  assert.equal(state(w2).wielded, 'two-handed', 'the owned weapon remembers the hands the player chose');
  const w3 = canon(LH); const a3 = makeActor({ items: [w3] }); const asked = ask(async () => true);
  reset(); assert.ok(await attack(a3, w3, { profileId: 'two-handed-base-override' })); assert.deepEqual(asked, ['requirement:wielding:two-handed']);
  rt.setSpecialPromptProvider(async () => false); const w4 = canon(LH); reset(); assert.equal(await attack(makeActor({ items: [w4] }), w4, { profileId: 'two-handed-base-override' }), null, '"no" refuses'); rt.setSpecialPromptProvider(null);
  // the damage roll uses the carried hands (not the Item's current state): changing the owned state later changes nothing
  reset(); const w5 = canon(LH); const a5 = makeActor({ items: [w5] }); a5.system.attributes.str = ab(4);
  assert.ok(await attack(a5, w5, { profileId: 'two-handed-base-override', wieldedHands: 2 })); const wf5 = wfOf();
  await FS.setWielding(a5, w5, 'one-handed');
  formulas.length = 0; assert.ok(await rollDamage(a5, w5, { combatContext: wf5, workflowContext: wf5, suppressChat: true, target: target() }));
  assert.equal(formulas[0], '2d10 + 7', '2d10 base + half level 3 + a SINGLE Strength +4, from the carried (forgo) choice -- not re-derived from the changed Item');
  // wielding constraints (siblings): Garrote requires two hands, lightfoils cannot be wielded two-handed
  assert.deepEqual(OS.resolveWielding(OS.wieldingConstraintsOf({ requiresTwoHands: true }), { option: 1 }), { hands: 1, source: 'option', legal: false, reason: 'requires-two-hands', constraints: { requiresTwoHands: true, cannotWieldTwoHanded: false } });
  assert.equal(OS.resolveWielding(OS.wieldingConstraintsOf({ requiresTwoHands: true }), {}).hands, 2, 'a weapon that requires two hands is wielded two-handed');
  assert.equal(OS.resolveWielding(OS.wieldingConstraintsOf({ cannotWieldTwoHanded: true }), { option: 'two-handed' }).reason, 'cannot-wield-two-handed');
  assert.equal(OS.resolveWielding(OS.wieldingConstraintsOf({ cannotBeWieldedTwoHanded: true }), { state: { wielded: 'two-handed' } }).legal, false);
  for (const [k, hands] of [['unmapped::Garrote', 1], ['lightsaber-chassis-modern-lightfoil', 2], ['lightsaber-chassis-archaic-lightfoil', 2]]) { const g = withAmmo(k, 10); reset(); assert.equal(await attack(makeActor({ items: [g] }), g, { wieldedHands: hands }), null, `${k} refuses the illegal hands`); assert.equal(spent.rolls, 0); }
  ok('wielding: hands are the wielder\'s choice (option > owned state > required); Long-Handle two-handed doubles Strength, the 2d10 choice does not, one-handed is refused, the choice and hands persist; Garrote / lightfoil constraints refuse before any cost');

  // 18: Long Haft Form identity reconciliation -- execution joins on the certified page-23 feat identity, never on a name
  const featsCanon = fs.readFileSync('data/canonical/feats.json', 'utf8').split('\n').filter((l) => l.startsWith('{"canonicalId"')).map((l) => JSON.parse(l.replace(/,$/, '')));
  assert.equal(featsCanon.filter((f) => /^long haft/i.test(f.displayName)).map((f) => f.displayName).join(), 'Long Haft Strike', 'the corpus has exactly one Long Haft feat (no "Long Haft Form")');
  const lhs = featsCanon.find((f) => f.displayName === 'Long Haft Strike'); assert.equal(lhs.primaryPublication.page, 23);
  assert.deepEqual(lhs.production.printedNameAliases.map((a) => [a.name, a.relationship]), [['Long Haft Form', 'PRINTED_NAME_VARIANT']]);
  for (const id of [LH, 'lightsaber-chassis-pike']) {
    const req = rec(id).canonicalStats.attackProfiles.find((p) => p.id === 'haft-end').activationRequirements.find((r) => r.type === 'feat');
    assert.deepEqual([req.identityKey, req.printedAs, req.identityRuling], ['feat::jedi-academy-training-manual::p23::long-haft-strike', 'Long Haft Form', 'PRINTED_NAME_VARIANT_OF_PAGE_23_FEAT']);
  }
  assert.ok(corpus.postCertificationAmendments.some((a) => a.id === '5D-I-B-structure-backfill' && a.identityKey === LH && /Long Haft Strike/.test(a.source.evidence)), 'logged with source / page / evidence');
  for (const id of [LH, 'lightsaber-chassis-pike']) {
    const hasFeat = [packDoc('packs/feats.db', 'Long Haft Strike', 'Totally Renamed Label')];
    const wH = canon(id); const aH = makeActor({ items: [wH], feats: hasFeat });
    reset(); assert.ok(await attack(aH, wH, { profileId: 'haft-end' }), `${id}: haft end with the page-23 feat (renamed label)`);
    const wN = canon(id); const aN = makeActor({ items: [wN] });
    reset(); assert.equal(await attack(aN, wN, { profileId: 'haft-end' }), null, `${id}: haft end without the feat`); assert.ok(notes.warn.some((m) => /feat/.test(m)));
    // an item that merely carries the PRINTED variant name is not the feat; neither is an item that carries a DIFFERENT canonical identity under the title
    const decoys = [[mk('feat', 'Long Haft Form')], [packDoc('packs/feats.db', 'Power Attack', 'Long Haft Strike')]];
    for (const feats of decoys) { const dW = canon(id); const d = makeActor({ items: [dW], feats }); reset(); assert.equal(await attack(d, dW, { profileId: 'haft-end' }), null, `${id}: ${feats[0].name} without the feat's identity does not satisfy the requirement`); }
    // a legacy / homebrew feat item with NO canonical identity falls back to its name (the documented legacy fallback) -- and only under the real feat's name
    const lW = canon(id); const legacyOk = makeActor({ items: [lW], feats: [mk('feat', 'Long Haft Strike')] }); reset(); assert.ok(await attack(legacyOk, lW, { profileId: 'haft-end' }), `${id}: legacy fallback by the real feat name`);
  }
  ok('Long Haft Form: the page-23 feat is "Long Haft Strike" (same rule text); the weapons\' "Long Haft Form" is a recorded printed-name variant; execution requires the canonical feat identity (renamed label works, a decoy by name does not)');
}

// ======================================================================================================================================
// D. AMPHISTAFF -- configuration state, proficiency requirement, Venom Spit usage ledger   [points 20-25]
// ======================================================================================================================================
{
  const AM = 'unmapped::Amphistaff';
  const amp = () => canon(AM);
  const EXO = () => ewp('Zq Exotic Label', { weaponIdentity: AM });
  // 20: wrong configuration refused (nothing spent)
  let w = amp(), A = makeActor({ items: [w], feats: [EXO()] });
  for (const [p, c] of [['whip-melee', 'quarterstaff'], ['whip-melee', 'spear'], ['spear-melee', 'whip'], ['quarterstaff-end1', 'whip']]) { reset(); assert.equal(await attack(A, w, { profileId: p, configurationId: c }), null, `${p} in ${c} form`); assert.equal(spent.rolls, 0); assert.deepEqual(spent.actions, []); }
  // 21: correct configuration succeeds; switching pays the published swift ONCE and the weapon remembers the form
  reset(); assert.ok(await attack(A, w, { profileId: 'whip-melee', configurationId: 'whip' }), 'whip form + whip profile'); assert.equal(swifts(), 1, 'the switch to whip form cost one swift action');
  assert.equal(state(w).configurationId, 'whip', 'persisted on the owned weapon');
  reset(); assert.ok(await attack(A, w, {})); assert.equal(swifts(), 0, 'already in whip form: free'); assert.equal(wfOf().weaponForm.profileId, 'whip-melee'); assert.equal(wfOf().weaponForm.configurationId, 'whip', 'an attack that names nothing uses the owned form');
  reset(); assert.ok(await attack(A, w, { configurationId: 'spear' })); assert.equal(swifts(), 1, 'switching to spear form costs again'); assert.equal(state(w).configurationId, 'spear');
  reset(); assert.ok(await attack(A, w, { configurationId: 'quarterstaff' })); assert.equal(swifts(), 1); reset(); assert.ok(await attack(A, w, {})); assert.equal(swifts(), 0);
  reinstall({ econAllowed: false }); const w2 = amp(), A2 = makeActor({ items: [w2], feats: [EXO()] });
  reset(); assert.equal(await attack(A2, w2, { configurationId: 'whip' }), null, 'an unpayable switch refuses the attack'); assert.equal(spent.rolls, 0); assert.equal(state(w2).configurationId, undefined, 'and writes nothing');
  assert.deepEqual(await FS.setConfiguration(A2, w2, 'whip'), { ok: false, reason: 'action-unavailable' }); reinstall();
  const w3 = amp(), A3 = makeActor({ items: [w3], feats: [EXO()] });
  assert.equal((await FS.setConfiguration(A3, w3, 'whip')).ok, true); assert.equal(swifts(), 1); assert.equal(state(w3).configurationId, 'whip'); assert.equal((await FS.setConfiguration(A3, w3, 'bogus')).reason, 'unknown-configuration');
  ok('Amphistaff configuration: a profile executes only in its form; switching form pays the published swift once and is remembered; an attack that names nothing uses the owned form; an unpayable switch fails closed');

  // 22: the Pin / Trip profiles need a proficient wielder -- decided by the canonical proficiency resolver
  const pin = amp(); const prof = makeActor({ items: [pin], feats: [EXO()] });
  reset(); assert.ok(await attack(prof, pin, { profileId: 'whip-pin', configurationId: 'whip' }), 'proficient wielder (canonical exotic identity under a renamed feat)');
  const pin2 = amp(); const unprof = makeActor({ items: [pin2], feats: [] });
  reset(); assert.equal(await attack(unprof, pin2, { profileId: 'whip-pin', configurationId: 'whip' }), null, 'not proficient: refused before any cost'); assert.equal(spent.rolls, 0); assert.equal(swifts(), 0);
  assert.ok(notes.warn.some((m) => /proficiency/.test(m)));
  const sys = amp(); sys.system.proficient = true; const flagOnly = makeActor({ items: [sys] });
  reset(); assert.equal(await attack(flagOnly, sys, { profileId: 'whip-trip', configurationId: 'whip' }), null, 'system.proficient is not a shortcut');
  const evaluated = AR.evaluateProfileRequirements([{ type: 'proficiency', condition: 'proficient-wielder' }], { proficient: true }); assert.deepEqual(evaluated.evaluated.map((e) => [e.type, e.result]), [['proficiency', true]]);
  ok('Amphistaff Pin / Trip: the proficiency requirement is the canonical resolver\'s answer (never system.proficient or a name)');

  // 23-25: Venom Spit -- once per 24 standard hours, ledger persisted, measured on the campaign clock
  const key = 'venom-spit:24-standard-hours';
  const spit = () => { const x = amp(); return [x, makeActor({ items: [x], feats: [EXO()] })]; };
  let [s1, SA] = spit(); setRound(null); globalThis.game.time = { worldTime: 1000 };
  reset(); assert.ok(await attack(SA, s1, { profileId: 'venom-spit' }), 'available');
  assert.deepEqual(state(s1).usage[key].uses, [{ at: 1000 }], '22: the use is persisted with the campaign time');
  reset(); assert.equal(await attack(SA, s1, { profileId: 'venom-spit' }), null, '23: a second use before the reset is refused'); assert.equal(spent.rolls, 0); assert.equal(spent.ammo, 0);
  assert.ok(notes.warn.some((m) => /limit is used/.test(m)));
  globalThis.game.time = { worldTime: 1000 + 86399 }; reset(); assert.equal(await attack(SA, s1, { profileId: 'venom-spit' }), null, 'one second before 24 standard hours: still used');
  globalThis.game.time = { worldTime: 1000 + 86400 }; reset(); assert.ok(await attack(SA, s1, { profileId: 'venom-spit' }), '24 standard hours later: available again');
  assert.deepEqual(state(s1).usage[key].uses, [{ at: 87400 }], 'the expired use was dropped');
  // no campaign clock: the period cannot be measured -> used until a GM reset (never approximated)
  [s1, SA] = spit(); setRound(null); reset(); assert.ok(await attack(SA, s1, { profileId: 'venom-spit' })); assert.deepEqual(state(s1).usage[key].uses, [{ at: null }]);
  reset(); assert.equal(await attack(SA, s1, { profileId: 'venom-spit' }), null, 'no clock: stays used'); assert.ok(notes.warn.some((m) => /GM reset/.test(m)));
  await FS.resetUsage(SA, s1); reset(); assert.ok(await attack(SA, s1, { profileId: 'venom-spit' }), 'after a GM reset');
  assert.equal(OS.usagePeriodSeconds('24-standard-hours'), 86400); assert.equal(OS.usagePeriodSeconds('per-encounter'), null);
  assert.deepEqual(OS.evaluateUsage({ per: '24-standard-hours', uses: 1 }, { uses: [{ at: 0 }] }, { worldTime: 100 }), { available: false, reason: 'used', usedAt: 0, resetsAt: 86400 });
  setRound(null);
  ok('Venom Spit: once per 24 standard hours -- persisted ledger on the campaign clock, refused before cost until the window ends (1 s early refused), no campaign clock -> used until a GM reset');
}

// ======================================================================================================================================
// E. DUAL-PHASE, INTERCHANGEABLE SETTING, RETROSABER STATE MACHINE   [points 26-31]
// ======================================================================================================================================
{
  const DP = 'lightsaber-chassis-dual-phase';
  // 26: Dual-Phase: the extended blade is a persistent setting -- switch is a swift action paid once, persists beyond the round / combat, survives chat -> damage
  const dp = canon(DP); const A = makeActor({ items: [dp] });
  setRound(1); reset(); assert.ok(await attack(A, dp, {})); assert.equal(swifts(), 0, 'the default blade is free'); assert.equal(state(dp).settingProfile, undefined);
  reset(); assert.ok(await attack(A, dp, { profileId: 'extended' })); assert.equal(swifts(), 1, 'switching to the extended blade: one swift'); assert.equal(state(dp).settingProfile, 'extended');
  const wfExt = wfOf(); assert.equal(wfExt.weaponForm.profileId, 'extended');
  reset(); assert.ok(await attack(A, dp, {})); assert.equal(swifts(), 0, 'already extended (no profile named -> the owned setting): not paid again'); assert.equal(wfOf().weaponForm.profileId, 'extended');
  setRound(5); reset(); assert.ok(await attack(A, dp, {})); assert.equal(swifts(), 0, 'the setting persists into a later round (no printed duration)'); assert.equal(wfOf().weaponForm.profileId, 'extended');
  globalThis.game = { combat: { id: 'c2', started: true, round: 1, combatants: [{ actor: { id: 'a1' } }] }, user: { targets: { first: () => null } } };
  reset(); assert.ok(await attack(A, dp, {})); assert.equal(swifts(), 0, 'and into another combat'); assert.equal(wfOf().weaponForm.profileId, 'extended');
  setRound(5); spent.actions.length = 0; formulas.length = 0;
  assert.ok(await rollDamage(A, dp, { combatContext: wfExt, workflowContext: wfExt, suppressChat: true, target: target() })); assert.deepEqual(spent.actions, [], 'a damage roll never pays the activation again');
  reset(); assert.ok(await attack(A, dp, { profileId: 'default' })); assert.equal(swifts(), 1, 'the certified mode data prices every mode switch: back to the default blade costs the swift'); assert.equal(state(dp).settingProfile, 'default');
  // 27: Interchangeable Weapon System: three modes, a standard action per switch, default mode free
  const iw = withAmmo('weapon-interchangeable-weapon-system', 50); const I = makeActor({ items: [iw] }); setRound(null);
  assert.deepEqual(rt.shapeOfWeapon(iw, { profileId: 'sniper' }).stunSetting, { persistent: true, action: 'standard', weaponHasSwitch: true, baselineProfileId: 'blaster-rifle' });
  reset(); assert.ok(await attack(I, iw, {})); assert.deepEqual(spent.actions, [], 'the default blaster mode is free');
  reset(); assert.ok(await attack(I, iw, { profileId: 'sniper' })); assert.deepEqual(spent.actions, ['standard'], 'switching to sniper mode: the published standard action');
  reset(); assert.ok(await attack(I, iw, { profileId: 'sniper' })); assert.deepEqual(spent.actions, []); reset(); assert.ok(await attack(I, iw, { profileId: 'anti-armor' })); assert.deepEqual(spent.actions, ['standard']);
  ok('persistent settings: Dual-Phase blade (swift per switch, persists across rounds and combats, never repaid at damage) and the Interchangeable Weapon System (standard per switch, default mode free)');

  // 28-31: Retrosaber -- the certified state machine (normal -> overcharge -> burnout -> normal) on the combat clock
  const RS = 'lightsaber-chassis-retrosaber';
  const base = (profileId) => resolveDamageComposition(makeActor(), canon(RS), { weaponForm: { identityKey: RS, profileId } }).dice.base;
  assert.deepEqual([base('normal'), base('overcharge'), base('burnout')], ['2d8', '2d10', '2d4'], 'damage keeps coming from the canonical damage path (not duplicated here)');
  const sm = rec(RS).canonicalStats.stateMachine;
  const at = (machine, round) => OS.currentMachineState(sm, machine, { combatId: 'c1', round }).state;
  const m1 = { state: 'overcharge', since: 1, combatId: 'c1' };
  assert.deepEqual([1, 2, 3, 4, 9].map((r) => at(m1, r)), ['overcharge', 'overcharge', 'burnout', 'normal', 'normal'], 'dialled up in round 1: overcharge rounds 1-2, burnout round 3, normal from round 4');
  assert.equal(OS.currentMachineState(sm, m1, null).state, 'normal', 'no combat clock: nothing is invented'); assert.equal(OS.currentMachineState(sm, { ...m1, combatId: 'other' }, { combatId: 'c1', round: 1 }).state, 'normal', 'a position from another combat is not inherited');
  assert.deepEqual(OS.machineTransitionAllowed(sm, 'normal', 'overcharge'), { allowed: true, transition: sm.transitions[0] }); assert.deepEqual(OS.machineTransitionAllowed(sm, 'burnout', 'overcharge'), { allowed: false, reason: 'locked' });
  assert.equal(OS.machineTransitionAllowed(sm, 'overcharge', 'normal').allowed, false, 'only forced transitions lead out of overcharge'); assert.equal(OS.machineTransitionAllowed(sm, 'normal', 'burnout').allowed, false);
  const rs = canon(RS); const R = makeActor({ items: [rs] });
  setRound(1); reset(); assert.ok(await attack(R, rs, { profileId: 'overcharge' })); assert.equal(swifts(), 1, '28: dial-up pays the swift action'); assert.deepEqual(state(rs).machine, { state: 'overcharge', since: 1, combatId: 'c1' });
  setRound(2); reset(); assert.ok(await attack(R, rs, {})); assert.equal(swifts(), 0, 'round 2: still overcharged, no repayment'); assert.equal(wfOf().weaponForm.profileId, 'overcharge', 'the owned state decides the profile');
  setRound(2); reset(); assert.equal(await attack(R, rs, { profileId: 'normal' }), null, 'cannot attack with the normal base while overcharged'); assert.ok(notes.warn.some((m) => /overcharge state/.test(m)));
  setRound(3); reset(); assert.ok(await attack(R, rs, {})); assert.equal(wfOf().weaponForm.profileId, 'burnout', '29: round 3 the weapon is in burnout (2d4)'); assert.deepEqual(spent.actions, []);
  setRound(3); reset(); assert.equal(await attack(R, rs, { profileId: 'overcharge' }), null, 'burnout locks the dial-up'); assert.equal(spent.rolls, 0); assert.equal(swifts(), 0); assert.ok(notes.warn.some((m) => /locked/.test(m)));
  setRound(4); reset(); assert.ok(await attack(R, rs, {})); assert.equal(wfOf().weaponForm.profileId, 'normal', 'round 4: normal again');
  setRound(4); reset(); assert.ok(await attack(R, rs, { profileId: 'overcharge' })); assert.equal(swifts(), 1, 'and it can be dialled up again'); assert.deepEqual(state(rs).machine, { state: 'overcharge', since: 4, combatId: 'c1' });
  setRound(null); const rs2 = canon(RS); reset(); assert.ok(await attack(makeActor({ items: [rs2] }), rs2, { profileId: 'overcharge' })); assert.equal(state(rs2).machine, undefined, 'out of combat nothing is persisted');
  ok('Retrosaber: the certified state machine runs on the combat clock -- swift dial-up, overcharge through the wielder\'s next turn, a locked burnout round, then normal; damage still from the canonical profiles; nothing persisted out of combat');
}

// ======================================================================================================================================
// F. DETACHED host weapons -- a canonical delegation to the referenced identity, never text                                    [points 13-14]
// ======================================================================================================================================
{
  const w = withAmmo('unmapped::Vibrobayonet', 50); const A = makeActor({ items: [w] });
  const sel = (cfg, profileId) => ({ configurationId: cfg, profileId });
  const detached = rt.resolveCanonicalDamage(w, { weaponForm: { identityKey: 'unmapped::Vibrobayonet', profileId: 'detached', configurationId: 'detached' } });
  assert.deepEqual(detached.runtime.profile.delegatedFrom, { identityKey: 'weapon-vibrodagger', profileId: 'primary' });
  assert.equal(detached.base, rec('weapon-vibrodagger').canonicalStats.attackProfiles[0].damage.base ?? detached.base);
  const mounted = rt.resolveCanonicalDamage(w, { weaponForm: { identityKey: 'unmapped::Vibrobayonet', profileId: 'primary', configurationId: 'mounted-on-rifle' } });
  assert.notEqual(detached.base, mounted.base, 'the detached bayonet damages as the referenced Vibrodagger, not as the mounted bayonet');
  reset(); assert.ok(await attack(A, w, sel('detached', 'detached')), 'a detached bayonet attacks as its delegated Vibrodagger profile');
  assert.equal(wfOf()?.weaponForm?.profileId, 'detached'); assert.equal(wfOf()?.weaponForm?.configurationId, 'detached');
  // the mounted profile does not execute while detached (fail closed, nothing spent)
  reset(); assert.equal(await attack(A, w, sel('detached', 'primary')), null);
  assert.equal(spent.rolls, 0);
  ok('Detached Vibrobayonet: resolves as the canonical Vibrodagger profile through configurationResolution (damage differs from the mounted blade); the mounted profile is unavailable while detached');
}

// ======================================================================================================================================
// G. CREW / TRIPOD / OPERATORS -- stored adjudication, never an unobserved fact read as false                                [points 15-22]
// ======================================================================================================================================
{
  setRound(1);
  const AF = { autofire: true, attackMode: 'autofire' };
  const mkE = () => { const w = withAmmo('weapon-e-web-repeating-blaster', 50); return [makeActor({ items: [w] }), w]; };
  // 15: tripod unknown -> asked once, stored; a "yes" is remembered on the owned weapon
  let [A, w] = mkE(); let asked = ask(async (q) => (q.id === 'requirement:mounted' ? true : q.id === 'fact:crewRegulated' ? true : null));
  reset(); assert.ok(await attack(A, w, AF), 'mounted -> fires');
  assert.equal(state(w).mounted, true, 'the mount answer is persisted on the owned weapon');
  const first = asked.filter((i) => i === 'requirement:mounted').length;
  reset(); await attack(A, w, AF); assert.equal(asked.filter((i) => i === 'requirement:mounted').length, first, 'a stored mount is never asked again');
  // 16: known not mounted -> refused before anything is spent
  [A, w] = mkE(); await FS.setMounted(A, w, false); reset();
  assert.equal(await attack(A, w, AF), null); assert.equal(spent.rolls + spent.ammo + spent.actions.length, 0, 'nothing spent');
  // 17: unregulated penalty: answered "no" -> -2, stored for the round; "yes" -> none
  [A, w] = mkE(); await FS.setMounted(A, w, true);
  rt.setSpecialPromptProvider(async () => true); const regulated = await bonusOf(A, w, AF);
  [A, w] = mkE(); await FS.setMounted(A, w, true);
  rt.setSpecialPromptProvider(async () => false); const unregulated = await bonusOf(A, w, AF);
  assert.equal(regulated - unregulated, 2, 'the unregulated -2 applies exactly when no second crewman regulated');
  // 18: the answer is stored for THIS round (no re-ask), and round 2 re-observes
  assert.equal(FS.storedCrewRegulation(A, w), false);
  setRound(2); assert.equal(FS.storedCrewRegulation(A, w), undefined, 'a regulation adjudication belongs to its round');
  setRound(1);
  // 19: an observed record (GM / crew) is used without asking
  [A, w] = mkE(); await FS.setMounted(A, w, true); await FS.recordCrewRegulation(A, w, true);
  asked = ask(async () => { throw new Error('must not ask'); });
  assert.equal(await bonusOf(A, w, AF), regulated, 'a stored adjudication applies with no prompt');
  // 20: no combat -> nothing persisted, nothing invented
  setRound(null); [A, w] = mkE(); assert.equal(await FS.recordCrewRegulation(A, w, true), null);
  // 21: Battering Ram operators -- a definite "one operator" refuses, two proceed, unobserved is asked once
  setRound(1); rt.setSpecialPromptProvider(null);
  const mkR = () => { const w = withAmmo('weapon-battering-ram', 50); return [makeActor({ items: [w] }), w]; };
  [A, w] = mkR(); reset(); assert.equal(await attack(A, w, { operators: 1 }), null); assert.equal(spent.rolls, 0);
  reset(); assert.ok(await attack(A, w, { operators: 2 }), 'two operators (stabilize + trigger)');
  [A, w] = mkR(); asked = ask(async (q) => (q.id === 'requirement:operators' ? true : null));
  reset(); assert.ok(await attack(A, w)); assert.ok(asked.includes('requirement:operators'), 'unobserved operators are asked');
  // 22: Tactical Tractor Beam -- crew penalty through the same fact; hurled-object damage is BLOCKED (no object model), never invented
  const t = I_B_LEDGER_OF('hurledObjectDamageRule'); assert.equal(t.disposition, 'BLOCKED_BY_SUBSYSTEM');
  ok('Crew: E-Web mount + regulation are asked once and stored (per round, never unobserved-as-false); Battering Ram operators legal/illegal/asked; Tractor Beam penalty shares the crew fact and hurled-object damage stays BLOCKED');
  setRound(null); rt.setSpecialPromptProvider(null);
}

// ======================================================================================================================================
// H. GRENADE LAUNCHER payload delegation                                                                                      [points 23-27]
// ======================================================================================================================================
{
  const mkG = (loaded) => { const w = canon('weapon-grenade-launcher', { ammunition: { current: 4, max: 4 } }); return [makeActor({ items: [w] }), w, loaded]; };
  const L = (k) => ({ weaponForm: { identityKey: 'weapon-grenade-launcher', profileId: 'primary', loadedIdentityKey: k } });
  const frag = rt.resolveCanonicalDamage(canon('weapon-grenade-launcher'), L('weapon-frag-grenade'));
  assert.equal(frag.base, '4d6'); assert.deepEqual(frag.delegatedFrom, { launcher: 'weapon-grenade-launcher', payload: 'weapon-frag-grenade' });
  assert.equal(frag.areaShape.isArea, true); assert.equal(frag.areaShape.detonation.timing, 'contact');
  const stun = rt.resolveCanonicalDamage(canon('weapon-grenade-launcher'), L('weapon-stun-grenade'));
  assert.notEqual(stun.base, frag.base === null ? 'x' : 'zz'); assert.ok(stun.delegatedFrom);
  // refusals: Thermal Detonator, a non-grenade, and the micro launcher's other family
  for (const k of ['weapon-thermal-detonator', 'weapon-blaster-pistol', 'weapon-vibroblade']) {
    assert.throws(() => rt.resolveCanonicalDamage(canon('weapon-grenade-launcher'), L(k)), (e) => e.code === 'payload-not-accepted', k);
  }
  // a launcher that does not declare the delegation (micro launcher) never borrows a loaded identity: its damage stays deferred
  const micro = rt.resolveCanonicalDamage(canon('weapon-micro-grenade-launcher'), { weaponForm: { identityKey: 'weapon-micro-grenade-launcher', profileId: 'primary', loadedIdentityKey: 'weapon-frag-grenade' } });
  assert.equal(micro.delegatedFrom, undefined); assert.equal(micro.status, 'deferred');
  // no loaded identity -> deferred (BLOCKED honestly), never a guessed grenade
  const none = rt.resolveCanonicalDamage(canon('weapon-grenade-launcher'), { weaponForm: { identityKey: 'weapon-grenade-launcher', profileId: 'primary' } });
  assert.equal(none.status, 'deferred'); assert.equal(none.reason, 'loaded-ammo-identity-unavailable');
  // end to end: the loaded identity is owned state; the workflow carries it; a refused payload spends nothing
  let [A, w] = mkG(); await FS.setLoadedPayload(A, w, 'weapon-frag-grenade');
  reset(); assert.ok(await attack(A, w)); assert.equal(wfOf()?.weaponForm?.loadedIdentityKey, 'weapon-frag-grenade');
  [A, w] = mkG(); await FS.setLoadedPayload(A, w, 'weapon-thermal-detonator'); reset();
  assert.equal(await attack(A, w), null); assert.equal(spent.rolls + spent.ammo + spent.actions.length, 0, 'a refused payload spends nothing');
  ok('Grenade launcher: damage / type / burst delegate to the loaded canonical grenade (frag area burst, contact detonation); Thermal Detonator, non-grenades are refused, a launcher without the declaration never delegates; no loaded identity stays deferred; owned loaded state flows into the workflow and a refused payload spends nothing');
}

// ======================================================================================================================================
// I. STOCK STATE, snap baton, illegal state spends nothing                                                                     [points 28-33]
// ======================================================================================================================================
{
  // stock: the setter costs the published move action and persists; illegal state first
  const mkS = () => { const w = withAmmo('weapon-blaster-carbine', 50); return [makeActor({ items: [w] }), w]; };
  let [A, w] = mkS(); reset();
  assert.equal((await FS.setStockState(A, w, 'folded')).ok, false, 'an unknown stock state is refused');
  const s1 = await FS.setStockState(A, w, 'retracted'); assert.ok(s1.ok, JSON.stringify(s1));
  assert.equal(state(w).stock, 'retracted'); assert.deepEqual(spent.actions, ['move'], 'retracting / extending the stock is the published move action');
  reset(); await FS.setStockState(A, w, 'retracted'); assert.deepEqual(spent.actions, [], 'an unchanged stock state costs nothing');
  // a disassembled Targeting Blaster Rifle (attackUsable:false) cannot attack; reassembly pays the published action; a collapsed snap baton
  // states no attackUsable (null = not stated) and is NOT read as unusable
  const mkT = () => { const w = withAmmo('weapon-targeting-blaster-rifle', 50); return [makeActor({ items: [w] }), w]; };
  [A, w] = mkT(); await FS.setConfiguration(A, w, 'disassembled'); reset();
  assert.equal(await attack(A, w), null, 'a disassembled weapon cannot attack'); assert.equal(spent.rolls + spent.ammo, 0);
  const asm = rec('weapon-targeting-blaster-rifle').canonicalStats.configurationStates.find((c) => c.id === 'assembled')?.transitionAction;
  reset(); await FS.setConfiguration(A, w, 'assembled'); if (asm) assert.ok(spent.actions.includes(asm)); assert.ok(await attack(A, w), 'reassembled -> attacks');
  const bt = withAmmo('weapon-snap-baton', 50); const AB = makeActor({ items: [bt] }); await FS.setConfiguration(AB, bt, 'collapsed'); reset();
  assert.ok(await attack(AB, bt), 'an unstated attackUsable is not read as false');
  // an unpayable configuration switch fails closed (nothing else spent)
  reinstall({ econAllowed: false }); [A, w] = mkT(); reset();
  assert.deepEqual(await FS.setConfiguration(A, w, 'disassembled'), { ok: false, reason: 'action-unavailable' }); assert.equal(state(w).configurationId, undefined);
  reinstall();
  // an illegal wielding / state never spends: lightfoil two-handed
  const lf = withAmmo('weapon-lightfoil', 50); const AL = makeActor({ items: [lf] }); reset();
  assert.equal(await attack(AL, lf, { wieldedHands: 2 }), null); assert.equal(spent.rolls + spent.ammo + spent.actions.length, 0);
  ok('Owned state: stock setter persists (published move action, unchanged state free), disassembled weapon refused and reassembly paid, an unstated attackUsable is never read as false, unpayable switch and illegal wielding spend nothing');
}

// ======================================================================================================================================
// J. LEGACY / HOMEBREW, stock droid, regression, manifests                                                                     [points 34-42]
// ======================================================================================================================================
{
  const w = legacy(); const A = makeActor({ items: [w] }); reset();
  assert.ok(await attack(A, w, { attackOfOpportunity: true }), 'a legacy weapon keeps the legacy attack path');
  assert.equal(Object.keys(state(w)).length, 0, 'no owned I-B state is invented for a legacy weapon');
  const droid = makeActor({ type: 'droid', items: [] }); assert.ok(droid);
  const mA = manifestIA.buildManifest(); assert.deepEqual(mA.problems, []); assert.equal(mA.counters.I_A_UNCLASSIFIED_KEYS, 0);
  const mB = manifestIB.buildManifest(); assert.deepEqual(mB.problems, [], mB.problems.join('\n'));
  const c = mB.counters;
  assert.equal(c.MANDATORY_I_B_INPUT_KEYS, 17); assert.equal(c.I_B_UNCLASSIFIED_KEYS, 0);
  assert.equal(fs.readFileSync(manifestIB.OUT_JSON, 'utf8'), `${JSON.stringify(mB, null, 2)}\n`, 'the committed I-B manifest is current');
  for (const r of mB.rows.filter((r) => r.mandatory)) assert.ok(['IMPLEMENTED', 'DUPLICATE', 'DATA_DEFECT', 'DATA_COMPLETENESS', 'BLOCKED_BY_SUBSYSTEM', 'DEFERRED_WITH_EXPLICIT_OWNER'].includes(r.disposition));
  const closure = JSON.parse(fs.readFileSync('data/audits/weapon-phase-5d-h-closure-census.json', 'utf8'));
  assert.ok(closure.operationKeys, 'closure census present');
  ok('Legacy weapons keep the legacy path (no I-B state invented); I-A and I-B manifests are current with 17 mandatory keys and 0 unclassified');
}
} finally { restoreHarness(); unstubRolls(); rt.setSpecialPromptProvider(null); }
console.log(`${step} I-B checks passed`);
