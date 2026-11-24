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
for (const m of ['recordOutgoingAttackEvent', 'setOutgoingAttackEventState', 'consumeAttackEventAsDefender', 'releaseAttackEventAsDefender', 'grantRegimenEntitlement', 'recordRegimenFailure']) ActorEngine[m] = real[m];
const { AttackEventAuthority } = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/attack-event-authority.js');
const { buildRegimenEntitlement, evaluateRegimenEntitlement, regimenKeyFor } = await import('/systems/foundryvtt-swse/scripts/engine/force/regimen-entitlement.js');
let passed = 0;
const check = (name) => { passed += 1; console.log(`PASS ${passed}: ${name}`); };

const mk = (id) => { const a = makeActor({ normal: 6, max: 6 }); a.id = id; a.name = id; a.isOwner = true; return a; };
let attacker, defender;
const reset = () => {
  attacker = mk('attacker'); defender = mk('defender');
  globalThis.game.actors = { get: (id) => ({ attacker, defender }[id]) };
};
reset();
globalThis.game.user = { id: 'u', isGM: false };
globalThis.game.time = { worldTime: 100000 };
let activeActor = 'defender';
const setCombat = (round = 1) => { globalThis.game.combat = { started: true, id: 'c1', round, turn: 0, get combatant() { return { actor: { id: activeActor } }; } }; };
setCombat();
const weapon = { id: 'w', name: 'Blade' };
const mint = (attackType = 'melee', total = 25) => AttackEventAuthority.produce({ attacker, defender, weapon, attackType, damageTypes: [], attackTotal: total, hit: true });
const spendCtx = (event, talent, extra = {}) => ({ useKind: 'roll-bonus', rollDomain: 'skill.useTheForce', skillUseKey: talent, reaction: { id: event.id, attackerId: 'attacker' }, ...extra });
const grant = async (name, floor, now = 100000) => {
  const built = buildRegimenEntitlement({ regimenName: name, tierFloor: floor, grantId: `${regimenKeyFor(name)}-${now}`, worldTime: now });
  return built ? ActorEngine.grantRegimenEntitlement(defender, built, { now }) : { granted: false };
};
const ledger = () => defender.flags.swse.forcePointLedger.receipts;

