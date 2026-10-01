#!/usr/bin/env node
/**
 * Phase 3G-1 — structured talent-prerequisite identity census (read-only; writes no pack).
 *
 *   node tools/census-talent-prerequisite-identity.mjs           write data/audits/talent-phase-3g-prerequisite-identity-census.json + docs
 *   node tools/census-talent-prerequisite-identity.mjs --check   committed census is current
 *
 * Every structured prerequisite condition on every canonical talent is classified by (a) static identity analysis against the production
 * pack and the canonical corpus, and (b) what the REAL PrerequisiteChecker does with it for four runtime shapes, executed under the repo's
 * Foundry shim: the embedded copy exactly as the progression finalizer creates it, a source-linked embedded copy, the pending selection exactly as
 * the talent step commits it, and (same-name targets) the WRONG same-name embedded copy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCommittedManifests } from './apply-talent-phase-3c.mjs';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/talent-phase-3g-prerequisite-identity-census.json';
export const OUT_MD = 'docs/audits/talent-phase-3g-prerequisite-identity-census.md';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const nd = rel => read(rel).split('\n').filter(Boolean).map(JSON.parse);
const PACK_ID = /^[0-9a-f]{16}$/;
const TALENT_PACK = 'foundryvtt-swse.talents';

/** Flat walk with exact JSON paths (the production structure is {type:'all', conditions:[...]}, no nesting today; the walker handles nesting anyway). */
export function leavesOf(structured, base = 'system.prerequisitesStructured') {
  const out = [];
  const walk = (node, p) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.conditions)) { node.conditions.forEach((c, i) => walk(c, `${p}.conditions[${i}]`)); return; }
    out.push({ path: p, condition: node });
  };
  walk(structured, base);
  return out;
}

export async function loadRuntime(talents, trees) {
  const say = console.log.bind(console);
  for (const l of ['log', 'info', 'debug', 'warn', 'error']) console[l] = () => {};
  registerFoundryPathLoader(); installFoundryShimGlobals();
  globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
  globalThis.foundry.utils.deepClone = v => JSON.parse(JSON.stringify(v)); globalThis.foundry.utils.duplicate = globalThis.foundry.utils.deepClone;
  globalThis.foundry.utils.mergeObject = globalThis.foundry.utils.mergeObject ?? ((a, b) => ({ ...a, ...b }));
  globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('no registry'); } });
  const mk = (key, docs) => ({ collection: key, metadata: { id: key, type: 'Item' }, getDocuments: async () => docs, getIndex: async () => docs.map(d => ({ _id: d._id, name: d.name, type: d.type, system: d.system })), index: new Map(docs.map(d => [d._id, d])) });
  globalThis.game.system = { id: 'foundryvtt-swse' };
  globalThis.game.packs = new Map([['foundryvtt-swse.talents', mk('foundryvtt-swse.talents', talents)], ['foundryvtt-swse.talent_trees', mk('foundryvtt-swse.talent_trees', trees)]]);
  const { PrerequisiteChecker } = await import('/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js');
  return { PrerequisiteChecker, restore: () => { console.log = say; } };
}

const clone = v => JSON.parse(JSON.stringify(v));
let seq = 0;
/** The embedded talent exactly as FeatTalentPlanBuilder creates it: resolvedDoc.toObject() clone (flags preserved), a NEW _id, no compendium source link. */
export const finalizerEmbedded = doc => ({ ...clone(doc), _id: `EMB${++seq}`, id: `EMB${++seq}` });
/** The same item once a source link exists (the shape of the Phase-3D-refreshed actor-pack snapshots). */
export const sourceLinked = doc => { const e = finalizerEmbedded(doc); e.flags = { ...(e.flags ?? {}), core: { sourceId: `Compendium.${TALENT_PACK}.${doc._id}` } }; return e; };
/** The pending selection exactly as talent-step._buildCanonicalTalentSelection builds it: id = compendium _id, name, system copy, NO flags / uuid / sourceId. */
export const pendingEntry = doc => ({ id: doc._id, name: doc.name, type: 'talent', system: clone(doc.system) });

