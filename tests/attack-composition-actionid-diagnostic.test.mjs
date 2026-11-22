import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// DIAGNOSTIC / CHARACTERIZATION ONLY -- issue #1166 Phase 2, owner-approved "test only".
// No production attack math, total, or actionId pass-through is changed or authorized by this file.
//
// Question: scripts/combat/rolls/attacks.js#computeFinalAttackComposition() calls
//   resolveAttackBonus(actor, weapon, null, rollOptions)
// with a hard-coded null actionId even when rollOptions.actionId exists. resolveAttackBonus() only adds
// TalentActionLinker's linked-talent bonus when it receives an actionId. Is that gap REACHABLE?
//
// Findings this suite pins (so a future change must be made deliberately, with an owner ruling):
//   1. Mechanism: the real roll/preview composition ignores rollOptions.actionId; resolveAttackBonus() called
//      directly with an actionId does add the linked-talent bonus.                          (sections 1)
//   2. Reachability today: with the shipped data (data/talent-action-links.json +
//      data/talent-granted-abilities.json) NO attack-type action id carries a nonzero linked-talent bonus, so
//      the null is a LATENT gap, not a live defect. The only nonzero action ids are three non-attack ones.
//                                                                                       (section 2)
//   3. Double-count guard: talentBonus is an UNTYPED flat scalar added outside the typed stacking pool. If a
//      talent bonus were threaded through while the same benefit also exists as a typed (e.g. competence)
//      modifier, both would apply in full. Threading actionId therefore needs a de-duplication decision
//      first.                                                                            (section 3)
//
// If this file starts failing because production changed, that is the intended tripwire: re-read the
// owner ruling before updating the expectations.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
const { installReadinessEnvironment } = await import('./helpers/ready-weapon-fixture.mjs');
await installReadinessEnvironment();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.window = globalThis.window ?? globalThis;
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.Hooks.once = globalThis.Hooks.once ?? (() => {});
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const { resolveAttackBonus } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { default: TalentActionLinker } = await import('/systems/foundryvtt-swse/scripts/engine/talent/talent-action-linker.js');

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };

const items = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
const abil = (mod) => ({ base: 10 + mod * 2, racial: 0, enhancement: 0, temp: 0 });
const makeActor = ({ bab = 7, str = 2, itemList = [], effects = [] } = {}) => ({
  id: 'test-actor', type: 'character', flags: {},
  system: { bab, attributes: { str: abil(str), dex: abil(0), con: abil(0), int: abil(0), wis: abil(0), cha: abil(0) }, abilities: {} },
  items: items(itemList), effects, getFlag() { return undefined; }
});
const meleeWeapon = () => ({ id: 'w-melee', name: 'Vibro Axe', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'simple', damage: '2d6' } });
const competenceAttackEffect = (value) => ({
  id: 'effect-competence-attack', name: 'Inspiring Presence', disabled: false, origin: null,
  flags: { swse: { effectIntent: {
    application: 'always', activeState: 'enabled', scope: 'self', operation: 'increase', category: 'attack', target: '',
    amount: value, bonusType: 'competence', duration: '', transfer: true, filterType: 'all', filterValue: '',
    conditions: [], note: ''
  } } }
});

const CTX = { attackType: 'melee' };
const STUB_BONUS = 3;

