import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Attack → Damage Option Context Transport — workflow authority
// certification (addendum to the Damage SSOT correction round,
// docs/audits/v2-damage-modifier-authority-audit.md, "Attack-to-Damage
// Option Context Certification").
//
// THE INVARIANT THIS SUITE CERTIFIES: a combat option selected for an
// attack becomes IMMUTABLE workflow context for that attack. The later
// Damage roll (chat-card Damage button, the primary live path) must see
// EXACTLY the option-selection values that belonged to the original
// attack — no reconstruction by feat name, no re-reading current UI/actor
// state, no inference from high-level flags (aim/autofire/...), no
// entitlement grant for an option the actor does not own even if a
// synthetic context claims it was selected.
//
// This is deliberately a DEDICATED file, not folded into
// damage-modifier-ssot.test.mjs's generic formula tests — it certifies a
// workflow-transport authority, not damage arithmetic.
//
// Scope discipline: this addendum fixes ONLY this one blocker. It does
// NOT touch (and this file does not re-test) the other two blockers the
// same correction round separately closed:
//   1. typed Damage stacking driving the numeric total, not only the
//      ledger (see damage-modifier-ssot.test.mjs Section 4);
//   2. stock-droid dice transformations occurring exactly once (see
//      stock-droid-damage-math.test.mjs tests 8-12).

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.game = globalThis.game ?? {};
globalThis.game.combat = globalThis.game.combat ?? null;
globalThis.game.user = globalThis.game.user ?? { targets: { first: () => null } };

const {
  summarizeCombatWorkflowContext,
  encodeCombatWorkflowContext,
  decodeCombatWorkflowContext,
  mergeCombatWorkflowContextIntoRollOptions
} = await import('/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js');
const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

// The full transport pipeline, in one call, mirroring the REAL production
// chain exactly (attacks.js#rollAttack()'s own damageWorkflowContext
// construction -> SWSEChat.postRoll()'s chat-message flags ->
// swse-roll-engine.js's encodeCombatWorkflowContext() for the chat-card
// template -> runtime-bugfix-hotfixes.js#rollDamageFromButton()'s
// decodeCombatWorkflowContext(button.dataset.workflowContext) ->
// damage.js#rollDamage()'s mergeCombatWorkflowContextIntoRollOptions()).
function fullTransportRoundTrip(attackRollOptions, actor, weapon) {
  const workflowContext = summarizeCombatWorkflowContext(attackRollOptions, { actor, weapon });
  const damageWorkflowContext = summarizeCombatWorkflowContext(workflowContext, { actor, weapon });
  const encoded = encodeCombatWorkflowContext(damageWorkflowContext);
  const decoded = decodeCombatWorkflowContext(encoded);
  return mergeCombatWorkflowContextIntoRollOptions({}, decoded);
}

// ─── Fixture helpers (mirrors damage-modifier-ssot.test.mjs) ──────────────

function makeItemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find(i => i.id === id);
  arr.find = Array.prototype.find.bind(arr);
  return arr;
}

function abilityBlock(mod) {
  return { base: 10 + mod * 2, racial: 0, enhancement: 0, temp: 0 };
}

function makeActor({ bab = 0, str = 0, dex = 0, level = 1, items = [] } = {}) {
  return {
    id: 'test-actor', type: 'character', flags: {},
    system: {
      bab, level,
      attributes: {
        str: abilityBlock(str), dex: abilityBlock(dex), cha: abilityBlock(0),
        con: abilityBlock(0), int: abilityBlock(0), wis: abilityBlock(0)
      },
      abilities: {}
    },
    items: makeItemsCollection(items),
    effects: [],
    getFlag() { return undefined; },
    setFlag: async () => {}
  };
}

function attackOptionFeat(optionKey, id = `feat-${optionKey}`) {
  return { id, name: optionKey, type: 'feat', system: { abilityMeta: { rules: [{ type: 'ATTACK_OPTION', option: optionKey }] } } };
}

function rangedWeapon(overrides = {}) {
  return { id: 'w-ranged', name: 'Blaster Pistol', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'pistols', damage: '3d6', proficient: true, ...overrides } };
}

function meleeWeapon(overrides = {}) {
  return { id: 'w-melee', name: 'Vibro Axe', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'simple', damage: '2d6', proficient: true, ...overrides } };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — Canonical field / normalization / value-preservation
// ═══════════════════════════════════════════════════════════════════════════

