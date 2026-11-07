import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyClassPackProtectedState } from '../tools/lib/class-pack-protected-guard.mjs';
import { planScalingClassFeatureUpdate } from '../scripts/engine/progression/utils/class-scaling-feature-upsert.js';
import {
  observationBonusFor, observedAttackBonus, observedReflexBonus, observedSkillBonus,
  targetHasActed, planObservation, activateObservation, pruneObservations, activeObservations,
  OBSERVATION_FLAG_SCOPE, OBSERVATION_FLAG_KEY,
} from '../scripts/engine/combat/class-target-observation.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const classes = read('packs/classes.db').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const byName = name => classes.find(c => c.name === name);

const FF = 'bountyHunter.familiarFoe';
const TS = 'enforcer.targetedSuspect';

// ---- fakes ----------------------------------------------------------------
const featureItem = key => ({ type: 'feat', name: key, system: { sourceType: 'class-feature', featureKey: key } });
const classItem = (name, level) => ({ type: 'class', name, system: { level } });
function makeActor(id, { bh = 0, enf = 0, extra = [], keys = true, flags = {} } = {}) {
  const items = [];
  if (bh) { items.push(classItem('Bounty Hunter', bh)); if (keys) items.push(featureItem(FF)); }
  if (enf) { items.push(classItem('Enforcer', enf)); if (keys) items.push(featureItem(TS)); }
  items.push(...extra);
  return { id, uuid: `Actor.${id}`, name: id, items, flags: { [OBSERVATION_FLAG_SCOPE]: flags } };
}
function makeCombat(id, actors, { round = 2, turn = 0, started = true, initiative = {} } = {}) {
  const combatants = actors.map((a, i) => ({ id: `c${i}`, actor: a, initiative: a.id in initiative ? initiative[a.id] : 10 - i }));
  return { id, started, round, turn, combatants, turns: combatants, get combatant() { return combatants[this.turn]; } };
}
function fakeEngine() {
  const calls = [];
  return {
    calls,
    async updateActorFlags(actor, scope, key, value) { calls.push(['set', actor.id]); actor.flags[scope] = { ...(actor.flags[scope] || {}), [key]: structuredClone(value) }; },
    async unsetActorFlag(actor, scope, key) { calls.push(['unset', actor.id]); delete actor.flags[scope]?.[key]; },
  };
}
const spender = ({ allowed = true, noOp = false, committed = true, refund = true } = {}) => {
  const log = { spent: [], rolledBack: 0 };
  const fn = async (actor, type, meta) => {
    log.spent.push({ actor: actor.id, type, meta });
    return { allowed, noOp, committed, rollback: async () => { log.rolledBack += 1; return refund; } };
  };
  fn.log = log;
  return fn;
};

// ---- 1. class pack identity -------------------------------------------------
test('Bounty Hunter and Enforcer grant keyed scaling entries at levels 2,4,6,8,10 only', () => {
  for (const [name, key, label] of [['Bounty Hunter', FF, 'Familiar Foe'], ['Enforcer', TS, 'Targeted Suspect']]) {
    const keyed = byName(name).system.level_progression.flatMap(lp => (lp.features || [])
      .filter(f => f.featureKey === key).map(f => ({ level: lp.level, f })));
    assert.deepEqual(keyed.map(k => k.level), [2, 4, 6, 8, 10]);
    for (const { level, f } of keyed) {
      assert.equal(f.type, 'scaling_feature');
      assert.equal(f.value, level / 2);
      assert.equal(f.name, `${label} +${level / 2}`);
    }
  }
});
test('feature keys are class-qualified and unique across the whole class pack', () => {
  const seen = new Map();
  for (const c of classes) for (const lp of c.system.level_progression) for (const f of lp.features || []) {
    if (!f.featureKey) continue;
    const owner = seen.get(f.featureKey);
    assert.ok(!owner || owner === c.name, `${f.featureKey} used by ${owner} and ${c.name}`);
    seen.set(f.featureKey, c.name);
  }
  assert.equal(seen.get(FF), 'Bounty Hunter');
  assert.equal(seen.get(TS), 'Enforcer');
});
test('protected class baseline still accepts the pack', () => {
  assert.equal(verifyClassPackProtectedState(root).ok, true);
});

