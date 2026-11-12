/**
 * Checkpoint E - Character Review integration (display model, production wiring, handler/template wiring).
 * Real reader, real reconciler, real service and real finalizer entitlement check; ActorEngine is an in-memory stub.
 * Node harness only - this is NOT Foundry V13 acceptance (no DOM, no AppV2 rendering, no permission model of a real world).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { ProgressionFinalizer } = await import(new URL('scripts/apps/progression-framework/shell/progression-finalizer.js', root).href);
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const check = async (name, fn) => { S._resetAcknowledgmentService(); G._resetAbilityIncreaseGuard(); await fn(); console.log(`PASS ${name}`); };
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');

const P1 = { id: 'u1', name: 'Player One', isGM: false }, P2 = { id: 'u2', name: 'Player Two', isGM: false }, GM = { id: 'gm', name: 'GM', isGM: true };
const actorAt = (level, history = [], type = 'character') => {
  const a = character({ classes: [['Soldier', level]], type });
  a.id = `ui-actor-${Math.random().toString(36).slice(2, 7)}`;
  a.system.attributes = Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => [k, { base: 12, racial: 0, enhancement: 0, temp: 0 }]));
  a.system.progression.abilityIncreaseHistory = history;
  a.canUserModify = (u) => u.isGM || u.id === 'u1';
  return a;
};
const sysRec = (level, inc, extra = {}) => ({ level, characterLevel: level, entitlementId: `ability-increase-level-${level}`, transactionId: `abtx-${level}`, increases: inc, source: 'progression-finalizer', timestamp: 't', ...extra });
const engine = { updateActor: async (actor, patch) => { patches.push(patch); for (const [k, v] of Object.entries(patch)) { const p = k.split('.'); let o = actor; for (const x of p.slice(0, -1)) o = (o[x] ??= {}); o[p.at(-1)] = structuredClone(v); } actor._stats = { modifiedTime: (actor._stats?.modifiedTime || 1) + 1 }; } };
let patches = [];
const loaders = (over = {}) => ({ engine: async () => engine, finalizer: async () => ProgressionFinalizer, rules: async () => ({ getAbilityIncreaseAllocationMode: () => 'raw_two_different' }), ...over });
const report = (a) => ProgressionReconciler.safeReconcileActor(settleDerived(a), { output: 'report', fresh: true });
const rowFor = (a, user = P1, level = 8) => V.buildProgressReview(report(a), a, { user }).rows.find(r => r.level === level);

await check('E1. the five display states map from the canonical classification, and history alone never yields a confirmed discrepancy', async () => {
  assert.equal(rowFor(actorAt(9)).state, 'not-verified');
  assert.equal(rowFor(actorAt(9, [sysRec(8, { str: 1, dex: 1 }, { verification: { state: 'verified' } })])).state, 'system-verified');
  assert.equal(rowFor(actorAt(9, [sysRec(8, { str: 1, dex: 1 })])).state, 'not-verified', 'unverified system record is not "verified"');
  const a = actorAt(9); await S.AbilityAcknowledgmentService.acknowledge(a, { level: 8, increases: { con: 1 }, user: P1, deps: { engine, entitlementCheck: (l) => ProgressionFinalizer._abilityEntitlementCheck(a, l, null), getAllocationMode: () => 'raw_two_different', canModify: W.acknowledgmentCanModify } });
  assert.equal(rowFor(a).state, 'partially-acknowledged');
  assert.equal(V.evidenceStateFor('CONFIRMED_DISCREPANCY'), 'confirmed-discrepancy');
  for (const h of [[], [sysRec(8, { str: 1 })], [sysRec(8, { str: 1, dex: 1 })]]) assert.notEqual(rowFor(actorAt(9, h)).state, 'confirmed-discrepancy');
  assert.equal(V.buildProgressReview(report(actorAt(9)), actorAt(9)).rows[0].stateText.length > 0, true);
});

await check('E2. actions: Apply only when nothing is on record; Already Applied only while capacity remains; deferred (droid) offers neither', async () => {
  const none = rowFor(actorAt(9)); assert.equal(none.canApply, true); assert.equal(none.canAcknowledge, true);
  const partial = rowFor(actorAt(9, [sysRec(8, { str: 1 })])); assert.equal(partial.canApply, false, 'any record blocks additive Apply'); assert.equal(partial.canAcknowledge, true);
  const full = rowFor(actorAt(9, [sysRec(8, { str: 1, dex: 1 }, { verification: { state: 'verified' } })])); assert.equal(full.canApply, false); assert.equal(full.canAcknowledge, false);
  const droid = rowFor(actorAt(9, [], 'droid')); assert.equal(droid.rulesDeferred, true); assert.equal(droid.canApply, false); assert.equal(droid.canAcknowledge, false);
});

await check('E3. record controls: author/GM may correct and withdraw, a non-author may not, only a GM may supersede; inactive records are shown but inert', async () => {
  const a = actorAt(9); await S.AbilityAcknowledgmentService.acknowledge(a, { level: 8, increases: { con: 1 }, user: P1, deps: { engine, entitlementCheck: (l) => ProgressionFinalizer._abilityEntitlementCheck(a, l, null), getAllocationMode: () => 'raw_two_different', canModify: W.acknowledgmentCanModify } });
  const asAuthor = rowFor(a, P1).records[0], asOther = rowFor(a, P2).records[0], asGM = rowFor(a, GM).records[0];
  assert.deepEqual([asAuthor.canCorrect, asAuthor.canWithdraw, asAuthor.canSupersede], [true, true, false]);
  assert.deepEqual([asOther.canCorrect, asOther.canWithdraw, asOther.canSupersede], [false, false, false]);
  assert.deepEqual([asGM.canCorrect, asGM.canWithdraw, asGM.canSupersede], [true, true, true]);
  a.system.progression.abilityIncreaseHistory[0].status = 'withdrawn'; a.system.progression.abilityIncreaseHistory[0].withdrawnByName = 'Player One';
  const inactive = rowFor(a, GM).records[0]; assert.equal(inactive.inactive, true); assert.equal(inactive.canWithdraw || inactive.canCorrect || inactive.canSupersede, false); assert.match(inactive.note, /withdrawn by Player One/);
});

await check('E4. production wiring fails closed when ANY dependency is missing; nothing is written', async () => {
  const a = actorAt(9);
  const cases = [
    ['no user', { user: null }, 'NO_ACTIVE_USER'],
    ['no engine', { user: P1, loaders: loaders({ engine: async () => ({}) }) }, 'ENGINE_UNAVAILABLE'],
    ['no entitlement authority', { user: P1, loaders: loaders({ finalizer: async () => ({}) }) }, 'ENTITLEMENT_UNVALIDATED'],
    ['no allocation rule', { user: P1, loaders: loaders({ rules: async () => ({}) }) }, 'ALLOCATION_RULE_UNKNOWN'],
    ['loader throws', { user: P1, loaders: loaders({ engine: async () => { throw new Error('boom'); } }) }, 'DEPENDENCIES_UNAVAILABLE'],
  ];
  patches = [];
  for (const [name, opts, code] of cases) {
    const res = await W.runAbilityEvidenceOperation(a, 'acknowledge', { level: 8, increases: { con: 1 } }, opts);
    assert.equal(res.status, 'refused', name); assert.equal(res.code, code, name);
  }
  assert.equal((await W.runAbilityEvidenceOperation(a, 'bogus', {}, { user: P1, loaders: loaders() })).code, 'UNKNOWN_OPERATION');
  assert.equal(patches.length, 0); assert.deepEqual(a.system.progression.abilityIncreaseHistory, []);
  // permission cannot be established -> not allowed
  assert.equal(W.acknowledgmentCanModify({}, P1), false); assert.equal(W.acknowledgmentCanModify(a, { id: 'x' }), false); assert.equal(W.acknowledgmentCanModify(a, null), false);
});

await check('E5. wired acknowledge / correct / withdraw / supersede go through the engine, touch ONLY the history, never a score; the entitlement authority is the finalizer', async () => {
  const a = actorAt(9); patches = []; const attrs = JSON.stringify(a.system.attributes);
  const opts = (user) => ({ user, loaders: loaders() });
  let res = await W.runAbilityEvidenceOperation(a, 'acknowledge', { level: 8, increases: { con: 1 } }, opts(P1)); assert.equal(res.status, 'ok', JSON.stringify(res));
  const id = res.record.acknowledgmentId;
  res = await W.runAbilityEvidenceOperation(a, 'correct', { acknowledgmentId: id, increases: { wis: 1 } }, opts(P1)); assert.equal(res.status, 'ok', JSON.stringify(res));
  const id2 = res.record.acknowledgmentId;
  res = await W.runAbilityEvidenceOperation(a, 'supersede', { acknowledgmentId: id2, increases: { str: 1, dex: 1 } }, opts(P1)); assert.equal(res.code, 'NOT_AUTHORIZED', 'a player cannot supersede');
  res = await W.runAbilityEvidenceOperation(a, 'supersede', { acknowledgmentId: id2, increases: { str: 1, dex: 1 } }, opts(GM)); assert.equal(res.status, 'ok', JSON.stringify(res));
  const id3 = res.record.acknowledgmentId;
  res = await W.runAbilityEvidenceOperation(a, 'withdraw', { acknowledgmentId: id3 }, opts(P2)); assert.equal(res.code, 'NOT_AUTHORIZED', 'non-author, non-GM');
  res = await W.runAbilityEvidenceOperation(a, 'withdraw', { acknowledgmentId: id3 }, opts(GM)); assert.equal(res.status, 'ok');
  assert.ok(patches.length >= 4 && patches.every(p => Object.keys(p).length === 1 && Object.keys(p)[0] === G.ABILITY_HISTORY_KEY));
  assert.equal(JSON.stringify(a.system.attributes), attrs);
  const hist = a.system.progression.abilityIncreaseHistory;
  assert.equal(hist.filter(e => e.status === 'active').length, 0, 'everything inactive after withdrawal'); assert.ok(hist.length >= 3, 'originals preserved');
  assert.equal(rowFor(a, GM).state, 'not-verified');
});

await check('E6. memoized reconciliation refreshes after a write (actor stamp is part of the key); the report-level display reflects it without a manual cache clear', async () => {
  const a = actorAt(9); a._stats = { modifiedTime: 100 }; settleDerived(a);
  const memoRow = () => V.buildProgressReview(ProgressionReconciler.safeReconcileActor(a, { output: 'report' }), a, { user: P1 }).rows.find(r => r.level === 8);
  assert.equal(memoRow().state, 'not-verified'); assert.equal(memoRow().state, 'not-verified');
  const res = await W.runAbilityEvidenceOperation(a, 'acknowledge', { level: 8, increases: { con: 1, wis: 1 } }, { user: P1, loaders: loaders() });
  assert.equal(res.status, 'ok'); settleDerived(a);
  assert.equal(memoRow().state, 'manually-acknowledged');
});

await check('E7. Silent Success: unverifiable / partial / manual history raises no finding and no header `!`; Ignore is never completion evidence', async () => {
  const a = actorAt(9); const r0 = report(a);
  const unverifiable = r0.slots.abilityIncreases.find(s => s.characterLevel === 8); assert.equal(unverifiable.status, 'unverifiable');
  assert.equal(F.buildFindings(r0).some(f => f.id === 'slot:ability-increase-level-8'), false, 'unverifiable is not a finding');
  // ignoring some other finding record cannot make the entitlement look complete
  const withIgnore = actorAt(9); withIgnore.flags = { swse: { reconciliationIgnored: [{ id: 'slot:ability-increase-level-8', title: 'x' }] } };
  assert.equal(rowFor(withIgnore).state, 'not-verified'); assert.equal(rowFor(withIgnore).canAcknowledge, true);
  const src = read('scripts/apps/progression-framework/shell/reconciliation/progression-evidence-review.js');
  assert.equal(/reconciliationIgnored|IGNORE_FLAG/.test(src), false, 'review model never consults Ignore');
});

await check('E8. confirmation dialog: states the exact entitlement, allows partial, says no score changes, requires explicit confirm; unconfirmed/unreadable is never consent', async () => {
  const html = V.buildAcknowledgmentDialogContent({ label: 'Level 8 Ability Increase', entitledCount: 2, remaining: 2, cap: 1 });
  assert.match(html, /grants <strong>2<\/strong> ability increases/); assert.match(html, /No ability score, HP, or other statistic will be changed/); assert.match(html, /partial acknowledgment/);
  assert.match(html, /name="confirm-acknowledge"/); assert.equal((html.match(/name="ability-/g) || []).length, 6);
  assert.match(V.buildAcknowledgmentDialogContent({ label: 'x<script>', entitledCount: 2 }), /x&lt;script&gt;/, 'label escaped');
  const mk = (confirmed, vals) => ({ querySelector: (sel) => sel.includes('confirm-') ? { checked: confirmed } : (sel.match(/ability-(\w+)/) ? { value: String(vals[sel.match(/ability-(\w+)/)[1]] ?? 0) } : null) });
  assert.deepEqual(V.readAcknowledgmentDialog(mk(true, { con: 1 })), { confirmed: true, increases: { con: 1 }, invalid: [] });
  assert.equal(V.readAcknowledgmentDialog(mk(false, { con: 1 })).confirmed, false);
  assert.deepEqual(V.readAcknowledgmentDialog(null), { confirmed: false, increases: {}, invalid: ['dialog'] });
  assert.deepEqual(V.readAcknowledgmentDialog([mk(true, { str: 2 })]).increases, { str: 2 }, 'jQuery-style wrapper');
  // invalid amounts are not clamped: the service rejects them
  const a = actorAt(9); const res = await W.runAbilityEvidenceOperation(a, 'acknowledge', { level: 8, increases: V.readAcknowledgmentDialog(mk(true, { str: 5 })).increases }, { user: P1, loaders: loaders() });
  assert.equal(res.status, 'refused'); assert.equal(a.system.progression.abilityIncreaseHistory.length, 0);
});

await check('E9. static wiring: neutral Review Progress buttons (no `!`/alert), overlay section, handlers, no Ignore in the progress section, no Q8 prompt', async () => {
  const ch = read('templates/actors/character/v2-concept/partials/frame/header-block.hbs'), dh = read('templates/actors/droid/v2/partials/frame/header-block.hbs');
  for (const t of [ch, dh]) { const m = t.match(/<button[^>]*open-progress-review[^>]*>[^<]*<\/button>/); assert.ok(m, 'button present'); assert.equal(/alert|!</.test(m[0]), false); assert.match(m[0], /Review Progress/); }
  const ov = read('templates/shell/partials/shell-overlay-layer.hbs'); const sec = ov.slice(ov.indexOf('data-progress-review'), ov.indexOf('{{#if vm.ignored.length}}'));
  for (const a of ['acknowledge-ability-increase', 'apply-ability-increase', 'correct-acknowledgment', 'withdraw-acknowledgment', 'supersede-acknowledgment']) assert.ok(sec.includes(`data-action="${a}"`), a);
  assert.equal(/ignore-finding/.test(sec), false); assert.match(sec, /Already Applied/); assert.match(sec, /Apply Increases/);
  const sheet = read('scripts/sheets/v2/character-like-sheet.js');
  for (const a of ['acknowledge-ability-increase', 'apply-ability-increase', 'correct-acknowledgment', 'withdraw-acknowledgment', 'supersede-acknowledgment']) assert.ok(sheet.includes(`[data-action="${a}"]`), a);
  assert.match(sheet, /_handleProgressEvidenceAction/); assert.match(sheet, /runAbilityEvidenceOperation/);
  assert.equal(/actor\.update\(|setFlag\(/.test(sheet.slice(sheet.indexOf('_handleProgressEvidenceAction(dataset'), sheet.indexOf('async _handleReconciliationAction'))), false, 'no direct actor mutation in the evidence handler');
  assert.match(read('scripts/sheets/v2/actor-sheet-base.js'), /open-progress-review/);
  assert.match(read('scripts/ui/shell/ShellSurfaceRegistry.js'), /buildProgressReview/);
  assert.equal(/associate.*(entitlement|direct)/i.test(sheet + ov), false, 'Q8 prompt not implemented');
});
console.log('ALL PASS');