export async function build() {
  const talents = nd('packs/talents.db'), trees = nd('packs/talent_trees.db'), canonical = JSON.parse(read('data/canonical/talents.json'));
  const identityOf = new Map();
  for (const { manifest } of loadCommittedManifests()) for (const r of manifest.records) { const i = r.identityResolution; identityOf.set(i.productionRecordId || i.createRecordId, r.canonicalIdentity); }
  for (const a of JSON.parse(read('data/audits/talent-phase-3e-canonical-additions.json')).additions) identityOf.set(a.production.id, a.canonicalIdentity);
  const byId = new Map(talents.map(t => [t._id, t])), bySwse = new Map(), byName = new Map();
  for (const t of talents) { const f = t.flags?.swse?.id; if (f) bySwse.set(f, [...(bySwse.get(f) ?? []), t]); byName.set(t.name.toLowerCase(), [...(byName.get(t.name.toLowerCase()) ?? []), t]); }
  const treeOfTalent = new Map(); for (const tr of trees) for (const id of tr.system.talentIds) treeOfTalent.set(id, tr);
  const sameNameNames = new Set(canonical.sameNameDifferentTreeGroups.map(g => g.name.toLowerCase()));
  const { PrerequisiteChecker, restore } = await loadRuntime(talents, trees);
  const actor = items => ({ id: 'a', type: 'character', system: { abilities: {} }, items: items.map(i => ({ ...i, id: i.id ?? i._id })), flags: {} });
  const eval_ = (cond, a, pending = {}) => {
    const r = PrerequisiteChecker._resolvePrerequisiteByUuid(cond, 'talent', a, pending), c = PrerequisiteChecker._checkTalentCondition(cond, a, pending);
    return { met: !!c.met, via: r.via, nameFallback: r.via === 'name' || (!r.via && !!c.met) };
  };

  const rows = [], other = { byType: {}, owners: 0 };
  const recordsWithStructured = talents.filter(t => t.system.prerequisitesStructured);
  for (const t of recordsWithStructured) {
    const hasText = !!String(t.system.prerequisites ?? '').trim() && String(t.system.prerequisites).trim().toLowerCase() !== 'none';
    for (const { path: p, condition } of leavesOf(t.system.prerequisitesStructured)) {
      if (condition.type !== 'talent') { other.byType[condition.type] = (other.byType[condition.type] ?? 0) + 1; continue; }
      const idForm = !condition.id ? (condition.uuid ? 'UUID' : 'NONE') : PACK_ID.test(condition.id) ? 'PRODUCTION_ID' : /^swse\.talent\./.test(condition.id) ? 'SWSE_FLAG_ID' : 'OTHER';
      let targets = [];
      if (condition.uuid) { const m = /^Compendium\.([^.]+\.[^.]+)\.(?:Item\.)?([0-9a-f]{16})$/.exec(condition.uuid); if (m && m[1] === TALENT_PACK && byId.has(m[2])) targets = [byId.get(m[2])]; }
      else if (condition.id && byId.has(condition.id)) targets = [byId.get(condition.id)];
      else if (condition.id && bySwse.has(condition.id)) targets = bySwse.get(condition.id);
      const target = targets.length === 1 ? targets[0] : null;
      const resolution = targets.length === 0 ? 'DANGLING' : targets.length === 1 ? 'UNIQUE' : 'AMBIGUOUS';
      const row = {
        owner: { id: t._id, name: t.name, canonicalIdentity: identityOf.get(t._id) ?? null, hasTextPrerequisite: hasText, textPrerequisite: t.system.prerequisites ?? '' },
        path: p, leaf: { id: condition.id ?? null, uuid: condition.uuid ?? null, slug: condition.slug ?? null, name: condition.name ?? null, extraKeys: Object.keys(condition).filter(k => !['type', 'id', 'uuid', 'slug', 'name'].includes(k)) },
        idForm, resolution, targetCandidates: targets.map(x => ({ id: x._id, name: x.name, canonicalIdentity: identityOf.get(x._id) ?? null, tree: treeOfTalent.get(x._id)?.name ?? null, treeId: treeOfTalent.get(x._id)?._id ?? null, flagsSwseId: x.flags?.swse?.id ?? null }))
      };
      if (target) {
        const sameNameCount = byName.get(target.name.toLowerCase()).length;
        row.target = { id: target._id, name: target.name, canonicalIdentity: identityOf.get(target._id) ?? null, tree: treeOfTalent.get(target._id)?.name ?? null, flagsSwseId: target.flags?.swse?.id ?? null, hasFlagsSwseId: !!target.flags?.swse?.id, canonicalUuid: `Compendium.${TALENT_PACK}.Item.${target._id}`, nameGloballyUnique: sameNameCount === 1, inSameNameCrossTreeGroup: sameNameNames.has(target.name.toLowerCase()) };
        const rt = {};
        rt.embeddedFinalizerShape = eval_(condition, actor([finalizerEmbedded(target)]));
        rt.embeddedSourceLinked = eval_(condition, actor([sourceLinked(target)]));
        rt.pendingTalentStepShape = eval_(condition, actor([]), { selectedTalents: [pendingEntry(target)] });
        const wrong = byName.get(target.name.toLowerCase()).filter(x => x._id !== target._id);
        if (wrong.length) rt.wrongSameNameEmbedded = { satisfiesPrerequisite: wrong.some(w => eval_(condition, actor([finalizerEmbedded(w)])).met), candidates: wrong.length };
        row.runtime = rt;
      }
      rows.push(row);
    }
  }
  restore();
  const tally = f => rows.reduce((o, r) => { const k = f(r); o[k] = (o[k] ?? 0) + 1; return o; }, {});
  const resolved = rows.filter(r => r.target);
  const c = {
    records: recordsWithStructured.length, talentLeaves: rows.length,
    byIdForm: tally(r => r.idForm), byResolution: tally(r => r.resolution),
    recordsWithTextPrerequisite: new Set(rows.filter(r => r.owner.hasTextPrerequisite).map(r => r.owner.id)).size,
    recordsWithoutTextPrerequisite: new Set(rows.filter(r => !r.owner.hasTextPrerequisite).map(r => r.owner.id)).size,
    targetNameGloballyUnique: resolved.filter(r => r.target.nameGloballyUnique).length, targetInSameNameGroup: resolved.filter(r => r.target.inSameNameCrossTreeGroup).length,
    targetsWithoutFlagsSwseId: resolved.filter(r => !r.target.hasFlagsSwseId).length,
    runtime: Object.fromEntries(['embeddedFinalizerShape', 'embeddedSourceLinked', 'pendingTalentStepShape'].map(k => [k, { met: resolved.filter(r => r.runtime[k].met).length, notMet: resolved.filter(r => !r.runtime[k].met).length, viaIdentity: resolved.filter(r => r.runtime[k].met && r.runtime[k].via && r.runtime[k].via !== 'name').length, viaNameFallback: resolved.filter(r => r.runtime[k].met && (r.runtime[k].via === 'name' || !r.runtime[k].via)).length }])),
    wrongSameNameSatisfies: resolved.filter(r => r.runtime.wrongSameNameEmbedded?.satisfiesPrerequisite).length, wrongSameNameChecked: resolved.filter(r => r.runtime.wrongSameNameEmbedded).length
  };
  return {
    schemaVersion: 1, phase: '3G-1', status: 'CENSUS', productionMutationPerformed: false, baseline: 'a3a94c958c8bd2f5d5c4060deb7b95612b2292de',
    fieldsConsumedByRuntime: { prerequisitesStructured: talents.filter(t => t.system.prerequisitesStructured).length, structuredPrerequisites: talents.filter(t => t.system.structuredPrerequisites).length, prereqClauses: talents.filter(t => t.system.prereqClauses).length },
    nonTalentStructuredConditions: other.byType, counts: c, phase3dRepairs: rows.filter(r => r.idForm === 'PRODUCTION_ID').map(r => `${r.owner.name} -> ${r.target?.canonicalIdentity}`),
    rows
  };
}

