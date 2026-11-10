import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals({});
const { verifyApprovalQuote, currentOfferFor } = await import('/systems/foundryvtt-swse/scripts/engine/store/store-approval-quote.js');

const inv = new Map([
  ['w1', { id: 'w1', type: 'weapon', finalCost: 500 }],
  ['v1', { id: 'v1', type: 'vehicle', finalCostNew: 150000, finalCostUsed: 65000 }],
  ['v2', { id: 'v2', type: 'vehicle', finalCostNew: 100000, finalCostUsed: null }]
]);
const line = (o) => ({ name: o.id, finalCost: 0, ...o });
const req = (items, costCredits) => ({ costCredits, approvalItems: items });

assert.equal(verifyApprovalQuote(req([line({ id: 'w1', finalCost: 500 })], 500), inv).ok, true);
assert.match(verifyApprovalQuote(req([line({ id: 'w1', finalCost: 499 })], 499), inv).reasons[0], /QUOTE_CHANGED/, 'any drift refuses (no tolerance, no rewrite)');
assert.match(verifyApprovalQuote(req([line({ id: 'gone', finalCost: 5 })], 5), inv).reasons[0], /LISTING_NO_LONGER_AVAILABLE/);
assert.match(verifyApprovalQuote(req([line({ id: 'w1', finalCost: 500 })], 600), inv).reasons[0], /TOTAL_MISMATCH/, 'a total is never rebalanced onto a line');
assert.match(verifyApprovalQuote(req([line({ id: 'w1', finalCost: 0 })], 0), inv).reasons[0], /QUOTE_MISSING/, 'a 0 quote is not a price');
// vehicle condition survives approval and never reverts to the new price
assert.equal(verifyApprovalQuote(req([line({ id: 'v1', condition: 'used', finalCost: 65000 })], 65000), inv).ok, true);
assert.match(verifyApprovalQuote(req([line({ id: 'v1', condition: 'used', finalCost: 150000 })], 150000), inv).reasons[0], /QUOTE_CHANGED/, 'used approval cannot be settled at the new price');
assert.match(verifyApprovalQuote(req([line({ id: 'v1', finalCost: 150000 })], 150000), inv).reasons[0], /VEHICLE_CONDITION_REQUIRED/);
assert.match(verifyApprovalQuote(req([line({ id: 'v2', condition: 'used', finalCost: 100000 })], 100000), inv).reasons[0], /NO_CURRENT_OFFER/, 'no published used price -> no used offer');
assert.equal(currentOfferFor(inv.get('v2'), 'used'), null);
assert.equal(verifyApprovalQuote(req([], 0), inv).ok, false);
// customization lines carry their own quote (S7) but still count in the total
assert.equal(verifyApprovalQuote(req([line({ id: 'w1', finalCost: 700, stagedCustomization: { itemData: {} } })], 700), inv).ok, true);

const svc = fs.readFileSync('scripts/ui/shell/gm/GMApprovalOperationsService.js', 'utf8');
assert.doesNotMatch(svc, /purchaseItems\[0\]\.finalCost = /, 'no silent price rebalancing');
assert.doesNotMatch(svc, /item\?\.itemData \|\| \{ name/, 'approval plans are not built from player-supplied item data');
assert.match(svc, /verifyApprovalQuote\(approval/);
console.log('store-v2-s2-approval-quote: all checks ok');