// Full round-trip: booleans, a slider number, AND an inactive `false`
// entry (which MAY be pruned, per the addendum's explicit allowance —
// only active/value-bearing selections must survive).
{
  const initial = {
    aim: true, rangeBand: 'short',
    combatOptions: { deadeye: true, rapidShot: true, powerAttack: 3, mightySwing: false }
  };
  const summarized = summarizeCombatWorkflowContext(initial, {});
  const encoded = encodeCombatWorkflowContext(summarized);
  const decoded = decodeCombatWorkflowContext(encoded);
  const merged = mergeCombatWorkflowContextIntoRollOptions({}, decoded);

  assert.equal(merged.combatOptions.deadeye, true);
  assert.equal(merged.combatOptions.rapidShot, true);
  assert.equal(merged.combatOptions.powerAttack, 3);
  assert.ok(merged.combatOptions.mightySwing !== true, 'an inactive (false) entry must never resolve as active after round-trip');
}
ok('canonical round-trip: booleans and a numeric slider value survive; inactive false may be omitted, never flips active');

// Historical alias normalization: attackOptions-only input still reaches
// combatOptions on the other side (both spellings merge into ONE
// canonical representation, not two independently-tracked maps).
{
  const initial = { combatOptions: {}, attackOptions: { deadeye: true } };
  const merged = fullTransportRoundTrip(initial, makeActor({ bab: 5, dex: 3 }), rangedWeapon());
  assert.equal(merged.combatOptions.deadeye, true, 'attackOptions-only input must still reach combatOptions after round-trip (one canonical selection universe)');
  assert.equal(merged.attackOptions.deadeye, true, 'and remains visible under attackOptions too, since CombatOptionResolver reads either key');
}
ok('historical alias normalization: combatOptions/attackOptions merge into one canonical selection map, not two independently-tracked ones');

// Only plain, workflow-safe primitive values (boolean/finite-number/
// string) survive — an object/function/document reference must never
// leak into the transport-safe (JSON-encodable) snapshot.
{
  const unsafeReference = { id: 'not-a-primitive', toJSON() { throw new Error('must never be serialized'); } };
  const initial = { combatOptions: { deadeye: true, powerAttack: 3, corrupted: unsafeReference, notAFiniteNumber: Infinity } };
  const summarized = summarizeCombatWorkflowContext(initial, {});
  assert.equal(summarized.attack.selectedOptions.deadeye, true);
  assert.equal(summarized.attack.selectedOptions.powerAttack, 3);
  assert.equal(summarized.attack.selectedOptions.corrupted, undefined, 'a non-primitive (object) value must be dropped, never serialized');
  assert.equal(summarized.attack.selectedOptions.notAFiniteNumber, undefined, 'a non-finite number must be dropped');
  // Must not throw serializing to JSON (proves nothing unsafe survived).
  assert.doesNotThrow(() => JSON.stringify(summarized));
}
ok('value safety: only boolean/finite-number/string selections survive; unsafe object/function references are dropped, never crash serialization');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — Rule-level round-trip tests (one per representative option)
// ═══════════════════════════════════════════════════════════════════════════

// 1. Deadeye
{
  const actor = makeActor({ bab: 5, dex: 3, items: [attackOptionFeat('deadeye')] });
  const weapon = rangedWeapon();
  const merged = fullTransportRoundTrip({ aim: true, combatOptions: { deadeye: true } }, actor, weapon);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, merged);
  assert.equal(optionModifiers.damageExtraWeaponDice, 1, 'Deadeye round-trip: damageExtraWeaponDice === 1');
}
ok('rule round-trip 1/6: Deadeye -> damageExtraWeaponDice = 1');

// 2. Burst Fire
{
  const actor = makeActor({ bab: 5, dex: 3, items: [attackOptionFeat('burstFire')] });
  const weapon = rangedWeapon({ autofire: true });
  const merged = fullTransportRoundTrip({ autofire: true, combatOptions: { burstFire: true } }, actor, weapon);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, merged);
  assert.equal(optionModifiers.damageExtraWeaponDice, 2, 'Burst Fire round-trip: damageExtraWeaponDice === 2');
}
ok('rule round-trip 2/6: Burst Fire -> damageExtraWeaponDice = 2');

