import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 combat runtime convergence, Phase 3 (Action Authority production
// wiring). Second reconciliation layer, per independent review of
// c2576ad: the state-level reconciliation
// (action-authority-136-record-reconciliation.test.mjs) proves "given the
// correct ActionDefinition, does ActionAvailabilityEngine classify it
// correctly" -- it does NOT prove the actual production discovery path:
//
//   actor -> ActorActionResolver -> ActionRegistry -> ActionEntitlement
//   -> ActionDefinition -> ActionAvailabilityEngine
//
// This file reconciles THAT seam for all 136 real records: does owning
// the real source item produce the expected entitlement and canonical
// definition, does a non-owning actor get nothing, do duplicate grants of
// the same logical action collapse to one definition without losing
// per-grant provenance, and does per-grant configuration stay isolated on
// the entitlement rather than leaking into the shared definition. No
// mechanical/roll math is touched or exercised here.

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

const { extractAttackOptionRules } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { ActorActionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/actions/actor-action-resolver.js');
const { ActionRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-registry.js');
const { normalizeAttackOptionRule } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition-normalizer.js');

function loadDb(relPath) {
  const raw = readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
  // Real Foundry Item documents expose `.id` as an accessor over the
  // stored `_id` field; the raw NDJSON pack records only carry `_id`, so
  // fixtures built directly from them need that same accessor mirrored
  // for ActorActionResolver's `sourceItem?.id` reads to see anything.
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

function itemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find((i) => i.id === id);
  return arr;
}
function makeActor(items) {
  return { id: 'entitlement-actor', name: 'Entitlement Actor', type: 'character', items: itemsCollection(items), system: {} };
}

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

// ── 1-3: for every real record, owning the source item produces a
// matching entitlement and the expected canonical definition for THAT
// record; nothing silently disappears. Some real source items (e.g.
// "Staggering Attack") carry more than one ATTACK_OPTION rule, so owning
// the item can legitimately surface more than one definition/entitlement
// -- the assertion is that this record's own key is among them exactly
// once, not that the item grants only one action. ──
{
  let checked = 0;
  for (const { sourceItem, rule } of records) {
    const actor = makeActor([sourceItem]);
    const registry = new ActionRegistry();
    const { definitions, entitlements } = ActorActionResolver.getOwnedActions(actor, { domain: 'attack', registry });

    const expectedDefinition = normalizeAttackOptionRule(sourceItem, rule);
    const expectedKey = `${expectedDefinition.domain}:${expectedDefinition.id}`;
    const rulesOnThisItem = extractAttackOptionRules(sourceItem);

    assert.equal(definitions.length, rulesOnThisItem.length, `${sourceItem.name}: owning its one source item must produce exactly one definition per distinct ATTACK_OPTION rule the item carries (${rulesOnThisItem.length}), got ${definitions.length}`);
    assert.equal(entitlements.length, rulesOnThisItem.length, `${sourceItem.name}: must produce exactly one entitlement per distinct rule the item carries (${rulesOnThisItem.length}), got ${entitlements.length}`);

    const matchingDefinitions = definitions.filter((d) => `${d.domain}:${d.id}` === expectedKey);
    assert.equal(matchingDefinitions.length, 1, `${sourceItem.name}: this record's own canonical key (${expectedKey}) must appear exactly once among the owned definitions, not silently disappear or duplicate`);
    assert.deepEqual(matchingDefinitions[0], expectedDefinition, `${sourceItem.name}: the resolved definition must be byte-identical to normalizeAttackOptionRule()'s own output for this rule`);

    const matchingEntitlements = entitlements.filter((e) => `${e.actionKey.domain}:${e.actionKey.id}` === expectedKey);
    assert.equal(matchingEntitlements.length, 1, `${sourceItem.name}: this record's own canonical key must have exactly one matching entitlement`);
    const entitlement = matchingEntitlements[0];
    assert.equal(entitlement.actorId, actor.id);
    assert.equal(entitlement.source.id, sourceItem.id, `${sourceItem.name}: entitlement.source must identify the granting item`);
    assert.equal(entitlement.source.name, sourceItem.name);
    assert.deepEqual(entitlement.configuration.rule, rule, `${sourceItem.name}: entitlement.configuration.rule must preserve the exact raw rule, including fields (e.g. slider max) the v1 schema does not model`);

    // The registry (when supplied) must hold the exact same canonical
    // object, not a re-normalized copy -- one authority, not a shadow copy.
    const fromRegistry = registry.get(expectedDefinition.domain, expectedDefinition.id);
    assert.equal(fromRegistry, matchingDefinitions[0], `${sourceItem.name}: the registry must hold the SAME definition object getOwnedActions() returned, not a duplicate`);

    checked += 1;
  }
  assert.equal(checked, 136);
}
ok('1-3: every one of the 136 real records resolves to exactly one matching entitlement + canonical definition, with per-grant configuration (including v1-unmodeled fields like slider max) preserved on the entitlement');

// ── 4: a non-owning actor gets no entitlement/definition for a real record. ──
{
  const { sourceItem } = records[0];
  const nonOwner = makeActor([]); // owns nothing
  const { definitions, entitlements } = ActorActionResolver.getOwnedActions(nonOwner, { domain: 'attack' });
  assert.equal(definitions.length, 0, `an actor owning nothing must get zero definitions, not ${sourceItem.name}'s`);
  assert.equal(entitlements.length, 0);
}
ok('4: an actor that does not own the granting item gets no entitlement and no definition -- discovery is genuinely ownership-gated, not a global list');

// ── 5-6: duplicate grants of the SAME logical action (two distinct source
// items, byte-identical rule) collapse to ONE canonical definition but
// preserve TWO separate entitlements/provenance records -- never a
// duplicate presentation card, never a lost grant. ──
{
  const { sourceItem, rule } = records.find(({ rule: r }) => !r.requiresManeuver && !r.requiresOpportunityAttack && !r.requiresSwiftActions);
  const secondSource = { ...sourceItem, id: `${sourceItem.id}-duplicate-grant`, name: `${sourceItem.name} (second copy)` };
  const actor = makeActor([sourceItem, secondSource]);
  const registry = new ActionRegistry();
  const { definitions, entitlements } = ActorActionResolver.getOwnedActions(actor, { domain: 'attack', registry });

  assert.equal(definitions.length, 1, 'two sources granting byte-identical content for the same logical action must collapse to exactly one canonical definition');
  assert.equal(entitlements.length, 2, 'both grants must still be individually represented as separate entitlements -- neither provenance record is dropped');
  const sourceIds = entitlements.map((e) => e.source.id).sort();
  assert.deepEqual(sourceIds, [secondSource.id, sourceItem.id].sort(), 'both distinct granting items must be identifiable from their own entitlement');
}
ok('5-6: duplicate grants of the same logical action collapse to one canonical definition (ActionRegistry) while both entitlements/provenance records survive individually (no duplicate presentation card, no lost grant)');

// ── 7: mutating a returned entitlement's configuration.rule must not
// corrupt the actor's real owned item data (deep-clone boundary). ──
{
  const { sourceItem, rule } = records[0];
  const actor = makeActor([sourceItem]);
  const { entitlements } = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
  entitlements[0].configuration.rule.label = 'MUTATED';
  const liveRule = extractAttackOptionRules(actor.items.get(sourceItem.id))[0];
  assert.equal(liveRule.label, rule.label, 'mutating entitlement.configuration.rule must never corrupt the actor\'s real owned item data');
}
ok('7: entitlement.configuration.rule is a true deep clone -- mutating it cannot corrupt the actor\'s live owned-item data');

// ── 8: feat and talent grants behave identically at this seam (implicit
// in the fact that step 1-3 iterated both item types with the same
// assertions and all 136 passed identically) -- proven explicitly here
// with one of each. ──
{
  const featRecord = records.find((r) => r.itemType === 'feat');
  const talentRecord = records.find((r) => r.itemType === 'talent');
  for (const { sourceItem, itemType } of [featRecord, talentRecord]) {
    const actor = makeActor([sourceItem]);
    const { definitions, entitlements } = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' });
    assert.equal(definitions.length, 1, `${itemType} grant must resolve one definition`);
    assert.equal(entitlements.length, 1, `${itemType} grant must resolve one entitlement`);
    assert.equal(entitlements[0].source.type, itemType.toLowerCase(), `${itemType} entitlement.source.type must record the real item type`);
  }
}
ok('8: feat and talent grants are treated identically at the ActorActionResolver seam, each correctly recording its own source.type');

console.log('action-authority-entitlement-reconciliation: all assertions passed');
