import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
const say = console.log.bind(console);
for (const l of ['log', 'info', 'debug', 'warn']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = v => JSON.parse(JSON.stringify(v)); globalThis.foundry.utils.duplicate = globalThis.foundry.utils.deepClone;
globalThis.foundry.applications = { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DocumentSheetV2: class {} } };
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {}, __SWSE_CONTRACT_INITIALIZED__: false };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = globalThis.document ?? { readyState: 'complete', addEventListener() {}, removeEventListener() {}, activeElement: null };
globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('x'); } });
const { PrerequisiteChecker } = await import('/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js');

const { installCanonicalPrerequisiteIndex, clearCanonicalPrerequisiteIndex, compiledPrerequisiteEntryFor } = await import('/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/canonical-prerequisite-index.js');

// PRQ.1D: a COMPILED canonical-index entry is evaluated from its STRUCTURE (never by re-parsing prose); everything else keeps the previous behavior.
const indexJson = JSON.parse(fs.readFileSync('data/generated/canonical-prerequisite-index.json', 'utf8'));
const idx = indexJson.entries;
const feats = fs.readFileSync('packs/feats.db', 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const talents = fs.readFileSync('packs/talents.db', 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const byUuid = (u) => { const m = /\.(feats|talents)\.Item\.(.+)$/.exec(u); return (m[1] === 'feats' ? feats : talents).find((r) => r._id === m[2]); };
let seq = 0;
const embedded = (rec, uuid, type) => ({ ...JSON.parse(JSON.stringify(rec)), type, _id: `E${++seq}`, id: `E${seq}`, flags: { ...(rec.flags ?? {}), core: { sourceId: uuid } } });
const leafItems = (c) => (c.type === 'feat' || c.type === 'talent') ? [embedded(byUuid(c.uuid), c.uuid, c.type)] : [];
function actorSatisfying(conditions) {
  const sys = { attributes: {}, skills: {}, abilities: {}, bab: 0, level: 20, species: '' }; const items = [];
  for (const c of conditions) {
    if (c.type === 'attribute') sys.attributes[c.ability] = { base: Math.max(c.min, 10) + 4 };
    if (c.type === 'bab') sys.bab = Math.max(sys.bab, c.min);
    if (c.type === 'skillTrained') { const k = PrerequisiteChecker._resolveSkillKeyOrId(c.skill); if (k) sys.skills[k] = { trained: true }; }
    if (c.type === 'species') { sys.species = c.species[0]; items.push({ type: 'species', name: c.species[0], system: {} }); }
    items.push(...leafItems(c));
  }
  return { id: 'a', type: 'character', system: sys, items, flags: {} };
}
const EMPTY = () => ({ id: 'e', type: 'character', system: { attributes: {}, skills: {}, abilities: {}, level: 1 }, items: [], flags: {} });
const itemOf = (uuid, extra = {}) => ({ ...JSON.parse(JSON.stringify(byUuid(uuid))), uuid, flags: { core: { sourceId: uuid } }, ...extra });
const check = (domain, item, actor) => (domain === 'feat' ? PrerequisiteChecker.checkFeatPrerequisites(actor, item, {}) : PrerequisiteChecker.checkTalentPrerequisites(actor, item, {}));

const { ActorPrerequisiteSnapshot } = await import('/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/actor-prerequisite-snapshot.js');
const { PrerequisiteEvaluator } = await import('/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/prerequisite-evaluator.js');
installCanonicalPrerequisiteIndex(indexJson);
const toReq = (c) => {
  switch (c.type) {
    case 'skillTrained': { const k = PrerequisiteChecker._resolveSkillKeyOrId(c.skill); return { type: 'skill', key: k, name: k, trained: true }; }
    case 'attribute': return { type: 'ability', ability: c.ability, min: c.min };
    case 'bab': return { type: 'bab', min: c.min };
    case 'species': return { type: 'species', name: c.species[0] };
    case 'feat': return { type: 'feat', name: c.name, uuid: c.uuid };
    case 'talent': return { type: 'talent', name: c.name, uuid: c.uuid };
  }
};
const evalVia = (actor, conds) => { const snap = ActorPrerequisiteSnapshot.from(actor, {}); return PrerequisiteEvaluator.evaluate(snap, conds.map(toReq), {}); };
const facade = (actor, conds, name) => PrerequisiteChecker._evaluateStructuredPrerequisites(conds, actor, {}, name).met;
let total = 0; const diffs = [];
for (const [uuid, e] of Object.entries(idx).filter(([, e]) => e.state === 'COMPILED')) {
  const cs = e.structure.conditions;
  const variants = [['empty', EMPTY(), cs], ['full', actorSatisfying(cs), cs]];
  if (cs.length > 1) variants.push(['dropLast', actorSatisfying(cs.slice(0, -1)), cs]);
  for (const [label, actor, conds] of variants) {
    total++;
    let f, v; try { f = facade(actor, conds, e.name); } catch (err) { f = 'ERR ' + err.message; }
    try { const r = evalVia(actor, conds); v = r.passed ?? r.hardPassed; } catch (err) { v = 'ERR ' + err.message; }
    if (f !== v) diffs.push([e.name, label, f, v, e.text]);
  }
}
assert.equal(diffs.length, 0, `evaluator vs structured interpreter disagree on ${diffs.length}/${total}: ${JSON.stringify(diffs.slice(0, 6))}`);

// the evaluator reads ability scores through the canonical authority: an actor that only stores base/racial/enhancement/temp (the real schema) satisfies
// "Dexterity 13" at 14 and fails it at 12 -- failing-before: it read attributes.<k>.total/.value and fell back to 10 for everyone
{
  const mk = (dex) => ({ id: 'ab', type: 'character', system: { attributes: { dex: { base: dex, racial: 0, enhancement: 0, temp: 0 } }, abilities: {}, skills: {} }, items: [], flags: {} });
  const req = [{ type: 'ability', ability: 'dex', min: 13 }];
  assert.equal(PrerequisiteEvaluator.evaluate(ActorPrerequisiteSnapshot.from(mk(14), {}), req, {}).passed, true);
  assert.equal(PrerequisiteEvaluator.evaluate(ActorPrerequisiteSnapshot.from(mk(12), {}), req, {}).passed, false);
  const draft = PrerequisiteEvaluator.evaluate(ActorPrerequisiteSnapshot.from(mk(8), { attributes: { finalValues: { dex: 15 } } }), req, {});
  assert.equal(draft.passed, true, 'draft attributes of the session being built win, as in the facade');
}
// the compiled path is evaluated by the canonical evaluator and reports it
{
  const [uuid, e] = Object.entries(idx).find(([, x]) => x.state === 'COMPILED' && x.structure.conditions.some((c) => c.type === 'attribute'));
  const item = { ...JSON.parse(JSON.stringify(byUuid(uuid))), uuid, flags: { core: { sourceId: uuid } } };
  const r = (e.domain === 'feat' ? PrerequisiteChecker.checkFeatPrerequisites : PrerequisiteChecker.checkTalentPrerequisites).call(PrerequisiteChecker, EMPTY(), item, {});
  assert.equal(r.details.canonicalIndex.interpreter, 'PrerequisiteEvaluator');
}
process.stdout.write(`prerequisite-evaluator-compiled-parity: ok (${total} comparisons)\n`);
