import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Final combat action routing closure.
//  1. The Combat Action Library's "Fight defensively" (resolution mode combatState) must establish the stance through the combat-action effect
//     authority and pay its action exactly once; it used to spend a generic action and reach no resolver that applies the effect.
//  2. An ordinary Charge (a Standard action with ONE attack) cannot be combined with Double Attack, Triple Attack or Full Attack (a Full-Round action).
//     Rejected before any action, ammunition or die is committed. Page references are the owner's (Core Rulebook pp. 152, 154); no exception is invented.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
const notes = { warn: [], error: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {}, once: () => {} };
globalThis.CONFIG ??= { SWSE: {}, Actor: {}, Item: {}, statusEffects: [] };
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };

const stance = await import('/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-active-state-service.js');
const { SWSEActiveEffectsManager } = await import('/systems/foundryvtt-swse/scripts/combat/active-effects-manager.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { CombatWorkflowRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-workflow-registry.js');
const { CombatActionsMapper } = await import('/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js');
const MA = await import('/systems/foundryvtt-swse/scripts/combat/multi-attack.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const ATTACKS = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
globalThis.document = globalThis.document ?? { createElement: () => ({ set textContent(v) {}, get innerHTML() { return ''; } }) };

const packRow = (name) => JSON.parse(fs.readFileSync('packs/combat-actions.db', 'utf8').split('\n').filter(Boolean).find((l) => JSON.parse(l).name === name));
const effect = (key) => ({ id: `e-${key}`, name: key, flags: { swse: { combatAction: key } } });
const actorOf = (effects = []) => ({ id: 'a1', isOwner: true, name: 'T', flags: {}, effects: Object.assign([...effects], { get: (id) => effects.find((e) => e.id === id) }), items: Object.assign([], { get: () => null }), system: {} });

const instrument = (mode, spendResult = { allowed: true, permitted: true, committed: true, rollback: async () => true }) => {
  const log = { spends: [], applies: [], rollbacks: 0 };
  const real = { spend: ActionEconomyConsumption.spend, apply: SWSEActiveEffectsManager.applyCombatActionEffect, game: globalThis.game };
  globalThis.game = { ...(real.game ?? {}), settings: { get: (_s, k) => (k === 'fightDefensivelyActionMode' ? mode : undefined) } };
  ActionEconomyConsumption.spend = async (a, type, meta) => { log.spends.push([type, meta.actionId]); return { ...spendResult, rollback: async () => { log.rollbacks += 1; return true; } }; };
  SWSEActiveEffectsManager.applyCombatActionEffect = async (a, key) => { log.applies.push(key); return {}; };
  log.restore = () => { ActionEconomyConsumption.spend = real.spend; SWSEActiveEffectsManager.applyCombatActionEffect = real.apply; globalThis.game = real.game; };
  return log;
};

// the REAL library record, normalized the way the sheet and the workflow registry do
const libraryAction = () => { const d = packRow('Fight defensively'); return CombatActionsMapper._normalizeAction(d); };

// ===== 1. library stance routing ===============================================================================================================
test('R1 the library "Fight defensively" record is a combatState action routed by the real workflow registry', () => {
  const rec = libraryAction();
  assert.equal(rec.key, 'fight-defensively'); assert.equal(rec.resolutionMode, 'combatState');
  assert.equal(typeof stance.createCombatStateWorkflowHandler, 'function', 'the stance routing is a reusable handler, not sheet-private code');
});

test('R2 through the real registry, Fight defensively applies the combat-action effect and pays the action exactly once (no generic second spend)', async () => {
  for (const [mode, cost] of [['default', 'standard'], ['swift', 'swift']]) {
    const log = instrument(mode); let generic = 0;
    try {
      const actor = actorOf();
      const handlers = { combatState: stance.createCombatStateWorkflowHandler(actor, async () => { generic += 1; return { generic: true }; }), legacy: async () => { generic += 1; } };
      const r = await CombatWorkflowRegistry.getDefault().execute({ actor, actionId: 'fight-defensively', actionData: libraryAction(), options: {}, sheet: null, handlers });
      assert.equal(r.ok ?? r.status !== 'failed', true);
      assert.deepEqual(log.spends, [[cost, 'fight-defensively']], `${mode}: exactly one spend`);
      assert.deepEqual(log.applies, ['fighting-defensively']);
      assert.equal(generic, 0, 'the generic sheet path (which spends and applies nothing) is not reached');
    } finally { log.restore(); }
  }
  const rai = instrument('rai');
  try {
    const actor = actorOf();
    await CombatWorkflowRegistry.getDefault().execute({ actor, actionId: 'fight-defensively', actionData: libraryAction(), options: {}, sheet: null, handlers: { combatState: stance.createCombatStateWorkflowHandler(actor, async () => {}) } });
    assert.deepEqual(rai.spends, [], 'house setting rai: an attack stance, no separate action'); assert.deepEqual(rai.applies, ['fighting-defensively']);
  } finally { rai.restore(); }
});

test('R3 a refused spend, an active stance or a failing application leaves nothing spent', async () => {
  const refused = instrument('default', { allowed: false, permitted: false, committed: false });
  try {
    const actor = actorOf();
    const h = stance.createCombatStateWorkflowHandler(actor, async () => ({ generic: true }));
    const out = await h({ actor, action: libraryAction(), actionId: 'fight-defensively' });
    assert.equal(out.cancelled, true); assert.deepEqual(refused.applies, []);
  } finally { refused.restore(); }
  const active = instrument('default');
  try {
    const actor = actorOf([effect('fighting-defensively')]);
    const out = await stance.createCombatStateWorkflowHandler(actor, async () => ({}))({ actor, action: libraryAction(), actionId: 'fight-defensively' });
    assert.equal(out.cancelled, true); assert.deepEqual(active.spends, []); assert.deepEqual(active.applies, []);
  } finally { active.restore(); }
  const failing = instrument('default');
  try {
    SWSEActiveEffectsManager.applyCombatActionEffect = async () => { throw new Error('boom'); };
    const actor = actorOf();
    await assert.rejects(() => stance.createCombatStateWorkflowHandler(actor, async () => ({}))({ actor, action: libraryAction(), actionId: 'fight-defensively' }), /boom/);
    assert.equal(failing.rollbacks, 1, 'the spent action is given back');
  } finally { failing.restore(); }
});

test('R4 only the two effect-backed stances take the stance path; every other combatState action keeps the generic route; Total Defense has no library record', async () => {
  const log = instrument('default'); let generic = 0;
  try {
    const actor = actorOf();
    const h = stance.createCombatStateWorkflowHandler(actor, async () => { generic += 1; return { generic: true }; });
    await h({ actor, action: { id: 'some-other-state' }, actionId: 'some-other-state' });
    assert.equal(generic, 1); assert.deepEqual(log.spends, []);
    await h({ actor, action: { id: 'total-defense' }, actionId: 'total-defense' });
    assert.deepEqual(log.spends, [['standard', 'total-defense']]); assert.deepEqual(log.applies, ['total-defense']);
  } finally { log.restore(); }
  const names = fs.readFileSync('packs/combat-actions.db', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).name.toLowerCase());
  assert.equal(names.some((n) => n.includes('total defense')), false, 'Total Defense is not a catalog action; it is reached from the Combat Features panel and the action bar');
});

