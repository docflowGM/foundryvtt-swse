import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 1 DSP consolidation — real behavioral coverage for DSPEngine's
// canonical-vs-legacy value resolution and integer-safe maximum
// calculation, using the existing Foundry-path Node loader shim
// (tests/helpers/foundry-shim/) so this exercises the real production
// module, not a reimplementation of its logic. DSPEngine and its one
// dependency, SchemaAdapters, touch no Foundry globals at module-eval
// time — only lazily inside guarded function bodies — so no fakes beyond
// the shared shim's default game/foundry stubs are needed here.

registerFoundryPathLoader();

const { DSPEngine } = await import('/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js');

function settingsShim(values = {}) {
  return {
    game: {
      settings: {
        get: (_namespace, key) => values[key]
      }
    }
  };
}

// ── getValue: real Foundry hydration shape ──────────────────────────────
// A legacy actor's _source (raw persisted data) has no `darkSide` key at
// all — it predates that field. The *prepared* actor.system.darkSide is
// still present and zeroed, because template.json fills it in at
// data-prep time. getValue() must see through that and recover the
// legacy value, not report 0.
{
  installFoundryShimGlobals();
  const legacyActor = {
    _source: { system: { darkSideScore: 5 } }, // no persisted darkSide object
    system: { darkSideScore: 5, darkSide: { value: 0, max: 0 } } // template-hydrated at read time
  };
  assert.equal(DSPEngine.getValue(legacyActor), 5, 'legacy-only actor recovers darkSideScore, not template-hydrated 0');
}

// ── getValue: persisted canonical zero beats stale legacy data ─────────
{
  installFoundryShimGlobals();
  const zeroedActor = {
    _source: { system: { darkSide: { value: 0 }, darkSideScore: 5 } },
    system: { darkSide: { value: 0, max: 0 }, darkSideScore: 5 }
  };
  assert.equal(DSPEngine.getValue(zeroedActor), 0, 'an intentionally persisted canonical 0 must win over stale legacy 5');
}

// ── getValue: canonical persisted nonzero wins over legacy ─────────────
{
  installFoundryShimGlobals();
  const actor = {
    _source: { system: { darkSide: { value: 3 }, darkSideScore: 5 } },
    system: { darkSide: { value: 3, max: 0 }, darkSideScore: 5 }
  };
  assert.equal(DSPEngine.getValue(actor), 3, 'persisted canonical value takes priority over legacy');
}

// ── getValue: canonical absent, no legacy either → 0 ────────────────────
{
  installFoundryShimGlobals();
  const freshActor = {
    _source: { system: {} },
    system: { darkSide: { value: 0, max: 0 } }
  };
  assert.equal(DSPEngine.getValue(freshActor), 0, 'brand new actor with nothing persisted reads 0');
}

// ── getValue: no _source at all (plain test double) falls back to system ──
{
  installFoundryShimGlobals();
  const plainActor = { system: { darkSideScore: 7 } };
  assert.equal(DSPEngine.getValue(plainActor), 7, 'actors without _source use system directly for the presence check');
}

// ── getNextValue: real increment correctness for a legacy-only actor ────
// This is what force-engine.js / sith-talent-actions.js / force-adept
// -talent-actions.js now delegate to for their before/after computation —
// verifying it here is real verification of their fixed behavior, not a
// regex proxy.
{
  installFoundryShimGlobals();
  const legacyActor = {
    _source: { system: { darkSideScore: 5 } },
    system: { darkSideScore: 5, darkSide: { value: 0, max: 0 } }
  };
  assert.equal(DSPEngine.getNextValue(legacyActor, 1), 6, 'legacy-only actor gaining 1 DSP must become 6, not 1');
}

// ── getMax: integer normalization — fractional explicit max ─────────────
{
  installFoundryShimGlobals();
  const actor = { system: { darkSide: { value: 0, max: 16.5 }, attributes: { wis: { base: 10 } } } };
  assert.equal(DSPEngine.getMax(actor), 17, 'explicit fractional max must round up to an integer');
}

// ── getMax: integer normalization — fractional Wisdom×multiplier product ──
{
  installFoundryShimGlobals(settingsShim({ darkSideMaxMultiplier: 1.5 }));
  const actor = { system: { darkSide: { value: 0, max: 0 }, attributes: { wis: { base: 11 } } } };
  assert.equal(DSPEngine.getMax(actor), 17, 'Wisdom 11 x 1.5 must round up to 17, not stay fractional at 16.5');
}

// ── getMax: explicit non-fractional max wins over the Wisdom formula ────
{
  installFoundryShimGlobals(settingsShim({ darkSideMaxMultiplier: 3 }));
  const actor = { system: { darkSide: { value: 0, max: 8 }, attributes: { wis: { base: 14 } } } };
  assert.equal(DSPEngine.getMax(actor), 8, 'a positive explicit max is authoritative over the Wisdom formula');
}

// ── getMax: species/racial Wisdom bonus is now honored ──────────────────
// The original audit found DSPEngine only read attributes.wis.base,
// silently ignoring a species racial bonus. In real play that bonus is
// folded into system.derived.attributes.wis.total by DerivedCalculator's
// prepareDerivedData() (per ABILITY_SCHEMA_AUTHORITY.md) before any sheet
// or mutation code ever runs, so a realistic prepared-actor fixture sets
// derived.attributes.wis.total directly rather than re-deriving it here.
// Routing through SchemaAdapters.getAbilityScore means DSPEngine now
// reads that prepared total instead of the raw, racial-blind .base.
{
  installFoundryShimGlobals();
  const actor = {
    system: {
      darkSide: { value: 0, max: 0 },
      attributes: { wis: { base: 10, racial: 1, enhancement: 0, temp: 0 } },
      derived: { attributes: { wis: { base: 10, racial: 1, enhancement: 0, temp: 0, total: 11, mod: 0 } } }
    }
  };
  assert.equal(DSPEngine.getMax(actor), 11, 'racial Wisdom bonus must be reflected in the derived DSP maximum');
}

// ── Sith Apprentice / Sith Lord thresholds scale off the same accessor ──
{
  installFoundryShimGlobals(settingsShim({ sithApprenticeMinimumDSP: '50percent', sithLordMinimumDSP: '100percent' }));
  const actor = {
    system: {
      darkSide: { value: 0, max: 0 },
      attributes: { wis: { base: 10, racial: 2, enhancement: 0, temp: 0 } },
      derived: { attributes: { wis: { base: 10, racial: 2, enhancement: 0, temp: 0, total: 12, mod: 1 } } } // effective Wisdom 12
    }
  };
  assert.equal(DSPEngine.getSithApprenticeMinimumDSP(actor), 6, '50% of effective Wisdom 12, rounded up');
  assert.equal(DSPEngine.getSithLordMinimumDSP(actor), 12, '100% of effective Wisdom 12');
}

resetFoundryShimGlobals();
console.log('DSP engine behavioral tests passed.');
