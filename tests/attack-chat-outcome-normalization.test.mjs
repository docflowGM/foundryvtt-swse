import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// Finding F-CMB-007 (3E): the attack-chat outcome normalization used to be installed as a runtime monkey-patch of SWSEChat.postRoll.
// It is now an ordinary step of postRoll. Behavior parity (natural 1/20, total vs defense, hidden defense, non-attack passthrough).
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.mergeObject ??= (a, b) => { const out = { ...a }; for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(out[k] ?? {}), ...v } : v; return out; };
const target = { id: 't1', name: 'Target', isOwner: false, system: { defenses: { reflex: { total: 15 } } } };
let user = { isGM: false };
globalThis.game = { ...(globalThis.game ?? {}), get user() { return user; }, actors: { get: (id) => (id === 't1' ? target : null) } };
globalThis.canvas = { tokens: { placeables: [] } };
const { normalizeAttackChatPayload: n } = await import('/systems/foundryvtt-swse/scripts/chat/attack-chat-outcome.js');
const roll = (d20, total) => ({ total, dice: [{ faces: 20, results: [{ result: d20 }] }] });
const payload = (d20, total, extra = {}) => ({ roll: roll(d20, total), context: { type: 'attack', targetId: 't1', ...extra }, flags: {} });

const hit = n(payload(10, 18, { targetContext: { actorId: 't1', defenseType: 'reflex' } }), {});
assert.equal(hit.context.success, true, 'total 18 vs Reflex 15 hits'); assert.equal(hit.context.outcomeLabel, 'Hit');
assert.equal(hit.context.dc, null, 'a non-owner player must not see the defense value'); assert.equal(hit.context.targetContext.defenseHidden, true);
user = { isGM: true };
const gm = n(payload(10, 18, { targetContext: { actorId: 't1', defenseType: 'reflex' } }));
assert.equal(gm.context.dc, 15, 'a GM sees the defense value');
const miss = n(payload(10, 12, { targetContext: { actorId: 't1' } })); assert.equal(miss.context.success, false); assert.equal(miss.context.outcomeLabel, 'Miss');
const nat20 = n(payload(20, 5, { targetContext: { actorId: 't1' } })); assert.equal(nat20.context.success, true, 'natural 20 hits'); assert.equal(nat20.context.isCritical, true); assert.equal(nat20.context.outcomeLabel, 'Critical Hit');
const nat1 = n(payload(1, 40, { targetContext: { actorId: 't1' } })); assert.equal(nat1.context.success, false, 'natural 1 misses'); assert.equal(nat1.context.isCritical, false);
const skill = { roll: roll(10, 20), context: { type: 'skill' }, flags: {} };
assert.equal(n(skill), skill, 'non-attack payloads pass through untouched');
assert.equal(hit.flags.swse.workflowContext.damage.hit, true, 'result mirrored into the workflow context');

// the monkey-patch is gone and postRoll applies the step itself
const hotfix = fs.readFileSync('scripts/patches/combat-ui-behavior-hotfix.js', 'utf8');
assert.ok(!/SWSEChat\.postRoll\s*=|patchedPostRoll|installAttackChatOutcomePatch/.test(hotfix), 'combat-ui-behavior-hotfix must not patch SWSEChat.postRoll');
assert.ok(/normalizeAttackChatPayload\(payload\)/.test(fs.readFileSync('scripts/chat/swse-chat.js', 'utf8')), 'SWSEChat.postRoll applies the normalization');
console.log('attack-chat-outcome-normalization: ok');