test('R5 the sheet wires the combatState handler to the stance handler', () => {
  const src = fs.readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8');
  assert.match(src, /combatState:\s*createCombatStateWorkflowHandler\(this\.actor, routeLegacy\)/);
});

// ===== 2. Charge versus multi-attack ============================================================================================================
test('C1 an ordinary Charge, a Charge-gated option or a Charging Fire selection is refused inside Double / Triple / Full Attack', () => {
  assert.equal(typeof MA.multiAttackChargeViolation, 'function');
  const P = MA.FULL_ATTACK_PACKAGES;
  for (const packageType of [P.DOUBLE_ATTACK, P.TRIPLE_ATTACK, P.NORMAL, P.TWO_WEAPON, P.DOUBLE_WEAPON]) {
    for (const charge of [{ charge: true }, { charging: true }, { situational: { charging: true } }, { combatOptions: { powerfulCharge: true } }, { combatOptions: { chargingFire: true } }, { attackOptions: { powerfulCharge: true } }]) {
      const reason = MA.multiAttackChargeViolation({ packageType, ...charge });
      assert.match(reason ?? '', /Charge/i, `${packageType} + ${JSON.stringify(charge)}`);
    }
  }
});

test('C2 a single-attack Charge, Charging Fire and an ordinary multi-attack stay legal', () => {
  const P = MA.FULL_ATTACK_PACKAGES;
  assert.equal(MA.multiAttackChargeViolation({ charge: true }), null, 'one attack at the end of a Charge');
  assert.equal(MA.multiAttackChargeViolation({ combatOptions: { powerfulCharge: true } }), null);
  assert.equal(MA.multiAttackChargeViolation({ combatOptions: { chargingFire: true }, attackType: 'ranged' }), null, 'Charging Fire: a single ranged attack ending a charge');
  assert.equal(MA.multiAttackChargeViolation({ packageType: P.DOUBLE_ATTACK }), null, 'Double Attack without a Charge');
  assert.equal(MA.multiAttackChargeViolation({ packageType: P.TRIPLE_ATTACK, combatOptions: { powerAttack: 2 } }), null);
});

