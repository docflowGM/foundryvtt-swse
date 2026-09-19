import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 4: Grapple static-modifier
// composition (docs/audits/v2-math-integrity-authority-ledger.md).
//
// Round 3 certified the core Grapple formula (BAB + higher of STR/DEX +
// size + species) and its size-modifier table against the published rule.
// A fourth review found that permanent, always-on Grapple bonuses -- most
// concretely the "Enslaved" background's "Grapple Survivor" (+2 competence)
// -- never reached the canonical total at all:
//
//   1. The background pipeline authored the same +2 grant TWICE for one
//      background (data/backgrounds.json's `mechanicalEffect` and
//      `specialAbilities[0]` both describe it) -- BackgroundGrantLedgerBuilder
//      ._mergeBonuses() faithfully turned that into two separate ledger
//      entries.
//   2. ModifierEngine._getBackgroundModifiers()'s flat-bonus loop required
//      every record to have `applicableSkills` (a skill-bonus-only shape);
//      a generic `{value, target: 'grapple'}` record always failed that
//      guard and was silently dropped. So the bonus was authored, merged,
//      and materialized onto the actor -- then thrown away at the very
//      last step, regardless of the duplication in (1).
//
// Fixed at three points:
//   - BackgroundGrantLedgerBuilder._mergeBonuses(): semantic-identity dedup
//     (same background + same target + same value) collapses the
//     duplicate representation into one ledger entry.
//   - ModifierEngine._getBackgroundModifiers(): now creates a modifier for
//     a generic target-shaped record too, with its own defensive dedup (by
//     background + target + value, ignoring metadata completeness) so an
//     actor whose flags were already materialized with a stale duplicate
//     (persisted before the ledger-builder fix existed) is still protected
//     -- this is the specific trap the review warned about: fixing the
//     consumer alone, without protecting it from already-corrupted
//     persisted state, could turn a missing +2 into an incorrect +4.
//   - DerivedCalculator's grapple block: layers the resulting static
//     modifier total (system.derived.modifiers.breakdown.grapple, built
//     from the same modifierMap every other domain already uses) on top of
//     computeGrappleBonus()'s core result, exactly once, storing an
//     explicit {core, staticModifiers, total} breakdown
//     (system.derived.grappleBonusParts) other consumers can decompose
//     from instead of rediscovering.
//
// Because every live consumer (PanelContextBuilder's sheet box,
// SWSEGrappling._rollGrappleBonus(), the roll formula, the tooltip) already
// reads system.derived.grappleBonus first (round 2/3's SSOT), this static
// modifier reaches all of them automatically with no changes to those
// files -- proven below.
//
// Also required by this round: an explicit static/contextual audit.
// Expert Grappler's +2 competence bonus (packs/talents.db) is authored as
// a GRAPPLE_BONUS rule with `mode: 'attackGrapple'` and
// `staticSheetPolicy: 'manual_only'` -- genuinely mode-gated, not a
// permanent trait, and correctly excluded from the static total (it's
// applied only at roll time). Same for Grapple Resistance
// (RESIST_GRAB_AND_GRAPPLE, modes: ['resistGrab','resistGrapple']).
// Neither may ever double-apply: a source eligible for the static total
// must never also fire contextually, and vice versa.
//
// ROUND 5 (post-review): the round-4 design above had one remaining
// defect. `_rollGrappleBonus()` added the contextual total as a bare
// NUMBER on top of the already-collapsed static total
// (system.derived.grappleBonus) -- which discarded each contribution's
// bonus `type` before the two sides ever met, so a contextual bonus of
// the SAME stacking type as a static one could add on top of it instead
// of being capped by this codebase's own stacking rule
// (ModifierUtils.STACKING_RULES.competence === 'highestOnly'). Concretely:
// Enslaved's static +2 competence plus Expert Grappler's contextual +2
// competence produced +4 in an actual attackGrapple roll, when RAW (and
// this codebase's own modifier engine, if consulted) says only the higher
// of two same-type bonuses applies -- +2, not +4. Fixed: contextual
// GRAPPLE_BONUS/RESIST_GRAB_AND_GRAPPLE rules are now collected as
// modifier OBJECTS (collectContextualGrappleModifiers() in
// grappling-system.js), not pre-summed numbers, and unioned with the
// actor's already-resolved static modifiers
// (system.derived.modifiers.breakdown.grapple.applied) through the SAME
// shared stacking authority (ModifierUtils.resolveStacking()) everything
// else in the codebase uses -- never a hand-coded competence/dodge/
// circumstance rule inside the Grapple system itself. The core term
// (BAB + higher of STR/DEX + size + species, which never stacks against
// anything) is read separately from system.derived.grappleBonusParts.core
// so it isn't part of the stacking-resolved set.

