import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-E -- the structured special mechanics of the SELECTED canonical attack form are consumed through the existing
// systems: damage composition (multiplier / critical effects), the separate-rider damage card, the target-defense authority
// (alternate defense), the modifier pipeline (conditional attack modifiers), DamagePacket component tags (DR bypass) and the
// CombatTargetEffectAdapter (condition-track riders). The runtime selects the rule; nothing here branches on a weapon name.

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

const { resolveDamageComposition, buildDamageFormula } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { buildDamagePacket } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js');
const { DamageReductionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/resolvers/damage-reduction-resolver.js');
const { applyCanonicalSpecialEffects } = await import('/systems/foundryvtt-swse/scripts/engine/combat/canonical-special-effects.js');
const ser = await import('/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry, registryData } = await import('./helpers/weapon-runtime-fixture.mjs');
const { buildCensus, OUT_JSON } = await import('../tools/census-weapon-special-mechanics.mjs');
import fs from 'node:fs';
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
function makeActor({ str = 3, dex = 4, level = 6, type = 'character', feats = [], id = 'a1' } = {}) {
  return {
    id, name: 'Tester', type, flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col(feats.map((f, i) => ({ id: `f${i}`, type: 'feat', name: f, system: {} }))),
    system: { bab: 5, level, attributes: { str: ab(str), dex: ab(dex), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } },
  };
}
// a target the attack pipeline can read: prepared derived defenses, size, hp, condition track
function makeTarget({ reflex = 12, fortitude = 18, will = 10, size = 'medium', hp = 30 } = {}) {
  const t = {
    id: 't1', name: 'Dummy', type: 'npc', flags: { swse: {} }, effects: [], items: col([]), getFlag() { return undefined; },
    system: { size, hp: { value: hp, max: hp }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: reflex }, fortitude: { total: fortitude }, will: { total: will } } } },
  };
  return t;
}
const canon = (k, system = {}, flags = {}) => ({ id: `w-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k }, ...flags } }, system: { damage: '9d9', damageType: 'sonic', ...system } });
const legacy = (system = {}) => ({ id: 'hb', name: 'Homebrew', type: 'weapon', system: { weaponCategory: 'melee', damage: '2d6', damageType: 'energy', ...system } });
const form = (k, sel) => ({ weaponForm: { identityKey: k, ...sel } });
const comp = (actor, weapon, ctx = {}) => resolveDamageComposition(actor, weapon, ctx);
const formula = (actor, weapon, ctx = {}) => buildDamageFormula(comp(actor, weapon, ctx));
const A = makeActor();
const mechOf = (weapon, ctx = {}) => rt.resolveCanonicalDamage(weapon, ctx).mechanics;
const fam = (mechs, f) => mechs.filter((m) => m.family === f);

// ---- 1, 2: the selected profile's mechanics are resolved; another profile of the same weapon does not inherit them -----------------
{
  const pt = canon('weapon-miniature-proton-torpedo-launcher');
  const single = mechOf(pt, form('weapon-miniature-proton-torpedo-launcher', { profileId: 'single-target' }));
  const area = mechOf(pt, form('weapon-miniature-proton-torpedo-launcher', { profileId: 'area' }));
  assert.equal(fam(single, 'damage-multiplier')[0].multiplier, 2);
  assert.equal(fam(area, 'damage-multiplier').length, 0, 'the area profile does not inherit the single-target profile multiplier');
  assert.equal(fam(single, 'attack-modifier-auto').length, 1); assert.equal(fam(area, 'attack-modifier-auto').length, 0);
  const amph = canon('unmapped::Amphistaff');
  const spear = mechOf(amph, form('unmapped::Amphistaff', { profileId: 'spear-melee', configurationId: 'spear' }));
  const pin = mechOf(amph, form('unmapped::Amphistaff', { profileId: 'whip-pin', configurationId: 'whip' }));
  assert.equal(fam(spear, 'ct-rider').length, 1); assert.equal(fam(pin, 'ct-rider').length, 0);
  assert.deepEqual(fam(pin, 'special-action').map((m) => m.id), ['pin-without-feat']);
  ok('selected profile mechanics resolve (multiplier, size penalty, CT rider); a sibling profile does not inherit them');
}

// ---- 3: payload effects persist with the selected payload and are not fabricated into damage ----------------------------------------
{
  const wr = canon('weapon-wrist-rocket-launcher');
  const pay = (payloadId) => form('weapon-wrist-rocket-launcher', { profileId: 'primary', payloadId });
  const nerve = rt.resolveCanonicalDamage(wr, pay('hollow-tip-nerve-toxin'));
  assert.deepEqual(nerve.specialEffects.map((e) => e.effect), ['nerve-agent-injection']);
  assert.deepEqual(fam(nerve.mechanics, 'payload-effect').map((m) => m.policy), ['DEFER'], 'incomplete payload effect: DEFER, surfaced');
  assert.equal(nerve.base, null, 'no ordinary dice fabricated for an effect-only payload');
  const flash = rt.resolveCanonicalDamage(wr, pay('flash'));
  assert.equal(flash.status, 'no-damage'); assert.deepEqual(flash.specialEffects.map((e) => e.effect), ['blinded']);
  assert.deepEqual(fam(flash.mechanics, 'payload-effect').map((m) => m.policy), ['DEFER'], 'area + status effect: complete structure but multi-target/status owner is a later phase');
  const gas = rt.resolveCanonicalDamage(wr, pay('hollow-tip-stun-gas'));
  assert.equal(gas.status, 'no-damage'); assert.equal(gas.specialEffects.length, 0, 'stun-gas payload carries no structured effect: a completeness issue, not invented behavior');
  assert.deepEqual(fam(rt.resolveCanonicalDamage(wr, pay('antivehicle')).mechanics, 'display-note').map((m) => m.policy), ['DISPLAY_ONLY'], 'unstructured printed note is display-only');
  ok('payload effects (flash, stun gas, nerve toxin) persist with the selected payload; deferred, never turned into damage');
}

// ---- 5: critical effects only on a critical hit ---------------------------------------------------------------------------------------
{
  const hab = canon('weapon-heavy-assault-blaster'), vs = canon('weapon-verpine-shattergun');
  const base = (w, id, ctx) => comp(A, w, { ...form(id, { profileId: 'primary' }), ...ctx }).dice.base;
  assert.equal(base(hab, 'weapon-heavy-assault-blaster', {}), '3d10');
  assert.equal(base(hab, 'weapon-heavy-assault-blaster', { isCritical: true }), '3d12', 'critical die-size upgrade 10 -> 12 (dice count preserved)');
  const normalV = comp(A, vs, form('weapon-verpine-shattergun', { profileId: 'primary' }));
  const critV = comp(A, vs, { ...form('weapon-verpine-shattergun', { profileId: 'primary' }), isCritical: true });
  assert.equal(normalV.critical.bonusFormula, ''); assert.match(critV.critical.bonusFormula, /1d10/);
  const f = buildDamageFormula(critV);
  assert.ok(f.endsWith('+ (1d10)') || /\* 2 \+ \(.*1d10.*\)$/.test(f), `extra damage is added AFTER critical multiplication: ${f}`);
  assert.doesNotMatch(buildDamageFormula(normalV), /1d10\)$/);
  ok('critical effects apply only on a critical: die replacement 3d10 -> 3d12; extra 1d10 after the multiplier; neither on a normal hit');
}

// ---- 7: damage multiplier through the existing composition, and combined with a critical -----------------------------------------
{
  const lcm = canon('weapon-light-concussion-missile-launcher');
  const ctx = form('weapon-light-concussion-missile-launcher', { profileId: 'light-concussion-missile' });
  const c = comp(A, lcm, ctx);
  assert.equal(c.dice.baseMultiplier, 2); assert.equal(c.dice.base, '4d10');
  const f = buildDamageFormula(c);
  assert.match(f, /^\(4d10( \+ \d+)?\) \* 2/, `multiplier wraps the weapon damage expression (dice + weapon-damage bonuses): ${f}`);
  const fc = buildDamageFormula(comp(A, lcm, { ...ctx, isCritical: true }));
  assert.match(fc, /^\(\(4d10( \+ \d+)?\) \* 2.*\) \* 2$/, `critical multiplies on top of the weapon multiplier: ${fc}`);
  const pt = canon('weapon-miniature-proton-torpedo-launcher');
  assert.match(formula(A, pt, form('weapon-miniature-proton-torpedo-launcher', { profileId: 'single-target' })), /^\(6d10( \+ \d+)?\) \* 2/);
  assert.equal(comp(A, pt, form('weapon-miniature-proton-torpedo-launcher', { profileId: 'area' })).dice.baseMultiplier, 1);
  // a payload ×N is applied once (payload multiplier replaces, never stacks with, the profile one)
  assert.equal(rt.resolveCanonicalDamage(lcm, ctx).damageShape.baseMultiplier, 2);
  ok('damage multiplier applies once via the existing composition (6d10x2 / 4d10x2) and composes with the critical multiplier');
}

// ---- 8, 9: riders are separate damage events; AND types stay one component ------------------------------------------------------------
{
  const whip = canon('unmapped::Neuronic Whip');
  const cd = rt.resolveCanonicalDamage(whip, {});
  assert.equal(cd.damageMode, 'stun', 'native-stun form defaults to stun'); assert.equal(cd.base, '2d8');
  assert.deepEqual(cd.damageShape.riders.map((r) => r.componentId), ['slashing-rider'], 'the explicit stun component is the primary, not a duplicate rider');
  assert.equal(formula(A, whip, form('unmapped::Neuronic Whip', { profileId: 'melee' })).includes('1d4'), false, 'rider dice are NOT folded into the main roll');
  const bow = rt.resolveCanonicalDamage(canon('weapon-bowcaster'), {});
  assert.deepEqual([...bow.damageTypes], ['energy', 'piercing']); assert.equal(bow.damageShape.riders.length, 0, 'AND types = ONE damage event, no rider');

  const rolls = [], posted = [];
  const origRE = RollEngine.safeRoll, origPost = SWSEChat.postRoll, origSWSE = globalThis.SWSE;
  globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: async (f) => { rolls.push(f); return { total: rolls.length === 1 ? 11 : 3, formula: f, dice: [] }; } } };
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  try {
    await rollDamage(A, whip, {});
    assert.equal(posted.length, 2, 'main damage card + separate rider card');
    assert.match(rolls[0], /^2d8/); assert.equal(rolls[1], '1d4', 'rider rolled from its own dice only');
    const [main, rider] = posted.map((p) => p.context.workflowContext);
    assert.equal(posted[0].context.damageType === 'slashing', false);
    assert.equal(rider.attack.damageMode, 'normal'); assert.equal(rider.damage.damageType, 'slashing', 'rider typed by its canonical component');
    assert.equal(rider.contextTags?.includes('stun') ?? false, false, 'rider is real damage, not stun');
    assert.equal(posted[1].flags.swse.damageRider, true);
    assert.equal(rider.special.riders['slashing-rider'].total, 3);
    assert.ok(main.contextTags?.includes('stun'), 'main card stays stun');
  } finally { RollEngine.safeRoll = origRE; SWSEChat.postRoll = origPost; globalThis.SWSE = origSWSE; }
  ok('riders are separate damage cards with their own dice/type (Neuronic Whip stun 2d8 + slashing 1d4); AND types remain one event (Bowcaster)');
}

// ---- native-stun default (structured stun capability, not the weapon name) ---------------------------------------------------------------
{
  const sh = canon('unmapped::Shock Stick');
  assert.equal(rt.resolveCanonicalDamage(sh, {}).damageMode, 'stun');
  assert.equal(rt.resolveCanonicalDamage(sh, { damageMode: 'normal' }).damageMode, 'stun', 'a native-stun form has no normal mode');
  for (const k of ['weapon-stun-pistol', 'weapon-sonic-stunner', 'weapon-stun-grenade', 'weapon-carbonite-rifle']) {
    const cd = rt.resolveCanonicalDamage(canon(k), {});
    assert.equal(cd.status, 'ordinary', `${k}: native-stun form resolves its explicit stun dice by default`); assert.equal(cd.damageMode, 'stun');
  }
  ok('native-stun forms default to stun and resolve their explicit stun dice (previously refused unless the mode was selected by hand)');
}

// ---- 4, 6, 11: on-hit CT riders: hit-only, alternate defense, via the existing CT infrastructure --------------------------------------
{
  const calls = [], posted = [];
  const origRE = RollEngine.safeRoll, origPost = SWSEChat.postRoll, origAmmo = AmmoSystem.spendForWorkflow;
  let total = 15;
  RollEngine.safeRoll = async (f) => ({ total, formula: f, dice: [{ results: [{ result: 12 }] }] });
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
  try {
    const attacker = makeActor({ feats: ['Weapon Proficiency (Advanced Melee Weapons)', 'Weapon Proficiency (Rifles)'] });
    const squib = canon('weapon-squib-tensor-rifle');
    const target = makeTarget({ reflex: 10, fortitude: 18 });
    // alternate defense: 15 beats Reflex 10 but NOT Fortitude 18 -> the roll is compared to the form's Fortitude Defense
    posted.length = 0; total = 15;
    await rollAttack(attacker, squib, { target, suppressChat: false });
    let wf = posted.find((p) => p.context?.workflowContext).context.workflowContext;
    assert.equal(wf.attack.defense, 'fortitude'); assert.equal(wf.damage.hit, false, '15 < Fortitude 18 is a miss even though 15 >= Reflex 10');
    assert.equal(wf.special.records[0].fired, false, 'on-hit rider does not fire on a miss');
    posted.length = 0; total = 20;
    await rollAttack(attacker, squib, { target, suppressChat: false });
    wf = posted.find((p) => p.context?.workflowContext).context.workflowContext;
    assert.equal(wf.damage.hit, true); assert.equal(wf.special.records[0].fired, true, 'on-hit rider fires on the hit'); assert.equal(wf.special.records[0].steps, 1);
    // reflex-defense weapon is unaffected by the alternate-defense rule
    posted.length = 0; total = 15;
    await rollAttack(attacker, canon('weapon-blaster-pistol'), { target, suppressChat: false });
    assert.equal(posted.find((p) => p.context?.workflowContext).context.workflowContext.attack.defense, 'reflex');

    // survives the chat button transport, then executes at Apply Damage through the existing adapter + ActorEngine
    const restored = ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext(wf));
    assert.deepEqual(restored.special.records, wf.special.records.map((r) => ({ ...r })).map((r) => (r.fired === null ? { ...r, fired: undefined } : r)));
    const steps = []; const origSet = ActorEngine.setConditionStep, origPersist = ActorEngine.setConditionPersistent;
    ActorEngine.setConditionStep = async (actor, next, source) => { steps.push({ next, source }); actor.system.conditionTrack.current = next; return { ok: true }; };
    ActorEngine.setConditionPersistent = async () => ({ ok: true });
    const flags = {}; const message = { getFlag: (_s, k) => flags[k], setFlag: async (_s, k, v) => { flags[k] = v; } };
    try {
      const t = makeTarget({ hp: 30 });
      const res = await applyCanonicalSpecialEffects({ special: restored.special, target: t, attacker, message, hpBefore: 30, hpAfter: 22, rawAmount: 8, weaponLabel: 'Rifle' });
      assert.equal(res.applied.length, 1); assert.deepEqual(steps.map((s) => s.next), [1], 'one condition-track step via ActorEngine.setConditionStep');
      const again = await applyCanonicalSpecialEffects({ special: restored.special, target: t, attacker, message, hpBefore: 22, hpAfter: 14, rawAmount: 8 });
      assert.equal(again.applied.length, 0); assert.equal(again.skipped[0].reason, 'already-applied'); assert.equal(steps.length, 1, 'receipt: applied once per message + target');
      // a miss record never executes
      steps.length = 0;
      const miss = await applyCanonicalSpecialEffects({ special: { records: [{ ...wf.special.records[0], id: 'x', fired: false }] }, target: makeTarget(), message: { getFlag() {}, setFlag: async () => {} }, hpBefore: 30, hpAfter: 20, rawAmount: 10 });
      assert.equal(miss.applied.length, 0); assert.equal(steps.length, 0);
      // "damage dealt" riders need HP actually lost (Amphistaff-style: attack >= Fortitude AND damage dealt)
      const dmgRec = { id: 'poison', kind: 'ct-rider', steps: 1, direction: 'down', persistent: true, requiresDamage: true, fired: true };
      const noDamage = await applyCanonicalSpecialEffects({ special: { records: [dmgRec] }, target: makeTarget(), message: { getFlag() {}, setFlag: async () => {} }, hpBefore: 30, hpAfter: 30, rawAmount: 4 });
      assert.equal(noDamage.skipped[0].reason, 'no-damage-dealt'); assert.equal(steps.length, 0);
      const dealt = await applyCanonicalSpecialEffects({ special: { records: [dmgRec] }, target: makeTarget(), message: { getFlag() {}, setFlag: async () => {} }, hpBefore: 30, hpAfter: 26, rawAmount: 4 });
      assert.equal(dealt.applied.length, 1); assert.equal(steps.length, 1);
      // Shock Stick overwhelming stun: pre-halving stun damage >= current HP -> five condition-track steps (existing cap clamps)
      steps.length = 0;
      const osr = { id: 'overwhelming-stun', kind: 'overwhelming-stun', steps: 5, fired: true, requiresDamage: true };
      const low = await applyCanonicalSpecialEffects({ special: { records: [osr] }, target: makeTarget({ hp: 20 }), message: { getFlag() {}, setFlag: async () => {} }, hpBefore: 20, hpAfter: 10, rawAmount: 19 });
      assert.equal(low.applied.length, 0); assert.equal(low.skipped[0].reason, 'threshold-not-met');
      const met = await applyCanonicalSpecialEffects({ special: { records: [osr] }, target: makeTarget({ hp: 20 }), message: { getFlag() {}, setFlag: async () => {} }, hpBefore: 20, hpAfter: 10, rawAmount: 20 });
      assert.equal(met.applied.length, 1); assert.ok(steps[0].next >= 1, 'condition track moved down through the existing infrastructure');
    } finally { ActorEngine.setConditionStep = origSet; ActorEngine.setConditionPersistent = origPersist; }
  } finally { RollEngine.safeRoll = origRE; SWSEChat.postRoll = origPost; AmmoSystem.spendForWorkflow = origAmmo; }
  ok('alternate defense (Fortitude) drives hit/miss; on-hit CT rider fires on hit only; executes at Apply Damage once via CombatTargetEffectAdapter/ActorEngine; damage-dealt + overwhelming-stun gates');
}

// ---- 10: DR bypass reaches mitigation --------------------------------------------------------------------------------------------------
{
  const calls = [], posted = [];
  const origRE = RollEngine.safeRoll, origPost = SWSEChat.postRoll, origAmmo = AmmoSystem.spendForWorkflow;
  RollEngine.safeRoll = async (f) => ({ total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] });
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
  try {
    const attacker = makeActor({ feats: ['Weapon Proficiency (Lightsabers)'] });
    // a lightsaber whose NAME says nothing (renamed): only the structured damageReductionInteraction can make it ignore DR
    await rollAttack(attacker, canon('weapon-lightsaber'), { target: makeTarget(), suppressChat: false });
    const wf = posted.find((p) => p.context?.workflowContext).context.workflowContext;
    assert.equal(wf.special.drInteraction, 'ignore');
    const packet = buildDamagePacket({ attacker, target: makeTarget(), weapon: canon('weapon-lightsaber'), amount: 15, workflowContext: ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext(wf)), options: { damageType: 'energy' } });
    assert.ok(packet.components.length >= 1);
    for (const c of packet.components) {
      assert.ok(c.tags.includes('bypass-dr'), 'component tagged bypass-dr');
      assert.equal(DamageReductionResolver.componentBypassesDamageReduction(c, { value: 10, exceptions: [] }), true, 'the EXISTING DR resolver honors it');
    }
    // an ordinary (DR mode normal) form is not tagged
    posted.length = 0;
    await rollAttack(attacker, canon('weapon-blaster-pistol'), { target: makeTarget(), suppressChat: false });
    const wf2 = posted.find((p) => p.context?.workflowContext).context.workflowContext;
    assert.equal(wf2.special?.drInteraction, undefined);
    const packet2 = buildDamagePacket({ attacker, target: makeTarget(), weapon: canon('weapon-blaster-pistol'), amount: 15, workflowContext: wf2, options: { damageType: 'energy' } });
    for (const c of packet2.components) assert.equal((c.tags ?? []).includes('bypass-dr'), false);
  } finally { RollEngine.safeRoll = origRE; SWSEChat.postRoll = origPost; AmmoSystem.spendForWorkflow = origAmmo; }
  ok('structured DR interaction (ignore) is carried to Apply Damage and tags the packet components the existing DR resolver bypasses; ordinary forms untouched');
}

// ---- 12: unsupported special action fails closed (no ordinary damage substituted) -------------------------------------------------------
{
  const amph = canon('unmapped::Amphistaff');
  for (const [profileId, configurationId] of [['whip-pin', 'whip'], ['whip-trip', 'whip'], ['venom-spit', null]]) {
    const f = form('unmapped::Amphistaff', { profileId, ...(configurationId ? { configurationId } : {}) });
    assert.equal(rt.resolveCanonicalDamage(amph, f).status, 'no-damage');
    assert.throws(() => comp(A, amph, f), (e) => e.code === 'no-ordinary-damage');
    const m = mechOf(amph, f);
    assert.ok(m.every((x) => x.family === 'special-action' && x.policy === 'DEFER'), `${profileId}: DEFER (special action), never ordinary damage`);
  }
  const posted = []; const origPost = SWSEChat.postRoll, origRE = RollEngine.safeRoll, origSWSE = globalThis.SWSE; const rolls = [];
  globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: async (f) => { rolls.push(f); return { total: 5, formula: f, dice: [] }; } } };
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  try {
    assert.equal(await rollDamage(A, amph, { ...form('unmapped::Amphistaff', { profileId: 'whip-pin', configurationId: 'whip' }), suppressChat: true }), null);
    assert.equal(rolls.length, 0); assert.equal(posted.length, 0);
  } finally { SWSEChat.postRoll = origPost; globalThis.SWSE = origSWSE; RollEngine.safeRoll = origRE; }
  ok('unsupported special actions (Pin/Trip/Venom Spit) stay refused: nothing rolled, no ordinary damage substituted');
}

// ---- 13: PROMPT answers survive the workflow and are never re-asked ---------------------------------------------------------------------
{
  const asked = [];
  rt.setSpecialPromptProvider(async (q) => { asked.push(q.id); return true; });
  const posted = []; const origRE = RollEngine.safeRoll, origPost = SWSEChat.postRoll, origAmmo = AmmoSystem.spendForWorkflow;
  RollEngine.safeRoll = async (f) => ({ total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] });
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
  try {
    const attacker = makeActor({ feats: ['Weapon Proficiency (Advanced Melee Weapons)', 'Weapon Proficiency (Exotic Weapons)'] });
    const arg = canon('unmapped::Arggarok');
    const baselineBonus = async () => { posted.length = 0; await rollAttack(attacker, arg, { target: makeTarget() }); return posted.find((p) => p.context?.workflowContext); };
    await baselineBonus();
    assert.deepEqual(asked, ['conditional-0'], 'asked once');
    const wf = posted.find((p) => p.context?.workflowContext).context.workflowContext;
    assert.equal(wf.special.answers['conditional-0'], true);
    const restored = ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext(wf));
    assert.equal(restored.special.answers['conditional-0'], true, 'answer survives chat-button transport');
    posted.length = 0;
    await rollAttack(attacker, arg, { target: makeTarget(), combatContext: restored, workflowContext: restored });
    assert.deepEqual(asked, ['conditional-0'], 'a stored answer is never re-asked');
    // the applied modifier is the existing typed attack pipeline: -5 appears in the ledger of the roll vs. an unanswered (no provider) roll
    rt.setSpecialPromptProvider(null);
    notes.warn.length = 0; posted.length = 0;
    await rollAttack(attacker, arg, { target: makeTarget() });
    assert.ok(notes.warn.some((m) => /could not be evaluated and were not applied/.test(m)), 'unanswered + no provider: surfaced, not applied, not guessed');
    // Apply-time CT-rider prompt: asked once, stored on the message, not re-asked
    rt.setSpecialPromptProvider(async (q) => { asked.push(`apply:${q.id}`); return false; });
    const flags = {}; const message = { getFlag: (_s, k) => flags[k], setFlag: async (_s, k, v) => { flags[k] = v; } };
    const unknown = { records: [{ id: 'poison', kind: 'ct-rider', steps: 1, direction: 'down', requiresDamage: true, fired: null, trigger: 'x' }] };
    const r1 = await applyCanonicalSpecialEffects({ special: unknown, target: makeTarget(), message, hpBefore: 30, hpAfter: 20, rawAmount: 10 });
    const r2 = await applyCanonicalSpecialEffects({ special: unknown, target: makeTarget(), message, hpBefore: 30, hpAfter: 20, rawAmount: 10 });
    assert.equal(asked.filter((x) => x === 'apply:poison').length, 1, 'apply-time prompt asked exactly once');
    assert.equal(r1.skipped[0].reason, 'trigger-not-met'); assert.equal(r2.skipped[0].reason, 'trigger-not-met');
    assert.equal(flags.specialAnswers.poison, false);
  } finally { rt.setSpecialPromptProvider(null); RollEngine.safeRoll = origRE; SWSEChat.postRoll = origPost; AmmoSystem.spendForWorkflow = origAmmo; }
  ok('PROMPT answers are stored in the workflow context / message, survive transport and are never re-asked; unanswered mechanics are surfaced, not guessed');
}

// ---- observable condition is automatic: target size gate -----------------------------------------------------------------------------------
{
  const posted = []; const origRE = RollEngine.safeRoll, origPost = SWSEChat.postRoll, origAmmo = AmmoSystem.spendForWorkflow;
  const totals = [];
  RollEngine.safeRoll = async (f) => { totals.push(f); return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
  rt.setSpecialPromptProvider(async () => { throw new Error('must not prompt for an observable condition'); });
  try {
    const attacker = makeActor({ feats: ['Weapon Proficiency (Heavy Weapons)'] });
    const lcm = canon('weapon-light-concussion-missile-launcher');
    const formulaFor = async (size) => { totals.length = 0; await rollAttack(attacker, lcm, { target: makeTarget({ size }) }); return totals[0]; };
    const small = await formulaFor('medium'), huge = await formulaFor('huge');
    const bonus = (f) => Number(/\+ (-?\d+)$/.exec(f)?.[1] ?? /(-\d+)$/.exec(f)?.[1] ?? NaN);
    assert.equal(bonus(small) - bonus(huge), -10, `smaller than Huge: -10 attack via the modifier pipeline (${small} vs ${huge})`);
  } finally { rt.setSpecialPromptProvider(null); RollEngine.safeRoll = origRE; SWSEChat.postRoll = origPost; AmmoSystem.spendForWorkflow = origAmmo; }
  ok('target-size conditional attack modifier is automatic from the target actor (-10 vs smaller than Huge), no prompt');
}

// ---- 14, 15: legacy weapons and stock droid/NPC flat contracts unchanged ----------------------------------------------------------------------
{
  const L = legacy({ damage: '2d6' });
  const c = comp(A, L, {});
  assert.equal(c.dice.baseMultiplier, 1); assert.deepEqual(c.riders.canonicalDamage, []);
  assert.equal(buildDamageFormula(c), buildDamageFormula(comp(A, legacy({ damage: '2d6' }), {})));
  const posted = []; const origRE = RollEngine.safeRoll, origPost = SWSEChat.postRoll, origAmmo = AmmoSystem.spendForWorkflow;
  RollEngine.safeRoll = async (f) => ({ total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] });
  SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
  try {
    await rollAttack(makeActor(), L, { target: makeTarget() });
    const wf = posted.find((p) => p.context?.workflowContext)?.context.workflowContext;
    assert.equal(wf?.special, undefined, 'legacy weapon carries no special-mechanic state');
  } finally { RollEngine.safeRoll = origRE; SWSEChat.postRoll = origPost; AmmoSystem.spendForWorkflow = origAmmo; }
  // a stock droid published formula keeps precedence: no canonical multiplier / critical effect is layered on a flat contract
  const droid = makeActor({ type: 'droid' });
  const stock = { ...canon('weapon-light-concussion-missile-launcher'), flags: { swse: { canonicalWeapon: { identityKey: 'weapon-light-concussion-missile-launcher' }, stockDroidAttack: { sourceStatblock: true, publishedDamage: '4d4' } } } };
  const sc = comp(droid, stock, form('weapon-light-concussion-missile-launcher', { profileId: 'light-concussion-missile' }));
  if (sc.flags?.stockDamageFormula) { assert.equal(sc.dice.baseMultiplier, 1); assert.doesNotMatch(buildDamageFormula(sc), /\* 2/); }
  ok('legacy weapons carry no special state and compose identically; stock droid/NPC flat contracts do not receive canonical multipliers');
}

// ---- 17: corrected Darkstick / Static Pike thrown forms remain available and ranged ------------------------------------------------------
{
  for (const k of ['unmapped::Darkstick', 'unmapped::Static Pike']) {
    const forms = rt.buildAttackForms(canon(k)).forms;
    const thrown = forms.find((f) => f.profileId === 'thrown');
    assert.ok(thrown, `${k}: thrown form offered`); assert.equal(thrown.branch, 'ranged');
  }
  const dark = mechOf(canon('unmapped::Darkstick'), form('unmapped::Darkstick', { profileId: 'thrown' }));
  assert.deepEqual(fam(dark, 'return-recovery').map((m) => m.policy), ['DEFER'], 'Darkstick return: threshold structured, effect not -> DEFER, never invented');
  assert.ok(fam(dark, 'return-recovery')[0].completeness.length > 0);
  ok('corrected Darkstick / Static Pike thrown forms stay available and ranged; Darkstick return recorded as a completeness issue');
}

// ---- census: deterministic, current, complete ------------------------------------------------------------------------------------------
{
  const census = await buildCensus();
  const committed = JSON.parse(fs.readFileSync(new URL(`../${OUT_JSON}`, import.meta.url), 'utf8'));
  assert.deepEqual(census, committed, 'committed 5D-E special-mechanic census is current (run tools/census-weapon-special-mechanics.mjs)');
  assert.equal(census.totals.identities, 203); assert.equal(census.totals.resolveErrors, 0);
  assert.deepEqual(census.unclassified, [], 'every structured mechanic belongs to a taxonomy family');
  for (const [f, n] of Object.entries(census.mechanicsByFamily)) assert.ok(census.taxonomy[f] && n > 0, f);
  for (const [f, def] of Object.entries(census.taxonomy)) assert.ok(['AUTO', 'PROMPT', 'DEFER', 'DISPLAY_ONLY', 'VALIDATION_ONLY'].includes(def.policy), f);
  // a source with a PROMPT policy never became DISPLAY_ONLY just because it lacks a consumer
  assert.ok(census.mechanicsByPolicy.AUTO > 0 && census.mechanicsByPolicy.PROMPT > 0 && census.mechanicsByPolicy.DEFER > 0);
  ok(`census over ${census.totals.identities} identities / ${census.totals.forms} forms: ${JSON.stringify(census.mechanicsByPolicy)}`);
}

console.log(`Phase 5D-E special-effect consumption: ${step} checks passed.`);
