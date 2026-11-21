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
const { beginContractedForcePoint, latestOwnAttackEvent, latestMeleeHitAgainst } = await import('/systems/foundryvtt-swse/scripts/engine/force/contracted-force-point.js');
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };

const talent = (name) => ({ id: `t-${name}`, type: 'talent', name, system: {} });
const mk = (id, items = []) => { const a = makeActor({ normal: 6, max: 6 }); a.id = id; a.name = id; a.isOwner = true; a.items = items; a.setFlag = async (s, k, v) => { setPath(a, `flags.${s}.${k}`, v); return a; }; a.unsetFlag = async (s, k) => { delete a.flags?.[s]?.[k]; return a; }; return a; };
const receipts = (a) => a.flags.swse.forcePointLedger?.receipts ?? [];
let actorsById = {};
globalThis.game.actors = { get: (id) => actorsById[id] };
globalThis.game.user = { id: 'u', isGM: false };
let active = 'jedi';
const setCombat = (round = 1, id = 'c1', actors = []) => { globalThis.game.combat = { started: true, id, round, turn: 0, combatants: actors.map(x => ({ actor: x })), get combatant() { return { actor: { id: active } }; } }; };

try {
  {
    globalThis.game.combat = null;
    const a = mk('jedi', []);
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option', abilitySourceRef: 'sith:Channel Anger' }).valid, false, 'talent not owned');
    a.items.push(talent('Channel Anger'));
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option', abilitySourceRef: 'sith:Channel Anger' }).valid, true);
    a.items.push(talent('Totally Made Up'));
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option', abilitySourceRef: 'sith:Totally Made Up' }).valid, false, 'an unlisted title is never authorized');
    for (const ref of ['sith:Channel Aggression', 'sith:Dark Healing Field', 'jedi-prestige:promptForceRevive', 'jedi-prestige:promptApprenticeBoon', 'jedi-prestige:promptUncloudedJudgement', 'sentinel:promptDarkRetaliation']) {
      assert.equal(ABILITY_OPTION_CONTRACTS[ref], undefined, `${ref} stays uncertified (no verified trigger / unprinted action)`);
    }
    check('contracts require the owned talent; dynamic/unlisted titles and unverifiable triggers stay uncertified');
  }
  {
    globalThis.game.combat = null;
    const a = mk('jedi', [talent('Force of Will')]);
    let fp = await beginContractedForcePoint(a, 'consular:promptForceOfWill', {});
    assert.equal(fp.ok, true); assert.equal(a.system.forcePoints.value, 5);
    assert.deepEqual(await fp.settle(async () => ({ success: true })), { success: true });
    assert.equal(receipts(a).at(-1).state, 'finalized');
    fp = await beginContractedForcePoint(a, 'consular:promptForceOfWill', {});
    assert.equal(await fp.settle(async () => null), null);
    assert.equal(a.system.forcePoints.value, 5, 'nothing applied: exact refund');
    assert.equal(receipts(a).at(-1).state, 'rolled-back');
    fp = await beginContractedForcePoint(a, 'consular:promptForceOfWill', {});
    await assert.rejects(fp.settle(async () => { throw new Error('boom'); }), /boom/);
    assert.equal(a.system.forcePoints.value, 5, 'thrown effect: exact refund');
    await assert.rejects(fp.settle(async () => true), /already settled/);
    check('settlement: finalized only after the effect; nothing-applied or thrown effects refund exactly; no double settle');
  }
  {
    // round limit still applies, and timing: a swift-action talent must be used on the actor's own turn
    const a = mk('jedi', [talent('Force of Will'), talent('Channel Anger')]);
    actorsById = { jedi: a };
    active = 'someone-else'; setCombat(1);
    assert.equal((await beginContractedForcePoint(a, 'consular:promptForceOfWill', {})).ok, false, 'not your turn');
    active = 'jedi';
    const fp = await beginContractedForcePoint(a, 'consular:promptForceOfWill', {});
    assert.equal(fp.ok, true); await fp.settle(async () => true);
    assert.equal((await beginContractedForcePoint(a, 'sith:Channel Anger', {})).ok, false, 'one counted Force Point per round');
    setCombat(2);
    assert.equal((await beginContractedForcePoint(a, 'sith:Channel Anger', {})).ok, true);
    check('own-turn timing for swift/standard talents and the one-Force-Point-per-round limit are enforced');
  }
  {
    // printed use limits read from the ledger: Juyo once per encounter, Entreat Aid once per round, Share Talent once per day
    const a = mk('jedi', [talent('Juyo'), talent('Share Talent')]);
    actorsById = { jedi: a }; active = 'jedi';
    globalThis.game.combat = null;
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option', abilitySourceRef: 'lightsaber-form:promptJuyo' }).valid, false, 'once-per-encounter needs a started combat');
    setCombat(1, 'enc-1');
    let fp = await beginContractedForcePoint(a, 'lightsaber-form:promptJuyo', {}); await fp.settle(async () => true);
    setCombat(3, 'enc-1');
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option', abilitySourceRef: 'lightsaber-form:promptJuyo' }).valid, false, 'already used this encounter');
    setCombat(1, 'enc-2');
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option', abilitySourceRef: 'lightsaber-form:promptJuyo' }).valid, true, 'new encounter');
    globalThis.game.combat = null;
    globalThis.game.time = { worldTime: undefined };
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option', abilitySourceRef: 'jedi-prestige:promptShareTalent' }).valid, false, 'no world clock: once-per-day refuses');
    globalThis.game.time = { worldTime: 1000 };
    fp = await beginContractedForcePoint(a, 'jedi-prestige:promptShareTalent', {}); await fp.settle(async () => true);
    globalThis.game.time = { worldTime: 1000 + 3600 };
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option', abilitySourceRef: 'jedi-prestige:promptShareTalent' }).valid, false, 'same day');
    globalThis.game.time = { worldTime: 1000 + 86400 };
    assert.equal(ForcePointsService.authorizeSpend(a, { useKind: 'ability-option', abilitySourceRef: 'jedi-prestige:promptShareTalent' }).valid, true, 'next day');
    check('printed use limits come from the ledger: once/encounter (Juyo), once/day (Share Talent, world clock required)');
  }
  {
    // Djem So: verified melee hit against you this round; one Force Point per event; forged or ranged events refused
    const attacker = mk('attacker'); const jedi = mk('jedi', [talent('Djem So')]);
    actorsById = { attacker, jedi }; active = 'attacker'; setCombat(1, 'c9', [attacker, jedi]);
    assert.equal(latestMeleeHitAgainst(jedi), null);
    const ranged = await AttackEventAuthority.produce({ attacker, defender: jedi, weapon: { id: 'w' }, attackType: 'ranged', attackTotal: 20, hit: true });
    assert.equal(ForcePointsService.authorizeSpend(jedi, { useKind: 'ability-option', abilitySourceRef: 'lightsaber-form:djem-so', reaction: { id: ranged.id, attackerId: 'attacker' } }).valid, false, 'ranged hit');
    const miss = await AttackEventAuthority.produce({ attacker, defender: jedi, weapon: { id: 'w' }, attackType: 'melee', attackTotal: 9, hit: false });
    assert.equal(ForcePointsService.authorizeSpend(jedi, { useKind: 'ability-option', abilitySourceRef: 'lightsaber-form:djem-so', reaction: { id: miss.id, attackerId: 'attacker' } }).valid, false, 'a miss');
    assert.equal(ForcePointsService.authorizeSpend(jedi, { useKind: 'ability-option', abilitySourceRef: 'lightsaber-form:djem-so', reaction: { id: 'atk-forged', attackerId: 'attacker' } }).valid, false, 'forged');
    const hit = await AttackEventAuthority.produce({ attacker, defender: jedi, weapon: { id: 'w' }, attackType: 'melee', attackTotal: 25, hit: true });
    const claim = latestMeleeHitAgainst(jedi);
    assert.equal(claim.id, hit.id);
    const fp = await beginContractedForcePoint(jedi, 'lightsaber-form:djem-so', { reaction: claim });
    assert.equal(fp.ok, true, 'reaction off turn'); await fp.settle(async () => true);
    assert.equal(ForcePointsService.authorizeSpend(jedi, { useKind: 'ability-option', abilitySourceRef: 'lightsaber-form:djem-so', reaction: claim }).valid, false, 'once per round / once per event');
    check('Djem So: only a verified melee HIT against you this round, reaction off turn, once per round; forged/ranged/miss refused');
  }
  {
    // Wicked Strike / Crippling Strike / Exposing Strike: the actor's own verified hit/critical; lightsaber check from the owned weapon
    const saber = { id: 'saber', type: 'weapon', name: 'Lightsaber', system: { group: 'lightsabers', weaponGroup: 'lightsabers', subcategory: 'lightsaber', isLightsaber: true } };
    const club = { id: 'club', type: 'weapon', name: 'Club', system: { group: 'simple' } };
    const sith = mk('sith', [talent('Wicked Strike'), talent('Crippling Strike'), talent('Exposing Strike'), saber, club]);
    const victim = mk('victim');
    actorsById = { sith, victim }; active = 'sith'; setCombat(1, 'c7', [sith, victim]);
    const crit = await AttackEventAuthority.produce({ attacker: sith, defender: victim, weapon: saber, attackType: 'melee', attackTotal: 30, hit: true, critical: true });
    assert.equal(latestOwnAttackEvent(sith, { targetId: 'victim', critical: true }).id, crit.id);
    assert.equal(ForcePointsService.authorizeSpend(sith, { useKind: 'ability-option', abilitySourceRef: 'sith:Wicked Strike', attackEvent: { id: crit.id } }).valid, true);
    assert.equal(ForcePointsService.authorizeSpend(sith, { useKind: 'ability-option', abilitySourceRef: 'sith:Wicked Strike', attackEvent: { id: 'atk-forged' } }).valid, false, 'forged');
    const clubCrit = await AttackEventAuthority.produce({ attacker: sith, defender: victim, weapon: club, attackType: 'melee', attackTotal: 30, hit: true, critical: true });
    assert.equal(ForcePointsService.authorizeSpend(sith, { useKind: 'ability-option', abilitySourceRef: 'sith:Wicked Strike', attackEvent: { id: clubCrit.id } }).valid, false, 'not a lightsaber');
    assert.equal(ForcePointsService.authorizeSpend(sith, { useKind: 'ability-option', abilitySourceRef: 'sith:Crippling Strike', attackEvent: { id: clubCrit.id } }).valid, true, 'Crippling Strike: any weapon');
    const plainHit = await AttackEventAuthority.produce({ attacker: sith, defender: victim, weapon: saber, attackType: 'melee', attackTotal: 22, hit: true, critical: false });
    assert.equal(ForcePointsService.authorizeSpend(sith, { useKind: 'ability-option', abilitySourceRef: 'sith:Crippling Strike', attackEvent: { id: plainHit.id } }).valid, false, 'not a critical');
    assert.equal(ForcePointsService.authorizeSpend(sith, { useKind: 'ability-option', abilitySourceRef: 'consular:promptExposingStrike', attackEvent: { id: plainHit.id } }).valid, true, 'Exposing Strike: lightsaber hit');
    setCombat(2, 'c7', [sith, victim]);
    assert.equal(ForcePointsService.authorizeSpend(sith, { useKind: 'ability-option', abilitySourceRef: 'consular:promptExposingStrike', attackEvent: { id: plainHit.id } }).valid, false, 'stale event');
    check('own-attack contracts: verified own hit/critical this round, lightsaber verified from the owned weapon; forged/stale refused');
  }
  {
    // End-to-end through the converted talent functions (real ForcePointsService + ActorEngine receipts)
    const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
    let posts = 0; SWSEChat.postHTML = async () => { posts++; return { id: 'msg' }; };
    globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
    const { SithTalentActions } = await import('/systems/foundryvtt-swse/scripts/engine/talent/sith-talent-actions.js');
    const { ForceExecutor } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-executor.js');
    globalThis.game.combat = null;
    const a = mk('sith2', [talent('Channel Anger'), talent('Aversion')]);
    a.system.abilities = { con: { mod: 2 } };
    ActorEngine.createEmbeddedDocuments = async () => [{ id: 'ae' }];
    const out = await SithTalentActions.promptChannelAnger(a);
    assert.ok(out, 'card posted');
    assert.equal(a.system.forcePoints.value, 5);
    assert.equal(a.flags.swse.channelAnger.active, true, 'rage state applied');
    assert.equal(receipts(a).at(-1).state, 'finalized');
    assert.equal(receipts(a).at(-1).abilitySourceRef, 'sith:Channel Anger');
    // Aversion: executor talent, settle signalled by the caller
    const av = await ForceExecutor.activateAversion(a);
    assert.equal(av.success, true, av.error);
    await new Promise(r => setTimeout(r, 0));
    assert.equal(a.system.forcePoints.value, 4);
    assert.equal(receipts(a).at(-1).abilitySourceRef, 'force-executor-option:Aversion');
    assert.equal(receipts(a).at(-1).state, 'finalized');
    // failure after payment refunds exactly
    ActorEngine.createEmbeddedDocuments = async () => { throw new Error('write failed'); };
    const failed = await ForceExecutor.activateAversion(a);
    assert.equal(failed.success, false);
    await new Promise(r => setTimeout(r, 0));
    assert.equal(a.system.forcePoints.value, 4, 'failed Aversion: Force Point returned');
    assert.equal(receipts(a).at(-1).state, 'rolled-back');
    check('end to end: Channel Anger and Aversion pay through their contracts, apply, finalize; a failed effect refunds');
  }
} catch (e) { console.error(e); process.exit(1); }
console.log(`ALL ${passed} PASSED`);
