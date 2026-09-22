import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 6: Grab/Grapple defense-channel
// correctness (docs/audits/v2-math-integrity-authority-ledger.md).
//
// A sixth review found that SWSEGrappling.attemptGrab() (the Grab-vs-
// Reflex-Defense attack that starts every grapple) computed the target's
// Reflex Defense with:
//
//   Number(target.system?.defenses?.reflex?.total
//       ?? target.system?.defenses?.reflex ?? 10)
//
// system.defenses.reflex is a field the V2 character pipeline never
// populates at all (DerivedCalculator writes only to
// system.derived.defenses.reflex) -- so for an ordinary V2 PC, this
// silently collapsed to the hardcoded fallback of 10, regardless of the
// character's real, possibly much higher, Reflex Defense. A PC with
// Reflex 29 could have their Grab defense evaluated against 10 instead --
// exactly the kind of authority-bypass this whole freeze exists to catch.
//
// Separately, this was a duplicate hit computation: SWSERoll.rollAttack()
// (the canonical attack-vs-target-defense authority, "the single authority
// for hit/critical/natural-1/natural-20 interpretation" per
// AttackOutcomeResolver's own header) already returns `isHit` and
// `targetReflex` on its result, computed via the SAME canonical
// system.derived.defenses.reflex.total path (attacks.js#getTargetReflex()).
// attemptGrab() discarded both and recomputed hit/miss itself with the
// broken Reflex read above.
//
// Fixed: attemptGrab() no longer recomputes hit/miss. The Grab/Grapple-
// specific Reflex resistance bonus (Grapple Resistance/Grab Back's
// reflexBonus channel -- see grab-grapple-resistance-channel-split.test.mjs)
// is passed INTO SWSERoll.rollAttack() via a new, minimal, purely additive
// targetContext.defenseAdjustment option (attacks.js#resolveTargetContext(),
// defaults to 0 for every existing caller that doesn't pass it) so the
// canonical resolver computes hit ONCE, against the correct base defense
// plus the contextual bonus. attemptGrab() then just reads
// attackResult.isHit and attackResult.targetReflex.
//
// This test exercises the REAL production pipeline end-to-end
// (attemptGrab -> SWSERoll.rollAttack -> attacks.js#rollAttack ->
// AttackOutcomeResolver), not a reimplementation. Only two purely
// structural/side-effect stubs are needed beyond the standard shim: a
// chat-message-rendering no-op (SWSEChat.postRoll -- Foundry's Handlebars
// template renderer and Roll#toJSON aren't available under this harness
// and are irrelevant to defense-value/hit-determination correctness) and
// a random-ID generator stub (foundry.utils.randomID, used only for
// roll-history bookkeeping).

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.foundry.applications.handlebars = globalThis.foundry.applications.handlebars ?? { renderTemplate: async () => '' };
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID = globalThis.foundry.utils.randomID ?? (() => `stub-id-${Math.random().toString(36).slice(2)}`);
globalThis.window = globalThis.window ?? globalThis;
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };

const { SWSEGrappling } = await import(
  '/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js'
);
const { RollEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll-engine.js'
);
const { SWSEChat } = await import(
  '/systems/foundryvtt-swse/scripts/chat/swse-chat.js'
);

// Chat-message rendering is a side effect this harness can't produce (no
// real Foundry Roll document, no Handlebars renderer) and is irrelevant to
// the defense-value/hit-determination logic under test; stub only this.
const originalPostRoll = SWSEChat.postRoll;
SWSEChat.postRoll = async () => ({ id: 'stub-message' });

function makeActor(name, { str = 14, dex = 10, derivedReflex } = {}) {
  const system = {
    level: 8,
    size: 'medium',
    skills: {},
    progression: { classLevels: [] },
    attributes: {
      str: { base: str, racial: 0, enhancement: 0, temp: 0 },
      dex: { base: dex, racial: 0, enhancement: 0, temp: 0 }
    },
    derived: { bab: 7 },
    hp: { max: 50, value: 50 }
  };
  if (derivedReflex !== undefined) {
    system.derived.defenses = { reflex: { total: derivedReflex } };
  }
  return {
    id: name.toLowerCase(), name, type: 'character', items: [],
    system,
    flags: { swse: {} },
    getRollData: () => ({})
  };
}

function grappleResistanceFeat() {
  return { type: 'feat', name: 'Grapple Resistance', system: { disabled: false, abilityMeta: { grappleRules: [
    { type: 'GRAB_GRAPPLE_RESISTANCE', reflexBonus: 5, opposedGrappleBonus: 5, source: 'Grapple Resistance' }
  ] } } };
}

function grabBackFeat() {
  return { type: 'feat', name: 'Grab Back', system: { disabled: false, abilityMeta: { grappleRules: [
    { type: 'GRAB_GRAPPLE_RESISTANCE', reflexBonus: 2, opposedGrappleBonus: 0, source: 'Grab Back' }
  ] } } };
}

