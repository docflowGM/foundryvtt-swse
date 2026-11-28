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
let n = 0, droidGated = 0; const ok = (m) => say(`  ok  ${m}`);

installCanonicalPrerequisiteIndex(indexJson);
const compiled = Object.entries(idx).filter(([, e]) => e.state === 'COMPILED');
// 1. satisfied / none satisfied (every compiled entry)
for (const [uuid, e] of compiled) {
  const item = itemOf(uuid);
  let satisfied = actorSatisfying(e.structure.conditions);
  let met = check(e.domain, item, satisfied);
  if (met.details?.droidChassisGate) { satisfied = { ...satisfied, type: 'droid', system: { ...satisfied.system, isDroid: true } }; met = check(e.domain, item, satisfied); droidGated++; } // the pre-existing droid-chassis acquisition gate runs before the index
  assert.equal(met.met, true, `${e.name}: an actor satisfying every condition is eligible (${JSON.stringify(met.missing)})`);
  assert.equal(met.details.canonicalIndex?.uuid, uuid, `${e.name}: evaluated from the index`);
  assert.equal(check(e.domain, item, EMPTY()).met, false, `${e.name}: an empty actor is never eligible`);
  n++;
}
ok(`${n} compiled entries (${droidGated} droid-chassis gated): satisfied actor eligible, empty actor refused, evaluated from the index`);
// 2. exactly the missing condition is reported (one / multiple missing)
let multi = 0;
for (const [uuid, e] of compiled) {
  const cs = e.structure.conditions; if (cs.length < 2) continue;
  const item = itemOf(uuid);
  const withoutLast = check(e.domain, item, actorSatisfying(cs.slice(0, -1)));
  assert.equal(withoutLast.met, false, `${e.name}: one missing condition`); assert.equal(withoutLast.missing.length, 1, `${e.name}: exactly one reported`);
  multi++;
}
ok(`${multi} multi-condition entries: dropping one condition reports exactly one missing`);
// 3. same-name wrong talent vs exact UUID (approved Phase 3G ruling): Outlaw "Find an Opening" needs the OUTLAW "Seize the Moment"
{
  const fao = Object.entries(idx).find(([, e]) => e.domain === 'talent' && e.name === 'Find an Opening' && e.state === 'COMPILED');
  assert.ok(fao, 'Find an Opening is compiled');
  const [uuid, e] = fao; const target = e.structure.conditions[0].uuid;
  const wrong = talents.find((t) => t.name === 'Seize the Moment' && `Compendium.foundryvtt-swse.talents.Item.${t._id}` !== target);
  assert.ok(wrong, 'a same-name talent in another tree exists');
  const wrongUuid = `Compendium.foundryvtt-swse.talents.Item.${wrong._id}`;
  assert.equal(check('talent', itemOf(uuid), { ...EMPTY(), items: [embedded(wrong, wrongUuid, 'talent')] }).met, false, 'the same-name talent from another tree does not satisfy it');
  assert.equal(check('talent', itemOf(uuid), { ...EMPTY(), items: [embedded(byUuid(target), target, 'talent')] }).met, true);
  ok('same-name wrong talent refused; exact UUID satisfies');
}
// 4. held / unresolved records and unlinked items keep the previous behavior (no index evaluation)
{
  const held = Object.entries(idx).find(([, e]) => e.name === 'Burst Fire');
  assert.notEqual(held[1].state, 'COMPILED');
  assert.equal(compiledPrerequisiteEntryFor('feat', itemOf(held[0])), null, 'a source-held record is never evaluated from the index');
  const [cu, ce] = compiled[0];
  assert.equal(compiledPrerequisiteEntryFor(ce.domain, { name: ce.name, system: {} }), null, 'a name-only item has no canonical identity (no guessing)');
  assert.equal(compiledPrerequisiteEntryFor(ce.domain, { ...itemOf(cu), flags: {}, uuid: undefined, _id: 'x' }), null);
  ok('held records, name-only items: compatibility path');
}
// 5. without an installed index the previous behavior is untouched
{
  clearCanonicalPrerequisiteIndex();
  const [uuid, e] = compiled[0];
  assert.equal(check(e.domain, itemOf(uuid), EMPTY()).details.canonicalIndex, undefined);
  installCanonicalPrerequisiteIndex({ schema: 'wrong', entries: {} }); assert.equal(compiledPrerequisiteEntryFor(e.domain, itemOf(uuid)), null, 'a foreign schema is refused');
  ok('no index / foreign schema: previous behavior');
}
say('canonical-prerequisite-runtime-index: ok');
