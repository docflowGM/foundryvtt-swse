/**
 * PR #1147 review corrections UI-01 (fail-closed dialog parsing) and ACK-01 (persistence verified after ActorEngine).
 * Real service/reader/finalizer entitlement check; ActorEngine is a configurable in-memory stub. Node harness only - NOT Foundry V13 acceptance.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document ??= { addEventListener() {}, createElement: () => ({}) };
globalThis.foundry.applications ??= { api: { ApplicationV2: class {}, DialogV2: class {}, HandlebarsApplicationMixin: (b) => b } };
const { character } = await import('./helpers/recon-fixture.mjs');
const { settleDerived } = await import('./helpers/derived-lifecycle-fixture.mjs');
const root = new URL('../', import.meta.url);
const V = await import(new URL('scripts/apps/progression-framework/shell/reconciliation/progression-evidence-review.js', root).href);
const W = await import(new URL('scripts/apps/progression-framework/shell/mutation/ability-evidence-wiring.js', root).href);
const S = await import(new URL('scripts/apps/progression-framework/shell/mutation/ability-acknowledgment-service.js', root).href);
const G = await import(new URL('scripts/apps/progression-framework/shell/mutation/ability-increase-guard.js', root).href);
const { ProgressionFinalizer } = await import(new URL('scripts/apps/progression-framework/shell/progression-finalizer.js', root).href);
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const KEY = G.ABILITY_HISTORY_KEY;
const check = async (name, fn) => { S._resetAcknowledgmentService(); G._resetAbilityIncreaseGuard(); await fn(); console.log(`PASS ${name}`); };
const P1 = { id: 'u1', name: 'Player One', isGM: false }, GM1 = { id: 'gm1', name: 'GM One', isGM: true }, GM2 = { id: 'gm2', name: 'GM Two', isGM: true };
const actorAt = (level, type = 'character') => {
  const a = character({ classes: [['Soldier', level]], type }); a.id = `h-${Math.random().toString(36).slice(2, 7)}`;
  a.system.attributes = Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => [k, { base: 12, racial: 0, enhancement: 0, temp: 0 }]));
  a.system.progression.abilityIncreaseHistory = []; a.system.progression.lastAbilityIncrease = { sentinel: true };
  a.canUserModify = (u) => u.isGM || u.id === 'u1'; return a;
};
const apply = (actor, patch) => { for (const [k, v] of Object.entries(patch)) { const p = k.split('.'); let o = actor; for (const x of p.slice(0, -1)) o = (o[x] ??= {}); o[p.at(-1)] = structuredClone(v); } };
const mk = (actor, updateActor) => ({ engine: { updateActor }, entitlementCheck: (l) => ProgressionFinalizer._abilityEntitlementCheck(actor, l, null), getAllocationMode: () => 'raw_two_different', canModify: W.acknowledgmentCanModify });
const good = (actor) => async (a, patch) => { apply(actor, patch); return { actor }; };
const ack = (actor, deps, inc = { con: 1, wis: 1 }, user = P1) => S.AbilityAcknowledgmentService.acknowledge(actor, { level: 8, increases: inc, user, deps });
const dlg = (confirmed, vals) => ({ querySelector: (sel) => sel.includes('confirm-') ? { checked: confirmed } : (() => { const m = sel.match(/ability-(\w+)/); return m && m[1] in vals ? { value: vals[m[1]] } : null; })() });
const six = (over = {}) => ({ str: '0', dex: '0', con: '0', int: '0', wis: '0', cha: '0', ...over });
const loaders = () => ({ engine: async () => ({ updateActor: async () => ({}) }), finalizer: async () => ProgressionFinalizer, rules: async () => ({ getAbilityIncreaseAllocationMode: () => 'raw_two_different' }) });

await check('1. UI-01: an invalid field mixed with valid ones is reported, never dropped', async () => {
  const r = V.readAcknowledgmentDialog(dlg(true, six({ con: '1', wis: 'abc' })));
  assert.deepEqual(r.invalid, ['wis']); assert.deepEqual(r.increases, { con: 1 });
  for (const bad of ['1.5', '-1', '', ' ', '1e1', '+1', 'NaN', '0x1', '١']) assert.deepEqual(V.readAcknowledgmentDialog(dlg(true, six({ str: bad }))).invalid, ['str'], JSON.stringify(bad));
});
await check('2. UI-01: unreadable / missing inputs refuse; an intentional zero is allowed', async () => {
  assert.deepEqual(V.readAcknowledgmentDialog(dlg(true, { con: '1' })).invalid.sort(), ['cha', 'dex', 'int', 'str', 'wis'], 'missing fields are invalid, not zero');
  assert.deepEqual(V.readAcknowledgmentDialog({ querySelector: () => null }).invalid.length, 6);
  assert.deepEqual(V.readAcknowledgmentDialog(null).invalid, ['dialog']);
  const z = V.readAcknowledgmentDialog(dlg(true, six({ con: '1', wis: '0' }))); assert.deepEqual(z.invalid, []); assert.deepEqual(z.increases, { con: 1 });
  assert.deepEqual(V.readAcknowledgmentDialog(dlg(true, six({ con: 1 }))).increases, { con: 1 }, 'numeric value type accepted');
  assert.equal(V.readAcknowledgmentDialog(dlg(true, six({ con: Infinity }))).invalid.includes('con'), true);
});
await check('3. valid partial acknowledgment persists, and the sheet handler refuses on `invalid` before calling the service', async () => {
  const a = actorAt(9); const res = await ack(a, mk(a, good(a)), { con: 1 }); assert.equal(res.status, 'ok'); assert.match(res.message, /partial/i);
  const src = (await import('node:fs')).readFileSync(new URL('scripts/sheets/v2/character-like-sheet.js', root), 'utf8');
  assert.ok(src.indexOf('chosen.invalid?.length') > 0 && src.indexOf('chosen.invalid?.length') < src.indexOf("runAbilityEvidenceOperation(this.actor, mode, args)"));
});
await check('4. ActorEngine throws: history unchanged -> refused ENGINE_ERROR (no success, no retry)', async () => {
  const a = actorAt(9); let calls = 0;
  const res = await ack(a, mk(a, async () => { calls++; throw new Error('db down'); }));
  assert.equal(res.status, 'refused'); assert.equal(res.code, 'ENGINE_ERROR'); assert.equal(calls, 1); assert.deepEqual(a.system.progression.abilityIncreaseHistory, []);
  // thrown AFTER the write landed: indeterminate, never ok, not retried
  const b = actorAt(9); let n = 0; const r2 = await ack(b, mk(b, async (x, p) => { n++; apply(b, p); throw new Error('late failure'); }));
  assert.equal(r2.status, 'indeterminate'); assert.equal(r2.code, 'WRITE_NOT_CONFIRMED'); assert.equal(n, 1);
});
await check('5. ActorEngine returns without persisting -> indeterminate, not ok, not retried', async () => {
  const a = actorAt(9); let calls = 0;
  const res = await ack(a, mk(a, async () => { calls++; return {}; }));
  assert.equal(res.status, 'indeterminate'); assert.equal(res.code, 'WRITE_NOT_CONFIRMED'); assert.match(res.message, /NOT retried/); assert.equal(calls, 1);
  // persisted something else (partial / altered)
  const b = actorAt(9); const r2 = await ack(b, mk(b, async (x, p) => { apply(b, { [KEY]: p[KEY].map(e => ({ ...e, increases: { str: 1 } })) }); return {}; }));
  assert.equal(r2.status, 'indeterminate');
});
await check('6. ActorEngine reports a prevented update -> not ok', async () => {
  const a = actorAt(9); const res = await ack(a, mk(a, async () => ({ prevented: true, actor: a })));
  assert.equal(res.status, 'refused'); assert.equal(res.code, 'UPDATE_PREVENTED'); assert.deepEqual(a.system.progression.abilityIncreaseHistory, []);
  const b = actorAt(9); const r2 = await ack(b, mk(b, async (x, p) => { apply(b, p); return { prevented: true }; }));
  assert.equal(r2.status, 'indeterminate', 'prevented but present is contradictory, never ok');
});
await check('7. a successful acknowledgment is actually present after persistence, exactly as returned', async () => {
  const a = actorAt(9); const res = await ack(a, mk(a, good(a)));
  assert.equal(res.status, 'ok'); const h = a.system.progression.abilityIncreaseHistory;
  assert.equal(h.length, 1); assert.deepEqual(h[0], res.record); assert.equal(h[0].status, 'active');
});
await check('8. withdraw / correct / GM supersede produce exactly the intended active and inactive records (any GM may act; authorship preserved)', async () => {
  const a = actorAt(9); const deps = mk(a, good(a)); const svc = S.AbilityAcknowledgmentService;
  const first = (await ack(a, deps, { con: 1 })).record;
  const corrected = await svc.correct(a, { acknowledgmentId: first.acknowledgmentId, increases: { wis: 1 }, user: P1, deps }); assert.equal(corrected.status, 'ok');
  let h = a.system.progression.abilityIncreaseHistory; assert.equal(h.length, 2);
  assert.deepEqual(h.map(e => e.status).sort(), ['active', 'superseded']); assert.equal(h.find(e => e.status === 'superseded').supersededBy, corrected.record.acknowledgmentId);
  const gmRec = (await svc.supersede(a, { acknowledgmentId: corrected.record.acknowledgmentId, increases: { str: 1, dex: 1 }, user: GM1, deps })).record;
  assert.equal(gmRec.evidence, 'gm-authorized'); assert.equal(gmRec.attestedBy, 'gm1');
  const w = await svc.withdraw(a, { acknowledgmentId: gmRec.acknowledgmentId, user: GM2, deps }); assert.equal(w.status, 'ok', 'another GM may withdraw');
  h = a.system.progression.abilityIncreaseHistory;
  const wr = h.find(e => e.acknowledgmentId === gmRec.acknowledgmentId); assert.equal(wr.status, 'withdrawn'); assert.equal(wr.attestedBy, 'gm1', 'original author preserved'); assert.equal(wr.withdrawnBy, 'gm2');
  assert.equal(h.filter(e => e.status === 'active').length, 0); assert.equal(h.length, 3);
  // the 'ok' for each op above was only returned because the persisted history matched; a no-persist engine on withdraw is indeterminate
  const b = actorAt(9); const d1 = mk(b, good(b)); const rec = (await ack(b, d1, { con: 1 })).record;
  const wd = await svc.withdraw(b, { acknowledgmentId: rec.acknowledgmentId, user: P1, deps: mk(b, async () => ({})) }); assert.equal(wd.status, 'indeterminate');
  assert.equal(b.system.progression.abilityIncreaseHistory[0].status, 'active');
});
await check('9. no operation changes any ability score or lastAbilityIncrease; only the history key is patched', async () => {
  const a = actorAt(9); const patches = []; const attrs = JSON.stringify(a.system.attributes), last = JSON.stringify(a.system.progression.lastAbilityIncrease);
  const deps = mk(a, async (x, p) => { patches.push(p); apply(a, p); return {}; }); const svc = S.AbilityAcknowledgmentService;
  const r1 = (await ack(a, deps, { con: 1 })).record; const r2 = (await svc.correct(a, { acknowledgmentId: r1.acknowledgmentId, increases: { wis: 1 }, user: P1, deps })).record;
  const r3 = (await svc.supersede(a, { acknowledgmentId: r2.acknowledgmentId, increases: { str: 1 }, user: GM1, deps })).record; await svc.withdraw(a, { acknowledgmentId: r3.acknowledgmentId, user: GM1, deps });
  assert.equal(patches.length, 4); assert.ok(patches.every(p => Object.keys(p).join() === KEY));
  assert.equal(JSON.stringify(a.system.attributes), attrs); assert.equal(JSON.stringify(a.system.progression.lastAbilityIncrease), last);
});
await check('10. droid review never advertises an unresolved count as certified; GM wording is a recorded statement; wired op reports indeterminate faithfully', async () => {
  const d = actorAt(9, 'droid'); const rev = V.buildProgressReview(ProgressionReconciler.safeReconcileActor(settleDerived(d), { output: 'report', fresh: true }), d, { user: GM1 });
  for (const r of rev.rows) { assert.equal(r.rulesDeferred, true); assert.equal(r.expectedLabel, 'Entitlement count pending rules review'); assert.match(r.summary, /pending rules review/); assert.equal(r.canAcknowledge || r.canApply, false); assert.notEqual(r.state, 'system-verified'); assert.doesNotMatch(r.expectedLabel + r.summary, /\b\d+ increases?\b/); }
  const a = actorAt(9); const g = mk(a, good(a)); const rec = (await S.AbilityAcknowledgmentService.acknowledge(a, { level: 8, increases: { con: 1 }, user: GM1, origin: 'gm', deps: g })).record;
  assert.equal(rec.evidence, 'gm-authorized'); const row = V.buildProgressReview(ProgressionReconciler.safeReconcileActor(settleDerived(a), { output: 'report', fresh: true }), a, { user: GM2 }).rows.find(x => x.level === 8);
  assert.match(row.records[0].sourceText, /GM-authorized acknowledgment .*recorded statement, not verification/); assert.notEqual(row.state, 'system-verified');
  assert.match(V.buildAcknowledgmentDialogContent({ label: 'x', entitledCount: 2, gm: true }), /GM-authorized acknowledgment.*does not prove/);
  const res = await W.runAbilityEvidenceOperation(actorAt(9), 'acknowledge', { level: 8, increases: { con: 1 } }, { user: P1, loaders: loaders() });
  assert.equal(res.status, 'indeterminate', 'the production-wired path surfaces an unpersisted write');
});
console.log('ALL PASS');
