import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// SSOT Priority 1C: ProgressionEconomyPlanBuilder sums chargen starting-credit grants through the provisional ledger (stable ids, provenance). The
// result must equal the historical formula for every combination, so no balance changes; the ledger adds provenance and idempotent grant ids.
for (const l of ['log', 'info', 'debug', 'warn']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const { ProgressionEconomyPlanBuilder: B } = await import('../scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js');

// the pre-ledger arithmetic, kept here as the oracle
const legacy = ({ explicit, base, wealth, includes }) => (explicit > 0 ? explicit + (wealth > 0 && !includes ? wealth : 0) : base + wealth);
const wealthSrc = [{ label: 'Wealth Talent', amount: 1 }], other = [{ label: 'Background Credits', amount: 1 }];
let cases = 0;
for (const explicit of [0, 2400, 3000]) for (const base of [0, 3000]) for (const wealth of [0, 5000, 15000]) for (const includes of [false, true]) {
  const r = B.compileChargenCreditGrants({ summary: { startingCredits: explicit, startingCreditsBreakdown: includes ? wealthSrc : other }, baseStartingCredits: base, wealthBonus: wealth });
  assert.equal(r.startingCredits, legacy({ explicit, base, wealth, includes }), JSON.stringify({ explicit, base, wealth, includes }));
  cases += 1;
}
// provenance and stable ids; nothing restricted, nothing expiring, nothing counted twice
{
  const r = B.compileChargenCreditGrants({ summary: { startingCredits: 2400, startingCreditsBreakdown: other }, baseStartingCredits: 3000, wealthBonus: 5000 });
  assert.deepEqual(r.grants.map((g) => [g.id, g.source, g.amount, g.step]), [['chargen:starting-credits', 'player-resolved-starting-credits', 2400, 'summary'], ['chargen:wealth-talent', 'wealth-talent', 5000, 'talent']]);
  assert.equal(r.settlement.expired, 0); assert.deepEqual(r.settlement.retainedRestricted, []);
  assert.equal(r.startingCredits, 7400);
  const same = B.compileChargenCreditGrants({ summary: { startingCredits: 2400, startingCreditsBreakdown: other }, baseStartingCredits: 3000, wealthBonus: 5000 });
  assert.deepEqual(same.grants, r.grants, 'deterministic');
  const includesWealth = B.compileChargenCreditGrants({ summary: { startingCredits: 7400, startingCreditsBreakdown: wealthSrc }, baseStartingCredits: 3000, wealthBonus: 5000 });
  assert.deepEqual(includesWealth.grants.map((g) => g.id), ['chargen:starting-credits'], 'Wealth already in the resolved amount is not granted twice');
}
process.stdout.write(`progression-credit-grants-ledger: ok (${cases} combinations equal the historical arithmetic)\n`);
