import assert from 'node:assert/strict';
import { buildActorItemIndex } from '../scripts/actors/v2/actor-item-index.js';

// Phase 1 actor authority + performance baseline: computeCharacterDerived()
// (scripts/actors/v2/character-actor.js) used to independently re-scan
// actor.items with `.filter(i => i.type === 'feat')` / 'talent' / 'maneuver'
// once per mirror* function. buildActorItemIndex() replaces those three
// scans with a single pass grouped by item.type, built once per
// computeCharacterDerived() call. These tests lock in the exact grouping
// contract those call sites now depend on: byType.get(X) must return
// exactly what `.filter(i => i.type === X)` would have returned, in the
// same relative order, for every type in this codebase's actor.itemTypes.

// ── byType groups items by exact type, preserving item order (Test 1) ──────

{
  const feat1 = { id: 'f1', type: 'feat', name: 'Weapon Focus' };
  const talent1 = { id: 't1', type: 'talent', name: 'Deadeye' };
  const feat2 = { id: 'f2', type: 'feat', name: 'Skill Focus' };
  const maneuver1 = { id: 'm1', type: 'maneuver', name: 'Barrel Roll' };
  const weapon1 = { id: 'w1', type: 'weapon', name: 'Blaster' };

  const actor = { items: [feat1, talent1, feat2, maneuver1, weapon1] };
  const { byType } = buildActorItemIndex(actor);

  assert.deepEqual(byType.get('feat'), [feat1, feat2], 'feat bucket preserves item order, matching .filter() semantics');
  assert.deepEqual(byType.get('talent'), [talent1]);
  assert.deepEqual(byType.get('maneuver'), [maneuver1]);
  assert.deepEqual(byType.get('weapon'), [weapon1]);
  assert.equal(byType.get('armor'), undefined, 'a type with zero items has no bucket, same as .filter() returning []');
}

// ── equivalent to the exact .filter(i => i.type === X) call sites it replaced (Test 2) ──

{
  const items = [
    { id: '1', type: 'feat' }, { id: '2', type: 'weapon' }, { id: '3', type: 'feat' },
    { id: '4', type: 'talent' }, { id: '5', type: 'maneuver' }, { id: '6', type: 'talent' },
    { id: '7', type: 'equipment' }, { id: '8', type: 'maneuver' }
  ];
  const actor = { items };
  const { byType } = buildActorItemIndex(actor);

  for (const type of ['feat', 'talent', 'maneuver']) {
    const viaFilter = items.filter(i => i.type === type);
    const viaIndex = byType.get(type) ?? [];
    assert.deepEqual(viaIndex, viaFilter, `byType.get('${type}') must equal items.filter(i => i.type === '${type}')`);
  }
}

// ── empty/missing actor.items handled without throwing (Test 3) ────────────

{
  assert.deepEqual(buildActorItemIndex({ items: [] }).byType.size, 0);
  assert.deepEqual(buildActorItemIndex({}).byType.size, 0);
  assert.deepEqual(buildActorItemIndex(null).byType.size, 0);
  assert.deepEqual(buildActorItemIndex(undefined).byType.size, 0);
}

// ── items with a missing/falsy type bucket under 'unknown' rather than throwing (Test 4) ──

{
  const untyped = { id: 'u1' };
  const actor = { items: [untyped] };
  const { byType } = buildActorItemIndex(actor);
  assert.deepEqual(byType.get('unknown'), [untyped]);
}

console.log('actor-item-index.test.mjs: all assertions passed');
