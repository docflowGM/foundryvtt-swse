import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// WP3-B transport hardening (static/offline): reply provenance, non-executor silence, bounded delivery guard. The route stays disabled; this does not verify identity.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
const R = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-player-request-route.js');
const T = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-request-transport.js');
let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);

const reply = { requestId: 'r1', routeStatus: 'EXECUTED', status: 'COMMITTED' };
const msg = (author, flagReply = reply) => ({ id: 'x', author: { id: author }, flags: { swse: { [T.REPLY_FLAG]: flagReply } } });
const isGm = (id) => id === 'gm';

assert.equal(T.replyFromCreatedMessage(msg('p2'), 'p2', isGm), null); ok('a reply authored by a player (self-whispered forgery) is never an executor reply');
assert.equal(T.replyFromCreatedMessage(msg('gm'), 'p1', isGm), null); ok('author must equal the hook user');
assert.equal(T.replyFromCreatedMessage({ id: 'x', author: { id: 'gm' }, flags: {} }, 'gm', isGm), null); ok('non-reply messages are ignored');
assert.equal(T.replyFromCreatedMessage(msg('gm'), 'gm', () => { throw new Error('x'); }), null); ok('a throwing GM check fails closed');
const good = T.replyFromCreatedMessage(msg('gm'), 'gm', isGm);
assert.equal(good.authenticated, true); assert.equal(good.requestId, 'r1'); ok('a GM-authored reply is marked authenticated');

const env = R.buildEquipmentRequestEnvelope({ actorId: 'a1', requestId: 'r1', intent: { type: 'ready', itemId: 's', appendageIds: ['natural-arm-1'], grip: 'one-handed' } });
const send = (deliver, timeoutMs = 20) => T.sendEquipmentRequest(env, { createMessage: async () => {}, gmUserIds: () => ['gm'], timeoutMs, onReply: (fn) => { setTimeout(() => deliver(fn), 0); return () => {}; } });
assert.equal((await send((fn) => fn({ requestId: 'r1', status: 'COMMITTED' }))).status, 'UNKNOWN_OUTCOME'); ok('an unauthenticated reply cannot resolve a request');
assert.equal((await send((fn) => fn({ requestId: 'r1', authenticated: true, status: 'COMMITTED' }))).status, 'COMMITTED'); ok('an authenticated matching reply resolves it');
assert.equal((await send((fn) => fn({ requestId: 'other', authenticated: true, status: 'COMMITTED' }))).status, 'UNKNOWN_OUTCOME'); ok('a reply for another request id is ignored');

// a GM client that does not hold the executor lease must not answer
const replies = [];
const handler = T.createRequestMessageHandler({ routeEnabled: () => true, verifiedMechanisms: [R.CHAT_AUTHOR_MECHANISM], isGm: () => true, executorIdentity: null, leaseStore: null, getUser: () => ({}), getActor: () => ({}), createMessage: async (d) => replies.push(d) });
const res = await handler({ id: 'm1', author: { id: 'p1' }, flags: { swse: { [T.REQUEST_FLAG]: env } } }, {}, 'p1');
assert.equal(res.status, R.ROUTE_OUTCOME.NOT_EXECUTOR); assert.equal(replies.length, 0); ok('a non-executor GM stays silent (no competing refusal reply)');
// executor-level refusals are still answered
const h2 = T.createRequestMessageHandler({ routeEnabled: () => false, isGm: () => true, createMessage: async (d) => replies.push(d) });
assert.equal((await h2({ id: 'm2', author: { id: 'p1' }, flags: { swse: { [T.REQUEST_FLAG]: env } } }, {}, 'p1')).status, R.ROUTE_OUTCOME.ROUTE_DISABLED); assert.equal(replies.length, 1); ok('other refusals are still reported to the sender');
// delivery guard stays bounded
const h3 = T.createRequestMessageHandler({ routeEnabled: () => false, createMessage: async () => {} });
for (let i = 0; i < 700; i++) await h3({ id: `b${i}`, author: { id: 'p1' }, flags: { swse: { [T.REQUEST_FLAG]: env } } }, {}, 'p1');
ok('700 deliveries processed with a bounded delivery guard');
console.log(`equipment-wp3b-transport-hardening: ${n} checks ok`);
