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
const { fake: ActorEngine, real, restore } = await graftRealForcePointMethods(writer);
for (const m of ['recordOutgoingAttackEvent', 'setOutgoingAttackEventState', 'consumeAttackEventAsDefender', 'releaseAttackEventAsDefender']) ActorEngine[m] = real[m];
const { AttackEventAuthority } = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/attack-event-authority.js');
const { ABILITY_OPTION_CONTRACTS } = await import('/systems/foundryvtt-swse/scripts/engine/force/ability-option-contracts.js');
let passed = 0;
const check = (name) => { passed += 1; console.log(`PASS ${passed}: ${name}`); };

const talent = (name, slug) => ({ id: `t-${slug}`, type: 'talent', name, system: {}, ...(slug ? { flags: { swse: { id: `swse.talent.${slug.replace(/-/g, '_')}` } } } : {}) });
const mk = (id, items = []) => { const a = makeActor({ normal: 6, max: 6 }); a.id = id; a.name = id; a.isOwner = true; a.items = items; return a; };
let attacker, defender, ally, other;
const reset = (defItems = []) => {
  attacker = mk('attacker'); defender = mk('defender', defItems); ally = mk('ally'); other = mk('other');
  globalThis.game.actors = { get: (id) => ({ attacker, defender, ally, other }[id]) };
};
globalThis.game.user = { id: 'u', isGM: false };
let activeActor = 'defender';
const setCombat = (round = 1) => { globalThis.game.combat = { started: true, id: 'c1', round, turn: 0, get combatant() { return { actor: { id: activeActor } }; } }; };
const weapon = { id: 'w', name: 'Blade' };
const mint = (target, over = {}) => AttackEventAuthority.produce({ attacker, defender: target, weapon, attackType: 'melee', damageTypes: [], attackTotal: 25, hit: true, critical: false, ...over });
const fortCtx = (event, extra = {}) => ({ useKind: 'ability-option', abilitySourceRef: 'lightsaber:promptForceFortification', reaction: { id: event.id, attackerId: 'attacker' }, ...extra });
const ledger = () => defender.flags.swse.forcePointLedger.receipts;
const place = (map) => { globalThis.canvas = { grid: { size: 100 }, scene: { grid: { distance: 1 } }, tokens: { placeables: Object.entries(map).map(([id, [x, y]]) => ({ actor: { id: id === 'defender' ? defender.id : ({ ally, other, attacker }[id]).id }, center: { x: x * 100, y: y * 100 } })) } }; };

