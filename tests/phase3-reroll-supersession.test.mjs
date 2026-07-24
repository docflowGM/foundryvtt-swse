import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 3's reroll-state-synchronization fix
// (docs/audits/rolling-system-alignment-phase-3.md). Phase 2 made a reroll
// build a fresh AttackOutcomeResolver result, but the ORIGINAL attack chat
// message was left untouched — a stale "Roll Damage"/"Apply Damage" button
// on it remained independently clickable after a reroll changed the
// outcome. Phase 3 marks the original message superseded and blocks damage
// actions on it.

const resolver = await readFile(new URL('../scripts/engine/feats/meta-resource-feat-resolver.js', import.meta.url), 'utf8');
const attacks = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../scripts/ui/chat/chat-interaction-bridge.js', import.meta.url), 'utf8');

// 1. New attack messages start authoritative, unsuperseded, at revision 0 —
// both attack chat entry points (rollAttack and
// rollAttackAndDamageWithNarration) must post this baseline state.
const authoritativeBlocks = (attacks.match(/authoritative: true,\s*\n\s*superseded: false,\s*\n\s*supersededBy: null,\s*\n\s*revision: 0/g) || []).length;
assert.equal(authoritativeBlocks, 2, 'Both attack chat entry points must post the baseline revision/authoritative state.');

// 2. A successful reroll must flip the ORIGINAL message's authoritative/
// superseded flags and point supersededBy at the new message — not just
// create a disconnected second result.
const rerollBody = resolver.slice(
  resolver.indexOf('static async resolveAttackRerollButton('),
  resolver.indexOf('static getTemporaryDefenseRules(')
);
assert.match(rerollBody, /'flags\.swse\.authoritative': false/);
assert.match(rerollBody, /'flags\.swse\.superseded': true/);
assert.match(rerollBody, /'flags\.swse\.supersededBy': newMessage\.id/);
assert.match(rerollBody, /revision,\s*\n\s*authoritative: true/, 'The new reroll message must itself be stamped authoritative with an incremented revision.');

// 3. Updating the original message is best-effort: if it throws, the
// already-created new reroll result must not be discarded, and the user
// must get a recoverable warning rather than a silent failure.
const updateTryIndex = rerollBody.indexOf('try {\n        await message.update(');
const catchIndex = rerollBody.indexOf('} catch (err) {', updateTryIndex);
assert.ok(updateTryIndex >= 0 && catchIndex > updateTryIndex, 'Original-message update must be wrapped in try/catch.');
const catchBlock = rerollBody.slice(catchIndex, catchIndex + 400);
assert.match(catchBlock, /ui\?\.notifications\?\.warn\?\.\(/, 'A failed original-message update must surface a warning.');
assert.match(rerollBody, /return \{ actor, message, newMessage, sourceName, originalTotal, newRoll, finalTotal, outcome, attackOutcome: newOutcome, revision \};/, 'The function must still return the successful new result regardless of whether the original message update succeeded.');

// 4. Every chat-driven damage action (Roll Damage x2, Apply Damage) must
// refuse to act on a superseded attack message rather than silently
// applying stale hit/critical/damage data.
assert.match(bridge, /function isAttackMessageSuperseded\(message\)/);
assert.match(bridge, /message\?\.getFlag\?\.\('swse', 'superseded'\) === true/);
const guardCalls = (bridge.match(/if \(isAttackMessageSuperseded\(message\)\) \{\s*\n\s*warnSupersededDamageAttempt\(message\);\s*\n\s*return;\s*\n\s*\}/g) || []).length;
assert.equal(guardCalls, 3, 'Expected the superseded guard in all three damage-action handlers (combat damage, legacy damage, apply damage).');

// 5. No function was accidentally duplicated while wiring the guard in.
const combatDamageDeclarations = (bridge.match(/^async function handleCombatDamageRollButton/gm) || []).length;
assert.equal(combatDamageDeclarations, 1);

console.log('Phase 3 reroll supersession guards passed.');
