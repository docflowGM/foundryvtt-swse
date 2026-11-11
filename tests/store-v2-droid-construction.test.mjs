import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Store-originated custom Droid: the price, grants and delivered components all come from the shared construction-quote
// authority, re-derived from identities at the approval boundary. Real DROID_SYSTEMS data; Foundry runtime is RUNTIME_UNVERIFIED.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'u1' }, actors: { get: () => null }, users: [] } });
globalThis.foundry.utils ??= {};
const Q = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-build-quote.js');
const K = await import('/systems/foundryvtt-swse/scripts/engine/store/store-droid-construction.js');
const { DROID_SYSTEMS } = await import('/systems/foundryvtt-swse/scripts/data/droid-systems.js');
const { quoteDroidBuilderSelection } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-builder-quote-consumer.js');
const { DroidFactory } = await import('/systems/foundryvtt-swse/scripts/engine/droids/droid-factory.js');
let n = 0; const ok = m => console.log(`  [${++n}] ${m} OK`);
const read = f => fs.readFileSync(f, 'utf8');

// ---- fixtures from real data -------------------------------------------------------------------------------------------
const baseline = () => ({ droidSize: 'medium', droidDegree: '2nd-degree', droidSystems: { locomotion: { id: 'walking' }, processor: { id: 'heuristic' }, appendages: [{ id: 'hand-1' }, { id: 'hand-2' }] } });
const priced = (list, size = 'medium', cat) => list.find(d => { const q = quoteDroidBuilderSelection({ definition: d, category: cat, size, droidSystems: {}, speed: cat === 'locomotion' ? (d.speeds?.[size] ?? d.baseSpeed?.[size] ?? null) : null }); return q.status === 'OK' && q.credits > 0; });
const loco = priced(DROID_SYSTEMS.locomotion.filter(l => l.id !== 'walking'), 'medium', 'locomotion');
let acc = null;
for (const [category, list] of Object.entries(DROID_SYSTEMS.accessories)) {
  const d = list.find(x => { const q = quoteDroidBuilderSelection({ definition: x, category: 'accessory', subcategory: category, size: 'medium', droidSystems: {} }); return q.status === 'OK' && q.credits > 0; }); if (d) { acc = { id: d.id, category, def: d }; break; }
}
assert.ok(loco && acc, 'fixture components exist (paid non-default locomotion, paid accessory)');
const withExtra = () => { const b = baseline(); b.droidSystems.locomotion = { id: loco.id }; b.droidSystems.appendages.push({ id: 'hand' }); b.droidSystems.accessories = [{ id: acc.id, category: acc.category }]; return b; };
const one = (def, cat, sub = null) => quoteDroidBuilderSelection({ definition: def, category: cat, subcategory: sub, size: 'medium', droidSystems: {}, speed: cat === 'locomotion' ? (def.speeds?.medium ?? def.baseSpeed?.medium ?? null) : null }).credits;
const handCost = one(DROID_SYSTEMS.appendages.find(a => a.id === 'hand'), 'appendage');
const expected = () => one(loco, 'locomotion') + handCost + one(acc.def, 'accessory', acc.category);

