import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as markModule from '../scripts/engine/combat/class-assassin-mark.js';
import {
  markBonusFor, planMark, planTransfer, designateMark, transferMark, markDamageBonus, pruneMarks, MARK_FLAG_SCOPE, MARK_FLAG_KEY,
} from '../scripts/engine/combat/class-assassin-mark.js';
import {
  observedSkillRerolls, observedAttackBonus, observedReflexBonus, observedSkillBonus, planObservation, activateObservation,
  OBSERVATION_FLAG_SCOPE, OBSERVATION_FLAG_KEY,
} from '../scripts/engine/combat/class-target-observation.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const classes = read('packs/classes.db').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const byName = n => classes.find(c => c.name === n);

const SCORE = 'charlatan.score', MARK = 'assassin.mark';
const feat = key => ({ type: 'feat', name: key, system: { sourceType: 'class-feature', featureKey: key } });
const cls = (name, level) => ({ type: 'class', name, system: { level } });
function actor(id, { charlatan = 0, assassin = 0, keys = true, hp = 10, flags = {}, extra = [] } = {}) {
  const items = [];
  if (charlatan) { items.push(cls('Charlatan', charlatan)); if (keys) items.push(feat(SCORE)); }
  if (assassin) { items.push(cls('Assassin', assassin)); if (keys) items.push(feat(MARK)); }
  return { id, uuid: `Actor.${id}`, name: id, items: [...items, ...extra], system: { hp: { value: hp } }, flags: { [OBSERVATION_FLAG_SCOPE]: flags, [MARK_FLAG_SCOPE]: flags } };
}
function combat(id, actors, { round = 1, turn = 0, started = true } = {}) {
  const combatants = actors.map((a, i) => ({ id: `c${i}`, actor: a, initiative: 10 - i }));
  return { id, started, round, turn, combatants, turns: combatants, get combatant() { return combatants[this.turn]; } };
}
const engine = () => { const calls = []; return { calls,
  async updateActorFlags(a, scope, key, value) { calls.push(['set', a.id]); a.flags[scope] = { ...(a.flags[scope] || {}), [key]: structuredClone(value) }; },
  async unsetActorFlag(a, scope, key) { calls.push(['unset', a.id]); delete a.flags[scope]?.[key]; } }; };
const spender = (opts = {}) => { const log = []; const fn = async (a, type) => { log.push(type); return { allowed: opts.allowed !== false, committed: true, rollback: async () => true }; }; fn.log = log; return fn; };

// ---- class pack ------------------------------------------------------------
test('Assassin Mark and Charlatan Score carry stable class-qualified feature keys', () => {
  const mark = byName('Assassin').system.level_progression.flatMap(lp => (lp.features || []).filter(f => f.featureKey === MARK).map(f => [lp.level, f.value, f.type]));
  assert.deepEqual(mark, [[2, 1, 'scaling_feature'], [4, 2, 'scaling_feature'], [6, 3, 'scaling_feature'], [8, 4, 'scaling_feature'], [10, 5, 'scaling_feature']]);
  const score = byName('Charlatan').system.level_progression.flatMap(lp => (lp.features || []).filter(f => f.featureKey === SCORE).map(f => [lp.level, f.type]));
  assert.deepEqual(score, [[2, 'class_feature']]);
});

