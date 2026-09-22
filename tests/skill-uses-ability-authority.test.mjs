import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Regression coverage for six Category C sites from
// docs/audits/ability-schema-authority-migration-phase3-ledger.md:
// scripts/skills/skill-uses.js read actor.system.abilities?.con/int?.mod
// and .total directly, with no fallback to the canonical
// system.attributes/system.derived.attributes data at all (unlike the
// combat/rolls sites, which at least checked derived data first). Six
// gameplay-affecting skill-use special mechanics were affected: a target's
// Intelligence-based DC, Endurance/Constitution-based hold-breath and
// rounds-held math (twice), and Constitution-based healing math (twice
// more, plus a getConScore() helper).
//
// The fix routes all six through SchemaAdapters.getAbilityMod()/
// getAbilityScore() (already regression-tested directly in
// tests/schema-adapters-ability-authority.test.mjs and
// tests/ability-modifier-authority.test.mjs against Gar'ee's real actor
// data), rather than duplicating that coverage here. This is a source-
// contract check confirming the six call sites were actually changed to
// use the canonical accessor and no longer read the raw legacy path
// directly -- scripts/skills/skill-uses.js pulls in
// CapabilityRegistry/RollEngine/SWSEChat and is too heavy to import live
// under plain Node (same rationale as the source-contract checks in
// tests/skill-roll-dialog-base-authority.test.mjs for similarly heavy
// production files).

const source = await readFile(new URL('../scripts/skills/skill-uses.js', import.meta.url), 'utf8');

assert.doesNotMatch(
  source,
  /\.system\.abilities\?\.(con|int)\?\./,
  'skill-uses.js must not read actor/target.system.abilities directly for con/int'
);

assert.match(
  source,
  /import \{ SchemaAdapters \} from "\/systems\/foundryvtt-swse\/scripts\/utils\/schema-adapters\.js";/,
  'skill-uses.js must import SchemaAdapters'
);

const getAbilityModCalls = (source.match(/SchemaAdapters\.getAbilityMod\(/g) || []).length;
const getAbilityScoreCalls = (source.match(/SchemaAdapters\.getAbilityScore\(/g) || []).length;
assert.equal(getAbilityModCalls, 3, 'expected the three .mod sites (target Int, actor Con x2) to route through SchemaAdapters.getAbilityMod()');
assert.equal(getAbilityScoreCalls, 3, 'expected the three .total/score sites (actor Con) to route through SchemaAdapters.getAbilityScore()');

console.log('skill-uses.js ability-authority source-contract guard passed.');
