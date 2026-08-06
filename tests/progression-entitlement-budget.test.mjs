import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Force-choice entitlement budgets.
//
// The resolvers return `{ total, selected, remaining }` where
// `remaining = total - alreadySelected` and `alreadySelected` is the pending
// DRAFT count. Force Secret, Force Technique and Medical Secret each stored
// `entitlements.remaining` and then subtracted the selected count AGAIN at every
// use site:
//
//   total 2, one drafted pick
//     -> resolver remaining = 1
//     -> step: selected (1) >= budget (1) -> "complete"
//     -> the second legal pick was blocked
//
// The budget is now the total, and remaining is derived. These tests pin the
// arithmetic at each boundary of the entitlement.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const STEPS = [
  { file: 'scripts/apps/progression-framework/steps/force-secret-step.js', label: 'Force Secret' },
  { file: 'scripts/apps/progression-framework/steps/force-technique-step.js', label: 'Force Technique' },
  { file: 'scripts/apps/progression-framework/steps/medical-secret-step.js', label: 'Medical Secret' },
];

/* ------------------------------------------------------------------ *
 * 1. The budget is the total, and the pre-reduced value is not stored.
 * ------------------------------------------------------------------ */
{
  for (const { file, label } of STEPS) {
    const src = read(file);
    assert.match(
      src,
      /this\._selectionBudget = Number\(entitlements\.total \?\? 0\);/,
      `${label} does not store the total entitlement as its budget`
    );
    assert.ok(
      !/_selectionBudget = entitlements\.remaining/.test(src),
      `${label} stores the already-reduced remaining count as its budget`
    );
    assert.ok(
      !/this\._remainingPicks/.test(src),
      `${label} still carries the ambiguous _remainingPicks field`
    );
  }

  // The resolver's own contract, which is what made the double subtraction wrong.
  const resolver = read('scripts/engine/progression/utils/force-suite-resolution.js');
  assert.match(resolver, /const remaining = Math\.max\(0, totalEntitlements - alreadySelected\)/);
  assert.match(resolver, /alreadySelected = pendingCount;/,
    'the resolver no longer subtracts the pending draft count, so this model may need revisiting');
}

/* ------------------------------------------------------------------ *
 * 2. The budget arithmetic itself, at every boundary.
 *
 * Behavioural over the exact expressions the steps now use.
 * ------------------------------------------------------------------ */
{
  const model = (budget, selected) => ({
    canAddMore: selected < budget,
    isComplete: selected >= budget,
    remaining: Math.max(0, budget - selected),
  });

  // total 1, nothing chosen: one pick available, not complete.
  assert.deepEqual(model(1, 0), { canAddMore: true, isComplete: false, remaining: 1 });

  // total 1, one chosen: complete.
  assert.deepEqual(model(1, 1), { canAddMore: false, isComplete: true, remaining: 0 });

  // total 2, nothing chosen.
  assert.deepEqual(model(2, 0), { canAddMore: true, isComplete: false, remaining: 2 });

  // total 2 with ONE hydrated draft pick — the case the old code broke. The
  // second pick must still be available.
  assert.deepEqual(model(2, 1), { canAddMore: true, isComplete: false, remaining: 1 });

  // total 2, both chosen.
  assert.deepEqual(model(2, 2), { canAddMore: false, isComplete: true, remaining: 0 });

  // No entitlement: nothing can be chosen, and the step is trivially complete.
  assert.deepEqual(model(0, 0), { canAddMore: false, isComplete: true, remaining: 0 });

  // The old (defective) model, for contrast: storing `remaining` as the budget
  // reproduces exactly the blocked second pick.
  const defective = (total, selected) => model(Math.max(0, total - selected), selected);
  assert.equal(defective(2, 1).canAddMore, false,
    'the defective model no longer reproduces the blocked second pick; the test is stale');
  assert.equal(defective(2, 1).isComplete, true);
}

/* ------------------------------------------------------------------ *
 * 3. Every use site compares against the budget, not a pre-reduced value,
 *    and the view-facing remaining count is derived.
 * ------------------------------------------------------------------ */
{
  for (const { file, label } of STEPS) {
    const src = read(file);

    // remainingPicks handed to templates/footer must be derived.
    const exposed = [...src.matchAll(/remainingPicks: (.+)$/gm)].map(m => m[1].trim());
    assert.ok(exposed.length > 0, `${label} no longer exposes remainingPicks`);
    for (const expr of exposed) {
      assert.match(
        expr,
        /Math\.max\(0, this\._selectionBudget -/,
        `${label} exposes a raw budget as remainingPicks: ${expr}`
      );
    }

    // Completion compares the selected count against the budget.
    assert.match(src, /isComplete: [^\n]*>= this\._selectionBudget/, `${label} completion check is missing`);
  }

  // The footer reads the total, so its own subtraction is not a third one.
  const footer = read('scripts/apps/progression-framework/shell/footer-explanation.js');
  assert.match(
    footer,
    /plugin\?\._selectionBudget \?\? plugin\?\._remainingPicks/,
    'the footer no longer prefers the total budget, so it double-subtracts again'
  );
}

/* ------------------------------------------------------------------ *
 * 4. Actor-historical choices must not consume the current entitlement.
 * ------------------------------------------------------------------ */
{
  const resolver = read('scripts/engine/progression/utils/force-suite-resolution.js');
  assert.match(
    resolver,
    /actor historical choices should block duplicates[\s\S]{0,160}consume the current level's entitlement/,
    'the historical-vs-current entitlement rule is no longer documented at the resolver'
  );
  // For the two resolvers carrying that comment, alreadySelected is the pending
  // draft count only. A third resolver deliberately falls back to the actor
  // count outside level-up, which is existing intended behaviour and untouched.
  const assignments = [...resolver.matchAll(/alreadySelected = ([^\n;]+);/g)].map(m => m[1].trim());
  assert.ok(assignments.length >= 3, `expected three resolvers, found ${assignments.length}`);
  const pendingOnly = assignments.filter(v => v === 'pendingCount');
  assert.equal(
    pendingOnly.length,
    2,
    `expected exactly two pending-only resolvers, found: ${JSON.stringify(assignments)}`
  );
  const conditional = assignments.filter(v => /isLevelUpLike/.test(v));
  assert.equal(conditional.length, 1,
    'the level-up-aware resolver changed shape; re-check whether it now double-counts');
}

console.log('progression-entitlement-budget: all assertions passed');
