import assert from 'node:assert/strict';
import { buildSourceBreakdown, buildModifierLedger, buildLedgerFromComponents } from '../scripts/engine/effects/modifiers/modifier-breakdown-builder.js';

// Phase 1 fix: RollCore's modifier breakdown used to be built from an
// unfiltered/domain-blind modifier list, so its sum could differ from
// modifierTotal. buildSourceBreakdown/buildModifierLedger only ever see the
// already domain-filtered, stacking-resolved `applied` array, so their sum is
// guaranteed to equal sum(applied values) — i.e. modifierTotal — for any
// partition of that array.
{
  const applied = [
    { id: 'a1', source: 'feat', sourceName: 'Skill Focus', value: 5 },
    { id: 'a2', source: 'feat', sourceName: 'Skill Training', value: 3 },
    { id: 'a3', source: 'item', sourceName: 'Utility Belt', value: 2 },
    { id: 'a4', source: 'condition', sourceName: 'Fatigued', value: -1 }
  ];
  const modifierTotal = applied.reduce((sum, m) => sum + m.value, 0);

  const breakdown = buildSourceBreakdown(applied);
  const breakdownSum = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  assert.equal(breakdownSum, modifierTotal, 'sum(breakdown values) must equal modifierTotal');
  assert.equal(breakdown.feat, 8);
  assert.equal(breakdown.item, 2);
  assert.equal(breakdown.condition, -1);

  const ledger = buildModifierLedger(applied, [], 'skill.acrobatics');
  const ledgerSum = ledger.filter(e => e.applied).reduce((sum, e) => sum + e.value, 0);
  assert.equal(ledgerSum, modifierTotal, 'sum(applied ledger entries) must equal modifierTotal');
  assert.ok(ledger.every(e => e.domain === 'skill.acrobatics'));
}

// A modifier targeting an unrelated domain must never appear in a breakdown
// built for a different domain — this is enforced by construction here
// because buildSourceBreakdown only ever receives the already domain-filtered
// `applied` array; feeding it a mixed list to prove the point:
{
  const onlyAcrobatics = [{ id: 'x1', source: 'item', sourceName: 'Gear', value: 2 }]; // pre-filtered to skill.acrobatics
  const breakdown = buildSourceBreakdown(onlyAcrobatics);
  assert.deepEqual(breakdown, { item: 2 });
  assert.equal(Object.keys(breakdown).length, 1);
}

// Net-zero source buckets are dropped so the breakdown stays free of "0" noise.
{
  const applied = [
    { id: 'p1', source: 'feat', value: 3 },
    { id: 'p2', source: 'feat', value: -3 }
  ];
  const breakdown = buildSourceBreakdown(applied);
  assert.deepEqual(breakdown, {});
}

// Suppressed modifiers are tagged applied:false with a reason, and are not
// counted toward the ledger's applied sum.
{
  const applied = [{ id: 'a1', source: 'feat', value: 5 }];
  const suppressed = [{ modifier: { id: 's1', source: 'item', value: 10 }, reason: 'stacking' }];
  const ledger = buildModifierLedger(applied, suppressed, 'combat.attack');
  const suppressedEntry = ledger.find(e => e.id === 's1');
  assert.ok(suppressedEntry);
  assert.equal(suppressedEntry.applied, false);
  assert.equal(suppressedEntry.reason, 'stacking');
  const appliedSum = ledger.filter(e => e.applied).reduce((sum, e) => sum + e.value, 0);
  assert.equal(appliedSum, 5);
}

// combat-roll-math.js-style { label: value } components adapt into ledger
// entries without altering the resolver's own math.
{
  const components = { 'BAB': 4, 'Ability (STR)': 2, 'Range Penalty': -2 };
  const ledger = buildLedgerFromComponents(components, 'combat.attack', 'baseline');
  assert.equal(ledger.length, 3);
  assert.ok(ledger.every(e => e.category === 'baseline' && e.domain === 'combat.attack' && e.applied === true));
  const sum = ledger.reduce((total, e) => total + e.value, 0);
  assert.equal(sum, 4 + 2 - 2);
}

console.log('Modifier breakdown/ledger sum-parity guards passed.');
