// Slice 6AE re-derived: the Temptation choice belongs to the affected actor's owner; a GM who performed the spend does not auto-open it
// while an eligible player-owner is connected. Pure routing function + wiring. Not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldAutoPromptTemptationChoice as route } from '../scripts/engine/progression/utils/temptation-choice-routing.js';
const target = (ownerIds) => ({ testUserPermission: (u) => ownerIds.includes(u?.id) });
const gm = { id: 'gm', isGM: true, active: true }; const p1 = { id: 'p1', isGM: false, active: true }; const p2off = { id: 'p2', isGM: false, active: false };
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };
assert.equal(route(target(['p1']), { user: p1, users: [gm, p1] }), true); ok('the owning player auto-prompts on their own client');
assert.equal(route(target(['p1']), { user: gm, users: [gm, p1] }), false); ok('a GM does NOT auto-prompt while an owner is connected');
assert.equal(route(target(['p2']), { user: gm, users: [gm, p2off] }), true); ok('a GM may prompt when the owner is not connected (GM fallback)');
assert.equal(route(target([]), { user: p1, users: [gm, p1] }), false); ok('a non-owner never auto-prompts');
assert.equal(route(target(['p1']), { user: gm, users: { contents: [gm, p1] } }), false); ok('Foundry collection shape (contents) is handled');
assert.equal(route({ testUserPermission() { throw new Error('x'); } }, { user: gm, users: [gm, p1] }), false); ok('unverifiable ownership fails closed (no automatic GM choice)');
assert.equal(route(null, { user: gm }), false); assert.equal(route(target(['p1']), {}), false); ok('missing target/user fails closed');
const src = readFileSync(new URL('../scripts/engine/combat/sith-lord-temptation-service.js', import.meta.url), 'utf8');
const d = src.indexOf('const deliver=async event');
assert.ok(src.indexOf('shouldAutoPromptTemptationChoice(event.actor', d) > d && src.indexOf('shouldAutoPromptTemptationChoice(event.actor', d) < src.indexOf('resolvePending(event.actor)', d), 'the auto-prompt is gated by the routing decision');
ok('the delivery path gates the automatic prompt through the routing decision');
console.log(`class-force-v2-temptation-owner-routing: ${n} checks passed`);
