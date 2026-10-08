import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-F -- multi-attack / fire-mode convergence on the selected canonical form.
// "Weapons declare what they are. Abilities declare what they apply to." Every item below is a canonical weapon under a deliberately
// WRONG name and Item projection, so a pass cannot come from a name, a category string or an Item-level guess.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.window = globalThis.window ?? globalThis;
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const ma = await import('/systems/foundryvtt-swse/scripts/combat/multi-attack.js');
const { DualWieldCombatShapeResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/dual-wield-combat-shape-resolver.js');
const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { resolveDamageComposition, buildDamageFormula } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { rollAttack, computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { resolveAutofireForm, SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
const { _aggregateFullAttackAmmo } = await import('/systems/foundryvtt-swse/scripts/engine/combat/full-attack-executor.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const ser = await import('/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js');
const { registry, registryData } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); a.filter = Array.prototype.filter.bind(a); return a; };
const canonFeat = (slug) => ({ swse: { canonicalFeat: { identityKey: `feat::saga-edition-core-rulebook::p84::${slug}` } } });
let uid = 0;
const feat = (name, extra = {}) => ({ id: `f${++uid}`, type: 'feat', name, flags: extra.flags ?? {}, system: { ...(extra.system ?? {}) } });
const choiceFeat = (slug, name, choice) => feat(name, { flags: canonFeat(slug), system: { slug, selectedChoice: choice } });
const optionFeat = (name, optionId) => feat(name, { system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: optionId }] } } });
const PROF = ['Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)', 'Weapon Proficiency (Simple Weapons)', 'Weapon Proficiency (Advanced Melee Weapons)', 'Weapon Proficiency (Heavy Weapons)'].map((n) => feat(n));
const canon = (k, system = {}, extra = {}) => ({ id: `w-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', damageType: 'sonic', equipped: true, ...system }, ...extra });
const legacy = (system = {}, name = 'Homebrew') => ({ id: `hb-${name}`, name, type: 'weapon', system: { weaponCategory: 'ranged', damage: '2d6', damageType: 'energy', equipped: true, proficient: true, ...system } });
const makeActor = ({ feats = [], items = [], level = 6, type = 'character', flags = {} } = {}) => ({
  id: 'a1', name: 'Tester', type, flags: { swse: flags }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
  items: col([...PROF, ...feats, ...items]),
  system: { bab: 6, level, attributes: { str: ab(3), dex: ab(4), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols', 'rifles', 'simple', 'advanced-melee', 'heavy-weapons'] },
});
const target = (o = {}) => ({ id: 't1', name: 'Dummy', type: 'npc', flags: { swse: {} }, effects: [], items: col([]), getFlag() { return undefined; }, system: { size: 'medium', hp: { value: 30, max: 30 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } }, ...o } });
const sel = (weapon, ctx = {}) => rt.shapeOfWeapon(weapon, ctx);

// ---- 1: ordinary single attack unchanged ------------------------------------------------------------------------------------------------
{
  const pistol = canon('weapon-blaster-pistol');
  const A = makeActor({ items: [pistol] });
  const plan = ma.buildFullAttackSequence(A, { requestedPackage: ma.FULL_ATTACK_PACKAGES.NORMAL, primaryWeapon: pistol });
  assert.equal(plan.legal, true); assert.equal(plan.attacks.length, 1); assert.equal(plan.attacks[0].finalPenalty, 0);
  assert.equal(plan.attacks[0].weaponGroup, 'pistols', 'group comes from the canonical selected profile, not the name "Renamed Thing"');
  assert.deepEqual(plan.attacks[0].form, {}, 'no explicit selection: the canonical default form');
  const c = await computeFinalAttackComposition(A, pistol, {});
  assert.equal(c.ok, true);
  ok('ordinary single attack / normal full attack unchanged (one attack, no penalty); group from canonical structure');
}

// ---- 2, 3: Rapid Shot -- ability + selected weapon capability; prohibited by a structured firing constraint ---------------------------
{
  const rapid = optionFeat('Rapid Shot', 'rapidShot');
  const A = makeActor({ feats: [rapid] });
  const ids = (w, ctx = {}) => CombatOptionResolver.getAvailableAttackOptions(A, w, { attackType: 'ranged', ...ctx }).map((o) => o.id);
  assert.ok(ids(canon('weapon-blaster-pistol')).includes('rapidShot'), 'ability + ranged canonical weapon -> offered');
  assert.ok(!CombatOptionResolver.getAvailableAttackOptions(makeActor(), canon('weapon-blaster-pistol'), { attackType: 'ranged' }).some((o) => o.id === 'rapidShot'), 'no ability -> not offered');
  // prohibited by structured firing constraint / declared PROHIBITED relation, on renamed canonical items
  for (const k of ['weapon-light-concussion-missile-launcher', 'weapon-flechette-launcher', 'weapon-black-powder-pistol', 'weapon-disruptor-pistol']) {
    assert.ok(!ids(canon(k)).includes('rapidShot'), `${k}: Rapid Shot removed by structured constraint`);
  }
  assert.equal(sel(canon('weapon-light-concussion-missile-launcher')).multiShot.prohibited, true);
  // hard refusal inside rollAttack, BEFORE any ammunition or cost is spent
  let spent = 0; const origSpend = AmmoSystem.spendForWorkflow; AmmoSystem.spendForWorkflow = async () => { spent += 1; return { success: true, spent: false }; };
  const origRE = RollEngine.safeRoll; RollEngine.safeRoll = async (f) => ({ total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] });
  try {
    notes.error.length = 0;
    const lcm = canon('weapon-light-concussion-missile-launcher');
    assert.equal(await rollAttack(A, lcm, { combatOptions: { rapidShot: true }, suppressChat: true }), null);
    assert.equal(spent, 0, 'refused before spending'); assert.ok(notes.error.some((m) => /Rapid Shot cannot be used/.test(m)));
    assert.ok(await rollAttack(A, canon('weapon-blaster-pistol'), { combatOptions: { rapidShot: true }, suppressChat: true }), 'a legal weapon still rolls Rapid Shot');
  } finally { AmmoSystem.spendForWorkflow = origSpend; RollEngine.safeRoll = origRE; }
  ok('Rapid Shot: ability + selected weapon capability; Light Concussion Missile (and other constrained forms) refuse it via structure, before any spend');
}

// ---- 4: Rapid Strike uses the selected melee profile --------------------------------------------------------------------------------------
{
  const strike = optionFeat('Rapid Strike', 'rapidStrike');
  const A = makeActor({ feats: [strike] });
  const lan = canon('weapon-massassi-lanvarok');
  const melee = rt.resolveAttackWeaponRuntime(lan, { profileId: 'melee' }), disc = rt.resolveAttackWeaponRuntime(lan, { profileId: 'disc' });
  assert.equal(melee.branch, 'melee'); assert.equal(disc.branch, 'ranged');
  const offered = (rtm) => CombatOptionResolver.getAvailableAttackOptions(A, lan, { attackType: rtm.branch }).map((o) => o.id);
  assert.ok(offered(melee).includes('rapidStrike')); assert.ok(!offered(disc).includes('rapidStrike'), 'the thrown disc profile is ranged: Rapid Strike (melee) is not offered');
  const base = await computeFinalAttackComposition(A, lan, { profileId: 'melee' });
  const withOpt = await computeFinalAttackComposition(A, lan, { profileId: 'melee', combatOptions: { rapidStrike: true } });
  assert.equal(withOpt.atkBonus - base.atkBonus, -2, '-2 attack from the option on the selected melee profile');
  const comp = resolveDamageComposition(A, lan, { weaponForm: { identityKey: 'weapon-massassi-lanvarok', profileId: 'melee' }, combatOptions: { rapidStrike: true } });
  assert.equal(comp.dice.base, '1d8', 'damage dice are the selected MELEE profile'); assert.match(buildDamageFormula(comp), /^1d8 \+ 1d8/, `+1 weapon die of the selected melee profile: ${buildDamageFormula(comp)}`);
  ok('Rapid Strike: selected melee profile gates the option, -2 attack and +1 die apply to that profile');
}

// ---- 5, 6, 7: Double / Triple Attack join feat choice to the selected canonical form ------------------------------------------------------
{
  const pistol = canon('weapon-blaster-pistol'), rifle = canon('weapon-blaster-rifle');
  const dblPistols = choiceFeat('double-attack', 'Double Attack', { id: 'pistols', group: 'pistols', label: 'Pistols' });
  const A = makeActor({ feats: [dblPistols], items: [pistol, rifle] });
  assert.equal(ma.actorHasMultiAttackFor(A, 'double', pistol), true);
  assert.equal(ma.actorHasMultiAttackFor(A, 'double', rifle), false, 'wrong group choice does not qualify');
  const plan = ma.buildFullAttackSequence(A, { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_ATTACK, primaryWeapon: pistol });
  assert.equal(plan.legal, true); assert.equal(plan.attacks.length, 2); assert.equal(plan.attacks[0].finalPenalty, -5);
  assert.equal(ma.buildFullAttackSequence(A, { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_ATTACK, primaryWeapon: rifle }).legal, false);
  // exact exotic identity choice
  const lanId = choiceFeat('double-attack', 'Double Attack', { id: 'exotic:ranged:sith-lanvarok', group: 'exotic', weaponIdentity: 'Sith Lanvarok' });
  const B = makeActor({ feats: [lanId] });
  assert.equal(ma.actorHasMultiAttackFor(B, 'double', canon('weapon-sith-lanvarok')), true);
  assert.equal(ma.actorHasMultiAttackFor(B, 'double', canon('weapon-massassi-lanvarok')), false, 'a different exotic weapon does not qualify');
  assert.equal(ma.actorHasMultiAttackFor(B, 'double', pistol), false);
  // triple requires BOTH feats' selectors to match the same form
  const trpPistols = choiceFeat('triple-attack', 'Triple Attack', { id: 'pistols', group: 'pistols' });
  const C = makeActor({ feats: [dblPistols, trpPistols] });
  const tri = ma.buildFullAttackSequence(C, { requestedPackage: ma.FULL_ATTACK_PACKAGES.TRIPLE_ATTACK, primaryWeapon: pistol });
  assert.equal(tri.legal, true); assert.equal(tri.attacks.length, 3); assert.equal(tri.attacks[0].finalPenalty, -10);
  assert.equal(ma.buildFullAttackSequence(makeActor({ feats: [trpPistols] }), { requestedPackage: ma.FULL_ATTACK_PACKAGES.TRIPLE_ATTACK, primaryWeapon: pistol }).legal, false, 'Triple without Double for the same selector');
  // each attack carries the same selected form
  assert.ok(plan.attacks.every((a) => JSON.stringify(a.form) === JSON.stringify(plan.attacks[0].form)));
  // firing constraints prohibit multi-shot packages on constrained forms
  const bp = canon('weapon-black-powder-pistol');
  const D = makeActor({ feats: [dblPistols] });
  const refused = ma.buildFullAttackSequence(D, { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_ATTACK, primaryWeapon: bp });
  assert.equal(refused.legal, false); assert.ok(refused.warnings.some((w) => /prohibits abilities that expend multiple shots/.test(w)));
  ok('Double/Triple Attack: exact feat choice (group or exotic identity) joined to the selected canonical form; wrong choice refused; firing constraints enforced');
}


// ---- 8, 9, 10, 11: Autofire consumes the selected canonical form ----------------------------------------------------------------------------
{
  const arc = canon('weapon-arc-9965-blaster', { ammunition: { current: 40, max: 40 } });
  const A = makeActor({ items: [arc] });
  const f = resolveAutofireForm(arc, {});
  assert.equal(f.source, 'canonical'); assert.equal(f.runtime.identityKey, 'weapon-arc-9965-blaster'); assert.equal(f.shape.fireModes.autofire, true);
  assert.equal(f.form.profileId, 'primary', 'the selected canonical profile, not an Item default');
  assert.equal(f.shape.autofireUnits, 10);
  // a form that cannot autofire is refused (never "autofire anyway")
  const pistol = canon('weapon-blaster-pistol');
  assert.equal(resolveAutofireForm(pistol, {}).error?.code, 'attack-shape-illegal');
  // range: canonical bands of the selected form drive the attack composition
  const near = await computeFinalAttackComposition(A, arc, { ...f.selection, rangeBand: 'pointBlank', autofire: true });
  const far = await computeFinalAttackComposition(A, arc, { ...f.selection, rangeBand: 'long', autofire: true });
  assert.equal(near.ok, true);
  assert.ok(far.ok === false || far.atkBonus < near.atkBonus, 'canonical range penalty / allowed bands apply to autofire');
  // damage: canonical base of the selected form (the Item projection is a stale 9d9)
  const comp = resolveDamageComposition(A, arc, { weaponForm: f.form, autofire: true });
  assert.equal(comp.dice.base, '3d8');
  // ammo: canonical autofire units (arc: 10); Burst Fire stays the feat's 5
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: arc, options: { autofire: true, canonicalAutofireUnits: f.shape.autofireUnits } }), 10);
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: arc, options: { autofire: true, canonicalAutofireUnits: 4 } }), 4, 'a form with different structured units is honored');
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: arc, options: { autofire: true } }), 10, 'legacy fallback unchanged');
  ok('Autofire: canonical selected form, canonical range, canonical damage, canonical autofire ammunition units; non-autofire forms refused');
}

// ---- 8b: the real rollAutofire() run consumes the canonical form end to end -----------------------------------------------------------------
{
  const arc = canon('weapon-arc-9965-blaster', { ammunition: { current: 40, max: 40 } });
  const burstFeat = optionFeat('Burst Fire', 'burstFire');
  const A = makeActor({ items: [arc], feats: [burstFeat] });
  const origTrack = AmmoSystem.isTrackingEnabled, origConsume = AmmoSystem.consumeAmmunition, origPost = SWSEChat.postRoll, origRE = RollEngine.safeRoll, origSWSE = globalThis.SWSE, origSafe = SWSERoll._safeRoll;
  let consumed = null; const formulas = [];
  AmmoSystem.isTrackingEnabled = () => true;
  AmmoSystem.consumeAmmunition = async (a, w, n) => { consumed = n; return { success: true, newAmmo: 40 - n, previousAmmo: 40 }; };
  SWSEChat.postRoll = async () => ({});
  const stub = async (f) => { formulas.push(f); return { total: 16, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  RollEngine.safeRoll = stub; SWSERoll._safeRoll = stub; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stub } };
  try {
    const run = async (opts) => { consumed = null; formulas.length = 0; const r = await SWSERoll.rollAutofire(A, arc, { targets: [target()], skipFP: true, ...opts }); return { r, consumed, formulas: [...formulas] }; };
    const expectBonus = (await computeFinalAttackComposition(A, arc, { ...resolveAutofireForm(arc, {}).selection, autofire: true, attackMode: 'autofire', sequencePenalty: -5 })).atkBonus;
    const af = await run({});
    assert.ok(af.r?.success, 'autofire resolved'); assert.equal(af.consumed, 10, 'canonical autofire units');
    assert.equal(af.formulas[0], `1d20 + ${expectBonus}`, 'attack bonus is the canonical composition with the autofire penalty');
    assert.match(af.formulas[1], /^3d8/, 'damage is the canonical 3d8 of the selected form (Item projection is a stale 9d9)');
    const bf = await run({ burstFire: true });
    assert.ok(bf.r?.success); assert.equal(bf.consumed, 5, 'Burst Fire: five shots');
    const burstBonus = (await computeFinalAttackComposition(A, arc, { ...resolveAutofireForm(arc, {}).selection, autofire: true, attackMode: 'autofire', combatOptions: { burstFire: true } })).atkBonus;
    assert.equal(bf.formulas[0], `1d20 + ${burstBonus}`, 'Burst Fire -5 comes from the option once (not doubled)');
    assert.match(bf.formulas[1], /^3d8 \+ 3d8|^3d8 \+ 2d8|^5d8/, `Burst Fire +2 weapon dice through the one composition: ${bf.formulas[1]}`);
    // a canonical form that cannot autofire is refused, nothing consumed
    const pistol = canon('weapon-blaster-pistol', { ammunition: { current: 5, max: 5 } });
    consumed = null; notes.warn.length = 0;
    assert.equal(await SWSERoll.rollAutofire(makeActor({ items: [pistol] }), pistol, { targets: [target()], skipFP: true }), null);
    assert.equal(consumed, null); assert.ok(notes.warn.some((m) => /cannot autofire/.test(m)));
  } finally { AmmoSystem.isTrackingEnabled = origTrack; AmmoSystem.consumeAmmunition = origConsume; SWSEChat.postRoll = origPost; RollEngine.safeRoll = origRE; SWSERoll._safeRoll = origSafe; globalThis.SWSE = origSWSE; }
  // legacy/homebrew autofire keeps its own path
  {
    const hb = legacy({ properties: ['autofire'], damage: '3d6', ammunition: { current: 40, max: 40 } }, 'Homebrew Repeater');
    const rolls = []; const stub2 = async (f) => { rolls.push(f); return { total: 16, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
    const o1 = SWSERoll._safeRoll, o2 = SWSEChat.postRoll, o3 = RollEngine.safeRoll, o4 = globalThis.SWSE;
    SWSERoll._safeRoll = stub2; SWSEChat.postRoll = async () => ({}); RollEngine.safeRoll = stub2; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: stub2 } };
    try {
      const r = await SWSERoll.rollAutofire(makeActor({ items: [hb] }), hb, { targets: [target()], skipFP: true });
      assert.ok(r?.success, 'legacy autofire still functions'); assert.match(rolls[1] ?? '', /^3d6/);
    } finally { SWSERoll._safeRoll = o1; SWSEChat.postRoll = o2; RollEngine.safeRoll = o3; globalThis.SWSE = o4; }
  }
  ok('rollAutofire end to end: canonical units (10 / Burst 5), canonical attack composition (penalty counted once), canonical damage; non-autofire form refused; legacy autofire unchanged');
}

// ---- 12: Burst Fire needs autofire capability AND the feat -----------------------------------------------------------------------------------
{
  const burst = optionFeat('Burst Fire', 'burstFire');
  const withFeat = makeActor({ feats: [burst] }), without = makeActor();
  const opts = (actor, w) => CombatOptionResolver.getAvailableAttackOptions(actor, w, { attackType: 'ranged' }).map((o) => o.id);
  assert.ok(opts(withFeat, canon('weapon-arc-9965-blaster')).includes('burstFire'));
  assert.ok(!opts(without, canon('weapon-arc-9965-blaster')).includes('burstFire'), 'autofire-capable weapon alone does not grant Burst Fire');
  assert.ok(!opts(withFeat, canon('weapon-blaster-pistol')).includes('burstFire'), 'the feat alone does not make a single-shot form offer Burst Fire');
  // forced through rollAttack it is refused (fail closed) before any spend
  let spent = 0; const origSpend = AmmoSystem.spendForWorkflow; AmmoSystem.spendForWorkflow = async () => { spent += 1; return { success: true }; };
  try {
    notes.error.length = 0;
    assert.equal(await rollAttack(withFeat, canon('weapon-blaster-pistol'), { combatOptions: { burstFire: true }, suppressChat: true }), null);
    assert.equal(spent, 0); assert.ok(notes.error.some((m) => /Burst Fire requires an autofire-capable form/.test(m)));
  } finally { AmmoSystem.spendForWorkflow = origSpend; }
  // autofire-only forms cannot be fired as a normal single attack
  const hab = canon('weapon-heavy-assault-blaster');
  assert.equal(sel(hab).fireModes.autofireOnly, true);
  notes.error.length = 0; assert.equal(await rollAttack(makeActor(), hab, { suppressChat: true }), null); assert.ok(notes.error.some((m) => /autofire mode/.test(m)));
  ok('Burst Fire requires autofire capability and the actor feat; autofire-only forms refuse a normal single attack');
}

// ---- multi-attack modifiers declared by the weapon are consumed from the active multi-attack shape ---------------------------------------------
{
  const origRE = RollEngine.safeRoll, origPost = SWSEChat.postRoll, origAmmo = AmmoSystem.spendForWorkflow;
  const posted = [];
  RollEngine.safeRoll = async (f) => ({ total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] });
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
  try {
    const rapid = optionFeat('Rapid Shot', 'rapidShot'), strike = optionFeat('Rapid Strike', 'rapidStrike');
    const bonusOf = async (actor, weapon, opts) => { posted.length = 0; await rollAttack(actor, weapon, { suppressChat: false, target: target(), ...opts }); return posted.find((p) => p.context?.workflowContext)?.context?.workflowContext; };
    const total = async (actor, weapon, opts) => (await computeFinalAttackComposition(actor, weapon, opts)).atkBonus;
    // Heavy slugthrower pistol: an additional -1 while Double Attack / Triple Attack / Rapid Shot is used (weapon-declared, structured)
    const hsp = canon('weapon-heavy-slugthrower-pistol');
    const A = makeActor({ feats: [rapid] });
    const plain = await bonusOf(A, hsp, {}); assert.equal(plain.special?.mechanics?.some((m) => m.family === 'multi-attack-interaction'), true, 'the mechanic is carried');
    // measure via the roll formula: 1d20 + bonus
    const rolls = []; RollEngine.safeRoll = async (f) => { rolls.push(f); return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
    const bonus = async (actor, weapon, opts) => { rolls.length = 0; await rollAttack(actor, weapon, { suppressChat: true, target: target(), ...opts }); return Number(/\+ (-?\d+)$/.exec(rolls[0])[1]); };
    const none = await bonus(A, hsp, {});
    assert.equal(await bonus(A, hsp, { combatOptions: { rapidShot: true } }) - none, -2 - 1, 'Rapid Shot -2 plus the weapon-declared extra -1');
    assert.equal(await bonus(A, hsp, { packageType: 'doubleAttack', sequencePenalty: -5 }) - none, -5 - 1, 'Double Attack sequence penalty plus the weapon-declared extra -1');
    // Power Hammer: -2 while using Double Attack / Triple Attack / Rapid Strike
    const ph = canon('unmapped::Power Hammer');
    const B = makeActor({ feats: [strike] });
    const phNone = await bonus(B, ph, {});
    assert.equal(await bonus(B, ph, { combatOptions: { rapidStrike: true } }) - phNone, -2 - 2);
    assert.equal(await bonus(B, ph, { packageType: 'tripleAttack', sequencePenalty: -10 }) - phNone, -10 - 2);
    // Zhaboka: its weapon declares REMOVE_RAPID_STRIKE_ATTACK_PENALTY -> the option's -2 is cancelled; a weapon without it keeps -2
    const zh = canon('unmapped::Zhaboka'), ref = canon('unmapped::Quarterstaff');
    const zNone = await bonus(B, zh, {}), rNone = await bonus(B, ref, {});
    assert.equal(await bonus(B, zh, { combatOptions: { rapidStrike: true } }) - zNone, 0, 'weapon-declared removal of the Rapid Strike attack penalty');
    assert.equal(await bonus(B, ref, { combatOptions: { rapidStrike: true } }) - rNone, -2);
  } finally { RollEngine.safeRoll = origRE; SWSEChat.postRoll = origPost; AmmoSystem.spendForWorkflow = origAmmo; }
  ok('weapon-declared multi-attack modifiers apply only while the named ability is in use (heavy slugthrower -1, Power Hammer -2, Zhaboka removes the Rapid Strike penalty)');
}

// ---- 13, 14, 15: dual wield on canonical identities, Dual Weapon Mastery, Sith Lanvarok -----------------------------------------------------
{
  const pistol = canon('weapon-blaster-pistol'), pistol2 = { ...canon('weapon-heavy-blaster-pistol'), id: 'w2' };
  const dwm = (n) => feat(`Dual Weapon Mastery ${['I', 'II', 'III'][n - 1]}`, { system: { slug: `dual-weapon-mastery-${'i'.repeat(n)}` } });
  const penalty = (actor, o = {}) => DualWieldCombatShapeResolver.resolve(actor, { primaryWeapon: pistol, offhandWeapon: pistol2, ...o }).penalty;
  const base = makeActor({ items: [pistol, pistol2] });
  const shape = DualWieldCombatShapeResolver.resolve(base, { primaryWeapon: pistol, offhandWeapon: pistol2 });
  assert.equal(shape.mode, 'dualWield'); assert.equal(shape.penalty.final, -10); assert.equal(shape.mainHand.proficient, true);
  assert.equal(penalty(makeActor({ feats: [dwm(1)] })).final, -5); assert.equal(penalty(makeActor({ feats: [dwm(2)] })).final, -2); assert.equal(penalty(makeActor({ feats: [dwm(3)] })).final, 0);
  // not proficient with the off-hand form -> Dual Weapon Mastery does not apply
  const noProf = makeActor({ feats: [dwm(3)] }); noProf.items = col(noProf.items.filter((i) => !/Pistols/.test(i.name))); noProf.system.weaponProficiencies = ['rifles'];
  assert.equal(penalty(noProf).final, -10, 'canonical proficiency gate: unproficient -> base -10 even with DWM III');
  // the removed fake feat is not a dependency: owning an item with that name changes nothing
  assert.equal(penalty(makeActor({ feats: [feat('Two-Weapon Fighting')] })).final, -10);
  const lanvarok = canon('weapon-sith-lanvarok', { equipped: true }, { id: 'lan' });
  const rifle = canon('weapon-blaster-rifle', { equipped: true }, { id: 'rif' });
  assert.deepEqual({ ...sel(lanvarok).dualWield }, { eligibleAsSecondWeapon: true, handsRemainFree: true, wornNotHeld: true });
  assert.equal(sel(pistol).dualWield.eligibleAsSecondWeapon, false);
  const L = makeActor({ items: [rifle, lanvarok], feats: [feat('Exotic Weapon Proficiency (Sith Lanvarok)'), dwm(1)] });
  const eq = ma.getEquippedWeapons(L);
  assert.equal(eq.primary.id, 'rif'); assert.equal(eq.offhand.id, 'lan', 'structurally eligible second weapon is the off-hand without designation');
  const two = ma.buildFullAttackSequence(L, { requestedPackage: ma.FULL_ATTACK_PACKAGES.TWO_WEAPON, primaryWeapon: rifle, offhandWeapon: lanvarok });
  assert.equal(two.legal, true); assert.equal(two.attacks.length, 2); assert.equal(two.attacks[1].handRole, 'offhand');
  const shape2 = DualWieldCombatShapeResolver.resolve(L, { primaryWeapon: rifle });
  assert.equal(shape2.offHand.weapon.id, 'lan');
  ok('dual wield on canonical identities; Dual Weapon Mastery I/II/III and the proficiency gate; Two-Weapon Fighting not a dependency; Sith Lanvarok eligible by structure');
}

// ---- 16, 17, 18: double weapons: native, mounted Vibrobayonet host configuration, detached ----------------------------------------------------
{
  const dbl = canon('weapon-double-bladed-lightsaber');
  assert.equal(ma.isDoubleWeapon(dbl), true);
  const ends = rt.doubleWeaponEnds(dbl);
  assert.deepEqual(ends.map((e) => e.endId), ['end1', 'end2']); assert.equal(ends[0].via, 'profile');
  const A = makeActor({ feats: [feat('Weapon Proficiency (Lightsabers)')], items: [dbl] });
  A.system.weaponProficiencies.push('lightsabers');
  const plan = ma.buildFullAttackSequence(A, { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_WEAPON, primaryWeapon: dbl });
  assert.equal(plan.legal, true); assert.deepEqual(plan.attacks.map((a) => a.form.profileId), ['end1', 'end2'], 'each end carries its own canonical profile');
  assert.deepEqual(plan.attacks.map((a) => a.attackIndex), [0, 1]);

  // mounted Vibrobayonet + rifle: a double weapon ONLY in the valid host configuration
  const vib = canon('unmapped::Vibrobayonet');
  const mounted = { configurationId: 'mounted-on-rifle' };
  assert.equal(ma.isDoubleWeapon(vib, mounted), false, 'unanswered host condition (stock folded?) is not assumed');
  const answered = { ...mounted, answers: { 'host-rifle-stock-folded': false } };
  assert.equal(ma.isDoubleWeapon(vib, answered), true);
  const folded = { ...mounted, answers: { 'host-rifle-stock-folded': true } };
  assert.equal(ma.isDoubleWeapon(vib, folded), false, 'a folded host stock invalidates the configuration');
  assert.equal(ma.isDoubleWeapon(vib, { configurationId: 'detached', answers: { 'host-rifle-stock-folded': false } }), false, 'detached Vibrobayonet functions as a Vibrodagger, not the mounted double weapon');
  assert.equal(ma.isDoubleWeapon(canon('weapon-blaster-rifle'), answered), false, 'a rifle is never globally a double weapon');
  assert.equal(ma.isDoubleWeapon(vib, {}), false, 'default configuration alone does not grant it either unless valid');
  const hostEnds = rt.doubleWeaponEnds(vib, answered);
  assert.deepEqual(hostEnds.map((e) => e.endId), ['vibrobayonet-end', 'rifle-butt-club-end']);
  const hostPlan = ma.buildFullAttackSequence(makeActor({ items: [vib] }), { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_WEAPON, primaryWeapon: vib, primaryForm: mounted, answers: answered.answers });
  assert.equal(hostPlan.legal, true); assert.deepEqual(hostPlan.attacks.map((a) => a.form.endId), ['vibrobayonet-end', 'rifle-butt-club-end']);
  // ends resolve as their own canonical definitions
  const endA = rt.resolveAttackWeaponRuntime(vib, { ...answered, endId: 'vibrobayonet-end' }), endB = rt.resolveAttackWeaponRuntime(vib, { ...answered, endId: 'rifle-butt-club-end' });
  assert.equal(endA.identityKey, 'unmapped::Vibrobayonet'); assert.equal(endB.identityKey, 'unmapped::Club/Baton'); assert.equal(endB.hostIdentityKey, 'unmapped::Vibrobayonet');
  assert.throws(() => rt.resolveAttackWeaponRuntime(vib, { configurationId: 'detached', endId: 'rifle-butt-club-end', answers: answered.answers }), (e) => e.code === 'double-weapon-end-unavailable');
  assert.throws(() => rt.resolveAttackWeaponRuntime(vib, { ...mounted, endId: 'rifle-butt-club-end' }), (e) => e.code === 'double-weapon-end-unavailable', 'unanswered condition: the end is unavailable');
  ok('native double weapon resolves both ends; mounted Vibrobayonet+rifle is a double weapon only in the valid host configuration; detached / folded-stock / rifle alone are not');
}

// ---- 19: Amphistaff double-weapon behavior is configuration-specific ------------------------------------------------------------------------
{
  const amph = canon('unmapped::Amphistaff');
  assert.equal(ma.isDoubleWeapon(amph, { configurationId: 'quarterstaff' }), true);
  assert.equal(ma.isDoubleWeapon(amph, { configurationId: 'spear', profileId: 'spear-melee' }), false);
  assert.equal(ma.isDoubleWeapon(amph, { configurationId: 'whip', profileId: 'whip-melee' }), false);
  assert.deepEqual(rt.doubleWeaponEnds(amph, { configurationId: 'quarterstaff' }).map((e) => e.endId), ['quarterstaff-end1', 'quarterstaff-end2']);
  assert.deepEqual(rt.doubleWeaponEnds(amph, { configurationId: 'spear' }), []);
  ok('Amphistaff: only the quarterstaff configuration is a double weapon (two ends); spear/whip are not');
}

// ---- 20: resource preflight is per attack form and covers the whole sequence ---------------------------------------------------------------
{
  const cost = (actor, plan, opts = {}) => _aggregateFullAttackAmmo(actor, plan, opts);
  const pistol = canon('weapon-blaster-pistol', { ammunition: { current: 1, max: 100 } });
  const dblFeat = choiceFeat('double-attack', 'Double Attack', { id: 'pistols', group: 'pistols' });
  const A = makeActor({ feats: [dblFeat], items: [pistol] });
  const plan = ma.buildFullAttackSequence(A, { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_ATTACK, primaryWeapon: pistol });
  const aggregated = cost(A, plan);
  assert.equal(aggregated.length, 1); assert.equal(aggregated[0].amount, 2, 'Double Attack costs units per ACTUAL attack (2 x 1)');
  const origTrack = AmmoSystem.isTrackingEnabled; AmmoSystem.isTrackingEnabled = () => true;
  try {
    const pre = AmmoSystem.preflightAmmunition(A, pistol, aggregated[0].amount, {});
    assert.equal(pre.ok, false, 'the whole sequence is preflighted: 2 shots needed, 1 available -> refused before ANY spend');
  } finally { AmmoSystem.isTrackingEnabled = origTrack; }
  const trpFeat = choiceFeat('triple-attack', 'Triple Attack', { id: 'pistols', group: 'pistols' });
  const T = makeActor({ feats: [dblFeat, trpFeat], items: [pistol] });
  assert.equal(cost(T, ma.buildFullAttackSequence(T, { requestedPackage: ma.FULL_ATTACK_PACKAGES.TRIPLE_ATTACK, primaryWeapon: pistol }))[0].amount, 3);
  // mode-specific form cost: Variable Blaster medium mode x5 per attack
  const vbl = canon('weapon-variable-blaster');
  const vForm = { profileId: 'medium', modeId: 'medium' };
  const V = makeActor({ feats: [dblFeat], items: [vbl] });
  const vplan = { attacks: [{ weapon: vbl, form: vForm, finalPenalty: 0 }, { weapon: vbl, form: vForm, finalPenalty: 0 }] };
  assert.equal(cost(V, vplan)[0].amount, 10, 'each attack costs its own form units (5 + 5)');
  // dual wield: each weapon its own pool; double weapon: the club end is free
  const p2 = { ...canon('weapon-heavy-blaster-pistol'), id: 'w2' };
  const dualPlan = { attacks: [{ weapon: pistol, form: {}, finalPenalty: -10 }, { weapon: p2, form: {}, finalPenalty: -10 }] };
  assert.equal(cost(A, dualPlan).length, 2, 'each weapon aggregates against its own resource');
  const vib = canon('unmapped::Vibrobayonet', { ammunition: { current: 5, max: 5 } });
  const dwPlan = { attacks: [{ weapon: vib, form: { configurationId: 'mounted-on-rifle', endId: 'vibrobayonet-end' }, finalPenalty: -10 }, { weapon: vib, form: { configurationId: 'mounted-on-rifle', endId: 'rifle-butt-club-end' }, finalPenalty: -10 }] };
  assert.equal(cost(makeActor({ items: [vib] }), dwPlan, { answers: { 'host-rifle-stock-folded': false } }).reduce((n, c) => n + c.amount, 0), 0, 'melee ends spend nothing from a ranged host');
  assert.throws(() => cost(makeActor({ items: [vib] }), dwPlan, {}), (e) => e.code === 'double-weapon-end-unavailable', 'an unresolvable end refuses the whole sequence before anything is spent');
  ok('resource preflight: per-attack canonical cost, whole sequence aggregated per weapon, melee double-weapon ends free, unresolvable end refuses everything');
}

// ---- 21, 22: each generated attack keeps its own workflow context; damage uses THAT attack's form ------------------------------------------
{
  const vib = canon('unmapped::Vibrobayonet');
  const A = makeActor({ items: [vib] });
  const answers = { 'host-rifle-stock-folded': false };
  const plan = ma.buildFullAttackSequence(A, { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_WEAPON, primaryWeapon: vib, primaryForm: { configurationId: 'mounted-on-rifle' }, answers });
  assert.equal(plan.legal, true);
  const posted = [], rolls = [];
  const origRE = RollEngine.safeRoll, origPost = SWSEChat.postRoll, origAmmo = AmmoSystem.spendForWorkflow, origSWSE = globalThis.SWSE;
  RollEngine.safeRoll = async (f) => ({ total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] });
  globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: async (f) => { rolls.push(f); return { total: 8, formula: f, dice: [] }; } } };
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
  try {
    const ctxs = [];
    for (const [index, attack] of plan.attacks.entries()) {
      posted.length = 0;
      await rollAttack(A, attack.weapon, { ...rt.attackSelectionOf(attack.form), answers, fireMode: attack.fireMode, handRole: attack.handRole, packageType: plan.packageType, sequencePenalty: attack.finalPenalty, sequenceId: 'seq1', sequenceIndex: index, sequenceLength: plan.attacks.length, target: target() });
      const wf = posted.find((p) => p.context?.workflowContext).context.workflowContext;
      ctxs.push(ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext(wf)));
    }
    assert.equal(ctxs[0].weaponForm.endId, 'vibrobayonet-end'); assert.equal(ctxs[1].weaponForm.endId, 'rifle-butt-club-end');
    assert.equal(ctxs[0].weaponForm.identityKey, 'unmapped::Vibrobayonet'); assert.equal(ctxs[1].weaponForm.identityKey, 'unmapped::Club/Baton');
    assert.deepEqual(ctxs.map((c) => c.attackShape.attackIndex), [0, 1]); assert.deepEqual(ctxs.map((c) => c.attackShape.handRole), ['double-primary', 'double-secondary']);
    assert.ok(ctxs.every((c) => c.attackShape.sequenceId === 'seq1' && c.attackShape.sequenceLength === 2 && c.attackShape.packageType === 'doubleWeapon'));
    // damage clicked from attack #2 uses attack #2's form (club 1d6), attack #1 its own (vibrobayonet 2d6)
    for (const [i, expected] of [[0, /^2d6/], [1, /^1d6/]]) {
      rolls.length = 0; posted.length = 0;
      await rollDamage(A, vib, { combatContext: ctxs[i], workflowContext: ctxs[i], answers, suppressChat: true });
      assert.match(rolls[0], expected, `attack #${i + 1} damage uses its own selected end`);
    }
  } finally { RollEngine.safeRoll = origRE; SWSEChat.postRoll = origPost; AmmoSystem.spendForWorkflow = origAmmo; globalThis.SWSE = origSWSE; }
  ok('every attack of a sequence keeps its own workflow context (form, end, index, hand role); each damage click resolves that attack\'s form');
}

