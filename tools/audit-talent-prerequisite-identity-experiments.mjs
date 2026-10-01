#!/usr/bin/env node
/**
 * Phase 3G-0 — identity experiments (read-only). Runs the REAL PrerequisiteChecker under the repo's Foundry shim against real pack records and
 * the exact item shapes the runtime creates, and records which talent identity survives each hop:
 *   compendium talent -> embedded actor item (finalizer path) -> prerequisite evaluation
 *   compendium talent -> pending progression selection (talent step) -> prerequisite evaluation
 *   node tools/audit-talent-prerequisite-identity-experiments.mjs           write data/audits/talent-phase-3g-identity-experiments.json
 *   node tools/audit-talent-prerequisite-identity-experiments.mjs --check   committed record is current
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const OUT = 'data/audits/talent-phase-3g-identity-experiments.json';
const pack = rel => fs.readFileSync(R + rel, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const talents = pack('packs/talents.db'), trees = pack('packs/talent_trees.db');
const say = console.log.bind(console);
for (const l of ['log', 'info', 'debug', 'warn', 'error']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = v => JSON.parse(JSON.stringify(v)); globalThis.foundry.utils.duplicate = globalThis.foundry.utils.deepClone;
globalThis.foundry.utils.mergeObject = globalThis.foundry.utils.mergeObject ?? ((a, b) => ({ ...a, ...b }));
globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('x'); } });
const mk = (key, docs) => ({ collection: key, metadata: { id: key, type: 'Item' }, getDocuments: async () => docs, getIndex: async () => docs.map(d => ({ _id: d._id, name: d.name, type: d.type, system: d.system })), index: new Map(docs.map(d => [d._id, d])) });
globalThis.game.system = { id: 'foundryvtt-swse' };
globalThis.game.packs = new Map([['foundryvtt-swse.talents', mk('foundryvtt-swse.talents', talents)], ['foundryvtt-swse.talent_trees', mk('foundryvtt-swse.talent_trees', trees)]]);
const { PrerequisiteChecker } = await import('/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js');
const byName = n => talents.filter(t => t.name === n);
let seq = 0;
const embed = (doc, over = {}) => ({ ...JSON.parse(JSON.stringify(doc)), _id: 'EMB' + (++seq), id: undefined, ...over });
const actor = items => ({ id: 'a', type: 'character', system: { abilities: {} }, items: items.map(i => ({ ...i, id: i._id })), flags: {} });
const run = (prereq, a, pending = {}) => { const r = PrerequisiteChecker._resolvePrerequisiteByUuid(prereq, 'talent', a, pending); const c = PrerequisiteChecker._checkTalentCondition(prereq, a, pending); return { via: r.via, fallback: r.fallback, resolvedId: !!r.resolved, met: c.met }; };
const out = {};
const cs = byName('Cast Suspicion')[0], notorious = byName('Notorious');
out.cast_embedded_flags = { swseId: cs.flags?.swse?.id, coreSource: embed(cs).flags?.core?.sourceId ?? null, stats: embed(cs)._stats?.compendiumSource ?? null };
out['E1 swse.talent id vs embedded copy (flags.swse.id kept)'] = run({ type: 'talent', id: 'swse.talent.cast_suspicion' }, actor([embed(cs)]));
out['E1b same, embedded copy with flags stripped'] = run({ type: 'talent', id: 'swse.talent.cast_suspicion' }, actor([embed(cs, { flags: {} })]));
out['E2 swse.talent id vs pending [{name}]'] = run({ type: 'talent', id: 'swse.talent.cast_suspicion' }, actor([]), { selectedTalents: [{ name: 'Cast Suspicion' }] });
out['E2b pending [{id: compendium _id}]'] = run({ type: 'talent', id: 'swse.talent.cast_suspicion' }, actor([]), { selectedTalents: [{ id: cs._id }] });
out['E2c pending [{id: swse.talent id, name}]'] = run({ type: 'talent', id: 'swse.talent.cast_suspicion' }, actor([]), { selectedTalents: [{ id: 'swse.talent.cast_suspicion', name: 'Cast Suspicion' }] });
out['E2d pending only {id: swse.talent id} (no name)'] = run({ type: 'talent', id: 'swse.talent.cast_suspicion' }, actor([]), { selectedTalents: [{ id: 'swse.talent.cast_suspicion' }] });
const bh = notorious.find(t => t.system.treeId.length === 16) ;
out.notorious = notorious.map(t => ({ _id: t._id, tree: t.system.treeId, swseId: t.flags?.swse?.id ?? null }));
for (const nt of notorious) {
  const p = { type: 'talent', id: nt._id };
  out[`E3 3D prereq {id: production _id ${nt._id}} vs embedded copy`] = run(p, actor([embed(nt)]));
  out[`E3b same, vs actor with source-linked copy (flags.core.sourceId set)`] = run(p, actor([embed(nt, { flags: { ...(nt.flags||{}), core: { sourceId: `Compendium.foundryvtt-swse.talents.${nt._id}` } } })]));
  out[`E3c same, vs pending [{id: _id, name}]`] = run(p, actor([]), { selectedTalents: [{ id: nt._id, name: nt.name }] });
}
const so = byName('Seize the Moment');
out.seize = so.map(t => ({ _id: t._id, tree: t.system.treeId, swseId: t.flags?.swse?.id ?? null }));
out['E4 same-name: prereq swse.talent.seize_the_moment vs EITHER Seize copy'] = so.map(t => run({ type: 'talent', id: 'swse.talent.seize_the_moment' }, actor([embed(t)])));
out['E4b production-_id prereq (target 1) vs the WRONG-tree copy, name-only embedded'] = run({ type: 'talent', id: so[0]._id }, actor([embed(so[1], { flags: {} })]));
out['E5 uuid prereq vs embedded w/ core.sourceId (id format Compendium.<pack>.<id>)'] = run({ type: 'talent', uuid: `Compendium.foundryvtt-swse.talents.${cs._id}` }, actor([embed(cs, { flags: { core: { sourceId: `Compendium.foundryvtt-swse.talents.${cs._id}` } } })]));
out['E5b uuid prereq (v13 form with .Item.) vs same sourceId (legacy form)'] = run({ type: 'talent', uuid: `Compendium.foundryvtt-swse.talents.Item.${cs._id}` }, actor([embed(cs, { flags: { core: { sourceId: `Compendium.foundryvtt-swse.talents.${cs._id}` } } })]));
out['E5c uuid prereq vs pending [{uuid}]'] = run({ type: 'talent', uuid: `Compendium.foundryvtt-swse.talents.${cs._id}` }, actor([]), { selectedTalents: [{ uuid: `Compendium.foundryvtt-swse.talents.${cs._id}` }] });
out['E5d uuid prereq vs pending [{id: compendium _id}] (no uuid)'] = run({ type: 'talent', uuid: `Compendium.foundryvtt-swse.talents.${cs._id}` }, actor([]), { selectedTalents: [{ id: cs._id, name: cs.name }] });
out['E6 dead uuid, name present'] = run({ type: 'talent', uuid: 'Compendium.foundryvtt-swse.talents.deadbeef', name: 'Cast Suspicion' }, actor([embed(cs)]));
out['E6b dead uuid, no name'] = run({ type: 'talent', uuid: 'Compendium.foundryvtt-swse.talents.deadbeef' }, actor([embed(cs)]));
const json = JSON.stringify({ schemaVersion: 1, phase: '3G-0', note: 'real PrerequisiteChecker, real pack records; see docs/audits/talent-phase-3g-identity-contract.md', experiments: out }, null, 2) + '\n';
console.log = say;
if (process.argv.includes('--check')) {
  if (!fs.existsSync(R + OUT) || fs.readFileSync(R + OUT, 'utf8') !== json) { console.error('[identity-experiments] STALE: committed record differs from a fresh run'); process.exit(1); }
  say('[identity-experiments] PASS: committed record is current');
} else { fs.writeFileSync(R + OUT, json); say('[identity-experiments] wrote ' + OUT); }
