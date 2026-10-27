/**
 * WP3-B Gate 1 — offline check of the identity probe's own logic (tools/foundry-runtime-probes/wp3b-gate1-identity-probe.js).
 *
 * This does NOT verify Foundry. It verifies that the probe (a) sends every required case plus an attempt manifest and
 * (b) only reports OBSERVED_SOUND when the evidence is COMPLETE and sound: every required case attempted and accounted for,
 * forged authors rejected or rewritten (never stored as the forged user), a delivered claim-only message whose claim differs
 * from the operator-confirmed player, and every delivered author/hook user equal to that OPERATOR-CONFIRMED player id
 * (never to the payload's self-reported senderUserId). Incomplete evidence must never produce a positive verdict.
 * The server is simulated by feeding the GM-side hooks what a given server would deliver.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../tools/foundry-runtime-probes/wp3b-gate1-identity-probe.js', import.meta.url), 'utf8');
const ALL_USERS = [{ id: 'gm1', isGM: true }, { id: 'p1', isGM: false }, { id: 'p2', isGM: false }];
const flatten = (o, pre = '', out = {}) => { for (const [k, v] of Object.entries(o ?? {})) { const p = pre ? `${pre}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out); else out[p] = v; } return out; };

function runAs(userId, { create, users = ALL_USERS } = {}) {
  const hooks = {};
  const logs = [];
  const ctx = {
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
    Hooks: { on: (n, fn) => { (hooks[n] ??= []).push(fn); } },
    foundry: { utils: { randomID: () => Math.random().toString(36).slice(2, 18), flattenObject: flatten } },
    ChatMessage: { create: create ?? (async () => null), deleteDocuments: async () => [] },
    game: {
      ready: true, version: '13.test', release: { generation: 13, build: 999 }, system: { id: 'foundryvtt-swse', version: 'test' },
      user: users.find((u) => u.id === userId), users: [...users], messages: { filter: () => [] },
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { ctx, hooks, logs };
}

/** Simulated server: deliver one stored message to the GM hooks. */
const deliver = (gm, { caseName, nonce, author, hookUser, claimed = null, sender = 'p1', manifest = undefined }) => {
  const probe = { case: caseName, nonce, senderUserId: sender, claimedUserId: claimed };
  if (manifest) probe.manifest = manifest;
  const msg = { id: `m-${nonce}`, author: { id: author, isGM: ALL_USERS.find((u) => u.id === author)?.isGM }, flags: { 'foundryvtt-swse': { wp3bGate1Probe: probe } } };
  for (const fn of gm.hooks.createChatMessage ?? []) fn(msg, {}, hookUser);
};
const entry = (caseName, outcome, extra = {}) => ({ case: caseName, nonce: `n-${caseName}`, outcome, messageId: outcome === 'created' ? `m-n-${caseName}` : null, ...extra });
/** A complete, sound run: honest + claim-only delivered, both forgeries rejected, manifest delivered. */
function soundRun(gm, over = {}) {
  const m = over.manifestEntries ?? [
    entry('honest', 'created', { claimedUserId: 'p1' }),
    entry('forged-author-other-player', 'rejected', { claimedUserId: 'p2' }),
    entry('forged-author-gm', 'rejected', { claimedUserId: 'gm1' }),
    entry('claim-only', 'created', { claimedUserId: 'p2' }),
  ];
  if (!over.skipHonest) deliver(gm, { caseName: 'honest', nonce: 'n-honest', author: 'p1', hookUser: over.honestHook ?? 'p1', claimed: 'p1', sender: over.sender ?? 'p1' });
  if (!over.skipClaim) deliver(gm, { caseName: 'claim-only', nonce: 'n-claim-only', author: over.claimAuthor ?? 'p1', hookUser: 'p1', claimed: over.claimClaimed ?? 'p2' });
  for (const d of over.extraDeliveries ?? []) deliver(gm, d);
  if (!over.skipManifest) deliver(gm, { caseName: 'manifest', nonce: 'n-manifest', author: over.manifestAuthor ?? 'p1', hookUser: over.manifestAuthor ?? 'p1', manifest: { playerUserId: 'p1', entries: m } });
}
const SOUND = /^OBSERVED_SOUND/;
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(true); console.log(`  PASS  ${name}`); }
  catch (e) { results.push(false); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
}

