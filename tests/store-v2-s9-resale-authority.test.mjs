import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Store V2 S9: resale authority (valuation, acquisition provenance, GM appraisal, whole-asset disposition, commit-boundary verification).
// Pure rules are tested directly; the trusted boundary (ResaleService.verifyForCommit / TransactionEngine.executeAssetSaleTransaction) with
// fake actors. Foundry runtime (real document updates, multi-client behaviour) is RUNTIME_UNVERIFIED.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: false, id: 'p1', name: 'Player' }, users: [], actors: { get: () => null },
  settings: { settings: { has: () => true }, get: () => 0, set: async () => {} } } });
globalThis.foundry.utils ??= {};
const A = await import('/systems/foundryvtt-swse/scripts/engine/store/resale-authority.js');
const R = await import('/systems/foundryvtt-swse/scripts/engine/store/acquisition-record.js');
let n = 0; const ok = m => console.log(`  [${++n}] ${m} OK`);
const read = f => fs.readFileSync(f, 'utf8');

const SRC = 'Compendium.foundryvtt-swse.weapons-pistols.abc';
const source = { sourceUuid: SRC, name: 'Blaster Pistol', type: 'weapon', cost: 500, costStatus: 'priced' };
const pistol = (over = {}) => ({ _id: 'i1', name: 'Blaster Pistol', type: 'weapon', system: { cost: 99999, price: 99999, quantity: undefined }, flags: {}, _stats: { compendiumSource: SRC }, ...over });
const gear = (q, over = {}) => ({ _id: 'g1', name: 'Medpac', type: 'equipment', system: { quantity: q, cost: 1 }, flags: {}, _stats: { compendiumSource: 'Compendium.x.medpac' }, ...over });
const gearSrc = { sourceUuid: 'Compendium.x.medpac', name: 'Medpac', type: 'equipment', cost: 100, costStatus: 'priced' };
const quote = (a) => A.quoteItemResale({ percent: 50, basis: 'published', acquisition: null, ...a });