try {
  {
    assert.deepEqual(Object.keys(ABILITY_OPTION_CONTRACTS).sort(), ['lightsaber:promptBlock', 'lightsaber:promptDeflect', 'lightsaber:promptForceFortification', 'lightsaber:promptImprovedLightsaberThrow']);
    check('batch 1 certifies exactly four lightsaber contracts (the rest stay uncertified)');
  }
  {
    reset([talent('Force Fortification', 'force-fortification')]); setCombat(); activeActor = 'attacker';
    const crit = await mint(defender, { critical: true });
    assert.equal(ForcePointsService.authorizeSpend(defender, { useKind: 'ability-option', abilitySourceRef: 'lightsaber:promptForceFortification' }).valid, false, 'no triggering event, no spend');
    const forged = ForcePointsService.authorizeSpend(defender, fortCtx({ id: 'nope' }));
    assert.equal(forged.valid, false);
    assert.equal(ForcePointsService.authorizeSpend(defender, fortCtx(crit, { gmAdjudication: { reason: 'x' } })).valid, true, 'reaction timing: legal off turn');
    const noncrit = await mint(defender, { critical: false });
    assert.match(ForcePointsService.authorizeSpend(defender, fortCtx(noncrit)).message, /critical hit/);
    const miss = await mint(defender, { critical: true, hit: false });
    assert.equal(ForcePointsService.authorizeSpend(defender, fortCtx(miss)).valid, false);
    const onAlly = await mint(ally, { critical: true });
    assert.equal(ForcePointsService.authorizeSpend(defender, fortCtx(onAlly)).valid, false, 'only a critical hit scored against YOU');
    check('Force Fortification: verified critical-hit event required; forged, non-critical, missed and other-target events are refused; legal as an off-turn reaction');
  }
  {
    reset([talent('Force Fortification', 'force-fortification')]); setCombat(); activeActor = 'defender';
    const first = await ActorEngine.spendForcePoints(defender, 1, { useKind: 'roll-bonus', rollDomain: 'skill.acrobatics' });
    assert.equal(first.countsTowardRoundLimit, true);
    const crit = await mint(defender, { critical: true });
    assert.equal(ForcePointsService.authorizeSpend(defender, { useKind: 'roll-bonus', rollDomain: 'skill.stealth' }).valid, false, 'the ordinary cap still binds everything else');
    const ff = await ActorEngine.spendForcePoints(defender, 1, fortCtx(crit));
    assert.equal(ff.spent, 1, 'printed exception: legal even after an earlier Force Point this round');
    assert.equal(ff.reactionEventId, `${crit.id}#lightsaber:promptForceFortification`);
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, fortCtx(crit)), /already spent on this triggering event/, 'one payment per critical hit');
    // The exception is narrow: it does not open the door for unrelated spends afterwards.
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, { useKind: 'roll-bonus', rollDomain: 'skill.stealth' }), /already been spent this round/);
    const back = await ActorEngine.rollbackForcePointSpend(defender, ff);
    assert.equal(back.rolledBack, true); assert.equal(defender.system.forcePoints.value, 5, 'exact compensation of just that point');
    check('Force Fortification: waives only the prior-spend check; one payment per event; narrow; exact rollback');
  }
  {
    // Canonical identity beats the mutable display name.
    reset([talent('Force Fortification', 'block')]); setCombat(); activeActor = 'attacker';
    const crit = await mint(defender, { critical: true });
    assert.equal(ForcePointsService.authorizeSpend(defender, fortCtx(crit)).valid, false, 'a talent NAMED Force Fortification but canonically Block is not Force Fortification');
    reset([talent('Renamed By Table', 'force-fortification')]); setCombat(); activeActor = 'attacker';
    const crit2 = await mint(defender, { critical: true });
    assert.equal(ForcePointsService.authorizeSpend(defender, fortCtx(crit2)).valid, true, 'a canonical talent renamed on the sheet still counts');
    reset([talent('Force Fortification', null)]); setCombat(); activeActor = 'attacker';
    const crit3 = await mint(defender, { critical: true });
    assert.equal(ForcePointsService.authorizeSpend(defender, fortCtx(crit3)).valid, true, 'legacy item with no canonical identity falls back to its name');
    const disabled = talent('Force Fortification', 'force-fortification'); disabled.system.disabled = true;
    reset([disabled]); setCombat(); activeActor = 'attacker';
    const crit4 = await mint(defender, { critical: true });
    assert.equal(ForcePointsService.authorizeSpend(defender, fortCtx(crit4)).valid, false, 'a disabled talent grants nothing');
    check('ownership is verified by canonical identity (not the mutable name); legacy items fall back to name; disabled talents grant nothing');
  }
  {
    reset([talent('Improved Lightsaber Throw', 'improved-lightsaber-throw')]); setCombat(); activeActor = 'defender';
    const ilt = { useKind: 'ability-option', abilitySourceRef: 'lightsaber:promptImprovedLightsaberThrow' };
    assert.equal(ForcePointsService.authorizeSpend(defender, ilt).valid, true);
    activeActor = 'attacker';
    assert.equal(ForcePointsService.authorizeSpend(defender, ilt).valid, false, 'a standard action is not available off turn');
    activeActor = 'defender';
    const spend = await ActorEngine.spendForcePoints(defender, 1, ilt);
    assert.equal(spend.countsTowardRoundLimit, true, 'no printed round-cap exception');
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, ilt), /already been spent this round/);
    reset([talent('Lightsaber Throw', 'lightsaber-throw')]); setCombat();
    assert.equal(ForcePointsService.authorizeSpend(defender, ilt).valid, false, 'the prerequisite talent is not the talent');
    globalThis.game.combat = null;
    reset([talent('Improved Lightsaber Throw', 'improved-lightsaber-throw')]);
    assert.equal(ForcePointsService.authorizeSpend(defender, ilt).valid, true, 'outside combat the own-turn gate does not apply');
    check('Improved Lightsaber Throw: owned canonical talent, standard action only on own turn, counts toward the round limit, no pass for the prerequisite');
  }
  {
    // End to end through the real talent action: cancelled dialog charges nothing; a failed card gives the point back.
    const { LightsaberTalentActions } = await import('/systems/foundryvtt-swse/scripts/engine/talent/lightsaber-talent-actions.js');
    const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
    const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
    const savedPrompt = SWSEDialogV2.prompt; const savedPost = SWSEChat.postHTML;
    SWSEChat.postHTML = async () => ({});
    globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
    try {
      reset([talent('Improved Lightsaber Throw', 'improved-lightsaber-throw')]); setCombat(); activeActor = 'defender';
      SWSEDialogV2.prompt = async () => null;
      assert.equal(await LightsaberTalentActions.promptImprovedLightsaberThrow(defender), null);
      assert.equal(defender.system.forcePoints.value, 6); assert.equal(defender.flags.swse.forcePointLedger, undefined, 'a cancelled dialog never charges');
      SWSEDialogV2.prompt = async () => ({ targetName: 'two droids', pullBack: false });
      const ok = await LightsaberTalentActions.promptImprovedLightsaberThrow(defender);
      assert.equal(ok?.forcePointSpent, true); assert.equal(ledger()[0].state, 'finalized'); assert.equal(defender.system.forcePoints.value, 5);
      reset([talent('Improved Lightsaber Throw', 'improved-lightsaber-throw')]); setCombat(); activeActor = 'defender';
      SWSEChat.postHTML = async () => { throw new Error('chat down'); };
      await assert.rejects(() => LightsaberTalentActions.promptImprovedLightsaberThrow(defender), /chat down/);
      assert.equal(ledger()[0].state, 'rolled-back'); assert.equal(defender.system.forcePoints.value, 6, 'the paid use did not occur: exact refund');
      check('Improved Lightsaber Throw end to end: no charge on cancel; finalized after the use; refunded exactly when it fails');
    } finally { SWSEDialogV2.prompt = savedPrompt; SWSEChat.postHTML = savedPost; }
  }
  {
    const blocker = [talent('Block', 'block'), talent('Deflect', 'deflect')];
    reset(blocker); setCombat(); activeActor = 'attacker';
    place({ defender: [5, 5], ally: [6, 5], other: [9, 9], attacker: [2, 2] });
    const adj = (talentKey, ev) => ForcePointsService.authorizeSpend(defender, { useKind: 'ability-option', abilitySourceRef: `lightsaber:prompt${talentKey}`, reaction: { id: ev.id, attackerId: 'attacker' } });
    const melee = await mint(ally); const ranged = await mint(ally, { attackType: 'ranged' }); const far = await mint(other); const self = await mint(defender);
    const ok = adj('Block', melee);
    assert.deepEqual([ok.valid, ok.countsTowardRoundLimit, ok.actionTiming], [true, true, 'reaction'], 'legal off turn as a reaction; counts under the default round limit');
    assert.equal(adj('Deflect', ranged).valid, true);
    assert.match(adj('Deflect', melee).message, /ranged/); assert.match(adj('Block', ranged).message, /melee/);
    assert.match(adj('Block', far).message, /not adjacent/);
    assert.match(adj('Block', self).message, /targets you/);
    assert.match(adj('Block', { id: 'forged' }).message, /Unknown attack event/);
    // Ownership: a player who does not control the blocker cannot use the contract.
    defender.isOwner = false;
    assert.match(adj('Block', melee).message, /do not control/);
    defender.isOwner = true;
    // Identity: Deflect-only actors cannot Block an ally's attack.
    reset([talent('Deflect', 'deflect')]); setCombat(); activeActor = 'attacker'; place({ defender: [5, 5], ally: [6, 5], attacker: [2, 2] });
    const m2 = await mint(ally);
    assert.match(adj('Block', m2).message, /block is not owned/);
    // Consumed by this blocker.
    reset(blocker); setCombat(); activeActor = 'attacker'; place({ defender: [5, 5], ally: [6, 5], attacker: [2, 2] });
    const m3 = await mint(ally);
    await AttackEventAuthority.consume(defender, m3.id);
    assert.match(adj('Block', m3).message, /already consumed/);
    check('adjacent-ally Block/Deflect: verified attack on an adjacent ally, melee/ranged match, owned canonical talent, ownership, consumption; reaction timing; counted by default');
  }
  {
    reset([talent('Block', 'block')]); setCombat(); activeActor = 'attacker'; place({ defender: [5, 5], ally: [6, 5], attacker: [2, 2] });
    const m = await mint(ally);
    const ctx = { useKind: 'ability-option', abilitySourceRef: 'lightsaber:promptBlock', reaction: { id: m.id, attackerId: 'attacker' } };
    const receipt = await ActorEngine.spendForcePoints(defender, 1, ctx);
    assert.equal(receipt.spent, 1);
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, ctx), /already spent on this triggering event|already been spent this round/);
    const back = await ActorEngine.rollbackForcePointSpend(defender, receipt);
    assert.equal(back.rolledBack, true); assert.equal(defender.system.forcePoints.value, 6);
    assert.equal((await ActorEngine.spendForcePoints(defender, 1, ctx)).spent, 1, 'after exact compensation the same attack can be answered again');
    const { readFileSync } = await import('node:fs');
    const t = readFileSync(new URL('../scripts/engine/talent/lightsaber-talent-actions.js', import.meta.url), 'utf8');
    assert.ok(/ownedAbilityInstance\(actor, \{ type: 'talent', slug: 'sheltering-stance' \}\)/.test(t), 'Sheltering Stance is verified by canonical identity, not a checkbox');
    assert.ok(!/choice\.shelteringStance/.test(t.replace(/shelteringStance: shelteringApplies/g, '')), 'the UI checkbox no longer waives the cost');
    check('adjacent-ally spend: one payment per attack, exact compensation reopens it; Sheltering Stance waiver comes from owned identity, not a checkbox');
  }
} finally {
  restore();
  delete globalThis.game.combat;
}
console.log(`Force V2 03B lightsaber contracts: ${passed} assertion groups completed.`);