test('C3 a refused combination spends no action, no ammunition and rolls nothing', async () => {
  const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
  const spends = []; const real = { eco: ActionEconomyConsumption.spend, ammo: AmmoSystem.spendForWorkflow };
  ActionEconomyConsumption.spend = async (...a) => { spends.push(['eco', a[1]]); return { allowed: true, permitted: true, committed: true, rollback: async () => true }; };
  AmmoSystem.spendForWorkflow = async () => { spends.push(['ammo']); return { success: true, spent: true }; };
  notes.warn.length = 0;
  try {
    const weapon = { id: 'w', name: 'Blaster Pistol', type: 'weapon', system: { ammunition: { current: 10, max: 10 } }, flags: { swse: { canonicalWeapon: { identityKey: 'weapon-blaster-pistol' } } } };
    const actor = { id: 'a', name: 'T', type: 'character', flags: {}, effects: [], items: Object.assign([weapon], { get: () => weapon }), system: { bab: 5, level: 5, attributes: {}, skills: {} }, getFlag() {}, getRollData() { return {}; } };
    weapon.actor = actor;
    const out = await ATTACKS.rollAttack(actor, weapon, { packageType: MA.FULL_ATTACK_PACKAGES.DOUBLE_ATTACK, sequenceLength: 2, sequenceIndex: 0, combatOptions: { chargingFire: true }, suppressChat: true });
    assert.equal(out, null);
    assert.deepEqual(spends, [], 'nothing was spent');
    assert.ok(notes.warn.some((m) => /Charge/.test(m) && /(Double|Triple|Full) Attack|Full-Round|single attack/i.test(m)), JSON.stringify(notes.warn));
  } finally { ActionEconomyConsumption.spend = real.eco; AmmoSystem.spendForWorkflow = real.ammo; }
});

test('C4 the per-attack dialog of a multi-attack sequence never offers Charge', async () => {
  const RC = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
  const feat = (n) => { const d = JSON.parse(fs.readFileSync('packs/feats.db', 'utf8').split('\n').filter(Boolean).find((l) => JSON.parse(l).name === n)); return { id: `f-${n}`, type: 'feat', name: n, system: d.system, flags: {} }; };
  const items = [feat('Powerful Charge'), feat('Power Attack')]; items.get = () => null;
  const a = { ...actorOf(), items, system: { bab: 6, level: 6, attributes: {}, skills: {} } };
  const sword = { id: 'w', name: 'x', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } }, system: {} };
  const single = RC.deriveAttackModalState(a, sword, { melee: true, selection: {} });
  assert.equal(single.contexts.charge, true); assert.ok(single.options.some((o) => o.id === 'powerfulCharge'));
  const seq = RC.deriveAttackModalState(a, sword, { melee: true, selection: {}, sequence: true });
  assert.equal(seq.contexts.charge, false);
  assert.equal(seq.options.some((o) => o.id === 'powerfulCharge'), false, 'a Charge-dependent option is not offered inside a sequence');
  assert.ok(seq.options.some((o) => o.id === 'powerAttack'), 'everything else is unchanged');
  assert.deepEqual(seq.staleOptionIds.concat(RC.deriveAttackModalState(a, sword, { melee: true, selection: {}, sequence: true, combatOptions: { powerfulCharge: true } }).staleOptionIds), ['powerfulCharge'], 'a previously ticked Charge option is reported stale');
  const src = fs.readFileSync('scripts/engine/combat/features/combat-feature-handlers.js', 'utf8') + fs.readFileSync('scripts/patches/combat-ui-behavior-hotfix.js', 'utf8');
  assert.ok((src.match(/sequence: true/g) ?? []).length >= 2, 'both multiattack dialogs declare the sequence');
});