// 1. valuation comes from the canonical source, never the embedded copy (S9-01)
{
  const q = quote({ item: pistol(), quantity: 1, source });
  assert.equal(q.ok, true); assert.equal(q.quote.payout, 250, '50% of the PUBLISHED 500, not of the embedded system.cost/price 99999');
  assert.equal(quote({ item: pistol(), quantity: 1, source, percent: 80 }).quote.payout, 400, 'GM-configured percentage');
  assert.equal(quote({ item: pistol(), quantity: 1, source, percent: 250 }).quote.percent, 100, 'percent is capped at 100');
  assert.equal(quote({ item: pistol(), quantity: 1, source, percent: -5 }).ok, false, 'a 0% policy pays nothing: appraisal only');
  const noPrice = quote({ item: pistol(), quantity: 1, source: { ...source, cost: 0 } });
  assert.deepEqual([noPrice.ok, noPrice.reasons, noPrice.needsAppraisal], [false, ['SOURCE_PRICE_UNPUBLISHED'], true], 'a missing published price is never a free sale');
  for (const bad of [{ ...source, sourceUuid: 'Compendium.x.other' }, { ...source, name: 'Different' }, { ...source, type: 'armor' }]) assert.deepEqual(quote({ item: pistol(), quantity: 1, source: bad }).reasons, ['SOURCE_MISMATCH']);
  assert.deepEqual(quote({ item: pistol(), quantity: 1, source: null }).reasons, ['SOURCE_NOT_IN_STORE_CATALOG']);
  assert.deepEqual(quote({ item: pistol({ _stats: {} }), quantity: 1, source }).reasons, ['NO_CANONICAL_SOURCE'], 'no provenance -> GM appraisal only, no fuzzy matching');
  ok('value = published source cost x policy %; embedded price/cost is ignored; mismatch / missing source / missing price need a GM appraisal');
}
// 2. customized items are not automatically valued (S9-A)
{
  for (const mod of [{ system: { cost: 1, installedUpgrades: [{ id: 'x' }] } }, { flags: { swse: { armorUpgrades: ['plating'] } } }, { flags: { swse: { gearMods: ['x'] } } }, { flags: { swse: { lightsaberConfig: { crystal: 'x' } } } }]) {
    const q = quote({ item: pistol(mod), quantity: 1, source });
    assert.deepEqual([q.ok, q.reasons.includes('CUSTOMIZED_ITEM'), q.needsAppraisal], [false, true, true]);
  }
  assert.equal(quote({ item: pistol({ flags: { swse: { armorUpgrades: [] } } }), quantity: 1, source }).ok, true, 'empty customization surfaces do not block');
  ok('items with installed upgrades / mods / lightsaber configuration require GM appraisal (no invented modification value)');
}
// 3. quantity (S9-B)
{
  assert.equal(quote({ item: gear(5), quantity: 2, source: gearSrc }).quote.payout, 100, '2 of 5 at floor(100x50%)=50 each');
  assert.equal(quote({ item: gear(5), quantity: 5, source: gearSrc }).quote.payout, 250);
  for (const [qty, reason] of [[0, 'QUANTITY_INVALID'], [-1, 'QUANTITY_INVALID'], [1.5, 'QUANTITY_INVALID'], [NaN, 'QUANTITY_INVALID'], ['2', 'QUANTITY_INVALID'], [6, 'QUANTITY_EXCEEDS_OWNED']]) {
    const q = quote({ item: gear(5), quantity: qty, source: gearSrc }); assert.deepEqual([q.ok, q.reasons[0], q.needsAppraisal], [false, reason, false], String(qty));
  }
  assert.equal(quote({ item: gear(0), quantity: 1, source: gearSrc }).ok, false, 'zero owned');
  assert.equal(quote({ item: gear(2.5), quantity: 1, source: gearSrc }).ok, false, 'fractional stack is malformed');
  assert.deepEqual(quote({ item: pistol(), quantity: 2, source }).reasons.includes('UNIQUE_ITEM_SELLS_ALONE'), true, 'weapons/armor are unique instances');
  assert.equal(quote({ item: gear(3, { system: { quantity: 3, equippedQty: 1, cost: 1 } }), quantity: 3, source: gearSrc }).ok, true, 'equippedQty is not the quantity authority');
  assert.equal(A.ownedQuantity({ system: { equippedQty: 4 } }), 1);
  const ic = read('scripts/engine/inventory/InventoryEngine.js');
  assert.deepEqual(JSON.parse(/STACKABLE_TYPES = (\[.*?\])/.exec(ic)[1]), [...A.STACKABLE_ITEM_TYPES], 'same stackable partition as InventoryEngine');
  assert.deepEqual(JSON.parse(/NON_STACKABLE_TYPES = (\[.*?\])/.exec(ic)[1]), [...A.UNIQUE_ITEM_TYPES]);
  ok('quantity: exact units priced; zero / negative / fractional / over-quantity / string refused; unique items sell alone; equippedQty ignored');
}
// 4. acquisition provenance: verified paid cost vs reference vs unknown
{
  const ledger = { tx1: { id: 'tx1', status: 'Success', context: 'store-purchase', audit: { items: [{ listingId: 'foundryvtt-swse.weapons-pistols.abc', sourceUuid: SRC, unitCost: 400, publishedUnitCost: 500, quantity: 1, condition: null }] } } };
  const ref = { transactionId: 'tx1', listingId: 'foundryvtt-swse.weapons-pistols.abc', sourceUuid: SRC, unitPaid: 400, condition: null };
  const v = R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger });
  assert.equal(v.verified, true); assert.equal(v.unitPaid, 400);
  const withAcq = (acquisition, basis = 'acquisition') => quote({ item: pistol(), quantity: 1, source, acquisition, basis });
  assert.equal(withAcq(v).quote.payout, 200, 'verified paid 400 x 50% (not the published 500)');
  assert.equal(withAcq(v).quote.segments[0].basisKind, 'acquisition');
  assert.equal(withAcq(v, 'published').quote.payout, 250, 'GM can choose the published basis');
  assert.equal(withAcq({ verified: false, reasons: ['ACQUISITION_COST_UNKNOWN'] }).quote.payout, 250, 'unknown acquisition -> published fallback, labelled');
  assert.equal(withAcq({ verified: false, reasons: ['ACQUISITION_COST_UNKNOWN'] }).quote.acquisitionStatus, 'ACQUISITION_COST_UNKNOWN');
  // forged references never raise a payout
  for (const [label, mutate] of [['inflated unitPaid', r => { r.unitPaid = 4000; }], ['other transaction', r => { r.transactionId = 'tx9'; }], ['other listing', r => { r.listingId = 'x'; }], ['condition', r => { r.condition = 'used'; }]]) {
    const bad = { ...ref }; mutate(bad); assert.equal(R.verifyAcquisition({ acquisition: bad, sourceUuid: SRC, ledger }).verified, false, label);
  }
  assert.equal(R.verifyAcquisition({ acquisition: ref, sourceUuid: 'Compendium.x.other', ledger }).verified, false, 'source mismatch');
  assert.equal(R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger: { tx1: { ...ledger.tx1, status: 'Rolled Back' } } }).verified, false, 'rolled-back purchase');
  assert.equal(R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger: { tx1: { ...ledger.tx1, context: 'store-sale' } } }).verified, false, 'a sale record is not a purchase');
  assert.equal(R.verifyAcquisition({ acquisition: null, ledger }).reasons[0], 'ACQUISITION_COST_UNKNOWN');
  assert.equal(R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger, unitsAlreadyDisposed: 1 }).unitsAvailable, 0, 'a purchase can be paid for once');
  // mixed stack: 1 verified-paid unit + 2 unverified
  const stack = gear(3); const mixedAcq = { verified: true, unitPaid: 60, unitsAvailable: 1, transactionId: 'txm' };
  const m = quote({ item: stack, quantity: 3, source: gearSrc, acquisition: mixedAcq, basis: 'acquisition' });
  assert.deepEqual(m.quote.segments.map(s => [s.units, s.basisKind, s.unitPayout]), [[1, 'acquisition', 30], [2, 'published', 50]]); assert.equal(m.quote.payout, 130);
  // buy cheap / sell dear is impossible on the paid basis
  assert.ok(quote({ item: pistol(), quantity: 1, source, acquisition: { verified: true, unitPaid: 10, unitsAvailable: 1 }, percent: 100, basis: 'acquisition' }).quote.payout <= 10, 'never more than was paid');
  // stamping
  const plan = { add: { items: [{ name: 'x', __acquisition: R.buildAcquisitionMarker({ listing: { id: 'L', sourceUuid: SRC, type: 'weapon', cost: 500 }, unitPaid: 400 }) }] }, create: { actors: [{ data: { name: 'v', __acquisition: R.buildAcquisitionMarker({ listing: { id: 'V', type: 'vehicle', costNew: 100000, costUsed: 60000, sourceEntryKey: 'k' }, unitPaid: 90000, condition: 'new' }) } }] } };
  R.stampAcquisitions(plan, { transactionId: 'txS', context: 'store-purchase', at: 5 });
  assert.equal(plan.add.items[0].flags['foundryvtt-swse'].acquisition.transactionId, 'txS'); assert.equal(plan.add.items[0].__acquisition, undefined);
  const va = plan.create.actors[0].data.flags['foundryvtt-swse'].acquisition;
  assert.deepEqual([va.unitPaid, va.publishedUnitCost, va.condition, va.sourceEntryKey], [90000, 100000, 'new', 'k'], 'vehicle: paid 90000 vs published new 100000, condition kept');
  assert.equal(R.publishedUnitCostOf({ type: 'vehicle', costNew: 100000, costUsed: null }, 'used'), null, 'no derived used price');
  ok('acquisition: verified paid basis (paid 400 -> 200 offer), forged/edited references rejected against the ledger, unknown -> labelled published fallback, mixed stacks, no profit, markers stamped');
}
// 5. GM appraisal validation (S9-E)
{
  const good = { amount: 1234, reason: ' rare ', executingUserIsGM: true, gmUserId: 'gm' };
  assert.equal(A.validateAppraisal(good).ok, true); assert.equal(A.validateAppraisal(good).reason, 'rare');
  for (const [label, bad, code] of [['not GM', { ...good, executingUserIsGM: false }, 'GM_REQUIRED'], ['no gm id', { ...good, gmUserId: null }, 'GM_REQUIRED'], ['zero', { ...good, amount: 0 }, 'APPRAISAL_AMOUNT_INVALID'],
    ['negative', { ...good, amount: -5 }, 'APPRAISAL_AMOUNT_INVALID'], ['fractional', { ...good, amount: 1.5 }, 'APPRAISAL_AMOUNT_INVALID'], ['NaN', { ...good, amount: NaN }, 'APPRAISAL_AMOUNT_INVALID'],
    ['string', { ...good, amount: 'abc' }, 'APPRAISAL_AMOUNT_INVALID'], ['overflow', { ...good, amount: A.MAX_RESALE_CREDITS + 1 }, 'APPRAISAL_AMOUNT_OUT_OF_RANGE'], ['no reason', { ...good, reason: '  ' }, 'APPRAISAL_REASON_REQUIRED']])
    assert.ok(A.validateAppraisal(bad).reasons.includes(code), label);
  ok('GM appraisal needs an executing GM, a bounded positive integer and a stated reason');
}
// 6. whole assets: eligibility, evidence, disposition contract (S9-C/D)
{
  const owner = { _id: 'o1', name: 'Buyer', system: { ownedActors: [{ id: 'd1' }, { id: 'v1' }] } };
  const droid = { _id: 'd1', type: 'droid', name: 'R2', system: { ownedByActorId: 'o1', droidSystems: { stateMode: 'FINALIZED' }, droidCalculationMode: 'stock-statblock' }, flags: {}, ownership: { default: 0, p1: 3 } };
  const vehicle = { _id: 'v1', type: 'vehicle', name: 'Ship', system: { ownedByActorId: 'o1', buildMetadata: { condition: 'new' }, crewPositions: {} }, flags: { swse: { universalVehicleSource: { source: { economics: { priceNew: { status: 'priced', amountCredits: 100000 }, priceUsed: { status: 'priced', amountCredits: 60000 } } } } } } };
  const verified = { verified: true, unitPaid: 90000, publishedUnitCost: 100000, transactionId: 'txv', condition: 'new' };
  const ok1 = A.assessAssetForResale({ asset: vehicle, owner, acquisition: verified, percent: 50, basis: 'acquisition' });
  assert.equal(ok1.ok, true); assert.equal(ok1.reference.policyOffer, 45000, 'published 100000, paid 90000, 50% -> reference 45000');
  assert.equal(ok1.reference.publishedNew, 100000); assert.equal(ok1.reference.publishedUsed, 60000);
  assert.equal(A.assessAssetForResale({ asset: vehicle, owner, acquisition: null }).reference.acquisitionVerified, false);
  assert.ok(A.assessAssetForResale({ asset: vehicle, owner, acquisition: null }).lines.some(l => /Acquisition cost unknown/.test(l)), 'unknown is stated, not guessed');
  const blocked = (asset, o = owner) => A.assessAssetForResale({ asset, owner: o }).blockers;
  assert.ok(blocked({ ...vehicle, system: { ...vehicle.system, ownedByActorId: 'someone' } }).includes('ASSET_NOT_OWNED_BY_SELLER'));
  assert.ok(blocked(vehicle, { ...owner, system: { ownedActors: [] } }).includes('OWNER_LINK_MISSING'));
  assert.ok(blocked({ ...vehicle, system: { ...vehicle.system, crewPositions: { pilot: { id: 'c' } } } }).includes('VEHICLE_HAS_ASSIGNED_CREW'));
  assert.ok(blocked({ ...droid, system: { ...droid.system, droidSystems: { stateMode: 'PENDING' } } }).includes('DROID_NOT_FINALIZED'));
  assert.ok(blocked({ ...droid, flags: { 'foundryvtt-swse': { resale: { status: 'sold' } } } }).includes('ASSET_ALREADY_DISPOSED'));
  assert.ok(blocked({ _id: 'x', type: 'character' }).includes('ASSET_TYPE_NOT_SELLABLE'));
  const custom = A.assessAssetForResale({ asset: { ...vehicle, flags: { swse: { vehicleConstructionCompletion: { designId: 'D1' } } } }, owner, designProject: { record: { totalCredits: 750000 } } });
  assert.equal(custom.reference.constructionTotal, 750000); assert.ok(custom.lines.some(l => /installed systems after delivery are NOT valued/.test(l)));
  const disp = A.buildAssetDispositionUpdate({ asset: droid, owner, transactionId: 't', authority: 'gm-appraisal', amount: 5, soldAt: 1, soldBy: 'gm', gmOwnerships: { gm: 3 } });
  assert.deepEqual(disp.ownership, { default: 0, gm: 3 }); assert.equal(disp['system.ownedByActorId'], null);
  assert.deepEqual(disp['flags.foundryvtt-swse.resale'].previousOwnership, { default: 0, p1: 3 }, 'prior access recorded for recovery');
  assert.equal(JSON.stringify(disp).includes('delete'), false, 'the Actor is kept, never deleted');
  ok('assets: ownership both ways, finalized, no crew, not already sold; evidence shows verified paid / published / construction; policy reference 45000; disposition keeps the Actor');
}
// 7. trusted boundary with fakes
const { ResaleService } = await import('/systems/foundryvtt-swse/scripts/engine/store/resale-service.js');
const { HouseRuleService } = await import('/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js');
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const settings = { automaticSalePercentage: 50, autoAcceptItemSales: true, resaleBasis: 'published' };
HouseRuleService.getNumber = (k, f) => settings[k] ?? f; HouseRuleService.getString = (k, f) => settings[k] ?? f; HouseRuleService.isEnabled = k => settings[k] === true;
ResaleService.sourceFor = async data => (data._stats?.compendiumSource === SRC ? source : data._stats?.compendiumSource === gearSrc.sourceUuid ? gearSrc : null);
const mkItem = data => ({ id: data._id, name: data.name, type: data.type, toObject: () => JSON.parse(JSON.stringify(data)), isOwned: true });
const mkActor = (items, over = {}) => { const a = { id: 'a1', name: 'Seller', isOwner: true, ownership: { p1: 3 }, system: { credits: 1000, ownedActors: [] }, flags: {}, ...over };
  a.items = { get: id => items.find(i => i.id === id) ?? null, contents: items }; a.getFlag = (s, k) => a.flags?.[s]?.[k]; return a; };
