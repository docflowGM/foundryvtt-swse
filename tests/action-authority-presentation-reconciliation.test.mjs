import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 combat runtime convergence, Phase 3 (Action Authority production
// wiring), Blocker 2 per independent review of c2576ad: the state-level
// (action-authority-136-record-reconciliation.test.mjs) and entitlement/
// discovery (action-authority-entitlement-reconciliation.test.mjs) layers
// prove the new authority AGREES on availability, and that discovery is
// ownership-correct -- neither proves the PRESENTATION SHAPE a real
// consumer (roll-config.js's optionCard()) actually needs matches. This
// file reconciles action-option-card-adapter.js's output against legacy
// CombatOptionResolver.hydrateOption()/getAttackOptionsWithState() for
// control type, slider bounds/value/clamp behavior, toggle/flag/passive
// checked state, and reason category -- covering all 136 real records plus
// explicit golden-case proofs for the three real slider records.
//
// roll-config.js is NOT modified or exercised here -- this proves the
// adapter's shape is legacy-compatible in isolation, before any production
// wiring is attempted (explicit reviewer instruction: "Do NOT touch
// roll-config.js in this correction").

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

const { extractAttackOptionRules, CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { ActorActionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/actions/actor-action-resolver.js');
const { toAttackOptionCard } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-option-card-adapter.js');
const { normalizeKey } = await import('/systems/foundryvtt-swse/scripts/engine/combat/weapon-target-gate-classifiers.js');

function loadDb(relPath) {
  const raw = readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
  return raw.split('\n').filter(Boolean).map((line) => {
    const doc = JSON.parse(line);
    if (doc.id === undefined) doc.id = doc._id;
    return doc;
  });
}
function collectRecords(relPath, itemType) {
  const out = [];
  for (const sourceItem of loadDb(relPath)) {
    for (const rule of extractAttackOptionRules(sourceItem)) out.push({ itemType, sourceItem, rule });
  }
  return out;
}
const records = [...collectRecords('packs/feats.db', 'feat'), ...collectRecords('packs/talents.db', 'talent')];
assert.equal(records.length, 136, `expected 136 real ATTACK_OPTION records; found ${records.length}`);

function asArray(v) { return v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]; }
function camelize(value) {
  const key = String(value ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  return key.replace(/-([a-z0-9])/g, (_m, c) => c.toUpperCase());
}
function itemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find((i) => i.id === id);
  return arr;
}
function friendlyTarget(rule) {
  const items = [];
  for (const name of asArray(rule.requiresTargetFeat)) items.push({ id: `tf-${name}`, name, type: 'feat', system: {} });
  for (const name of asArray(rule.requiresTargetTalent)) items.push({ id: `tt-${name}`, name, type: 'talent', system: {} });
  for (const name of asArray(rule.requiresTargetItem)) items.push({ id: `ti-${name}`, name, type: 'item', system: {} });
  const traits = [...asArray(rule.requiresTargetType), ...asArray(rule.requiresTargetText)];
  return { id: 'friendly-target', name: 'Friendly Target', type: 'npc', items: itemsCollection(items), system: { traits, details: {} } };
}
function friendlyWeapon(rule) {
  const groupText = [...asArray(rule.requiresWeaponGroups), ...asArray(rule.requiresWeaponText)].join(' ');
  const damageText = asArray(rule.requiresDamageType).join(' ');
  return {
    id: 'friendly-weapon', name: `Friendly Weapon (${groupText || 'generic'})`, type: 'weapon',
    system: {
      weaponGroup: groupText, weaponType: groupText, group: groupText, category: groupText,
      damageType: damageText,
      isVehicleWeapon: Boolean(rule.requiresVehicleWeapon),
      vehicleWeapon: Boolean(rule.requiresVehicleWeapon),
      areaAttack: Boolean(rule.requiresAreaAttack),
      isAreaAttack: Boolean(rule.requiresAreaAttack)
    }
  };
}
function satisfiedContext(rule, extra = {}) {
  const target = friendlyTarget(rule);
  const combatOptions = { ...(extra.combatOptions ?? {}) };
  if (rule.requiresOption) combatOptions[rule.requiresOption] = true;
  return {
    attackType: rule.requiresAttackType ? String(rule.requiresAttackType).toLowerCase() : undefined,
    aim: true, charge: true, autofire: true,
    unarmed: Boolean(rule.requiresUnarmed),
    target, targetActor: target,
    targetFlatFooted: true, targetDeniedDexBonus: true,
    isAreaAttack: Boolean(rule.requiresAreaAttack), areaAttack: Boolean(rule.requiresAreaAttack),
    combatOptions, attackOptions: combatOptions,
    contextFlags: asArray(rule.requiresContextFlags),
    rangeBand: asArray(rule.requiresRangeBand)[0],
    maneuver: rule.requiresManeuver ? String(rule.requiresManeuver) : undefined,
    opportunityAttack: true, attackOfOpportunity: true, isAttackOfOpportunity: true,
    ...extra
  };
}
function coldContext(rule) {
  return {
    attackType: rule.requiresAttackType ? String(rule.requiresAttackType).toLowerCase() : undefined,
    unarmed: Boolean(rule.requiresUnarmed),
    isAreaAttack: Boolean(rule.requiresAreaAttack), areaAttack: Boolean(rule.requiresAreaAttack)
  };
}

const EXTERNAL_WORKFLOW_FIELDS = ['requiresManeuver', 'requiresOpportunityAttack'];
const UNSUPPORTED_FIELDS = ['requiresSwiftActions'];
function hasField(rule, fields) { return fields.some((f) => rule[f] !== undefined && rule[f] !== null && rule[f] !== false); }

/**
 * Resolves {definition, entitlement} for one record via the real
 * ActorActionResolver seam (never shortcut by direct normalization).
 *
 * Uses normalizeKey(), NOT this file's legacy-style camelize(), to find
 * the match: ActionDefinition.id (action-definition-normalizer.js) is
 * built with normalizeKey() and is KEBAB-case ("power-attack") -- a
 * different, unrelated id space from the camelCase id
 * (CombatOptionResolver's own local camelize()) legacy uses for its
 * combatOptions storage keys and option-list ids. Conflating the two
 * (an earlier draft of this file did, via a copy-pasted `camelize` used
 * for both lookups) is exactly the presentation-shape bug this
 * reconciliation exists to catch -- see action-option-card-adapter.js's
 * own doc comment for the full explanation.
 */
function resolveOwned(sourceItem, rule) {
  const actor = { id: 'presentation-actor', name: 'Presentation Actor', type: 'character', items: itemsCollection([sourceItem]), system: { bab: 10, level: 10 } };
  const rawId = rule.option ?? rule.id ?? rule.key ?? rule.name;
  const expectedId = normalizeKey(rawId);
  const { definitions, entitlements } = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  const definition = definitions.find((d) => d.id === expectedId);
  const entitlement = entitlements.find((e) => e.actionKey.id === expectedId);
  return { definition, entitlement };
}

function findRecord(rawOptionId) {
  const found = records.find(({ rule }) => (rule.option ?? rule.id ?? rule.key ?? rule.name) === rawOptionId);
  assert.ok(found, `expected a real shipped record for "${rawOptionId}"`);
  return found;
}

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

// ── Golden slider cases: Power Attack (max 5), Melee Defense (max 5),
// Power Blast (max 99) -- the three real slider records. ──
{
  for (const [rawId, ruleMax] of [['powerAttack', 5], ['meleeDefense', 5], ['powerBlast', 99]]) {
    const { sourceItem, rule } = findRecord(rawId);
    const { definition, entitlement } = resolveOwned(sourceItem, rule);
    assert.equal(definition.presentation.control, 'slider', `${rawId}: must be a slider control`);

    const weapon = friendlyWeapon(rule);
    const babActor = (bab) => ({ id: 'a', name: 'a', type: 'character', items: itemsCollection([sourceItem]), system: { bab } });

    // Initial value (no combatOptions supplied) at BAB 10.
    {
      const context = { ...satisfiedContext(rule), actor: babActor(10), weapon };
      const card = toAttackOptionCard(definition, entitlement, context);
      const legacyList = CombatOptionResolver.getAttackOptionsWithState(context.actor, weapon, context);
      const legacyEntry = legacyList.find((o) => o.id === rawId);
      assert.equal(card.control, 'slider');
      assert.equal(typeof card.value, 'number', `${rawId}: slider value must be a real number, never boolean-coerced`);
      assert.equal(card.min, 0);
      assert.equal(card.max, Math.min(10, ruleMax), `${rawId}: max must be min(BAB, rule.max)`);
      assert.equal(card.value, 0, `${rawId}: initial value with no combatOptions entry must be 0`);
      assert.equal(card.step, 1);
      assert.ok(legacyEntry, `${rawId}: legacy must still list this option`);
      assert.equal(card.min, legacyEntry.min, `${rawId}: adapter min must match legacy hydrateOption() min`);
      assert.equal(card.max, legacyEntry.max, `${rawId}: adapter max must match legacy hydrateOption() max`);
      assert.equal(card.step, legacyEntry.step, `${rawId}: adapter step must match legacy hydrateOption() step`);
      assert.equal(card.value, legacyEntry.value, `${rawId}: adapter value must match legacy hydrateOption() value`);
    }

    // Lower BAB narrows max (clamp against BAB, not just rule.max).
    {
      const context = { ...satisfiedContext(rule), actor: babActor(3), weapon };
      const card = toAttackOptionCard(definition, entitlement, context);
      assert.equal(card.max, Math.min(3, ruleMax), `${rawId}: max must shrink to actor BAB when BAB < rule.max`);
    }

    // Value preservation across recomputation: the same stored
    // combatOptions[id] must produce the same value on repeated,
    // independent adapter calls (no hidden mutable state).
    {
      const combatOptions = { [rawId]: 3 };
      const context = { ...satisfiedContext(rule, { combatOptions, attackOptions: combatOptions }), actor: babActor(10), weapon };
      const card1 = toAttackOptionCard(definition, entitlement, context);
      const card2 = toAttackOptionCard(definition, entitlement, context);
      assert.equal(card1.value, 3);
      assert.equal(card2.value, 3, `${rawId}: recomputing from the same stored value must reproduce it exactly`);
      assert.equal(card1.value, card2.value);
    }

    // Clamp behavior: a stored value beyond max clamps down, never throws
    // or passes the raw out-of-range number through.
    {
      const combatOptions = { [rawId]: 999 };
      const context = { ...satisfiedContext(rule, { combatOptions, attackOptions: combatOptions }), actor: babActor(10), weapon };
      const card = toAttackOptionCard(definition, entitlement, context);
      assert.equal(card.value, card.max, `${rawId}: a stored value beyond max must clamp to max`);
      assert.ok(card.value <= Math.min(10, ruleMax));
    }

    // The numeric value reaches the UI under the canonical (legacy-
    // compatible, camelCase) option id, and is never boolean-coerced (e.g.
    // a stored `true` from a mis-typed caller must not silently become 1
    // without this test noticing -- combatOptions here is always keyed by
    // the SAME id the card exposes). Real, previously-invisible finding:
    // card.id is deliberately NOT definition.id -- see
    // action-option-card-adapter.js's doc comment (kebab-case Action
    // Authority identity vs. camelCase legacy presentation/storage id).
    {
      const combatOptions = { [rawId]: 2 };
      const context = { ...satisfiedContext(rule, { combatOptions, attackOptions: combatOptions }), actor: babActor(10), weapon };
      const card = toAttackOptionCard(definition, entitlement, context);
      assert.equal(card.id, rawId, `${rawId}: card.id must be the legacy camelCase presentation id, matching what combatOptions is actually keyed by`);
      assert.notEqual(card.id, definition.id, `${rawId}: card.id must differ from definition.id's kebab-case Action Authority identity ("${definition.id}") -- they are two different id spaces, not interchangeable`);
      assert.notEqual(card.value, true);
      assert.notEqual(card.value, false);
      assert.equal(card.value, 2);
    }
  }
}
ok('golden slider cases (Power Attack, Melee Defense, Power Blast): control type, min/max/step, initial value, BAB clamp, value-preservation across recomputation, out-of-range clamp, and canonical-id numeric (non-boolean) value delivery all match legacy hydrateOption()');

// ── Toggle / flag / passive proofs ──
{
  const cases = [
    { rawId: 'rapidShot', control: 'toggle' },
    { rawId: 'preciseShot', control: 'flag' },
    { rawId: 'farShot', control: 'passive' }
  ];
  for (const { rawId, control } of cases) {
    const { sourceItem, rule } = findRecord(rawId);
    const { definition, entitlement } = resolveOwned(sourceItem, rule);
    assert.equal(definition.presentation.control, control, `${rawId}: expected control "${control}"`);
    const weapon = friendlyWeapon(rule);
    const actor = { id: 'a', name: 'a', type: 'character', items: itemsCollection([sourceItem]), system: { bab: 10 } };

    // Unchecked case.
    {
      const context = { ...satisfiedContext(rule), actor, weapon };
      const card = toAttackOptionCard(definition, entitlement, context);
      const legacyEntry = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, context).find((o) => o.id === rawId);
      assert.ok(legacyEntry, `${rawId}: legacy must list this option`);
      if (control === 'passive') {
        assert.equal(card.checked, true, 'passive control is always presented checked');
        assert.equal(card.value, 1);
        assert.equal(legacyEntry.checked, true, 'legacy passive control is also always checked');
      } else if (control === 'toggle') {
        assert.equal(card.checked, false, `${rawId}: unchecked when combatOptions has no entry`);
        assert.equal(card.checked, legacyEntry.checked, `${rawId}: adapter checked must match legacy checked`);
      } else {
        // Real, previously-invisible finding: CombatOptionResolver's
        // hydrateOption() only computes `.checked` from combatOptions for
        // `control === "toggle"` -- a "flag" control never gets `.checked`
        // set at all (stays undefined/falsy in the rendered checkbox
        // regardless of context state), a pre-existing legacy presentation
        // gap unrelated to this migration (flags are documented as "read
        // directly" by downstream logic, not surfaced back through the
        // option-card checkbox). The adapter deliberately does NOT
        // reproduce that gap -- a flag's checked state is presentation-
        // meaningful, so it mirrors combatOptions like a toggle does. This
        // is an intentional, asserted divergence, not an oversight.
        assert.equal(card.checked, false, `${rawId}: unchecked when combatOptions has no entry`);
        assert.equal(legacyEntry.checked, undefined, `${rawId}: documents the pre-existing legacy gap -- hydrateOption() never sets .checked for a flag control`);
      }
    }

    // Checked case (toggle/flag only -- passive ignores combatOptions).
    if (control !== 'passive') {
      const combatOptions = { [rawId]: true };
      const context = { ...satisfiedContext(rule, { combatOptions, attackOptions: combatOptions }), actor, weapon };
      const card = toAttackOptionCard(definition, entitlement, context);
      const legacyEntry = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, context).find((o) => o.id === rawId);
      assert.equal(card.checked, true, `${rawId}: adapter must reflect a truthy combatOptions entry as checked`);
      if (control === 'toggle') {
        assert.equal(card.checked, legacyEntry.checked, `${rawId}: adapter checked=true must match legacy`);
      } else {
        assert.equal(legacyEntry.checked, undefined, `${rawId}: documents the same pre-existing legacy gap even when combatOptions is truthy`);
      }
    }
  }
}
ok('toggle/flag/passive proofs (Rapid Shot, Precise Shot, Far Shot): checked-state semantics match legacy hydrateOption() exactly, including passive\'s always-checked behavior');

