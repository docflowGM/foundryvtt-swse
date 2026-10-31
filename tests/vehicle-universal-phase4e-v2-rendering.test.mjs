import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as C from '../scripts/domain/vehicles/custom-vehicle-construction.js';

// Real Handlebars rendering. Handlebars is a test-only dependency of tools/release (installed by the vehicle
// workflow with SWSE_REQUIRE_HANDLEBARS=1). The rolling workflow has a deliberate zero-npm policy, so the
// test skips there when the package is absent and fails (never silently skips) when it is required.
let Handlebars = null;
try { Handlebars = createRequire(new URL('../tools/release/package.json', import.meta.url))('handlebars'); } catch { /* not installed */ }
const required = process.env.SWSE_REQUIRE_HANDLEBARS === '1';
if (!Handlebars && required) throw new Error('SWSE_REQUIRE_HANDLEBARS=1 but handlebars is not installed (npm ci --prefix tools/release)');
const t = Handlebars ? test : test.skip;

installSystemsResolver(); installFoundryStubs();
const { buildVehicleSheetContext } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');
const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');
const { AssetBaySurfaceService, assetModifyAuthorization } = await import('../scripts/ui/shell/AssetBaySurfaceService.js');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const epTable = JSON.parse(readFileSync('data/canonical/vehicles/construction/unused-emplacement-points.json', 'utf8'));
const frames = JSON.parse(readFileSync('data/canonical/vehicles/construction/stock-frames.json', 'utf8')).frames;
const XW = actors.find(a => a.system.vehicleSourceEntryKey === 'core-incom-t-65b-x-wing-starfighter');
const wrap = (a, over = {}) => { const d = structuredClone(a); Object.assign(d, over);
  return { id: 'v1', isOwner: true, ...d, items: d.items ?? [], toObject: () => structuredClone(d) }; };

function env() {
  const H = Handlebars.create();
  H.registerHelper('localize', k => String(k));
  H.registerHelper('eq', (a, b) => a === b);
  H.registerHelper('helperMissing', function () { return ''; });
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
  for (const f of walk('templates').filter(f => f.endsWith('.hbs')))
    H.registerPartial(`systems/foundryvtt-swse/${f}`, readFileSync(f, 'utf8'));
  return H;
}
const render = (H, file, data) => H.compile(readFileSync(file, 'utf8'))(data);
const PANEL = 'templates/actors/vehicle/v2/partials/vehicle-schema-panel.hbs';
const customData = (approved = true) => {
  const frame = frames.find(f => f.id === 'superiority-fighter');
  const v = C.validateDesign({ designId: 'd1', name: 'Test Ship', frame, authorship: { kind: 'rules-legal', designerActorId: 'a1', starshipDesigner: true, shipyardAidApprovedBy: 'gm1' },
    crewQuality: 'skilled', authority: approved ? { verified: true } : null, rules: { ...C.DEFAULT_CONSTRUCTION_RULES, designRounding: 'floor' } });
  const record = C.buildConstructionRecord({ designId: 'd1', name: 'Test Ship', frame, validation: v,
    authorship: { kind: 'rules-legal', designerActorId: 'a1', starshipDesigner: true, shipyardAidApprovedBy: 'gm1' }, crewQuality: 'skilled' });
  if (!approved) return { name: 'Test Ship', type: 'vehicle', system: { hp: { value: 30, max: 30 } }, flags: { swse: { vehicleConstruction: record } } };
  return C.buildCustomVehicleActorData({ record, frame });
};

t('zero values render: 0 HP and 0 shields (current), 0 effective, 0 credits', () => {
  const H = env();
  const x = structuredClone(XW); x.system.hp.value = 0; x.system.shields.value = 0;
  const html = render(H, PANEL, { view: buildVehicleSchemaViewModel(wrap(x), { epTable }) });
  assert.match(html, /data-stat="Hit Points"[^]*?Current <strong>0<\/strong>/);
  assert.match(html, /data-stat="Shield Rating"[^]*?Current <strong>0<\/strong>/);
  // custom ship with a zero Damage Reduction: effective 0 is shown as 0, not blank or the baseline label
  const cust = wrap(customData(true));
  const view = buildVehicleSchemaViewModel(cust, { epTable });
  const dr = view.effective.find(r => r.label === 'Damage Reduction');
  const out = render(H, PANEL, { view });
  assert.match(out, new RegExp(`data-stat="Damage Reduction"[^]*?Effective <strong>${dr.effectiveLabel}</strong>`));
  assert.equal(render(H, PANEL, { view: { ...view, construction: { ...view.construction, totalCreditsLabel: '0 cr' } } }).includes('<strong>0 cr</strong>'), true);
});

