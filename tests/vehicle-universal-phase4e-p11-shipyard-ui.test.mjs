import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import * as J from '../scripts/domain/vehicles/vehicle-installation-jobs.js';
import { runShipyardAction, describeReasons, resolveOwnerActor } from '../scripts/sheets/v2/vehicle-sheet/vehicle-shipyard-actions.js';

installSystemsResolver(); installFoundryStubs();
const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');
let Handlebars = null;
try { Handlebars = createRequire(new URL('../tools/release/package.json', import.meta.url))('handlebars'); } catch { /* optional locally */ }
if (!Handlebars && process.env.SWSE_REQUIRE_HANDLEBARS === '1') throw new Error('handlebars required');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const rules = { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 4 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) };
const row = (o = {}) => ({ id: 'fx', name: 'Fixture Plating', category: 'Defense', emplacementPoints: 2, cost: 1000, costType: 'flat', availability: 'Licensed', sizeRestriction: null,
  certification: { status: 'MECHANIC_SPECIFIED', book: 'B', page: 1 }, ...o });
const withJob = () => {
  const a = structuredClone(actors.find(x => x.system.vehicleSourceEntryKey === XW));
  const p = J.planJobStart({ record: a.flags.swse.universalVehicleSource.source, flags: a.flags, catalogEntry: row(), jobId: 'job1', installId: 'inst1', ownerActorId: 'o1', availableCredits: 1e9, rules });
  assert.equal(p.ok, true, p.reasons?.join());
  a.flags.swse.vehicleInstallationJobs = p.nextJobs;
  return a;
};
const wrap = (a, isOwner = true) => ({ ...structuredClone(a), id: 'v1', isOwner, items: [], toObject: () => structuredClone(a) });
const withGM = (gm, fn) => { const prev = globalThis.game; globalThis.game = { user: { isGM: gm } }; try { return fn(); } finally { globalThis.game = prev; } };

test('view model: pending job is shown separately from installed equipment, EP reserved not consumed', () => {
  const a = withJob();
  const catalog = new Map([['fx', row()], ['bad', row({ id: 'bad', certification: { status: 'SOURCE_VERIFIED', book: 'B', page: 1 } })]]);
  const m = buildVehicleSchemaViewModel(wrap(a), { epTable: { entries: [{ sourceEntryKey: XW, unusedEmplacementPoints: 4 }] }, catalog, isGM: false });
  assert.equal(m.installed.count, 0);
  assert.equal(m.shipyard.activeJobs.length, 1);
  assert.equal(m.shipyard.reservedEp, 2);
  assert.equal(m.ep.used, 0);
  assert.equal(m.ep.reserved, 2);
  assert.equal(m.ep.remaining, 2);
  assert.match(m.ep.label, /reserved by pending installations 2/);
  const j = m.shipyard.jobs[0];
  assert.equal(j.dc, 22); assert.equal(j.creditsPaid, 1000); assert.equal(j.canRecordCheck, true); assert.ok(j.daysRequired > 0);
  assert.deepEqual(m.shipyard.options.map(o => o.id), ['fx'], 'only MECHANIC_SPECIFIED rows are offered');
  assert.equal(m.shipyard.canAct, true);
});

