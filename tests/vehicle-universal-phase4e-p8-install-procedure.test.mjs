import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as J from '../scripts/domain/vehicles/vehicle-installation-job.js';
import * as R from '../scripts/domain/vehicles/vehicle-modification-rules.js';
import { planVehicleInstallation, DEFAULT_VEHICLE_INSTALLATION_RULES } from '../scripts/domain/vehicles/vehicle-installation-ledger.js';

installSystemsResolver(); installFoundryStubs();
const { SWSECombatDocument } = await import('../scripts/combat/swse-combat.js');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const unusedTable = JSON.parse(readFileSync('data/canonical/vehicles/construction/unused-emplacement-points.json', 'utf8'));
const overlay = JSON.parse(readFileSync('data/vehicle-modifications/certification.json', 'utf8'));
const catalog = ['movement-systems', 'defense-systems'].flatMap(f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8')));
const rulesWithTable = { ...DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: R.makeUnusedEmplacementResolver(unusedTable) };
const keyed = key => actors.find(a => a.system.vehicleSourceEntryKey === key);

// ---- the installation attempt procedure (SotG p. 40) ----
const quote = (over = {}) => R.quoteInstallation({ entry: { emplacementPoints: 3, cost: 3000, costType: 'base' }, size: 'Gargantuan', unusedEmplacementPoints: 5, ...over });

test('a successful check installs the system; nothing is installed before then', () => {
  const start = J.startInstallationJob({ jobId: 'j1', quote: quote() });
  assert.equal(start.ok, true);
  assert.equal(start.job.status, 'AWAITING_CHECK');
  assert.equal(start.job.dc, 23);
  assert.equal(start.job.creditsSpent, 6000);
  const done = J.recordInstallationCheck(start.job, { total: 23 });
  assert.deepEqual([done.outcome, done.install, done.job.status], ['SUCCESS', true, 'COMPLETE']);
  assert.equal(J.recordInstallationCheck(done.job, { total: 30 }).ok, false, 'a finished job cannot be rolled again');
});

test('partial failure (fail by less than 10): retry for half the time and money with +5; success then installs', () => {
  const { job } = J.startInstallationJob({ jobId: 'j2', quote: quote() });
  const first = J.recordInstallationCheck(job, { total: 14 }); // DC 23, fails by 9
  assert.deepEqual([first.outcome, first.install], ['PARTIAL_FAILURE', false]);
  assert.deepEqual(first.retry, { timeFraction: 0.5, costFraction: 0.5, mechanicsBonus: 5 });
  assert.equal(J.recordInstallationCheck(first.job, { total: 30 }).ok, false, 'must begin a retry first');
  const retry = J.beginInstallationRetry(first.job);
  assert.deepEqual([retry.charge, retry.mechanicsBonus, retry.job.status], [3000, 5, 'AWAITING_CHECK']);
  assert.equal(retry.job.creditsSpent, 9000);
  const second = J.recordInstallationCheck(retry.job, { total: 23 });
  assert.deepEqual([second.outcome, second.install], ['SUCCESS', true]);
  // a second partial failure retries again at half the ORIGINAL cost
  const again = J.beginInstallationRetry(J.recordInstallationCheck(retry.job, { total: 15 }).job);
  assert.equal(again.charge, 3000);
  assert.equal(again.job.creditsSpent, 12000);
});

test('total failure (fail by 10 or more): everything spent is wasted and the work starts over', () => {
  const { job } = J.startInstallationJob({ jobId: 'j3', quote: quote() });
  const lost = J.recordInstallationCheck(job, { total: 13 }); // fails by exactly 10
  assert.deepEqual([lost.outcome, lost.install, lost.job.status], ['TOTAL_FAILURE', false, 'TOTAL_FAILURE']);
  assert.deepEqual(lost.wasted, { credits: 6000, days: job.daysSpent });
  assert.equal(J.beginInstallationRetry(lost.job).ok, false, 'no half-price retry after a total failure');
  // starting over is a brand new job at the full quote
  assert.equal(J.startInstallationJob({ jobId: 'j3b', quote: quote() }).job.creditsSpent, 6000);
});

test('job input is validated', () => {
  assert.equal(J.startInstallationJob({ jobId: '', quote: quote() }).ok, false);
  assert.equal(J.startInstallationJob({ jobId: 'x', quote: { ok: false } }).ok, false);
  const { job } = J.startInstallationJob({ jobId: 'j', quote: quote() });
  assert.deepEqual(J.recordInstallationCheck(job, { total: NaN }).reasons, ['CHECK_TOTAL_INVALID']);
});

// ---- planner with the published unused-EP table and the owner-directed shortfall rule ----
const cert = { status: 'MECHANIC_SPECIFIED', book: 'Starships of the Galaxy', printedPage: 41 };
const fixture = (id, over = {}) => ({ ...catalog.find(c => c.id === id), certification: cert, ...over });
const plan = (key, entry, over = {}) => {
  const a = keyed(key);
  return planVehicleInstallation({ record: a.flags.swse.universalVehicleSource.source, flags: a.flags, catalogEntry: entry, installId: 'i1',
    availableCredits: 10_000_000, rules: rulesWithTable, nonstandard: false, ...over });
};

test('defaults: shortfall installs are allowed with the published penalties; an unknown budget still fails closed', () => {
  assert.equal(DEFAULT_VEHICLE_INSTALLATION_RULES.allowEpShortfall, true);
  // X-wing: general rule = 1 unused EP; shields SR 20 costs 1 EP -> fits, no penalty
  const fits = plan('core-incom-t-65b-x-wing-starfighter', fixture('shields-20'));
  assert.equal(fits.ok, true, fits.reasons.join());
  assert.equal(fits.entry.quote.shortfall, 0);
  assert.equal(fits.cost, 1250 * 2, 'base cost x Gargantuan modifier 2');
  // sublight drive speed 5 needs 6 EP, 1 unused -> 5 missing
  const short = plan('core-incom-t-65b-x-wing-starfighter', fixture('sublight-drive-4', { sizeRestriction: null }));
  assert.equal(short.ok, true, short.reasons.join());
  assert.equal(short.entry.quote.shortfall, 4);
  assert.equal(short.cost, Math.round(10000 * 2 * (1 + 0.2 * 4)));
  assert.equal(short.entry.quote.mechanicsDC, 20 + 5 + 20);
  // KotOR statblock EP lines are unruled: the budget is unknown, which is NOT treated as insufficient
  const unknown = plan('kotor-arakyd-industries-lethisk-class-armed-freighter', fixture('shields-20'));
  assert.ok(unknown.reasons.includes('EP_BUDGET_UNKNOWN'));
  assert.ok(!unknown.reasons.includes('EP_EXCEEDED'));
});

test('nonstandard: a hyperdrive on a starfighter doubles EP and costs 5x; the same drive on a freighter that has one does not', () => {
  const drive = fixture('hyperdrive-2');
  const xw = plan('core-incom-t-65b-x-wing-starfighter', drive, { nonstandard: undefined });
  assert.equal(xw.ok, true, xw.reasons.join());
  assert.equal(xw.entry.quote.nonstandard, true);
  assert.equal(xw.entry.quote.nonstandardBasis, 'STARFIGHTER_HYPERDRIVE_ALWAYS_NONSTANDARD');
  assert.equal(xw.entry.epCost, 6, 'class 2 hyperdrive needs 3 EP, doubled');
  assert.equal(xw.cost, Math.round(2000 * 2 * 5 * (1 + 0.2 * 5)), '5 missing points (6 required, 1 unused)');
  const yt = plan('core-corellian-yt-1300-transport', drive, { nonstandard: undefined });
  assert.equal(yt.entry.quote.nonstandard, false);
  assert.equal(yt.entry.epCost, 3);
  assert.equal(yt.entry.quote.shortfall, 0, 'YT-series have 10 unused EP');
  assert.equal(yt.cost, 2000 * 5, 'Colossal cost modifier 5');
});

test('installability: a text-verified/PDF-reviewed row is still denied until its effect is implemented', () => {
  const real = { ...catalog.find(c => c.id === 'shields-20'), certification: overlay.rows['shields-20'] };
  assert.equal(real.certification.status, 'SOURCE_VERIFIED');
  const r = plan('core-incom-t-65b-x-wing-starfighter', real);
  assert.deepEqual(r.reasons, ['MODIFICATION_EFFECT_NOT_IMPLEMENTED']);
  // ground vehicles have no published cost modifier -> refused with a precise reason
  const speeder = actors.find(a => a.flags.swse.universalVehicleSource.source.classification.printedSize === 'Large');
  if (speeder) assert.ok(plan(speeder.system.vehicleSourceEntryKey, fixture('shields-20')).reasons.includes('HULL_SIZE_HAS_NO_PUBLISHED_COST_MODIFIER'));
});

// ---- Initiative: no double application of the size modifier ----
const combat = new SWSECombatDocument();
const formula = actor => combat._getInitiativeFormula({ actor });
const wrap = a => ({ ...structuredClone(a), type: 'vehicle', id: 'v', items: [], toObject: () => structuredClone(a) });

test('a published vehicle rolls its printed Initiative with the size modifier already included (not added again)', () => {
  const xw = wrap(keyed('core-incom-t-65b-x-wing-starfighter'));
  assert.equal(formula(xw), '1d20 + 7');
  const cruiser = wrap(keyed('core-imperial-i-class-star-destroyer'));
  assert.equal(formula(cruiser), `1d20 + ${cruiser.flags.swse.universalVehicleSource.source.abilities.initiativePrinted}`);
});

test('a vehicle without printed Initiative still gets the published size modifier, including the Colossal subtypes (-10)', () => {
  const custom = size => ({ type: 'vehicle', id: 'c', flags: {}, system: { size, derived: { skills: { initiative: { total: 3 } } } }, items: [] });
  assert.equal(formula(custom('Gargantuan')), '1d20 + -2');
  assert.equal(formula(custom('Colossal')), '1d20 + -7');
  for (const sub of ['Colossal (frigate)', 'Colossal (cruiser)', 'Colossal (station)']) assert.equal(formula(custom(sub)), '1d20 + -7', sub);
  assert.equal(formula(custom('Huge')), '1d20 + 1');
  // a claim that fails verification is refused instead of rolling a character-style value
  const broken = wrap(keyed('core-incom-t-65b-x-wing-starfighter'));
  broken.flags.swse.universalVehicleSource.source.durability.hitPoints = 1;
  assert.throws(() => formula(broken), /UNIVERSAL_VEHICLE_SOURCE_INVALID/);
});
