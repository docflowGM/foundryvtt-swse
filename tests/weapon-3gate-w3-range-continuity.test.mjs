import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Weapon three-gate audit W3 / C-RNG-03: the effective range band established for an attack (here derived ONLY from a stated
// distance, no band named) must be the band the attack's workflow context carries into damage: the point-blank conditional
// damage bonus (Pulse-wave pistol +4) and a damage-side range penalty (CR-1 blast cannon) must agree with the attack.
// Real path: rollAttack -> posted attack card workflow context -> resolveDamageComposition / rollDamage. Real canonical registry.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.game = { combat: null, user: { targets: { first: () => null } }, settings: { get: () => false } };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { rollAttack: rollAttackRaw } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { ownAndReady, installReadinessEnvironment } = await import('./helpers/ready-weapon-fixture.mjs'); await installReadinessEnvironment();
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
let uid = 0;
const mk = (type, name) => ({ id: `i${++uid}`, type, name, flags: {}, system: {} });
const PROF = ['Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)', 'Weapon Proficiency (Heavy Weapons)'].map((n) => mk('feat', n));
const canon = (k, system = {}) => ({ id: `w${++uid}-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', damageType: 'sonic', equipped: true, ammunition: { current: 50, max: 50 }, ...system } });
const makeActor = (items) => {
  const actor = { id: 'a1', name: 'Tester', type: 'character', flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col([...PROF, ...items]),
    system: { bab: 6, level: 6, size: 'medium', attributes: { str: ab(0), dex: ab(0), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols', 'rifles', 'heavy-weapons'] } };
  for (const w of items) w.actor = actor;
  return actor;
};
const target = () => ({ id: 't1', name: 'Dummy', type: 'npc', flags: { swse: {} }, effects: [], items: col([]), getFlag() { return undefined; }, system: { size: 'medium', hp: { value: 30, max: 30 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } } } });

let posted = [];
RollEngine.safeRoll = async (f) => ({ total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] });
SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
AmmoSystem.consumeAmmunition = async (a, w, n) => ({ success: true, newAmmo: 50 - n, previousAmmo: 50 });
ActionEconomyConsumption.spend = async () => ({ allowed: true, committed: true, rollback: async () => {} });
const attack = async (actor, weapon, extra) => { posted = []; return rollAttackRaw(actor, ownAndReady(actor, weapon), { target: target(), suppressChat: false, ...extra }); };
const wf = () => posted.find((p) => p.context?.workflowContext)?.context.workflowContext;
const formulas = [];
globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: async (f) => { formulas.push(String(f).replace(/\s/g, '')); return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; } } };
// the formula the REAL damage roll rolls, given the workflow context the attack serialized (or an explicit band for the control)
const damageFormulaAfter = async (A, w, atkExtra, { control = null } = {}) => {
  let ctx = null;
  if (!control) { assert.ok(await attack(A, w, atkExtra)); ctx = wf(); }
  formulas.length = 0;
  await rollDamage(A, w, { suppressChat: true, target: target(), ...(control ? { rangeBand: control } : { combatContext: ctx, workflowContext: ctx }) });
  return formulas[0];
};

test('C-RNG-03: a distance-only attack carries the distance-derived band in its workflow context', async () => {
  const pw = canon('weapon-pulse-wave-pistol'); const A = makeActor([pw]);
  assert.ok(await attack(A, pw, { distanceSquares: 3 }));
  assert.equal(wf().attack.rangeBand, 'pointBlank', 'effective band serialized for the damage stage');
  assert.ok(await attack(A, pw, { distanceSquares: 30 }));
  assert.equal(wf().attack.rangeBand, 'short');
});

test('C-RNG-03: Pulse-wave point-blank conditional damage is the same for distance-only and band-only attacks', async () => {
  const pw = canon('weapon-pulse-wave-pistol'); const A = makeActor([pw]);
  const bandOnlyPB = await damageFormulaAfter(A, pw, null, { control: 'pointBlank' });
  const bandOnlyShort = await damageFormulaAfter(A, pw, null, { control: 'short' });
  assert.notEqual(bandOnlyPB, bandOnlyShort, 'control: the +4 shows up at point-blank only');
  assert.equal(await damageFormulaAfter(A, pw, { distanceSquares: 3 }), bandOnlyPB, 'distance-only point-blank must reach the same +4');
  assert.equal(await damageFormulaAfter(A, pw, { distanceSquares: 30 }), bandOnlyShort, 'short-range distance must not grant the point-blank bonus');
});

test('C-RNG-03: the CR-1 blast cannon damage-side range penalty applies from a distance-only attack', async () => {
  const cr = canon('weapon-cr-1-blast-cannon'); const A = makeActor([cr]);
  const pb = await damageFormulaAfter(A, cr, null, { control: 'pointBlank' });
  const shortBand = await damageFormulaAfter(A, cr, null, { control: 'short' });
  assert.notEqual(pb, shortBand, 'control: Short carries its -2 on the damage roll');
  assert.equal(await damageFormulaAfter(A, cr, { distanceSquares: 30 }), shortBand, 'distance-only Short must carry the same damage penalty');
});

test('C-RNG-03: an unrecognized band label (dialog "custom") with a stated distance resolves through the distance, not silently to no band', async () => {
  const pw = canon('weapon-pulse-wave-pistol'); const A = makeActor([pw]);
  assert.ok(await attack(A, pw, { distanceSquares: 3, rangeBand: 'custom' }));
  assert.equal(wf().attack.rangeBand, 'pointBlank');
});

test('C-RNG-05: the roll dialog previews a damage-side band penalty as a DAMAGE penalty, an ordinary one as an attack penalty', async () => {
  // roll-config's escapeHTML is the only DOM touch on the chip path; a minimal shim keeps the test headless
  globalThis.document ??= { createElement: () => ({ set textContent(v) { this.t = String(v); }, get innerHTML() { return this.t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); } }) };
  const { canonicalRangeBands, rangeChipsHtml } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
  const crRange = rt.resolveAttackWeaponRuntime(canon('weapon-cr-1-blast-cannon'), {}).range;
  const crChips = rangeChipsHtml(canonicalRangeBands(crRange));
  assert.match(crChips, /\(damage -2\)/, 'CR-1 Short chip labelled as a damage penalty');
  assert.match(crChips, /\(damage -5\)/);
  const bpRange = rt.resolveAttackWeaponRuntime(canon('weapon-blaster-pistol'), {}).range;
  const bpChips = rangeChipsHtml(canonicalRangeBands(bpRange));
  assert.match(bpChips, /\(-2\)/);
  assert.doesNotMatch(bpChips, /damage/, 'an ordinary pistol keeps the attack-roll preview');
});