const setUser = (isGM, id = isGM ? 'gm' : 'p1') => { globalThis.game.user = { id, name: id, isGM }; globalThis.game.users = { get: i => ({ id: i, isGM: i === 'gm' }), [Symbol.iterator]: function* () { yield { id: 'gm', isGM: true }; yield { id: 'p1', isGM: false }; } }; };
{
  setUser(false);
  const actor = mkActor([mkItem(pistol()), mkItem(gear(5))]);
  const v = args => ResaleService.verifyForCommit({ actor, itemId: 'i1', quantity: 1, authority: 'canonical-automatic', transactionContext: 'store-sale', ...args });
  const good = await v({});
  assert.equal(good.ok, true); assert.equal(good.payout, 250); assert.equal(good.removeEntirely, true);
  const forged = await v({ salePrice: 999999, shownQuote: { quoteHash: 'x', payout: 999999 } });
  assert.equal(forged.ok, false); assert.equal(forged.quoteChanged, true, 'a client-supplied payout/quote never becomes the payout');
  assert.equal((await v({ shownQuote: (await ResaleService.quoteOwnedItem({ actor, itemId: 'i1', quantity: 1 })).quote })).payout, 250, 'a matching shown quote is accepted');
  settings.automaticSalePercentage = 60;
  assert.equal((await v({ shownQuote: good.quote })).quoteChanged, true, 'policy change after the offer was shown forces renewed confirmation'); settings.automaticSalePercentage = 50;
  assert.equal((await v({ authority: undefined })).ok, false, 'no authority, no sale');
  assert.equal((await v({ authority: 'gm-appraisal', transactionContext: 'store-sale', appraisal: { amount: 1, reason: 'x' } })).ok, false, 'a player cannot appraise');
  assert.equal((await v({ transactionContext: 'store-sale-approval' })).reasons[0], 'GM_REQUIRED', 'GM contexts require an executing GM at the boundary (S9-03)');
  assert.equal((await v({ transactionContext: 'store-haggle-sale' })).reasons[0], 'GM_REQUIRED');
  const part = await ResaleService.verifyForCommit({ actor, itemId: 'g1', quantity: 2, authority: 'canonical-automatic', transactionContext: 'store-sale' });
  assert.deepEqual([part.ok, part.payout, part.removeEntirely, part.remainingQuantity], [true, 100, false, 3], 'partial stack: only 2 removed, 3 remain');
  const all = await ResaleService.verifyForCommit({ actor, itemId: 'g1', quantity: 5, authority: 'canonical-automatic', transactionContext: 'store-sale' });
  assert.deepEqual([all.removeEntirely, all.remainingQuantity], [true, 0]);
  assert.equal((await ResaleService.verifyForCommit({ actor, itemId: 'g1', quantity: 9, authority: 'canonical-automatic', transactionContext: 'store-sale' })).ok, false, 'over-quantity');
  assert.equal((await ResaleService.verifyForCommit({ actor, itemId: 'nope', quantity: 1, authority: 'canonical-automatic', transactionContext: 'store-sale' })).reasons[0], 'ITEM_NOT_FOUND');
  // automatic mode is restricted, not claimed safe, for shared actors
  settings.autoAcceptItemSales = false; assert.equal((await v({})).ok, false, 'automatic sales disabled by policy');
  settings.autoAcceptItemSales = true;
  const shared = mkActor([mkItem(pistol())], { ownership: { p1: 3, p2: 3 } });
  assert.equal(ResaleService.automaticResaleAllowed(shared).allowed, false); assert.equal(ResaleService.automaticResaleAllowed(shared).reason, 'MULTIPLE_PLAYER_OWNERS');
  // replay
  const replayActor = mkActor([mkItem(pistol())], { flags: { 'foundryvtt-swse': { transactions: { t1: { id: 't1', status: 'Success', type: 'Sell', context: 'store-sale', createdAt: 1, audit: { requestId: 'req-9' } } } } } });
  assert.equal((await ResaleService.verifyForCommit({ actor: replayActor, itemId: 'i1', quantity: 1, authority: 'canonical-automatic', requestId: 'req-9', transactionContext: 'store-sale' })).reasons[0], 'REQUEST_ALREADY_COMMITTED', 'a completed request id cannot be paid twice');
  // GM appraisal
  setUser(true);
  const gm = (ap, ctx = 'store-sale-approval') => ResaleService.verifyForCommit({ actor, itemId: 'i1', quantity: 1, authority: 'gm-appraisal', appraisal: ap, transactionContext: ctx });
  const ap = await gm({ amount: 777, reason: 'collector interest' });
  assert.deepEqual([ap.ok, ap.payout, ap.authority], [true, 777, 'gm-appraisal']); assert.equal(ap.appraisal.reason, 'collector interest'); assert.equal(ap.appraisal.canonicalReferencePayout, 250);
  assert.equal((await gm({ amount: 777, reason: '' })).ok, false); assert.equal((await gm({ amount: -1, reason: 'x' })).ok, false);
  assert.equal((await gm({ amount: 5, reason: 'x' }, 'store-sale')).ok, false, 'an appraisal cannot run as an automatic sale');
  const customized = mkActor([mkItem(pistol({ flags: { swse: { gearMods: ['x'] } } }))]);
  const cz = await ResaleService.verifyForCommit({ actor: customized, itemId: 'i1', quantity: 1, authority: 'canonical-automatic', transactionContext: 'store-sale-approval' });
  assert.equal(cz.ok, false); assert.ok(cz.reasons.includes('CUSTOMIZED_ITEM'));
  assert.equal((await ResaleService.verifyForCommit({ actor: customized, itemId: 'i1', quantity: 1, authority: 'gm-appraisal', appraisal: { amount: 300, reason: 'modded' }, transactionContext: 'store-sale-approval' })).ok, true, 'the same customized item can be sold through a recorded GM appraisal');
  ok('commit boundary: payout re-derived, forged price/quote refused, policy change forces reconfirmation, GM-only decisions, partial vs full stack, replay refused, appraisal recorded, shared actors restricted');
}
// 8. whole-asset sale transaction: ordering, rollback, no payment without disposition
{
  setUser(true);
  const owner = { id: 'o1', name: 'Buyer', isOwner: true, ownership: { p1: 3 }, system: { credits: 100, ownedActors: [{ id: 'd1' }, { id: 'x1' }], relationships: [{ id: 'd1', uuid: 'Actor.d1' }] }, flags: {} };
  owner.toObject = () => JSON.parse(JSON.stringify({ _id: owner.id, name: owner.name, system: owner.system, flags: owner.flags }));
  const droid = { id: 'd1', name: 'R2', type: 'droid', ownership: { default: 0, p1: 3 }, system: { ownedByActorId: 'o1', droidSystems: { stateMode: 'FINALIZED' } }, flags: {} };
  droid.toObject = () => JSON.parse(JSON.stringify({ _id: droid.id, name: droid.name, type: droid.type, ownership: droid.ownership, system: droid.system, flags: droid.flags }));
  globalThis.game.actors = { get: id => ({ o1: owner, d1: droid })[id] ?? null };
  const calls = []; const real = { upd: ActorEngine.updateActor, plan: ActorEngine.applyMutationPlan };
  const behave = { planFails: false, undoFails: false };
  ActorEngine.updateActor = async (actor, data) => { calls.push(['asset-update', Object.keys(data)]); if (data['flags.foundryvtt-swse.-=resale'] === null && behave.undoFails) throw new Error('undo failed'); };
  ActorEngine.applyMutationPlan = async (actor, plan) => { calls.push(['owner-plan', Object.keys(plan.set ?? {})]); if (behave.planFails) throw new Error('credit write failed'); Object.assign(actor.system, { credits: plan.set['system.credits'] }); };
  const sell = ap => TransactionEngine.executeAssetSaleTransaction({ ownerActor: owner, assetActorId: 'd1', appraisal: ap, requestId: 'r1', reason: 'r' }, { validate: false });
  try {
    setUser(false); let r = await sell({ amount: 500, reason: 'x' }); assert.equal(r.success, false); assert.equal(calls.length, 0, 'a non-GM touches nothing'); setUser(true);
    r = await sell({ amount: 0, reason: 'x' }); assert.equal(r.success, false); assert.equal(calls.length, 0, 'bad appraisal touches nothing');
    r = await sell({ amount: 500, reason: 'fair' });
    assert.equal(r.success, true); assert.equal(owner.system.credits, 600);
    assert.deepEqual(calls.map(c => c[0]), ['asset-update', 'owner-plan'], 'the asset is disposed BEFORE any credit is created');
    assert.ok(calls[1][1].includes('system.ownedActors') && calls[1][1].some(k => k.startsWith('flags.foundryvtt-swse.transactions.')), 'credit + unlink + ledger in one owner plan');
    // credit write fails -> disposition reverted, seller unpaid
    calls.length = 0; owner.system.credits = 100; behave.planFails = true;
    r = await sell({ amount: 500, reason: 'fair' }); assert.equal(r.success, false); assert.equal(owner.system.credits, 100);
    assert.deepEqual(calls.map(c => c[0]), ['asset-update', 'owner-plan', 'asset-update'], 'disposition reverted after the failed credit');
    // revert also fails -> reported, never paid, asset GM-held
    calls.length = 0; behave.undoFails = true;
    r = await sell({ amount: 500, reason: 'fair' });
    assert.equal(r.success, false); assert.equal(r.rollbackFailed, true); assert.equal(r.indeterminate, true); assert.match(r.error, /seller was NOT paid/); assert.equal(owner.system.credits, 100);
    // replay: a committed request id is refused
    behave.planFails = false; behave.undoFails = false;
    owner.flags = { 'foundryvtt-swse': { transactions: { tx9: { id: 'tx9', status: 'Success', type: 'Sell', context: 'store-asset-sale-approval', createdAt: 1, audit: { requestId: 'r1' } } } } };
    calls.length = 0; r = await sell({ amount: 500, reason: 'fair' }); assert.equal(r.success, false); assert.equal(r.reasons[0], 'REQUEST_ALREADY_COMMITTED'); assert.equal(calls.length, 0);
  } finally { ActorEngine.updateActor = real.upd; ActorEngine.applyMutationPlan = real.plan; }
  ok('asset sale: GM only, disposition before credit, failed credit reverts disposition, failed revert is flagged (seller unpaid, asset GM-held), replay refused, nothing touched on refusal');
}
// 8b. item sale transaction: the plan removes only the sold quantity and records authority + quote
{
  setUser(false);
  const actor = mkActor([mkItem(gear(5)), mkItem(pistol())]); actor.id = 'a1';
  actor.toObject = () => ({ _id: 'a1', name: actor.name, system: actor.system, items: [], flags: actor.flags });
  globalThis.game.actors = { get: () => actor };
  const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
  const realSnap = SnapshotManager.createSnapshot; let snapFails = false; SnapshotManager.createSnapshot = async () => { if (snapFails) throw new Error('no snapshot'); return 'snap1'; };
  const plans = []; const real = ActorEngine.applyMutationPlan; ActorEngine.applyMutationPlan = async (a, plan) => { plans.push(plan); Object.assign(a.system, { credits: plan.set['system.credits'] }); };
  try {
    const sell = (itemId, quantity) => TransactionEngine.executeSaleTransaction({ actor, itemId, quantity, authority: 'canonical-automatic', requestId: `r-${itemId}-${quantity}`, transactionContext: 'store-sale', salePrice: 999999 }, { validate: false });
    let r = await sell('g1', 2);
    assert.equal(r.success, true); assert.equal(r.amount, 100, 'the injected salePrice is ignored'); assert.equal(actor.system.credits, 1100);
    assert.deepEqual(plans[0].update.items, [{ _id: 'g1', 'system.quantity': 3 }], 'partial stack: quantity decremented, item kept'); assert.equal(plans[0].delete, undefined);
    const rec = Object.values(plans[0].set).find(v => v && v.type === 'Sell');
    assert.equal(rec.audit.resaleAuthority, 'canonical-automatic'); assert.equal(rec.audit.items[0].quantity, 2); assert.equal(rec.audit.resaleQuote.payout, 100); assert.equal(rec.audit.requestId, 'r-g1-2');
    r = await sell('i1', 1);
    assert.equal(r.success, true); assert.deepEqual(plans[1].delete.items, ['i1'], 'a unique item is deleted whole');
    r = await sell('g1', 1.5); assert.equal(r.success, false); assert.equal(plans.length, 2, 'refusals write nothing');
    snapFails = true; r = await sell('g1', 1); assert.equal(r.success, false); assert.match(r.error, /rollback snapshot/); assert.equal(plans.length, 2, 'no snapshot -> no credit creation');
  } finally { ActorEngine.applyMutationPlan = real; SnapshotManager.createSnapshot = realSnap; }
  ok('item sale plan: partial stack decrements quantity, unique item deleted, ignores injected salePrice, ledger carries authority + quote + request id');
}
// 8c. S9-0: every Store purchase records the actual price paid per delivered asset
{
  globalThis.foundry.applications ??= { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: B => class extends B {}, DialogV2: class {} } };
  globalThis.ui ??= { notifications: { warn() {}, info() {}, error() {} } };
  const { createItemPlans } = await import('/systems/foundryvtt-swse/scripts/apps/store/store-checkout.js');
  const listing = { id: 'foundryvtt-swse.weapons-pistols.abc', sourceUuid: SRC, type: 'weapon', name: 'Blaster Pistol', cost: 500, doc: { _id: 'abc', name: 'Blaster Pistol', type: 'weapon', system: { cost: 500 }, flags: {} } };
  const [plan] = createItemPlans([{ id: listing.id, name: listing.name, cost: 410, item: listing }]);
  const marker = plan.add.items[0].__acquisition;
  assert.deepEqual([marker.unitPaid, marker.publishedUnitCost, marker.listingId, marker.sourceUuid], [410, 500, listing.id, SRC], 'paid 410 (GM discount) vs published 500, both recorded separately');
  const se = read('scripts/engine/store/store-engine.js');
  assert.match(se, /\.\.\.ledgerLineFields\(item\)/, 'the ledger line carries listingId / sourceUuid / unitCost / publishedUnitCost');
  assert.match(read('scripts/engine/store/transaction-engine.js'), /stampAcquisitions\(plan, \{ transactionId, context: transactionContext/, 'delivered assets are stamped with the committed transaction id');
  const co = read('scripts/apps/store/store-checkout.js');
  assert.match(co, /spec\.data\.__acquisition = buildAcquisitionMarker\(\{ listing: droid\.actor/); assert.match(co, /listing: merchantItem, listingId: vehicle\.id, unitPaid: vehicle\.cost, condition: vehicle\.condition/);
  assert.match(read('scripts/ui/shell/gm/GMApprovalOperationsService.js'), /kind: 'custom-droid-construction'[\s\S]{0,200}unitPaid: total/, 'custom droids record the quoted amount paid');
  assert.deepEqual(R.ledgerLineFields({ id: 'L', sourceUuid: SRC, finalCost: 410, publishedUnitCost: 500 }), { listingId: 'L', sourceUuid: SRC, sourceEntryKey: null, unitCost: 410, publishedUnitCost: 500 });
  ok('purchases record paid vs published per delivered Item / Droid / Vehicle / custom Droid (ledger line + stamped reference); resale verifies the pair');
}
// 9. architecture-negative guards (S9-F/G)
{
  assert.ok(!fs.existsSync('scripts/apps/item-selling-system.js'), 'legacy item seller deleted');
  const resaleSrc = ['scripts/engine/store/resale-authority.js', 'scripts/engine/store/resale-service.js', 'scripts/engine/store/acquisition-record.js', 'scripts/apps/store/resale-ui.js'].map(read).join('\n').replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');
  assert.doesNotMatch(resaleSrc, /system\??\.price|calculateRawSellPrice/, 'no obsolete price field in the resale code');
  const te = read('scripts/engine/store/transaction-engine.js');
  const sale = te.slice(te.indexOf('static async executeSaleTransaction('), te.indexOf('static async executeAssetSaleTransaction('));
  assert.doesNotMatch(sale, /salePrice = 0|normalizeCredits\(salePrice\)/, 'the sale transaction does not take a caller payout');
  assert.match(sale, /ResaleService\.verifyForCommit/);
  const gmsvc = read('scripts/ui/shell/gm/GMStoreOperationsService.js');
  assert.match(gmsvc.slice(gmsvc.indexOf('static async resolvePendingSaleRequest(')), /game\.user\?\.isGM !== true/, 'service-level GM check');
  assert.doesNotMatch(gmsvc, /request\.requestedPrice \?\? request\.suggestedPrice/, 'no saved price becomes the payout');
  for (const f of ['scripts/sheets/v2/character-sheet/inventory-ui.js', 'scripts/sheets/v2/character-like-sheet.js']) { const src = read(f); assert.doesNotMatch(src, /\.item-sell|initiateItemSale|item-selling-system/); }
  assert.match(read('scripts/sheets/v2/character-like-sheet.js'), /case "sell-item":[\s\S]{0,300}initiateResale\(item, this\.actor\)/, 'every template sell button reaches the one resale flow');
  assert.match(read('templates/shell/partials/surface-asset-bay.hbs'), /data-asset-bay-action="request-sale"/);
  const sheetSell = [...fs.readdirSync('templates/actors/character/v2/partials')].filter(f => /^inventory-.*card\.hbs$|inventory-item-row\.hbs$/.test(f));
  assert.ok(sheetSell.length >= 3 && sheetSell.every(f => /data-action="sell-item"/.test(read(`templates/actors/character/v2/partials/${f}`))));
  ok('architecture guards: legacy seller + .item-sell listeners gone, no obsolete price field, no caller payout, service-level GM check, single sell entry point, Asset Bay request action');
}
console.log(`store-v2-s9-resale-authority: ${n} checks ok`);