await check('1. complete sound evidence (honest + claim-only delivered, both forgeries rejected and documented, manifest) is OBSERVED_SOUND', () => {
  const gm = runAs('gm1'); soundRun(gm);
  const r = gm.ctx.SWSE_WP3B_GATE1.report('p1');
  assert.match(r.verdict, SOUND, JSON.stringify(r.reasons));
});
await check('2. a forgery rewritten by the server to the real player still counts as sound', () => {
  const gm = runAs('gm1');
  soundRun(gm, {
    manifestEntries: [entry('honest', 'created', { claimedUserId: 'p1' }), entry('forged-author-other-player', 'created', { claimedUserId: 'p2' }), entry('forged-author-gm', 'rejected', { claimedUserId: 'gm1' }), entry('claim-only', 'created', { claimedUserId: 'p2' })],
    extraDeliveries: [{ caseName: 'forged-author-other-player', nonce: 'n-forged-author-other-player', author: 'p1', hookUser: 'p1', claimed: 'p2' }],
  });
  assert.match(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('3a. only an honest message delivered (no manifest, no other cases) is NOT positive', () => {
  const gm = runAs('gm1'); soundRun(gm, { skipClaim: true, skipManifest: true });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('3b. forged attempts missing from the manifest are NOT positive (incomplete)', () => {
  const gm = runAs('gm1'); soundRun(gm, { manifestEntries: [entry('honest', 'created', { claimedUserId: 'p1' }), entry('claim-only', 'created', { claimedUserId: 'p2' })] });
  const r = gm.ctx.SWSE_WP3B_GATE1.report('p1');
  assert.equal(r.verdict, 'NOT_VERIFIED_INCOMPLETE'); assert.ok(r.reasons.some((x) => /forged-author/.test(x)));
});
await check('3d. a missing claim-only delivery is NOT positive (incomplete)', () => {
  const gm = runAs('gm1'); soundRun(gm, { skipClaim: true });
  assert.equal(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, 'NOT_VERIFIED_INCOMPLETE');
});
await check('3e. an absent second player (forged-other-player skipped) is NOT positive (incomplete)', () => {
  const gm = runAs('gm1');
  // (fixture consistent since R2: the delivered claim-only claims the same identity its manifest entry lists)
  soundRun(gm, { claimClaimed: 'gm1', manifestEntries: [entry('honest', 'created', { claimedUserId: 'p1' }), entry('forged-author-other-player', 'skipped: no second player user exists in this world'), entry('forged-author-gm', 'rejected', { claimedUserId: 'gm1' }), entry('claim-only', 'created', { claimedUserId: 'gm1' })] });
  assert.equal(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, 'NOT_VERIFIED_INCOMPLETE');
});
await check('3f. a forged author stored as the forged user is FAILED (spoofed identity accepted by the server)', () => {
  const gm = runAs('gm1');
  soundRun(gm, {
    manifestEntries: [entry('honest', 'created', { claimedUserId: 'p1' }), entry('forged-author-other-player', 'created', { claimedUserId: 'p2' }), entry('forged-author-gm', 'rejected', { claimedUserId: 'gm1' }), entry('claim-only', 'created', { claimedUserId: 'p2' })],
    extraDeliveries: [{ caseName: 'forged-author-other-player', nonce: 'n-forged-author-other-player', author: 'p2', hookUser: 'p1', claimed: 'p2' }],
  });
  const r = gm.ctx.SWSE_WP3B_GATE1.report('p1');
  assert.equal(r.verdict, 'NOT_VERIFIED_FAILED'); assert.equal(r.checks.forgeryAccepted, true);
});
await check('4. claim-only whose claim equals the real player proves nothing (NOT positive)', () => {
  const gm = runAs('gm1');
  soundRun(gm, { claimClaimed: 'p1', manifestEntries: [entry('honest', 'created', { claimedUserId: 'p1' }), entry('forged-author-other-player', 'rejected', { claimedUserId: 'p2' }), entry('forged-author-gm', 'rejected', { claimedUserId: 'gm1' }), entry('claim-only', 'created', { claimedUserId: 'p1' })] });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('5. without operator confirmation of the player login the verdict is incomplete (payload senderUserId is never identity)', () => {
  const gm = runAs('gm1'); soundRun(gm);
  assert.equal(gm.ctx.SWSE_WP3B_GATE1.report().verdict, 'NOT_VERIFIED_INCOMPLETE');
});
await check('6. author matches the payload senderUserId but NOT the operator-confirmed player: FAILED', () => {
  const gm = runAs('gm1'); soundRun(gm);
  assert.equal(gm.ctx.SWSE_WP3B_GATE1.report('p2').verdict, 'NOT_VERIFIED_FAILED');
});
await check('7. a creation hook user that differs from the confirmed player: FAILED', () => {
  const gm = runAs('gm1'); soundRun(gm, { honestHook: 'gm1' });
  assert.equal(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, 'NOT_VERIFIED_FAILED');
});
await check('8. manifest reports a case created but the GM never received it: incomplete', () => {
  const gm = runAs('gm1');
  soundRun(gm, { manifestEntries: [entry('honest', 'created', { claimedUserId: 'p1' }), entry('forged-author-other-player', 'created', { claimedUserId: 'p2' }), entry('forged-author-gm', 'rejected', { claimedUserId: 'gm1' }), entry('claim-only', 'created', { claimedUserId: 'p2' })] });
  assert.equal(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, 'NOT_VERIFIED_INCOMPLETE');
});
await check('9. a manifest says "rejected" but the GM received that forged message anyway: never positive', () => {
  const gm = runAs('gm1');
  soundRun(gm, { extraDeliveries: [{ caseName: 'forged-author-gm', nonce: 'n-forged-author-gm', author: 'p1', hookUser: 'p1', claimed: 'gm1' }] });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('10. a manifest not authored by the confirmed player is not accepted (incomplete)', () => {
  const gm = runAs('gm1'); soundRun(gm, { manifestAuthor: 'p2' });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('11. the confirmed player must be a real non-GM user', () => {
  const gm = runAs('gm1'); soundRun(gm);
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('gm1').verdict, SOUND);
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('nobody').verdict, SOUND);
});
await check('11b. a run whose every message comes from a GM, confirmed as that GM, is still not positive (the probe needs a non-GM sender)', () => {
  const gm = runAs('gm1');
  for (const c of ['honest', 'claim-only']) deliver(gm, { caseName: c, nonce: `n-${c}`, author: 'gm1', hookUser: 'gm1', claimed: c === 'honest' ? 'gm1' : 'p2', sender: 'gm1' });
  deliver(gm, { caseName: 'manifest', nonce: 'n-manifest', author: 'gm1', hookUser: 'gm1', sender: 'gm1', manifest: { playerUserId: 'gm1', entries: [
    entry('honest', 'created', { claimedUserId: 'gm1' }), entry('forged-author-other-player', 'rejected', { claimedUserId: 'p2' }),
    entry('forged-author-gm', 'rejected', { claimedUserId: 'p1' }), entry('claim-only', 'created', { claimedUserId: 'p2' })] } });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('gm1').verdict, SOUND);
});
// ---- R2: every receipt must bind one-to-one to its manifest entry (case + nonce + messageId + claimed identity) ----
const okEntries = () => [
  entry('honest', 'created', { claimedUserId: 'p1' }), entry('forged-author-other-player', 'rejected', { claimedUserId: 'p2' }),
  entry('forged-author-gm', 'rejected', { claimedUserId: 'gm1' }), entry('claim-only', 'created', { claimedUserId: 'p2' }),
];
await check('R2a. the reviewer\'s substitution: honest and claim-only share one nonce and only a claim-only message arrived — never positive', () => {
  const gm = runAs('gm1');
  soundRun(gm, { skipHonest: true, manifestEntries: [
    { case: 'honest', nonce: 'n-claim-only', outcome: 'created', messageId: 'm-n-claim-only', claimedUserId: 'p1' },
    entry('forged-author-other-player', 'rejected', { claimedUserId: 'p2' }), entry('forged-author-gm', 'rejected', { claimedUserId: 'gm1' }),
    entry('claim-only', 'created', { claimedUserId: 'p2' })] });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('R2b. a receipt whose message id differs from the manifest entry is never positive', () => {
  const gm = runAs('gm1'); const e = okEntries(); e[0].messageId = 'm-something-else';
  soundRun(gm, { manifestEntries: e });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('R2c. claimed-identity cross-wiring (manifest says p2, the received claim-only says gm1) is never positive', () => {
  const gm = runAs('gm1'); soundRun(gm, { claimClaimed: 'gm1' });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('R2d. two receipts for one created case are a duplicate, never counted once', () => {
  const gm = runAs('gm1');
  soundRun(gm, { extraDeliveries: [{ caseName: 'honest', nonce: 'n-honest', author: 'p1', hookUser: 'p1', claimed: 'p1' }] });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('R2e. a manifest whose playerUserId differs from the confirmed player is inconsistent (never positive)', () => {
  const gm = runAs('gm1'); soundRun(gm);
  gm.ctx.SWSE_WP3B_GATE1.store.created.find((r) => r.case === 'manifest').manifest.playerUserId = 'p2';
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('R2f. a case listed twice in the manifest is inconsistent (never positive)', () => {
  const gm = runAs('gm1'); soundRun(gm, { manifestEntries: [...okEntries(), entry('forged-author-gm', 'rejected', { claimedUserId: 'gm1' })] });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('R2g. a received probe message whose nonce is not in the manifest is unaccounted evidence (never positive)', () => {
  const gm = runAs('gm1');
  soundRun(gm, { extraDeliveries: [{ caseName: 'forged-author-gm', nonce: 'n-unlisted', author: 'p1', hookUser: 'p1', claimed: 'gm1' }] });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('R2h. a receipt whose case differs from the manifest entry with that nonce is never positive', () => {
  const gm = runAs('gm1');
  soundRun(gm, { skipHonest: true, extraDeliveries: [{ caseName: 'claim-only', nonce: 'n-honest', author: 'p1', hookUser: 'p1', claimed: 'p1' }] });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('R2i. a rewritten forgery must have exactly one receipt bound by message id', () => {
  const gm = runAs('gm1'); const e = okEntries(); e[1] = entry('forged-author-other-player', 'created', { claimedUserId: 'p2', messageId: 'm-wrong' });
  soundRun(gm, { manifestEntries: e, extraDeliveries: [{ caseName: 'forged-author-other-player', nonce: 'n-forged-author-other-player', author: 'p1', hookUser: 'p1', claimed: 'p2' }] });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});

await check('R2f2. a case listed twice with different nonces is inconsistent (isolates the duplicate-case gate)', () => {
  const gm = runAs('gm1'); soundRun(gm, { manifestEntries: [...okEntries(), { case: 'forged-author-gm', nonce: 'n-second', outcome: 'rejected', messageId: null, claimedUserId: 'gm1' }] });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});
await check('R2a2. two rejected forgeries sharing one nonce are inconsistent (isolates the unique-nonce gate)', () => {
  const gm = runAs('gm1'); const e = okEntries(); e[2] = { ...e[2], nonce: e[1].nonce };
  soundRun(gm, { manifestEntries: e });
  assert.doesNotMatch(gm.ctx.SWSE_WP3B_GATE1.report('p1').verdict, SOUND);
});

await check('12. the player side sends all four cases, then a manifest whose nonces match what it sent, all whispered to the GMs', async () => {
  const sent = [];
  const create = async (data) => {
    sent.push(data);
    if (data.author && data.author !== 'p1') throw new Error('You may not create a ChatMessage on behalf of another user');
    return { id: `x${sent.length}`, author: { id: 'p1' }, update: async (u) => { sent.push({ update: u }); } };
  };
  const p = runAs('p1', { create });
  await new Promise((r) => setTimeout(r, 30));
  const probes = sent.filter((d) => d.flags).map((d) => d.flags['foundryvtt-swse'].wp3bGate1Probe);
  assert.deepEqual(probes.map((x) => x.case), ['honest', 'forged-author-other-player', 'forged-author-gm', 'claim-only', 'manifest']);
  assert.ok(sent.filter((d) => d.flags).every((d) => JSON.stringify(d.whisper) === JSON.stringify(['gm1'])));
  const manifest = probes.at(-1).manifest;
  for (const c of ['honest', 'forged-author-other-player', 'forged-author-gm', 'claim-only']) {
    const e = manifest.entries.find((x) => x.case === c); assert.ok(e, `manifest has ${c}`);
    assert.equal(e.nonce, probes.find((x) => x.case === c).nonce);
  }
  assert.match(manifest.entries.find((x) => x.case === 'forged-author-gm').outcome, /^rejected/);
  assert.notEqual(manifest.entries.find((x) => x.case === 'claim-only').claimedUserId, 'p1');
  assert.ok(sent.some((d) => d.update), 'tamper update attempted');
  assert.ok(p.logs.some((l) => l.includes('PLAYER RESULTS')));
});

console.log(`\nWP3-B Gate 1 probe logic: ${results.filter(Boolean).length}/${results.length} passed`);
if (results.includes(false)) process.exit(1);
