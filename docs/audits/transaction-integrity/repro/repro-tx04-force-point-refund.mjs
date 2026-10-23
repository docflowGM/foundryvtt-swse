// TX-04 — ForcePointSpendCoordinator refund truthfulness and bonus-pool symmetry. REAL coordinator and REAL ActorEngine.spendForcePoints /
// gainForcePoints (grafted onto the shim's fake engine); only the persistence write and the dice are faked.
import { header, report, graftRealForcePointMethods, setPath } from './_boot.mjs';
header('TX-04 Force Point spend / refund');
let failWrites = false;
const writer = async (actor, data) => { if (failWrites) throw new Error('simulated write failure'); for (const [k, v] of Object.entries(data)) setPath(actor, k, v); return actor; };
const { fake } = await graftRealForcePointMethods(writer);
const { ForcePointSpendCoordinator: C } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-point-spend-coordinator.js');
const mkActor = ({ normal = 3, bonus = null } = {}) => {
  const a = { id: 'fp1', name: 'FP Tester', type: 'character', system: { forcePoints: { value: normal, max: 5 }, level: 5, heroicLevel: 5, attributes: {} }, flags: { swse: bonus ? { bonusForcePoints: bonus } : {} } };
  a.getFlag = (s, k) => a.flags?.[s]?.[k];
  return a;
};
const bonusTotal = (a) => (a.flags.swse.bonusForcePoints?.entries ?? []).reduce((n, e) => n + e.value, 0);
globalThis.Roll = class { constructor() {} async evaluate() { throw new Error('simulated roll failure'); } };

// (a) the Force die roll fails AFTER the point was spent, and the refund write ALSO fails
{
  const actor = mkActor({ normal: 3 });
  const realUpdate = fake.updateActor; let writes = 0;
  fake.updateActor = async (a, d) => { writes += 1; if (writes >= 2) throw new Error('simulated refund write failure'); return realUpdate(a, d); };   // write 1 = the spend, write 2 = the refund
  const receipt = await C.rollAndSpend(actor, { amount: 1, reason: 'repro', domain: 'skill.test' });
  fake.updateActor = realUpdate;
  report('TX-04a', receipt.success === false && receipt.rolledBack === true && actor.system.forcePoints.value === 2,
    'a refund that FAILED is reported as rolledBack:true while the Force Point stays spent',
    `receipt.rolledBack=${receipt.rolledBack}; balance=${actor.system.forcePoints.value} (started 3); writes attempted=${writes}`);
}
// (b) the spend consumed a BONUS point; the refund goes to the NORMAL pool
{
  const bonus = { entries: [{ id: 'b1', source: 'Granted', value: 1, max: 1 }], value: 1, max: 1 };
  const actor = mkActor({ normal: 5, bonus });
  const receipt = await C.rollAndSpend(actor, { amount: 1, reason: 'repro', domain: 'skill.test' });
  report('TX-04b', receipt.rolledBack === true && bonusTotal(actor) === 0 && actor.system.forcePoints.value === 5,
    'a spent BONUS point is refunded to the normal pool (clamped at the maximum): the bonus point is NOT restored and nothing is gained',
    `bonus points left=${bonusTotal(actor)} (had 1); normal=${actor.system.forcePoints.value}/5 (already at max, so the refund was clamped away)`);
}
