import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 2's reroll-outcome-integrity fix
// (docs/audits/rolling-system-alignment-phase-2.md). MetaResourceFeatResolver
// .resolveAttackRerollButton() used to replace only the displayed total on
// an attack reroll, leaving no fresh hit/critical verdict at all (the
// original attack message's stale data was the only "outcome" a reroll ever
// produced). It now builds a completely fresh AttackOutcomeResolver result
// for whichever roll (original or reroll) backs the final kept total.

const resolver = await readFile(new URL('../scripts/engine/feats/meta-resource-feat-resolver.js', import.meta.url), 'utf8');
const attacks = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');

// Sliced up to the next static method (resolveFullAttackRerollButton,
// added directly after this one in Phase 5 for combined Full Attack card
// rerolls) rather than getTemporaryDefenseRules, so this isolates exactly
// resolveAttackRerollButton()'s own body regardless of what methods were
// inserted between it and getTemporaryDefenseRules since Phase 2.
const rerollBody = resolver.slice(
  resolver.indexOf('static async resolveAttackRerollButton('),
  resolver.indexOf('static async resolveFullAttackRerollButton(')
);

// 1. A reroll must build a brand new AttackOutcomeResolver result, not reuse
//    or merge any field from a prior/stale result object.
assert.match(rerollBody, /AttackOutcomeResolver\.resolve\(\{/, 'resolveAttackRerollButton() must call AttackOutcomeResolver.resolve().');
assert.doesNotMatch(rerollBody, /\.\.\.\s*(oldOutcome|previousOutcome|staleOutcome|originalOutcome)/, 'Must not spread/merge a prior outcome object.');

// 2. The natural d20 backing the final total must be selected based on which
//    roll (original vs. reroll) actually produced the kept total — not
//    hard-coded to always reuse the reroll's or the original's d20.
assert.match(rerollBody, /const finalNaturalD20 = usedNew \? rerollNaturalD20 : originalNaturalD20;/);

// 3. Resource spending (Force Point) happens exactly once, before the fresh
//    outcome/chat card is built, and only on the success path.
const fpSpendMatches = rerollBody.match(/ActorEngine\.spendForcePoints\(actor, 1\)/g) || [];
assert.equal(fpSpendMatches.length, 1, 'Force Point must be spent exactly once per reroll.');
const spendIndex = rerollBody.indexOf('ActorEngine.spendForcePoints(actor, 1)');
const outcomeIndex = rerollBody.indexOf('AttackOutcomeResolver.resolve({');
assert.ok(spendIndex < outcomeIndex, 'Force Point spend must happen before the fresh outcome is built.');

// 4. A failed reroll (no newRoll) must return before any resource spend or
//    outcome construction — the original result is left untouched.
const failureReturnIndex = rerollBody.indexOf('if (!newRoll) {');
assert.ok(failureReturnIndex >= 0 && failureReturnIndex < spendIndex, 'Reroll failure must be checked before any resource spend.');

// 5. The replacement outcome must be attached to the reroll's own chat
//    message flags, not just displayed as a bare number, so downstream
//    consumers can read the authoritative verdict.
assert.match(rerollBody, /attackOutcome: newOutcome/);

// 6. attacks.js must supply the target-defense/critical-threshold/multiplier
//    data a reroll needs to build that fresh outcome (previously the reroll
//    button had no way to know the target's defense at all).
assert.match(attacks, /targetDefense: targetReflex,\s*\n\s*criticalThreshold,\s*\n\s*critMultiplier/);

console.log('Phase 2 reroll outcome integrity guards passed.');
