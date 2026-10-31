import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { classifyVehicleActorSource } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';
import { verifyConstructionRecord } from '../scripts/domain/vehicles/custom-vehicle-construction.js';

installSystemsResolver(); installFoundryStubs();
const { CustomVehicleConstructionService: S } = await import('../scripts/engine/vehicles/custom-vehicle-construction-service.js');
const { TransactionEngine } = await import('../scripts/engine/store/transaction-engine.js');
const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');

globalThis.fetch = async url => {
  const path = String(url).replace(/^\/?systems\/foundryvtt-swse\//, '');
  try { const body = readFileSync(path, 'utf8'); return { ok: true, json: async () => JSON.parse(body) }; } catch { return { ok: false }; }
};
let n = 0; globalThis.foundry.utils.randomID = () => `id${++n}`;

const feat = { type: 'feat', name: 'Starship Designer' };
let designer, calls, gm;
function world({ asGM = false, hasFeat = true, credits = 1_000_000 } = {}) {
  gm = asGM;
  designer = { id: 'd1', name: 'Ace', system: { credits }, flags: {}, items: hasFeat ? [feat] : [], ownership: { u1: 3 }, getFlag: () => undefined, toObject() { return { system: this.system }; } };
  globalThis.game = { user: { id: asGM ? 'gm1' : 'u1', isGM: asGM, name: 'U' }, actors: { get: id => (id === 'd1' ? designer : null), contents: [designer] },
    users: { get: id => (id === 'gm1' ? { id: 'gm1', isGM: true } : id === 'u1' ? { id: 'u1', isGM: false } : null), find: () => null, contents: [] } };
  calls = [];
  TransactionEngine.executeMutationTransaction = async ctx => { calls.push(ctx); const f = ctx.mutationPlan.set?.['flags.swse.vehicleDesignProposals']; if (f) designer.flags = { swse: { vehicleDesignProposals: f } }; return { success: true, transactionId: 'tx1' }; };
  S.rules = { ...S.rules, designRounding: 'floor' };
}
const input = (o = {}) => ({ designerActor: designer, name: 'Rogue Runner', frameId: 'superiority-fighter', crewQuality: 'skilled', systemIds: [], ...o });

test('submit: a Starship Designer proposes a design; it is stored as PENDING and nothing is charged or created', async () => {
  world();
  const r = await S.submitDesign(input());
  assert.equal(r.success, true, JSON.stringify(r));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cost, 0);
  assert.equal(calls[0].mutationPlan.create, undefined);
  assert.equal(S.proposalsOf(designer).length, 1);
  assert.equal(S.proposalsOf(designer)[0].authorshipKind, 'rules-legal');
});

test('submit is refused without the feat, without a crew quality, or for an unknown frame; homebrew needs a GM', async () => {
  world({ hasFeat: false });
  assert.ok((await S.submitDesign(input())).reasons.includes('STARSHIP_DESIGNER_FEAT_REQUIRED'));
  world();
  assert.ok((await S.submitDesign(input({ crewQuality: null }))).reasons.includes('CREW_QUALITY_NOT_CHOSEN'));
  assert.ok((await S.submitDesign(input({ frameId: 'nope' }))).reasons.includes('FRAME_MISSING'));
  assert.deepEqual((await S.submitDesign(input({ authorshipKind: 'gm-homebrew' }))).reasons, ['HOMEBREW_REQUIRES_GM']);
  assert.equal(calls.length, 0);
});

