import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 4's damage-application idempotency work
// (docs/audits/rolling-system-alignment-phase-4.md, "Damage-action routing
// behavior"). Before this pass, handleApplyDamageButton had no idempotency
// tracking — a double-click or a second GM clicking the same "Apply Damage"
// button applied the same packet to the same target's HP twice with no
// record. This adds a message-flag receipt (flags.swse.damageApplications)
// keyed by weapon+target, checked before applying and written after.

const bridge = await readFile(new URL('../scripts/ui/chat/chat-interaction-bridge.js', import.meta.url), 'utf8');

// 1. Receipt helpers exist and are keyed by weapon+target (so applying
// damage from the same message to two DIFFERENT targets is still allowed —
// only a re-application to the SAME target is blocked).
assert.match(bridge, /function damageApplicationReceiptKey\(weaponKey, targetId\) \{/);
assert.match(bridge, /function findDamageApplicationReceipt\(message, key\) \{/);
assert.match(bridge, /async function recordDamageApplicationReceipt\(message, key, receipt\) \{/);

// 2. handleApplyDamageButton checks for an existing receipt BEFORE calling
// DamageSystem, and warns (does not silently no-op) rather than applying
// twice.
const applyFn = bridge.slice(bridge.indexOf('async function handleApplyDamageButton'), bridge.indexOf('async function handleGrappleActionButton'));
assert.match(applyFn, /const existingReceipt = findDamageApplicationReceipt\(message, receiptKey\);/);
const receiptCheckIndex = applyFn.indexOf('existingReceipt');
const damageSystemImportIndex = applyFn.indexOf("import('/systems/foundryvtt-swse/scripts/combat/damage-system.js')");
assert.ok(receiptCheckIndex >= 0 && damageSystemImportIndex > receiptCheckIndex, 'The receipt check must happen before DamageSystem is invoked.');
assert.match(applyFn, /if \(existingReceipt\) \{\s*\n\s*ui\?\.notifications\?\.warn\?\.\(/);

// 3. A receipt is recorded AFTER a successful apply, not before (so a
// failed/short-circuited apply above never falsely blocks a later retry).
const recordIndex = applyFn.indexOf('await recordDamageApplicationReceipt(');
const applyCallIndex = applyFn.indexOf('DamageSystem.applyPacketToActor(target, packet)');
const applySelectedIndex = applyFn.indexOf('DamageSystem.applyPacketToSelected(packet)');
assert.ok(recordIndex > applyCallIndex && recordIndex > applySelectedIndex, 'The receipt must be recorded after the damage packet is applied.');

// 4. Receipt writes are best-effort (try/catch) — a failed flag write must
// never undo already-applied damage, matching the existing Phase 3
// convention for non-critical message-state writes.
const recordFnBody = bridge.slice(bridge.indexOf('async function recordDamageApplicationReceipt'), bridge.indexOf('async function handleLegacyDamageRollButton'));
assert.match(recordFnBody, /try \{[\s\S]*?await message\?\.setFlag\?\.\('swse', 'damageApplications',[\s\S]*?\} catch \(err\) \{/);

// 5. This still runs AFTER (not instead of) the existing superseded-message
// guard — duplicate-application protection is additive, not a replacement.
assert.match(applyFn, /if \(isAttackMessageSuperseded\(message\)\) \{\s*\n\s*warnSupersededDamageAttempt\(message\);\s*\n\s*return;\s*\n\s*\}/);
const supersededIndex = applyFn.indexOf('isAttackMessageSuperseded(message)');
assert.ok(supersededIndex >= 0 && supersededIndex < receiptCheckIndex, 'The superseded-message guard must run before the duplicate-application check.');

console.log('Phase 4 damage-application receipt guards passed.');
