import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for MetaResourceFeatResolver#resolveFullAttackRerollButton()
// and its wiring (docs/audits/rolling-system-alignment-phase-5.md,
// "Interactive per-attack rerolls"). Same convention as prior phases:
// meta-resource-feat-resolver.js uses absolute /systems/foundryvtt-swse/...
// imports that only resolve inside Foundry's module loader, so this is a
// readFile + regex/assert.match source-text guard, not executed logic
// (the state-service half of this feature IS genuinely executed — see
// phase5-full-attack-message-state.test.mjs).

const resolver = await readFile(new URL('../scripts/engine/feats/meta-resource-feat-resolver.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../scripts/ui/chat/chat-interaction-bridge.js', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../scripts/engine/combat/full-attack-card-renderer.js', import.meta.url), 'utf8');
const executor = await readFile(new URL('../scripts/engine/combat/full-attack-executor.js', import.meta.url), 'utf8');

const fn = resolver.slice(
  resolver.indexOf('static async resolveFullAttackRerollButton('),
  resolver.length
);
// Bound to the end of the class/file region containing this method; trim
// to just this method by finding its own closing brace pattern (next
// top-level `static` after it, or end of file if none).
const nextStaticIndex = fn.indexOf('\n  static ', 10);
const fnBody = nextStaticIndex > 0 ? fn.slice(0, nextStaticIndex) : fn;

// 1. Reroll button data contract: identifies sequenceId, attackInstanceId,
// expected revision, weapon, target-defense, formula, source, cost, policy.
assert.match(renderer, /data-sequence-id="\$\{entry\.sequenceId/);
assert.match(renderer, /data-attack-instance-id="\$\{entry\.attackInstanceId\}"/);
assert.match(renderer, /data-expected-revision="\$\{entry\.activeRevision\}"/);
assert.match(renderer, /data-rule-id="\$\{opt\.id/);
assert.match(renderer, /data-source-id="\$\{opt\.sourceId/);
assert.match(renderer, /data-cost="\$\{opt\.cost/);
assert.match(renderer, /data-outcome="\$\{opt\.outcome/);
assert.match(renderer, /data-formula="\$\{opt\.formula/);

// 2. The reroll button is rendered from entry.attackRerollOptions — the
// SAME eligibility list rollAttack() already computes via
// MetaResourceFeatResolver.buildAttackRerollChatOptions for the
// single-attack path — not a new, independently-invented eligibility
// check. No universal reroll: zero rerollOptions means zero buttons.
assert.match(renderer, /const rerollOptions = Array\.isArray\(entry\.attackRerollOptions\) \? entry\.attackRerollOptions : \[\];/);
assert.match(renderer, /const rerollBtns = rerollOptions\.map\(opt =>/);
assert.match(executor, /attackRerollOptions: res\.attackRerollOptions/);

// 3. Eligibility is re-validated at EXECUTION time (not just trusted from
// render-time dataset): the granting rule must still be present on the
// actor, any oncePer encounter limit must not be exhausted, and Force
// Points must still be available — all three checked before any roll or
// spend happens.
assert.match(fnBody, /const currentRules = this\.getAttackRerollRules\(actor\);/);
assert.match(fnBody, /const stillEligible = currentRules\.some\(/);
assert.match(fnBody, /if \(!stillEligible\) \{/);
assert.match(fnBody, /EncounterUseTracker\.canUse\(actor, featureKey, \{ oncePer: button\.dataset\.oncePer \}\)/);
assert.match(fnBody, /if \(cost === 'forcePoint' && actorForcePoints\(actor\) <= 0\) \{/);

// 4. Stale-card / concurrency protection: the CURRENTLY stored active
// revision is read and compared to the button's expectedRevision BEFORE
// any resource is spent or any die is rolled.
const staleCheckIndex = fnBody.indexOf("entry.activeRevision !== expectedRevision");
const rollIndex = fnBody.indexOf('RollEngine?.safeRoll');
const spendIndex = fnBody.indexOf('ActorEngine.spendForcePoints');
assert.ok(staleCheckIndex >= 0 && staleCheckIndex < rollIndex && staleCheckIndex < spendIndex, 'Stale-revision check must precede both rolling and spending.');

// 5. Rerolling after damage has already been applied is rejected clearly
// (no rule in this codebase permits it) rather than silently allowed —
// checked against entry.damageApplications[] (what
// recordDamageApplication() actually populates), not an unset
// damageContext.applied flag.
assert.match(fnBody, /if \(Array\.isArray\(entry\.damageApplications\) && entry\.damageApplications\.length > 0\) \{/);
assert.match(fnBody, /conflict: 'damage-already-applied'/);

// 6. A completely fresh AttackOutcomeResolver verdict is built — never
// merges stale outcome fields from the prior revision.
assert.match(fnBody, /const newOutcome = AttackOutcomeResolver\.resolve\(\{/);
assert.doesNotMatch(fnBody, /\.\.\.\s*(oldOutcome|previousOutcome|staleOutcome|activeRevision\?\.outcome)/);

// 7. Only the SELECTED attack's revision is appended — appendRevision is
// scoped to one attackInstanceId, and the componentLedger/original
// declared attack mode (penaltyText, label — untouched, not part of
// revisionData) are preserved rather than recomputed.
assert.match(fnBody, /appendRevision\(message, attackInstanceId, expectedRevision, revisionData\)/);
assert.match(fnBody, /componentLedger: activeRevision\?\.componentLedger \?\? \[\],/);

// 8. Result-selection policy: exactly the two policies proven to exist in
// this codebase (keepBetter / keepSecond via normalizeRerollOutcome) are
// used — no invented "worse-result"/"choose-result"/"GM-replace-result"
// policy is implemented for full-attack rerolls (matches the single-attack
// reroll's own proven policy set, not a superset).
assert.match(fnBody, /const outcome = this\.normalizeRerollOutcome\(button\.dataset\.outcome\);/);
assert.match(fnBody, /const finalTotal = outcome === 'keepBetter' \? Math\.max\(originalTotal, rerollTotal\) : rerollTotal;/);
assert.doesNotMatch(resolver, /keepWorse|chooseResult|gmReplace/i);

// 9. A cancelled/failed reroll (no newRoll) and a resource-payment failure
// both return before appendRevision — leaving the existing attack
// authoritative (no state ever touched for a failure path).
const noRollFailIndex = fnBody.indexOf('if (!newRoll) {');
const forcePointFailIndex = fnBody.indexOf("if (!spend?.spent) {");
const appendIndex = fnBody.indexOf('await appendRevision(');
assert.ok(noRollFailIndex >= 0 && noRollFailIndex < appendIndex);
assert.ok(forcePointFailIndex >= 0 && forcePointFailIndex < appendIndex);

// 10. A successful reroll followed by a chat-render failure preserves the
// valid new state (the appended revision already succeeded) and surfaces
// a recoverable warning + diagnostics record rather than throwing or
// silently discarding the result.
const catchBlock = fnBody.slice(fnBody.indexOf('} catch (err) {', fnBody.indexOf('try {')), fnBody.indexOf('if (!persisted?.ok)'));
assert.match(catchBlock, /ui\?\.notifications\?\.warn\?\.\(/);
assert.match(catchBlock, /AttackRollDiagnostics\.record\(\{/);
assert.match(catchBlock, /conflict: 'render-failed'/);

// 11. Button click wiring: a distinct class/handler from the single-attack
// reroll (different persistence model — see the handler's own doc
// comment), bound alongside it, guarding against a disabled (already
// mid-reroll) button.
assert.match(bridge, /async function handleFullAttackRerollButton\(event, button, message\) \{/);
assert.match(bridge, /if \(button\.disabled\) return;/);
assert.match(bridge, /bind\(root, '\.swse-full-attack-reroll-btn', 'FullAttackReroll', handleFullAttackRerollButton, message\);/);
assert.match(bridge, /MetaResourceFeatResolver\.resolveFullAttackRerollButton\(button, \{ message \}\)/);

// 12. Damage routing for sequence attacks: a combined-card damage button
// (data-attack-instance-id present) is checked against the CURRENT stored
// revision before rolling/applying damage — rejecting stale cards rather
// than applying damage from a superseded hit after a reroll to miss.
assert.match(bridge, /async function isFullAttackRowStale\(message, button\) \{/);
assert.match(bridge, /const attackInstanceId = button\?\.dataset\?\.attackInstanceId;\s*\n\s*if \(!attackInstanceId\) return false;/);
assert.match(bridge, /return entry\.activeRevision !== expectedRevision;/);
const legacyDamageFn = bridge.slice(bridge.indexOf('async function handleLegacyDamageRollButton'), bridge.indexOf('async function handleApplyDamageButton'));
assert.match(legacyDamageFn, /if \(await isFullAttackRowStale\(message, button\)\) \{/);
const applyDamageFn = bridge.slice(bridge.indexOf('async function handleApplyDamageButton'));
assert.match(applyDamageFn, /if \(await isFullAttackRowStale\(message, button\)\) \{/);
// Both stale checks run AFTER the existing superseded-message guard.
assert.ok(legacyDamageFn.indexOf('isAttackMessageSuperseded') < legacyDamageFn.indexOf('isFullAttackRowStale'));

console.log('Phase 5 full-attack reroll handler + damage-routing guards passed.');
