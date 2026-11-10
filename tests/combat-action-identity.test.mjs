import assert from 'node:assert/strict';
import test from 'node:test';
import { dedupeCombatActionRows } from '../scripts/sheets/v2/character-sheet/combat-action-identity.js';

// Combat tab UX convergence, Phase 7: removes genuine duplicate combat action rows and nothing else. Pure rule; no combat mechanics are touched.
const row = (o = {}) => ({ key: 'combat:aim', name: 'Aim', actionType: 'standard', cost: 1, executable: true, spendAction: true, sourceName: 'Combat Actions Compendium', itemId: '', relatedSkills: [], ...o });
const names = (r) => r.rows.map((x) => x.name);

test('1. an identical action registered twice appears once', () => {
  const r = dedupeCombatActionRows([row(), row()]);
  assert.equal(r.rows.length, 1); assert.equal(r.removed.length, 1); assert.deepEqual(r.conflicts, []);
});
test('2. the same action from two source registries appears once and records both sources', () => {
  const r = dedupeCombatActionRows([row({ sourceName: 'Combat Actions Compendium' }), row({ sourceName: 'Core Combat Action' })]);
  assert.equal(r.rows.length, 1); assert.equal(r.rows[0].sourceName, 'Combat Actions Compendium'); assert.deepEqual(r.rows[0].alsoFrom, ['Core Combat Action']);
});
test('3. the same display name with different canonical keys stays separate (a name is never an identity)', () => {
  const r = dedupeCombatActionRows([row({ key: 'feat:a:strike' , name: 'Power Strike' }), row({ key: 'talent:b:strike', name: 'Power Strike' })]);
  assert.deepEqual(names(r), ['Power Strike', 'Power Strike']); assert.equal(r.removed.length, 0);
});
test('4. distinct execution variants (different source items) of one key both remain', () => {
  const r = dedupeCombatActionRows([row({ key: 'item:use', itemId: 'i1', sourceName: 'Species A' }), row({ key: 'item:use', itemId: 'i2', sourceName: 'Species B' })]);
  assert.equal(r.rows.length, 2); assert.equal(r.removed.length, 0);
  assert.equal(r.sharedKeys.length, 1, 'reported: one key addresses two items');
});
test('5. the same action at different valid action costs (standard vs swift) stays as two distinct actions, reported as a shared key', () => {
  const r = dedupeCombatActionRows([row({ actionType: 'standard', cost: 1 }), row({ actionType: 'swift', cost: 1 })]);
  assert.deepEqual(r.rows.map((x) => x.actionType), ['standard', 'swift']); assert.equal(r.removed.length, 0); assert.deepEqual(r.conflicts, []);
  assert.deepEqual(r.sharedKeys[0].lanes.sort(), ['standard', 'swift']);
});
test('6. one identity with contradictory mechanics: BOTH stay, both are flagged, and it is reported -- nothing chooses silently', () => {
  const r = dedupeCombatActionRows([row({ cost: 1 }), row({ cost: 2, sourceName: 'Other' })]);
  assert.equal(r.rows.length, 2); assert.equal(r.conflicts.length, 1);
  assert.ok(r.rows.every((x) => x.identityConflict === true && x.identityConflictReason));
  assert.deepEqual(r.conflicts[0].sources, ['Combat Actions Compendium', 'Other']);
  const r2 = dedupeCombatActionRows([row({ executable: true }), row({ executable: false })]);
  assert.equal(r2.conflicts.length, 1, 'executable vs reference is a contradictory contract too');
});
test('7. non-executable reference actions are kept (and a duplicate reference collapses like any other)', () => {
  const ref = row({ key: 'combat:ref', name: 'Reference', executable: false });
  const r = dedupeCombatActionRows([ref, { ...ref }]);
  assert.equal(r.rows.length, 1); assert.equal(r.rows[0].executable, false);
});
test('8. feat- and talent-granted actions with their own keys are never merged with the core action or each other', () => {
  const r = dedupeCombatActionRows([row({ key: 'combat:aim' }), row({ key: 'feat:deadeye:aim', name: 'Aim', sourceName: 'Deadeye' }), row({ key: 'talent:sniper:aim', name: 'Aim', sourceName: 'Sniper' })]);
  assert.equal(r.rows.length, 3);
});
test('9. NPC-specific actions (own keys / items) are preserved', () => {
  const r = dedupeCombatActionRows([row({ key: 'npc:t1:rend', name: 'Rend', itemId: 'n1', sourceName: 'NPC' }), row({ key: 'npc:t1:rend', name: 'Rend', itemId: 'n1', sourceName: 'NPC' }), row({ key: 'npc:t1:howl', name: 'Howl', itemId: 'n2' })]);
  assert.deepEqual(names(r), ['Rend', 'Howl']);
});
test('10. Droid-specific actions keep their lane and item; a droid action is not merged with a same-named organic one', () => {
  const r = dedupeCombatActionRows([row({ key: 'item:d1:use', name: 'Overclock', itemId: 'd1', actionType: 'swift', sourceName: 'Droid Part' }), row({ key: 'item:o1:use', name: 'Overclock', itemId: 'o1', actionType: 'swift', sourceName: 'Species' })]);
  assert.equal(r.rows.length, 2);
});
test('rows without a key are never merged, and input order and non-object entries are handled', () => {
  const r = dedupeCombatActionRows([row({ key: '', name: 'A' }), row({ key: '', name: 'A' }), null, undefined, row({ key: 'k2', name: 'B' })]);
  assert.deepEqual(names(r), ['A', 'A', 'B']);
  assert.deepEqual(dedupeCombatActionRows(undefined).rows, []);
});
test('related-skill order does not create a false conflict', () => {
  const r = dedupeCombatActionRows([row({ relatedSkills: ['acrobatics', 'initiative'] }), row({ relatedSkills: ['initiative', 'acrobatics'] })]);
  assert.equal(r.rows.length, 1); assert.deepEqual(r.conflicts, []);
});