// 1. valid construction + legitimate grants
{
  const q = Q.quoteDroidBuild(baseline());
  assert.equal(q.status, 'OK'); assert.equal(q.totalCredits, 0, 'a baseline-only chassis is entirely granted');
  assert.deepEqual(q.grants.map(g => g.grant).sort(), ['default-locomotion', 'free-hand', 'free-hand', 'heuristic-processor']);
  const e = Q.quoteDroidBuild(withExtra());
  assert.equal(e.status, 'OK');
  assert.equal(e.totalCredits, expected(), 'x');
  assert.ok(e.lines.filter(l => l.grant).every(l => l.credits === 0) && e.provenance.snapshotHash);
  ok(`valid build quotes ${e.totalCredits} cr; baseline grants (default locomotion, heuristic processor, two hands) are recognised from identities`);
}
// 2. forged grant flags / manipulated prices are ignored
{
  const clean = Q.quoteDroidBuild(withExtra());
  const forged = withExtra();
  forged.droidSystems.locomotion = { id: loco.id, cost: 0, isGranted: true, isDefault: true, isLocked: true, quoteStatus: 'OK' };
  forged.droidSystems.accessories = [{ id: acc.id, category: acc.category, cost: 0, isGranted: true, isDefault: true }];
  forged.droidSystems.appendages = [{ id: 'hand-1', cost: 0, isGranted: true }, { id: 'hand-2', cost: 0, isGranted: true }, { id: 'hand', cost: 0, isGranted: true }, { id: 'hand', cost: 0, isGranted: true, isDefault: true }];
  forged.droidSystems.totalCost = 0; forged.droidCredits = { base: 99999, spent: 0, remaining: 99999 };
  const f = Q.quoteDroidBuild(forged);
  assert.equal(f.status, 'OK');
  assert.equal(f.totalCredits, clean.totalCredits + handCost, 'only two hands are ever free; a 4th hand with forged flags is charged');
  assert.equal(f.lines.find(l => l.group === 'locomotion').grant, null, 'a forged isGranted flag does not make a paid locomotion free');
  assert.equal(f.lines.find(l => l.group === 'accessory').grant, null, 'a forged isGranted flag does not make a paid accessory free');
  const cheap = withExtra(); cheap.droidSystems.accessories = [{ id: acc.id, category: acc.category, cost: 1, weight: 0 }];
  assert.equal(Q.quoteDroidBuild(cheap).totalCredits, clean.totalCredits, 'client-supplied component prices are never read');
  ok('forged isGranted/isDefault flags, zeroed costs, totals and budget fields do not change the quote (only 2 hands are free)');
}
// 3. invalid snapshots fail closed
{
  for (const [label, mutate, status] of [
    ['unknown size', b => { b.droidSize = 'enormous'; }, 'BLOCKED'],
    ['missing size', b => { delete b.droidSize; }, 'BLOCKED'],
    ['unknown component', b => { b.droidSystems.processor = { id: 'not-a-processor' }; }, 'BLOCKED'],
    ['component without identity', b => { b.droidSystems.appendages.push({ cost: 0 }); }, 'BLOCKED'],
    ['duplicate accessory', b => { b.droidSystems.accessories = [{ id: 'a', category: 'x' }, { id: 'a', category: 'x' }]; }, 'BLOCKED'],
    ['missing processor', b => { b.droidSystems.processor = null; }, 'INCOMPLETE'],
    ['no appendage', b => { b.droidSystems.appendages = []; }, 'INCOMPLETE']
  ]) { const b = withExtra(); mutate(b); assert.equal(Q.quoteDroidBuild(b).status, status, label); assert.equal(Q.quoteDroidBuild(b).totalCredits, null, `${label}: no total`); }
  const req = (sel, extra = {}) => K.buildDroidConstructionRequest({ selection: sel, name: 'D', ownerActor: { id: 'a1', name: 'Buyer' }, userId: 'u1', ...extra });
  assert.equal(req(baseline()).ok, false); assert.ok(req(baseline()).reasons.includes('QUOTE_HAS_NO_PURCHASABLE_COMPONENTS'), 'a zero-cost build is never a free Store droid');
  const bad = withExtra(); bad.droidSystems.processor = { id: 'zzz' }; assert.equal(req(bad).ok, false);
  assert.equal(req({ ...withExtra(), speciesDroidBuilder: { bonusEquipmentChoices: 5 } }).ok, false, 'a species constraint carried by the client is refused for Store construction');
  assert.equal(K.buildDroidConstructionRequest({ selection: withExtra(), ownerActor: null }).ok, false);
  ok('unknown size/component, missing identity, duplicates, incomplete builds, zero-cost builds and client species context are all refused');
}
// 4. request -> approval boundary: stale / tampered quotes
let record;
{
  const built = K.buildDroidConstructionRequest({ selection: withExtra(), name: 'Rusty', ownerActor: { id: 'a1', name: 'Buyer' }, userId: 'u1', requestId: 'req1' });
  assert.equal(built.ok, true); record = built.record;
  assert.equal(record.costCredits, expected()); assert.equal(record.approvalItems[0].finalCost, record.costCredits);
  assert.equal(record.buildSnapshot.locomotion, loco.id);
  assert.equal(JSON.stringify(record).includes('isGranted'), false, 'no client flags are stored in the request');
  const v = K.verifyDroidConstructionApproval(record); assert.equal(v.ok, true); assert.equal(v.total, record.costCredits);
  const clone = () => JSON.parse(JSON.stringify(record));
  const stale = clone(); stale.costCredits = 1; assert.ok(K.verifyDroidConstructionApproval(stale).reasons.some(r => r.startsWith('QUOTE_CHANGED')), 'edited total (GM inline edit or tamper) is refused');
  const line = clone(); line.approvalItems[0].finalCost = 1; assert.ok(K.verifyDroidConstructionApproval(line).reasons.includes('APPROVAL_LINE_DOES_NOT_MATCH_QUOTE'));
  const snap = clone(); snap.buildSnapshot.locomotion = 'walking'; assert.ok(K.verifyDroidConstructionApproval(snap).reasons.length > 0, 'a swapped component after quoting is refused');
  const snap2 = clone(); snap2.buildSnapshot.appendages.push('hand'); assert.equal(K.verifyDroidConstructionApproval(snap2).ok, false, 'an added component after quoting is refused');
  const unknown = clone(); unknown.buildSnapshot.accessories = [{ id: 'free-everything', category: 'x' }]; assert.equal(K.verifyDroidConstructionApproval(unknown).ok, false);
  const wrongKind = clone(); wrongKind.approvalKind = 'store-policy-item'; assert.equal(K.verifyDroidConstructionApproval(wrongKind).ok, false);
  ok('approval re-quotes from stored identities: edited total, edited line, swapped/added/unknown components and wrong kind are all refused');
}
// 5. delivered droid is rebuilt from the re-quote; ownership/provenance; non-stock factory path
{
  const v = K.verifyDroidConstructionApproval(record);
  const data = K.buildCustomDroidActorData({ quote: v.quote, name: 'Rusty', approvalId: 'req1', owner: { id: 'a1', name: 'Buyer' } });
  assert.equal(data.type, 'droid'); assert.equal(data.system.droidSystems.stateMode, 'FINALIZED');
  assert.equal(data.system.droidSystems.totalCost, record.costCredits);
  assert.equal(data.system.droidSystems.locomotion.id, loco.id); assert.equal(data.system.droidSystems.appendages.length, 3);
  assert.equal(data.system.storeAcquisition.ownerActorId, 'a1'); assert.equal(data.system.storeAcquisition.approvalId, 'req1');
  const plan = DroidFactory.buildMutationPlan({ droidActor: data, name: 'Rusty' });
  const created = plan.create.actors[0].data;
  assert.equal(created.type, 'droid'); assert.equal(created._id, undefined);
  assert.notEqual(created.system.droidCalculationMode, 'stock-statblock', 'a custom droid is not a stock statblock');
  assert.equal(created.system.droidSystems.locomotion.id, loco.id);
  ok('delivered Droid data is rebuilt from the re-quote (components, total, owner, approval id) and passes the factory as a custom droid');
}
// 6. launch authorization: one-shot, user- and actor-bound, expiring (Store-origin proof)
{
  K._resetStoreDroidConstructionTokens();
  const t = K.beginStoreDroidConstruction({ id: 'a1' }, 'u1', 1000);
  assert.equal(K.consumeStoreDroidConstructionToken('forged', 'u1', 1000), null, 'unknown token');
  assert.equal(K.consumeStoreDroidConstructionToken(t, 'u2', 1000), null, 'wrong user');
  assert.equal(K.consumeStoreDroidConstructionToken(t, 'u1', 1000), null, 'a token consumed once (even by the wrong user) is gone: no replay');
  const t2 = K.beginStoreDroidConstruction({ id: 'a1' }, 'u1', 1000);
  assert.deepEqual(K.consumeStoreDroidConstructionToken(t2, 'u1', 1000 + 1000), { ownerActorId: 'a1' });
  assert.equal(K.consumeStoreDroidConstructionToken(t2, 'u1', 1000 + 1000), null, 'one-shot: duplicate submission is refused');
  const t3 = K.beginStoreDroidConstruction({ id: 'a1' }, 'u1', 1000);
  assert.equal(K.consumeStoreDroidConstructionToken(t3, 'u1', 1000 + 3 * 60 * 60 * 1000), null, 'expired');
  const sub = await K.submitStoreDroidConstruction({ token: 'nope', selection: withExtra() });
  assert.equal(sub.success, false); assert.match(sub.error, /CONTEXT_INVALID/);
  const sub2 = await K.submitStoreDroidConstruction({ token: undefined, selection: withExtra() });
  assert.equal(sub2.success, false, 'no token -> no queued request');
  ok('launch authorization is process-memory, one-shot, user-bound and expiring; a forged or missing token queues nothing');
}
// 7. duplicate payment / delivery guard, funds, GM authorization, single commerce transaction (static contract)
{
  assert.equal(K.constructionAlreadyDelivered([{ status: 'Success', itemIds: ['req1'] }], 'req1'), true);
  assert.equal(K.constructionAlreadyDelivered([{ status: 'Failed', itemIds: ['req1'] }], 'req1'), false);
  assert.equal(K.constructionAlreadyDelivered([], 'req1'), false);
  const g = read('scripts/ui/shell/gm/GMApprovalOperationsService.js');
  const fn = g.slice(g.indexOf('static async _approveDroidConstruction('), g.indexOf('static async _buildStoreItemApprovalMutationPlans('));
  const at = s => fn.indexOf(s);
  assert.ok(at('verifyDroidConstructionApproval(approval)') >= 0 && at('verifyDroidConstructionApproval') < at('constructionAlreadyDelivered'), 're-quote first');
  assert.ok(at('constructionAlreadyDelivered') < at('validateFunds') && at('validateFunds') < at('DialogV2.confirm') && at('DialogV2.confirm') < at('StoreEngine.purchase('), 'duplicate guard, funds, explicit GM authorization, then ONE StoreEngine transaction');
  assert.match(fn, /totalCost: total/); assert.match(fn, /finalCost: total/);
  assert.match(fn, /itemGrantCallback: async \(\) =>[\s\S]*buildMutationPlan\(\{ droidActor: data/, 'droid creation is part of the same transaction as the debit');
  assert.doesNotMatch(fn, /costCredits/, 'the debit never reads the player-recorded cost');
  const eng = read('scripts/engine/store/store-engine.js');
  assert.match(eng, /_validatePricesAtPurchaseTime\(items, totalCost\)/, 'exact price check inside the purchase');
  ok('approval: re-quote -> duplicate guard -> funds -> explicit GM authorization -> single StoreEngine transaction (debit + create + owner link); rollback/recovery is TransactionEngine\'s (ti2 suites)');
}
// 8. builder uses the SAME authority; non-Store progression is isolated
{
  const b = read('scripts/apps/progression-framework/steps/droid-builder-step.js');
  assert.match(b, /quoteDroidBuild\(/); assert.doesNotMatch(b, /const quoteEntry = /, 'the builder holds no second copy of the pricing/grant logic');
  if (/\bresolveDroidBuilderQuote\(/.test(b)) assert.match(b, /import \{[^}]*resolveDroidBuilderQuote[^}]*\} from/, 'every quote function the builder calls is imported (the builder must open)');
  const fin = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  const single = fin.slice(fin.indexOf('static async finalizeSingleStep('), fin.indexOf('static singleStepDomainForStep('));
  assert.match(single, /domain === 'droidBuilder'/); assert.match(single, /storeConstructionToken: options\.storeConstructionToken|token: options\.storeConstructionToken/);
  const full = fin.slice(fin.indexOf('static async finalize('), fin.indexOf('static async finalizeSingleStep('));
  assert.doesNotMatch(full, /storeConstructionToken|submitStoreDroidConstruction/, 'chargen / level-up finalize() is untouched by the Store path');
  const others = single.replace(/if \(domain === 'droidBuilder'\) \{[\s\S]*?\n      \}\n/, '');
  assert.doesNotMatch(others, /submitStoreDroidConstruction/, 'only the droidBuilder domain reaches Store construction');
  assert.match(fin, /selections\.get\('droid-builder'\)/, 'chargen droid-builder compilation still present');
  const co = read('scripts/apps/store/store-checkout.js');
  assert.match(co, /beginStoreDroidConstruction\(actor, game\.user\?\.id\)/); assert.match(co, /storeConstructionToken: token/);
  assert.doesNotMatch(co, /storeMode: true|storeDroidApproval|requireApproval: true/, 'no unconsumed approval options are passed');
  ok('builder totals come from the shared authority; the finalizer guard is scoped to the droidBuilder single-step domain; chargen finalize() is untouched');
}
// 9. failed delivery plan: nothing is debited (behavioral, real StoreEngine)
{
  const { StoreEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/store-engine.js');
  const actor = { id: 'a1', name: 'Buyer', isOwner: true, system: { credits: 5000 } };
  globalThis.game.actors = { get: () => actor, contents: [actor] };
  globalThis.game.settings = { settings: { has: () => true }, get: (_s, k) => (k === 'storeOpen' ? true : 0), set: async () => {} };
  const item = { id: 'req1', name: 'Rusty', type: 'droid', finalCost: 770, cost: 770 };
  const failed = await StoreEngine.purchase({ actor, items: [item], totalCost: 770, itemGrantCallback: async () => { throw new Error('droid plan could not be built'); } });
  assert.equal(failed.success, false); assert.equal(actor.system.credits, 5000, 'a failed delivery plan debits nothing');
  const mismatch = await StoreEngine.purchase({ actor, items: [item], totalCost: 700, itemGrantCallback: async () => [] });
  assert.equal(mismatch.success, false); assert.equal(actor.system.credits, 5000, 'a total that differs from the quoted line is refused before any debit');
  const poor = await StoreEngine.purchase({ actor: { ...actor, system: { credits: 100 } }, items: [item], totalCost: 770, itemGrantCallback: async () => [] });
  assert.equal(poor.success, false, 'insufficient credits refused');
  ok('failed delivery plan, mismatched total and insufficient credits all refuse with no debit');
}
console.log(`store-v2-droid-construction: ${n} checks ok`);