test('approve: GM only; system-verified authority; one transaction charges the total and creates the sealed Actor', async () => {
  world();
  await S.submitDesign(input({ systemIds: ['shields-10'] }));
  const designId = S.proposalsOf(designer)[0].designId;
  assert.deepEqual((await S.approveDesign({ designerActor: designer, designId })).reasons, ['GM_REQUIRED']);
  world({ asGM: true }); designer.flags = { swse: { vehicleDesignProposals: [{ designId, name: 'Rogue Runner', frameId: 'superiority-fighter', crewQuality: 'skilled', authorshipKind: 'rules-legal', submittedBy: 'u1', systems: [{ catalogId: 'shields-10', installId: 'sx' }] }] } };
  const r = await S.approveDesign({ designerActor: designer, designId });
  assert.equal(r.success, true, JSON.stringify(r));
  const tx = calls.at(-1);
  assert.equal(tx.cost, r.record.totalCredits);
  assert.ok(tx.cost >= 50000);
  assert.deepEqual(tx.mutationPlan.set['flags.swse.vehicleDesignProposals'], []);
  const spec = tx.mutationPlan.create.actors[0];
  assert.equal(spec.type, 'vehicle');
  assert.equal(spec.data.system.ownedByActorId, 'd1');
  assert.deepEqual(spec.data.items, []);
  assert.deepEqual(spec.data.system.weapons, []);
  assert.equal(verifyConstructionRecord(spec.data.flags.swse.vehicleConstruction), true);
  assert.equal(spec.data.flags.swse.vehicleConstruction.approval.status, 'APPROVED');
  assert.equal(spec.data.flags.swse.vehicleConstruction.authorship.certifiedPublishedRules, true);
  assert.equal(classifyVehicleActorSource({ ...spec.data, type: 'vehicle' }).kind, 'custom', 'a custom ship never claims a publication');
  // the V2 view shows it as custom-built, with the shield effect, never as one of the 429
  const view = buildVehicleSchemaViewModel({ ...structuredClone(spec.data), id: 'c1', isOwner: true, items: [], toObject: () => structuredClone(spec.data) }, {});
  assert.equal(view.origin, 'CUSTOM_CONSTRUCTED');
  assert.equal(view.identity.published, false);
  assert.equal(view.effective.find(x => x.label === 'Shield Rating').effectiveLabel, '10');
});

test('approve fails closed: authority lost, unknown frame, or insufficient credits', async () => {
  world({ asGM: true, hasFeat: false });
  designer.flags = { swse: { vehicleDesignProposals: [{ designId: 'p1', name: 'X', frameId: 'superiority-fighter', crewQuality: 'skilled', authorshipKind: 'rules-legal', submittedBy: 'u1', systems: [] }] } };
  assert.ok((await S.approveDesign({ designerActor: designer, designId: 'p1' })).reasons.includes('DESIGNER_LACKS_STARSHIP_DESIGNER_FEAT'));
  world({ asGM: true });
  designer.flags = { swse: { vehicleDesignProposals: [{ designId: 'p2', name: 'X', frameId: 'tampered-frame', crewQuality: 'skilled', authorshipKind: 'rules-legal', submittedBy: 'u1', systems: [] }] } };
  assert.ok((await S.approveDesign({ designerActor: designer, designId: 'p2' })).reasons.includes('FRAME_MISSING'));
  world({ asGM: true, credits: 10 });
  designer.flags = { swse: { vehicleDesignProposals: [{ designId: 'p3', name: 'X', frameId: 'superiority-fighter', crewQuality: 'skilled', authorshipKind: 'rules-legal', submittedBy: 'u1', systems: [] }] } };
  assert.ok((await S.approveDesign({ designerActor: designer, designId: 'p3' })).reasons.includes('INSUFFICIENT_CREDITS'));
  assert.equal(calls.length, 0, 'no transaction on any refusal');
});

test('GM homebrew is labeled homebrew, never certified published rules; reject removes a proposal', async () => {
  world({ asGM: true, hasFeat: false });
  const r = await S.submitDesign(input({ authorshipKind: 'gm-homebrew' }));
  assert.equal(r.success, true, JSON.stringify(r));
  const designId = S.proposalsOf(designer)[0].designId;
  const a = await S.approveDesign({ designerActor: designer, designId });
  assert.equal(a.success, true, JSON.stringify(a));
  assert.equal(a.record.authorship.certifiedPublishedRules, false);
  assert.equal(a.record.authorship.kind, 'gm-homebrew');
  world({ asGM: true });
  designer.flags = { swse: { vehicleDesignProposals: [{ designId: 'z' }] } };
  assert.equal((await S.rejectDesign({ designerActor: designer, designId: 'z' })).success, true);
  assert.deepEqual(calls.at(-1).mutationPlan.set['flags.swse.vehicleDesignProposals'], []);
  world();
  assert.deepEqual((await S.rejectDesign({ designerActor: designer, designId: 'z' })).reasons, ['GM_REQUIRED']);
});