test('actions: each button is a governed service call; refusals are explained', async () => {
  const calls = [], notes = [];
  const service = new Proxy({}, { get: (_, name) => async args => { calls.push([name, args]); return { success: true, outcome: name === 'recordCheck' ? 'PARTIAL_FAILURE' : undefined, total: 17 }; } });
  const owner = { id: 'o1' }, char = { id: 'c1' };
  const game = { actors: { get: id => (id === 'o1' ? owner : null) }, user: { character: char } };
  const deps = { service, game, notify: { info: m => notes.push(['i', m]), warn: m => notes.push(['w', m]) }, askReason: async () => 'because', askDays: async () => 2 };
  const vehicle = { id: 'v1', system: { ownedByActorId: 'o1' } };
  assert.equal(resolveOwnerActor(vehicle, game), owner);
  await runShipyardAction({ action: 'start-job', catalogId: 'fx', vehicle }, deps);
  await runShipyardAction({ action: 'record-check', jobId: 'j', vehicle }, deps);
  await runShipyardAction({ action: 'retry-job', jobId: 'j', vehicle }, deps);
  await runShipyardAction({ action: 'log-days', jobId: 'j', vehicle }, deps);
  await runShipyardAction({ action: 'gm-complete', jobId: 'j', vehicle }, deps);
  await runShipyardAction({ action: 'gm-instant', catalogId: 'fx', vehicle }, deps);
  assert.deepEqual(calls.map(c => c[0]), ['startJob', 'recordCheck', 'retryJob', 'logWorkDays', 'gmCompleteJob', 'gmInstantInstall']);
  assert.equal(calls[1][1].installerActor, char, 'the installing character rolls the Mechanics check');
  assert.equal(calls[3][1].days, 2);
  assert.equal(calls[4][1].reason, 'because');
  assert.match(notes[1][1], /Partial failure/);
  // a refusal is reported, a cancelled dialog does nothing
  const refuse = { ...deps, service: { retryJob: async () => ({ success: false, reasons: ['INSUFFICIENT_CREDITS'] }) } };
  assert.equal((await runShipyardAction({ action: 'retry-job', jobId: 'j', vehicle }, refuse)).success, false);
  assert.match(notes.at(-1)[1], /Not enough credits/);
  const before = calls.length;
  await runShipyardAction({ action: 'gm-complete', jobId: 'j', vehicle }, { ...deps, askReason: async () => null });
  assert.equal(calls.length, before);
  assert.match(describeReasons(['GM_REQUIRED', 'SOMETHING_NEW']), /Only a GM.*SOMETHING_NEW/);
});

const t = Handlebars ? test : test.skip;
function env() {
  const H = Handlebars.create();
  H.registerHelper('localize', k => String(k)); H.registerHelper('eq', (a, b) => a === b);
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  for (const f of walk('templates').filter(f => f.endsWith('.hbs'))) H.registerPartial(`systems/foundryvtt-swse/${f}`, readFileSync(f, 'utf8'));
  return H;
}
const PANEL = 'templates/actors/vehicle/v2/partials/vehicle-schema-panel.hbs';
const render = view => env().compile(readFileSync(PANEL, 'utf8'))({ view });

t('panel: player sees DC, work time, money paid, retry options; buttons follow role', () => {
  const a = withJob();
  const catalog = new Map([['fx', row()]]);
  const player = render(withGM(false, () => buildVehicleSchemaViewModel(wrap(a), { catalog, isGM: false })));
  assert.match(player, /data-job-id="job1"/);
  assert.match(player, /Mechanics DC 22/);
  assert.match(player, /Work 0 \/ \d/);
  assert.match(player, /Paid 1000 cr/);
  assert.match(player, /data-shipyard-action="record-check"/);
  assert.match(player, /data-shipyard-action="start-job"/);
  assert.doesNotMatch(player, /gm-complete|log-days|gm-instant/);
  const gm = render(buildVehicleSchemaViewModel(wrap(a), { catalog, isGM: true }));
  assert.match(gm, /data-shipyard-action="log-days"/);
  assert.match(gm, /data-shipyard-action="gm-complete"/);
  assert.match(gm, /data-shipyard-action="gm-instant"/);
  const viewer = render(buildVehicleSchemaViewModel(wrap(a, false), { catalog, isGM: false }));
  assert.doesNotMatch(viewer, /data-shipyard-action/);
  assert.match(viewer, /Mechanics DC 22/);
});

t('panel: partial failure shows the retry offer; total failure shows the loss', () => {
  const a = withJob();
  const base = J.readJobs(a.flags, XW).jobs[0];
  const partial = J.sealJob({ ...base, status: 'PARTIAL_FAILURE' });
  a.flags.swse.vehicleInstallationJobs = [partial];
  let html = render(buildVehicleSchemaViewModel(wrap(a), { isGM: false }));
  assert.match(html, /Retry: 500 cr and .* days, \+5 on the check/);
  assert.match(html, /data-shipyard-action="retry-job"/);
  a.flags.swse.vehicleInstallationJobs = [J.sealJob({ ...base, status: 'TOTAL_FAILURE', wasted: { credits: 1000, days: 3 } })];
  html = render(buildVehicleSchemaViewModel(wrap(a), { isGM: false }));
  assert.match(html, /Lost 1000 cr and 3 days/);
  assert.match(html, /new, fully charged attempt/);
});
