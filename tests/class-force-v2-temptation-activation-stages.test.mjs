// Slices 6AB/6AC/6AD re-derived: Temptation activation is two NON-nested stages (caster turn, then target turn), the exact combat turn
// is captured before any async step and re-verified before the mark is written, and expiry prefilters read-only then re-plans inside
// the lock. Source-order assertions (activation needs the full roll stack, which the offline shim does not run); the serializer and
// receipt behavior are exercised for real in class-force-v2-temptation-trigger (W10). Not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTemptationActorSerializer } from '../scripts/engine/progression/utils/temptation-actor-serializer.js';

const src = readFileSync(new URL('../scripts/engine/combat/sith-lord-temptation-service.js', import.meta.url), 'utf8');
const act = src.slice(src.indexOf('static async activate('), src.indexOf('static async consumeSpendReceipt('));
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };

{
  const s1 = act.indexOf('const stage1=await locked(sith'); const s2 = act.indexOf('return locked(target');
  assert.ok(s1 >= 0 && s2 > s1, 'two stages exist, caster first');
  const stage1Body = act.slice(s1, s2);
  assert.ok(!/locked\(target/.test(stage1Body), 'the caster stage never takes the target lock (no nesting)');
  assert.ok(/\}\);\s*\n\s*return locked\(target/.test(act), 'the caster stage has CLOSED before the target stage opens');
  assert.ok(!/locked\(sith/.test(act.slice(s2)), 'the target stage never takes the caster lock');
  ok('activation takes the caster turn and the target turn as two separate, non-nested stages');
}
{
  const snap = act.indexOf('const turnAtAction=turnSnapshot(combat)'); const pay = act.indexOf("ActionEconomyConsumption.spend(sith,'standard'");
  const roll = act.indexOf("rollSkill(sith,'persuasion'"); const verify = act.indexOf('sameTurn(stage1.turnAtAction,turnSnapshot(combat))');
  const plan = act.indexOf('planTemptationMark({'); const write = act.indexOf("applyMutationPlan(target");
  assert.ok(snap > 0 && snap < pay && pay < roll, 'the exact turn is captured before the action is paid and before the roll');
  assert.ok(roll < verify && verify < plan && plan < write, 'turn identity is re-verified after the roll and before the mark is planned and written');
  assert.match(act, /combat turn advanced during the Temptation roll/);
  ok('exact combat turn captured before async steps and re-verified before the mark is planned and written');
}
{
  const e = src.slice(src.indexOf('static async expireCombat('));
  const pre = e.indexOf('if(!expireTemptationEntries(target,combat,{encounterEnd,nextTurn}).changed)continue;');
  const lock = e.indexOf('await locked(target'); const inLock = e.indexOf('const plan=expireTemptationEntries', lock);
  assert.ok(pre > 0 && pre < lock && lock < inLock, 'read-only prefilter, then the authoritative plan inside the lock');
  ok('expiry: read-only prefilter skips unmarked actors; the authoritative plan is recomputed inside the actor turn');
}
{
  // the serializer itself: queued FIFO, a throwing job does not poison the next, no deadlock for crossed caster/target pairs
  const serialize = createTemptationActorSerializer(); const order = [];
  const a = serialize('x', async () => { order.push('a1'); await new Promise((r) => setTimeout(r, 5)); order.push('a2'); });
  const b = serialize('x', async () => { order.push('b'); });
  await Promise.all([a, b]); assert.deepEqual(order, ['a1', 'a2', 'b'], 'second work waits for the first');
  await assert.rejects(() => serialize('y', async () => { throw new Error('boom'); }), /boom/);
  assert.equal(await serialize('y', async () => 'next'), 'next', 'a rejected job does not poison later work');
  // A marks B while B marks A: with non-nested stages each lock is taken alone, so both complete
  const cross = await Promise.all([
    serialize('A', async () => 'A-caster').then(() => serialize('B', async () => 'B-target')),
    serialize('B', async () => 'B-caster').then(() => serialize('A', async () => 'A-target'))
  ]);
  assert.deepEqual(cross, ['B-target', 'A-target']); ok('serializer: FIFO, failure does not poison, crossed caster/target pairs cannot deadlock');
}
console.log(`class-force-v2-temptation-activation-stages: ${n} checks passed`);
