// TX-05 (request-id ledger scope) and TX-06 (a required action finalized without a committed expenditure) on the EquipmentStateCoordinator.
// Real coordinator, real journal, real fingerprinting, real E3 resolvers; persistence and the action authority are in-memory fakes (the
// coordinator's own injected seams). Only meaningful on a tree containing the coordinator (PR #1056).
import { header, report, setPath, ROOT } from './_boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
header('TX-05 / TX-06 equipment coordinator');
if (!fs.existsSync(`${ROOT}/scripts/engine/equipment/equipment-state-coordinator.js`)) { console.log('   (no equipment coordinator in this tree; run against the equipment branch)'); process.exit(0); }
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import(pathToFileURL(path.join(ROOT, 'tests/helpers/weapon-runtime-fixture.mjs')).href);
rt.setSharedWeaponAuthorityRegistry(registry);
const C = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js');
const { OUTCOME: O, GM_LOCAL_CONTEXT: GM } = C;
const SABER = 'lightsaber-chassis-archaic-lightsaber';
const REC = (posture, purpose, appendageIds) => ({ weaponPosture: posture, weaponOccupancy: { schemaVersion: 1, purpose, appendageIds } });
const item = (id, system) => ({ id, type: 'weapon', name: 'Renamed Thing', flags: { swse: { canonicalWeapon: { identityKey: SABER } } }, system });
const actorOf = (actorId, items) => { const a = { id: actorId, type: 'character', system: { size: 'Medium' }, flags: { swse: {} }, items }; items.get = (id) => items.find((i) => i.id === id); return a; };
const human = { name: 'Human' };
function depsFor(actor, { spendResult, sharedLedger = null } = {}) {
  const log = { spends: [], itemWrites: 0 };
  const deps = {
    loadSpecies: async () => ({ status: 'resolved', profile: human, reason: null, evidence: { speciesName: 'Human', variantId: null } }),
    isGm: () => true, resolveActionCost: async () => 'move', isLightsaber: async () => false,
    writeItems: async (a, updates) => { log.itemWrites += 1; for (const u of updates) { const it = a.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); } },
    writeJournal: async (a, stored) => { (a.flags.swse ??= {}).equipmentTxn = JSON.parse(JSON.stringify(stored)); },
    spendAction: async (a, type, meta) => { log.spends.push({ type, meta }); return spendResult ?? { allowed: true, committed: true }; },
    spendMarkerPresent: async () => false,
    ...(sharedLedger ? { ledger: sharedLedger } : {}),   // omit to use the coordinator's DEFAULT (module-level, cross-actor) ledger
  };
  return { deps, log };
}
const readyIntent = { type: 'ready', itemId: 's', appendageIds: ['natural-arm-1'], grip: 'one-handed' };
globalThis.game ??= {}; globalThis.game.user = { ...(globalThis.game.user ?? {}), isGM: true };
async function run(actor, deps, requestId) {
  const plan = await C.planEquipmentIntent(actor, readyIntent, deps);
  return C.executeEquipmentIntent(actor, { requestId, intent: readyIntent, ...(plan.planDigest ? { planDigest: plan.planDigest } : {}) }, { context: GM }, deps);
}

// TX-05: the DEFAULT ledger is keyed by requestId alone. Two different actors, the same request id.
{
  const a1 = actorOf('actor-A', [item('s', REC('STOWED', null, []))]); const a2 = actorOf('actor-B', [item('s', REC('STOWED', null, []))]);
  const d1 = depsFor(a1); const d2 = depsFor(a2);
  const first = await run(a1, d1.deps, 'shared-request-id');
  // wipe actor A's durable journal so the process-local ledger is the only memory of that id (as after a reload of the actor flags)
  const second = await run(a2, d2.deps, 'shared-request-id');
  report('TX-05', second.status === O.REQUEST_ID_CONFLICT,
    "the process-local ledger is keyed by requestId alone: another ACTOR's operation reusing an id is refused as a conflict",
    `actor A first: ${first.status}; actor B same id: ${second.status}; actor B item written: ${d2.log.itemWrites > 0}`);
  const replay = second.status === O.DUPLICATE_REPLAYED;
  report('TX-05b', replay, "the ledger replays actor A's outcome for actor B (a cross-actor false replay)", `status=${second.status}`);
}
// TX-06: a REQUIRED action whose authority returns an allowed NO-OP (committed:false) finalizes as COMMITTED with spend 'not-required'.
for (const [label, spendResult] of [
  ['economy-modules-unavailable (in combat this means no action was paid)', { allowed: true, permitted: true, committed: false, noOp: true, reason: 'economy-modules-unavailable' }],
  ['out-of-combat (the established intentional no-op policy)', { allowed: true, permitted: true, committed: false, noOp: true, reason: 'out-of-combat' }],
]) {
  const a = actorOf(`actor-${label.slice(0, 3)}`, [item('s', REC('STOWED', null, []))]); const { deps, log } = depsFor(a, { spendResult, sharedLedger: new Map() });
  const out = await run(a, deps, `tx06-${label.slice(0, 5)}`);
  const posture = a.items.get('s').system.weaponPosture;
  report(`TX-06 (${label.split(' ')[0]})`, out.status === O.COMMITTED && out.spend === 'not-required' && posture === 'READIED',
    `a paid transition finalizes COMMITTED with spend:'${out.spend}' although the authority reported a no-op (reason: ${spendResult.reason})`,
    `status=${out.status} spend=${out.spend} posture=${posture} spend calls=${log.spends.length}`);
}