try {
  {
    assert.equal(buildRegimenEntitlement({ regimenName: 'Sparring Practice', tierFloor: 17, grantId: 'g', worldTime: 5 }), null, 'below DC18 grants nothing');
    const dc18 = buildRegimenEntitlement({ regimenName: 'Sparring Practice', tierFloor: 18, grantId: 'g', worldTime: 5 });
    assert.deepEqual([dc18.entitlement.noncounting, dc18.entitlement.offTurn, dc18.temporaryEntries.length], [true, false, 0]);
    assert.equal(buildRegimenEntitlement({ regimenName: 'Sparring Practice', tierFloor: 23, grantId: 'g', worldTime: 5 }).temporaryEntries[0].value, 1);
    assert.equal(buildRegimenEntitlement({ regimenName: 'Sparring Practice', tierFloor: 28, grantId: 'g', worldTime: 5 }).temporaryEntries[0].value, 2);
    assert.deepEqual(buildRegimenEntitlement({ regimenName: 'Training Remote', tierFloor: 28, grantId: 'g', worldTime: 5 }).entitlement.talents, ['deflect']);
    assert.equal(buildRegimenEntitlement({ regimenName: "Vo'ren's Third Cadence", tierFloor: 28, grantId: 'g', worldTime: 5 }), null, 'Third Cadence DC23/28 give only the Redirect Shot bonus');
    const dc33 = buildRegimenEntitlement({ regimenName: "Vo’ren’s Third Cadence", tierFloor: 33, grantId: 'g', worldTime: 5 });
    assert.deepEqual([dc33.entitlement.noncounting, dc33.entitlement.offTurn, dc33.entitlement.talents], [true, true, ['block', 'deflect']]);
    assert.equal(buildRegimenEntitlement({ regimenName: 'Sparring Practice', tierFloor: 28, grantId: 'g', worldTime: null }), null, 'no world clock, no grant');
    assert.equal(buildRegimenEntitlement({ regimenName: 'Telekinetic Training', tierFloor: 28, grantId: 'g', worldTime: 5 }), null);
    check('printed DC tiers: Sparring/Remote 18/23/28, Third Cadence 33 only; lower tiers, unknown regimens and a missing clock grant nothing');
  }
  {
    reset(); setCombat();
    const e1 = await mint(); const e2 = await mint('melee', 22);
    // No entitlement: counted, round-capped.
    const r1 = await ActorEngine.spendForcePoints(defender, 1, spendCtx(e1, 'block'));
    assert.equal(r1.countsTowardRoundLimit, true);
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, spendCtx(e2, 'block')), /already been spent this round/);
    // Manual DC (no verified claim) is an ordinary counted spend and unlocks nothing.
    const manual = ForcePointsService.authorizeSpend(defender, { useKind: 'roll-bonus', rollDomain: 'skill.useTheForce', skillUseKey: 'block' });
    assert.equal(manual.valid, false, 'still capped');
    check('without a regimen a Block FP is an ordinary counted spend; a manual DC unlocks nothing');
  }
  {
    reset(); setCombat();
    assert.equal((await grant('Sparring Practice', 18)).granted, true);
    const e1 = await mint(); const e2 = await mint('melee', 22); const e3 = await mint('melee', 19);
    const a = await ActorEngine.spendForcePoints(defender, 1, spendCtx(e1, 'block'));
    assert.equal(a.countsTowardRoundLimit, false); assert.equal(a.entitlement.regimenKey, 'sparringpractice'); assert.equal(a.reactionEventId, e1.id);
    const b = await ActorEngine.spendForcePoints(defender, 1, spendCtx(e2, 'block'));
    assert.equal(b.countsTowardRoundLimit, false, 'a second, different attack can also use the non-counting spend');
    // A normal counted FP coexists in the same round, in either order.
    const counted = await ActorEngine.spendForcePoints(defender, 1, { useKind: 'roll-bonus', rollDomain: 'skill.acrobatics' });
    assert.equal(counted.countsTowardRoundLimit, true);
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, spendCtx(e3, 'block', { useTemporaryEntry: true })), /already been spent this round|No eligible regimen temporary/);
    const c = await ActorEngine.spendForcePoints(defender, 1, spendCtx(e3, 'block'));
    assert.equal(c.countsTowardRoundLimit, false, 'non-counting spends are still allowed after the round slot is used');
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, spendCtx(e1, 'block')), /already spent on this attack|already been used|reaction/i, 'one paid spend per attack event');
    check('Sparring DC18: non-counting Block spends coexist with a counted spend; one paid spend per attack event');
  }
  {
    reset(); setCombat();
    await grant('Sparring Practice', 28);
    const melee = await mint('melee'); const ranged = await mint('ranged', 30);
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(ranged, 'deflect')).countsTowardRoundLimit, true, 'Sparring Practice does nothing for Deflect');
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(melee, 'deflect')).valid, false, 'a melee attack cannot be deflected');
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(melee, 'block')).countsTowardRoundLimit, false);
    assert.equal(ForcePointsService.authorizeSpend(defender, { useKind: 'roll-bonus', rollDomain: 'skill.useTheForce', skillUseKey: 'block', reaction: { id: 'forged', attackerId: 'attacker' } }).valid, false, 'a forged claim refuses the spend');
    check('Sparring Practice is Block-only; forged and mismatched reaction claims are refused');
  }
  {
    reset(); setCombat();
    await grant('Training Remote', 18);
    const ranged = await mint('ranged', 27); const melee = await mint('melee');
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(ranged, 'deflect')).countsTowardRoundLimit, false);
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(melee, 'block')).countsTowardRoundLimit, true, 'Training Remote does nothing for Block');
    check('Training Remote is Deflect-only');
  }
  {
    reset(); setCombat(); activeActor = 'attacker'; // the defender is acting off turn
    await grant('Sparring Practice', 28);
    const e = await mint();
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(e, 'block')).valid, false, 'Sparring Practice does not permit off-turn spending');
    reset(); setCombat(); activeActor = 'attacker';
    await grant("Vo'ren's Third Cadence", 33);
    const m = await mint(); const r = await mint('ranged', 29);
    const blockOff = ForcePointsService.authorizeSpend(defender, spendCtx(m, 'block'));
    assert.deepEqual([blockOff.valid, blockOff.countsTowardRoundLimit], [true, false]);
    assert.deepEqual([ForcePointsService.authorizeSpend(defender, spendCtx(r, 'deflect')).valid], [true]);
    assert.equal(ForcePointsService.authorizeSpend(defender, { useKind: 'roll-bonus', rollDomain: 'skill.acrobatics' }).valid, false, 'the off-turn permission is not general');
    // A stored DC28 Cadence cannot be widened by editing the flag.
    defender.flags.swse.regimenEntitlement = { ...defender.flags.swse.regimenEntitlement, tierFloor: 28 };
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(m, 'block')).valid, false, 'tier is re-checked against the printed contract');
    activeActor = 'defender';
    check("Vo'ren's Third Cadence DC33: off-turn and non-counting for Block/Deflect only; Sparring Practice cannot go off turn; a hand-edited tier is rejected");
  }
  {
    reset(); setCombat();
    await grant('Sparring Practice', 23);
    const pool = () => defender.flags.swse.bonusForcePoints;
    assert.equal(pool().entries[0].value, 1);
    const e = await mint(); const e2 = await mint('melee', 21); const ranged = await mint('ranged', 33);
    // Unrelated rolls and the wrong talent cannot consume the temporary point.
    assert.equal(ForcePointsService.getBonusRemaining(defender, { rollDomain: 'skill.acrobatics' }), 0);
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(ranged, 'deflect', { useTemporaryEntry: true })).valid, false);
    assert.equal(ForcePointsService.authorizeSpend(defender, { useKind: 'roll-bonus', rollDomain: 'skill.acrobatics', useTemporaryEntry: true }).valid, false);
    const t = await ActorEngine.spendForcePoints(defender, 1, spendCtx(e, 'block', { useTemporaryEntry: true }));
    assert.equal(t.bonusEntriesSpent[0].source, 'Force Regimen: Sparring Practice');
    assert.equal(t.countsTowardRoundLimit, false, 'a temporary point on the qualifying check is non-counting (FP-RD-007 Option B)');
    assert.equal(defender.system.forcePoints.value, 6, 'the ordinary pool was not touched');
    const back = await ActorEngine.rollbackForcePointSpend(defender, t);
    assert.equal(back.rolledBack, true); assert.equal(pool().entries[0].value, 1, 'exact entry restored');
    // Expiry: 24h of campaign time after completion.
    globalThis.game.time.worldTime = 100000 + 24 * 3600;
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(e2, 'block', { useTemporaryEntry: true })).valid, false, 'expired entry');
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(e2, 'block')).countsTowardRoundLimit, true, 'expired entitlement no longer exempts the round limit');
    globalThis.game.time.worldTime = 100000;
    globalThis.game.time = undefined;
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(e2, 'block')).countsTowardRoundLimit, true, 'no world clock fails closed');
    globalThis.game.time = { worldTime: 100000 };
    check('temporary regimen points: Block-only, never for unrelated rolls, non-counting, exact rollback, 24h expiry, fail closed without a clock');
  }
  {
    // FP-RD-007: counted -> temporary and temporary -> counted coexist in one round; no double payment on one check.
    reset(); setCombat();
    await grant('Sparring Practice', 28);
    const a = await mint(); const b = await mint('melee', 21); const c = await mint('melee', 18); const d = await mint('melee', 17);
    const counted = await ActorEngine.spendForcePoints(defender, 1, { useKind: 'roll-bonus', rollDomain: 'skill.acrobatics' });
    assert.equal(counted.countsTowardRoundLimit, true);
    const t1 = await ActorEngine.spendForcePoints(defender, 1, spendCtx(a, 'block', { useTemporaryEntry: true }));
    assert.equal(t1.countsTowardRoundLimit, false, 'counted -> temporary');
    const t2 = await ActorEngine.spendForcePoints(defender, 1, spendCtx(b, 'block', { useTemporaryEntry: true }));
    assert.equal(t2.countsTowardRoundLimit, false, 'several distinct attacked events');
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, spendCtx(c, 'block', { useTemporaryEntry: true })), /No eligible regimen temporary/, 'DC28 grants exactly two');
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, spendCtx(a, 'block')), /already spent on this attack/, 'no second payment on one check');
    assert.equal(t1.bonusEntriesSpent[0].id, 'sparringpractice-100000-temp');
    // Temporary then counted (a new round, so the ordinary counted cap is fresh).
    const lateCounted = await ActorEngine.spendForcePoints(defender, 1, spendCtx(d, 'block'));
    assert.equal(lateCounted.countsTowardRoundLimit, false, 'an ordinary point on the qualifying check is also non-counting');
    await assert.rejects(() => ActorEngine.spendForcePoints(defender, 1, { useKind: 'roll-bonus', rollDomain: 'skill.stealth' }), /already been spent this round/, 'unrelated rolls still count');
    // Rollback keeps exact provenance.
    const back = await ActorEngine.rollbackForcePointSpend(defender, t2);
    assert.equal(back.rolledBack, true);
    const entry = defender.flags.swse.bonusForcePoints.entries.find(e => e.id === 'sparringpractice-100000-temp');
    assert.equal(entry.value, 1); assert.equal(entry.entitlement.grantId, 'sparringpractice-100000');
    // The other regimen's point cannot pay for the other talent.
    const ranged = await mint('ranged', 30);
    assert.equal(ForcePointsService.authorizeSpend(defender, spendCtx(ranged, 'deflect', { useTemporaryEntry: true })).valid, false);
    check('FP-RD-007: temporary points are non-counting on the qualifying check; counted<->temporary coexist; one payment per check; exact provenance on rollback');
  }
  {
    reset(); setCombat();
    assert.equal((await grant('Sparring Practice', 18)).granted, true);
    const second = await grant('Training Remote', 18, 100500);
    assert.equal(second.granted, false); assert.match(second.reason, /one Force regimen/);
    reset();
    await ActorEngine.recordRegimenFailure(defender, regimenKeyFor('Sparring Practice'), 100000);
    const built = buildRegimenEntitlement({ regimenName: 'Sparring Practice', tierFloor: 28, grantId: 'x', worldTime: 100100 });
    const refused = await ActorEngine.grantRegimenEntitlement(defender, built, { now: 100100, failedAt: defender.flags.swse.regimenFailures.sparringpractice });
    assert.equal(refused.granted, false); assert.match(refused.reason, /failed within/);
    const other = buildRegimenEntitlement({ regimenName: 'Training Remote', tierFloor: 18, grantId: 'y', worldTime: 100100 });
    assert.equal((await ActorEngine.grantRegimenEntitlement(defender, other, { now: 100100 })).granted, true, 'another known regimen can still be attempted');
    assert.equal((await ActorEngine.grantRegimenEntitlement(defender, built, { now: NaN })).granted, false);
    check('regimen lifecycle: one per 24h, failure blocks only that regimen, another may be attempted, no clock no grant');
  }
  {
    reset(); setCombat();
    // Core p.41: repeated Block/Deflect uses are not frequency-capped; two distinct attacks both reach the talent.
    const { ReactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js');
    const { LightsaberTalentActions } = await import('/systems/foundryvtt-swse/scripts/engine/talent/lightsaber-talent-actions.js');
    const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
    const savedB = LightsaberTalentActions.promptBlock; const savedD = LightsaberTalentActions.promptDeflect; const savedPost = SWSEChat.postHTML;
    SWSEChat.postHTML = async () => ({});
    defender.items = [{ id: 'b', type: 'talent', name: 'Block', system: {} }, { id: 'd', type: 'talent', name: 'Deflect', system: {} }];
    const calls = [];
    try {
      LightsaberTalentActions.promptBlock = async (a, o) => { calls.push(['block', o.attackEvent.id]); return { success: true }; };
      LightsaberTalentActions.promptDeflect = async (a, o) => { calls.push(['deflect', o.attackEvent.id]); return { success: true }; };
      const m1 = await mint('melee'); const m2 = await mint('melee', 20); const r1 = await mint('ranged', 24);
      for (const [key, e] of [['block', m1], ['block', m2], ['deflect', r1]]) {
        const res = await ReactionEngine.resolveReaction({ reactionKey: key, defender, attacker, attackContext: { attackerId: 'attacker', eventId: e.id } });
        assert.equal(res.success, true, `${key} on ${e.id}: ${JSON.stringify(res)}`);
      }
      assert.equal(calls.length, 3, 'three distinct attacks, three reactions in one round');
      const replay = await ReactionEngine.resolveReaction({ reactionKey: 'block', defender, attacker, attackContext: { attackerId: 'attacker', eventId: m1.id } });
      assert.equal(replay.success, false, 'the same attack cannot be answered twice');
      check('no per-round Block/Deflect frequency cap: distinct attacks all reach the talent; a replayed attack is rejected');
    } finally { LightsaberTalentActions.promptBlock = savedB; LightsaberTalentActions.promptDeflect = savedD; SWSEChat.postHTML = savedPost; }
  }
  {
    // The real regimen executor grants the entitlement at completion (and only at a qualifying tier).
    reset(); setCombat();
    const { ForceRegimenExecutor } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-regimen-executor.js');
    const savedEmbedded = ActorEngine.updateEmbeddedDocuments;
    ActorEngine.updateEmbeddedDocuments = async () => [];
    const regimen = { id: 'reg1', type: 'force-regimen', name: 'Sparring Practice', system: {} };
    defender.items = { get: (id) => (id === 'reg1' ? regimen : null), filter: () => [], find: () => null, [Symbol.iterator]: function* () { yield regimen; } };
    defender.system.activeEffects = [];
    try {
      const done = await ForceRegimenExecutor.useRegimen(defender, 'reg1', { resolvedTier: { dc: '23', floor: 23, effect: 'x' }, rollTotal: 24 });
      assert.equal(done.success, true);
      assert.equal(done.forcePointEntitlement.granted, true);
      assert.equal(done.forcePointEntitlement.temporaryGranted, 1);
      assert.equal(defender.flags.swse.regimenEntitlement.expiresWorldTime, 100000 + 86400);
      check('ForceRegimenExecutor.useRegimen records the typed entitlement and temporary point at completion');
    } finally { ActorEngine.updateEmbeddedDocuments = savedEmbedded; }
  }
  {
    // Context reaches the authorizer through the real paid-roll coordinator.
    reset(); setCombat();
    globalThis.Roll = globalThis.Roll ?? class { constructor(f) { this.formula = f; this.terms = []; } async evaluate() { this.total = 4; this.dice = [{ faces: 6, results: [{ result: 4, active: true }] }]; return this; } };
    const { ForcePointSpendCoordinator } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-point-spend-coordinator.js');
    await grant('Sparring Practice', 18);
    const e = await mint();
    const paid = await ForcePointSpendCoordinator.rollAndSpend(defender, { amount: 1, reason: 'block', domain: 'skill.useTheForce', context: { reactionEvent: { id: e.id, attackerId: 'attacker' }, skillUse: { key: 'block' } } });
    assert.equal(paid.success, true, JSON.stringify(paid));
    assert.equal(paid.spendReceipt.countsTowardRoundLimit, false);
    assert.equal(paid.spendReceipt.reactionEventId, e.id);
    const { readFileSync } = await import('node:fs');
    const sk = readFileSync(new URL('../scripts/rolls/skills.js', import.meta.url), 'utf8');
    assert.ok(/reactionEvent: options\?\.reactionEvent \?\? null/.test(sk), 'skill roll forwards the verified claim into the RollCore context');
    check('the paid-roll coordinator carries the reaction claim and skill-use key to the authorizer (non-counting receipt)');
  }
  {
    const { readFileSync } = await import('node:fs');
    const talents = readFileSync(new URL('../scripts/engine/talent/lightsaber-talent-actions.js', import.meta.url), 'utf8');
    const afterRoll = (name) => { const i = talents.indexOf(`static async prompt${name}(`); const seg = talents.slice(i, talents.indexOf('static async', i + 40)); return seg.indexOf('if (!roll) return null;') < seg.indexOf('_recordBlockDeflectUse'); };
    assert.ok(afterRoll('Block') && afterRoll('Deflect'), 'a cancelled check (no roll) never accrues the cumulative penalty');
    assert.equal((talents.match(/accruedPenalty\(state\)/g) ?? []).length >= 2 && (talents.match(/currentBlockDeflectState\(actor\)/g) ?? []).length >= 3, true, 'Block and Deflect share one cumulative state');
    const registry = readFileSync(new URL('../scripts/engine/combat/reactions/reaction-registry.js', import.meta.url), 'utf8');
    assert.ok(!/key: 'block'[\s\S]{0,900}perRound: true/.test(registry) && !/key: 'deflect'[\s\S]{0,1400}perRound: true/.test(registry));
    check('cumulative -5 is shared by Block and Deflect and accrues only after a roll; the registry carries no per-round cap');
  }
} finally {
  restore();
  delete globalThis.game.combat;
}
console.log(`Force V2 03B regimen entitlements: ${passed} assertion groups completed.`);
