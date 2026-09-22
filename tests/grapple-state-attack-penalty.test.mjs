import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 8: Grabbed/Grappled attack-roll
// penalty (docs/audits/v2-math-integrity-authority-ledger.md, Grapple
// domain, "Certification-correction addendum 8").
//
// Round 7 correctly removed a bogus flat -5 Reflex Defense penalty from
// Grabbed/Grappled/Pinned, but its own replacement summary text for those
// states still DESCRIBED the real SWSE rule -- "-2 on attack rolls except
// natural/light weapons" -- without anything actually computing it. A
// ninth review correctly refused to certify "Grapple state numeric
// effects" while that description remained true in prose but false in
// code: a Grabbed/Grappled character attacking with a normal (non-natural,
// non-light) weapon rolled with no penalty at all.
//
// Fixed: GrappleStateEngine.getAttackPenalty(actor, weapon) computes the
// real -2 (or 0 when exempt), reusing this engine's own existing
// classifyGrappledAttack() -- the SAME classifier evaluateAction()'s
// 'grappled' attack-legality branch already uses for the identical
// unarmed/natural/light exemption categories -- rather than a second,
// independently-maintained heuristic. attacks.js#rollAttack() now includes
// this as a named, provenance-bearing entry
// ('grapple-state-penalty'/'Grabbed/Grappled') in the SAME canonical
// attack contribution ledger 'Fighting Defensively' already uses, so
// roll/chat-breakdown parity holds by construction (one ledger, one
// computation, not two).
//
// Pinned is deliberately excluded: a Pinned creature's attacks are already
// prevented by Pin's own action legality (GrappleStateEngine.evaluateAction()'s
// 'pinned' branch returns allowed:false), so a numeric penalty on an
// already-fully-blocked action would be meaningless double-gating.

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

const { GrappleStateEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js'
);

function grabbedEffect(sourceId = 'attacker-1') {
  return { flags: { swse: { grappleState: { state: 'grabbed', sourceId } } } };
}
function grappledEffect(sourceId = 'attacker-1') {
  return { flags: { swse: { grappleState: { state: 'grappled', sourceId } } } };
}
function pinnedEffect(sourceId = 'attacker-1') {
  return { flags: { swse: { grappleState: { state: 'pinned', sourceId } } } };
}

function actorWithEffects(effects) {
  return { id: 'defender', name: 'Defender', type: 'character', items: [], effects };
}

const normalWeaponKnownIllegal = { name: 'Blaster Rifle', system: { traits: ['Autofire'] } };
const normalWeaponUnknown = { name: 'Combat Knife', system: { traits: ['Accurate'] } };
const naturalWeapon = { name: 'Claw Attack', system: { traits: ['Natural'] } };
const lightWeapon = { name: 'Vibrodagger', system: { traits: ['Light'] } };
const unarmedWeapon = { name: 'Unarmed Strike', system: { isUnarmed: true } };

// ─── 1. No grapple state at all: never penalized, regardless of weapon ────

{
  const actor = actorWithEffects([]);
  assert.equal(GrappleStateEngine.getAttackPenalty(actor, normalWeaponKnownIllegal), 0, 'no grapple state + normal weapon must not be penalized');
  assert.equal(GrappleStateEngine.getAttackPenalty(actor, naturalWeapon), 0, 'no grapple state + natural weapon must not be penalized');
}

console.log('  [1/6] no grapple state: never penalized, for any weapon OK');

// ─── 2. Grabbed/Grappled + a normal (non-natural, non-light) weapon: -2 ───

{
  for (const state of ['grabbed', 'grappled']) {
    const effect = state === 'grabbed' ? grabbedEffect() : grappledEffect();
    const actor = actorWithEffects([effect]);
    assert.equal(GrappleStateEngine.getAttackPenalty(actor, normalWeaponKnownIllegal), -2, `${state} + a known non-light/natural weapon (Blaster Rifle) must apply -2`);
    assert.equal(GrappleStateEngine.getAttackPenalty(actor, normalWeaponUnknown), -2, `${state} + an unclassified weapon (Combat Knife) must default to -2, not silently exempt an unknown weapon`);
  }
}

