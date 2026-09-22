import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Attack Bonus round 8 correction #1 addendum
// (groundwork only, per explicit reviewer instruction).
//
// Proves the first, minimal interfaces of a future scalable Action
// Authority (ActionDefinition schema, ActionRegistry, ActorActionResolver,
// ActionAvailabilityEngine) against representative real ATTACK_OPTION
// records -- NOT a migration of all 136 records, and NOT a replacement of
// CombatOptionResolver, which remains the live, certified authority for
// actual attack-modifier composition and the current production dialog.
// See docs/architecture/action-authority-v1.md for the full design and
// explicit stop conditions this round observed.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.window = globalThis.window ?? globalThis;
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };

const { extractAttackOptionRules, CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { normalizeAttackOptionRule } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition-normalizer.js');
const { ActionRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-registry.js');
const { ActorActionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/actions/actor-action-resolver.js');
const { ActionAvailabilityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-availability-engine.js');
const { ACTION_DEFINITION_SCHEMA_VERSION } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition.js');

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

function itemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find((i) => i.id === id);
  return arr;
}
function makeActor({ items = [] } = {}) {
  return {
    id: 'test-actor', name: 'Test Actor', type: 'character',
    items: itemsCollection(items), effects: [], flags: { swse: {} },
    system: { bab: 5, level: 6, attributes: {}, abilities: {}, skills: {}, derived: {} },
    getFlag() { return undefined; }
  };
}
function meleeWeapon() { return { id: 'w-melee', name: 'Vibro Axe', type: 'weapon', system: { weaponCategory: 'melee' } }; }
function rangedWeapon() { return { id: 'w-ranged', name: 'Blaster Pistol', type: 'weapon', system: { weaponCategory: 'ranged' } }; }

// Real record shapes, copied verbatim from packs/feats.db.
function powerAttackFeat() {
  return { id: 'feat-power-attack', name: 'Power Attack', type: 'feat', system: { abilityMeta: { rules: [
    { type: 'ATTACK_OPTION', option: 'powerAttack', label: 'Power Attack', control: 'slider', max: 5, requiresAttackType: 'melee', attackModifierFormula: '-value', damageModifierFormula: 'value' }
  ] } } };
}
function rapidShotFeat() {
  return { id: 'feat-rapid-shot', name: 'Rapid Shot', type: 'feat', system: { abilityMeta: { rules: [
    { type: 'ATTACK_OPTION', option: 'rapidShot', label: 'Rapid Shot', control: 'toggle', requiresAttackType: 'ranged', attackModifier: -2, damageDiceStepBonus: 1 }
  ] } } };
}
function carefulShotFeat() {
  return { id: 'feat-careful-shot', name: 'Careful Shot', type: 'feat', system: { abilityMeta: { rules: [
    { type: 'ATTACK_OPTION', option: 'carefulShot', label: 'Careful Shot', control: 'toggle', requiresAttackType: 'ranged', requiresAim: true, attackModifier: 1 }
  ] } } };
}
function powerfulChargeFeat() {
  return { id: 'feat-powerful-charge', name: 'Powerful Charge', type: 'feat', system: { abilityMeta: { rules: [
    { type: 'ATTACK_OPTION', option: 'powerfulCharge', label: 'Powerful Charge', control: 'toggle', requiresAttackType: 'melee', requiresCharge: true, attackModifier: 2 }
  ] } } };
}
function droidHunterFeat() {
  return { id: 'feat-droid-hunter', name: 'Droid Hunter', type: 'feat', system: { abilityMeta: { rules: [
    { type: 'ATTACK_OPTION', id: 'droidHunterDamage', label: 'Droid Hunter', control: 'passive', requiresTargetType: ['droid'], damageModifier: 2 }
  ] } } };
}
function oathOfDutyTalent() {
  return { id: 'talent-oath-of-duty', name: 'Oath of Duty', type: 'talent', system: { abilityMeta: { rules: [
    { type: 'RUNTIME_CONTEXT_REFERENCE', id: 'oath-of-duty-t31-context', label: 'Oath of Duty' }
  ] } } };
}
function droidTargetActor() { return { id: 'target-droid', name: 'Target Droid', type: 'droid', items: [], system: {} }; }
function organicTargetActor() { return { id: 'target-organic', name: 'Target Organic', type: 'character', items: [], system: {} }; }

// ─── 1/2 — normalizer: genuine record normalizes; a rejected one never reaches it ──

{
  const rules = extractAttackOptionRules(powerAttackFeat());
  assert.equal(rules.length, 1, 'Power Attack must extract exactly one ATTACK_OPTION rule');
  const definition = normalizeAttackOptionRule(powerAttackFeat(), rules[0]);
  assert.equal(definition.schemaVersion, ACTION_DEFINITION_SCHEMA_VERSION);
  assert.equal(definition.id, 'power-attack');
  assert.equal(definition.domain, 'attack');
  assert.equal(definition.presentation.control, 'slider');
  assert.deepEqual(definition.requirements.all, [{ type: 'attackType', value: 'melee' }]);
  assert.equal(definition.source.name, 'Power Attack');
  assert.equal(definition.source.type, 'feat');

  assert.deepEqual(extractAttackOptionRules(oathOfDutyTalent()), [], 'Oath of Duty (RUNTIME_CONTEXT_REFERENCE) must never reach the normalizer at all -- extractAttackOptionRules() rejects it upstream');
}
ok('1/2: a genuine ATTACK_OPTION record (Power Attack) normalizes into a versioned ActionDefinition with the correct id/domain/control/requirements/source; a real non-ATTACK_OPTION record (Oath of Duty) is rejected before normalization is even possible');

// ─── 3 — ActionRegistry: deterministic duplicate-id handling ──────────────

{
  const registry = new ActionRegistry();
  const definition = normalizeAttackOptionRule(powerAttackFeat(), extractAttackOptionRules(powerAttackFeat())[0]);
  registry.register(definition);
  assert.equal(registry.get('power-attack'), definition);
  assert.doesNotThrow(() => registry.register(definition), 're-registering the SAME definition object must be a no-op, not an error');

  const conflicting = { ...definition, source: { ...definition.source, name: 'A different source' } };
  assert.throws(() => registry.register(conflicting), /duplicate id/, 'registering a DIFFERENT definition object under the same id must throw deterministically, never silently overwrite');
}
ok('3: ActionRegistry.register() is idempotent for the same definition and throws deterministically on a genuine id conflict');

// ─── 4/5 — ActorActionResolver: only actor-owned sources, nothing else ────

{
  const owner = makeActor({ items: [powerAttackFeat(), oathOfDutyTalent()] });
  const nonOwner = makeActor({ items: [oathOfDutyTalent()] });

  const ownerActions = ActorActionResolver.getOwnedActions(owner, { domain: 'attack' });
  assert.deepEqual(ownerActions.map(d => d.id), ['power-attack'], 'the resolver must return exactly the actor-owned genuine ATTACK_OPTION definitions, never Oath of Duty');

  const nonOwnerActions = ActorActionResolver.getOwnedActions(nonOwner, { domain: 'attack' });
  assert.deepEqual(nonOwnerActions, [], 'an actor who does not own Power Attack must receive no Power Attack definition');

  assert.deepEqual(ActorActionResolver.getOwnedActions(owner, { domain: 'reaction' }), [], 'an unsupported domain returns empty rather than throwing (no normalizer exists for it yet)');
}
ok('4/5: ActorActionResolver.getOwnedActions() returns only definitions actually granted by actor-owned source items; an actor without a feat receives no definition for it');

// ─── 6/7/8 — Careful Shot: entitlement is stable; availability changes with Aim ──

{
  const actor = makeActor({ items: [carefulShotFeat()] });
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  assert.ok(definition, 'entitlement (ownership) must exist regardless of Aim');

  const beforeAim = ActionAvailabilityEngine.evaluate(definition, { attackType: 'ranged', weapon: rangedWeapon(), aim: false });
  assert.equal(beforeAim.state, 'disabled');
  assert.equal(beforeAim.reason, 'Requires Aim');

  const afterAim = ActionAvailabilityEngine.evaluate(definition, { attackType: 'ranged', weapon: rangedWeapon(), aim: true });
  assert.equal(afterAim.state, 'available');
}
ok('6/7/8: Careful Shot\'s entitlement exists before Aim is set; availability is disabled/"Requires Aim" before, available after -- entitlement and availability are provably separate questions');

// ─── 9 — Powerful Charge: entitlement stable, availability changes with Charge ──

{
  const actor = makeActor({ items: [powerfulChargeFeat()] });
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  assert.ok(definition);
  assert.equal(ActionAvailabilityEngine.evaluate(definition, { attackType: 'melee', weapon: meleeWeapon(), charge: false }).state, 'disabled');
  assert.equal(ActionAvailabilityEngine.evaluate(definition, { attackType: 'melee', weapon: meleeWeapon(), charge: true }).state, 'available');
}
ok('9: Powerful Charge\'s entitlement is stable regardless of Charge; its availability flips disabled -> available as Charge context changes');

// ─── 10 — structural mismatch (melee-only action, ranged weapon) is HIDDEN, not disabled ──

{
  const actor = makeActor({ items: [powerAttackFeat()] });
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  const onRanged = ActionAvailabilityEngine.evaluate(definition, { attackType: 'ranged', weapon: rangedWeapon() });
  assert.equal(onRanged.state, 'hidden', 'a melee-only action on a ranged attack is structurally inapplicable -- hidden, not merely disabled, matching CombatOptionResolver\'s unconditional attackType exclusion');
  assert.equal(onRanged.reason, null, 'a hidden option carries no player-facing reason -- there is nothing the player can do about it here');

  const onMelee = ActionAvailabilityEngine.evaluate(definition, { attackType: 'melee', weapon: meleeWeapon(), combatOptions: { powerAttack: 3 } });
  assert.equal(onMelee.state, 'available');
}
ok('10: a melee-only action (Power Attack) on a ranged attack evaluates to state:"hidden" with no reason, distinct from "disabled" -- structural gates are never player-actionable from this dialog');

// ─── 11 — target-gated option (Droid Hunter) evaluates against a supplied target ──

{
  const actor = makeActor({ items: [droidHunterFeat()] });
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  assert.equal(ActionAvailabilityEngine.evaluate(definition, { attackType: 'melee', weapon: meleeWeapon() }).state, 'disabled', 'no target supplied: disabled, not hidden -- selecting a target is something the player can still do');
  assert.equal(ActionAvailabilityEngine.evaluate(definition, { attackType: 'melee', weapon: meleeWeapon(), target: organicTargetActor() }).state, 'disabled');
  // Droid Hunter's control is 'passive' -- a currently-applying passive
  // option is reported as state:'passive' (an always-on modifier that
  // applies, not a player checkbox to toggle on), not 'available'.
  assert.equal(ActionAvailabilityEngine.evaluate(definition, { attackType: 'melee', weapon: meleeWeapon(), target: droidTargetActor() }).state, 'passive');
}
ok('11: Droid Hunter (requiresTargetType, control:passive) evaluates using the supplied targetActor -- disabled with no/wrong target, passive (currently applying) against a droid');

// ─── 12 — unknown predicate type fails closed ──────────────────────────────

{
  const definition = normalizeAttackOptionRule(powerAttackFeat(), { type: 'ATTACK_OPTION', option: 'test-unknown-gate', control: 'toggle' });
  definition.requirements = { all: [{ type: 'someFuturePredicateNoEvaluatorExistsFor' }] };
  const result = ActionAvailabilityEngine.evaluate(definition, {});
  assert.notEqual(result.state, 'available', 'an unrecognized predicate type must never silently evaluate as satisfied');
  assert.equal(result.requirements[0].met, false);
}
ok('12: an unknown requirement predicate type fails closed (never silently treated as met)');

// ─── 13/14 — no mutation ───────────────────────────────────────────────────

{
  const actor = makeActor({ items: [carefulShotFeat()] });
  const item = actor.items[0];
  const itemSnapshotBefore = JSON.stringify(item);
  const actorSnapshotBefore = JSON.stringify({ ...actor, items: undefined });
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  ActionAvailabilityEngine.evaluate(definition, { attackType: 'ranged', weapon: rangedWeapon(), aim: true });
  assert.equal(JSON.stringify(item), itemSnapshotBefore, 'ActorActionResolver/normalizer must never mutate the source item');
  assert.equal(JSON.stringify({ ...actor, items: undefined }), actorSnapshotBefore, 'ActionAvailabilityEngine must never mutate the actor');
}
ok('13/14: neither ActorActionResolver/the normalizer nor ActionAvailabilityEngine mutate the source item or the actor');

// ─── 15 — availability result carries source provenance ───────────────────

{
  const actor = makeActor({ items: [carefulShotFeat()] });
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  const result = ActionAvailabilityEngine.evaluate(definition, { attackType: 'ranged', weapon: rangedWeapon(), aim: true });
  assert.equal(result.definition.source.name, 'Careful Shot');
  assert.equal(result.definition.source.type, 'feat');
  assert.equal(result.definition.source.id, 'feat-careful-shot');
}
ok('15: the availability result carries the definition\'s full source provenance (name/type/id), not just a bare pass/fail boolean');

// ─── 16 — parity with the live, certified CombatOptionResolver path ───────
// Not a claim that the dialog is rewired to consume this groundwork layer
// (it is not, in this round) -- a direct proof that for representative
// options, this engine's state/reason output agrees with
// CombatOptionResolver.getAttackOptionsWithState()'s already-certified
// output for the identical actor/weapon/context, demonstrating the new
// layer COULD replace the dialog's consumption in a future round without
// the dialog needing any per-feat/per-talent knowledge.

{
  const cases = [
    { label: 'Careful Shot, no Aim', item: carefulShotFeat(), weapon: rangedWeapon(), attackType: 'ranged', context: { aim: false } },
    { label: 'Careful Shot, with Aim', item: carefulShotFeat(), weapon: rangedWeapon(), attackType: 'ranged', context: { aim: true } },
    { label: 'Powerful Charge, no Charge', item: powerfulChargeFeat(), weapon: meleeWeapon(), attackType: 'melee', context: { charge: false } },
    { label: 'Powerful Charge, with Charge', item: powerfulChargeFeat(), weapon: meleeWeapon(), attackType: 'melee', context: { charge: true } },
    { label: 'Rapid Shot, ranged', item: rapidShotFeat(), weapon: rangedWeapon(), attackType: 'ranged', context: {} }
  ];
  for (const testCase of cases) {
    const actor = makeActor({ items: [testCase.item] });
    const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
    const groundworkResult = ActionAvailabilityEngine.evaluate(definition, { attackType: testCase.attackType, weapon: testCase.weapon, ...testCase.context });

    const liveResult = CombatOptionResolver.getAttackOptionsWithState(actor, testCase.weapon, { attackType: testCase.attackType, ...testCase.context })
      .find(o => o.id === definition.id.replace(/-([a-z])/g, (_m, c) => c.toUpperCase()));
    assert.ok(liveResult, `${testCase.label}: the live CombatOptionResolver path must also surface this option`);

    const groundworkAvailable = groundworkResult.state === 'available' || groundworkResult.state === 'passive';
    const liveAvailable = liveResult.state === 'available';
    assert.equal(groundworkAvailable, liveAvailable, `${testCase.label}: groundwork availability (${groundworkResult.state}) must agree with the live, certified CombatOptionResolver state (${liveResult.state})`);
  }
}
ok('16: for representative options (Careful Shot, Powerful Charge, Rapid Shot), the groundwork ActionAvailabilityEngine\'s available/not-available verdict agrees with the live, certified CombatOptionResolver.getAttackOptionsWithState() for the identical actor/weapon/context -- proving the new layer could consume-replace the dialog\'s current logic without per-feat UI knowledge, without actually rewiring it in this round');

console.log('action-authority-groundwork.test.mjs: all assertions passed');