// 3. Rapid Shot — the field name (damageDiceStepBonus) is historically
// confusing (it is an EXTRA-DIE mechanic, not a die-SIZE-step one — see
// docs/audits/v2-damage-modifier-authority-audit-correction-1.md's own
// note on this); the round-trip must resolve to exactly +1, once, via the
// canonical damageExtraWeaponDice field, never double-counted against its
// damageDiceStepBonus dual-write alias.
{
  const actor = makeActor({ bab: 5, dex: 3, items: [attackOptionFeat('rapidShot')] });
  const weapon = rangedWeapon();
  const merged = fullTransportRoundTrip({ combatOptions: { rapidShot: true } }, actor, weapon);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, merged);
  assert.equal(optionModifiers.damageExtraWeaponDice, 1, 'Rapid Shot round-trip: damageExtraWeaponDice === 1');
  assert.equal(optionModifiers.damageExtraWeaponDice, optionModifiers.damageDiceStepBonus, 'sanity: dual-write fields still agree (collapsed to one canonical read downstream, not two independent contributions)');
}
ok('rule round-trip 3/6: Rapid Shot -> +1 extra weapon die, exactly once');

// 4. Rapid Strike
{
  const actor = makeActor({ bab: 5, str: 2, items: [attackOptionFeat('rapidStrike')] });
  const weapon = meleeWeapon();
  const merged = fullTransportRoundTrip({ combatOptions: { rapidStrike: true } }, actor, weapon);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, merged);
  assert.equal(optionModifiers.damageExtraWeaponDice, 1, 'Rapid Strike round-trip: +1 weapon die');
}
ok('rule round-trip 4/6: Rapid Strike -> +1 weapon die');

// 5. Mighty Swing
{
  const actor = makeActor({ bab: 5, str: 3, items: [attackOptionFeat('mightySwing')] });
  const weapon = meleeWeapon();
  const merged = fullTransportRoundTrip({ combatOptions: { mightySwing: true } }, actor, weapon);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, merged);
  assert.equal(optionModifiers.damageExtraWeaponDice, 1, 'Mighty Swing round-trip: +1 weapon die');
}
ok('rule round-trip 5/6: Mighty Swing -> +1 weapon die');

// 6. Power Attack — proves a NUMERIC SLIDER value (not just a boolean)
// survives the full transport, and resolves to exactly its selected
// value under the currently-implemented formula (damageModifierFormula:
// "value"). Like every other ATTACK_OPTION, availability is granted by
// an owning feat item (getAvailableAttackOptions() only discovers
// options via actorItems()'s ATTACK_OPTION rules) — this is exactly the
// same ownership gate the unowned-option negative test in Section 3
// exercises, so the fixture must grant it explicitly.
{
  const actor = makeActor({ bab: 5, str: 2, items: [attackOptionFeat('powerAttack')] });
  const weapon = meleeWeapon();
  const merged = fullTransportRoundTrip({ combatOptions: { powerAttack: 3 } }, actor, weapon);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, merged);
  assert.equal(optionModifiers.damageBonus, 3, 'Power Attack round-trip: numeric damage contribution === exactly 3 (the slider value), proving numeric values transport, not just booleans');
}
ok('rule round-trip 6/6: Power Attack slider (3) -> +3 numeric damage contribution, proving numeric values (not just booleans) survive transport');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — Snapshot semantics (immutability, no inference, no
// entitlement grant)
// ═══════════════════════════════════════════════════════════════════════════

// Snapshot immutability: mutating the ORIGINAL source object after
// serialization must not affect the already-summarized/decoded snapshot
// — it is a plain-data copy, never a live reference.
{
  const attackOptionsAtAttackTime = { powerAttack: 3 };
  const summarized = summarizeCombatWorkflowContext({ combatOptions: attackOptionsAtAttackTime }, {});
  const encoded = encodeCombatWorkflowContext(summarized);

  attackOptionsAtAttackTime.powerAttack = 1; // mutate the ORIGINAL source object

  const decoded = decodeCombatWorkflowContext(encoded);
  assert.equal(decoded.attack.selectedOptions.powerAttack, 3, 'the decoded workflow snapshot must retain the value AT SERIALIZATION TIME (3), unaffected by a later mutation of the original source object (now 1)');
}
ok('snapshot immutability: mutating the original source object after serialization does not affect the stored snapshot');

// Actor/UI mutation proof (via two independently-constructed option
// objects, since this headless harness has no live UI to simulate): an
// attack workflow serialized with Deadeye selected must resolve Deadeye
// on ITS Damage roll even after a DIFFERENT, later option selection
// exists — proving the Damage SSOT consumes the frozen receipt of the
// original attack, never "whatever is currently selected."
{
  const actor = makeActor({ bab: 5, dex: 3, items: [attackOptionFeat('deadeye')] });
  const weapon = rangedWeapon();

  // The ORIGINAL attack: Deadeye selected, serialized and "stored" as its
  // own independent chat-card payload.
  const originalAttackOptions = { aim: true, combatOptions: { deadeye: true } };
  const originalEncoded = encodeCombatWorkflowContext(summarizeCombatWorkflowContext(originalAttackOptions, { actor, weapon }));

  // A LATER, unrelated attack/UI state where Deadeye is no longer
  // selected — must not retroactively affect the original.
  const laterAttackOptions = { aim: true, combatOptions: { deadeye: false } };
  encodeCombatWorkflowContext(summarizeCombatWorkflowContext(laterAttackOptions, { actor, weapon }));

  // Clicking Damage on the ORIGINAL attack's chat card still decodes the
  // ORIGINAL payload, not whatever the "current" state now is.
  const decodedOriginal = decodeCombatWorkflowContext(originalEncoded);
  const merged = mergeCombatWorkflowContextIntoRollOptions({}, decodedOriginal);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, merged);
  assert.equal(optionModifiers.damageExtraWeaponDice, 1, 'the ORIGINAL attack card must still resolve Deadeye, unaffected by a later, unrelated selection change');
}
ok('actor/UI mutation proof: a later, different option selection never retroactively changes an earlier attack\'s own stored snapshot');

