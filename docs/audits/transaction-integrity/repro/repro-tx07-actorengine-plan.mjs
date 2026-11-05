// TX-07 — the REAL ActorEngine.applyMutationPlan: default (transactional:false) leaves earlier operations applied when a later one fails;
// transactional:true restores the WHOLE actor from a snapshot (and therefore also reverts unrelated concurrent changes made in between).
import { header, report, setPath, ROOT } from './_boot.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
header('TX-07 ActorEngine.applyMutationPlan (real implementation)');
let real;
try { real = (await import(pathToFileURL(path.join(ROOT, 'scripts/governance/actor-engine/actor-engine.js')).href)).ActorEngine; }
catch (e) { console.log(`   could not load the real ActorEngine under the shim: ${e.message.slice(0, 200)}`); process.exit(0); }
const mkActor = () => {
  const a = { id: 'a1', name: 'A', type: 'character', system: { credits: 1000, hp: { value: 20 } }, flags: {}, items: [], effects: [] };
  a.items.get = () => null;
  a.toObject = () => JSON.parse(JSON.stringify({ system: a.system, flags: a.flags, items: [], effects: [] }));
  a.update = async (data) => { for (const [k, v] of Object.entries(data)) setPath(a, k, v); return a; };
  a.updateEmbeddedDocuments = async () => { throw new Error('simulated embedded-document failure'); };
  return a;
};
// keep the engine's own side effects out of the way: these helpers are not under test
real.recalcAll = async () => {}; real._instrumentActorItemsForSSSTOT = () => {}; real._auditEmbeddedItemBoundaries = () => {};
real.updateActor = async (a, data) => a.update(data);
real._applySetOps = async (a, set) => a.update(set);
real._applyUpdateOps = async (a, upd) => { if (upd?.items?.length) await a.updateEmbeddedDocuments('Item', upd.items); };
real.restoreFromSnapshot = async (a, snap) => { for (const k of ['system', 'flags']) a[k] = JSON.parse(JSON.stringify(snap[k])); };
const plan = { set: { 'system.credits': 900 }, update: { items: [{ _id: 'missing', name: 'x' }] } };

{ // default
  const a = mkActor(); let err = null;
  try { await real.applyMutationPlan(a, plan, { validate: false, rederive: false }); } catch (e) { err = e; }
  report('TX-07a', !!err && a.system.credits === 900, 'default applyMutationPlan: the SET (credits 900) stays applied when the later embedded UPDATE fails (no compensation; the error is thrown)', `error="${err?.message}"; credits=${a.system.credits}`);
}
{ // transactional: concurrent unrelated change is reverted by the whole-actor restore
  const a = mkActor(); let err = null;
  const realUpdate = a.update; let injected = false;
  a.updateEmbeddedDocuments = async () => { a.system.hp.value = 5; /* an unrelated concurrent change lands mid-plan */ throw new Error('simulated embedded-document failure'); };
  try { await real.applyMutationPlan(a, plan, { validate: false, rederive: false, transactional: true }); } catch (e) { err = e; }
  report('TX-07b', !!err && a.system.credits === 1000 && a.system.hp.value === 20, 'transactional:true restores the WHOLE actor: credits are reverted (good) but an unrelated concurrent change (hp 20->5) is silently reverted too', `credits=${a.system.credits} (restored); hp=${a.system.hp.value} (concurrent change lost)`);
}
