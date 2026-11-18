import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods, setPath } from './helpers/real-force-point-engine.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {}, HandlebarsApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
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

const writer = async (actor, update) => { for (const [path, value] of Object.entries(update)) setPath(actor, path, value); return actor; };
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);
let passed = 0;
const check = (name) => { passed += 1; console.log(`PASS ${passed}: ${name}`); };
globalThis.game.user = { id: 'gm-1', isGM: true };
const rollCtx = (requestId) => ({ useKind: 'roll-bonus', rollDomain: 'skill.acrobatics', requestId });
const option = (ref = 'test:talent', extra = {}) => ({ useKind: 'ability-option', abilitySourceRef: ref, gmAdjudication: { reason: 'GM ruled for the test table' }, ...extra });
const unadjudicated = (ref = 'test:talent') => ({ useKind: 'ability-option', abilitySourceRef: ref });

try {
  {
    const a = makeActor({ normal: 3 });
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option' }).valid, false, 'identified source required');
    assert.equal(ForcePointsService.authorizeSpend(a, option()).valid, true, 'verified GM adjudication permits an uncertified ability');
    const gmReceipt = await ActorEngine.spendForcePoints(a, 1, option('x:gm'));
    assert.equal(gmReceipt.adjudicatedBy.userId, 'gm-1');
    assert.equal(gmReceipt.adjudicatedBy.reason, 'GM ruled for the test table');
    assert.equal(ForcePointsService.authorizeSpend(a, unadjudicated()).valid, false, 'being a GM is not adjudication');
    assert.equal(ForcePointsService.authorizeSpend(a, option('x', { gmAdjudication: { reason: '  ' } })).valid, false, 'a reason is mandatory');
    globalThis.game.user = { id: 'player-1', isGM: false };
    assert.equal(ForcePointsService.authorizeSpend(a, option()).valid, false, 'a player cannot adjudicate, even with a reason (FP-RD-003)');
    assert.equal(ForcePointsService.authorizeSpend(a, option('x', { isGMAdjudicated: true })).valid, false, 'a caller-supplied adjudication boolean proves nothing');
    globalThis.game.user = { id: 'gm-1', isGM: true };
    await assert.rejects(() => ActorEngine.spendForcePoints(a, 1), /Unsupported or unclassified/, 'a two-argument spend stays refused');
    assert.equal(a.system.forcePoints.value, 2, 'only the GM-adjudicated spend was debited');
    check('ability option requires an identified source; unclassified spends remain refused');
  }
  {
    const a = makeActor({ normal: 4, max: 4 });
    globalThis.game.combat = { started: true, id: 'combat-C', round: 1, combatant: { actor: { id: a.id } } };
    const first = await ActorEngine.spendForcePoints(a, 1, option('consular:promptForceOfWill'));
    assert.equal(first.useKind, 'ability-option');
    assert.equal(first.abilitySourceRef, 'consular:promptForceOfWill');
    // Caller-supplied override flags are proofs of nothing.
    for (const extra of [{ allowOncePerRoundOverride: true }, { ignoreLimit: true }, { ignoreOnePerTurn: true }, { isReaction: true }]) {
      await assert.rejects(() => ActorEngine.spendForcePoints(a, 1, option('lightsaber-form:djem-so', extra)), /already been spent this round/);
    }
    assert.equal(a.system.forcePoints.value, 3);
    globalThis.game.combat.round = 2;
    assert.equal((await ActorEngine.spendForcePoints(a, 1, option('consular:next'))).spent, 1);
    globalThis.game.combat = null;
    check('ability options count against the Core p.93 round limit; override flags grant nothing; new round resets');
  }
  {
    const a = makeActor({ normal: 3, max: 3 });
    globalThis.game.combat = { started: true, id: 'combat-D', round: 1, combatant: { actor: { id: 'someone-else' } } };
    assert.equal(ForcePointsService.authorizeSpend(a, option()).valid, true, 'ability-defined timing is not second-guessed here (FP-RD-003)');
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'reduce-dark-side-score' }).valid, false, 'swift/own-turn uses are still gated');
    globalThis.game.combat = null;
    check('off-turn gate unchanged for core uses; ability options are not given invented timing');
  }
  {
    const a = makeActor({ normal: 2, max: 3, condition: 5 });
    assert.equal(ForcePointsService.authorizeSpend(a, option()).valid, false, 'helpless actor cannot activate an option');
    const deadlyContext = { useKind: 'avoid-death', sourceEventId: 'evt-1' };
    assert.equal(ForcePointsService.authorizeSpend(a, deadlyContext).valid, false, 'no receipt, no rescue');
    a.flags.swse.forceDeathRescueEvent = { id: 'evt-1', actorId: a.id, state: 'eligible' };
    globalThis.game.combat = { started: true, id: 'combat-E', round: 1, combatant: { actor: { id: 'attacker' } } };
    assert.equal(ForcePointsService.authorizeSpend(a, { ...deadlyContext, sourceEventId: 'other' }).valid, false, 'receipt must match');
    const receipt = await ActorEngine.spendForcePoints(a, 1, deadlyContext);
    assert.equal(receipt.useKind, 'avoid-death');
    assert.equal(a.system.forcePoints.value, 1);
    a.flags.swse.forceDeathRescueEvent.state = 'consumed';
    assert.equal(ForcePointsService.authorizeSpend(a, { ...deadlyContext, requestId: 'again' }).valid, false, 'consumed receipt cannot authorize again');
    globalThis.game.combat = null;
    check('death rescue: reaction legal while helpless/off-turn only with a matching single-use event receipt');
  }
  {
    const a = makeActor({ normal: 3, max: 3 });
    globalThis.game.combat = { started: true, id: 'combat-F', round: 1, combatant: { actor: { id: a.id } } };
    const receipt = await ActorEngine.spendForcePoints(a, 1, option('x:y'));
    assert.equal(a.system.forcePoints.value, 2);
    a.system.forcePoints.value = 3; // refilled before the compensation runs
    const outcome = await ActorEngine.rollbackForcePointSpend(a, receipt);
    assert.equal(outcome.rolledBack, true);
    assert.equal(outcome.normalRestored, 0, 'never above max; nothing fabricated');
    assert.equal(a.system.forcePoints.value, 3);
    assert.equal(a.flags.swse.forcePointLedger.receipts[0].state, 'rolled-back');
    assert.equal((await ActorEngine.spendForcePoints(a, 1, option('x:y2'))).spent, 1, 'a cancelled use frees its round slot');
    globalThis.game.combat = null;
    check('rollback at normal max closes the receipt, restores only headroom, frees the round slot');
  }
  {
    // FP-RD-005 (Core p.146): rescue may follow an ordinary spend in the same round; it still counts afterwards.
    const mk = () => { const a = makeActor({ normal: 3, max: 3 }); a.flags.swse.forceDeathRescueEvent = { id: 'evt-2', actorId: a.id, state: 'eligible' }; return a; };
    globalThis.game.combat = { started: true, id: 'combat-H', round: 1, combatant: { actor: { id: 'someone' } } };
    let a = mk();
    a.system.forcePoints.value = 3;
    globalThis.game.combat.combatant.actor.id = a.id;
    await ActorEngine.spendForcePoints(a, 1, rollCtx('first'));
    assert.equal(ForcePointsService.authorizeSpend(a, option('x:y2')).valid, false, 'second ordinary spend is capped');
    const rescue = await ActorEngine.spendForcePoints(a, 1, { useKind: 'avoid-death', sourceEventId: 'evt-2' });
    assert.equal(rescue.spent, 1, 'rescue after an earlier counted spend is legal');
    assert.equal(a.system.forcePoints.value, 1);
    // order 2: rescue first, then ordinary spend is denied (rescue is recorded as counted)
    a = mk();
    globalThis.game.combat.combatant.actor.id = a.id;
    await ActorEngine.spendForcePoints(a, 1, { useKind: 'avoid-death', sourceEventId: 'evt-2' });
    assert.equal(ForcePointsService.authorizeSpend(a, rollCtx('after')).valid, false, 'ordinary spend after a rescue is denied the same round');
    globalThis.game.combat = null;
    check('death rescue bypasses prior-spend eligibility only; it remains a counted expenditure (both orders)');
  }
  {
    // Applied-effect boundary: finality only after the rescued state is persisted.
    const real = (await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href)).ActorEngine;
    const mkRescued = async () => {
      const a = makeActor({ normal: 3, max: 3 });
      a.flags.swse.forceDeathRescueEvent = { id: 'evt-3', actorId: a.id, state: 'eligible' };
      const receipt = await ActorEngine.spendForcePoints(a, 1, { useKind: 'avoid-death', sourceEventId: 'evt-3' });
      a.system.hp = { value: -5, max: 20 }; a.unsetFlag = async () => {};
      return { a, receipt };
    };
    let { a, receipt } = await mkRescued();
    assert.equal(a.flags.swse.forcePointLedger.receipts[0].state, 'committed', 'not final before the damage write');
    await real._settleForcePointRescue.call(ActorEngine, a, receipt, { hpAfter: -5, conditionAfter: 0 }, null);
    assert.equal(a.flags.swse.forcePointLedger.receipts[0].state, 'finalized');
    ({ a, receipt } = await mkRescued());
    await real._settleForcePointRescue.call(ActorEngine, a, receipt, { hpAfter: 0, conditionAfter: 5 }, new Error('write rejected'));
    assert.equal(a.flags.swse.forcePointLedger.receipts[0].state, 'rolled-back', 'rejected write compensates the exact spend');
    assert.equal(a.system.forcePoints.value, 3);
    ({ a, receipt } = await mkRescued());
    a.system.hp.value = 0; a.system.conditionTrack = { current: 5 };
    await real._settleForcePointRescue.call(ActorEngine, a, receipt, { hpAfter: 0, conditionAfter: 5 }, new Error('applied then threw'));
    assert.equal(a.flags.swse.forcePointLedger.receipts[0].state, 'finalized', 'applied-then-threw is classified by reading state');
    check('rescue finality depends on the persisted HP/condition transition; failed writes compensate; applied-then-threw finalizes');
  }
  {
    // End-to-end through the real damage-owner rescue method.
    const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
    const real = (await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href)).ActorEngine;
    const savedConfirm = SWSEDialogV2.confirm;
    SWSEDialogV2.confirm = async () => true;
    globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
    try {
      const a = makeActor({ normal: 2, max: 3, condition: 0 });
      a.system.hp = { value: -5, max: 20 };
      a.flags['foundryvtt-swse'] = {};
      a.setFlag = async () => {};
      const resolution = { forceRescueEligible: true, dead: true, hpAfter: -5, thresholdTotal: 15, thresholdMeasuredDamage: 30, conditionBefore: 0 };
      globalThis.game.combat = { started: true, id: 'combat-G', round: 1, combatant: { actor: { id: 'attacker' } } };
      const ok = await real._maybeResolveForcePointRescue.call(ActorEngine, a, resolution, { amount: 30 });
      assert.equal(ok, true, 'rescue succeeds off-turn through the typed reaction');
      assert.equal(resolution.forceRescueUsed, true);
      assert.equal(a.system.forcePoints.value, 1);
      const receipt = a.flags.swse.forcePointLedger.receipts[0];
      assert.equal(receipt.useKind, 'avoid-death');
      assert.equal(receipt.state, 'committed', 'finality waits for the persisted rescue state');
      assert.equal(resolution.forcePointRescueReceipt.receiptId, receipt.receiptId);
      assert.equal(a.flags.swse.forceDeathRescueEvent.state, 'consumed');
      globalThis.game.combat = null;
      check('real damage-owner rescue persists the event receipt, spends the typed reaction, leaves it committed for the applyDamage boundary and consumes the receipt');
    } finally { SWSEDialogV2.confirm = savedConfirm; }
  }
  {
    // Static guard: no production caller may use the unclassified two-argument form.
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const offenders = [];
    const walk = (dir) => { for (const name of readdirSync(dir)) {
      const full = join(dir, name); const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name.endsWith('.js')) readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
        if (/spendForcePoints\(\s*[\w.?]+\s*,\s*[\w.]+\s*\)/.test(line) && !/^\s*(\*|\/\/)/.test(line)) offenders.push(`${full}:${i + 1}`);
      });
    } };
    walk(new URL('../scripts', import.meta.url).pathname);
    assert.deepEqual(offenders, [], 'every spendForcePoints caller must supply a classified context');
    check('no unclassified two-argument spendForcePoints caller remains in scripts/');
  }
} finally {
  restore();
  delete globalThis.game.combat;
}
console.log(`Force V2 03B consumer cutover: ${passed} assertion groups completed.`);