// Negative test: Aim true, but Deadeye NOT selected (combatOptions: {}).
// Owning the feat + satisfying its gate must never be treated as
// activation — this guards against "fixing" context loss by turning
// ownership/eligibility into automatic activation.
{
  const actor = makeActor({ bab: 5, dex: 3, items: [attackOptionFeat('deadeye')] });
  const weapon = rangedWeapon();
  const merged = fullTransportRoundTrip({ aim: true, combatOptions: {} }, actor, weapon);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, merged);
  assert.equal(optionModifiers.damageExtraWeaponDice, 0, 'Aim being true must NEVER imply Deadeye was selected — ownership + gate-satisfaction is not activation');
}
ok('negative test: Aim=true with Deadeye NOT selected must not apply Deadeye — no inference from high-level flags');

// Unowned-option test: a synthetic transport claims Deadeye was selected,
// but the actor does not own it. Transport records player intent/context;
// it must never grant entitlement.
{
  const actorWithoutDeadeye = makeActor({ bab: 5, dex: 3, items: [] });
  const weapon = rangedWeapon();
  const merged = fullTransportRoundTrip({ aim: true, combatOptions: { deadeye: true } }, actorWithoutDeadeye, weapon);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actorWithoutDeadeye, weapon, merged);
  assert.equal(optionModifiers.damageExtraWeaponDice, 0, 'a persisted selection for an option the actor does NOT own must never grant its effect — transport is not entitlement');
}
ok('unowned-option test: a stored selection for an option the actor does not own is never granted');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4 — Established transport (target/critical/range/etc.) is not
// regressed — the option snapshot is additive, not a replacement.
// ═══════════════════════════════════════════════════════════════════════════
{
  const initial = {
    aim: true, charge: false, autofire: true, rangeBand: 'medium', isCritical: true, critMultiplier: 3,
    damageType: 'stun', combatOptions: { burstFire: true },
    target: { id: 'target-actor-1', name: 'Test Target' }
  };
  const merged = fullTransportRoundTrip(initial, makeActor(), rangedWeapon());
  assert.equal(merged.aim, true, 'Aim must still transport correctly alongside the new option snapshot');
  assert.equal(merged.autofire, true, 'Autofire must still transport correctly');
  assert.equal(merged.rangeBand, 'medium', 'range band must still transport correctly');
  assert.equal(merged.isCritical, true, 'critical state must still transport correctly');
  assert.equal(merged.critMultiplier, 3, 'critical multiplier must still transport correctly');
  assert.equal(merged.damageType, 'stun', 'damage type/mode must still transport correctly');
  assert.equal(merged.combatOptions.burstFire, true, 'and the new option snapshot transports alongside all of the above');
}
ok('established transport (target/aim/autofire/range/critical/damage-type) is not regressed by the additive option snapshot');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5 — Production path proof (structural: source-text verification
// of every hop named in the addendum's required data-flow chain)
// ═══════════════════════════════════════════════════════════════════════════

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
function readSource(relPath) {
  return fs.readFileSync(repoRoot + relPath, 'utf8');
}

{
  // Hop 1-2: attack dialog -> _runCanonicalAttackWithPreroll -> rollAttack.
  // showRollModifiersDialog(rollType:'attack') reads combatOptions/
  // attackOptions from its own form via readNestedFormEntries() and
  // returns them on its result object; _runCanonicalAttackWithPreroll()
  // spreads that ENTIRE result (...modResult) into _runCanonicalAttack(),
  // which calls SWSERoll.rollAttack() — the same options object, not a
  // reconstruction.
  const rollConfigSource = readSource('scripts/rolls/roll-config.js');
  assert.match(rollConfigSource, /readNestedFormEntries\(form, ['"]combatOptions['"]\)/, 'the attack dialog must read combatOptions from its own form');
  const sheetBaseSource = readSource('scripts/sheets/v2/actor-sheet-base.js');
  assert.match(sheetBaseSource, /\.\.\.modResult/, '_runCanonicalAttackWithPreroll() must forward the ENTIRE dialog result (including combatOptions), not a hand-picked subset');
}
ok('production path hop 1-2: attack dialog -> _runCanonicalAttackWithPreroll -> rollAttack forwards the real combatOptions selection, not a reconstruction');

{
  // Hop 3-5: rollAttack() captures the selection into its own
  // workflowContext/damageWorkflowContext via summarizeCombatWorkflowContext(),
  // and attaches it to the chat message.
  const attacksSource = readSource('scripts/combat/rolls/attacks.js');
  assert.match(attacksSource, /summarizeCombatWorkflowContext\(/, 'rollAttack() must call summarizeCombatWorkflowContext()');
  assert.match(attacksSource, /workflowContext:\s*damageWorkflowContext/, 'rollAttack() must attach damageWorkflowContext to the chat message');
}
ok('production path hop 3-5: rollAttack() captures the selection into damageWorkflowContext and attaches it to the chat message');

{
  // Hop 6: the chat-card template context builder encodes the workflow
  // context, and the real chat-card template embeds it as
  // data-workflow-context on the Damage button.
  const rollEngineSource = readSource('scripts/engine/rolls/swse-roll-engine.js');
  assert.match(rollEngineSource, /encodeCombatWorkflowContext\(/, 'the chat-card context builder must call encodeCombatWorkflowContext()');
  const templateSource = readSource('templates/chat/holo-roll.hbs');
  assert.match(templateSource, /data-workflow-context="\{\{.*workflowContextEncoded\}\}"/, 'the real production chat-card template must embed the encoded workflow context on the Damage button');
}
ok('production path hop 6: the chat-card template embeds the encoded workflow context on the Damage button via data-workflow-context');

{
  // Hop 7-9: the Damage button handler decodes it and damage.js#rollDamage()
  // restores it via mergeCombatWorkflowContextIntoRollOptions() before
  // ever calling resolveDamageComposition()/CombatOptionResolver.
  const hotfixSource = readSource('scripts/patches/runtime-bugfix-hotfixes.js');
  assert.match(hotfixSource, /decodeCombatWorkflowContext\(button\.dataset\.workflowContext\)/, 'the Damage button handler must decode button.dataset.workflowContext');
  const damageSource = readSource('scripts/combat/rolls/damage.js');
  assert.match(damageSource, /mergeCombatWorkflowContextIntoRollOptions\(/, 'damage.js#rollDamage() must restore the decoded context via mergeCombatWorkflowContextIntoRollOptions()');
  const decodeIndex = damageSource.indexOf('mergeCombatWorkflowContextIntoRollOptions(');
  const compositionIndex = damageSource.indexOf('resolveDamageComposition(');
  assert.ok(decodeIndex > -1 && compositionIndex > -1 && decodeIndex < compositionIndex,
    'the restored context must be merged BEFORE resolveDamageComposition()/CombatOptionResolver ever sees it — no Damage-specific recreation of ATTACK_OPTION logic');
}
ok('production path hop 7-9: the Damage button handler decodes and restores the option map before resolveDamageComposition() is ever called');

console.log(`\nAll ${step} attack-damage-option-context-transport checks passed.`);
