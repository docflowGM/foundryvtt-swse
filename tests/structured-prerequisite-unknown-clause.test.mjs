import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
for (const l of ['log', 'info', 'debug', 'warn']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DocumentSheetV2: class {} } };
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {}, __SWSE_CONTRACT_INITIALIZED__: false };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = globalThis.document ?? { readyState: 'complete', addEventListener() {}, removeEventListener() {}, activeElement: null };
globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('x'); } });
const { PrerequisiteChecker } = await import('/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js');
const actor = { id: 'a', type: 'character', system: { attributes: {}, skills: {}, abilities: {}, level: 1 }, items: [], flags: {} };

// PRQ contract: an unknown structured clause is never satisfied.
const unknown = PrerequisiteChecker._checkStructuredCondition({ type: 'someFutureCondition' }, actor, {});
assert.equal(unknown.met, false); assert.match(unknown.message, /could not be verified/);
const grouped = PrerequisiteChecker._evaluateStructuredPrerequisites([{ type: 'someFutureCondition' }], actor, {}, 'X');
assert.equal(grouped.met, false); assert.equal(grouped.missing.length, 1);

// Every condition type used by production feat/talent structures has a handler (so the stricter default changes no real record).
const types = new Set();
const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (typeof x.type === 'string') types.add(x.type); Object.values(x).forEach(walk); } };
for (const f of ['packs/feats.db', 'packs/talents.db']) for (const l of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) walk(JSON.parse(l).system?.prerequisitesStructured);
types.delete('all');
for (const type of types) {
  const r = PrerequisiteChecker._checkStructuredCondition({ type }, actor, {});
  assert.doesNotMatch(r.message ?? '', /unsupported condition type/, `production type "${type}" has a handler`);
}
process.stdout.write('structured-prerequisite-unknown-clause: ok\n');