registerFoundryPathLoader();
installFoundryShimGlobals({
  game: {
    settings: {
      get: (ns, key) => (key === 'grappleEnabled' ? true : (key === 'grappleDCBonus' ? 0 : undefined)),
      set: () => {},
      settings: { has: () => true }
    }
  }
});
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.window = globalThis.window ?? globalThis;

const { DerivedCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js'
);
const { SWSEGrappling } = await import(
  '/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js'
);
const { PanelContextBuilder } = await import(
  '/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js'
);
const { CombatStatsTooltip } = await import(
  '/systems/foundryvtt-swse/scripts/ui/combat-stats-tooltip.js'
);
const { GrappleMechanics } = await import(
  '/systems/foundryvtt-swse/scripts/houserules/houserule-grapple.js'
);
const { RollEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll-engine.js'
);
const { hydrateBackgroundEvent } = await import(
  '/systems/foundryvtt-swse/scripts/data/background-events.js'
);
const { BackgroundGrantLedgerBuilder } = await import(
  '/systems/foundryvtt-swse/scripts/engine/progression/backgrounds/background-grant-ledger-builder.js'
);
const { applyCanonicalBackgroundsToActor } = await import(
  '/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-backgrounds-to-actor.js'
);
const { ModifierEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js'
);

const ENSLAVED_BONUS_FLAT = Object.freeze({
  backgroundId: 'enslaved',
  backgroundName: 'Enslaved',
  abilityId: 'enslaved-grapple-bonus',
  value: 2,
  bonusType: 'competence',
  target: 'grapple',
  description: 'Gain a +2 competence bonus on Grapple checks.'
});

function actorFor({ str, dex, size = 'medium', speciesGrapple = 0, backgroundFlat = [], items = [] } = {}) {
  return {
    id: 'a-static-composition',
    name: 'Grapple Static Composition Test',
    type: 'character',
    items,
    system: {
      level: 8,
      size,
      skills: {},
      progression: { classLevels: [] },
      attributes: {
        str: { base: str, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: dex, racial: 0, enhancement: 0, temp: 0 }
      },
      speciesCombatBonuses: speciesGrapple ? { grapple: speciesGrapple } : undefined,
      hp: { max: 50, value: 50 }
    },
    flags: backgroundFlat.length ? { swse: { backgroundBonuses: { flat: backgroundFlat } } } : { swse: {} }
  };
}

function expertGrapplerTalent(bonus = 2, bonusType = 'competence') {
  return {
    type: 'talent',
    name: 'Expert Grappler',
    system: {
      disabled: false,
      abilityMeta: {
        grappleRules: [
          { type: 'GRAPPLE_BONUS', mode: 'attackGrapple', bonus, bonusType, source: 'Expert Grappler' }
        ]
      }
    }
  };
}

// Post-prepare actor state: everything DerivedCalculator.computeAll()
// would have written for this actor's grapple domain, so
// SWSEGrappling._rollGrappleBonus() sees the same shape it would in real
// play (core term, canonical total, AND the resolved static-modifier
// ledger it now unions with contextual contributions).
function liveActorFrom(actorSpec, updates) {
  const live = actorFor(actorSpec);
  live.system.derived = {
    bab: updates['system.derived.bab'] ?? 0,
    grappleBonus: updates['system.derived.grappleBonus'],
    grappleBonusParts: updates['system.derived.grappleBonusParts'],
    modifiers: updates['system.derived.modifiers']
  };
  return live;
}

function grappleResistanceFeat() {
  return {
    type: 'feat',
    name: 'Grapple Resistance',
    system: {
      disabled: false,
      abilityMeta: {
        grappleRules: [
          { type: 'RESIST_GRAB_AND_GRAPPLE', bonus: 5, source: 'Grapple Resistance' }
        ]
      }
    }
  };
}

async function rollFormulaBonus(grappler) {
  let capturedFormula = null;
  const originalSafeRoll = RollEngine.safeRoll;
  RollEngine.safeRoll = async (formula) => {
    capturedFormula = formula;
    return { total: 15 };
  };
  try {
    await GrappleMechanics.performGrappleCheck(grappler, { system: {} });
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
  }
  const match = /^1d20 \+ (-?\d+)$/.exec(capturedFormula ?? '');
  return match ? Number(match[1]) : null;
}

