// SWSE V2 addendum: rules-aware, GM-authoritative time (issue #1166, Class/Force integration).
// "The SWSE system tracks what the rules say about duration. The GM determines how game time passes."
// Pure/offline regression: real authorities, no timers. Not FOUNDRY_TESTED.
//
//   - combat-event durations expire only from verified combat events,
//   - measured durations read the CAMPAIGN clock (game.time.worldTime) that the GM advances, never wall-clock time,
//   - with no campaign clock nothing is granted and nothing silently expires,
//   - the trigger/outbox path contains no timer and never treats elapsed real time as game time.
// Historical-transaction behavior (valid spend stays valid after expiry; spend after expiry never qualifies; late delivery;
// reload; GM corrections that do not duplicate consumption) is exercised end to end in class-force-v2-temptation-trigger.test.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  temptationMarksActiveAt, expireTemptationEntries, hasCurrentCombat
} from '../scripts/engine/progression/utils/sith-lord-temptation-state.js';
import { serenityNatural20Eligible } from '../scripts/engine/progression/utils/serenity-state.js';
import {
  buildRegimenEntitlement, evaluateRegimenEntitlement, REGIMEN_DURATION_SECONDS, worldTimeNow
} from '../scripts/engine/force/regimen-entitlement.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0;
const ok = (label) => { n += 1; console.log(`  [${n}] ${label} OK`); };

// ---- fixtures -------------------------------------------------------------------------------------------------
const realNow = Date.now;
const withWallClockJump = (ms, fn) => { Date.now = () => realNow() + ms; try { return fn(); } finally { Date.now = realNow; } };
const DAYS = (d) => d * 24 * 60 * 60 * 1000;
const setClock = (t) => { globalThis.game = { ...(globalThis.game ?? {}), time: t === undefined ? undefined : { worldTime: t } }; };
const mark = (over = {}) => ({
  id: 'sith:enc1:2:5', sourceActorId: 'sith', sourceCombatantId: 'cb-sith', targetActorId: 'tgt',
  encounterId: 'enc1', createdRound: 2, createdTurn: 5, state: 'active', ...over
});
const target = (marks) => ({ id: 'tgt', flags: { swse: { classFeatures: { sithLord: { temptation: marks } } } } });
const combat = (over = {}) => ({ id: 'enc1', started: true, round: 2, turn: 1, combatant: { id: 'cb-x' }, ...over });

// ---- 1. wall-clock time never advances a game duration ---------------------------------------------------------
{
  const t = target([mark()]);
  const c = combat();
  const before = temptationMarksActiveAt(t, c).map((m) => m.id);
  const serenity = { flags: { swse: { classFeatures: { jediMaster: { serenity: { phase: 'prepared', encounterId: 'enc1', exitRound: 1, eligibleRound: 2, consumed: false } } } } } };
  const serBefore = serenityNatural20Eligible(serenity, { id: 'enc1', started: true, round: 2 }, 'combat.attack', '1d20 + 8');
  assert.equal(serBefore, true);
  setClock(1_000_000);
  const regimen = buildRegimenEntitlement({ regimenName: "Vo'ren's Third Cadence", tierFloor: 33, grantId: 'g1', worldTime: 1_000_000 });
  const stored = { flags: { swse: { regimenEntitlement: regimen.entitlement } } };
  assert.equal(evaluateRegimenEntitlement(stored, { talent: 'block' }).valid, true);

  withWallClockJump(DAYS(30), () => {
    assert.deepEqual(temptationMarksActiveAt(t, c).map((m) => m.id), before, 'a 30-day wall-clock jump leaves the mark window unchanged');
    assert.equal(expireTemptationEntries(t, c, {}).changed, false, 'no combat event => nothing expires, whatever the real time');
    assert.equal(serenityNatural20Eligible(serenity, { id: 'enc1', started: true, round: 2 }, 'combat.attack', '1d20 + 8'), serBefore, 'Serenity eligibility depends on the combat round only');
    assert.equal(evaluateRegimenEntitlement(stored, { talent: 'block' }).valid, true, 'a 24h campaign-clock effect does not end because real time passed');
  });
  ok('actual wall-clock time passing does not advance any game-time duration (marks, Serenity, regimen)');
}

// ---- 2. the GM advancing the campaign clock updates measured durations correctly ---------------------------------
{
  const t0 = 5_000_000;
  const e = buildRegimenEntitlement({ regimenName: 'Sparring Practice', tierFloor: 23, grantId: 'g2', worldTime: t0 });
  assert.equal(e.entitlement.expiresWorldTime, t0 + REGIMEN_DURATION_SECONDS, 'the printed 24 hours is recorded in canonical game-time units');
  const stored = { flags: { swse: { regimenEntitlement: e.entitlement } } };
  const at = (w) => evaluateRegimenEntitlement(stored, { talent: 'block', worldTime: w }).valid;
  assert.equal(at(t0), true, 'valid at completion');
  assert.equal(at(t0 + 3600), true, 'valid after the GM advances 1 hour');
  assert.equal(at(t0 + REGIMEN_DURATION_SECONDS - 1), true, 'valid one second before the printed duration ends');
  assert.equal(at(t0 + REGIMEN_DURATION_SECONDS), false, 'ends exactly when the GM-advanced clock reaches 24 hours');
  assert.equal(at(t0 + 5 * REGIMEN_DURATION_SECONDS), false, 'stays ended');
  ok("the GM advancing the campaign clock expires a measured 24-hour duration exactly at the printed boundary");

  // GM sets the clock BACK (a correction): an entitlement cannot be valid before it was earned, and nothing is granted twice.
  assert.equal(at(t0 - 1), false, 'a clock set before completion grants nothing');
  assert.equal(at(t0 + 10), true, 'moving the clock forward again restores the same single entitlement, not a new one');
  ok('a GM clock correction cannot widen or duplicate a duration');
}

