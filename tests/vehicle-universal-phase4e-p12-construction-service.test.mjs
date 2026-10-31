import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { classifyVehicleActorSource } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import { verifyConstructionRecord } from '../scripts/domain/vehicles/custom-vehicle-construction.js';
import * as P from '../scripts/domain/vehicles/custom-vehicle-construction-project.js';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';

installSystemsResolver(); installFoundryStubs();
const { CustomVehicleConstructionService: S } = await import('../scripts/engine/vehicles/custom-vehicle-construction-service.js');
const { TransactionEngine } = await import('../scripts/engine/store/transaction-engine.js');
const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');

globalThis.fetch = async url => {
  const path = String(url).replace(/^\/?systems\/foundryvtt-swse\//, '');
  try { const body = readFileSync(path, 'utf8'); return { ok: true, json: async () => JSON.parse(body) }; } catch { return { ok: false }; }
};
let n = 0; globalThis.foundry.utils.randomID = () => `id${++n}`;
const FLAG = 'flags.swse.vehicleDesignProposals';

const feat = { type: 'feat', name: 'Starship Designer' };
let designer, calls;
function world({ asGM = false, hasFeat = true, credits = 1_000_000, keep = false } = {}) {
  const flags = keep ? designer.flags : {};
  designer = { id: 'd1', name: 'Ace', system: { credits, skills: { mechanics: { total: 10 } } }, flags, items: hasFeat ? [feat] : [], ownership: { u1: 3 },
    getFlag: () => undefined, toObject() { return { system: this.system }; } };
  globalThis.game = { user: { id: asGM ? 'gm1' : 'u1', isGM: asGM, name: 'U' }, actors: { get: id => (id === 'd1' ? designer : null), contents: [designer] },
    users: { get: id => (id === 'gm1' ? { id: 'gm1', isGM: true } : id === 'u1' ? { id: 'u1', isGM: false } : null), find: () => null, contents: [] } };
  if (!keep) calls = [];
  TransactionEngine.executeMutationTransaction = async ctx => {
    // the write must have been authorized for the guard
    assert.equal(L.isLedgerUpdateAllowed('d1', { [FLAG]: ctx.mutationPlan.set[FLAG] }), true, 'projects write authorized');
    calls.push(ctx);
    designer.flags = { swse: { vehicleDesignProposals: structuredClone(ctx.mutationPlan.set[FLAG]) } };
    if (ctx.cost) designer.system.credits -= ctx.cost;
    return { success: true, transactionId: 'tx' + calls.length };
  };
  S.rules = { ...S.rules, designRounding: undefined };
}
const input = (o = {}) => ({ designerActor: designer, name: 'Rogue Runner', frameId: 'superiority-fighter', crewQuality: 'skilled', systemIds: [], ...o });
const only = () => S.projectsOf(designer)[0];
async function submitAndFund(o = {}) {
  world(); await S.submitDesign(input(o));
  const id = only().designId;
  world({ asGM: true, keep: true });
  const r = await S.approveDesign({ designerActor: designer, designId: id });
  assert.equal(r.success, true, JSON.stringify(r.reasons));
  return id;
}

test('submit: stored as PENDING_APPROVAL, sealed; nothing charged or created', async () => {
  world();
  const r = await S.submitDesign(input());
  assert.equal(r.success, true, JSON.stringify(r));
  assert.equal(calls[0].cost, 0);
  assert.equal(calls[0].mutationPlan.create, undefined);
  assert.equal(only().status, 'PENDING_APPROVAL');
  assert.equal(P.isValidProject(only()), true);
});

test('submit is refused without the feat, crew quality or a known frame; homebrew needs a GM', async () => {
  world({ hasFeat: false });
  assert.ok((await S.submitDesign(input())).reasons.includes('STARSHIP_DESIGNER_FEAT_REQUIRED'));
  world();
  assert.ok((await S.submitDesign(input({ crewQuality: null }))).reasons.includes('CREW_QUALITY_NOT_CHOSEN'));
  assert.ok((await S.submitDesign(input({ frameId: 'nope' }))).reasons.includes('FRAME_MISSING'));
  assert.deepEqual((await S.submitDesign(input({ authorshipKind: 'gm-homebrew' }))).reasons, ['HOMEBREW_REQUIRES_GM']);
  assert.equal(calls.length, 0);
});

test('approval funds the project (one charge) but does NOT deliver a vehicle; the design work remains', async () => {
  const id = await submitAndFund({ systemIds: ['shields-10'] });
  const tx = calls.at(-1);
  assert.ok(tx.cost >= 50000);
  assert.equal(tx.mutationPlan.create, undefined, 'no Actor at approval');
  const p = only(); const d = P.describeProject(p);
  assert.equal(p.status, 'UNDERWAY');
  assert.equal(verifyConstructionRecord(p.record), true);
  assert.equal(d.creditsPaid, tx.cost);
  assert.equal(d.dc, 25); assert.equal(d.daysRequired, 30); assert.equal(d.canRecordCheck, false);
  assert.equal(id, p.designId);
});

test('design check: refused before the design time (GM included); success after it delivers the operational vehicle', async () => {
  const id = await submitAndFund({ systemIds: ['shields-10'] });
  assert.deepEqual((await S.recordDesignCheck({ designerActor: designer, designId: id, total: 40 })).reasons, ['DESIGN_TIME_INCOMPLETE'], 'GM-entered check before the time');
  world({ keep: true });
  assert.deepEqual((await S.logDesignDays({ designerActor: designer, designId: id, days: 30 })).reasons, ['GM_REQUIRED']);
  world({ asGM: true, keep: true });
  assert.equal((await S.logDesignDays({ designerActor: designer, designId: id, days: 30 })).success, true);
  world({ keep: true });
  const credits = designer.system.credits;
  const r = await S.recordDesignCheck({ designerActor: designer, designId: id, total: 1, roller: () => 15 }); // player total ignored: 15 + 10
  assert.equal(r.outcome, 'SUCCESS'); assert.equal(r.total, 25);
  assert.equal(designer.system.credits, credits, 'no second charge');
  const spec = calls.at(-1).mutationPlan.create.actors[0];
  assert.equal(spec.data.flags.swse.vehicleConstruction.approval.status, 'APPROVED');
  assert.equal(spec.data.flags.swse.vehicleConstructionCompletion.mode, 'MECHANICS_CHECK');
  assert.equal(spec.data.system.ownedByActorId, 'd1');
  assert.deepEqual(spec.data.items, []); assert.deepEqual(spec.data.system.weapons, []);
  assert.equal(classifyVehicleActorSource({ ...spec.data, type: 'vehicle' }).kind, 'custom');
  assert.equal(only().status, 'COMPLETED');
  const view = buildVehicleSchemaViewModel({ ...structuredClone(spec.data), id: 'c1', isOwner: true, items: [], toObject: () => structuredClone(spec.data) }, {});
  assert.equal(view.origin, 'CUSTOM_CONSTRUCTED');
  assert.equal(view.effective.find(x => x.label === 'Shield Rating').effectiveLabel, '10');
});

test('a failed design check stops automation (no published consequence); only a recorded GM adjudication completes it', async () => {
  const id = await submitAndFund();
  await S.logDesignDays({ designerActor: designer, designId: id, days: 30 });
  world({ keep: true });
  const r = await S.recordDesignCheck({ designerActor: designer, designId: id, roller: () => 2 });
  assert.equal(r.outcome, 'FAILURE');
  assert.equal(calls.at(-1).mutationPlan.create, undefined);
  assert.equal(only().status, 'CHECK_FAILED');
  assert.equal(P.describeProject(only()).needsGmAdjudication, true);
  assert.deepEqual((await S.recordDesignCheck({ designerActor: designer, designId: id, roller: () => 20 })).reasons, ['PROJECT_NOT_AWAITING_CHECK']);
  world({ asGM: true, keep: true });
  assert.ok((await S.gmCompleteConstruction({ designerActor: designer, designId: id, reason: '' })).reasons.includes('GM_OVERRIDE_REASON_REQUIRED'));
  const g = await S.gmCompleteConstruction({ designerActor: designer, designId: id, reason: 'second attempt at the table succeeded' });
  assert.equal(g.success, true);
  const spec = calls.at(-1).mutationPlan.create.actors[0];
  assert.equal(spec.data.flags.swse.vehicleConstructionCompletion.mode, 'GM_ADJUDICATED');
  assert.equal(spec.data.flags.swse.vehicleConstructionCompletion.reason, 'second attempt at the table succeeded');
});

test('GM may complete immediately with a reason; a player may not', async () => {
  const id = await submitAndFund();
  world({ keep: true });
  assert.deepEqual((await S.gmCompleteConstruction({ designerActor: designer, designId: id, reason: 'x' })).reasons, ['GM_REQUIRED']);
  world({ asGM: true, keep: true });
  assert.equal((await S.gmCompleteConstruction({ designerActor: designer, designId: id, reason: 'skip downtime' })).success, true);
  assert.equal(only().completion.mode, 'GM_ADJUDICATED');
});

test('homebrew: no published process; delivered only by GM adjudication; never certified published rules', async () => {
  world({ asGM: true, hasFeat: false });
  assert.equal((await S.submitDesign(input({ authorshipKind: 'gm-homebrew' }))).success, true);
  const id = only().designId;
  const a = await S.approveDesign({ designerActor: designer, designId: id });
  assert.equal(a.success, true, JSON.stringify(a.reasons));
  assert.equal(a.record.authorship.certifiedPublishedRules, false);
  const d = P.describeProject(only());
  assert.equal(d.publishedProcess, false); assert.equal(d.needsGmAdjudication, true);
  assert.deepEqual((await S.recordDesignCheck({ designerActor: designer, designId: id, total: 30 })).reasons, ['PROJECT_NOT_AWAITING_CHECK']);
  assert.equal((await S.gmCompleteConstruction({ designerActor: designer, designId: id, reason: 'homebrew build' })).success, true);
});

test('fail closed: authority lost, insufficient credits, tampered project, reject only pending', async () => {
  world(); await S.submitDesign(input());
  const id = only().designId;
  world({ asGM: true, hasFeat: false, keep: true });
  assert.ok((await S.approveDesign({ designerActor: designer, designId: id })).reasons.includes('DESIGNER_LACKS_STARSHIP_DESIGNER_FEAT'));
  world({ asGM: true, credits: 10, keep: true });
  assert.ok((await S.approveDesign({ designerActor: designer, designId: id })).reasons.includes('INSUFFICIENT_CREDITS'));
  // tamper with the stored project: it is ignored and blocks every action
  designer.flags.swse.vehicleDesignProposals[0].frameId = 'battlecruiser';
  assert.deepEqual((await S.approveDesign({ designerActor: designer, designId: id })).reasons, ['PROJECT_STORE_CONTAINS_UNVERIFIED_ENTRIES']);
  // a funded project cannot be "rejected" (no refund rule)
  const id2 = await submitAndFund();
  assert.deepEqual((await S.rejectDesign({ designerActor: designer, designId: id2 })).reasons, ['ONLY_PENDING_DESIGNS_CAN_BE_REJECTED']);
  // the projects flag is write-guarded on every Actor type
  assert.equal(L.isLedgerUpdateAllowed('d1', { [FLAG]: [] }), false);
  const { guardVehicleInstallationLedger } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
  assert.equal(guardVehicleInstallationLedger({ id: 'd1', type: 'character' }, { [FLAG]: [] }), false);
  assert.equal(guardVehicleInstallationLedger({ id: 'd1', type: 'character' }, { name: 'ok' }), undefined);
});