async function attemptGrabWithRoll(target, total, d20 = 15) {
  const attacker = makeActor('Attacker');
  const originalSafeRoll = RollEngine.safeRoll;
  RollEngine.safeRoll = async () => ({ total, dice: [{ results: [{ result: d20 }] }] });
  try {
    return await SWSEGrappling.attemptGrab(attacker, target, { skipLegalityConfirm: true });
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
  }
}

// ─── Required golden cases ──────────────────────────────────────────────

const cases = [
  { label: 'ordinary target, nontrivial derived Reflex (29)', derivedReflex: 29, dex: 20, items: [], expectedBaseReflex: 29, expectedResistance: 0 },
  { label: 'Grab Back target', derivedReflex: 29, dex: 20, items: [grabBackFeat()], expectedBaseReflex: 29, expectedResistance: 2 },
  { label: 'Grapple Resistance target', derivedReflex: 29, dex: 20, items: [grappleResistanceFeat()], expectedBaseReflex: 29, expectedResistance: 5 },
  { label: 'both feats together', derivedReflex: 29, dex: 20, items: [grabBackFeat(), grappleResistanceFeat()], expectedBaseReflex: 29, expectedResistance: 7 },
  { label: 'derived Reflex exactly 0 (edge value, must not fall back to a nonzero default)', derivedReflex: 0, dex: 10, items: [], expectedBaseReflex: 0, expectedResistance: 0 },
  { label: 'derived Reflex exactly 10 (must be read as real 10, not the old coincidental hardcoded fallback)', derivedReflex: 10, dex: 10, items: [], expectedBaseReflex: 10, expectedResistance: 0 }
];

for (const { label, derivedReflex, dex, items, expectedBaseReflex, expectedResistance } of cases) {
  const target = makeActor('Target', { dex, derivedReflex });
  target.items = items;

  const expectedReflex = expectedBaseReflex + expectedResistance;

  const missResult = await attemptGrabWithRoll(target, expectedReflex - 1);
  assert.equal(missResult.baseReflex, expectedBaseReflex, `[${label}] baseReflex must equal the canonical system.derived.defenses.reflex.total`);
  assert.equal(missResult.grappleResistance, expectedResistance, `[${label}] grappleResistance must equal only the Reflex-channel contribution`);
  assert.equal(missResult.reflex, expectedReflex, `[${label}] total defended Reflex must be base + resistance`);
  assert.equal(missResult.hit, false, `[${label}] a total one below the true (adjusted) Reflex must miss`);

  const hitResult = await attemptGrabWithRoll(target, expectedReflex);
  assert.equal(hitResult.hit, true, `[${label}] a total exactly meeting the true (adjusted) Reflex must hit (meet-or-beat)`);
}

console.log(`  [1/2] attemptGrab() reads the canonical system.derived.defenses.reflex.total (never the old hardcoded 10) across ${cases.length} cases, with hit/miss resolved at the exact correct threshold OK`);

// ─── No duplicate hit computation, and no independent fallback chain of
//     attemptGrab()'s own: a target whose system.defenses object exists but
//     is genuinely empty/half-initialized (a real shape some legacy/partial
//     actors can have) must still fall through correctly to the canonical
//     derived Reflex, via the SAME shared resolver attemptGrab() now
//     delegates to -- not attemptGrab() re-deriving its own fallback order.
//     (Note: attacks.js#getTargetReflex(), the canonical resolver every
//     weapon attack in the game already uses, checks system.defenses.reflex.total
//     before system.derived.defenses.reflex.total -- a pre-existing
//     priority order that predates this fix, is shared by every attack in
//     the game, not Grapple-specific, and is out of scope for this pass.
//     A genuinely-populated system.defenses.reflex.total on an actor is
//     therefore honored by design, same as any other attack; this test
//     covers the actually-broken case this round fixes -- an EMPTY/absent
//     system.defenses, which is what every real V2 PC actor has, per
//     DerivedCalculator never writing to that path at all.) ───────────────

{
  const target = makeActor('PartialTarget', { dex: 20, derivedReflex: 29 });
  target.system.defenses = {}; // present, but no .reflex -- a genuinely half-initialized shape
  const shouldFallThroughToDerived = await attemptGrabWithRoll(target, 29);
  assert.equal(shouldFallThroughToDerived.baseReflex, 29, 'an empty (not absent) system.defenses object must still fall through to the canonical derived Reflex, via the shared resolver, not a second independent chain in attemptGrab() itself');
  assert.equal(shouldFallThroughToDerived.hit, true, 'meet-or-beat against the correctly-resolved derived Reflex must hit');
}

console.log('  [2/2] a half-initialized system.defenses object correctly falls through to the canonical derived Reflex via the shared resolver OK');

SWSEChat.postRoll = originalPostRoll;

console.log('attempt-grab-reflex-defense-authority.test.mjs: all assertions passed');