function renderMd(c) {
  const k = c.counts, rt = k.runtime;
  const row = (label, o) => `| ${label} | ${o.met} | ${o.notMet} | ${o.viaIdentity} | ${o.viaNameFallback} |`;
  return ['# Phase 3G-1 — Structured talent-prerequisite identity census', '', 'Read-only. Generator: `node tools/census-talent-prerequisite-identity.mjs` · data: `data/audits/talent-phase-3g-prerequisite-identity-census.json`. Baseline: merged `main` `a3a94c958`.', '',
    `**${k.records} canonical talents** carry \`system.prerequisitesStructured\` (the only structured field in production: \`structuredPrerequisites\` ${c.fieldsConsumedByRuntime.structuredPrerequisites}, \`prereqClauses\` ${c.fieldsConsumedByRuntime.prereqClauses}). They hold **${k.talentLeaves} talent-to-talent conditions**; other structured conditions are untouched by this phase: ${Object.entries(c.nonTalentStructuredConditions).map(([a, b]) => `${a} ${b}`).join(', ')}.`, '',
    `${k.recordsWithTextPrerequisite} of the owning records also carry printed prerequisite text (the checker's text path wins there); ${k.recordsWithoutTextPrerequisite} have structured data only. Display/normalization consumers prefer the structured data over text.`, '',
    '## Identity forms and static resolution', '', '| | Count |', '|---|---|', ...Object.entries(k.byIdForm).map(([a, b]) => `| leaf id form \`${a}\` | ${b} |`), ...Object.entries(k.byResolution).map(([a, b]) => `| target resolution \`${a}\` | ${b} |`),
    `| target name globally unique | ${k.targetNameGloballyUnique} |`, `| target in a same-name cross-tree group | ${k.targetInSameNameGroup} |`, `| target record has no \`flags.swse.id\` | ${k.targetsWithoutFlagsSwseId} |`, '',
    '## What the real checker does (per leaf, real `PrerequisiteChecker`)', '', '| Runtime shape | Met | Not met | via identity | via name fallback |', '|---|---|---|---|---|',
    row('embedded copy exactly as the finalizer creates it (new `_id`, flags kept, no source link)', rt.embeddedFinalizerShape), row('embedded copy with `flags.core.sourceId` set', rt.embeddedSourceLinked), row('pending selection exactly as the talent step commits it', rt.pendingTalentStepShape), '',
    `Wrong same-name copy: ${k.wrongSameNameSatisfies} of ${k.wrongSameNameChecked} same-name targets are satisfied by the WRONG-tree talent.`, '',
    '## Phase 3D repairs', '', ...c.phase3dRepairs.map(x => `- ${x}`), ''].join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const c = await build(), json = JSON.stringify(c, null, 2) + '\n', md = renderMd(c);
  if (argv.includes('--check')) {
    if (!fs.existsSync(path.join(ROOT, OUT_JSON)) || read(OUT_JSON) !== json || read(OUT_MD) !== md) { console.error('[prereq-identity-census] STALE: committed census differs from a fresh run'); return 1; }
    console.log(`[prereq-identity-census] PASS: ${c.counts.talentLeaves} talent leaves on ${c.counts.records} records`); return 0;
  }
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md);
  console.log(JSON.stringify(c.counts, null, 1)); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then(code => process.exit(code), e => { console.error(e); process.exit(1); });
