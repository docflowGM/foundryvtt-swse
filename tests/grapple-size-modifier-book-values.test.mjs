import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 3: Grapple rules fidelity.
//
// A third certification review found that the Grapple size modifier table
// centralized in combat-stat-rules.js during round 2's SSOT extraction --
// while now genuinely a single source of truth -- had never actually been
// checked against the published SWSE rule. It turned out to be wrong: it
// used a step-of-4 table (max +/-16), while the Core Rulebook's Grapple
// size modifier table is step-of-5 (max +/-20). A second, independent
// "runtime" size table inside scripts/combat/systems/grappling-system.js
// (_sizeMod(), now removed) disagreed with BOTH the old centralized table
// and the correct one (step-of-8, max +/-16), proving the freeze's point:
// SSOT only helps if the single source is actually correct.
//
// This test locks in the corrected table two independent ways:
//
//   1. Golden values for all 9 size categories (the published, verified
//      table itself).
//   2. Cross-validation against two real, published creature stat blocks
//      already present in this repo's own compendium data
//      (packs/beasts.db) -- Aiwha (Gargantuan) and Bantha (Huge) -- back-
//      solving the size modifier from their known BAB/STR/published-Grapple
//      values and confirming it matches the table, so a future accidental
//      table edit is caught against real game data, not just re-asserted
//      constants.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { GRAPPLE_SIZE_MODIFIERS, getGrappleSizeModifier, computeGrappleBonus } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js'
);

// ─── 1. Golden per-size-category table (Saga Edition Core Rulebook) ────────
// Grapple check = 1d20 + BAB + higher of STR/DEX + size modifier.
// Table confirmed independently against two separate SWSE rules-reference
// lookups and against the Aiwha/Bantha cross-check below.

const BOOK_GRAPPLE_SIZE_MODIFIERS = {
  fine: -20,
  diminutive: -15,
  tiny: -10,
  small: -5,
  medium: 0,
  large: 5,
  huge: 10,
  gargantuan: 15,
  colossal: 20
};

for (const [size, expected] of Object.entries(BOOK_GRAPPLE_SIZE_MODIFIERS)) {
  assert.equal(
    GRAPPLE_SIZE_MODIFIERS[size],
    expected,
    `GRAPPLE_SIZE_MODIFIERS.${size} must equal the published book value ${expected}`
  );
  assert.equal(
    getGrappleSizeModifier(size),
    expected,
    `getGrappleSizeModifier('${size}') must equal the published book value ${expected}`
  );
}

console.log('  [1/2] all 9 size categories match the published Core Rulebook Grapple size modifier table OK');

// ─── 2. Cross-check against real creature stat blocks in this repo's own
//        compendium data (packs/beasts.db) ─────────────────────────────────

const beastsPath = fileURLToPath(new URL('../packs/beasts.db', import.meta.url));
const beastsRaw = readFileSync(beastsPath, 'utf8');

function findBeast(name) {
  for (const line of beastsRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (obj?.name === name) return obj;
  }
  throw new Error(`Beast "${name}" not found in packs/beasts.db`);
}

function abilityMod(base) {
  return Math.floor((Number(base) - 10) / 2);
}

const bookCreatureChecks = [
  {
    // Gargantuan, BAB +3, STR 25 (+7 mod). Published Grapple modifier: +25.
    // 25 - 3 - 7 = +15, matching the Gargantuan row above.
    name: 'Aiwha',
    expectedBab: 3,
    expectedStr: 25,
    expectedSize: 'gargantuan',
    publishedGrapple: 25
  },
  {
    // Huge, BAB +2, STR 28 (+9 mod). Published Grapple modifier: +21.
    // 21 - 2 - 9 = +10, matching the Huge row above.
    name: 'Bantha',
    expectedBab: 2,
    expectedStr: 28,
    expectedSize: 'huge',
    publishedGrapple: 21
  }
];

for (const check of bookCreatureChecks) {
  const beast = findBeast(check.name);
  const bab = Number(beast.system?.bab);
  const str = Number(beast.system?.attributes?.str?.base);
  const size = String(beast.system?.size ?? '').toLowerCase();

  assert.equal(bab, check.expectedBab, `${check.name}'s compendium BAB must still be +${check.expectedBab} (this test's premise depends on it)`);
  assert.equal(str, check.expectedStr, `${check.name}'s compendium STR must still be ${check.expectedStr} (this test's premise depends on it)`);
  assert.equal(size, check.expectedSize, `${check.name}'s compendium size must still be ${check.expectedSize} (this test's premise depends on it)`);

  const computed = computeGrappleBonus({
    bab,
    strMod: abilityMod(str),
    dexMod: -Infinity, // STR is unambiguously better for both creatures; force STR to be selected
    sizeMod: getGrappleSizeModifier(size),
    speciesBonus: 0
  });

  assert.equal(
    computed,
    check.publishedGrapple,
    `${check.name}: BAB ${bab} + STR mod ${abilityMod(str)} + ${size} size modifier ${getGrappleSizeModifier(size)} must equal the published Grapple modifier +${check.publishedGrapple}`
  );
}

console.log('  [2/2] Aiwha (Gargantuan) and Bantha (Huge) reproduce their published Grapple modifiers using this repo\'s own compendium data OK');

console.log('grapple-size-modifier-book-values.test.mjs: all assertions passed');