// ─── Golden cases: static total invariant ──────────────────────────────────
// For each case: derived Grapple === sheet box === tooltip row sum ===
// SWSEGrappling's neutral-mode opposed-check base === the grapple roll
// formula's static base.

const staticCases = [
  { label: 'ordinary Medium actor, no static modifiers', str: 14, dex: 20, size: 'medium' },
  { label: 'Enslaved background (+2 exactly once)', str: 14, dex: 20, size: 'medium', backgroundFlat: [ENSLAVED_BONUS_FLAT] },
  { label: 'species Grapple bonus', str: 14, dex: 10, size: 'medium', speciesGrapple: 4 },
  { label: 'static background + species together', str: 14, dex: 20, size: 'medium', speciesGrapple: 3, backgroundFlat: [ENSLAVED_BONUS_FLAT] },
  { label: 'Large size, no static modifiers', str: 14, dex: 10, size: 'large' },
  {
    label: 'duplicate representation of the same background source (pre-dedup-fix shape) collapses to +2, not +4',
    str: 14, dex: 20, size: 'medium',
    backgroundFlat: [
      { backgroundId: 'enslaved', backgroundName: 'Enslaved', value: 2, target: 'grapple', description: 'You gain a +2 competence bonus to Grapple checks.' },
      ENSLAVED_BONUS_FLAT
    ]
  }
];

for (const { label, str, dex, size, speciesGrapple, backgroundFlat } of staticCases) {
  const actor = actorFor({ str, dex, size, speciesGrapple, backgroundFlat });
  const updates = await DerivedCalculator.computeAll(actor);
  const derivedValue = updates['system.derived.grappleBonus'];

  const liveActor = liveActorFrom({ str, dex, size, speciesGrapple, backgroundFlat }, updates);

  const panel = new PanelContextBuilder(liveActor, { isEditable: true }).buildResourcesPanel();
  const sheetValue = panel.combatMetrics.grappleBonus;

  const breakdown = CombatStatsTooltip.getGrappleBreakdown(liveActor);
  const tooltipRowSum = breakdown.rows.reduce((sum, r) => sum + r.value, 0);

  const opposedBase = await SWSEGrappling._rollGrappleBonus(liveActor, { mode: 'attackGrapple' });
  const rollBase = await rollFormulaBonus(liveActor);

  assert.ok(Number.isFinite(derivedValue), `[${label}] derived grappleBonus must be finite`);
  assert.equal(sheetValue, derivedValue, `[${label}] sheet box must match derived total`);
  assert.equal(breakdown.total, derivedValue, `[${label}] tooltip total must match derived total`);
  assert.equal(tooltipRowSum, breakdown.total, `[${label}] SUM(tooltip rows) must equal the displayed total exactly`);
  assert.equal(opposedBase, derivedValue, `[${label}] SWSEGrappling's neutral-mode opposed-check base must match derived total (no contextual bonus applies in this mode)`);
  assert.equal(rollBase, derivedValue, `[${label}] the grapple roll formula's static base must match derived total`);

  if (backgroundFlat?.length) {
    const staticModifier = updates['system.derived.grappleBonusParts']?.staticModifiers;
    assert.equal(staticModifier, 2, `[${label}] the Enslaved background must contribute exactly +2, never +4 regardless of how many duplicate records are present`);
  }
}

console.log(`  [1/6] static-total invariant holds across ${staticCases.length} golden cases, including a pre-dedup-fix duplicate-representation input OK`);

// ─── Contextual cases: Expert Grappler and Grapple Resistance ──────────────
// Both are mode-gated and must apply ONLY at roll time, on top of the
// static total, and must never leak into system.derived.grappleBonus.
// Expert Grappler is also the concrete competence/competence collision
// case round 5 exists to fix -- both Expert Grappler and Enslaved use the
// "competence" bonus type, so together they must cap at the higher of the
// two, never sum.