// ---- 2. grant / scaling upsert (mirrors the manifest feature shape) ---------
const grant = (key, level, label) => ({
  name: `${label} +${level / 2}`, type: 'feat', classLevel: level,
  system: { featureKey: key, value: level / 2, progressionFeatureType: 'scaling_feature', grantedClassLevel: level, unit: 'bonus' },
});
test('first grant creates nothing to upsert; later levels update the single keyed Item', () => {
  assert.equal(planScalingClassFeatureUpdate([], grant(FF, 2, 'Familiar Foe')), null);
  const owned = [{ _id: 'a', type: 'feat', name: 'Familiar Foe +1', system: { sourceType: 'class-feature', featureKey: FF, value: 1, grantedClassLevel: 2 } }];
  const plan = planScalingClassFeatureUpdate(owned, grant(FF, 4, 'Familiar Foe'));
  assert.equal(plan.update['system.value'], 2);
  assert.equal(plan.update._id, 'a');
  assert.equal(plan.update['system.featureKey'], FF);
});
test('duplicates and regressions are refused; same-named talent and other-class keys are untouched', () => {
  const dup = [1, 2].map(i => ({ _id: `d${i}`, type: 'feat', system: { sourceType: 'class-feature', featureKey: FF, value: 1, grantedClassLevel: 2 } }));
  assert.throws(() => planScalingClassFeatureUpdate(dup, grant(FF, 4, 'Familiar Foe')), /Duplicate/);
  const high = [{ _id: 'h', type: 'feat', system: { sourceType: 'class-feature', featureKey: FF, value: 3, grantedClassLevel: 6 } }];
  assert.throws(() => planScalingClassFeatureUpdate(high, grant(FF, 4, 'Familiar Foe')), /regress/);
  const talent = [{ _id: 't', type: 'feat', name: 'Familiar Foe', system: { sourceType: 'talent' } },
    { _id: 'e', type: 'feat', system: { sourceType: 'class-feature', featureKey: TS, value: 1, grantedClassLevel: 2 } }];
  assert.equal(planScalingClassFeatureUpdate(talent, grant(FF, 2, 'Familiar Foe')), null);
});

// ---- 3. bonus scaling and ownership ----------------------------------------
test('half class level rounded down at every level; zero at level 1', () => {
  for (let level = 0; level <= 10; level++) {
    assert.equal(observationBonusFor(makeActor('a', { bh: level }), FF), Math.floor(level / 2));
    assert.equal(observationBonusFor(makeActor('b', { enf: level }), TS), Math.floor(level / 2));
  }
});
test('name-only Items, impostor class Items and unrelated class levels grant nothing', () => {
  assert.equal(observationBonusFor(makeActor('a', { bh: 10, keys: false }), FF), 0);
  const impostor = makeActor('b', { extra: [featureItem(FF), { type: 'feat', name: 'Bounty Hunter', system: { level: 10 } }] });
  assert.equal(observationBonusFor(impostor, FF), 0);
  const wrongClass = makeActor('c', { enf: 10, extra: [featureItem(FF)] });
  assert.equal(observationBonusFor(wrongClass, FF), 0);
  const twoClassItems = makeActor('d', { bh: 6, extra: [classItem('Bounty Hunter', 4)] });
  assert.equal(observationBonusFor(twoClassItems, FF), 0);
  const dupKey = makeActor('e', { bh: 6, extra: [featureItem(FF)] });
  assert.equal(observationBonusFor(dupKey, FF), 0);
});
test('multiclass isolation: each feature scales only from its own class', () => {
  const both = makeActor('m', { bh: 6, enf: 4 });
  assert.equal(observationBonusFor(both, FF), 3);
  assert.equal(observationBonusFor(both, TS), 2);
});

