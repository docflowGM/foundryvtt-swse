import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Runtime Cache Coherency Audit — Target 4 (HIGH RISK, confirmed —
// severer than a cache-staleness bug: a wrong-authority read, not a stale
// one).
//
// SnapshotBuilder._extractAbilityScore() (scripts/engine/suggestion/
// SnapshotBuilder.js) builds the suggestion-cache fingerprint's ability
// component like this:
//
//     const attr = actor?.system?.attributes?.[ability];
//     const ab = actor?.system?.abilities?.[ability];
//     for (const value of [attr?.total, attr?.value, attr?.score, attr,
//                          ab?.total, ab?.value, ab?.score, ab]) { ... }
//
// The canonical schema (docs/systems/ABILITY_SCHEMA_AUTHORITY.md;
// SchemaAdapters.getAbilityScore(), already relied on by
// PrerequisiteChecker and DefenseCalculator elsewhere in this codebase) is
// system.attributes.<key> = {base, racial, enhancement, temp} -- there is
// no .total/.value/.score field on that object. So attr?.total/.value/.score
// are always undefined, and Number(attr) (the whole component object) is
// NaN. The loop then falls through to system.abilities, a legacy
// compatibility MIRROR that a normal, modern, canonical-schema-only actor
// (every other fixture in this Runtime Cache Coherency Audit and in
// PR #975's golden path) never populates at all.
//
// This is not merely a stale-cache risk: it is a wrong-authority read. This
// test proves the actual severity is worse than staleness -- it is a
// permanent, universal collision. Every actor's ability-score component
// (regardless of real scores) reduces to {str:0,dex:0,con:0,int:0,wis:0,cha:0},
// so the suggestion-cache fingerprint can never distinguish two actors (or
// the same actor before/after a real ability change) by ability score at
// all, and any ability-driven suggestion scoring reading snapshot.attributes
// always sees zeroes.
//
// Fix: delegate to the same canonical authority PrerequisiteChecker and
// DefenseCalculator already use (SchemaAdapters.getAbilityScore()) instead
// of a second, independent, broken reconstruction. This test exercises the
// REAL, imported SnapshotBuilder.build() and SchemaAdapters.getAbilityScore()
// -- not a reimplementation of either.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { SnapshotBuilder } = await import(
  '/systems/foundryvtt-swse/scripts/engine/suggestion/SnapshotBuilder.js'
);
const { SchemaAdapters } = await import(
  '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js'
);

// Canonical-schema-only actor -- system.attributes.<key> = {base, racial,
// enhancement, temp}, no system.abilities mirror, no system.derived at all.
// This is the normal shape for a fresh V2 actor (same schema PR #975's
// golden-path fixture uses for Scout 1 / Soldier 7).
function makeActor({ dex = 18, con = 17, wis = 14 } = {}) {
  return {
    id: 'snapshot-ability-actor',
    type: 'character',
    name: 'Snapshot Ability Authority Test Actor',
    items: [],
    effects: [],
    system: {
      level: 8,
      attributes: {
        str: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: dex, racial: 0, enhancement: 0, temp: 0 },
        con: { base: con, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: wis, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      }
    }
  };
}

// ── Step 1: the snapshot's ability component must match the canonical ──
// authority, not collapse to zero.
const actor = makeActor({ dex: 18, con: 17, wis: 14 });
const snapshot = SnapshotBuilder.build(actor);

assert.equal(
  snapshot.attributes.dex,
  SchemaAdapters.getAbilityScore(actor, 'dex'),
  'FAIL-BEFORE PROOF: the snapshot\'s DEX component must equal the canonical SchemaAdapters.getAbilityScore() ' +
  'authority (18 for this actor). Under the pre-fix extraction (attr?.total/.value/.score, none of which exist ' +
  'on the canonical {base,racial,enhancement,temp} shape), this is 0 instead.'
);
assert.equal(snapshot.attributes.dex, 18, 'the snapshot DEX component must be the actor\'s real score, 18');
assert.equal(snapshot.attributes.con, 17, 'the snapshot CON component must be the actor\'s real score, 17');
assert.equal(snapshot.attributes.wis, 14, 'the snapshot WIS component must be the actor\'s real score, 14');

console.log('  [1/2] snapshot ability component matches the canonical SchemaAdapters authority OK');

// ── Step 2: two actors with genuinely different ability scores must NOT ──
// collide onto the same suggestion-cache fingerprint. Under the pre-fix
// code, BOTH actors reduce to {str:0,dex:0,con:0,int:0,wis:0,cha:0} --
// their snapshot hashes would be identical for the ability component even
// though DEX differs by 4 full points, i.e. any ability-change would go
// completely unnoticed by the suggestion cache.
const lowDexActor = makeActor({ dex: 10, con: 17, wis: 14 });
const highDexActor = makeActor({ dex: 18, con: 17, wis: 14 });
const lowDexSnapshot = SnapshotBuilder.build(lowDexActor);
const highDexSnapshot = SnapshotBuilder.build(highDexActor);

assert.notEqual(
  lowDexSnapshot.attributes.dex,
  highDexSnapshot.attributes.dex,
  'FAIL-BEFORE PROOF: two actors with genuinely different DEX (10 vs 18) must produce different snapshot ' +
  'ability components. Under the pre-fix extraction both collapse to 0, so this assertion fails.'
);
assert.notEqual(
  SnapshotBuilder.hash(lowDexSnapshot),
  SnapshotBuilder.hash(highDexSnapshot),
  'a genuine DEX difference must change the suggestion-cache hash — stale advice must not survive a real ability change'
);

console.log('  [2/2] genuinely different ability states no longer collide onto the same suggestion-cache fingerprint OK');
console.log('snapshot-builder-ability-authority.test.mjs: all assertions passed');
