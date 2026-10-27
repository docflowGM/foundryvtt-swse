/**
 * WP3-B Gate 1 — offline check of the identity probe's own logic (tools/foundry-runtime-probes/wp3b-gate1-identity-probe.js).
 *
 * This does NOT verify Foundry. It verifies that the probe (a) sends the intended player cases and (b) only reports
 * IDENTITY_MECHANISM_OBSERVED_SOUND when the observed server behaviour really is sound, so a real run cannot produce a
 * false "verified". The server is simulated by feeding the GM-side hooks what a given server would deliver.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../tools/foundry-runtime-probes/wp3b-gate1-identity-probe.js', import.meta.url), 'utf8');
const users = [
  { id: 'gm1', isGM: true }, { id: 'p1', isGM: false }, { id: 'p2', isGM: false },
];
const flatten = (o, pre = '', out = {}) => { for (const [k, v] of Object.entries(o ?? {})) { const p = pre ? `${pre}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out); else out[p] = v; } return out; };

function runAs(userId, { create } = {}) {
  const hooks = {};
  const logs = [];
  const ctx = {
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
    Hooks: { on: (n, fn) => { (hooks[n] ??= []).push(fn); } },
    foundry: { utils: { randomID: () => Math.random().toString(36).slice(2, 18), flattenObject: flatten } },
    ChatMessage: { create: create ?? (async () => null), deleteDocuments: async () => [] },
    game: {
      ready: true, version: '13.test', release: { generation: 13, build: 999 }, system: { id: 'foundryvtt-swse', version: 'test' },
      user: users.find((u) => u.id === userId), users: Object.assign([...users], { find: Array.prototype.find, filter: Array.prototype.filter }),
      messages: { filter: () => [] },
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { ctx, hooks, logs };
}
const deliver = (gm, { caseName, sender, claimed, author, hookUser }) => {
  const msg = { id: `m-${caseName}-${Math.random()}`, author: { id: author, isGM: users.find((u) => u.id === author)?.isGM },
    flags: { 'foundryvtt-swse': { wp3bGate1Probe: { case: caseName, nonce: 'n', senderUserId: sender, claimedUserId: claimed } } } };
  for (const fn of gm.hooks.createChatMessage ?? []) fn(msg, {}, hookUser);
  return msg;
};
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(true); console.log(`  PASS  ${name}`); }
  catch (e) { results.push(false); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
}

await check('1. a sound server (forged author rejected, author and hook user equal the real sender) is reported as observed sound', () => {
  const gm = runAs('gm1');
  deliver(gm, { caseName: 'honest', sender: 'p1', claimed: 'p1', author: 'p1', hookUser: 'p1' });
  deliver(gm, { caseName: 'claim-only', sender: 'p1', claimed: 'p2', author: 'p1', hookUser: 'p1' });
  const r = gm.ctx.SWSE_WP3B_GATE1.report();
  assert.equal(r.verdict, 'IDENTITY_MECHANISM_OBSERVED_SOUND (this world, this build)');
  assert.equal(r.checks.forgedAuthorDeliveredCount, 0);
});

await check('2. a server that stores a forged author is NOT_VERIFIED', () => {
  const gm = runAs('gm1');
  deliver(gm, { caseName: 'honest', sender: 'p1', claimed: 'p1', author: 'p1', hookUser: 'p1' });
  deliver(gm, { caseName: 'forged-author-other-player', sender: 'p1', claimed: 'p2', author: 'p2', hookUser: 'p1' });
  deliver(gm, { caseName: 'claim-only', sender: 'p1', claimed: 'p2', author: 'p1', hookUser: 'p1' });
  const r = gm.ctx.SWSE_WP3B_GATE1.report();
  assert.equal(r.verdict, 'NOT_VERIFIED'); assert.equal(r.checks.forgedAuthorNeverAccepted, false);
});

await check('3. a hook user id that differs from the real sender is NOT_VERIFIED', () => {
  const gm = runAs('gm1');
  deliver(gm, { caseName: 'honest', sender: 'p1', claimed: 'p1', author: 'p1', hookUser: 'gm1' });
  assert.equal(gm.ctx.SWSE_WP3B_GATE1.report().verdict, 'NOT_VERIFIED');
});

await check('4. no delivered honest request is NOT_VERIFIED (absence of evidence is not verification)', () => {
  const gm = runAs('gm1');
  assert.equal(gm.ctx.SWSE_WP3B_GATE1.report().verdict, 'NOT_VERIFIED');
});

await check('5. a forged author silently rewritten to the true sender still counts as sound (the stored author is the truth)', () => {
  const gm = runAs('gm1');
  deliver(gm, { caseName: 'honest', sender: 'p1', claimed: 'p1', author: 'p1', hookUser: 'p1' });
  deliver(gm, { caseName: 'forged-author-gm', sender: 'p1', claimed: 'gm1', author: 'p1', hookUser: 'p1' });
  deliver(gm, { caseName: 'claim-only', sender: 'p1', claimed: 'p2', author: 'p1', hookUser: 'p1' });
  assert.match(gm.ctx.SWSE_WP3B_GATE1.report().verdict, /OBSERVED_SOUND/);
});

await check('6. the player side sends honest, two forged-author, claim-only and a tamper update, all whispered to the GMs', async () => {
  const sent = [];
  const create = async (data) => { sent.push(data); return { id: `x${sent.length}`, author: { id: data.author ?? 'p1' }, update: async (u) => { sent.push({ update: u }); } }; };
  const p = runAs('p1', { create });
  await new Promise((r) => setTimeout(r, 20));
  const cases = sent.filter((d) => d.flags).map((d) => d.flags['foundryvtt-swse'].wp3bGate1Probe.case);
  assert.deepEqual(cases, ['honest', 'forged-author-other-player', 'forged-author-gm', 'claim-only']);
  assert.ok(sent.filter((d) => d.flags).every((d) => JSON.stringify(d.whisper) === JSON.stringify(['gm1'])));
  assert.equal(sent.find((d) => d.flags?.['foundryvtt-swse'].wp3bGate1Probe.case === 'forged-author-other-player').author, 'p2');
  assert.ok(sent.some((d) => d.update), 'tamper update attempted');
  assert.ok(p.logs.some((l) => l.includes('PLAYER RESULTS')));
});

console.log(`\nWP3-B Gate 1 probe logic: ${results.filter(Boolean).length}/${results.length} passed`);
if (results.includes(false)) process.exit(1);