// ---- 3. no campaign clock => nothing is granted and nothing is invented ----------------------------------------
{
  setClock(undefined);
  assert.equal(worldTimeNow(), null, 'no world clock is reported as null, never as wall-clock time');
  assert.equal(buildRegimenEntitlement({ regimenName: 'Sparring Practice', tierFloor: 23, grantId: 'g3', worldTime: null }), null, 'no clock => no entitlement is granted');
  const stored = { flags: { swse: { regimenEntitlement: { grantId: 'g', regimenKey: 'sparringpractice', tierFloor: 23, talents: ['block'], noncounting: true, offTurn: false, completedWorldTime: 100, expiresWorldTime: 100 + REGIMEN_DURATION_SECONDS } } } };
  withWallClockJump(DAYS(400), () => assert.equal(evaluateRegimenEntitlement(stored, { talent: 'block' }).valid, false, 'with no clock the entitlement is not honoured, and wall-clock time is not consulted'));
  ok('a missing campaign clock grants nothing and never falls back to real time');
}

// ---- 4. combat-turn progression expires the right combat-event durations -----------------------------------------
{
  const m = mark({ createdRound: 2, createdTurn: 5, sourceCombatantId: 'cb-sith' });
  const t = target([m]);
  // another combatant's turn does not end the mark
  assert.equal(expireTemptationEntries(t, combat({ round: 2, turn: 6, combatant: { id: 'cb-other' } }), { nextTurn: true }).changed, false, "another actor's turn does not end it");
  // the source's own next turn (a later round) ends it
  const ended = expireTemptationEntries(t, combat({ round: 3, turn: 5, combatant: { id: 'cb-sith' } }), { nextTurn: true });
  assert.equal(ended.changed, true);
  assert.equal(ended.entries[0].state, 'expired');
  // encounter end ends it
  assert.equal(expireTemptationEntries(t, combat({ round: 2 }), { encounterEnd: true }).entries[0].state, 'expired');
  // a mark from another encounter is stale
  assert.equal(expireTemptationEntries(target([mark({ encounterId: 'old' })]), combat(), {}).entries[0].state, 'expired');
  // expired marks never come back from a later combat event and never qualify a spend
  const gone = { ...t, flags: { swse: { classFeatures: { sithLord: { temptation: ended.entries } } } } };
  assert.equal(expireTemptationEntries(gone, combat({ round: 3, turn: 5, combatant: { id: 'cb-sith' } }), { nextTurn: true }).changed, false, 'expiry is idempotent');
  assert.deepEqual(temptationMarksActiveAt(gone, combat({ round: 3, turn: 1 })), [], 'an expired mark never qualifies a new spend');
  assert.equal(hasCurrentCombat(combat({ started: false })), false, 'no started combat => no combat-event expiry context');
  ok('combat turn/round/encounter events expire exactly the right marks; expiry is idempotent; expired marks never qualify new spends');
}

// ---- 5. structural guard: the trigger/outbox/duration path contains no timer and no wall-clock deadline -------------
{
  const engine = read('scripts/governance/actor-engine/actor-engine.js');
  const outbox = engine.slice(engine.indexOf('async finalizeForcePointSpend('), engine.indexOf('async applySecondWind('));
  const files = {
    'sith-lord-temptation-service.js': read('scripts/engine/combat/sith-lord-temptation-service.js'),
    'sith-lord-temptation-state.js': read('scripts/engine/progression/utils/sith-lord-temptation-state.js'),
    'serenity-state.js': read('scripts/engine/progression/utils/serenity-state.js'),
    'force-point-trigger-registry.js': read('scripts/engine/force/force-point-trigger-registry.js'),
    'regimen-entitlement.js': read('scripts/engine/force/regimen-entitlement.js'),
    'actor-engine outbox (Force + Destiny finalize/dispatch/ack)': outbox
  };
  for (const [name, src] of Object.entries(files)) {
    assert.doesNotMatch(src, /\bsetTimeout\s*\(|\bsetInterval\s*\(|performance\.now\s*\(/, `${name}: no timers`);
    // Date.now may only STAMP informational fields; it must never be compared with a deadline or used to decide expiry.
    const uses = [...src.matchAll(/[^\n]*Date\.now\(\)[^\n]*/g)].map((m) => m[0].trim());
    for (const line of uses) {
      assert.match(line, /(recordedAt|ackedAt|timestamp)\s*:|\?\?\s*String\(Date\.now\(\)\)/, `${name}: Date.now only stamps informational fields: ${line.slice(0, 90)}`);
      assert.doesNotMatch(line, /[<>]=?\s*Date\.now\(\)|Date\.now\(\)\s*[<>]=?|-\s*Date\.now\(\)|Date\.now\(\)\s*-/, `${name}: no wall-clock deadline comparison`);
    }
  }
  assert.doesNotMatch(files['actor-engine outbox (Force + Destiny finalize/dispatch/ack)'], /MAX_AGE|stale/i, 'no age-based trigger expiry remains');
  ok('the trigger/outbox/duration path has no timers and never compares real time with a deadline');
}

console.log(`v2-gm-authoritative-time: ${n} checks passed`);