// ---- 4. acted gate ----------------------------------------------------------
test('target-has-acted: round 1 uses initiative order, later rounds count everyone', () => {
  const o = makeActor('o', { bh: 4 }); const t = makeActor('t'); const late = makeActor('late');
  const r1 = makeCombat('k', [t, o, late], { round: 1, turn: 1 });
  assert.equal(targetHasActed(r1, t), true);
  assert.equal(targetHasActed(r1, late), false);
  assert.equal(targetHasActed(makeCombat('k', [o, t], { round: 1, turn: 0 }), t), false);
  assert.equal(targetHasActed(makeCombat('k', [o, t], { round: 2, turn: 0 }), t), true);
  assert.equal(targetHasActed(makeCombat('k', [o, t], { round: 2, turn: 0, initiative: { t: null } }), t), false);
  assert.equal(targetHasActed(makeCombat('k', [o, t], { round: 1, turn: 0 }), makeActor('ghost')), false);
});
test('a GM may state the target has acted; a player may not', () => {
  const o = makeActor('o', { bh: 4 }); const t = makeActor('t');
  const c = makeCombat('k', [o, t], { round: 1, turn: 0 });
  globalThis.game = { user: { isGM: false } };
  assert.equal(targetHasActed(c, t, { gmConfirmedActed: true }), false);
  globalThis.game = { user: { isGM: true } };
  assert.equal(targetHasActed(c, t, { gmConfirmedActed: true }), true);
  delete globalThis.game;
});

// ---- 5. planning (fail closed) ---------------------------------------------
const okArgs = () => {
  const o = makeActor('o', { bh: 6 }); const t = makeActor('t');
  const combat = makeCombat('k', [o, t], { round: 2, turn: 0 });
  return { observer: o, featureKey: FF, target: t, combat, confirmed: true };
};
test('a complete request plans one record', () => {
  const plan = planObservation(okArgs());
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.record, { featureKey: FF, targetId: 'Actor.t', targetName: 't', round: 2 });
});
test('every missing prerequisite refuses', () => {
  const cases = {
    unconfirmed: a => { a.confirmed = false; },
    noTarget: a => { a.target = null; },
    self: a => { a.target = a.observer; },
    notStarted: a => { a.combat.started = false; },
    notOwnTurn: a => { a.combat.turn = 1; },
    notActed: a => { a.combat.round = 1; },
    levelOne: a => { a.observer.items.find(i => i.type === 'class').system.level = 1; },
    unknownFeature: a => { a.featureKey = 'bountyHunter.nope'; },
    targetNotInCombat: a => { a.target = makeActor('stranger'); },
    noKey: a => { a.observer.items = a.observer.items.filter(i => i.type === 'class'); },
  };
  for (const [name, mutate] of Object.entries(cases)) {
    const args = okArgs(); mutate(args);
    assert.equal(planObservation(args).ok, false, name);
  }
});
test('repeat activation on the same target is refused; a different target is allowed', () => {
  const args = okArgs();
  const t2 = makeActor('t2');
  args.combat = makeCombat('k', [args.observer, args.target, t2], { round: 2, turn: 0 });
  args.observer.flags[OBSERVATION_FLAG_SCOPE][OBSERVATION_FLAG_KEY] = { k: [{ featureKey: FF, targetId: 'Actor.t', targetName: 't', round: 2 }] };
  assert.match(planObservation(args).errors.join(), /already active/);
  assert.equal(planObservation({ ...args, target: t2 }).ok, true);
});