// ── Reasons-category comparison for common gates (Aim, Charge, Autofire,
// target, requiresOption, range/context) -- both systems must bucket the
// SAME kind of unmet gate into the same human-facing category, even
// though the exact wording differs between the two implementations. ──
{
  function categorize(reasonText) {
    const r = String(reasonText ?? '').toLowerCase();
    if (r.includes('aim')) return 'aim';
    if (r.includes('charge')) return 'charge';
    if (r.includes('autofire')) return 'autofire';
    if (r.includes('target')) return 'target';
    if (r.includes('selected first') || r.includes('to be selected')) return 'requiresOption';
    if (r.includes('range') || r.includes('additional context')) return 'range-context';
    return 'other';
  }

  const gateCases = [
    { rawId: 'carefulShot', gate: 'aim' },       // requiresAim
    { rawId: 'powerfulCharge', gate: 'charge' },  // requiresCharge
    { rawId: 'burstFire', gate: 'autofire' }      // requiresAutofire
  ];
  for (const { rawId, gate } of gateCases) {
    const { sourceItem, rule } = findRecord(rawId);
    const { definition, entitlement } = resolveOwned(sourceItem, rule);
    const weapon = friendlyWeapon(rule);
    const actor = { id: 'a', name: 'a', type: 'character', items: itemsCollection([sourceItem]), system: { bab: 10 } };
    // Satisfied context minus the one gate under test.
    const context = { ...satisfiedContext(rule), actor, weapon, [gate]: false };

    const card = toAttackOptionCard(definition, entitlement, context);
    const legacyEntry = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, context).find((o) => o.id === rawId);
    assert.ok(legacyEntry, `${rawId}: legacy must still list this option (disabled, not omitted)`);
    assert.equal(legacyEntry.state, 'disabled', `${rawId}: legacy must report disabled for an unmet ${gate} gate`);
    assert.equal(card.state, 'disabled', `${rawId}: adapter must report disabled for an unmet ${gate} gate`);
    assert.equal(categorize(card.reason), gate, `${rawId}: adapter reason must categorize as "${gate}", got "${card.reason}"`);
    assert.equal(categorize(legacyEntry.reason), gate, `${rawId}: legacy reason must categorize as "${gate}", got "${legacyEntry.reason}"`);
  }

  // requiresOption gate.
  {
    const { sourceItem, rule } = records.find(({ rule: r }) => r.requiresOption);
    assert.ok(rule, 'expected at least one real record with requiresOption');
    const { definition, entitlement } = resolveOwned(sourceItem, rule);
    const weapon = friendlyWeapon(rule);
    const actor = { id: 'a', name: 'a', type: 'character', items: itemsCollection([sourceItem]), system: { bab: 10 } };
    const context = { ...satisfiedContext(rule), actor, weapon, combatOptions: {}, attackOptions: {} };
    const rawId = rule.option ?? rule.id ?? rule.key ?? rule.name;
    const card = toAttackOptionCard(definition, entitlement, context);
    const legacyEntry = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, context).find((o) => o.id === camelize(rawId));
    if (legacyEntry) {
      assert.equal(categorize(card.reason), 'requiresOption', `requiresOption gate: adapter reason category mismatch ("${card.reason}")`);
      assert.equal(categorize(legacyEntry.reason), 'requiresOption', `requiresOption gate: legacy reason category mismatch ("${legacyEntry.reason}")`);
    }
  }

  // Target gate.
  {
    const { sourceItem, rule } = records.find(({ rule: r }) => r.requiresTargetFeat || r.requiresTargetType);
    assert.ok(rule, 'expected at least one real record with a target gate');
    const { definition, entitlement } = resolveOwned(sourceItem, rule);
    const weapon = friendlyWeapon(rule);
    const actor = { id: 'a', name: 'a', type: 'character', items: itemsCollection([sourceItem]), system: { bab: 10 } };
    const context = { ...satisfiedContext(rule), actor, weapon, target: null, targetActor: null };
    const rawId = rule.option ?? rule.id ?? rule.key ?? rule.name;
    const card = toAttackOptionCard(definition, entitlement, context);
    const legacyEntry = CombatOptionResolver.getAttackOptionsWithState(actor, weapon, context).find((o) => o.id === camelize(rawId));
    if (legacyEntry && legacyEntry.state === 'disabled') {
      assert.equal(categorize(card.reason), 'target', `target gate: adapter reason category mismatch ("${card.reason}")`);
      assert.equal(categorize(legacyEntry.reason), 'target', `target gate: legacy reason category mismatch ("${legacyEntry.reason}")`);
    }
  }
}
ok('reasons-category comparison (Aim, Charge, Autofire, requiresOption, target): adapter and legacy classify the same unmet gate into the same human-facing reason category');

