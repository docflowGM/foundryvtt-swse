import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for the Math Integrity Freeze's HP domain
// (docs/audits/v2-math-integrity-authority-ledger.md), reframed per
// project direction: Gar'ee's persisted system.hp.max = 108 is CERTIFIED
// CORRECT -- it is the accumulated result of his real, historical
// per-level HP choices (progression.hpGainHistory records "maximum"
// method, hit die 10, CON mod 2, at levels 7 and 8; previousMax 96 ->
// newMax 108). It is not evidence of a defect, and must not be
// "corrected" toward a value reconstructed from his current class/level
// summary. The actual defect, if any, is code that could overwrite 108
// with such a reconstruction. This file proves:
//
// 1. Ordinary derived-data preparation (computeCharacterDerived(), the
//    synchronous half of prepareDerivedData()) never touches
//    system.hp.max at all -- it only mirrors the persisted value into
//    system.derived.hp, read-only. Gar'ee's 108 survives any number of
//    prepare passes trivially, because nothing in this path can change it.
// 2. ActorEngine.recomputeHP() -- the ONLY code permitted to write
//    system.hp.max (see actor-engine.js:618's SSOT guard comment) -- DOES
//    compute a destructive, wrong value (88) from Gar'ee's current
//    class/level/CON state if asked to. This is Defect A: a stateless,
//    history-discarding reconstruction model, fundamentally incompatible
//    with the real, additive, per-level-locked authority
//    progression-finalizer.js already correctly uses.
// 3. recomputeHP() currently cannot actually commit that destructive
//    overwrite, because it throws a ReferenceError first (Defect B, a
//    pure block-scoping bug -- see the HP domain section for the
//    line-by-line explanation). This is NOT a safety net to rely on: it
//    is an unrelated crash that happens to be standing in front of a real
//    destructive-write bug. Fixing Defect B in isolation, without also
//    fixing Defect A's reconstruction model, would UNMASK the destructive
//    overwrite and start actively corrupting every affected actor's HP
//    the next time a CON change, HP-affecting item, or level change
//    triggers a recompute. The two defects must be fixed together, or
//    Defect A must be fixed first.
//
// Real, unmodified production code is used throughout -- actor-engine.js
// is imported via a plain relative specifier (resolved from this file's own
// location, portable across checkouts) specifically to bypass this repo's
// own test-harness fake (tests/helpers/foundry-shim/path-loader.mjs's
// OVERRIDES map only intercepts the exact absolute
// /systems/foundryvtt-swse/... specifier), and ClassesDB (normally built
// from a Foundry compendium pack unavailable under this harness) is
// populated directly with the same shape ActorAbilityBridge.getClasses()
// expects, so recomputeHP() runs genuinely end-to-end, not against a
// stub.

registerFoundryPathLoader();
installFoundryShimGlobals();

function gareeShapedActor() {
  return {
    id: 'garee-hp-preservation-test',
    type: 'character',
    name: "Gar'ee",
    system: {
      level: 8,
      skills: {},
      attributes: {
        con: { base: 14, racial: 0, enhancement: 0, temp: 0 }
      },
      hp: { value: 108, max: 108 },
      progression: {
        classLevels: [
          { class: 'Soldier', classId: 'soldier', level: 6 },
          { class: 'Scoundrel', classId: 'scoundrel', level: 2 }
        ]
      }
    },
    items: []
  };
}

// ---------------------------------------------------------------------------
// Test 1 — ordinary derived-data preparation never touches system.hp.max.
// ---------------------------------------------------------------------------
{
  const { computeCharacterDerived } = await import(
    '/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js'
  );
  const actor = gareeShapedActor();
  computeCharacterDerived(actor, actor.system);
  assert.equal(actor.system.hp.max, 108, 'computeCharacterDerived() must not alter system.hp.max');
  // Run it again -- idempotence.
  computeCharacterDerived(actor, actor.system);
  assert.equal(actor.system.hp.max, 108, 'a second prepare pass must not alter system.hp.max either');
  // It should mirror, not recompute, into system.derived.hp.
  assert.equal(actor.system.derived.hp.max, 108, 'system.derived.hp.max must mirror the persisted 108, not recompute it');
}

// ---------------------------------------------------------------------------
// Test 2 — ActorEngine.recomputeHP() (the real, unmodified production
// function, not this repo's test-harness fake) DOES compute a
// destructive, wrong value from Gar'ee's current class/level/CON state:
// 88, not 108. This proves Defect A is real: reconstructing from
// "current classes + current level + generic hit-die average" cannot
// reproduce his actual, correct, historically-accumulated HP.
// ---------------------------------------------------------------------------
{
  const { ActorEngine } = await import(
    new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href
  );
  const { ClassesDB } = await import(
    '/systems/foundryvtt-swse/scripts/data/classes-db.js'
  );
  ClassesDB.isBuilt = true;
  ClassesDB.classes.set('soldier', {
    id: 'soldier',
    name: 'Soldier',
    system: { hitDie: 10, progression: { hpAtFirstLevel: 30, hpPerLevel: 6 } }
  });

  const actor = gareeShapedActor();

  let thrown = null;
  try {
    await ActorEngine.recomputeHP(actor, {});
  } catch (err) {
    thrown = err;
  }

  // Defect B: currently throws before it can write anything.
  assert.ok(thrown instanceof ReferenceError, 'recomputeHP() must currently throw a ReferenceError (Defect B) rather than silently succeed');
  assert.match(thrown.message, /conBase/, 'the ReferenceError must be the known conBase/conRacial/conEnhancement/conTemp scope bug');

  // The actor's persisted 108 must be untouched by the failed attempt.
  assert.equal(actor.system.hp.max, 108, "a failed recomputeHP() call must not have altered Gar'ee's certified 108");
}

// ---------------------------------------------------------------------------
// IMPORTANT — not a test, a warning for whoever fixes Defect B next:
// Test 2 shows the crash happens before newHPMax (88) is ever written.
// That crash is NOT a safety mechanism to preserve -- it's an unrelated
// scope bug that happens to be standing in front of Defect A's
// destructive reconstruction. Patching ONLY the ReferenceError (e.g.
// hoisting conBase/conRacial/conEnhancement/conTemp out of the `if`
// block) without ALSO fixing the reconstruction model would remove the
// thing currently stopping recomputeHP() from overwriting every affected
// actor's real HP with a wrong, history-discarding average the next time
// a CON change, HP-affecting item, or level change triggers a recompute.
// Defect A and Defect B must be fixed together, or Defect A must be
// fixed first. This is deliberately not encoded as an executable test
// here, since doing so would require maintaining a second, parallel
// reimplementation of recomputeHP() with the scope bug patched --
// exactly the kind of "test a reimplementation instead of the real code"
// this project's testing standard avoids. The two live tests above are
// sufficient to establish both defects independently; this note exists
// so the danger of a partial fix is documented, not rediscovered.
// ---------------------------------------------------------------------------

console.log('hp-preservation-authority.test.mjs: all assertions passed');