t('published, custom-built, pending, unverified and invalid vehicles each render a distinct panel', () => {
  const H = env();
  const pub = render(H, PANEL, { view: buildVehicleSchemaViewModel(wrap(XW), { epTable }) });
  assert.match(pub, /data-vehicle-origin="PUBLISHED"/);
  assert.match(pub, /Unused EP 1; consumed 0; remaining 1/);
  assert.match(pub, /No certified installations/);
  const built = render(H, PANEL, { view: buildVehicleSchemaViewModel(wrap(customData(true)), { epTable }) });
  assert.match(built, /data-vehicle-origin="CUSTOM_CONSTRUCTED"/);
  assert.match(built, /Approved for construction/);
  assert.match(built, /Crew Quality[^]*skilled/);
  const pendingHtml = render(H, PANEL, { view: buildVehicleSchemaViewModel(wrap(customData(false)), { epTable }) });
  assert.match(pendingHtml, /Awaiting GM approval/);
  const bad = customData(true); bad.flags.swse.vehicleConstruction.totalCredits = 1;
  const unverified = render(H, PANEL, { view: buildVehicleSchemaViewModel(wrap(bad), { epTable }) });
  assert.match(unverified, /CUSTOM_UNVERIFIED_RECORD/);
  assert.doesNotMatch(unverified, /Approved for construction/);
  assert.match(unverified, /CONSTRUCTION_RECORD_DIGEST_MISMATCH/);
  assert.doesNotMatch(pub + built + unverified, /<input|<textarea/);
});

t('invalid published provenance: the sheet context does not throw and renders a verification failure only', () => {
  const H = env();
  const bad = structuredClone(XW); bad.flags.swse.universalVehicleSource.source.durability.hitPoints += 5;
  const a = wrap(bad);
  const ctx = buildVehicleSheetContext(a, { editable: true, actor: a }, { epTable });
  assert.equal(ctx.vehicleSourceInvalid, true);
  assert.equal(ctx.publicationView, null);
  assert.deepEqual(ctx.vehicleConceptTabs, []);
  assert.equal(ctx.hpConditionPanel, undefined);
  const html = render(H, 'templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', { ...ctx, actor: { name: a.name, img: a.img } });
  assert.match(html, /VERIFICATION FAILED/);
  assert.match(html, /failed verification/);
  assert.match(html, /data-vehicle-origin="PUBLISHED_SOURCE_INVALID"/);
  assert.doesNotMatch(html, /Published Statistics|attack-reference|data-canonical-edit/);
});

t('a valid published sheet renders through the full template with the schema panel', () => {
  const H = env();
  const a = wrap(XW);
  const ctx = buildVehicleSheetContext(a, { editable: true }, { epTable });
  const html = render(H, 'templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', { ...ctx, actor: { name: a.name, img: a.img }, editable: true });
  assert.match(html, /swse-vehicle-schema-panel/);
  assert.match(html, /Published Statistics/);
});

t('Asset Bay cards: HP of 0 renders, hull ignored, permission vs ownership, Modify gating', async () => {
  const H = env();
  const src = structuredClone(XW); src.system.hp.value = 0; src.system.hull = { value: 77, max: 77 };
  const linked = wrap(src, { id: 'v1', uuid: 'Actor.v1', isOwner: true }); linked.system.ownedByActorId = 'owner1';
  const unlinked = wrap(XW, { id: 'v2', uuid: 'Actor.v2', isOwner: true }); // document permission only, not linked as property
  const viewOnly = wrap(XW, { id: 'v3', uuid: 'Actor.v3', isOwner: false }); viewOnly.system.ownedByActorId = 'owner1';
  const owner = { id: 'owner1', name: 'W', system: {}, getFlag: () => null, items: [] };
  const all = [linked, unlinked, viewOnly];
  globalThis.game = { user: { id: 'u1', isGM: false }, actors: { contents: all, get: id => all.find(a => a.id === id) }, users: new Map() };
  // give the unlinked vehicle a reference through the owner's relationships so it is listed
  owner.system.relationships = [{ id: 'v2', type: 'vehicle' }];
  const vm = await AssetBaySurfaceService.buildViewModel(owner, { bayMode: 'shipyard', epTable });
  const by = Object.fromEntries(vm.assets.map(a => [a.actorId, a]));
  assert.match(by.v1.status, /HP 0\//);
  assert.doesNotMatch(by.v1.status, /77/);
  assert.equal(by.v1.canModify, true);
  assert.equal(by.v1.ownedByThisActor, true);
  assert.equal(by.v2.canModify, false, 'document permission alone is not property ownership');
  assert.equal(by.v2.modifyBlockedReason, 'NOT_LINKED_AS_PROPERTY');
  assert.equal(by.v3.canModify, false);
  assert.equal(by.v3.modifyBlockedReason, 'NO_DOCUMENT_PERMISSION');
  assert.doesNotMatch(JSON.stringify(vm), /You own this sheet/);
  const html = render(H, 'templates/shell/partials/surface-asset-bay.hbs', { vm });
  assert.match(html, /HP 0\//);
  assert.match(html, /Document permission: Owner/);
  assert.match(html, /Document permission: view only/);
  assert.match(html, /disabled title="NOT_LINKED_AS_PROPERTY"/);
  // a GM may modify anything resolvable
  assert.equal(assetModifyAuthorization({ user: { isGM: true }, ownerActor: owner, assetActor: unlinked }).allowed, true);
});