console.log('  [2/6] Grabbed and Grappled apply -2 for a normal weapon, including the unclassified-weapon default OK');

// ─── 3. Grabbed/Grappled + natural or light weapon: exempt, no penalty ────

{
  for (const state of ['grabbed', 'grappled']) {
    const effect = state === 'grabbed' ? grabbedEffect() : grappledEffect();
    const actor = actorWithEffects([effect]);
    assert.equal(GrappleStateEngine.getAttackPenalty(actor, naturalWeapon), 0, `${state} + a natural weapon (claw) must be exempt from the penalty`);
    assert.equal(GrappleStateEngine.getAttackPenalty(actor, lightWeapon), 0, `${state} + a light weapon (Vibrodagger, traits:[Light]) must be exempt from the penalty`);
    assert.equal(GrappleStateEngine.getAttackPenalty(actor, unarmedWeapon), 0, `${state} + an unarmed strike must be exempt from the penalty`);
  }
}

console.log('  [3/6] Grabbed and Grappled exempt natural, light, and unarmed weapons from the penalty OK');

// ─── 4. Pinned: no numeric penalty -- Pin's own action legality blocks the
//        attack entirely instead, so a stacked numeric penalty would be
//        meaningless double-gating. ─────────────────────────────────────

{
  const actor = actorWithEffects([pinnedEffect()]);
  assert.equal(GrappleStateEngine.getAttackPenalty(actor, normalWeaponKnownIllegal), 0, 'Pinned must not carry a numeric attack penalty (prevented by Pin action legality instead)');
  // Confirm the legality gate really is what blocks it, so "0 penalty" for
  // Pinned isn't silently permissive.
  const legality = GrappleStateEngine.evaluateAction(actor, { id: 'attack', resolutionMode: 'attack' });
  assert.equal(legality.allowed, false, 'sanity: Pin action legality must actually block a normal attack action while Pinned');
}

console.log('  [4/6] Pinned carries no numeric attack penalty, because Pin action legality already blocks the attack entirely OK');

// ─── 5. Applies exactly once, even with multiple/stale grapple-state ──────
//        effects from different sources -- never -4.

{
  const actor = actorWithEffects([grabbedEffect('attacker-1'), grabbedEffect('attacker-2')]);
  assert.equal(GrappleStateEngine.getAttackPenalty(actor, normalWeaponKnownIllegal), -2, 'two simultaneous Grabbed effects from different sources must still only apply -2 once, never -4');
}

console.log('  [5/6] the penalty is presence-based, not effect-count-based: two simultaneous Grabbed effects still apply only -2 OK');

// ─── 6. Live end-to-end proof through the real attacks.js#rollAttack() ────
//        pipeline: the SAME canonical attack contribution ledger already
//        used for Fighting Defensively now carries a named, provenance-
//        bearing 'grapple-state-penalty' entry, and atkBonus reflects it.