// ---- 23, 24: corrected 5D-E critical + multiplier ordering remain correct ---------------------------------------------------------------------
{
  const A = makeActor({ level: 1 }); A.system.attributes.str = ab(0); A.system.attributes.dex = ab(0);
  const lcm = canon('weapon-light-concussion-missile-launcher', { flatDamageBonus: 3 });
  const ctx = { weaponForm: { identityKey: 'weapon-light-concussion-missile-launcher', profileId: 'light-concussion-missile' } };
  assert.equal(buildDamageFormula(resolveDamageComposition(A, lcm, ctx)), '(4d10 + 3) * 2');
  assert.equal(buildDamageFormula(resolveDamageComposition(A, lcm, { ...ctx, isCritical: true })), '((4d10 + 3) * 2) * 2');
  ok('corrected 5D-E multiplier staging and critical stacking still hold');
}

// ---- 25: stock droid / NPC flat contracts unchanged ----------------------------------------------------------------------------------------
{
  const droid = makeActor({ type: 'droid' });
  const stock = { ...canon('weapon-blaster-pistol'), flags: { swse: { canonicalWeapon: { identityKey: 'weapon-blaster-pistol' }, stockDroidAttack: { sourceStatblock: true, publishedDamage: '4d4' } } } };
  const c = resolveDamageComposition(droid, stock, {});
  if (c.flags?.stockDamageFormula) assert.equal(c.dice.base, c.flags.stockDamageFormula);
  assert.equal(c.dice.baseMultiplier, 1);
  ok('stock droid / NPC flat damage contracts unchanged');
}