// ─── SECTION 1 — mechanism (stubbed linker, so the number is unambiguous) ───────────────────────────────
const realLinker = window.SWSE?.TalentActionLinker;
const calls = [];
window.SWSE = window.SWSE ?? {};
window.SWSE.TalentActionLinker = {
  MAPPING: { talentToAction: {}, actionToTalents: {} },
  calculateBonusForAction: (_actor, actionId) => { calls.push(actionId); return { value: actionId === 'melee-attack' ? STUB_BONUS : 0 }; }
};
{
  const actor = makeActor();
  const weapon = meleeWeapon();
  const baseline = resolveAttackBonus(actor, weapon, null, CTX);
  assert.equal(baseline.total, 9, 'BAB(7)+STR(2), no action id');
  assert.deepEqual(calls, [], 'null actionId never consults the linker');

  const direct = resolveAttackBonus(actor, weapon, 'melee-attack', CTX);
  assert.equal(direct.total, baseline.total + STUB_BONUS, 'resolveAttackBonus() DOES honor an explicit actionId');
  assert.deepEqual(calls, ['melee-attack']);
  ok('resolver honors an explicit actionId (+linked-talent bonus) and ignores null');

  calls.length = 0;
  const comp = await computeFinalAttackComposition(actor, weapon, { ...CTX, actionId: 'melee-attack' });
  assert.equal(comp.ok, true);
  assert.equal(comp.atkBonus, baseline.total, 'roll/preview composition total equals the no-action total');
  assert.notEqual(comp.atkBonus, direct.total, 'composition does NOT equal resolveAttackBonus(..., actionId)');
  assert.ok(!calls.includes('melee-attack'), 'computeFinalAttackComposition never forwards rollOptions.actionId to the linker');
  ok('computeFinalAttackComposition() ignores rollOptions.actionId (hard-coded null) -- mechanism confirmed');
}

// ─── SECTION 2 — reachability with the REAL shipped data and the REAL linker class ───────────────────────
window.SWSE.TalentActionLinker = TalentActionLinker;
TalentActionLinker.MAPPING = JSON.parse(fs.readFileSync('data/talent-action-links.json', 'utf8'));
TalentActionLinker.ABILITIES = JSON.parse(fs.readFileSync('data/talent-granted-abilities.json', 'utf8'));
{
  const ATTACK_ACTIONS = ['melee-attack', 'ranged-attack', 'lightsaber-attack', 'full-attack', 'attack-roll'];
  const nonzero = {};
  for (const [actionId, talents] of Object.entries(TalentActionLinker.MAPPING.actionToTalents)) {
    const actor = makeActor({ itemList: talents.map((name, i) => ({ id: `t${i}`, name, type: 'talent', system: {} })) });
    const info = TalentActionLinker.calculateBonusForAction(actor, actionId);
    if (info.value) nonzero[actionId] = info.value;
  }
  for (const id of ATTACK_ACTIONS) {
    assert.ok(Object.hasOwn(TalentActionLinker.MAPPING.actionToTalents, id), `${id} is still a known action id`);
    assert.equal(nonzero[id] ?? 0, 0, `${id}: a character owning EVERY linked talent still gets no linked-talent bonus today`);
  }
  assert.deepEqual(
    Object.keys(nonzero).sort(),
    ['knowledge-check', 'reflex-defense', 'use-computer-check'],
    'only these non-attack action ids carry a nonzero linked-talent bonus in the shipped data'
  );
  ok('null actionId is LATENT today: no attack-type action id has a nonzero linked-talent bonus (real data, real linker)');
}

// ─── SECTION 3 — double-counting guard: untyped talent bonus vs typed stacking pool ──────────────────────
window.SWSE.TalentActionLinker = {
  MAPPING: { talentToAction: {}, actionToTalents: {} },
  calculateBonusForAction: (_actor, actionId) => ({ value: actionId === 'melee-attack' ? STUB_BONUS : 0 })
};
{
  const weapon = meleeWeapon();
  const actor = makeActor({ effects: [competenceAttackEffect(4)] });
  const typedOnly = resolveAttackBonus(actor, weapon, null, CTX);
  assert.equal(typedOnly.total, 9 + 4, 'typed competence +4 applies once');
  const withLinked = resolveAttackBonus(actor, weapon, 'melee-attack', CTX);
  assert.equal(
    withLinked.total, typedOnly.total + STUB_BONUS,
    'COUNTEREXAMPLE: the linked-talent bonus is added on top of the typed pool with no de-duplication by source/type'
  );
  assert.equal(withLinked.components.Talent, STUB_BONUS, 'it is a flat, untyped "Talent" component');
  ok('threading actionId would add an untyped flat bonus beside the typed pool -- double-count risk must be ruled on first');
}

// Restore (the module-level global is shared by other suites run in the same process).
window.SWSE.TalentActionLinker = realLinker;

console.log(`attack-composition-actionid-diagnostic: ${step} checks passed`);
