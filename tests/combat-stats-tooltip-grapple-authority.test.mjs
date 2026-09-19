import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 3: Grapple rules fidelity.
//
// Repository-wide search for remaining grapple formulas (per the third
// certification review's item F) turned up a fourth, previously
// unclassified independent implementation: CombatStatsTooltip.getGrappleBreakdown()
// (scripts/ui/combat-stats-tooltip.js), the hover-tooltip breakdown shown
// on the character sheet's Grapple stat. It computed BAB + Strength-only
// (never crediting a DEX-based grappler) + its own size table (a fourth,
// independently-wrong copy -- step-of-4, max +/-16) + a dead, never-set
// system.grapple.miscMod field, and never showed a species bonus row at
// all despite the canonical formula including one.
//
// Fixed to decompose the same computeGrappleBonus() inputs (BAB via
// SchemaAdapters, higher of STR/DEX via the same "which one wins" logic,
// size via the corrected getGrappleSizeModifier(), species bonus when
// present) and to prefer the canonical system.derived.grappleBonus as the
// displayed total whenever it's finite.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { CombatStatsTooltip } = await import(
  '/systems/foundryvtt-swse/scripts/ui/combat-stats-tooltip.js'
);

function actorFor({ str, dex, size = 'medium', speciesGrapple = 0, derivedGrappleBonus } = {}) {
  return {
    system: {
      size,
      attributes: {
        str: { base: str, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: dex, racial: 0, enhancement: 0, temp: 0 }
      },
      speciesCombatBonuses: speciesGrapple ? { grapple: speciesGrapple } : undefined,
      derived: {
        bab: 7,
        ...(Number.isFinite(derivedGrappleBonus) ? { grappleBonus: derivedGrappleBonus } : {})
      }
    }
  };
}

// ─── 1. A DEX-based grappler must be credited with DEX, not silently ───────
//        defaulted to Strength-only (the old bug).
{
  const actor = actorFor({ str: 14, dex: 20, size: 'medium' }); // Gar'ee-shaped, no canonical value yet
  const breakdown = CombatStatsTooltip.getGrappleBreakdown(actor);
  const abilityRow = breakdown.rows.find(r => r.label.includes('modifier'));
  assert.equal(abilityRow.label, 'Dexterity modifier', 'must label and credit the higher ability (DEX +5 > STR +2)');
  assert.equal(abilityRow.value, 5);
  assert.equal(breakdown.total, 7 + 5 + 0, 'BAB 7 + DEX +5 + medium size 0 = 12');
}

console.log('  [1/3] DEX-based grappler correctly credited (was Strength-only) OK');

// ─── 2. Size modifier must use the book-corrected table (Large = +5, not
//        the old wrong +4). ─────────────────────────────────────────────────
{
  const actor = actorFor({ str: 14, dex: 10, size: 'large' });
  const breakdown = CombatStatsTooltip.getGrappleBreakdown(actor);
  const sizeRow = breakdown.rows.find(r => r.label === 'Size modifier');
  assert.equal(sizeRow.value, 5, 'Large must use the corrected book value (+5), not the old wrong table (+4)');
  assert.equal(breakdown.total, 7 + 2 + 5, 'BAB 7 + STR +2 + large size +5 = 14');
}

console.log('  [2/3] size modifier uses the book-corrected table OK');

// ─── 3. When system.derived.grappleBonus is already computed, the tooltip
//        must display that canonical value as the total, not a recomputed
//        one (single source of truth for the number shown to the player). ──
{
  const actor = actorFor({ str: 14, dex: 20, size: 'medium', speciesGrapple: 4, derivedGrappleBonus: 999 });
  const breakdown = CombatStatsTooltip.getGrappleBreakdown(actor);
  assert.equal(breakdown.total, 999, 'must display the canonical system.derived.grappleBonus, not recompute its own total');
  const speciesRow = breakdown.rows.find(r => r.label === 'Species bonus');
  assert.ok(speciesRow, 'a species grapple bonus must appear as its own row (previously never shown at all)');
  assert.equal(speciesRow.value, 4);
}

console.log('  [3/3] canonical total preferred over recomputation; species bonus row present OK');

console.log('combat-stats-tooltip-grapple-authority.test.mjs: all assertions passed');