// ---- the presentation-layer pass: buildActionGroups collapses the same rows and keeps counts honest ----
test('buildActionGroups: a duplicate row fed by two groups / subgroups is shown once, counts follow, and conflict flags reach the view model', async () => {
  const { registerFoundryPathLoader } = await import('./helpers/foundry-shim/register.mjs');
  const { installFoundryShimGlobals } = await import('./helpers/foundry-shim/globals.mjs');
  globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
  globalThis.foundry ??= {}; globalThis.foundry.applications ??= {}; globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
  globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } }; globalThis.Hooks = { callAll() {}, on() {}, once() {} };
  const mod = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/concept-context.js');
  const build = mod.buildActionGroupsForTest ?? null;
  assert.equal(typeof build, 'function', 'buildActionGroups is exposed for the contract test');
  const a = row({ key: 'combat:aim', name: 'Aim' });
  const dup = { ...a, sourceName: 'Core Combat Action' };
  const sw = row({ key: 'combat:aim', name: 'Aim', actionType: 'swift' });
  const clash1 = row({ key: 'combat:x', name: 'X', cost: 1 }), clash2 = row({ key: 'combat:x', name: 'X', cost: 3, sourceName: 'Other' });
  const groups = build({ groups: [
    { key: 'standard', label: 'Standard', items: [a, dup, clash1, clash2], subgroups: [{ label: 'Standard', items: [a, dup] }] },
    { key: 'swift', label: 'Swift', items: [sw], subgroups: [{ label: 'Swift', items: [sw] }] }
  ] }, {});
  const standard = groups.find((g) => g.key === 'standard');
  assert.deepEqual(standard.items.map((i) => i.key), ['combat:aim', 'combat:x', 'combat:x'], 'duplicate Aim collapsed; the two contradictory X rows both stay');
  assert.equal(standard.count, 3); assert.equal(standard.subgroups[0].count, 1); assert.equal(standard.subgroups[0].items.length, 1);
  assert.ok(standard.items.filter((i) => i.key === 'combat:x').every((i) => i.identityConflict === true));
  assert.equal(groups.find((g) => g.key === 'swift').items.length, 1, 'the swift version of Aim is a different action and stays');
});
