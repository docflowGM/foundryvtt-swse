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
let passed = 0;
const check = (name) => { passed += 1; console.log(`PASS ${passed}: ${name}`); };

const mk = (id, extra = {}) => { const a = makeActor({ normal: 3, max: 3 }); a.id = id; a.name = id; a.isOwner = true; a.setFlag = async () => {}; Object.assign(a, extra); return a; };
const attacker = mk('attacker'); const defender = mk('defender'); const bystander = mk('bystander');
globalThis.game.actors = { get: (id) => ({ attacker, defender, bystander }[id]) };
globalThis.game.user = { id: 'u-player', isGM: false };
globalThis.game.combat = { started: true, id: 'combat-B', round: 3, turn: 0, combatant: { actor: { id: 'attacker' } } };
const weapon = { id: 'w1', name: 'Vibroblade' };
const mint = (over = {}) => AttackEventAuthority.produce({ attacker, defender, weapon, attackType: 'melee', damageTypes: ['slashing'], attackTotal: 24, naturalD20: 14, hit: true, ...over });
const verify = (event, over = {}) => AttackEventAuthority.verify({ defender, attackerId: 'attacker', eventId: event.id, reactionKey: 'block', ...over });

try {
  {
    assert.equal(await AttackEventAuthority.produce({ attacker, defender, attackType: 'sideways', attackTotal: 10 }), null, 'unknown attack type mints nothing');
    assert.equal(await AttackEventAuthority.produce({ attacker, defender, attackType: 'melee', attackTotal: 'x' }), null, 'a non-numeric total mints nothing');
    const e = await mint();
    assert.equal(e.state, 'pending'); assert.equal(e.attackTotal, 24); assert.equal(e.round, 3);
    assert.equal(attacker.flags.swse.outgoingAttackEvents.events.length, 1);
    assert.equal(verify(e).valid, true);
    check('a real attack mints one pending event on the attacker; it verifies for its defender');
  }
  {
    const e = (await mint({ attackTotal: 18 }));
    assert.equal(AttackEventAuthority.verify({ defender, attackerId: 'attacker', eventId: 'atk-forged', reactionKey: 'block' }).valid, false, 'forged id');
    assert.equal(AttackEventAuthority.verify({ defender, attackerId: 'bystander', eventId: e.id, reactionKey: 'block' }).valid, false, 'wrong attacker lookup');
    assert.equal(AttackEventAuthority.verify({ defender: bystander, attackerId: 'attacker', eventId: e.id, reactionKey: 'block' }).valid, false, 'another defender cannot use it');
    assert.equal(verify(e, { eventId: undefined }).valid, false, 'missing event id');
    assert.equal(verify(e, { reactionKey: 'deflect' }).valid, false, 'melee attack cannot be deflected');
    const ranged = await mint({ attackType: 'ranged', attackTotal: 21 });
    assert.equal(verify(ranged, { reactionKey: 'block' }).valid, false, 'ranged attack cannot be blocked');
    assert.equal(verify(ranged, { reactionKey: 'deflect' }).valid, true);
    check('forged, wrong-attacker, other-defender, missing and melee/ranged mismatches are refused');
  }
  {
    const e = await mint({ attackTotal: 30 });
    defender.isOwner = false;
    assert.equal(verify(e).valid, false, 'non-owner player');
    globalThis.game.user = { id: 'gm', isGM: true };
    assert.equal(verify(e).valid, true, 'a GM may act for the defender');
    globalThis.game.user = { id: 'u-player', isGM: false }; defender.isOwner = true;
    const same = await mint({ attackTotal: 12 });
    assert.notEqual(same.id, e.id, 'two attacks at one defender are two independent events');
    check('non-owners are refused; two attacks at one defender stay independent');
  }
  {
    const e = await mint({ attackTotal: 26 });
    assert.deepEqual(await AttackEventAuthority.supersede(attacker, e.id, 'rerolled'), { updated: true });
    assert.match(verify(e).message, /superseded/);
    const c = await mint({ attackTotal: 27 });
    await AttackEventAuthority.supersede(attacker, c.id, 'cancelled');
    assert.match(verify(c).message, /cancelled/);
    assert.equal((await AttackEventAuthority.supersede(attacker, e.id)).updated, false, 'idempotent');
    check('reroll supersedes and cancellation cancels; stale buttons fail verification');
  }
  {
    const e = await mint({ attackTotal: 28 });
    assert.equal((await AttackEventAuthority.consume(defender, e.id)).consumed, true);
    assert.match(verify(e).message, /already consumed/);
    assert.equal((await AttackEventAuthority.consume(defender, e.id)).consumed, false, 'duplicate consume refused');
    await ActorEngine.releaseAttackEventAsDefender(defender, e.id);
    assert.equal(verify(e).valid, true, 'a reaction that did not happen leaves the attack answerable');
    globalThis.game.combat.round = 4;
    assert.match(verify(e).message, /expired/);
    globalThis.game.combat.round = 3;
    check('single-use claim, release on failure, expiry when the round passes');
  }
  {
    // Typed/manual DC never mints an event and never verifies.
    assert.equal(AttackEventAuthority.verify({ defender, attackerId: 'attacker', eventId: 'manual-dc-20', reactionKey: 'block' }).valid, false);
    check('a manually entered DC cannot become a verified event');
  }
  {
    // End-to-end through ReactionEngine.resolveReaction -> registry handler -> LightsaberTalentActions.
    const { ReactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js');
    const { LightsaberTalentActions } = await import('/systems/foundryvtt-swse/scripts/engine/talent/lightsaber-talent-actions.js');
    const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
    const savedPrompt = LightsaberTalentActions.promptBlock; const savedPost = SWSEChat.postHTML;
    SWSEChat.postHTML = async () => ({});
    const seen = [];
    defender.items = [{ id: 't-block', type: 'talent', name: 'Block', system: {} }];
    try {
      LightsaberTalentActions.promptBlock = async (actor, opts) => { seen.push(opts); return { success: true }; };
      const e = await mint({ attackTotal: 31 });
      const forged = await ReactionEngine.resolveReaction({ reactionKey: 'block', defender, attacker, attackContext: { attackerId: 'attacker', attackEventId: 'atk-nope', dc: 5, attackTotal: 5 } });
      assert.equal(forged.success, false, 'a forged event never reaches the talent action');
      assert.equal(seen.length, 0);
      const ok = await ReactionEngine.resolveReaction({ reactionKey: 'block', defender, attacker, attackContext: { attackerId: 'attacker', eventId: e.id, dc: 5, attackTotal: 5 } });
      assert.equal(ok.success, true, JSON.stringify(ok));
      assert.equal(seen.length, 1);
      assert.equal(seen[0].attackEvent.attackTotal, 31, 'the DC comes from the verified event, not the button (5)');
      const again = await ReactionEngine.resolveReaction({ reactionKey: 'block', defender, attacker, attackContext: { attackerId: 'attacker', eventId: e.id } });
      assert.equal(again.success, false, 'the same attack cannot be answered twice');
      assert.equal(seen.length, 1);
      // A cancelled reaction releases the event and is not recorded as a use.
      const e2 = await mint({ attackTotal: 17 });
      LightsaberTalentActions.promptBlock = async () => null;
      const cancelled = await ReactionEngine.resolveReaction({ reactionKey: 'block', defender, attacker, attackContext: { attackerId: 'attacker', eventId: e2.id } });
      assert.equal(cancelled.success, false, 'a reaction that was not rolled is not a success');
      assert.equal(verify(e2).valid, true, 'cancelled reaction leaves the attack answerable');
      // A client that does not control the defender cannot spend its reaction (stale/replayed chat button); a GM can.
      const e3 = await mint({ attackTotal: 22 });
      const wasGM = globalThis.game.user.isGM; const wasOwner = defender.isOwner;
      globalThis.game.user.isGM = false; defender.isOwner = false; seen.length = 0;
      LightsaberTalentActions.promptBlock = async (actor, opts) => { seen.push(opts); return { success: true }; };
      const denied = await ReactionEngine.resolveReaction({ reactionKey: 'block', defender, attacker, attackContext: { attackerId: 'attacker', eventId: e3.id } });
      globalThis.game.user.isGM = wasGM; defender.isOwner = wasOwner;
      assert.equal(denied.success, false); assert.match(denied.error, /cannot control the defender/); assert.equal(seen.length, 0, 'the handler never ran');
      assert.equal(verify(e3).valid, true, 'the attack stays answerable by its real owner');
      check('a non-owner, non-GM client cannot answer for the defender');
      check('ReactionEngine -> registry -> promptBlock: forged refused, DC from the event, single use, cancel releases');
    } finally { LightsaberTalentActions.promptBlock = savedPrompt; SWSEChat.postHTML = savedPost; }
  }
  {
    // Source checks: the real producer/consumer wiring exists and the competing debits are gone.
    const { readFileSync } = await import('node:fs');
    const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
    const attacks = read('scripts/combat/rolls/attacks.js');
    assert.ok((attacks.match(/await attachAttackEvent\(buildReactionContextForAttack/g) ?? []).length === 2, 'both attack paths mint events after the outcome is known');
    const engine = read('scripts/engine/combat/reactions/reaction-engine.js');
    assert.ok(!/'system\.forcePoints\.value'/.test(engine), 'ReactionEngine no longer writes the FP balance');
    assert.ok(/AttackEventAuthority\.verify\(/.test(engine) && /spendForcePoints\(defender/.test(engine));
    const registry = read('scripts/engine/combat/reactions/reaction-registry.js');
    assert.ok(!/system\.forcePoints\.value/.test(registry), 'registry has no direct FP write');
    assert.ok(/promptBlock\(context\.defender, \{ attackEvent: event \}\)/.test(registry) && /promptDeflect\(context\.defender, \{ attackEvent: event \}\)/.test(registry), 'block/deflect handlers reach the talent actions');
    const talents = read('scripts/engine/talent/lightsaber-talent-actions.js');
    assert.ok(/manualAttackDc: !attackEvent/.test(talents));
    check('source wiring: producer after outcome, verification in ReactionEngine, no competing FP debit, handlers reach promptBlock/promptDeflect');
  }
} finally {
  restore();
  delete globalThis.game.combat;
}
console.log(`Force V2 03B Block/Deflect events: ${passed} assertion groups completed.`);
