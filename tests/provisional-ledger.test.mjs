import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Transaction & Progression SSOT, Phase 2: the provisional ledger mechanism. All amounts below are ILLUSTRATIVE (the addendum's own example); the module
// hard-codes no sourcebook rule (TPS-RD-001), grants supply their own eligibility/expiry.
registerFoundryPathLoader(); installFoundryShimGlobals();
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const droid = 'droid-component';
const grants = (l) => l
  .registerGrant({ id: 'droid-allowance', source: 'droid-builder', amount: 1000, step: 'droid', ruleRef: 'illustrative', eligibleCategories: [droid], policy: 'expire-at-finalization' })
  .registerGrant({ id: 'talent-credits', source: 'talent', amount: 5000, step: 'talent', eligibleCategories: '*' })
  .registerGrant({ id: 'class-credits', source: 'class', amount: 1500, step: 'class', eligibleCategories: '*' });

// the addendum's worked example: 1,000 restricted + 5,000 + 1,500 = 7,500; 1,400 eligible purchase = 1,000 restricted + 400 general; liquid 6,100
{
  const l = grants(TransactionEngine.createProvisionalLedger());
  assert.equal(l.balances(droid).eligiblePurchasingPower, 7500);
  const s = l.purchase({ id: 'p1', category: droid, cost: 1400 });
  assert.equal(s.valid, true);
  assert.deepEqual(s.draws, [{ grantId: 'droid-allowance', amount: 1000 }, { grantId: 'talent-credits', amount: 400 }], 'restricted first, then eligible general funds (registration order)');
  const f = l.finalize();
  assert.equal(f.liquidCredits, 6100); assert.equal(f.expired, 0); assert.equal(f.complete, true);
}
// a non-eligible purchase never draws the restricted pool; unused restricted funds expire and never become liquid credits
{
  const l = grants(TransactionEngine.createProvisionalLedger());
  assert.equal(l.purchase({ id: 'gear', category: 'equipment', cost: 2000 }).draws.every((d) => d.grantId !== 'droid-allowance'), true);
  assert.equal(l.balances('equipment').eligiblePurchasingPower, 4500, '6500 general minus the 2000 purchase; the restricted allowance is not eligible');
  const f = l.finalize();
  assert.equal(f.expired, 1000); assert.equal(f.liquidCredits, 4500, 'the restricted 1000 is not liquid');
  const b = l.balances(); assert.deepEqual([b.restricted, b.unrestricted, b.expiring], [1000, 4500, 1000]);
}
// no partial funding: an unaffordable purchase is invalid, changes nothing and never makes a balance negative
{
  const l = grants(TransactionEngine.createProvisionalLedger());
  const bad = l.purchase({ id: 'huge', category: 'equipment', cost: 7000 });
  assert.equal(bad.valid, false); assert.match(bad.reason, /insufficient eligible funds/);
  assert.equal(l.finalize().liquidCredits, 6500 + 0, 'restricted allowance excluded from liquid; general 6500 untouched');
  assert.equal(l.finalize().complete, false, 'a ledger with an invalid purchase is not complete');
  assert.deepEqual(l.quote({ category: 'equipment', cost: 6500 }), { affordable: true, draws: [{ grantId: 'talent-credits', amount: 5000 }, { grantId: 'class-credits', amount: 1500 }] });
}
// idempotence: the same grant/purchase twice is one; the same id with different content is refused
{
  const l = grants(TransactionEngine.createProvisionalLedger());
  grants(l); l.purchase({ id: 'p', category: droid, cost: 100 }); l.purchase({ id: 'p', category: droid, cost: 100 });
  assert.equal(l.snapshot().grants.length, 3); assert.equal(l.snapshot().purchases.length, 1);
  assert.throws(() => l.registerGrant({ id: 'class-credits', amount: 9, eligibleCategories: '*' }), /different content/);
  assert.throws(() => l.purchase({ id: 'p', category: droid, cost: 5 }), /different content/);
  assert.throws(() => l.registerGrant({ id: 'x', amount: -1 }), /non-negative/); assert.throws(() => l.registerGrant({ id: 'y', amount: 1, policy: 'weird' }), /unknown policy/);
}
// upstream change: revoking a grant deterministically invalidates purchases it funded (flagged for correction), and restoring it re-validates them
{
  const l = grants(TransactionEngine.createProvisionalLedger());
  l.purchase({ id: 'big', category: 'equipment', cost: 6000 });
  assert.equal(l.replay().invalid.length, 0);
  l.revokeGrant('talent-credits');
  assert.deepEqual(l.replay().invalid.map((x) => x.id), ['big']);
  l.registerGrant({ id: 'talent-credits', source: 'talent', amount: 5000, step: 'talent', eligibleCategories: '*' });
  assert.equal(l.replay().invalid.length, 0);
  assert.deepEqual(JSON.stringify(l.replay()), JSON.stringify(l.replay()), 'deterministic');
}
// provenance is retained per grant even when the UI shows a combined number
{
  const l = grants(TransactionEngine.createProvisionalLedger());
  const g = l.snapshot().grants;
  assert.deepEqual(g.map((x) => [x.id, x.source, x.step, x.policy]), [['droid-allowance', 'droid-builder', 'droid', 'expire-at-finalization'], ['talent-credits', 'talent', 'talent', 'persist'], ['class-credits', 'class', 'class', 'persist']]);
}
// purity: no imports, no document/setting/chat access
const src = fs.readFileSync('scripts/engine/store/provisional-ledger.js', 'utf8');
assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ''), /\bimport\b|game\.|ActorEngine|\.update\(|setFlag|ChatMessage|settings/, 'the ledger is pure data');
process.stdout.write('provisional-ledger: ok\n');