// ---- 26: legacy / homebrew multi-attack still functions -----------------------------------------------------------------------------------
{
  const hb = legacy({ proficiency: 'pistols' }, 'Homebrew Pistol');
  const dbl = feat('Double Attack (Pistols)');
  const A = makeActor({ feats: [dbl], items: [hb] });
  assert.equal(ma.getWeaponGroup(hb), 'pistols'); assert.equal(ma.actorHasMultiAttackFor(A, 'double', hb), true);
  const plan = ma.buildFullAttackSequence(A, { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_ATTACK, primaryWeapon: hb });
  assert.equal(plan.legal, true); assert.equal(plan.attacks.length, 2); assert.equal(plan.attacks[0].finalPenalty, -5);
  const staff = legacy({ properties: ['double'], weaponCategory: 'melee', proficiency: 'simple' }, 'Homebrew Staff');
  assert.equal(ma.isDoubleWeapon(staff), true);
  const dwPlan = ma.buildFullAttackSequence(makeActor({ items: [staff] }), { requestedPackage: ma.FULL_ATTACK_PACKAGES.DOUBLE_WEAPON, primaryWeapon: staff });
  assert.equal(dwPlan.legal, true); assert.equal(dwPlan.attacks.length, 2);
  const cfg = ma.calculateFullAttackConfig(A, hb);
  assert.equal(cfg.hasDoubleAttack, true);
  ok('legacy/homebrew multi-attack (group-name Double Attack, property double weapon, full attack config) still functions');
}

console.log(`Phase 5D-F multi-attack convergence: ${step} checks passed.`);