// ---- Score -----------------------------------------------------------------
const scoreRig = () => {
  const o = actor('o', { charlatan: 4 }); const t = actor('t'); const other = actor('other');
  return { o, t, other, c: combat('k', [o, t, other], { round: 1, turn: 0 }) };
};
test('Score has no acted gate: observing a target that has not acted is allowed', () => {
  const { o, t, c } = scoreRig();
  const plan = planObservation({ observer: o, featureKey: SCORE, target: t, combat: c, confirmed: true });
  assert.equal(plan.ok, true, plan.errors.join());
});
test('Score still needs its own turn, a confirmed target, an owned key and an encounter', () => {
  for (const mutate of [r => { r.c.turn = 1; }, r => { r.c.started = false; }, r => { r.o.items = r.o.items.filter(i => i.type === 'class'); }]) {
    const r = scoreRig(); mutate(r);
    assert.equal(planObservation({ observer: r.o, featureKey: SCORE, target: r.t, combat: r.c, confirmed: true }).ok, false);
  }
  const r = scoreRig();
  assert.equal(planObservation({ observer: r.o, featureKey: SCORE, target: r.t, combat: r.c, confirmed: false }).ok, false);
});
test('Score activation spends one full-round action then persists', async () => {
  const { o, t, c } = scoreRig(); const e = engine(); const spend = spender();
  await activateObservation({ observer: o, featureKey: SCORE, target: t, combat: c, confirmed: true, deps: { actorEngine: e, spend } });
  assert.deepEqual(spend.log, ['full-round']);
  assert.deepEqual(e.calls, [['set', 'o']]);
});
test('Score rerolls Deception against the observed target only, and grants no numeric bonus', async () => {
  const { o, t, other, c } = scoreRig();
  await activateObservation({ observer: o, featureKey: SCORE, target: t, combat: c, confirmed: true, deps: { actorEngine: engine(), spend: spender() } });
  assert.equal(observedSkillRerolls(o, 'deception', t, c), true);
  assert.equal(observedSkillRerolls(o, 'Deception', t, c), true);
  assert.equal(observedSkillRerolls(o, 'deception', other, c), false);
  for (const skill of ['persuasion', 'perception', 'stealth']) assert.equal(observedSkillRerolls(o, skill, t, c), false, skill);
  assert.equal(observedSkillBonus(o, 'deception', t, c), 0);
  assert.equal(observedAttackBonus(o, t, c), 0);
  assert.equal(observedReflexBonus(o, t, c), 0);
});
test('Score does not carry to another encounter, and is not impersonated by other classes', async () => {
  const { o, t, c } = scoreRig();
  await activateObservation({ observer: o, featureKey: SCORE, target: t, combat: c, confirmed: true, deps: { actorEngine: engine(), spend: spender() } });
  assert.equal(observedSkillRerolls(o, 'deception', t, { ...c, id: 'k2' }), false);
  const impostor = actor('imp', { extra: [feat(SCORE), cls('Soldier', 8)] });
  impostor.flags[OBSERVATION_FLAG_SCOPE][OBSERVATION_FLAG_KEY] = { k: [{ featureKey: SCORE, targetId: 'Actor.t' }] };
  assert.equal(observedSkillRerolls(impostor, 'deception', t, c), false, 'no Charlatan class level');
});

