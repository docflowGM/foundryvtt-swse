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
const ENTITLED = { verified: true, unitPaid: 400, unitsAvailable: 99, lotId: 'tx1:0', transactionId: 'tx1' };
const quote = (a) => A.quoteItemResale({ percent: 50, basis: 'published', acquisition: ENTITLED, ...a });

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
// 4. acquisition provenance = the ONLY source of automatic entitlement (S9 closure)
{
  const L1 = 'tx1:0', LISTING = 'foundryvtt-swse.weapons-pistols.abc';
  const mkLedger = (lines, over = {}) => ({ tx1: { id: 'tx1', status: 'Success', context: 'store-purchase', audit: { items: lines }, ...over } });
  const line = (o = {}) => ({ lotId: L1, listingId: LISTING, sourceUuid: SRC, unitCost: 400, publishedUnitCost: 500, quantity: 1, condition: null, ...o });
  const ledger = mkLedger([line()]);
  const ref = { transactionId: 'tx1', lotId: L1, listingId: LISTING, sourceUuid: SRC, unitPaid: 400, condition: null };
  const v = R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger });
  assert.equal(v.verified, true); assert.equal(v.unitPaid, 400); assert.equal(v.lotId, L1);
  const withAcq = (acquisition, basis = 'acquisition', extra = {}) => quote({ item: pistol(), quantity: 1, source, acquisition, basis, ...extra });
  assert.equal(withAcq(v).quote.payout, 200, 'verified paid 400 x 50% (not the published 500)');
  assert.equal(withAcq(v, 'published').quote.payout, 250, 'the published BASIS still needs an entitled unit');
  // UNVERIFIED acquisition never pays automatically (dragged-in / duplicated / granted / legacy items)
  for (const unknown of [null, { verified: false, reasons: ['ACQUISITION_COST_UNKNOWN'] }, { verified: false, reasons: ['ACQUISITION_TRANSACTION_NOT_IN_LEDGER'] }]) {
    for (const basis of ['acquisition', 'published']) {
      const q = withAcq(unknown, basis);
      assert.deepEqual([q.ok, q.needsAppraisal, q.reasons.includes('UNVERIFIED_ACQUISITION')], [false, true, true], `${basis}: no entitlement -> GM appraisal only`);
      assert.equal(q.reference.payoutAtPublished, 250, 'the GM is shown a published-cost REFERENCE, never paid automatically');
    }
  }
  // forged / copied references never create entitlement
  const bad = (label, mutate) => { const r = { ...ref }; mutate(r); const res = R.verifyAcquisition({ acquisition: r, sourceUuid: SRC, ledger }); assert.equal(res.verified, false, label); return res; };
  bad('inflated unitPaid', r => { r.unitPaid = 4000; });
  bad('other transaction', r => { r.transactionId = 'tx9'; });
  bad('other listing', r => { r.listingId = 'x'; });
  bad('no lot id', r => { delete r.lotId; });
  bad('lot of another purchase', r => { r.lotId = 'tx1:7'; });
  bad('condition', r => { r.condition = 'used'; });
  assert.equal(R.verifyAcquisition({ acquisition: ref, sourceUuid: 'Compendium.x.other', ledger }).verified, false, 'source mismatch');
  assert.equal(R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger: mkLedger([line()], { status: 'Rolled Back' }) }).verified, false, 'rolled-back purchase');
  assert.equal(R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger: mkLedger([line()], { context: 'store-sale' }) }).verified, false, 'a sale record is not a purchase');
  assert.equal(R.verifyAcquisition({ acquisition: null, ledger }).reasons[0], 'ACQUISITION_COST_UNKNOWN');
  // entitlement is consumed per LOT
  assert.equal(R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger, unitsAlreadyDisposed: 1 }).unitsAvailable, 0, 'a purchase can be paid for once');
  assert.equal(withAcq({ ...v, unitsAvailable: 0 }).ok, false); assert.ok(withAcq({ ...v, unitsAvailable: 0 }).reasons.includes('QUANTITY_EXCEEDS_VERIFIED_PURCHASE'));
  // duplicated / copied / split Items: more than one claimant of a lot -> nobody is entitled
  const dup = R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger, claimantCount: 2 });
  assert.deepEqual([dup.verified, dup.reasons.includes('ACQUISITION_LOT_CLAIMED_BY_MULTIPLE_ITEMS')], [false, true]);
  // two purchases of the SAME listing: exact lots, no first-match ambiguity
  const two = mkLedger([line(), line({ lotId: 'tx1:1', unitCost: 300, publishedUnitCost: 500 })]);
  assert.equal(R.verifyAcquisition({ acquisition: ref, sourceUuid: SRC, ledger: two }).unitPaid, 400);
  assert.equal(R.verifyAcquisition({ acquisition: { ...ref, lotId: 'tx1:1', unitPaid: 300 }, sourceUuid: SRC, ledger: two }).unitPaid, 300);
  assert.equal(R.verifyAcquisition({ acquisition: { ...ref, lotId: 'tx1:1', unitPaid: 400 }, sourceUuid: SRC, ledger: two }).verified, false, 'lot 1 cannot borrow lot 0\'s price');
  // stacks: only entitled units sell automatically
  const stack = gear(3);
  const stackAcq = { verified: true, unitPaid: 60, unitsAvailable: 1, lotId: 'txm:0', transactionId: 'txm' };
  const sellMany = quote({ item: stack, quantity: 3, source: gearSrc, acquisition: stackAcq, basis: 'acquisition' });
  assert.deepEqual([sellMany.ok, sellMany.reasons], [false, ['QUANTITY_EXCEEDS_VERIFIED_PURCHASE']], 'the 2 unverified units of the stack are not paid automatically');
  const sellOne = quote({ item: stack, quantity: 1, source: gearSrc, acquisition: stackAcq, basis: 'acquisition' });
  assert.deepEqual([sellOne.ok, sellOne.quote.payout, sellOne.quote.acquisitionLotId], [true, 30, 'txm:0']);
  // buy cheap / sell dear is impossible on the paid basis
  assert.ok(quote({ item: pistol(), quantity: 1, source, acquisition: { verified: true, unitPaid: 10, unitsAvailable: 1, lotId: 'x:0' }, percent: 100, basis: 'acquisition' }).quote.payout <= 10, 'never more than was paid');
  // stamping allocates lots one-to-one and never first-match
  const mk = (id, paid) => ({ __acquisition: R.buildAcquisitionMarker({ listing: { id, sourceUuid: SRC, type: 'weapon', cost: 500 }, unitPaid: paid }) });
  const plan = { add: { items: [{ name: 'a', ...mk('L', 400) }, { name: 'b', ...mk('L', 300) }, { name: 'c', ...mk('M', 100) }] }, create: { actors: [{ data: { name: 'v', __acquisition: R.buildAcquisitionMarker({ listing: { id: 'V', type: 'vehicle', costNew: 100000, costUsed: 60000, sourceEntryKey: 'k' }, unitPaid: 90000, condition: 'new' }) } }] } };
  const lines = [{ listingId: 'L', lotId: 'txS:0', unitCost: 400 }, { listingId: 'L', lotId: 'txS:1', unitCost: 300 }, { listingId: 'M', lotId: 'txS:2', unitCost: 100 }, { listingId: 'V', lotId: 'txS:3', unitCost: 90000 }];
  R.stampAcquisitions(plan, { transactionId: 'txS', context: 'store-purchase', at: 5, lines });
  const acq = i => plan.add.items[i].flags['foundryvtt-swse'].acquisition;
  assert.deepEqual([acq(0).lotId, acq(1).lotId, acq(2).lotId], ['txS:0', 'txS:1', 'txS:2'], 'two docs of one listing get two different lots'); assert.equal(plan.add.items[0].__acquisition, undefined);
  const va = plan.create.actors[0].data.flags['foundryvtt-swse'].acquisition;
  assert.deepEqual([va.unitPaid, va.publishedUnitCost, va.condition, va.sourceEntryKey, va.lotId], [90000, 100000, 'new', 'k', 'txS:3'], 'vehicle: paid 90000 vs published new 100000, condition kept');
  // TRANSACTION-wide allocation: one shared `claimed` set across several plans; identical listings, identical and different prices, Items/Droids/Vehicles mixed
  {
    const dm = (id, paid, type = 'droid') => ({ data: { name: id, __acquisition: R.buildAcquisitionMarker({ listing: { id, sourceUuid: SRC, type, cost: 1000, costNew: 1000 }, unitPaid: paid, condition: type === 'vehicle' ? 'new' : undefined }) } });
    const it = (id, paid) => ({ name: id, ...mk(id, paid) });
    const planA = { add: { items: [it('L', 400), it('L', 400)] }, create: { actors: [dm('D', 800), dm('V', 5000, 'vehicle')] } };
    const planB = { add: { items: [it('L', 400), it('L', 300)] }, create: { actors: [dm('D', 800), dm('V', 5000, 'vehicle'), dm('D', 700)] } };
    const L2 = [
      { listingId: 'L', lotId: 't:0', unitCost: 400 }, { listingId: 'L', lotId: 't:1', unitCost: 400 }, { listingId: 'L', lotId: 't:2', unitCost: 400 }, { listingId: 'L', lotId: 't:3', unitCost: 300 },
      { listingId: 'D', lotId: 't:4', unitCost: 800 }, { listingId: 'V', lotId: 't:5', unitCost: 5000 }, { listingId: 'D', lotId: 't:6', unitCost: 800 }, { listingId: 'V', lotId: 't:7', unitCost: 5000 }, { listingId: 'D', lotId: 't:8', unitCost: 700 }
    ];
    const claimed = new Set();
    for (const p of [planA, planB]) R.stampAcquisitions(p, { transactionId: 't', context: 'store-purchase', at: 1, lines: L2, claimed });
    const lots = [...planA.add.items, ...planB.add.items].map(i => i.flags['foundryvtt-swse'].acquisition.lotId).concat([...planA.create.actors, ...planB.create.actors].map(a => a.data.flags['foundryvtt-swse'].acquisition.lotId));
    assert.deepEqual(lots, ['t:0', 't:1', 't:2', 't:3', 't:4', 't:5', 't:6', 't:7', 't:8'], 'every doc of the whole transaction gets its own lot');
    assert.equal(new Set(lots).size, lots.length, 'no lot is allocated twice');
    const paidOf = (p, i, k = 'add') => (k === 'add' ? p.add.items[i] : p.create.actors[i].data).flags['foundryvtt-swse'].acquisition.unitPaid;
    assert.deepEqual([paidOf(planB, 1), paidOf(planB, 2, 'actors')], [300, 700], 'different prices for identical listings stay matched to their own lot');
    // without a shared set (the old per-plan behaviour) the second plan would re-claim t:0 — the engine must pass one set
    const solo = { add: { items: [it('L', 400)] } }; R.stampAcquisitions(solo, { transactionId: 't', context: 'c', at: 1, lines: L2, claimed });
    assert.equal(solo.add.items[0].flags['foundryvtt-swse'].acquisition.lotId, null, 'once every matching line is claimed, a further doc gets no lot');
    const te = read('scripts/engine/store/transaction-engine.js');
    assert.match(te, /const claimedLots = new Set\(\)/); assert.equal((te.match(/stampAcquisitions\(/g) ?? []).length, 1, 'a single call site'); assert.match(te, /claimed: claimedLots/);
  }
  const orphan = { add: { items: [{ name: 'z', ...mk('NOLINE', 1) }] } }; R.stampAcquisitions(orphan, { transactionId: 't', context: 'c', at: 1, lines });
  assert.equal(orphan.add.items[0].flags['foundryvtt-swse'].acquisition.lotId, null, 'a doc with no ledger line holds no entitlement');
  assert.equal(R.publishedUnitCostOf({ type: 'vehicle', costNew: 100000, costUsed: null }, 'used'), null, 'no derived used price');
  ok('entitlement: automatic payout ONLY for ledger-verified, unspent, unambiguous lots; unverified/forged/duplicated/overclaimed/consumed -> appraisal with a published REFERENCE; exact lots; stamping 1:1');
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
  assert.deepEqual(disp.ownership, { default: 0, gm: 3, '-=p1': null }, 'the former player key is deleted, not merely left in place'); assert.equal(disp['system.ownedByActorId'], null);
  assert.deepEqual(disp['flags.foundryvtt-swse.resale'].previousOwnership, { default: 0, p1: 3 }, 'prior access recorded for recovery');
  assert.equal(JSON.stringify(disp).includes('delete'), false, 'the Actor is kept, never deleted');
  ok('assets: ownership both ways, finalized, no crew, not already sold; evidence shows verified paid / published / construction; policy reference 45000; disposition keeps the Actor');
}
// 7. trusted boundary with fakes
const { ResaleService } = await import('/systems/foundryvtt-swse/scripts/engine/store/resale-service.js');
const { HouseRuleService } = await import('/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js');
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const realAutomaticGate = ResaleService.automaticResaleAllowed.bind(ResaleService);
// the policy half is tested directly; the trust gate (always closed) has its own test below
ResaleService.automaticResaleAllowed = a => ResaleService.policyAllowsAutomatic(a);
const settings = { automaticSalePercentage: 50, autoAcceptItemSales: true, resaleBasis: 'published' };
HouseRuleService.getNumber = (k, f) => settings[k] ?? f; HouseRuleService.getString = (k, f) => settings[k] ?? f; HouseRuleService.isEnabled = k => settings[k] === true;
const realAcquisitionFor = ResaleService.acquisitionFor.bind(ResaleService);
ResaleService.acquisitionFor = (actor, data) => ({ ...ENTITLED, unitPaid: 400, unitsAvailable: ownedQty(data) });
ResaleService.sourceFor = async data => (data._stats?.compendiumSource === SRC ? source : data._stats?.compendiumSource === gearSrc.sourceUuid ? gearSrc : null);
const ownedQty = d => A.ownedQuantity(d) ?? 1;
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
// 7b. real acquisitionFor against an actor's own ledger: grants, drags, duplicates, replays (S9 closure)
{
  setUser(false);
  const LISTING = 'foundryvtt-swse.weapons-pistols.abc';
  const ledger = { tx1: { id: 'tx1', type: 'Buy', status: 'Success', context: 'store-purchase', createdAt: 1, audit: { items: [{ lotId: 'tx1:0', listingId: LISTING, sourceUuid: SRC, unitCost: 400, publishedUnitCost: 500, quantity: 1, condition: null }] } } };
  const acqFlag = { transactionId: 'tx1', lotId: 'tx1:0', listingId: LISTING, sourceUuid: SRC, unitPaid: 400, condition: null };
  const bought = (id = 'i1', flag = acqFlag) => pistol({ _id: id, flags: { 'foundryvtt-swse': { acquisition: flag } } });
  const actorWith = (items, extraLedger = {}) => mkActor(items.map(mkItem), { flags: { 'foundryvtt-swse': { transactions: { ...ledger, ...extraLedger } } } });
  const verify = (actor, id = 'i1') => realAcquisitionFor(actor, actor.items.get(id).toObject());
  const sellable = async (actor, id = 'i1', context = 'store-sale') => {
    ResaleService.acquisitionFor = realAcquisitionFor;
    try { return await ResaleService.verifyForCommit({ actor, itemId: id, quantity: 1, authority: 'canonical-automatic', transactionContext: context }); }
    finally { ResaleService.acquisitionFor = (a, d) => ({ ...ENTITLED, unitsAvailable: ownedQty(d) }); }
  };
  // legitimate purchase: automatic
  settings.resaleBasis = 'acquisition';
  let r = await sellable(actorWith([bought()])); assert.deepEqual([r.ok, r.payout], [true, 200], 'purchased item: 50% of the verified 400 paid');
  // loot / GM grant / dragged-in compendium item: canonical source but no acquisition -> not automatic
  r = await sellable(actorWith([pistol({ _id: 'loot' })]), 'loot'); assert.equal(r.ok, false); assert.ok(r.reasons.includes('UNVERIFIED_ACQUISITION'), 'a canonical source proves what it is, not that it was acquired');
  // forged reference on a dragged-in item (no matching ledger)
  r = await sellable(actorWith([bought('f1', { ...acqFlag, transactionId: 'tx404' })]), 'f1'); assert.equal(r.ok, false);
  r = await sellable(actorWith([bought('f2', { ...acqFlag, unitPaid: 99999 })]), 'f2'); assert.equal(r.ok, false, 'inflated paid price');
  // copied reference from ANOTHER actor's purchase: this actor's ledger has no such transaction
  r = await sellable(mkActor([mkItem(bought('c1'))], { flags: {} }), 'c1'); assert.equal(r.ok, false, 'a reference copied onto an actor with no matching ledger');
  // duplicated item (same lot on two docs): neither is entitled
  const dup = actorWith([bought('i1'), bought('i2')]);
  assert.deepEqual([verify(dup, 'i1').verified, verify(dup, 'i2').verified], [false, false]); assert.ok(verify(dup, 'i1').reasons.includes('ACQUISITION_LOT_CLAIMED_BY_MULTIPLE_ITEMS'));
  assert.equal((await sellable(dup, 'i2')).ok, false, 'selling a duplicate against the original purchase is refused');
  // the lot already paid out (a sale record names the lot) -> no entitlement even on a re-created item with a NEW embedded id
  const spent = { txs: { id: 'txs', type: 'Sell', status: 'Success', context: 'store-sale', createdAt: 2, audit: { lotDisposal: { lotId: 'tx1:0', quantity: 1 } } } };
  const recreated = actorWith([bought('brand-new-id')], spent);
  assert.equal(verify(recreated, 'brand-new-id').unitsAvailable, 0, '1 purchased, 1 already paid out: nothing left, whatever the embedded id');
  r = await sellable(recreated, 'brand-new-id'); assert.equal(r.ok, false, 'one purchase entitles one payout regardless of the embedded Item id');
  // a GM-APPRAISED sale of a purchased Item also uses the lot up, so a copy cannot claim it afterwards
  setUser(true); ResaleService.acquisitionFor = realAcquisitionFor;
  const apprAudit = await ResaleService.verifyForCommit({ actor: actorWith([bought()]), itemId: 'i1', quantity: 1, authority: 'gm-appraisal', appraisal: { amount: 50, reason: 'damaged' }, transactionContext: 'store-sale-approval' });
  assert.deepEqual(apprAudit.lotDisposal, { lotId: 'tx1:0', quantity: 1 }, 'the appraised sale records the lot it consumed');
  setUser(false); ResaleService.acquisitionFor = (a, d) => ({ ...ENTITLED, unitsAvailable: ownedQty(d) });
  // two purchases of the same listing at different prices: each item pays on its own lot
  const ledger2 = { ...ledger, tx2: { id: 'tx2', type: 'Buy', status: 'Success', context: 'store-purchase', createdAt: 3, audit: { items: [{ lotId: 'tx2:0', listingId: LISTING, sourceUuid: SRC, unitCost: 300, publishedUnitCost: 500, quantity: 1, condition: null }] } } };
  const two = mkActor([mkItem(bought('i1')), mkItem(bought('i2', { ...acqFlag, transactionId: 'tx2', lotId: 'tx2:0', unitPaid: 300 }))], { flags: { 'foundryvtt-swse': { transactions: ledger2 } } });
  assert.deepEqual([verify(two, 'i1').unitPaid, verify(two, 'i2').unitPaid], [400, 300]);
  assert.deepEqual([(await sellable(two, 'i1')).payout, (await sellable(two, 'i2')).payout], [200, 150], 'each Item pays on its own lot');
  // the published BASIS policy still requires the entitlement
  settings.resaleBasis = 'published'; r = await sellable(actorWith([bought()])); assert.deepEqual([r.ok, r.payout], [true, 250]);
  r = await sellable(actorWith([pistol({ _id: 'loot' })]), 'loot'); assert.equal(r.ok, false, 'published basis does not entitle unverified items'); settings.resaleBasis = 'published';
  // a GM can still appraise unverified inventory, recorded with the published reference
  setUser(true);
  ResaleService.acquisitionFor = realAcquisitionFor;
  const appraised = await ResaleService.verifyForCommit({ actor: actorWith([pistol({ _id: 'loot' })]), itemId: 'loot', quantity: 1, authority: 'gm-appraisal', appraisal: { amount: 180, reason: 'found loot' }, transactionContext: 'store-sale-approval' });
  assert.deepEqual([appraised.ok, appraised.payout, appraised.appraisal.automaticValuationReasons.includes('UNVERIFIED_ACQUISITION')], [true, 180, true]);
  ResaleService.acquisitionFor = (a, d) => ({ ...ENTITLED, unitsAvailable: ownedQty(d) }); setUser(false); settings.resaleBasis = 'published';
  ok('real ledger checks: purchased -> automatic; loot / dragged-in / forged / copied / duplicated / already-paid-out lots -> no automatic payout; same-listing lots independent; GM appraisal still possible');
}
// 7z. automatic credit creation is disabled until a GM-controlled executor exists (the buyer's ledger is owner-writable)
{
  setUser(false);
  settings.autoAcceptItemSales = true;
  const actor = mkActor([mkItem(pistol())]);
  assert.deepEqual(realAutomaticGate(actor), { allowed: false, reason: 'AUTOMATIC_CREDITS_REQUIRE_GM_AUTHORITY' }, 'the house rule cannot re-enable client-side credit creation');
  const saved = ResaleService.automaticResaleAllowed; ResaleService.automaticResaleAllowed = realAutomaticGate;
  try {
    const r = await ResaleService.verifyForCommit({ actor, itemId: 'i1', quantity: 1, authority: 'canonical-automatic', transactionContext: 'store-sale' });
    assert.equal(r.ok, false); assert.deepEqual(r.reasons, ['AUTOMATIC_CREDITS_REQUIRE_GM_AUTHORITY'], 'a player-executed sale that would create credits is refused at the commit boundary');
    setUser(true);
    const gmOk = await ResaleService.verifyForCommit({ actor, itemId: 'i1', quantity: 1, authority: 'canonical-automatic', shownQuote: null, transactionContext: 'store-sale-approval' });
    assert.equal(gmOk.ok, true, 'the GM-decided path is unaffected'); setUser(false);
  } finally { ResaleService.automaticResaleAllowed = saved; }
  ok('automatic credit creation is closed (owner-writable ledger); player sales go to GM approval; GM-decided sales unaffected');
}
// 8. whole-asset sale transaction: recovery first, transactional owner plan, observed outcomes, no restore after possible payment
{
  setUser(true);
  const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
  const realSnap = { c: SnapshotManager.createSnapshot, g: SnapshotManager.getSnapshot };
  const mk = () => {
    const owner = { id: 'o1', name: 'Buyer', isOwner: true, ownership: { p1: 3 }, system: { credits: 100, ownedActors: [{ id: 'd1' }, { id: 'x1' }], relationships: [{ id: 'd1', uuid: 'Actor.d1' }] }, flags: {} };
    owner.toObject = () => JSON.parse(JSON.stringify({ _id: owner.id, name: owner.name, system: owner.system, flags: owner.flags }));
    const droid = { id: 'd1', name: 'R2', type: 'droid', ownership: { default: 0, p1: 3 }, system: { ownedByActorId: 'o1', droidSystems: { stateMode: 'FINALIZED' } }, flags: {} };
    droid.toObject = () => JSON.parse(JSON.stringify({ _id: droid.id, name: droid.name, type: droid.type, ownership: droid.ownership, system: droid.system, flags: droid.flags }));
    globalThis.game.actors = { get: id => ({ o1: owner, d1: droid })[id] ?? null, contents: [owner, droid] };
    return { owner, droid };
  };
  let { owner, droid } = mk();
  const calls = []; const real = { upd: ActorEngine.updateActor, plan: ActorEngine.applyMutationPlan };
  const b = { skipOwnershipRestore: false, skipOwnerLinkRestore: false, slowRestore: false, snapshot: true, disposeFails: false, undoFails: false, finalizeFails: false, plan: 'ok' };
  SnapshotManager.createSnapshot = async () => { calls.push(['snapshot']); if (!b.snapshot) throw new Error('no snapshot'); return { timestamp: 1 }; };
  SnapshotManager.getSnapshot = () => ({ schemaVersion: 2, scope: 'full-actor' });
  const resaleOf = () => droid.flags['foundryvtt-swse']?.resale;
  // Foundry MERGES an ownership update: keys are removed only with `-=key`
  const mergeOwn = (actor, own) => { actor.ownership ??= {}; for (const [k, v] of Object.entries(own ?? {})) { if (k.startsWith('-=')) delete actor.ownership[k.slice(2)]; else actor.ownership[k] = v; } };
  ActorEngine.updateActor = async (actor, data) => {
    if ('flags.foundryvtt-swse.-=resale' in data) { calls.push(['asset-revert']); if (b.undoFails) throw new Error('undo failed'); if (b.slowRestore) await new Promise(r => setTimeout(r, 20)); delete actor.flags['foundryvtt-swse']?.resale; if (!b.skipOwnerLinkRestore) actor.system.ownedByActorId = data['system.ownedByActorId']; if (!b.skipOwnershipRestore) mergeOwn(actor, data.ownership); return; }
    if ('flags.foundryvtt-swse.resale' in data) { if (actor.flags['foundryvtt-swse']?.resale && data['flags.foundryvtt-swse.resale'].reconciliationReasons) { calls.push(['asset-marker']); actor.flags['foundryvtt-swse'].resale = data['flags.foundryvtt-swse.resale']; return; } calls.push(['asset-dispose', data['flags.foundryvtt-swse.resale'].status]); if (b.disposeFails) throw new Error('dispose failed'); actor.flags['foundryvtt-swse'] = { resale: data['flags.foundryvtt-swse.resale'] }; actor.system.ownedByActorId = null; mergeOwn(actor, data.ownership); return; }
    if ('flags.foundryvtt-swse.resale.status' in data) { calls.push(['asset-finalize']); if (b.finalizeFails) throw new Error('finalize failed'); actor.flags['foundryvtt-swse'].resale.status = data['flags.foundryvtt-swse.resale.status']; return; }
    if ('flags.foundryvtt-swse.resale.needsReconciliation' in data) { calls.push(['asset-flag']); actor.flags['foundryvtt-swse'].resale.needsReconciliation = true; }
  };
  const applyOwner = (actor, set) => { for (const [k, v] of Object.entries(set)) { if (k === 'system.credits') actor.system.credits = v; else if (k === 'system.ownedActors') actor.system.ownedActors = v; else if (k === 'system.relationships') actor.system.relationships = v; else if (k.startsWith('flags.foundryvtt-swse.transactions.')) { actor.flags['foundryvtt-swse'] ??= { transactions: {} }; actor.flags['foundryvtt-swse'].transactions ??= {}; actor.flags['foundryvtt-swse'].transactions[k.split('.').pop()] = v; } } };
  let lastOpts = null;
  ActorEngine.applyMutationPlan = async (actor, plan, opts) => {
    calls.push(['owner-plan', opts?.transactional === true]); lastOpts = opts;
    if (b.plan === 'rejected-compensated') { const e = new Error('credit write failed'); e.rollbackOutcome = 'FAILED_COMPENSATED'; throw e; }
    if (b.plan === 'nothing-landed') { const e = new Error('outcome unknown'); e.rollbackOutcome = 'INDETERMINATE'; throw e; }
    if (b.plan === 'partial') { actor.system.credits = plan.set['system.credits']; const e = new Error('ledger write failed'); e.rollbackOutcome = 'INDETERMINATE'; e.partialMutationPossible = true; throw e; }
    if (b.plan === 'compensated-but-observed-paid') { applyOwner(actor, plan.set); const e = new Error('claimed rolled back'); e.rollbackOutcome = 'FAILED_COMPENSATED'; throw e; }
    applyOwner(actor, plan.set);
    if (b.plan === 'post-commit') throw new Error('hook failed after commit');
  };
  const reset = () => { ({ owner, droid } = mk()); calls.length = 0; Object.assign(b, { snapshot: true, disposeFails: false, undoFails: false, finalizeFails: false, plan: 'ok' }); };
  const sell = ap => TransactionEngine.executeAssetSaleTransaction({ ownerActor: owner, assetActorId: 'd1', appraisal: ap, requestId: 'r1', reason: 'r' }, { validate: false });
  try {
    setUser(false); let r = await sell({ amount: 500, reason: 'x' }); assert.equal(r.success, false); assert.equal(calls.length, 0, 'a non-GM touches nothing'); setUser(true);
    r = await sell({ amount: 0, reason: 'x' }); assert.equal(r.success, false); assert.equal(calls.length, 0, 'bad appraisal touches nothing');

    // happy path: recovery BEFORE any write, pending disposal, ONE transactional owner plan, then finalized; disposal carries the REAL transaction id
    reset(); r = await sell({ amount: 500, reason: 'fair' });
    assert.equal(r.success, true); assert.equal(owner.system.credits, 600);
    assert.deepEqual(calls.map(c => c[0]), ['snapshot', 'asset-dispose', 'owner-plan', 'asset-finalize'], 'recovery -> pending disposal -> owner plan -> finalize');
    assert.deepEqual(calls[1], ['asset-dispose', 'sale-pending']); assert.equal(calls[2][1], true, 'the owner plan is transactional'); assert.equal(lastOpts.transactional, true);
    assert.equal(resaleOf().status, 'sold'); assert.equal(resaleOf().transactionId, r.transactionId, 'the asset disposition names the committed transaction');
    assert.deepEqual(droid.ownership, { default: 0, gm: 3 }, 'the former owner\'s permission is actually REMOVED (Foundry merges ownership; the update deletes the old keys)');
    assert.ok(owner.flags['foundryvtt-swse'].transactions[r.transactionId], 'and that transaction is the owner ledger record'); assert.equal(owner.system.ownedActors.some(e => e.id === 'd1'), false);

    // no recovery -> refuse before ANY write
    reset(); b.snapshot = false; r = await sell({ amount: 500, reason: 'fair' });
    assert.equal(r.success, false); assert.match(r.error, /recovery could not be established/); assert.deepEqual(calls.map(c => c[0]), ['snapshot'], 'nothing written without a verified recovery');

    // disposal fails: the owner was never touched -> verified unpaid, asset state verified
    reset(); b.disposeFails = true; r = await sell({ amount: 500, reason: 'fair' });
    assert.deepEqual([r.success, r.verifiedUnpaid, r.assetRestored], [false, true, true]); assert.equal(owner.system.credits, 100); assert.ok(!calls.some(c => c[0] === 'owner-plan'), 'no credit is attempted after a failed disposal');

    // owner plan rejected AND ActorEngine verified its compensation AND the owner reads as before -> asset restored (verified)
    reset(); b.plan = 'rejected-compensated'; r = await sell({ amount: 500, reason: 'fair' });
    assert.deepEqual([r.success, r.verifiedUnpaid, r.assetRestored], [false, true, true]); assert.equal(owner.system.credits, 100);
    assert.deepEqual(calls.map(c => c[0]), ['snapshot', 'asset-dispose', 'owner-plan', 'asset-revert']); assert.equal(resaleOf(), undefined); assert.equal(droid.system.ownedByActorId, 'o1'); assert.deepEqual(droid.ownership, { default: 0, p1: 3 }, 'original permissions restored exactly (the GM key added by the disposal is removed)');

    // ...but the revert itself fails -> owner verified unpaid, asset GM-held, reconciliation required, never "restored"
    reset(); b.plan = 'rejected-compensated'; b.undoFails = true; r = await sell({ amount: 500, reason: 'fair' });
    assert.deepEqual([r.success, r.indeterminate, r.ownerUnpaidVerified, r.needsReconciliation, r.rollbackFailed], [false, true, true, true, true]); assert.equal(resaleOf().status, 'sale-pending'); assert.equal(owner.system.credits, 100);

    // PARTIAL owner mutation (credits landed, ledger/unlink did not) with INDETERMINATE rollback -> NEVER restore the asset
    reset(); b.plan = 'partial'; r = await sell({ amount: 500, reason: 'fair' });
    assert.deepEqual([r.success, r.indeterminate, r.paymentUnverified, r.needsReconciliation], [false, true, true, true]);
    assert.ok(!calls.some(c => c[0] === 'asset-revert'), 'the asset is not returned to a seller who may have been paid'); assert.equal(resaleOf().status, 'sale-pending'); assert.equal(resaleOf().needsReconciliation, true);
    assert.equal(owner.system.credits, 600, 'the observed (possibly paid) balance is left as found, never silently refunded'); assert.match(r.error, /UNVERIFIED/); assert.doesNotMatch(r.error, /NOT paid/);

    // the engine CLAIMS a verified rollback but the owner is observably paid -> the observation wins; asset NOT restored, sale finalized
    reset(); b.plan = 'compensated-but-observed-paid'; r = await sell({ amount: 500, reason: 'fair' });
    assert.equal(r.success, true); assert.ok(!calls.some(c => c[0] === 'asset-revert')); assert.equal(resaleOf().status, 'sold');

    // post-commit error: the owner is fully paid -> SUCCESS with a warning field, asset finalized
    reset(); b.plan = 'post-commit'; r = await sell({ amount: 500, reason: 'fair' });
    assert.equal(r.success, true); assert.match(r.postCommitError, /hook failed/); assert.equal(resaleOf().status, 'sold'); assert.ok(!calls.some(c => c[0] === 'asset-revert'));

    // finalization failure after a committed payment: still success, never restored, flagged for GM finalization
    reset(); b.finalizeFails = true; r = await sell({ amount: 500, reason: 'fair' });
    assert.equal(r.success, true); assert.equal(r.assetStatusPending, true); assert.equal(resaleOf().status, 'sale-pending'); assert.ok(!calls.some(c => c[0] === 'asset-revert'));

    // ---- GM reconciliation (hardened) ----
    const tx = () => owner.flags['foundryvtt-swse']?.transactions ?? {};
    const rec = () => TransactionEngine.reconcileAssetSale({ ownerActor: owner, assetActorId: 'd1' });
    const pendingPaid = async () => { reset(); b.finalizeFails = true; const r = await sell({ amount: 500, reason: 'fair' }); b.finalizeFails = false; assert.equal(r.success, true); assert.equal(resaleOf().status, 'sale-pending'); return r.transactionId; };
    const pendingUnpaid = async (plan = 'rejected-compensated') => { reset(); b.plan = plan; b.undoFails = true; await sell({ amount: 500, reason: 'fair' }); b.undoFails = false; b.plan = 'ok'; assert.equal(resaleOf().status, 'sale-pending'); };
    const stays = (r, why) => { assert.equal(r.success, false, why); assert.equal(r.outcome, 'unresolved', why); assert.equal(resaleOf().status, 'sale-pending', `${why}: the asset is not finalized`); assert.equal(resaleOf().needsReconciliation, true, `${why}: explicit reconciliation state`); assert.ok(r.reasons?.length, why); };

    // interrupted between payment and finalization: verified paid -> completed; a replay finds nothing to do
    let id = await pendingPaid(); let x = await rec(); assert.deepEqual([x.success, x.outcome, x.reasons], [true, 'completed', undefined]); assert.equal(resaleOf().status, 'sold');
    x = await rec(); assert.equal(x.outcome, 'nothing-to-reconcile', 'a replayed reconciliation does nothing'); assert.equal(owner.system.credits, 600);

    // ---- negative: a "successful" record is NOT proof unless it is THIS asset sale ----
    const corrupt = [
      ['unrelated successful transaction record', async () => { id = await pendingPaid(); tx()[id] = { id: 'other', status: 'Success', type: 'Buy', context: 'store-purchase', actorId: 'o1', amount: 500, createdAt: 1 }; }],
      ['not an asset-sale context', async () => { id = await pendingPaid(); tx()[id].context = 'store-sale'; }],
      ['incorrect asset id', async () => { id = await pendingPaid(); tx()[id].audit.assetActorId = 'dX'; }],
      ['incorrect owner id', async () => { id = await pendingPaid(); tx()[id].actorId = 'oX'; }],
      ['mismatched payout', async () => { id = await pendingPaid(); tx()[id].amount = 5; }],
      ['recorded wallet transition mismatch', async () => { id = await pendingPaid(); tx()[id].creditsAfter = 601; }],
      ['wallet amount mismatch', async () => { id = await pendingPaid(); owner.system.credits = 777; }],
      ['ownership-link mismatch (seller still links the asset)', async () => { id = await pendingPaid(); owner.system.ownedActors.push({ id: 'd1' }); }],
      ['seller relationship left behind', async () => { id = await pendingPaid(); owner.system.relationships.push({ id: 'd1', uuid: 'Actor.d1' }); }],
      ['a player still has access', async () => { id = await pendingPaid(); droid.ownership.p1 = 3; }],
      ['asset still names an owner', async () => { id = await pendingPaid(); droid.system.ownedByActorId = 'o1'; }],
      ['asset transferred to another actor', async () => { id = await pendingPaid(); const other = { id: 'o2', system: { ownedActors: [{ id: 'd1' }] } }; globalThis.game.actors.contents.push(other); }],
      ['asset already sold through another transaction', async () => { id = await pendingPaid(); tx().txOther = { id: 'txOther', status: 'Success', type: 'Sell', context: 'store-asset-sale-approval', actorId: 'o1', amount: 1, createdAt: 2, audit: { assetActorId: 'd1' } }; }]
    ];
    for (const [name, arrange] of corrupt) { await arrange(); x = await rec(); stays(x, name); assert.ok(!calls.some(c => c[0] === 'asset-revert'), `${name}: never restores`); }

    // a later, unrelated transaction legitimately explains a different wallet
    id = await pendingPaid(); owner.system.credits = 450; tx().later = { id: 'later', status: 'Success', type: 'Buy', context: 'store-purchase', actorId: 'o1', amount: 150, createdAt: Date.now() + 1000 };
    x = await rec(); assert.deepEqual([x.success, x.outcome], [true, 'completed'], 'a later ledger transaction explains a spent wallet');

    // ---- restoration: only when UNPAID is verified, and the result is verified ----
    await pendingUnpaid(); x = await rec(); assert.deepEqual([x.success, x.outcome], [true, 'restored']);
    assert.equal(resaleOf(), undefined); assert.equal(droid.system.ownedByActorId, 'o1'); assert.deepEqual(droid.ownership, { default: 0, p1: 3 }, 'original permissions restored exactly'); assert.equal(owner.system.credits, 100);
    x = await rec(); assert.equal(x.outcome, 'nothing-to-reconcile', 'replayed restoration');
    // interruption between disposal and payment (the engine could not say what happened, nothing landed): reconcile proves unpaid and restores
    await pendingUnpaid('nothing-landed'); x = await rec(); assert.deepEqual([x.success, x.outcome], [true, 'restored']);
    // permission restoration failure: the ownership map does not come back -> NOT reported as restored
    await pendingUnpaid(); b.skipOwnershipRestore = true; x = await rec(); b.skipOwnershipRestore = false; stays(x, 'permission restoration failure'); assert.match(x.reasons.join(), /ownership/);
    // incomplete restoration: owner link not restored
    await pendingUnpaid(); b.skipOwnerLinkRestore = true; x = await rec(); b.skipOwnerLinkRestore = false; stays(x, 'incomplete restoration'); assert.match(x.reasons.join(), /owner link/);
    // restore write itself fails
    await pendingUnpaid(); b.undoFails = true; x = await rec(); b.undoFails = false; stays(x, 'restore write fails');
    // unpaid evidence missing
    await pendingUnpaid(); owner.system.credits = 101; x = await rec(); stays(x, 'wallet moved: payment may have landed'); assert.equal(calls.filter(c => c[0] === 'asset-revert').length > 0, true);
    await pendingUnpaid(); owner.system.ownedActors = []; x = await rec(); stays(x, 'seller no longer links the asset');
    await pendingUnpaid(); owner.system.relationships = []; x = await rec(); stays(x, 'relationship inconsistent');
    await pendingUnpaid(); globalThis.game.actors.contents.push({ id: 'o3', system: { ownedActors: [{ id: 'd1' }] } }); x = await rec(); stays(x, 'conflicting transfer');
    await pendingUnpaid('partial'); x = await rec(); stays(x, 'partial mutation: credit landed, no record'); assert.equal(owner.system.credits, 600, 'never silently refunded');

    // concurrent reconciliation: exactly one performs the work, the other is refused
    await pendingUnpaid(); b.slowRestore = true;
    const [r1, r2] = await Promise.all([rec(), rec()]); b.slowRestore = false;
    assert.deepEqual([r1, r2].map(r => r.outcome).sort(), ['in-progress', 'restored'], 'two simultaneous reconciliations cannot both act');
    setUser(false); x = await rec(); assert.equal(x.success, false, 'reconciliation is GM only'); setUser(true);

    // replay: a committed request id is refused
    reset(); owner.flags = { 'foundryvtt-swse': { transactions: { tx9: { id: 'tx9', status: 'Success', type: 'Sell', context: 'store-asset-sale-approval', createdAt: 1, audit: { requestId: 'r1' } } } } };
    r = await sell({ amount: 500, reason: 'fair' }); assert.equal(r.success, false); assert.equal(r.reasons[0], 'REQUEST_ALREADY_COMMITTED'); assert.equal(calls.length, 0);
  } finally { ActorEngine.updateActor = real.upd; ActorEngine.applyMutationPlan = real.plan; SnapshotManager.createSnapshot = realSnap.c; SnapshotManager.getSnapshot = realSnap.g; }
  ok('asset sale: recovery first, transactional owner plan, outcomes OBSERVED; partial/indeterminate never restores the asset; failed compensation/revert flagged; post-commit errors are success; disposition carries the real transaction id; GM reconcile from the ledger');
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
    assert.equal(rec.audit.resaleAuthority, 'canonical-automatic'); assert.deepEqual(rec.audit.lotDisposal, null, 'no lot on this fixture'); assert.equal(rec.audit.items[0].quantity, 2); assert.equal(rec.audit.resaleQuote.payout, 100); assert.equal(rec.audit.requestId, 'r-g1-2');
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
// 8d. the purchase transaction wires lot ids (static: executeMutationTransaction needs a real recovery-snapshot store to run offline)
{
  const te = read('scripts/engine/store/transaction-engine.js');
  const fn = te.slice(te.indexOf('static async executeMutationTransaction('), te.indexOf('static async executeCreditAdjustment(') > 0 ? te.indexOf('static async executeCreditAdjustment(') : undefined);
  assert.match(fn, /lotId: lotIdFor\(transactionId, index\)/, 'each purchase line gets a lot id');
  assert.match(fn, /stampAcquisitions\(plan, \{[^}]*lines: Array\.isArray\(auditLines\)/, 'delivered assets are allocated to those same lines');
  assert.match(fn, /\.\.\.\(Array\.isArray\(auditLines\) \? \{ items: auditLines \} : \{\}\)/, 'the ledger record stores the lines with their lot ids');
  ok('purchase transaction: ledger lines carry lot ids and the delivered assets are stamped from the same lines');
}
// 8e. evidence for the threat model: inventory can enter an Actor without a Store purchase (so a canonical source alone must not entitle)
{
  const drop = read('scripts/services/drop-service.js');
  assert.match(drop, /Compendium item — create embedded copy[\s\S]{0,200}createEmbeddedDocuments\(targetActor, "Item"/, 'compendium drops create embedded Items with no acquisition record');
  assert.match(drop, /moveEmbeddedDocuments\(sourceActor, targetActor/, 'transfers move Items between actors; the buyer\'s ledger stays with the buyer');
  assert.doesNotMatch(drop, /acquisition/, 'nothing but the Store purchase transaction writes acquisition references');
  const writers = ['scripts/apps', 'scripts/engine', 'scripts/services', 'scripts/sheets', 'scripts/ui'].flatMap(function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]); })
    .filter(f => f.endsWith('.js') && /foundryvtt-swse'\]\.acquisition\s*=|foundryvtt-swse\.acquisition['"`]/.test(read(f))).map(f => f);
  assert.deepEqual(writers.sort(), ['scripts/engine/store/acquisition-record.js'], 'the acquisition reference is stamped in exactly one place');
  ok('threat model: compendium drops / transfers carry no entitlement; only the purchase transaction stamps acquisition references');
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