{
  const actor = actorFor({ str: 14, dex: 20, size: 'medium', items: [expertGrapplerTalent()] });
  const updates = await DerivedCalculator.computeAll(actor);
  const staticTotal = updates['system.derived.grappleBonus'];

  assert.equal(
    updates['system.derived.grappleBonusParts']?.staticModifiers, 0,
    'Expert Grappler alone must NOT contribute to the static modifier total (it is mode-gated, not permanent)'
  );

  const liveActor = liveActorFrom({ str: 14, dex: 20, size: 'medium', items: [expertGrapplerTalent()] }, updates);

  const attackModeBase = await SWSEGrappling._rollGrappleBonus(liveActor, { mode: 'attackGrapple' });
  const resistModeBase = await SWSEGrappling._rollGrappleBonus(liveActor, { mode: 'resistGrapple' });

  assert.equal(attackModeBase, staticTotal + 2, 'Expert Grappler alone must add its +2 in attackGrapple mode (nothing to collide with)');
  assert.equal(resistModeBase, staticTotal, 'Expert Grappler must NOT apply in resistGrapple mode (it is gated to attackGrapple only)');
}

console.log('  [2/6] Expert Grappler alone applies contextually (attackGrapple mode only), exactly once, never folded into the static total OK');

// The required stacking-collision matrix: Enslaved (+2 competence, static)
// vs. Expert Grappler (competence, contextual) at varying values.
const stackingCollisionCases = [
  {
    label: 'equal competence values: same-type contextual must NOT stack on top of static (the round-4 regression this round fixes)',
    expertGrapplerBonus: 2,
    expectedTypedContribution: 2 // highest of (2, 2) = 2, not 2+2=4
  },
  {
    label: 'higher contextual competence (+4) replaces lower static competence (+2)',
    expertGrapplerBonus: 4,
    expectedTypedContribution: 4 // highest of (2, 4) = 4, not 2+4=6
  },
  {
    label: 'lower contextual competence (+1) does not replace higher static competence (+2)',
    expertGrapplerBonus: 1,
    expectedTypedContribution: 2 // highest of (2, 1) = 2, not 2+1=3
  }
];

for (const { label, expertGrapplerBonus, expectedTypedContribution } of stackingCollisionCases) {
  const actorSpec = { str: 14, dex: 20, size: 'medium', backgroundFlat: [ENSLAVED_BONUS_FLAT], items: [expertGrapplerTalent(expertGrapplerBonus, 'competence')] };
  const actor = actorFor(actorSpec);
  const updates = await DerivedCalculator.computeAll(actor);
  const core = updates['system.derived.grappleBonusParts'].core;
  const staticTotal = updates['system.derived.grappleBonus'];

  assert.equal(staticTotal, core + 2, `[${label}] the static total must still reflect only Enslaved's +2 (Expert Grappler is contextual, not static)`);

  const liveActor = liveActorFrom(actorSpec, updates);
  const attackModeBase = await SWSEGrappling._rollGrappleBonus(liveActor, { mode: 'attackGrapple' });
  const resistModeBase = await SWSEGrappling._rollGrappleBonus(liveActor, { mode: 'resistGrapple' });

  assert.equal(attackModeBase, core + expectedTypedContribution, `[${label}] attackGrapple must resolve competence stacking correctly, not sum both sources`);
  assert.equal(resistModeBase, staticTotal, `[${label}] resistGrapple must show only the static competence bonus (Expert Grappler is attackGrapple-gated)`);
}

console.log(`  [3/6] competence-vs-competence stacking collision resolves correctly across ${stackingCollisionCases.length} value combinations (never a bare sum) OK`);

// A contextual bonus of a DIFFERENT stacking type must compose normally
// (both apply) -- this is the same shared ModifierUtils.resolveStacking()
// authority making that call automatically; no Grapple-specific type logic.
{
  const circumstanceTalent = {
    type: 'talent', name: 'Circumstance Grappler',
    system: { disabled: false, abilityMeta: { grappleRules: [
      { type: 'GRAPPLE_BONUS', mode: 'attackGrapple', bonus: 2, bonusType: 'circumstance', source: 'Circumstance Grappler' }
    ] } }
  };
  const actorSpec = { str: 14, dex: 20, size: 'medium', backgroundFlat: [ENSLAVED_BONUS_FLAT], items: [circumstanceTalent] };
  const actor = actorFor(actorSpec);
  const updates = await DerivedCalculator.computeAll(actor);
  const core = updates['system.derived.grappleBonusParts'].core;

  const liveActor = liveActorFrom(actorSpec, updates);
  const attackModeBase = await SWSEGrappling._rollGrappleBonus(liveActor, { mode: 'attackGrapple' });

  assert.equal(attackModeBase, core + 2 + 2, 'a contextual bonus of a different stacking type (circumstance) must compose additively with the static competence bonus, not be capped by it');
}

console.log('  [4/6] a different-type contextual bonus stacks normally alongside a same-actor static bonus of another type OK');