// ---- 6. activation: order, rollback, persistence ----------------------------
test('activation spends one full-round action, then persists through ActorEngine', async () => {
  const args = okArgs(); const engine = fakeEngine(); const spend = spender();
  const result = await activateObservation({ ...args, deps: { actorEngine: engine, spend } });
  assert.equal(result.success, true);
  assert.deepEqual(spend.log.spent.map(s => s.type), ['full-round']);
  assert.deepEqual(engine.calls, [['set', 'o']]);
  assert.equal(activeObservations(args.observer, 'k').length, 1);
});
test('a refused or no-op action writes nothing', async () => {
  for (const opts of [{ allowed: false, committed: false }, { noOp: true, committed: false }]) {
    const args = okArgs(); const engine = fakeEngine();
    await assert.rejects(activateObservation({ ...args, deps: { actorEngine: engine, spend: spender(opts) } }), /could not be spent/);
    assert.equal(engine.calls.length, 0);
    assert.equal(activeObservations(args.observer, 'k').length, 0);
  }
});
test('a failed persist refunds the action and records nothing', async () => {
  const args = okArgs(); const spend = spender();
  const engine = { async updateActorFlags() { throw new Error('boom'); } };
  await assert.rejects(activateObservation({ ...args, deps: { actorEngine: engine, spend } }), /could not be recorded: boom/);
  assert.equal(spend.log.rolledBack, 1);
  assert.equal(activeObservations(args.observer, 'k').length, 0);
});
test('an un-refundable failed persist is reported for GM review', async () => {
  const args = okArgs();
  const engine = { async updateActorFlags() { throw new Error('boom'); } };
  await assert.rejects(activateObservation({ ...args, deps: { actorEngine: engine, spend: spender({ refund: false }) } }), /NOT refunded/);
});
test('repeated activation spends once; invalid requests never spend', async () => {
  const args = okArgs(); const engine = fakeEngine(); const spend = spender();
  await activateObservation({ ...args, deps: { actorEngine: engine, spend } });
  await assert.rejects(activateObservation({ ...args, deps: { actorEngine: engine, spend } }), /already active/);
  assert.equal(spend.log.spent.length, 1);
  const bad = okArgs(); bad.confirmed = false;
  const spend2 = spender();
  await assert.rejects(activateObservation({ ...bad, deps: { actorEngine: engine, spend: spend2 } }));
  assert.equal(spend2.log.spent.length, 0);
});
test('concurrent activation for one observer is serialized', async () => {
  const args = okArgs(); const engine = fakeEngine();
  let release; const gate = new Promise(r => { release = r; });
  const slow = async (...a) => { await gate; return spender()(...a); };
  const first = activateObservation({ ...args, deps: { actorEngine: engine, spend: slow } });
  await new Promise(r => setTimeout(r, 0));
  await assert.rejects(activateObservation({ ...args, deps: { actorEngine: engine, spend: spender() } }), /already being activated/);
  release(); await first;
});

// ---- 7. effect contracts and isolation --------------------------------------
function observed(featureKey, bh, enf) {
  const o = makeActor('o', { bh, enf }); const t = makeActor('t'); const other = makeActor('other');
  o.flags[OBSERVATION_FLAG_SCOPE][OBSERVATION_FLAG_KEY] = { k: [{ featureKey, targetId: 'Actor.t', targetName: 't', round: 2 }] };
  return { o, t, other, combat: makeCombat('k', [o, t, other]) };
}
test('Familiar Foe: attack bonus against the target, Reflex against the target\'s attacks, nothing for others', () => {
  const { o, t, other, combat } = observed(FF, 6, 0);
  assert.equal(observedAttackBonus(o, t, combat), 3);
  assert.equal(observedAttackBonus(o, other, combat), 0);
  assert.equal(observedReflexBonus(o, t, combat), 3);
  assert.equal(observedReflexBonus(o, other, combat), 0);
  assert.equal(observedReflexBonus(t, o, combat), 0, 'the opponent gains nothing');
  assert.equal(observedSkillBonus(o, 'deception', t, combat), 0, 'Familiar Foe has no skill bonus');
});
test('Targeted Suspect: attack and Deception/Perception/Persuasion only, no Reflex', () => {
  const { o, t, other, combat } = observed(TS, 0, 8);
  assert.equal(observedAttackBonus(o, t, combat), 4);
  assert.equal(observedReflexBonus(o, t, combat), 0);
  for (const skill of ['deception', 'perception', 'persuasion', 'Deception']) assert.equal(observedSkillBonus(o, skill, t, combat), 4);
  for (const skill of ['stealth', 'initiative', 'gatherInformation']) assert.equal(observedSkillBonus(o, skill, t, combat), 0);
  assert.equal(observedSkillBonus(o, 'deception', other, combat), 0);
});
test('records for another or ended encounter never apply', () => {
  const { o, t, combat } = observed(FF, 6, 0);
  assert.equal(observedAttackBonus(o, t, { ...combat, id: 'k2' }), 0);
  assert.equal(observedAttackBonus(o, t, { ...combat, started: false }), 0);
  assert.equal(observedAttackBonus(o, t, null), 0);
});
test('a lost class level or lost feature item removes the bonus at roll time', () => {
  const { o, t, combat } = observed(FF, 6, 0);
  o.items = o.items.filter(i => i.type !== 'feat');
  assert.equal(observedAttackBonus(o, t, combat), 0);
});
test('deleted or replaced targets do not match; unlinked token actors are distinct identities', () => {
  const { o, t, combat } = observed(FF, 6, 0);
  const sameBaseDifferentToken = { ...t, uuid: 'Scene.s.Token.x.Actor.t' };
  assert.equal(observedAttackBonus(o, sameBaseDifferentToken, combat), 0);
  assert.equal(observedAttackBonus(o, null, combat), 0);
});
test('two observers on one target are independent; both features on one actor sum', () => {
  const a = observed(FF, 4, 0); const b = observed(FF, 10, 0);
  assert.equal(observedAttackBonus(a.o, a.t, a.combat), 2);
  assert.equal(observedAttackBonus(b.o, b.t, b.combat), 5);
  const o = makeActor('o', { bh: 6, enf: 4 }); const t = makeActor('t');
  o.flags[OBSERVATION_FLAG_SCOPE][OBSERVATION_FLAG_KEY] = { k: [
    { featureKey: FF, targetId: 'Actor.t', targetName: 't', round: 2 }, { featureKey: TS, targetId: 'Actor.t', targetName: 't', round: 2 }] };
  assert.equal(observedAttackBonus(o, t, makeCombat('k', [o, t])), 5);
});

