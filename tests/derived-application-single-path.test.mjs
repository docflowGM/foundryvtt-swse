import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// DC-A07: one derived-result application routine. SWSEV2BaseActor._computeDerivedAsync (prepareDerivedData path) and ActorEngine._applyDerivedUpdates
// (recalcAll / progression path) must leave system.derived in the SAME state for the same computeAll() result, including when the destination holds
// stale keys from an earlier shape (previously the async path replaced whole fields, the engine path deep-merged and kept stale keys).
registerFoundryPathLoader();
installFoundryShimGlobals();
const { SWSEV2BaseActor } = await import(new URL('../scripts/actors/v2/base-actor.js', import.meta.url).href);
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);

const ab = (b) => ({ base: b, racial: 0, enhancement: 0, temp: 0 });
const mkSystem = (derived) => ({ attributes: { str: ab(10), dex: ab(14), con: ab(12), int: ab(10), wis: ab(10), cha: ab(10) }, level: 4, hp: { max: 30, value: 30 }, skills: {}, progression: {}, derived });
function mkActor(id, derived) {
  const a = Object.create(SWSEV2BaseActor.prototype);
  Object.assign(a, { id, name: id, type: 'character', _stats: { modifiedTime: 1000 }, items: [], effects: [], apps: {}, flags: { swse: {} } });
  a.system = mkSystem(derived);
  a.getFlag = () => undefined;
  return a;
}
const stale = () => ({ defenses: { fortitude: { total: 1, staleKey: 'old' } }, skills: { oldSkill: { total: 3 } }, obsolete: 7, meta: {} });
const result = {
  'system.derived.defenses': { fortitude: { total: 14 }, reflex: { total: 12 }, will: { total: 10 } },
  'system.derived.skills': { acrobatics: { total: 4 } },
  'system.derived.bab': 3,
};

const real = DerivedCalculator.computeAll;
try {
  DerivedCalculator.computeAll = async () => result;
  const a = mkActor('apply-async', stale());
  await a._computeDerivedAsync(a.system);
  const b = mkActor('apply-engine', stale());
  ActorEngine._applyDerivedUpdates(b, result, null);
  const strip = (d) => { const c = JSON.parse(JSON.stringify(d)); delete c.meta; return c; };
  assert.deepEqual(strip(a.system.derived), strip(b.system.derived), 'both application paths leave identical derived state');
  assert.equal(a.system.derived.defenses.fortitude.staleKey, undefined, 'no stale key survives a recompute');
  assert.deepEqual(Object.keys(a.system.derived.skills), ['acrobatics'], 'skills stay an engine-owned object map holding only the new result');
  assert.equal(a.system.derived.bab, 3);
} finally { DerivedCalculator.computeAll = real; }

// one shared routine
const base = fs.readFileSync('scripts/actors/v2/base-actor.js', 'utf8');
const rec = fs.readFileSync('scripts/governance/actor-engine/derived-recalc.js', 'utf8');
assert.match(base, /applyDerivedSnapshot\(/); assert.match(rec, /applyDerivedSnapshot\(/);
console.log('derived-application-single-path: ok');
