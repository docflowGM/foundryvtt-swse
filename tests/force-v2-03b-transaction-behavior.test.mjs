import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods, setPath } from './helpers/real-force-point-engine.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.utils.randomID = (() => { let n = 0; return () => `fp-test-${++n}`; })();

const { ForcePointsService } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js');
const { RollCore } = await import('/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js');
const { ModifierEngine } = await import('/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js');

const makeActor = ({ normal = 2, max = 3, bonus = [], condition = 0 } = {}) => ({
  id: 'actor-fp', name: 'FP test actor', type: 'character',
  system: { forcePoints: { value: normal, max }, conditionTrack: { current: condition },
    darkSideScore: { value: 0 }, level: { heroic: 1 } },
  flags: { swse: { bonusForcePoints: { value: bonus.reduce((n, e) => n + e.value, 0), entries: bonus } } },
  items: [],
  getFlag(scope, name) { return this.flags?.[scope]?.[name]; }
});
let throwAfterWrite = false;
const writer = async (actor, update) => {
  for (const [path, value] of Object.entries(update)) setPath(actor, path, value);
  if (throwAfterWrite) throw new Error('write applied, acknowledgement failed');
  return actor;
};
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);
const rollContext = (requestId) => ({ useKind: 'roll-bonus', rollDomain: 'skill.acrobatics', requestId });
let passed = 0;
const check = (name) => { passed += 1; console.log(`PASS ${passed}: ${name}`); };