{
  const actor = actorFor({ str: 14, dex: 20, size: 'medium', items: [grappleResistanceFeat()] });
  const updates = await DerivedCalculator.computeAll(actor);
  const staticTotal = updates['system.derived.grappleBonus'];

  const liveActor = liveActorFrom({ str: 14, dex: 20, size: 'medium', items: [grappleResistanceFeat()] }, updates);

  const resistGrappleBase = await SWSEGrappling._rollGrappleBonus(liveActor, { mode: 'resistGrapple' });
  const attackGrappleBase = await SWSEGrappling._rollGrappleBonus(liveActor, { mode: 'attackGrapple' });

  assert.equal(resistGrappleBase, staticTotal + 5, 'Grapple Resistance must add its +5 only when resisting a grapple');
  assert.equal(attackGrappleBase, staticTotal, 'Grapple Resistance must NOT apply when making a grapple attack');
}

console.log('  [5/6] Grapple Resistance applies contextually (resist modes only), exactly once, never folded into the static total OK');

// ─── Real background pipeline: reproduce and prove the fix at the source ──
// Uses the REAL hydrateBackgroundEvent() and BackgroundGrantLedgerBuilder,
// reading the actual authored record from data/backgrounds.json (not a
// hand-typed fixture), and the REAL applyCanonicalBackgroundsToActor() and
// ModifierEngine._getBackgroundModifiers(). BackgroundRegistry itself can't
// load under this harness (its non-compendium fallback calls fetch() on a
// relative systems/ URL, which requires a running Foundry host) -- a
// minimal stand-in registry supplies the same real, file-read record in its
// place, matching exactly what BackgroundRegistry.ensureLoaded() would have
// produced.

{
  const allBackgrounds = JSON.parse(readFileSync(new URL('../data/backgrounds.json', import.meta.url), 'utf8'));
  function findRaw(obj) {
    if (Array.isArray(obj)) {
      for (const v of obj) { const r = findRaw(v); if (r) return r; }
    } else if (obj && typeof obj === 'object') {
      if (String(obj.id || '').toLowerCase() === 'enslaved') return obj;
      for (const v of Object.values(obj)) { const r = findRaw(v); if (r) return r; }
    }
    return null;
  }
  const rawEnslaved = findRaw(allBackgrounds);
  assert.ok(rawEnslaved, 'the real Enslaved background record must exist in data/backgrounds.json');

  const hydrated = hydrateBackgroundEvent({ ...rawEnslaved, id: 'enslaved', slug: 'enslaved' });
  const fakeRegistry = { getBySlug: async () => hydrated, getByName: async () => hydrated };
  const ledger = await BackgroundGrantLedgerBuilder.build(['enslaved'], fakeRegistry);

  assert.equal(ledger.bonuses.flat.length, 1, 'BackgroundGrantLedgerBuilder must produce exactly ONE flat bonus entry for Enslaved, not two (dedup fix)');
  assert.equal(ledger.bonuses.flat[0].target, 'grapple');
  assert.equal(ledger.bonuses.flat[0].value, 2);
  assert.equal(ledger.bonuses.flat[0].bonusType, 'competence');

  const actor = { id: 'real-pipeline', name: 'Real Pipeline Test', flags: { swse: {} } };
  const pendingContext = {
    selectedIds: ['enslaved'],
    selectedBackgrounds: [hydrated],
    multiMode: false,
    classSkillChoices: [],
    languages: {},
    bonuses: ledger.bonuses,
    passiveEffects: ledger.passiveEffects,
    ledger
  };
  const result = await applyCanonicalBackgroundsToActor(actor, pendingContext);
  assert.equal(result.success, true);
  actor.flags.swse.backgroundBonuses = result.mutations['flags.swse.backgroundBonuses'];

  const modifiers = ModifierEngine._getBackgroundModifiers(actor);
  const grappleModifiers = modifiers.filter(m => m.target === 'grapple');
  assert.equal(grappleModifiers.length, 1, 'ModifierEngine must produce exactly ONE grapple modifier from the real pipeline output');
  assert.equal(grappleModifiers[0].value, 2);
  assert.equal(grappleModifiers[0].type, 'competence');
}

console.log('  [6/6] real background pipeline (hydrateBackgroundEvent -> BackgroundGrantLedgerBuilder -> applyCanonicalBackgroundsToActor -> ModifierEngine) produces exactly one +2 grapple contribution for Enslaved OK');

console.log('grapple-static-modifier-composition.test.mjs: all assertions passed');