{
  const { rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const { buildVirtualUnarmedWeapon } = await import('/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js');
  const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');

  const originalSafeRoll = RollEngine.safeRoll;
  RollEngine.safeRoll = async (formula) => ({ total: 15, formula, dice: [{ results: [{ result: 10 }] }] });

  function makeAttacker(name, effects = []) {
    return {
      id: name.toLowerCase(), name, type: 'character', items: [], effects,
      system: {
        level: 8, size: 'medium', skills: {}, progression: { classLevels: [] },
        attributes: {
          str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
          dex: { base: 12, racial: 0, enhancement: 0, temp: 0 }
        },
        derived: { bab: 7 },
        hp: { max: 50, value: 50 }
      },
      flags: { swse: {} },
      getRollData: () => ({})
    };
  }

  try {
    const baselineAttacker = makeAttacker('Baseline');
    const grabbedAttacker = makeAttacker('Grabbed', [grabbedEffect()]);

    const virtualWeapon = buildVirtualUnarmedWeapon(baselineAttacker, { name: 'Test Strike' });
    // Same mechanical weapon otherwise (damage formula, attackAttribute,
    // proficiency all unchanged, so the rest of the resolver pipeline is
    // unaffected) -- every field the canonical natural/unarmed authority
    // (scripts/items/weapon-branch-resolver.js) reads is overridden so it
    // sees a normal (non-natural, non-light, non-unarmed) weapon, isolating
    // exactly the variable under test. The virtual unarmed weapon template
    // also sets flags.swse.unarmed and system.isUnarmed, which the
    // canonical classifier reads directly (more thorough than the old
    // text-only classifier this test was originally written against) --
    // both must be cleared too, or this fixture is still an unarmed strike
    // wearing a Blaster Rifle's name.
    const normalNamedWeapon = {
      ...virtualWeapon,
      name: 'Blaster Rifle',
      flags: { swse: { ...virtualWeapon.flags?.swse, unarmed: false, virtual: false } },
      system: { ...virtualWeapon.system, weaponType: 'rifle', properties: ['military'], isUnarmed: false, naturalWeapon: false, isNaturalWeapon: false }
    };

    const baselineResult = await rollAttack(baselineAttacker, normalNamedWeapon, { suppressChat: true, targetContext: { mode: 'none' } });
    const grabbedResult = await rollAttack(grabbedAttacker, normalNamedWeapon, { suppressChat: true, targetContext: { mode: 'none' } });

    assert.equal(
      baselineResult.roll.swseAttackContext.attackBonus - grabbedResult.roll.swseAttackContext.attackBonus,
      2,
      'a Grabbed attacker using a normal weapon must roll exactly 2 lower than the same attacker unaffected by Grapple'
    );
    const grabbedLedgerEntry = grabbedResult.componentLedger.find(entry => entry.id === 'grapple-state-penalty');
    assert.ok(grabbedLedgerEntry, 'the canonical attack contribution ledger must carry a named grapple-state-penalty entry when the penalty applies');
    assert.equal(grabbedLedgerEntry.value, -2, 'the ledger entry value must be exactly -2');
    assert.equal(grabbedLedgerEntry.sourceName, 'Grabbed/Grappled', 'the ledger entry must be provenance-bearing (shows where the -2 came from)');

    const baselineLedgerEntry = baselineResult.componentLedger.find(entry => entry.id === 'grapple-state-penalty');
    assert.ok(!baselineLedgerEntry, 'an unaffected attacker must carry no grapple-state-penalty ledger entry at all (not a zero-value one)');

    // Exempt weapon while Grabbed: no penalty, no ledger entry, roll parity
    // with baseline.
    const grabbedUnarmedResult = await rollAttack(grabbedAttacker, virtualWeapon, { suppressChat: true, targetContext: { mode: 'none' } });
    const baselineUnarmedResult = await rollAttack(baselineAttacker, virtualWeapon, { suppressChat: true, targetContext: { mode: 'none' } });
    assert.equal(
      grabbedUnarmedResult.roll.swseAttackContext.attackBonus,
      baselineUnarmedResult.roll.swseAttackContext.attackBonus,
      'a Grabbed attacker using an exempt (unarmed) weapon must roll identically to an unaffected attacker'
    );
    assert.ok(!grabbedUnarmedResult.componentLedger.find(entry => entry.id === 'grapple-state-penalty'), 'an exempt weapon must carry no grapple-state-penalty ledger entry even while Grabbed');
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
  }
}

console.log('  [6/6] live end-to-end: attacks.js#rollAttack() applies the real -2 through the canonical ledger, with roll/chat-breakdown parity by construction OK');

console.log('grapple-state-attack-penalty.test.mjs: all assertions passed');
