// Verification of the WP5-C3 Force Point transaction (scripts/combat/rolls/force-point-transaction.js, PR #1056 head) against the REAL
// ActorEngine.spendForcePoints / gainForcePoints. The C3 unit tests model those methods; this checks the model against the real thing.
// Only meaningful on a tree that contains the transaction module (the equipment branch). Evidence only.
import { header, report, graftRealForcePointMethods, setPath, ROOT } from './_boot.mjs';
import fs from 'node:fs';
header('WP5-C3 Force Point transaction vs the real ActorEngine Force Point methods');
if (!fs.existsSync(`${ROOT}/scripts/combat/rolls/force-point-transaction.js`)) { console.log('   (this tree has no force-point-transaction.js; run against the equipment branch)'); process.exit(0); }
const writer = async (actor, data) => { for (const [k, v] of Object.entries(data)) setPath(actor, k, v); return actor; };
await graftRealForcePointMethods(writer);
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async () => ({}) };
const { createForcePointTransaction } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/force-point-transaction.js');
const mk = ({ normal = 3, bonus = null } = {}) => { const a = { id: 'fp', name: 'FP', type: 'character', system: { forcePoints: { value: normal, max: 5 } }, flags: { swse: bonus ? { bonusForcePoints: bonus } : {} } }; a.getFlag = (s, k) => a.flags?.[s]?.[k]; return a; };
const bonusIds = (a) => (a.flags.swse.bonusForcePoints?.entries ?? []).map((e) => `${e.id}:${e.value}`).join(',') || '(none)';
const tx = (a) => createForcePointTransaction({ actor: a, result: 7, formula: '1d6', reason: 'verify' });

{ // normal point
  const a = mk({ normal: 3 }); const t = tx(a);
  const c = await t.commit(); const afterSpend = a.system.forcePoints.value;
  a.system.forcePoints.value += 1;   // concurrent regain
  const r = await t.rollback();
  report('C3-real-1', !(c && afterSpend === 2 && r && a.system.forcePoints.value === 4), 'REAL spend/gain: normal point spent (3->2), concurrent regain (->3), rollback gives back exactly one (->4)', `commit=${c} afterSpend=${afterSpend} rollback=${r} final=${a.system.forcePoints.value}  [REPRODUCED here means the C3 transaction is WRONG against the real engine]`);
}
{ // bonus point, entry removed by the spend, concurrent unrelated grant, then rollback
  const a = mk({ normal: 4, bonus: { entries: [{ id: 'b1', source: 'Granted', value: 1, max: 1 }], value: 1, max: 1 } }); const t = tx(a);
  const c = await t.commit(); const mid = bonusIds(a);
  a.flags.swse.bonusForcePoints = { ...a.flags.swse.bonusForcePoints, entries: [{ id: 'b2', source: 'Later grant', value: 1, max: 1 }], value: 1, max: 1 };
  const r = await t.rollback();
  const ok = c && mid === '(none)' && r && bonusIds(a).split(',').sort().join() === 'b1:1,b2:1' && a.system.forcePoints.value === 4;
  report('C3-real-2', !ok, 'REAL spend/gain: a spent BONUS point is restored by entry id (b1) and a concurrent grant (b2) is untouched; the normal pool is not touched', `commit=${c} bonusAfterSpend=${mid} rollback=${r} bonusFinal=${bonusIds(a)} normal=${a.system.forcePoints.value}  [REPRODUCED here means the C3 transaction is WRONG]`);
}
{ // legacy single-value bonus pool (no entries array)
  const a = mk({ normal: 4, bonus: { value: 2, max: 2 } }); const t = tx(a);
  const c = await t.commit(); const afterSpend = a.flags.swse.bonusForcePoints?.value; const r = await t.rollback();
  const finalVal = a.flags.swse.bonusForcePoints?.value ?? 0;
  report('C3-real-3', !(c && r && afterSpend === 1 && finalVal === 2 && a.system.forcePoints.value === 4), 'REAL spend/gain: a legacy value-only bonus pool is spent (2->1) and restored (->2)', `commit=${c} afterSpend=${afterSpend} rollback=${r} final=${finalVal} normal=${a.system.forcePoints.value}  [REPRODUCED here means the C3 transaction is WRONG]`);
}
{ // nothing to spend
  const a = mk({ normal: 0 }); const t = tx(a); const c = await t.commit();
  report('C3-real-4', c !== false || t.committed, 'REAL spend with no Force Point left: commit() reports failure (not a paid use)', `commit=${c} committed=${t.committed}  [REPRODUCED here means a use was reported paid with nothing spent]`);
}
