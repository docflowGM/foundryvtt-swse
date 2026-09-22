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
const { normalizeAttackOptionRule, validateAttackOptionNormalization } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition-normalizer.js');
const { ActionRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-registry.js');
const { ActorActionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/actions/actor-action-resolver.js');
const { ActionAvailabilityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-availability-engine.js');
const { ACTION_DEFINITION_SCHEMA_VERSION } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition.js');

function syntheticDefinition(requirements, overrides = {}) {
  return { schemaVersion: 1, id: 'synthetic', name: 'Synthetic', domain: 'attack', ownership: { mode: 'source-item' }, presentation: { section: 'attack-options', control: 'toggle', label: 'Synthetic' }, requirements, economy: { actionType: null }, execution: { kind: 'attack-option', handler: null }, effects: [], tags: [], ...overrides };
}

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
  assert.deepEqual(definition.requirements.all, [{ type: 'attackType', value: 'melee', sourceField: 'requiresAttackType' }]);
  // Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker 1):
  // ActionDefinition no longer carries `source` at all -- it is pure,
  // source-independent content. Provenance now lives exclusively on
  // ActionEntitlement (see section 15).
  assert.equal('source' in definition, false, 'ActionDefinition must never carry a specific granting item\'s provenance');
  assert.equal('_legacyRule' in definition, false, 'ActionDefinition must never carry the raw per-grant rule -- that belongs on ActionEntitlement.configuration.rule');

  assert.deepEqual(extractAttackOptionRules(oathOfDutyTalent()), [], 'Oath of Duty (RUNTIME_CONTEXT_REFERENCE) must never reach the normalizer at all -- extractAttackOptionRules() rejects it upstream');
}
ok('1/2: a genuine ATTACK_OPTION record (Power Attack) normalizes into a versioned, source-independent ActionDefinition with the correct id/domain/control/requirements; a real non-ATTACK_OPTION record (Oath of Duty) is rejected before normalization is even possible');

// ─── 3 — ActionRegistry: domain-qualified, deterministic duplicate-id handling ──

{
  const registry = new ActionRegistry();
  const definition = normalizeAttackOptionRule(powerAttackFeat(), extractAttackOptionRules(powerAttackFeat())[0]);
  registry.register(definition);
  assert.equal(registry.get('attack', 'power-attack'), definition);
  assert.doesNotThrow(() => registry.register(definition), 're-registering the SAME definition object must be a no-op, not an error');

  // Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker 1):
  // ActionDefinition is now pure content (no embedded source), so a
  // SEPARATELY-normalized definition with IDENTICAL content (e.g. the
  // same rule normalized a second time from a different owned item) must
  // register as idempotent, not throw -- only a genuine CONTENT conflict
  // is an error now.
  const identicalContentDefinition = normalizeAttackOptionRule(powerAttackFeat(), extractAttackOptionRules(powerAttackFeat())[0]);
  assert.notEqual(identicalContentDefinition, definition, 'sanity: this is a distinct object, not the same reference');
  assert.doesNotThrow(() => registry.register(identicalContentDefinition), 'registering a DIFFERENT object with IDENTICAL content under the same id must be idempotent, not an error -- content equality, not object identity, is what matters now that definitions carry no per-item provenance');

  const conflicting = { ...definition, presentation: { ...definition.presentation, control: 'flag' } };
  assert.throws(() => registry.register(conflicting), /conflicting ActionDefinition content/, 'registering a definition with genuinely DIFFERENT content under the same id in the same domain must throw deterministically, never silently overwrite');

  // Blocker 2: id uniqueness is domain-qualified, not global -- the exact
  // same bare id in a DIFFERENT domain must coexist without conflict.
  const otherDomainDefinition = { ...definition, domain: 'utility', requirements: { all: [] } };
  assert.doesNotThrow(() => registry.register(otherDomainDefinition), 'attack:power-attack and utility:power-attack must coexist -- identity is domain-qualified');
  assert.equal(registry.get('utility', 'power-attack'), otherDomainDefinition);
  assert.notEqual(registry.get('attack', 'power-attack'), registry.get('utility', 'power-attack'));
  assert.deepEqual(registry.forDomain('attack').map(d => d.id), ['power-attack'], 'forDomain() must not leak the other domain\'s same-id definition');
}
ok('3: ActionRegistry identity is domain-qualified (attack:power-attack and utility:power-attack coexist); register() is idempotent for content-equal re-registration (even from a different object) and throws deterministically on a genuine same-domain content conflict');

// ─── 4/5 — ActorActionResolver: only actor-owned sources, nothing else ────

{
  const owner = makeActor({ items: [powerAttackFeat(), oathOfDutyTalent()] });
  const nonOwner = makeActor({ items: [oathOfDutyTalent()] });

  const ownerResult = ActorActionResolver.getOwnedActions(owner, { domain: 'attack' });
  assert.deepEqual(ownerResult.definitions.map(d => d.id), ['power-attack'], 'the resolver must return exactly the actor-owned genuine ATTACK_OPTION definitions, never Oath of Duty');
  assert.equal(ownerResult.entitlements.length, 1);
  assert.equal(ownerResult.entitlements[0].source.name, 'Power Attack');
  assert.deepEqual(ownerResult.entitlements[0].actionKey, { domain: 'attack', id: 'power-attack' });

  const nonOwnerResult = ActorActionResolver.getOwnedActions(nonOwner, { domain: 'attack' });
  assert.deepEqual(nonOwnerResult.definitions, [], 'an actor who does not own Power Attack must receive no Power Attack definition');
  assert.deepEqual(nonOwnerResult.entitlements, []);

  const unsupportedDomainResult = ActorActionResolver.getOwnedActions(owner, { domain: 'reaction' });
  assert.deepEqual(unsupportedDomainResult, { definitions: [], entitlements: [] }, 'an unsupported domain returns empty rather than throwing (no normalizer exists for it yet)');
}
ok('4/5: ActorActionResolver.getOwnedActions() returns { definitions, entitlements }: only definitions actually granted by actor-owned source items, each paired with its own entitlement provenance; an actor without a feat receives none of either');

// ─── 3b — Blocker 3: two different sources granting the same logical action ──

{
  // A second, differently-named feat item that happens to grant the exact
  // same normalized action id (a realistic future case -- e.g. a talent
  // and a feat both unlocking "power-attack" -- not producible from the
  // current shipped packs, so this fixture deliberately constructs it).
  function secondPowerAttackGrantingFeat() {
    return { id: 'feat-power-attack-via-talent', name: 'Martial Arts Mastery (grants Power Attack)', type: 'talent', system: { abilityMeta: { rules: [
      { type: 'ATTACK_OPTION', option: 'powerAttack', label: 'Power Attack', control: 'slider', max: 5, requiresAttackType: 'melee', attackModifierFormula: '-value', damageModifierFormula: 'value' }
    ] } } };
  }
  const actor = makeActor({ items: [powerAttackFeat(), secondPowerAttackGrantingFeat()] });
  const registry = new ActionRegistry();
  const result = ActorActionResolver.getOwnedActions(actor, { domain: 'attack', registry });

  assert.equal(result.definitions.length, 1, 'two sources granting the same logical action id must produce exactly ONE canonical ActionDefinition, never two competing ones');
  assert.equal(registry.forDomain('attack').length, 1, 'the registry must likewise hold exactly one definition for this id -- no duplicate-id exception was thrown');
  assert.equal(result.entitlements.length, 2, 'the actor must receive TWO separate entitlement records, one per granting source item');
  const entitlementSourceNames = result.entitlements.map(e => e.source.name).sort();
  assert.deepEqual(entitlementSourceNames, ['Martial Arts Mastery (grants Power Attack)', 'Power Attack'], 'each entitlement carries its OWN specific granting source, never a merged/ambiguous one');
  assert.ok(result.entitlements.every(e => e.actionKey.domain === 'attack' && e.actionKey.id === 'power-attack'), 'both entitlements point at the same canonical actionKey');
  assert.ok(result.entitlements.every(e => e.configuration?.rule?.option === 'powerAttack'), 'each entitlement preserves its own grant-specific raw rule on configuration.rule, rather than discarding it once a canonical definition exists');
}
ok('3b: two different owned items granting the same normalized action id produce one canonical ActionDefinition plus two distinct ActionEntitlement records, with no duplicate-definition exception');

// ─── 3c — Blocker 1: divergent configuration between two sources must fail loudly, never silently pick the first ──

{
  // Two feats that both normalize to the SAME domain:id ("power-attack")
  // but disagree on a field the v1 schema actually models (attack-type
  // requirement) -- not producible from the current shipped packs
  // (deliberately synthetic), proving the resolver no longer silently
  // keeps whichever source happened to be scanned first when the
  // resulting definitions genuinely differ.
  //
  // NOTE (honest scope limitation, not swept under the rug): the v1
  // ActionDefinition schema does not yet model slider bounds (`rule.max`)
  // at all -- see action-definition-normalizer.js. Two sources
  // disagreeing ONLY on `max` would therefore currently normalize to
  // IDENTICAL definition content and would NOT be caught by this
  // conflict check; that gap is documented in the architecture doc
  // rather than silently assumed fixed by this test.
  function powerAttackMeleeVariant() {
    return { id: 'feat-power-attack-melee', name: 'Power Attack (melee source)', type: 'feat', system: { abilityMeta: { rules: [
      { type: 'ATTACK_OPTION', option: 'powerAttack', label: 'Power Attack', control: 'slider', max: 5, requiresAttackType: 'melee', attackModifierFormula: '-value', damageModifierFormula: 'value' }
    ] } } };
  }
  function powerAttackRangedVariant() {
    return { id: 'feat-power-attack-ranged', name: 'Power Attack (ranged source)', type: 'feat', system: { abilityMeta: { rules: [
      { type: 'ATTACK_OPTION', option: 'powerAttack', label: 'Power Attack', control: 'slider', max: 5, requiresAttackType: 'ranged', attackModifierFormula: '-value', damageModifierFormula: 'value' }
    ] } } };
  }
  const actor = makeActor({ items: [powerAttackMeleeVariant(), powerAttackRangedVariant()] });
  assert.throws(
    () => ActorActionResolver.getOwnedActions(actor, { domain: 'attack' }),
    /conflicting ActionDefinition content/,
    'two sources granting the same logical action id with genuinely DIFFERENT requirement content must fail loudly, never silently keep whichever source was scanned first'
  );
}
ok('3c: two owned items granting the same normalized action id but with divergent requirement content (melee vs ranged) throw a loud, explicit error instead of silently picking the first-scanned source as canonical');

// ─── 6/7/8 — Careful Shot: entitlement is stable; availability changes with Aim ──

{
  const actor = makeActor({ items: [carefulShotFeat()] });
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' }).definitions;
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
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' }).definitions;
  assert.ok(definition);
  assert.equal(ActionAvailabilityEngine.evaluate(definition, { attackType: 'melee', weapon: meleeWeapon(), charge: false }).state, 'disabled');
  assert.equal(ActionAvailabilityEngine.evaluate(definition, { attackType: 'melee', weapon: meleeWeapon(), charge: true }).state, 'available');
}
ok('9: Powerful Charge\'s entitlement is stable regardless of Charge; its availability flips disabled -> available as Charge context changes');

// ─── 10 — structural mismatch (melee-only action, ranged weapon) is HIDDEN, not disabled ──

{
  const actor = makeActor({ items: [powerAttackFeat()] });
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' }).definitions;
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
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' }).definitions;
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
  const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' }).definitions;
  ActionAvailabilityEngine.evaluate(definition, { attackType: 'ranged', weapon: rangedWeapon(), aim: true });
  assert.equal(JSON.stringify(item), itemSnapshotBefore, 'ActorActionResolver/normalizer must never mutate the source item');
  assert.equal(JSON.stringify({ ...actor, items: undefined }), actorSnapshotBefore, 'ActionAvailabilityEngine must never mutate the actor');
}
ok('13/14: neither ActorActionResolver/the normalizer nor ActionAvailabilityEngine mutate the source item or the actor');

// ─── 15 — provenance lives on the entitlement, never on the definition ────
// Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker 1):
// this used to assert the AVAILABILITY RESULT's definition carried
// source.name/type/id -- which was only possible because the definition
// itself embedded one specific granting item's provenance, the exact
// thing Blocker 1 removed. Provenance now lives exclusively on
// ActionEntitlement; ActionAvailabilityEngine's result.definition must
// never carry it.

{
  const actor = makeActor({ items: [carefulShotFeat()] });
  const { definitions, entitlements } = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  const [definition] = definitions;
  const [entitlement] = entitlements;

  assert.equal(entitlement.source.name, 'Careful Shot');
  assert.equal(entitlement.source.type, 'feat');
  assert.equal(entitlement.source.id, 'feat-careful-shot');
  assert.deepEqual(entitlement.actionKey, { domain: 'attack', id: definition.id });

  const result = ActionAvailabilityEngine.evaluate(definition, { attackType: 'ranged', weapon: rangedWeapon(), aim: true });
  assert.equal('source' in result.definition, false, 'ActionAvailabilityEngine\'s result.definition must never carry per-item provenance -- that would reintroduce the order-dependent-identity bug Blocker 1 removed');
}
ok('15: source provenance lives exclusively on ActionEntitlement (resolved by ActorActionResolver, one per granting item); the ActionDefinition ActionAvailabilityEngine evaluates never carries it');

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
    const [definition] = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' }).definitions;
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

// ─── 17 — Blocker 4: fail-closed attackType (unknown never auto-passes) ───

{
  const requiresRanged = syntheticDefinition({ all: [{ type: 'attackType', value: 'ranged' }] });
  // No weapon, no explicit attackType in context -> getAttackType() resolves 'unknown'.
  const result = ActionAvailabilityEngine.evaluate(requiresRanged, {});
  assert.notEqual(result.state, 'available', 'an unresolvable ("unknown") attack type must NOT satisfy a required attackType predicate -- fail-closed, not permission-by-default');
  assert.equal(result.requirements[0].met, false);
}
ok('17: Blocker 4 fail-closed semantics -- an unresolvable ("unknown") attack type never satisfies a required attackType predicate');

// ─── 18 — Blocker 4: boolean-tree (all/any/not) provenance ────────────────

{
  const aim = { type: 'context', key: 'aim', value: true };
  const charge = { type: 'context', key: 'charge', value: true };

  // (a) all, with multiple failures: every leaf is still evaluated and
  // recorded, not short-circuited away.
  {
    const def = syntheticDefinition({ all: [aim, charge] });
    const result = ActionAvailabilityEngine.evaluate(def, { aim: false, charge: false });
    assert.equal(result.state, 'disabled');
    assert.equal(result.requirements.length, 2, 'both failing leaves of an all[] must be recorded, not short-circuited after the first failure');
    assert.ok(result.requirements.every(r => r.met === false));
  }

  // (b) any, with one success: met overall, but every branch's leaf is
  // still recorded for provenance (not just the winning one).
  {
    const def = syntheticDefinition({ any: [aim, charge] });
    const result = ActionAvailabilityEngine.evaluate(def, { aim: false, charge: true });
    assert.equal(result.state, 'available');
    assert.equal(result.requirements.length, 2, 'any[] must record both branches\' leaves even though only one needed to succeed');
    assert.deepEqual(result.requirements.map(r => r.met), [false, true]);
  }

  // (c) any, with all failures.
  {
    const def = syntheticDefinition({ any: [aim, charge] });
    const result = ActionAvailabilityEngine.evaluate(def, { aim: false, charge: false });
    assert.equal(result.state, 'disabled');
    assert.equal(result.requirements.length, 2);
    assert.ok(result.requirements.every(r => r.met === false));
  }

  // (d) not, success (the excluded condition does NOT hold -> the option
  // is available).
  {
    const def = syntheticDefinition({ all: [{ not: aim }] });
    const result = ActionAvailabilityEngine.evaluate(def, { aim: false });
    assert.equal(result.state, 'available');
    assert.equal(result.requirements[0].met, true);
  }

  // (e) not, failure -- the excluded condition DOES hold, and the leaf
  // must carry a real, non-null reason explaining the exclusion (not a
  // silent false).
  {
    const def = syntheticDefinition({ all: [{ not: aim, sourceField: 'excludesAimForTest' }] });
    const result = ActionAvailabilityEngine.evaluate(def, { aim: true });
    assert.equal(result.state, 'disabled');
    assert.equal(result.requirements[0].met, false);
    assert.ok(result.requirements[0].reason, 'a failing not-node must carry a truthful, non-null reason explaining why the exclusion blocks the option');
  }

  // (f) nested all/any/not: any(aim, charge) AND NOT(weaponGroup heavy).
  // weaponGroup is a STRUCTURAL predicate type -- a not(weaponGroup) leaf
  // (an excludesWeaponGroups-shaped gate) is therefore structural too,
  // matching CombatOptionResolver's own unconditional excludesWeaponGroups
  // check. Correction #3 (Blocker 2) makes ANY unmet structural leaf
  // dominate to 'hidden' regardless of what else is also unmet -- see
  // section 19 -- so a heavy weapon here (genuinely, structurally
  // excluded) must hide the option even though Aim/Charge (non-structural,
  // player-actionable) are also unmet in this same case.
  {
    const def = syntheticDefinition({ all: [{ any: [aim, charge] }, { not: { type: 'weaponGroup', value: ['heavy'] } }] });
    const metCase = ActionAvailabilityEngine.evaluate(def, { aim: true, weapon: { name: 'Vibro Axe', system: { weaponCategory: 'simple' } } });
    assert.equal(metCase.state, 'available', 'nested all/any/not: Aim satisfied, weapon is not heavy -> available');

    const unmetCase = ActionAvailabilityEngine.evaluate(def, { aim: false, charge: false, weapon: { name: 'Heavy Repeater', system: { weaponCategory: 'heavy' } } });
    assert.equal(unmetCase.state, 'hidden', 'nested all/any/not: the weapon is structurally excluded (heavy) -- hidden dominates even though Aim/Charge are also unmet');
    assert.equal(unmetCase.requirements.length, 3, 'the any[] contributes 2 leaves (aim, charge) plus the not(weaponGroup) contributes 1 -- all three recorded for a nested tree, even though the overall state is hidden');
  }
}
ok('18: Blocker 4 boolean-tree provenance -- all[]/any[] evaluate and record every branch (never short-circuited away from the result), not-nodes produce a truthful non-null reason on failure, and nested all/any/not compositions record every leaf correctly');

// ─── 19 — Blocker 2: a structural failure dominates to 'hidden' even when mixed with unsupported/external-workflow ──
// Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker 2):
// this used to only hide an option when EVERY unmet requirement happened
// to be structural -- a structurally-impossible option (wrong weapon/
// attack-type) mixed with a second, non-structural unmet gate surfaced as
// merely 'disabled' (or even 'external-workflow'), contradicting the live
// resolver's unconditional attackType/weapon-group exclusion. Real shipped
// examples: Mighty Swing (requiresAttackType:'melee', requiresSwiftActions:
// 2) and Improved Disarm (requiresAttackType:'melee', requiresManeuver:
// 'disarm') both reproduce this exact mixed-failure shape.

{
  // Mighty Swing-shaped: structural (attackType) + unsupported (swift
  // actions), evaluated against a ranged weapon.
  const mightySwingShaped = syntheticDefinition({ all: [
    { type: 'attackType', value: 'melee', sourceField: 'requiresAttackType' },
    { type: 'unsupported', sourceField: 'requiresSwiftActions' }
  ] });
  const result = ActionAvailabilityEngine.evaluate(mightySwingShaped, { attackType: 'ranged', weapon: rangedWeapon() });
  assert.equal(result.state, 'hidden', 'Mighty Swing-shaped (melee-only + unsupported swift-action gate) on a ranged weapon must be hidden -- the weapon mismatch alone makes it structurally impossible here, regardless of the separate unsupported gate');
  assert.equal(result.reason, null);
}
ok('19a: a structural failure (wrong attack type) mixed with an unsupported failure still resolves to hidden, matching the Mighty Swing (requiresAttackType:melee + requiresSwiftActions) real record shape');

{
  // Improved Disarm-shaped: structural (attackType) + external-workflow
  // (maneuver), evaluated against a ranged weapon.
  const improvedDisarmShaped = syntheticDefinition({ all: [
    { type: 'attackType', value: 'melee', sourceField: 'requiresAttackType' },
    { type: 'externalWorkflow', sourceField: 'requiresManeuver' }
  ] });
  const result = ActionAvailabilityEngine.evaluate(improvedDisarmShaped, { attackType: 'ranged', weapon: rangedWeapon() });
  assert.equal(result.state, 'hidden', 'Improved Disarm-shaped (melee-only + maneuver gate) on a ranged weapon must be hidden -- the weapon mismatch alone makes it structurally impossible here, regardless of the separate external-workflow gate');
  assert.equal(result.reason, null);
}
ok('19b: a structural failure (wrong attack type) mixed with an external-workflow failure still resolves to hidden, matching the Improved Disarm (requiresAttackType:melee + requiresManeuver) real record shape');

{
  // Sanity: the SAME two definitions on a melee weapon are no longer
  // structurally blocked, and correctly fall through to
  // unsupported/external-workflow respectively.
  const mightySwingShaped = syntheticDefinition({ all: [
    { type: 'attackType', value: 'melee', sourceField: 'requiresAttackType' },
    { type: 'unsupported', sourceField: 'requiresSwiftActions' }
  ] });
  const onMelee = ActionAvailabilityEngine.evaluate(mightySwingShaped, { attackType: 'melee', weapon: meleeWeapon() });
  assert.equal(onMelee.state, 'unsupported', 'on a melee weapon, Mighty Swing-shaped is no longer structurally blocked -- the remaining unsupported (swift-action) gate now determines the state');
}
ok('19c: with the structural gate satisfied, the same definition correctly falls through to the unsupported state, proving the precedence fix does not just permanently hide the option');

// ─── 20 — Blocker 3: an unknown predicate under `not` must never resolve available ──
// The reviewer's exact regression case: negating an unrecognized
// predicate type used to flip "unknown = unmet(false)" into
// "not(unmet) = met(true)" -- permission by default, exactly backwards
// from fail-closed. An unknown predicate must be unmet whether it
// appears positively OR negated.

{
  const def = syntheticDefinition({ all: [{ not: { type: 'futureUnknownPredicate' } }] });
  const result = ActionAvailabilityEngine.evaluate(def, {});
  assert.notEqual(result.state, 'available', 'an unknown predicate type negated by `not` must never resolve the option as available');
  assert.equal(result.requirements[0].met, false, 'the synthesized not-leaf must report unmet for an unknown inner predicate type');
}
ok('20: Blocker 3 fail-closed under negation -- not:{type:\'futureUnknownPredicate\'} never resolves available, closing the exact fail-open gap an independent review found (unknown treated as false, then negated true)');

// ─── 21 — Blocker 4: target flat-footed/denied-Dex alias parity with the live resolver ──
// The engine used to reimplement these two checks inline and had
// silently dropped two of CombatOptionResolver's own context aliases
// (flatFootedTarget for flat-footed, deniedDexBonus for denied-Dex).
// Both are now delegated to the same shared, extracted functions the
// live resolver itself calls -- this proves the previously-dropped
// aliases are honored again.

{
  const flatFootedDef = syntheticDefinition({ all: [{ type: 'targetFlatFooted', sourceField: 'requiresTargetFlatFooted' }] });
  const target = organicTargetActor();
  const result = ActionAvailabilityEngine.evaluate(flatFootedDef, { attackType: 'melee', weapon: meleeWeapon(), target, flatFootedTarget: true });
  assert.equal(result.state, 'available', 'the flatFootedTarget context alias (dropped by the prior inline reimplementation) must be honored, matching CombatOptionResolver.optionAllowedForWeapon()');
}
ok('21a: requiresTargetFlatFooted honors the context.flatFootedTarget alias, matching the live resolver exactly');

{
  const deniedDexDef = syntheticDefinition({ all: [{ type: 'targetDeniedDex', sourceField: 'requiresTargetDeniedDexBonus' }] });
  const target = organicTargetActor();
  const result = ActionAvailabilityEngine.evaluate(deniedDexDef, { attackType: 'melee', weapon: meleeWeapon(), target, deniedDexBonus: true });
  assert.equal(result.state, 'available', 'the deniedDexBonus context alias (dropped by the prior inline reimplementation) must be honored, matching CombatOptionResolver.optionAllowedForWeapon()');
}
ok('21b: requiresTargetDeniedDexBonus honors the context.deniedDexBonus alias, matching the live resolver exactly');

// ─── 22 — Blocker 4: not(any(...)) does not short-circuit and merges inner provenance ──
// This is the exact shape excludesOptions normalizes into (see
// action-definition-normalizer.js#buildRequirements). The prior
// implementation used Array#some() directly on the not(any(...)) branch,
// which short-circuits after the first successful child, and discarded
// the inner evaluateNode() calls' leaves entirely instead of merging
// them into the result's provenance.

{
  const excludesOptionsShaped = syntheticDefinition({ all: [
    { not: { any: [
      { type: 'selectedOption', value: 'optionA' },
      { type: 'selectedOption', value: 'optionB' },
      { type: 'selectedOption', value: 'optionC' }
    ] }, sourceField: 'excludesOptions' }
  ] });

  // All three excluded options are currently unselected: not(any(false,false,false)) = not(false) = true -> available.
  // Every inner branch must still be recorded (3 leaves) plus the not-summary leaf (4 total), proving no short-circuit.
  const noneSelected = ActionAvailabilityEngine.evaluate(excludesOptionsShaped, { selectedOptions: {} });
  assert.equal(noneSelected.state, 'available');
  assert.equal(noneSelected.requirements.length, 4, 'not(any(A,B,C)) must record all 3 inner branch leaves plus the not-summary leaf, never short-circuited away');

  // The FIRST excluded option is selected -- if evaluation short-circuited
  // (Array#some() stopping after the first true), B and C's leaves would
  // never be evaluated/recorded at all.
  const firstSelected = ActionAvailabilityEngine.evaluate(excludesOptionsShaped, { selectedOptions: { optionA: true } });
  assert.equal(firstSelected.state, 'disabled', 'optionA is selected -> the exclusion holds -> the option is blocked');
  assert.equal(firstSelected.requirements.length, 4, 'even though optionA alone determines the any[] result, optionB and optionC\'s leaves must still be recorded -- proving evaluation does not short-circuit');
  assert.ok(firstSelected.requirements[3].reason, 'the not-summary leaf must carry a real reason when the exclusion blocks the option');
}
ok('22: not(any(...)) (the exact shape excludesOptions normalizes into) evaluates every branch without short-circuiting and merges every inner leaf into the result\'s provenance, not just the not-summary leaf');

// ─── 23 — Issue 5: value-level reconciliation catches a corrupted requirement value ──
// Math Integrity Freeze, Attack Bonus round 8 correction #3 (Issue 5):
// correction #2's guard only proved a sourceField NAME appeared
// somewhere in the tree -- a leaf tagged the right field name but
// carrying a WRONG/truncated value (a translation bug, or anything
// mutating the definition after normalization) would still pass. This
// proves the guard now recomputes and compares the actual VALUE too.

{
  const rule = { type: 'ATTACK_OPTION', option: 'test-value-reconciliation', control: 'toggle', requiresWeaponGroups: ['rifles', 'heavy'] };
  const sourceItem = { id: 'feat-fake-value', name: 'Fake Value Feat', type: 'feat' };
  const definition = normalizeAttackOptionRule(sourceItem, rule);
  assert.doesNotThrow(() => validateAttackOptionNormalization(rule, definition), 'sanity: the genuine, uncorrupted normalization must pass');

  // Corrupt the already-normalized definition's requirement value in
  // place, exactly as the independent review specified -- simulating
  // either a translation bug or a later mutation, not a fresh
  // normalization run.
  const corrupted = JSON.parse(JSON.stringify(definition));
  const node = corrupted.requirements.all.find(n => n.sourceField === 'requiresWeaponGroups');
  node.value = ['rifles']; // silently dropped 'heavy'

  assert.throws(
    () => validateAttackOptionNormalization(rule, corrupted),
    /VALUE does not match/,
    'a requirement leaf whose value was corrupted after normalization must be caught -- field-NAME coverage alone is not sufficient proof of lossless translation'
  );
}
ok('23: Issue 5 value-level reconciliation -- corrupting a normalized requirement\'s value (while keeping its sourceField name intact) is caught by validateAttackOptionNormalization(), proving the guard checks actual content, not just field-name presence');

console.log('action-authority-groundwork.test.mjs: all assertions passed');
