import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Phase 3 fix (combat display parity): getTargetReflex()/getTargetDefense()
// in scripts/combat/rolls/attacks.js used to read legacy
// `actor.system.defenses.<type>.total` (stored/legacy configuration — may
// retain a stale value from a previous sheet version or an incomplete
// import/migration) BEFORE the canonical `actor.system.derived.defenses.
// <type>.total`. A stale legacy total could therefore silently win over a
// valid, current derived total when resolving a target's defense during an
// attack roll. This suite proves the derived total is now checked first,
// with the legacy field only as a compatibility fallback.
//
// scripts/combat/rolls/attacks.js pulls in heavy Foundry-only runtime
// dependencies (SWSEChat, RollEngine, AttackRollDiagnostics, ...) that
// cannot be constructed under the Node test harness — matching the existing
// convention in tests/attack-outcome-wiring.test.mjs, this is a source-text
// assertion rather than a live import/execution of the module.

const attacksSource = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');

function extractFunctionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `expected to find function ${name}() in attacks.js`);
  // Grab a generous window after the declaration — both target-defense
  // functions are short — rather than a full brace-matching parser.
  return source.slice(start, start + 600);
}

// getTargetReflex(): derived total must be read before the legacy field.
{
  const body = extractFunctionBody(attacksSource, 'getTargetReflex');
  const derivedIndex = body.indexOf('actor.system?.derived?.defenses?.reflex?.total');
  const legacyIndex = body.indexOf('actor.system?.defenses?.reflex?.total');
  assert.ok(derivedIndex >= 0, 'getTargetReflex must read the canonical derived total');
  assert.ok(legacyIndex >= 0, 'getTargetReflex must still fall back to the legacy field for compatibility');
  assert.ok(derivedIndex < legacyIndex, 'derived.defenses.reflex.total must be checked before legacy defenses.reflex.total (?? short-circuits left-to-right)');
}

// getTargetDefense(): same authority order for the generic fortitude/will branch.
{
  const body = extractFunctionBody(attacksSource, 'getTargetDefense');
  const derivedIndex = body.indexOf('actor.system?.derived?.defenses?.[key]?.total');
  const legacyIndex = body.indexOf('actor.system?.defenses?.[key]?.total');
  assert.ok(derivedIndex >= 0, 'getTargetDefense must read the canonical derived total');
  assert.ok(legacyIndex >= 0, 'getTargetDefense must still fall back to the legacy field for compatibility');
  assert.ok(derivedIndex < legacyIndex, 'derived.defenses.[key].total must be checked before legacy defenses.[key].total');
}

// Simulate both orderings directly (same ?? short-circuit semantics attacks.js
// uses) to make the regression concrete: a stale legacy total must not win
// over a valid derived total.
{
  function getTargetReflexFixed(actor) {
    const value = actor.system?.derived?.defenses?.reflex?.total
      ?? actor.system?.defenses?.reflex?.total
      ?? actor.system?.defenses?.reflex?.value
      ?? null;
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  const staleTarget = {
    system: {
      defenses: { reflex: { total: 12 } }, // stale legacy total from an old sheet/import
      derived: { defenses: { reflex: { total: 19 } } } // current canonical total
    }
  };
  assert.equal(getTargetReflexFixed(staleTarget), 19, 'a stale stored defense total must not override a valid derived total');

  const legacyOnlyTarget = { system: { defenses: { reflex: { total: 12 } } } };
  assert.equal(getTargetReflexFixed(legacyOnlyTarget), 12, 'legacy field must still work as a fallback for actors with incomplete/no derived data');
}

console.log('target-defense-authority.test.mjs OK');