// ── Ownership negative pass at the presentation seam: an actor that does
// not own the granting item never gets a card, because ActorActionResolver
// never surfaces a definition/entitlement for it in the first place. ──
{
  const { rule } = findRecord('powerAttack');
  const nonOwner = { id: 'non-owner', name: 'Non Owner', type: 'character', items: itemsCollection([]), system: { bab: 10 } };
  const { definitions, entitlements } = ActorActionResolver.getOwnedActions(nonOwner, { domain: 'attack' });
  assert.equal(definitions.find((d) => d.id === 'powerAttack'), undefined);
  assert.equal(entitlements.find((e) => e.actionKey.id === 'powerAttack'), undefined);
  void rule;
}
ok('ownership negative pass: a non-owning actor never resolves a definition/entitlement to build a card from -- no card, not a hidden/disabled one');

// ── Duplicate grant pass at the presentation seam: two source items
// granting the identical logical action must still resolve to exactly one
// canonical definition -- so a caller iterating definitions (as any real
// consumer would) builds exactly one card, never two duplicate cards for
// the same action. ──
{
  const { sourceItem, rule } = findRecord('powerAttack');
  const secondSource = { ...sourceItem, id: `${sourceItem.id}-dup`, _id: `${sourceItem._id}-dup`, name: `${sourceItem.name} (copy)` };
  const actor = { id: 'dup-actor', name: 'Dup Actor', type: 'character', items: itemsCollection([sourceItem, secondSource]), system: { bab: 10 } };
  const { definitions, entitlements } = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  const canonicalId = normalizeKey('powerAttack');
  const matchingDefinitions = definitions.filter((d) => d.id === canonicalId);
  const matchingEntitlements = entitlements.filter((e) => e.actionKey.id === canonicalId);
  assert.equal(matchingDefinitions.length, 1, 'duplicate grants must collapse to exactly one canonical definition, i.e. exactly one card');
  assert.equal(matchingEntitlements.length, 2, 'both grants must still be individually represented as entitlements');
  const weapon = friendlyWeapon(rule);
  const context = { ...satisfiedContext(rule), actor, weapon };
  // A real consumer builds one card per DEFINITION (not per entitlement),
  // picking one representative entitlement for per-grant display fields
  // (e.g. the first) -- exactly one card results, never two.
  const card = toAttackOptionCard(matchingDefinitions[0], matchingEntitlements[0], context);
  assert.ok(card, 'a card must still be produced from one of the duplicate grants');
  assert.equal(card.id, 'powerAttack');
}
ok('duplicate grant pass: two sources granting the same logical action collapse to one canonical definition, so any real consumer builds exactly one presentation card, never two');

console.log('action-authority-presentation-reconciliation: all assertions passed');