// ---- 8. cleanup ------------------------------------------------------------
test('encounter end prunes only that combat; empty stores are unset', async () => {
  const engine = fakeEngine();
  const o = makeActor('o', { bh: 6, flags: { [OBSERVATION_FLAG_KEY]: { k: [{ featureKey: FF, targetId: 'x' }], k2: [{ featureKey: FF, targetId: 'y' }] } } });
  assert.equal(await pruneObservations(o, 'k', { actorEngine: engine }), true);
  assert.deepEqual(Object.keys(o.flags[OBSERVATION_FLAG_SCOPE][OBSERVATION_FLAG_KEY]), ['k2']);
  assert.equal(await pruneObservations(o, 'k2', { actorEngine: engine }), true);
  assert.equal(o.flags[OBSERVATION_FLAG_SCOPE][OBSERVATION_FLAG_KEY], undefined);
  assert.equal(await pruneObservations(o, 'k2', { actorEngine: engine }), false);
});

// ---- 9. wiring (static evidence; not behavioural) ---------------------------
test('rolls and hooks consume the observation authority exactly once each', () => {
  const attacks = read('scripts/combat/rolls/attacks.js');
  assert.match(attacks, /observedTargetBonus = isVehicleAttack \? 0 : observedAttackBonus\(actor, getTargetActorFromOptions\(rollOptions\)\)/);
  assert.equal((attacks.match(/\+ sequencePenalty \+ observedTargetBonus/g) || []).length, 1);
  assert.match(attacks, /buildInvocationLedgerEntry\('observed-target'/);
  assert.match(attacks, /observedReflexBonus\(actor, options\.attackerActor/);
  assert.match(attacks, /observedReflexBonus\(target, options\.attackerActor/);
  assert.match(attacks, /resolveTargetContext\(\{ \.\.\.targetContextOptions, attackerActor: actor \}/);
  const skills = read('scripts/rolls/skills.js');
  assert.match(skills, /options\?\.observedSuspect === true/);
  assert.equal((skills.match(/shaperLore \+ observedSuspect/g) || []).length, 1);
  assert.match(read('scripts/infrastructure/hooks/combat-hooks.js'), /pruneObservations\(actor, combat\.id\)/);
  assert.doesNotMatch(read('scripts/engine/combat/class-target-observation.js'), /system\.defenses|system\.derived|system\.skills/);
});