try {
  {
    const third = makeActor({ condition: 3 });
    const fourth = makeActor({ condition: 4 });
    const fifth = makeActor({ condition: 5 });
    assert.equal(ForcePointsService.authorizeSpend(third, rollContext('ct3')).valid, true);
    assert.equal(ForcePointsService.authorizeSpend(fourth, rollContext('ct4')).valid, true);
    assert.equal(ForcePointsService.authorizeSpend(fifth, rollContext('ct5')).valid, false);
    check('condition steps 3 and 4 remain capable; helpless step 5 refuses');
  }
  {
    const a = makeActor({ normal: 0, bonus: [{
      id: 'restricted-1', source: 'Guardian Spirit', value: 1, max: 1,
      restrictions: 'Power or technique only', expires: 'daily-rest-cycle'
    }] });
    assert.equal(ForcePointsService.authorizeSpend(a, rollContext('restricted')).valid, false);
    assert.equal(a.flags.swse.bonusForcePoints.value, 1);
    check('restricted bonus cannot pay unrelated roll and is not consumed');
  }
  {
    const a = makeActor({ normal: 0, bonus: [{
      id: 'expired-1', source: 'test-source', value: 1, max: 1, expires: Date.now() - 1000
    }] });
    assert.equal(ForcePointsService.authorizeSpend(a, rollContext('expired')).valid, false);
    check('expired bonus does not authorize expenditure');
  }
  {
    const bonus = [{ id: 'bonus-1', source: 'unrestricted-test', value: 1, max: 1, restrictions: '', expires: '' }];
    const a = makeActor({ normal: 3, max: 3, bonus });
    const receipt = await ActorEngine.spendForcePoints(a, 1, rollContext('bonus-spend'));
    assert.equal(receipt.spent, 1);
    assert.equal(receipt.normalSpent, 0);
    assert.equal(receipt.bonusEntriesSpent[0].id, 'bonus-1');
    assert.equal(a.system.forcePoints.value, 3);
    assert.equal(a.flags.swse.bonusForcePoints.value, 0);
    const refund = await ActorEngine.rollbackForcePointSpend(a, receipt);
    assert.equal(refund.rolledBack, true);
    assert.equal(a.system.forcePoints.value, 3);
    assert.deepEqual(a.flags.swse.bonusForcePoints.entries, bonus);
    assert.equal((await ActorEngine.rollbackForcePointSpend(a, receipt)).rolledBack, false);
    check('spent bonus restored into exact entry even at normal FP cap, once only');
  }
  {
    const a = makeActor({ normal: 1, max: 3, bonus: [
      { id: 'limited', source: 'Guardian Spirit', value: 1, max: 1, restrictions: 'only powers', expires: 'daily-rest-cycle' }
    ] });
    const receipt = await ActorEngine.spendForcePoints(a, 1, rollContext('normal-while-bonus-limited'));
    assert.equal(receipt.normalSpent, 1);
    assert.equal(a.system.forcePoints.value, 0);
    assert.equal(a.flags.swse.bonusForcePoints.entries[0].value, 1);
    assert.equal((await ActorEngine.rollbackForcePointSpend(a, receipt)).rolledBack, true);
    assert.equal(a.system.forcePoints.value, 1);
    check('unrelated restricted entry untouched while eligible normal FP is used');
  }
  {
    const a = makeActor({ normal: 2 });
    globalThis.game.combat = { started: true, id: 'combat-A', round: 1, combatant: { actor: { id: a.id } } };
    const decisions = await Promise.allSettled([
      ActorEngine.spendForcePoints(a, 1, rollContext('race-a')),
      ActorEngine.spendForcePoints(a, 1, rollContext('race-b'))
    ]);
    assert.equal(decisions.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(decisions.filter(r => r.status === 'rejected').length, 1);
    assert.equal(a.system.forcePoints.value, 1);
    assert.equal(a.flags.swse.forcePointLedger.receipts.filter(r => r.state === 'committed').length, 1);
    check('two concurrent requests share one counted round allowance');
    game.combat.round = 2;
    assert.equal((await ActorEngine.spendForcePoints(a, 1, rollContext('new-round'))).spent, 1);
    assert.equal(a.system.forcePoints.value, 0);
    check('new combat round permits a fresh counted spend');
    game.combat = null;
  }
  {
    const a = makeActor({ normal: 2 });
    await ActorEngine.spendForcePoints(a, 1, rollContext('replay-id'));
    await assert.rejects(() => ActorEngine.spendForcePoints(a, 1, rollContext('replay-id')));
    assert.equal(a.system.forcePoints.value, 1);
    await assert.rejects(() => ActorEngine.spendForcePoints(a, 2, rollContext('partial')));
    assert.equal(a.system.forcePoints.value, 1);
    check('request replay and unsupported multi-spend fail without resource mutation');
  }
  {
    const a = makeActor({ normal: 1 });
    globalThis.game.combat = { started: true, id: 'combat-B', round: 1, combatant: { actor: { id: 'other-actor' } } };
    assert.equal(ForcePointsService.authorizeSpend(a, rollContext('offturn-no-feat')).valid, false);
    a.items.push({ id: 'p1', type: 'force-power', system: { spent: true } });
    assert.equal(ForcePointsService.authorizeSpend(a, {
      useKind: 'recover-one-force-power', targetItemInstanceId: 'p1', requestId: 'react-recover'
    }).valid, true);
    a.items.push({ id: 'fr', type: 'feat', system: { slug: 'force-readiness' } });
    assert.equal(ForcePointsService.authorizeSpend(a, rollContext('offturn-with-feat')).valid, true);
    game.combat = null;
    check('recovery reaction needs no Force Readiness, offturn bonus requires owned feat');
  }
  {
    const a = makeActor({ normal: 1 });
    throwAfterWrite = true;
    await assert.rejects(() => ActorEngine.spendForcePoints(a, 1, rollContext('uncertain')));
    throwAfterWrite = false;
    assert.equal(a.system.forcePoints.value, 0);
    await assert.rejects(() => ActorEngine.spendForcePoints(a, 1, rollContext('uncertain')));
    assert.equal(a.system.forcePoints.value, 0);
    check('applied-then-threw mutation cannot be silently retried');
  }
  {
    const a = makeActor();
    const savedResolution = ModifierEngine.resolveTarget;
    const savedPaid = RollCore.applyForcePointLogic;
    const savedRoll = RollCore._executeRoll;
    let baseRolls = 0;
    try {
      ModifierEngine.resolveTarget = async () => ({ total: 0, breakdown: {}, ledger: [], suppressed: [] });
      RollCore.applyForcePointLogic = async () => ({ success: false, reason: 'not authorized', spent: 0 });
      RollCore._executeRoll = async () => { baseRolls += 1; return { total: 10, dice: [] }; };
      const result = await RollCore.execute({ actor: a, domain: 'skill.acrobatics', rollOptions: { useForce: true } });
      assert.equal(result.success, false);
      assert.equal(baseRolls, 0);
    } finally {
      ModifierEngine.resolveTarget = savedResolution;
      RollCore.applyForcePointLogic = savedPaid;
      RollCore._executeRoll = savedRoll;
    }
    check('denied paid RollCore request never executes unpaid base roll');
  }
} finally {
  restore();
  delete globalThis.game.combat;
}
console.log(`Force V2 03B behavior: ${passed} assertions groups completed.`);