// ---- Mark ------------------------------------------------------------------
const markRig = (round = 1) => {
  const a = actor('a', { assassin: 6 }); const t = actor('t'); const t2 = actor('t2'); const bystander = actor('b');
  return { a, t, t2, bystander, c: combat('k', [a, t, t2, bystander], { round, turn: 0 }) };
};
test('Mark bonus is half Assassin level and needs the keyed Item and the Assassin class', () => {
  for (let l = 0; l <= 10; l++) assert.equal(markBonusFor(actor('x', { assassin: l })), Math.floor(l / 2));
  assert.equal(markBonusFor(actor('x', { assassin: 10, keys: false })), 0);
  assert.equal(markBonusFor(actor('x', { extra: [feat(MARK), cls('Soldier', 10)] })), 0);
});
test('designation: confirmed visible target at encounter start', () => {
  const { a, t, c } = markRig();
  assert.equal(planMark({ observer: a, target: t, combat: c, confirmedVisible: true }).ok, true);
});
test('designation refusals fail closed', () => {
  const cases = {
    unconfirmed: r => ({ ...r, confirmedVisible: false }),
    self: r => ({ ...r, target: r.observer }),
    noTarget: r => ({ ...r, target: null }),
    notStarted: r => { r.combat.started = false; return r; },
    targetNotInCombat: r => ({ ...r, target: actor('stranger') }),
    level1: r => { r.observer.items.find(i => i.type === 'class').system.level = 1; return r; },
    noKey: r => { r.observer.items = r.observer.items.filter(i => i.type === 'class'); return r; },
  };
  for (const [name, mutate] of Object.entries(cases)) {
    const { a, t, c } = markRig();
    assert.equal(planMark(mutate({ observer: a, target: t, combat: c, confirmedVisible: true })).ok, false, name);
  }
});
test('a late mark needs a GM; a player cannot choose after round 1', () => {
  const { a, t, c } = markRig(2);
  globalThis.game = { user: { isGM: false } };
  assert.equal(planMark({ observer: a, target: t, combat: c, confirmedVisible: true, gmAllowsLate: true }).ok, false);
  globalThis.game = { user: { isGM: true } };
  assert.equal(planMark({ observer: a, target: t, combat: c, confirmedVisible: true, gmAllowsLate: true }).ok, true);
  delete globalThis.game;
});
test('one mark per encounter: a second designation is refused, even after the first was lost', async () => {
  const { a, t, t2, c } = markRig(); const e = engine();
  await designateMark({ observer: a, target: t, combat: c, confirmedVisible: true, deps: { actorEngine: e } });
  assert.match(planMark({ observer: a, target: t2, combat: c, confirmedVisible: true }).errors.join(), /already chosen/);
  a.flags[MARK_FLAG_SCOPE][MARK_FLAG_KEY].k.lost = true;
  assert.equal(planMark({ observer: a, target: t2, combat: c, confirmedVisible: true }).ok, false);
});
test('damage bonus applies to the marked target only, within its encounter', async () => {
  const { a, t, t2, c } = markRig();
  await designateMark({ observer: a, target: t, combat: c, confirmedVisible: true, deps: { actorEngine: engine() } });
  assert.equal(markDamageBonus(a, t, c), 3);
  assert.equal(markDamageBonus(a, t2, c), 0);
  assert.equal(markDamageBonus(a, null, c), 0);
  assert.equal(markDamageBonus(a, t, { ...c, id: 'k2' }), 0);
  assert.equal(markDamageBonus(a, t, { ...c, started: false }), 0);
  assert.equal(markDamageBonus(t, a, c), 0, 'the mark gains nothing');
  const sameBase = { ...t, uuid: 'Scene.s.Token.z.Actor.t' };
  assert.equal(markDamageBonus(a, sameBase, c), 0, 'unlinked token identity is distinct');
});
test('bonus follows a lowered class level or lost feature at roll time; stored mark alone grants nothing', async () => {
  const { a, t, c } = markRig();
  await designateMark({ observer: a, target: t, combat: c, confirmedVisible: true, deps: { actorEngine: engine() } });
  a.items = a.items.filter(i => i.type !== 'feat');
  assert.equal(markDamageBonus(a, t, c), 0);
});
test('transfer: only after the mark drops to 0 HP (or a GM says so), free action, to a different visible target', async () => {
  const { a, t, t2, c } = markRig(); const e = engine();
  await designateMark({ observer: a, target: t, combat: c, confirmedVisible: true, deps: { actorEngine: e } });
  assert.match(planTransfer({ observer: a, newTarget: t2, combat: c, confirmedVisible: true }).errors.join(), /0 hit points/);
  t.system.hp.value = 0;
  assert.equal(planTransfer({ observer: a, newTarget: t2, combat: c, confirmedVisible: false }).ok, false);
  assert.equal(planTransfer({ observer: a, newTarget: t, combat: c, confirmedVisible: true }).ok, false, 'same target');
  const result = await transferMark({ observer: a, newTarget: t2, combat: c, confirmedVisible: true, deps: { actorEngine: e } });
  assert.equal(result.record.transferredFrom, 'Actor.t');
  assert.equal(markDamageBonus(a, t2, c), 3);
  assert.equal(markDamageBonus(a, t, c), 0, 'no bonus on the old mark');
});
test('transfer with no active mark, or a GM-confirmed downed mark', async () => {
  const { a, t, t2, c } = markRig();
  assert.match(planTransfer({ observer: a, newTarget: t2, combat: c, confirmedVisible: true }).errors.join(), /no active mark/);
  await designateMark({ observer: a, target: t, combat: c, confirmedVisible: true, deps: { actorEngine: engine() } });
  globalThis.game = { user: { isGM: false } };
  assert.equal(planTransfer({ observer: a, newTarget: t2, combat: c, confirmedVisible: true, gmConfirmedDown: true }).ok, false);
  globalThis.game = { user: { isGM: true } };
  assert.equal(planTransfer({ observer: a, newTarget: t2, combat: c, confirmedVisible: true, gmConfirmedDown: true }).ok, true);
  delete globalThis.game;
});
test('a failed write leaves no mark', async () => {
  const { a, t, c } = markRig();
  await assert.rejects(designateMark({ observer: a, target: t, combat: c, confirmedVisible: true, deps: { actorEngine: { async updateActorFlags() { throw new Error('boom'); } } } }), /boom/);
  assert.equal(markDamageBonus(a, t, c), 0);
});
test('encounter end prunes the mark', async () => {
  const { a, t, c } = markRig(); const e = engine();
  await designateMark({ observer: a, target: t, combat: c, confirmedVisible: true, deps: { actorEngine: e } });
  assert.equal(await pruneMarks(a, 'k', { actorEngine: e }), true);
  assert.equal(a.flags[MARK_FLAG_SCOPE][MARK_FLAG_KEY], undefined);
  assert.equal(await pruneMarks(a, 'k', { actorEngine: e }), false);
});
test('the swift sacrifice option is deliberately not implemented (blocked on a flat-footed hit-determination seam)', () => {
  assert.deepEqual(Object.keys(markModule).filter(k => /sacrific|flat/i.test(k)), []);
});

// ---- wiring (static evidence only) -----------------------------------------
test('rolls consume the Mark and Score authorities once each', () => {
  const math = read('scripts/engine/combat/combat-roll-math.js');
  assert.match(math, /assassinMark = markBonusFor\(actor\) > 0 \? markDamageBonus\(actor, getTargetActorFromOptions\(context\)\) : 0/);
  assert.equal((math.match(/\+ trustySidearm \+ assassinMark/g) || []).length, 1, 'inside the pre-critical flat total');
  assert.match(math, /components\['Mark'\] = assassinMark/);
  const skills = read('scripts/rolls/skills.js');
  assert.match(skills, /\(masterSaboteurDice \|\| observedScoreReroll\) \? '2d20kh1' : '1d20'/);
  assert.match(read('scripts/infrastructure/hooks/combat-hooks.js'), /pruneMarks\(actor, combat\.id\)/);
});
