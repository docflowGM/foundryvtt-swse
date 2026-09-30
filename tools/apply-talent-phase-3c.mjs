#!/usr/bin/env node
/**
 * Phase 3C talent production applicator.
 *
 * The Phase 3B manifests are immutable instructions that describe the migration from the certified
 * PRE-state production packs to the certified POST-state. They are NOT expected to regenerate from
 * migrated packs, so this tool has two strictly separate paths:
 *
 *   PRE-state (packs still equal the Phase 3B certified blobs)
 *     node tools/apply-talent-phase-3c.mjs             dry run: print the projected report
 *     node tools/apply-talent-phase-3c.mjs --report    write data/audits/talent-phase-3c-dry-run-report.json
 *     node tools/apply-talent-phase-3c.mjs --check     fail if the committed report is stale
 *     node tools/apply-talent-phase-3c.mjs --apply     re-verify 14 manifests + closeout, apply, write outputs
 *
 *   POST-state (packs equal the certified projection)
 *     node tools/apply-talent-phase-3c.mjs --verify    prove the state from the committed manifests; rerunnable
 *     node tools/apply-talent-phase-3c.mjs --verify --exact   additionally require byte-exact certified blobs
 *
 *   node tools/apply-talent-phase-3c.mjs --status      prints PRE_STATE | POST_STATE | UNKNOWN_STATE
 *
 * --apply refuses (explicitly, before any builder/collision logic runs) unless the packs are the
 * certified pre-state. --verify never invokes the Phase 3B builder and never creates records.
 * Nothing here matches or mutates by talent name; every mutation is keyed by a certified ID.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  REGISTRY_PATHS, generateFromPackTexts, serializeRegistry, loadPreviousRegistry, registrySlug
} from './build-talent-tree-registry.mjs';
import { scanManifestText, pendingSourceTextCorrections, summarize as summarizeTextQuality } from './audit-talent-phase-3c-text-quality.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CLOSEOUT_PATH = 'data/audits/talent-phase-3b-global-closeout.json';
export const REPORT_PATH = 'data/audits/talent-phase-3c-dry-run-report.json';
const PHASE_3D_REPORT_PATH = 'data/audits/talent-phase-3d-dry-run-report.json';
const PHASE_3E4_REPORT_PATH = 'data/audits/talent-phase-3e4-dry-run-report.json';
export const PACKS = { talents: 'packs/talents.db', trees: 'packs/talent_trees.db', classes: 'packs/classes.db' };
export const MANIFEST_SPECS = [
  ['clone-wars', 'data/audits/talent-phase-3b-clone-wars-campaign-guide-manifest.json'],
  ['core', 'data/audits/talent-phase-3b-core-rulebook-manifest.json'],
  ['force-unleashed', 'data/audits/talent-phase-3b-force-unleashed-campaign-guide-manifest.json'],
  ['war', 'data/audits/talent-phase-3b-galaxy-at-war-manifest.json'],
  ['intrigue', 'data/audits/talent-phase-3b-galaxy-of-intrigue-manifest.json'],
  ['jatm', 'data/audits/talent-phase-3b-jedi-academy-training-manual-manifest.json'],
  ['kotor', 'data/audits/talent-phase-3b-knights-of-the-old-republic-campaign-guide-manifest.json'],
  ['legacy', 'data/audits/talent-phase-3b-legacy-era-campaign-guide-manifest.json'],
  ['rebellion', 'data/audits/talent-phase-3b-rebellion-era-campaign-guide-manifest.json'],
  ['scavengers', 'data/audits/talent-phase-3b-scavengers-guide-to-droids-manifest.json'],
  ['scum', 'data/audits/talent-phase-3b-scum-and-villainy-manifest.json'],
  ['starships', 'data/audits/talent-phase-3b-starships-of-the-galaxy-manifest.json'],
  ['threats', 'data/audits/talent-phase-3b-threats-of-the-galaxy-manifest.json'],
  ['unknown', 'data/audits/talent-phase-3b-unknown-regions-manifest.json']
];

/* ------------------------------------------------------------------------------------------------
 * Small helpers
 * ---------------------------------------------------------------------------------------------- */
export const KNOWN_DISPOSITIONS = new Set([
  'UPDATE_CONTENT', 'UPDATE_METADATA', 'CREATE', 'REMOVE_CONTAMINATION', 'CORRECT_TREE', 'IDENTITY_SPLIT'
]);
const CREATE_DISPOSITIONS = new Set(['CREATE', 'IDENTITY_SPLIT']);
// Operation metadata, never copied as data.
const STRUCTURAL_MUTATION_FIELDS = new Set(['_record_create', 'system.treeId']);
// The only talent value fields a manifest may write on an existing record.
const CANONICAL_TALENT_FIELDS = new Set([
  'name', 'system.benefit', 'system.description', 'system.description.value',
  'system.summary', 'system.prerequisites', 'system.source', 'system.page'
]);
const CLASS_ACCESS_FIELDS = new Set([
  'system.talent_trees', 'system.talentTreeIds', 'system.talentTreeSourceIds', 'system.talentTreeUuids'
]);
const CONSOLIDATION_PATCH_FIELDS = new Set(['name', 'system.talent_tree', 'system.talentIds', 'system.talentNames']);

const ERR = '[talent-phase-3c] ';
export const invariant = (ok, message) => { if (!ok) throw new Error(ERR + message); };
const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const readText = (rel, root = ROOT) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel, root = ROOT) => JSON.parse(readText(rel, root));
const parseNdjson = raw => raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);
const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const gitBlobSha = text => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sortKeys = v => Array.isArray(v) ? v.map(sortKeys)
  : isPlainObject(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v;
export const fingerprint = v => crypto.createHash('sha1').update(JSON.stringify(sortKeys(v))).digest('hex').slice(0, 16);
const leaves = (o, pre = '', out = {}) => {
  if (isPlainObject(o) && Object.keys(o).length) for (const [k, v] of Object.entries(o)) leaves(v, pre + k + '.', out);
  else out[pre.slice(0, -1)] = o;
  return out;
};
const pushUnique = (arr, value) => { if (!arr.includes(value)) arr.push(value); };

export const getPath = (obj, dotted) => dotted.split('.').reduce((v, k) => (v !== null && typeof v === 'object' ? v[k] : undefined), obj);

/**
 * Fail-closed dotted write. A missing intermediate is created; an intermediate that already exists
 * with an incompatible shape (string, number, array, null) is NEVER replaced.
 */
export function setPath(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (const key of parts.slice(0, -1)) {
    if (cur[key] === undefined) cur[key] = {};
    invariant(isPlainObject(cur[key]), `refusing to write ${dotted}: "${key}" already exists with an incompatible shape (${Array.isArray(cur[key]) ? 'array' : typeof cur[key]})`);
    cur = cur[key];
  }
  const leaf = parts.at(-1);
  invariant(!(isPlainObject(cur[leaf]) && !isPlainObject(value)), `refusing to overwrite object at ${dotted} with a non-object`);
  cur[leaf] = clone(value);
}

/* ------------------------------------------------------------------------------------------------
 * Inputs and state detection
 * ---------------------------------------------------------------------------------------------- */
export function loadCommittedManifests(root = ROOT) {
  return MANIFEST_SPECS.map(([bookKey, manifestPath]) => ({ bookKey, manifestPath, manifest: readJson(manifestPath, root) }));
}

export function loadPackTexts(root = ROOT) {
  return Object.fromEntries(Object.entries(PACKS).map(([k, rel]) => [k, readText(rel, root)]));
}

export function packBlobShas(texts) {
  return Object.fromEntries(Object.entries(texts).map(([k, t]) => [k, gitBlobSha(t)]));
}

/** PRE_STATE: talents+trees equal the Phase 3B certified blobs. POST_STATE: equal the committed report's projection. */
export function detectPackState(root = ROOT) {
  const closeout = readJson(CLOSEOUT_PATH, root);
  const sha = packBlobShas(loadPackTexts(root));
  const pre = sha.talents === closeout.authority.productionTalentBlobSha && sha.trees === closeout.authority.productionTreeBlobSha;
  let post = false;
  if (fs.existsSync(path.join(root, REPORT_PATH))) {
    const post_ = readJson(REPORT_PATH, root).postState ?? {};
    post = post_.talents === sha.talents && post_.trees === sha.trees && post_.classes === sha.classes;
  }
  invariant(!(pre && post), 'state detection is ambiguous (pre-state equals post-state)');
  // Phase 3D (later, certified) successor state: packs equal the Phase 3D dry-run report's post-state. Phase 3C's own
  // tooling does not verify it; tools/apply-talent-phase-3d.mjs --verify --exact owns that state.
  let post3d = false;
  if (!pre && !post && fs.existsSync(path.join(root, PHASE_3D_REPORT_PATH))) {
    const p3d = readJson(PHASE_3D_REPORT_PATH, root).postState ?? {};
    post3d = p3d.talents === sha.talents && p3d.trees === sha.trees && p3d.classes === sha.classes;
  }
  // Phase 3E-4 (seven-record canonical repair, later still): packs equal the 3E-4 dry-run report's post-state.
  // tools/apply-talent-phase-3e4.mjs --verify --exact owns that state.
  let post3e4 = false;
  if (!pre && !post && !post3d && fs.existsSync(path.join(root, PHASE_3E4_REPORT_PATH))) {
    const p4 = readJson(PHASE_3E4_REPORT_PATH, root).postState ?? {};
    post3e4 = p4.talents === sha.talents && p4.trees === sha.trees && p4.classes === sha.classes;
  }
  return { state: pre ? 'PRE_STATE' : post ? 'POST_STATE' : post3d ? 'POST_3D_STATE' : post3e4 ? 'POST_3E4_STATE' : 'UNKNOWN_STATE', sha };
}

/* ------------------------------------------------------------------------------------------------
 * Projection (pre-state only). Pure: never touches disk.
 * ---------------------------------------------------------------------------------------------- */
export function protectedIdsOf(closeout) {
  return new Set([
    ...closeout.reviewExtras.map(x => x.productionRecordId),
    ...closeout.productionOnlyDeferred.map(x => x.productionRecordId)
  ]);
}

/**
 * Tree-membership edits. Identity is the talent ID. The parallel display-name array is only touched for the
 * certified old/new name of THIS talent, and a name is dropped only when no remaining member carries it.
 */
export function detachFromTree(tree, talentId, staleNames, nameOf) {
  tree.system.talentIds = (tree.system.talentIds ?? []).filter(id => id !== talentId);
  const carried = new Set(tree.system.talentIds.map(nameOf));
  for (const stale of new Set(staleNames)) {
    if (stale && !carried.has(stale)) tree.system.talentNames = (tree.system.talentNames ?? []).filter(n => n !== stale);
  }
}

export function attachToTree(tree, talentId, replaceName, displayName, nameOf) {
  pushUnique(tree.system.talentIds ??= [], talentId);
  tree.system.talentNames ??= [];
  if (replaceName) {
    const carriedByOthers = new Set(tree.system.talentIds.filter(id => id !== talentId).map(nameOf));
    if (!carriedByOthers.has(replaceName.from)) tree.system.talentNames = tree.system.talentNames.filter(n => n !== replaceName.from);
    pushUnique(tree.system.talentNames, replaceName.to);
  } else {
    pushUnique(tree.system.talentNames, displayName);
  }
}

export function projectPhase3C({ manifests, closeout, talents: talentsBefore, trees: treesBefore, classes: classesBefore }) {
  invariant(closeout.status === 'GLOBAL_CLOSEOUT_CERTIFIED', 'Phase 3B closeout is not certified');
  invariant(closeout.phase3cGate?.ready === true, 'Phase 3C gate is not ready');
  invariant(talentsBefore.length === 1024, `expected 1024 starting talent records, found ${talentsBefore.length}`);
  invariant(treesBefore.length > 0, 'talent tree pack is empty');
  invariant(classesBefore.length > 0, 'class pack is empty');

  const talents = clone(talentsBefore);
  const trees = clone(treesBefore);
  const classes = clone(classesBefore);
  const talentById = new Map(talents.map(x => [x._id, x]));
  const treeById = new Map(trees.map(x => [x._id, x]));
  const classById = new Map(classes.map(x => [x._id, x]));

  const protectedIds = protectedIdsOf(closeout);
  const protectedSnapshots = new Map([...protectedIds].map(id => {
    const rec = talentById.get(id);
    invariant(rec, 'protected record missing before dry run: ' + id);
    return [id, JSON.stringify(rec)];
  }));

  const operationCounts = {
    existingTalentUpdates: 0, talentCreates: 0, treeCreates: 0,
    treeConsolidations: 0, classAccessMutations: 0, treeMembershipMoves: 0
  };
  const dispositionCounts = {};
  const nameOf = id => talentById.get(id)?.name;

  for (const { manifest } of manifests) {
    for (const create of manifest.treeCreates ?? []) {
      invariant(!treeById.has(create.createTreeId), 'tree create ID already exists: ' + create.createTreeId);
      const doc = clone(create.createTemplate);
      invariant(doc?._id === create.createTreeId, 'tree create template ID mismatch: ' + create.canonicalTreeKey);
      trees.push(doc);
      treeById.set(doc._id, doc);
      operationCounts.treeCreates++;
    }

    for (const record of manifest.records) {
      invariant(KNOWN_DISPOSITIONS.has(record.disposition), `unknown disposition "${record.disposition}" for ${record.canonicalIdentity}`);
      dispositionCounts[record.disposition] = (dispositionCounts[record.disposition] ?? 0) + 1;
      const existingId = record.identityResolution?.productionRecordId ?? null;
      const createId = record.identityResolution?.createRecordId ?? null;
      invariant((existingId === null) !== (createId === null),
        'exactly one of productionRecordId/createRecordId is required: ' + record.canonicalIdentity);
      invariant(CREATE_DISPOSITIONS.has(record.disposition) === (createId !== null),
        `disposition ${record.disposition} does not match its ID kind: ${record.canonicalIdentity}`);
      let talent;
      let originalName = null;

      if (existingId) {
        talent = talentById.get(existingId);
        invariant(talent, 'existing production record missing: ' + existingId + ' for ' + record.canonicalIdentity);
        invariant(!protectedIds.has(existingId), 'certified mutation targets protected record: ' + existingId);
        originalName = talent.name;

        for (const field of record.mutationFields ?? []) {
          if (STRUCTURAL_MUTATION_FIELDS.has(field)) continue;
          invariant(CANONICAL_TALENT_FIELDS.has(field), `mutation field outside the canonical surface: ${field} (${record.canonicalIdentity})`);
          invariant(Object.prototype.hasOwnProperty.call(record.targetFields ?? {}, field),
            'targetFields missing mutation field ' + field + ' for ' + record.canonicalIdentity);
          if (record.currentCanonicalFields && Object.prototype.hasOwnProperty.call(record.currentCanonicalFields, field)) {
            invariant(same(getPath(talent, field) ?? null, record.currentCanonicalFields[field]),
              'production drift at ' + field + ' for ' + record.canonicalIdentity);
          }
          setPath(talent, field, record.targetFields[field]);
        }
        if ((record.mutationFields ?? []).includes('system.treeId')) {
          setPath(talent, 'system.treeId', record.targetTree.treeId);
        }
        operationCounts.existingTalentUpdates++;
      } else {
        invariant(!talentById.has(createId), 'generated talent ID collision: ' + createId);
        talent = clone(record.createTemplate);
        invariant(talent?._id === createId, 'create template ID mismatch: ' + record.canonicalIdentity);
        talents.push(talent);
        talentById.set(createId, talent);
        operationCounts.talentCreates++;
      }
      invariant(talent._id === (existingId ?? createId), 'resolved talent ID mismatch');

      const tm = record.treeMutation;
      if (tm) {
        for (const oldTreeId of tm.removeFromTreeIds ?? []) {
          const oldTree = treeById.get(oldTreeId);
          invariant(oldTree, 'tree mutation source missing: ' + oldTreeId);
          invariant((oldTree.system.talentIds ?? []).includes(talent._id),
            `tree ${oldTreeId} does not claim ${talent._id}; refusing to remove (${record.canonicalIdentity})`);
          detachFromTree(oldTree, talent._id, [originalName, record.name], nameOf);
          operationCounts.treeMembershipMoves++;
        }
        if (tm.addToTreeId) {
          const targetTree = treeById.get(tm.addToTreeId);
          invariant(targetTree, 'tree mutation target missing: ' + tm.addToTreeId);
          invariant((tm.addTalentId ?? talent._id) === talent._id, 'treeMutation.addTalentId disagrees with resolved ID: ' + record.canonicalIdentity);
          attachToTree(targetTree, talent._id, tm.replaceTalentName ?? null, tm.addTalentName ?? talent.name, nameOf);
        }
      }
    }

    for (const consolidation of manifest.treeConsolidations ?? []) {
      const survivor = treeById.get(consolidation.survivorTreeId);
      invariant(survivor, 'consolidation survivor missing: ' + consolidation.survivorTreeId);
      const patch = consolidation.survivorTreePatch ?? {};
      for (const field of Object.keys(patch)) invariant(CONSOLIDATION_PATCH_FIELDS.has(field), 'consolidation patch field not allowed: ' + field);
      const before = new Set([...(survivor.system.talentIds ?? [])]);
      for (const obsoleteId of consolidation.deleteObsoleteTreeIds ?? []) {
        const obsolete = treeById.get(obsoleteId);
        invariant(obsolete, 'obsolete consolidation tree missing: ' + obsoleteId);
        invariant((obsolete.system?.talentIds ?? []).every(id => !protectedIds.has(id)),
          'consolidation would orphan protected talent from ' + obsoleteId);
        for (const id of obsolete.system?.talentIds ?? []) before.add(id);
      }
      if (patch['system.talentIds']) {
        for (const id of before) invariant(patch['system.talentIds'].includes(id), 'consolidation patch would drop member ' + id);
      }
      for (const [field, value] of Object.entries(patch)) setPath(survivor, field, value);
      for (const obsoleteId of consolidation.deleteObsoleteTreeIds ?? []) {
        treeById.delete(obsoleteId);
        const index = trees.findIndex(x => x._id === obsoleteId);
        invariant(index >= 0, 'obsolete tree not found in array: ' + obsoleteId);
        trees.splice(index, 1);
      }
      operationCounts.treeConsolidations++;
    }

    for (const mutation of manifest.classAccessMutations ?? []) {
      const cls = classById.get(mutation.classRecordId);
      invariant(cls, 'class record missing: ' + mutation.classRecordId);
      invariant(cls.name === mutation.className, 'class name drift for ' + mutation.classRecordId);
      for (const [field, value] of Object.entries(mutation.add ?? {})) {
        invariant(CLASS_ACCESS_FIELDS.has(field), 'class access field not allowed: ' + field);
        const arr = getPath(cls, field);
        invariant(Array.isArray(arr), 'class access target is not an array: ' + mutation.classRecordId + ' ' + field);
        invariant(!arr.includes(value), `class ${cls.name} already holds ${value} in ${field} (already applied?)`);
        arr.push(value);
      }
      operationCounts.classAccessMutations++;
    }
  }

  invariant(same(dispositionCounts, closeout.counts.dispositions), 'global disposition totals changed');
  invariant(operationCounts.existingTalentUpdates === 932, 'expected 932 existing talent updates');
  invariant(operationCounts.talentCreates === 248, 'expected 248 talent creates');
  invariant(operationCounts.treeCreates === 7, 'expected 7 tree creates');
  invariant(operationCounts.treeConsolidations === 1, 'expected 1 tree consolidation');
  invariant(operationCounts.classAccessMutations === 5, 'expected 5 class-access mutations');
  invariant(talents.length === 1272, 'projected talent pack must contain 1272 records');
  invariant(new Set(talents.map(x => x._id)).size === talents.length, 'duplicate talent IDs after projection');
  invariant(new Set(trees.map(x => x._id)).size === trees.length, 'duplicate tree IDs after projection');

  for (const [id, before] of protectedSnapshots) {
    invariant(JSON.stringify(talentById.get(id)) === before, 'protected production record changed: ' + id);
  }
  return { talents, trees, classes, operationCounts, dispositionCounts, protectedSnapshots };
}

/* ------------------------------------------------------------------------------------------------
 * Fingerprints that describe the certified post-state without needing the pre-state packs
 * ---------------------------------------------------------------------------------------------- */
const talentPreservedSurface = (talent, mutationFields) => {
  const skip = new Set(mutationFields);
  return Object.fromEntries(Object.entries(leaves(talent)).filter(([k]) => ![...skip].some(f => k === f || k.startsWith(f + '.'))));
};

/** Class record with the certified additions removed: equals the pre-state record when the migration is exact. */
function classWithoutCertifiedAdditions(cls, mutations) {
  const copy = clone(cls);
  for (const m of mutations.filter(x => x.classRecordId === cls._id)) {
    for (const [field, value] of Object.entries(m.add)) {
      const arr = getPath(copy, field);
      if (Array.isArray(arr)) setPath(copy, field, arr.filter(v => v !== value));
    }
  }
  return copy;
}

export function touchedTreeIds(manifests) {
  const touched = new Set();
  for (const { manifest } of manifests) {
    for (const r of manifest.records) {
      touched.add(r.targetTree.treeId);
      for (const id of r.treeMutation?.removeFromTreeIds ?? []) touched.add(id);
    }
    for (const c of manifest.treeConsolidations ?? []) { touched.add(c.survivorTreeId); for (const o of c.deleteObsoleteTreeIds) touched.add(o); }
  }
  return touched;
}

export function computeCertifiedFingerprints({ manifests, closeout, before }) {
  const talentById = new Map(before.talents.map(t => [t._id, t]));
  const protectedTalents = {};
  for (const id of [...protectedIdsOf(closeout)].sort()) protectedTalents[id] = fingerprint(talentById.get(id));
  const existingPreservedSurface = {};
  for (const { manifest } of manifests) for (const r of manifest.records) {
    const id = r.identityResolution.productionRecordId;
    if (id) existingPreservedSurface[id] = fingerprint(talentPreservedSurface(talentById.get(id), r.mutationFields));
  }
  const touched = touchedTreeIds(manifests);
  const untouchedTrees = {};
  for (const t of before.trees) if (!touched.has(t._id)) untouchedTrees[t._id] = fingerprint(t);
  const classes = {};
  for (const c of before.classes) classes[c._id] = fingerprint(c);
  return {
    protectedTalents,
    existingPreservedSurface: Object.fromEntries(Object.entries(existingPreservedSurface).sort(([a], [b]) => a.localeCompare(b))),
    untouchedTrees: Object.fromEntries(Object.entries(untouchedTrees).sort(([a], [b]) => a.localeCompare(b))),
    classes: Object.fromEntries(Object.entries(classes).sort(([a], [b]) => a.localeCompare(b)))
  };
}

/* ------------------------------------------------------------------------------------------------
 * Pack serialization: untouched records keep their original bytes; changed/new records are compact JSON.
 * ---------------------------------------------------------------------------------------------- */
export function serializePack(originalText, afterRecords) {
  const originalLines = new Map();
  for (const line of originalText.split(/\r?\n/).filter(Boolean)) originalLines.set(JSON.parse(line)._id, line);
  const out = afterRecords.map(rec => {
    const line = originalLines.get(rec._id);
    return line !== undefined && JSON.stringify(JSON.parse(line)) === JSON.stringify(rec) ? line : JSON.stringify(rec);
  });
  return out.join('\n') + '\n';
}

export function serializeProjection(projection, texts) {
  return {
    talents: serializePack(texts.talents, projection.talents),
    trees: serializePack(texts.trees, projection.trees),
    classes: serializePack(texts.classes, projection.classes)
  };
}

/* ------------------------------------------------------------------------------------------------
 * Post-state verification. Uses ONLY: committed manifests, closeout, committed report fingerprints.
 * ---------------------------------------------------------------------------------------------- */
const normText = v => (v === null || v === undefined || v === '') ? '' : String(v).replace(/\s+/g, ' ').trim();

export function verifyPostState({ manifests, closeout, report, talents, trees, classes }) {
  const results = [];
  const check = (id, fn) => {
    try { results.push({ id, ok: true, detail: fn() ?? '' }); }
    catch (e) { results.push({ id, ok: false, detail: String(e.message).replace(ERR, '').split('\n')[0] }); }
  };
  const recs = manifests.flatMap(m => m.manifest.records);
  const T = new Map(talents.map(t => [t._id, t]));
  const R = new Map(trees.map(t => [t._id, t]));
  const C = new Map(classes.map(c => [c._id, c]));
  const prot = protectedIdsOf(closeout);
  const fp = report?.fingerprints;
  const idOf = r => r.identityResolution.productionRecordId ?? r.identityResolution.createRecordId;
  const claims = new Map();
  for (const t of trees) for (const id of t.system?.talentIds ?? []) claims.set(id, [...(claims.get(id) ?? []), t._id]);

  check('report fingerprints present', () => { invariant(fp?.protectedTalents && fp?.existingPreservedSurface && fp?.untouchedTrees && fp?.classes, 'committed report lacks certified fingerprints'); });
  check('talents: 1272 records, unique IDs, all 1180 canonical IDs present (932 existing + 248 new)', () => {
    invariant(talents.length === 1272, `expected 1272 talents, found ${talents.length}`);
    invariant(T.size === talents.length, 'duplicate talent IDs');
    invariant(recs.length === 1180, 'manifest identity count changed');
    const existing = recs.filter(r => r.identityResolution.productionRecordId);
    const created = recs.filter(r => r.identityResolution.createRecordId);
    invariant(existing.length === 932 && created.length === 248, 'manifest existing/create split changed');
    for (const r of recs) invariant(T.has(idOf(r)), 'missing canonical talent ' + r.canonicalIdentity);
    invariant(new Set(recs.map(idOf)).size === 1180, 'a canonical ID is assigned to two identities');
    return '932+248 present';
  });
  check('created records equal certified templates', () => {
    for (const r of recs.filter(x => x.identityResolution.createRecordId)) {
      invariant(same(T.get(r.identityResolution.createRecordId), r.createTemplate), 'created record differs from template: ' + r.canonicalIdentity);
    }
  });
  check('existing records: canonical fields equal targetFields, treeId matches on moved records', () => {
    for (const r of recs.filter(x => x.identityResolution.productionRecordId)) {
      const t = T.get(r.identityResolution.productionRecordId);
      for (const [f, v] of Object.entries(r.targetFields)) {
        invariant(normText(getPath(t, f)) === normText(v), `${r.canonicalIdentity}: ${f} differs from certified target`);
      }
      if (r.mutationFields.includes('system.treeId')) invariant(t.system.treeId === r.targetTree.treeId, 'treeId not moved: ' + r.canonicalIdentity);
    }
  });
  check('existing records: preserved surface unchanged (932 fingerprints)', () => {
    for (const r of recs.filter(x => x.identityResolution.productionRecordId)) {
      const id = r.identityResolution.productionRecordId;
      invariant(fp.existingPreservedSurface[id] === fingerprint(talentPreservedSurface(T.get(id), r.mutationFields)), `unauthorized change to preserved fields of ${r.canonicalIdentity}`);
    }
  });
  check('protected 92: deep-equal to certified pre-state snapshot', () => {
    invariant(prot.size === 92, 'protected set is not 92');
    for (const id of prot) {
      invariant(T.has(id), 'protected record missing ' + id);
      invariant(fp.protectedTalents[id] === fingerprint(T.get(id)), 'protected record changed ' + id);
    }
  });
  check('Charm Beast: Core c919d7682bd9df40 -> Dathomiri Witch, JATM bab9a1ce285f98b9 -> Beastwarden, both exist', () => {
    const core = recs.find(r => r.canonicalIdentity === 'Saga Edition Core Rulebook|Dathomiri Witch|Charm Beast');
    const jatm = recs.find(r => r.canonicalIdentity === 'Jedi Academy Training Manual|Beastwarden|Charm Beast');
    invariant(core.identityResolution.createRecordId === 'c919d7682bd9df40' && jatm.identityResolution.productionRecordId === 'bab9a1ce285f98b9', 'certified Charm Beast IDs changed');
    invariant(T.has('c919d7682bd9df40') && T.has('bab9a1ce285f98b9'), 'a Charm Beast record is missing');
    invariant(same(claims.get('c919d7682bd9df40'), [core.targetTree.treeId]), 'Core Charm Beast is not solely in Dathomiri Witch');
    invariant(same(claims.get('bab9a1ce285f98b9'), [jatm.targetTree.treeId]), 'JATM Charm Beast is not solely in Beastwarden');
    invariant(core.targetTree.treeId !== jatm.targetTree.treeId, 'Charm Beast identities share a tree');
  });
  check('membership: every canonical talent is in exactly its target tree by ID and display name', () => {
    for (const r of recs) {
      const id = idOf(r); const tree = R.get(r.targetTree.treeId);
      invariant(tree, 'target tree missing for ' + r.canonicalIdentity);
      invariant(same(claims.get(id), [r.targetTree.treeId]), `${r.canonicalIdentity} is claimed by ${JSON.stringify(claims.get(id))}, expected only ${r.targetTree.treeId}`);
      invariant((tree.system.talentNames ?? []).includes(T.get(id).name), 'target tree lacks display name for ' + r.canonicalIdentity);
      if (/^[0-9a-f]{16}$/.test(T.get(id).system.treeId ?? '')) invariant(T.get(id).system.treeId === r.targetTree.treeId, 'talent.treeId != target for ' + r.canonicalIdentity);
    }
  });
  check('trees: no duplicate IDs or dangling members; no unapproved duplicate names', () => {
    invariant(R.size === trees.length, 'duplicate tree IDs');
    // The only tolerated same-name pairs are the certified review extras vs their canonical alias.
    const allowed = new Set(closeout.reviewExtras.map(x => {
      const rec = recs.find(r => r.canonicalIdentity === x.relatedCanonicalIdentity);
      return [x.productionRecordId, idOf(rec)].sort().join('+');
    }));
    let tolerated = 0;
    for (const t of trees) {
      const ids = t.system.talentIds ?? [];
      invariant(new Set(ids).size === ids.length, 'duplicate talent IDs in tree ' + t.name);
      const byName = new Map();
      for (const id of ids) {
        invariant(T.has(id), `tree ${t.name} references missing talent ${id}`);
        const key = T.get(id).name.normalize('NFKD').replace(/[^\w]+/g, '').toLowerCase();
        byName.set(key, [...(byName.get(key) ?? []), id]);
      }
      for (const group of byName.values()) if (group.length > 1) {
        invariant(group.length === 2 && allowed.has([...group].sort().join('+')), `unapproved same-name talents in ${t.name}: ${group.join(',')}`);
        tolerated++;
      }
    }
    invariant(tolerated === closeout.reviewExtras.length, `expected ${closeout.reviewExtras.length} tolerated protected duplicate names, saw ${tolerated}`);
    return `${tolerated} protected review-extra duplicate names tolerated`;
  });
  check('trees: names array carries no stale entry and misses no member name', () => {
    for (const r of recs) {
      const tree = R.get(r.targetTree.treeId); const expect = new Set((tree.system.talentIds ?? []).map(i => T.get(i).name));
      for (const n of tree.system.talentNames ?? []) invariant(expect.has(n), `stale name "${n}" in ${tree.name}`);
      for (const n of expect) invariant((tree.system.talentNames ?? []).includes(n), `missing name "${n}" in ${tree.name}`);
    }
  });
  check('trees: 7 certified creates present with exact members; no unexpected creates', () => {
    const tcs = manifests.flatMap(m => m.manifest.treeCreates ?? []);
    invariant(tcs.length === 7, 'expected 7 certified tree creates');
    for (const tc of tcs) {
      const t = R.get(tc.createTreeId); invariant(t, 'tree create missing ' + tc.createTreeId);
      invariant(same(t, tc.createTemplate), 'created tree differs from template: ' + tc.canonicalTreeKey);
    }
    invariant(trees.length === 190 + 7 - 1, `expected 196 trees, found ${trees.length}`);
  });
  check('GenoHaradan: survivor present, obsolete removed, members intact, class access correct', () => {
    const c = manifests.flatMap(m => m.manifest.treeConsolidations ?? [])[0];
    const s = R.get(c.survivorTreeId); invariant(s, 'survivor missing');
    for (const o of c.deleteObsoleteTreeIds) invariant(!R.has(o), 'obsolete tree still present ' + o);
    invariant(s.name === c.canonicalDisplayName && s.system.talent_tree === c.canonicalDisplayName, 'survivor name not canonical');
    invariant(same([...s.system.talentIds].sort(), [...c.survivorTreePatch['system.talentIds']].sort()), 'survivor members differ from certified members');
    for (const id of s.system.talentIds) invariant(T.has(id) && T.get(id).system.treeId === c.survivorTreeId, 'member not pointing at survivor: ' + id);
    for (const t of talents) invariant(!c.deleteObsoleteTreeIds.includes(t.system?.treeId), 'talent points at obsolete tree');
    for (const cls of classes) for (const o of c.deleteObsoleteTreeIds) invariant(!JSON.stringify(cls).includes(o), 'class still references obsolete tree');
    for (const name of c.classAccess ?? []) {
      const cls = classes.find(x => x.name === name); invariant(cls && cls.system.talentTreeSourceIds.includes(c.survivorTreeId), name + ' lacks GenoHaradan access');
    }
  });
  check('trees: untouched trees identical to certified pre-state', () => {
    for (const [id, f] of Object.entries(fp.untouchedTrees)) { invariant(R.has(id) && fingerprint(R.get(id)) === f, 'untouched tree changed ' + id); }
    return `${Object.keys(fp.untouchedTrees).length} trees`;
  });
  check('classes: 5 certified access mutations present once, arrays aligned, all else unchanged', () => {
    const cms = manifests.flatMap(m => m.manifest.classAccessMutations ?? []);
    invariant(cms.length === 5, 'expected 5 class access mutations');
    for (const m of cms) {
      const cls = C.get(m.classRecordId); invariant(cls && cls.name === m.className, 'class missing/renamed ' + m.classRecordId);
      for (const [f, v] of Object.entries(m.add)) invariant(getPath(cls, f).filter(x => x === v).length === 1, `${cls.name}.${f} must hold ${v} exactly once`);
      invariant(R.has(m.treeId), 'class references missing tree ' + m.treeId);
      const n = cls.system.talent_trees.length;
      for (const f of ['talentTreeIds', 'talentTreeSourceIds', 'talentTreeUuids']) invariant(cls.system[f].length === n, `${cls.name}.${f} misaligned`);
    }
    invariant(classes.length === Object.keys(fp.classes).length, 'class count changed');
    for (const cls of classes) invariant(fp.classes[cls._id] === fingerprint(classWithoutCertifiedAdditions(cls, cms)), `class changed outside certified additions: ${cls.name}`);
  });
  return results;
}

/**
 * Runtime registry (data/generated + data/fixes talent-trees.registry.json) checks. The registry is DERIVED from the
 * packs, so the primary proof is "a fresh generation from the on-disk packs equals both on-disk files"; the semantic
 * checks below then pin the properties the migration is responsible for.
 */
export function verifyRegistry({ registryTexts, expectedText, manifests, closeout, talents, trees, classes }) {
  const results = [];
  const check = (id, fn) => {
    try { results.push({ id, ok: true, detail: fn() ?? '' }); }
    catch (e) { results.push({ id, ok: false, detail: String(e.message).replace(ERR, '').split('\n')[0] }); }
  };
  const recs = manifests.flatMap(m => m.manifest.records);
  const T = new Map(talents.map(t => [t._id, t]));
  let registry = [];
  try { registry = JSON.parse(registryTexts[0]); } catch { /* reported below */ }
  const bySource = new Map(registry.filter(e => e.sourceId).map(e => [e.sourceId, e]));

  check('registry: generated and fixes files are byte-identical and equal a fresh generation from the packs', () => {
    invariant(registryTexts.length === REGISTRY_PATHS.length && registryTexts.every(t => t === expectedText), 'registry files are stale or diverge from a fresh generation (run node tools/build-talent-tree-registry.mjs)');
  });
  check('registry: one entry per production tree, member IDs and names equal the pack, unique entry IDs', () => {
    invariant(Array.isArray(registry), 'registry is not an array');
    invariant(new Set(registry.map(e => e.id)).size === registry.length, 'duplicate registry entry IDs');
    for (const tree of trees) {
      const e = bySource.get(tree._id); invariant(e, `registry lacks tree ${tree.name} (${tree._id})`);
      invariant(same(e.talentIds, tree.system.talentIds), `registry membership differs from pack for ${tree.name}`);
      invariant(same(e.talents, tree.system.talentIds.map(id => T.get(id).name)), `registry names differ from pack for ${tree.name}`);
      invariant(e.talentCount === e.talents.length && e.displayName === tree.name, `registry count/name wrong for ${tree.name}`);
    }
    invariant(bySource.size === trees.length, 'registry holds entries for trees that no longer exist');
  });
  check('registry: 7 certified new trees represented; obsolete GenoHaradan fragment absent; consolidated tree complete', () => {
    for (const tc of manifests.flatMap(m => m.manifest.treeCreates ?? [])) {
      const e = bySource.get(tc.createTreeId); invariant(e, 'new tree missing from registry: ' + tc.canonicalTreeKey);
      invariant(same([...e.talentIds].sort(), [...tc.createTemplate.system.talentIds].sort()), 'new tree members wrong in registry: ' + tc.canonicalTreeKey);
    }
    for (const c of manifests.flatMap(m => m.manifest.treeConsolidations ?? [])) {
      for (const o of c.deleteObsoleteTreeIds) invariant(!bySource.has(o), 'obsolete tree still in registry ' + o);
      for (const o of c.obsoleteTrees ?? []) invariant(!registry.some(e => e.id === registrySlug(o.treeName)), 'obsolete tree alias still in registry: ' + o.treeName);
      const e = bySource.get(c.survivorTreeId); invariant(e && e.displayName === c.canonicalDisplayName, 'consolidated tree missing/misnamed in registry');
      invariant(same([...e.talentIds].sort(), [...c.survivorTreePatch['system.talentIds']].sort()), 'consolidated tree members wrong in registry');
      invariant(registry.filter(x => registrySlug(x.displayName) === registrySlug(c.canonicalDisplayName)).length === 1, 'GenoHaradan is represented more than once');
    }
  });
  check('registry: Charm Beast identities are separate, ID-addressed entries (Core Dathomiri Witch vs JATM Beastwarden)', () => {
    const core = bySource.get(recs.find(r => r.canonicalIdentity === 'Saga Edition Core Rulebook|Dathomiri Witch|Charm Beast').targetTree.treeId);
    const jatm = bySource.get(recs.find(r => r.canonicalIdentity === 'Jedi Academy Training Manual|Beastwarden|Charm Beast').targetTree.treeId);
    invariant(core?.talentIds.includes('c919d7682bd9df40') && !core.talentIds.includes('bab9a1ce285f98b9'), 'Core entry must hold only the Core Charm Beast ID');
    invariant(jatm?.talentIds.includes('bab9a1ce285f98b9') && !jatm.talentIds.includes('c919d7682bd9df40'), 'JATM entry must hold only the JATM Charm Beast ID');
    invariant(core.id !== jatm.id && core.sourceId !== jatm.sourceId, 'Charm Beast trees share a registry entry');
  });
  check('registry: same-name trees (Squad Leader x2) get distinct entries keyed by sourceId', () => {
    const groups = new Map();
    for (const t of trees) groups.set(registrySlug(t.name), [...(groups.get(registrySlug(t.name)) ?? []), t._id]);
    for (const ids of groups.values()) if (ids.length > 1) {
      invariant(new Set(ids.map(id => bySource.get(id).id)).size === ids.length, 'same-name trees share a registry id');
    }
  });
  check('registry: class access matches the class pack, including the 5 certified access mutations', () => {
    for (const tree of trees) {
      const expected = classes.filter(c => (c.system.talent_trees ?? []).includes(tree._id) || (c.system.talentTreeSourceIds ?? []).includes(tree._id)).map(c => c.name);
      invariant(same([...(bySource.get(tree._id).classAccess ?? [])].sort(), [...new Set(expected)].sort()), `classAccess differs for ${tree.name}`);
    }
    for (const m of manifests.flatMap(x => x.manifest.classAccessMutations ?? [])) {
      invariant(bySource.get(m.treeId).classAccess.includes(m.className), `${m.className} missing from ${m.treeName} classAccess`);
    }
  });
  check('registry: legacy alias entries (no sourceId) are the only entries not backed by a pack tree', () => {
    for (const e of registry.filter(x => !x.sourceId)) invariant(!trees.some(t => registrySlug(t.name) === e.id), 'legacy alias shadows a real tree: ' + e.id);
  });
  return results;
}

export function exactPostStateResults(texts, report, registryTexts = []) {
  const sha = { ...packBlobShas(texts), registry: gitBlobSha(registryTexts[0] ?? ''), registryFixes: gitBlobSha(registryTexts[1] ?? '') };
  const rel = { ...PACKS, registry: REGISTRY_PATHS[0], registryFixes: REGISTRY_PATHS[1] };
  return Object.keys(rel).map(k => ({
    id: `exact certified blob: ${rel[k]}`, ok: report.postState?.[k] === sha[k],
    detail: sha[k] === report.postState?.[k] ? sha[k] : `on-disk ${sha[k]} != certified ${report.postState?.[k]}`
  }));
}

export const readRegistryTexts = root => REGISTRY_PATHS.map(rel => (fs.existsSync(path.join(root, rel)) ? readText(rel, root) : ''));

/* ------------------------------------------------------------------------------------------------
 * Report
 * ---------------------------------------------------------------------------------------------- */
export function buildReport({ manifests, closeout, texts, before, projection, root = ROOT }) {
  const out = serializeProjection(projection, texts);
  const preRegistry = readRegistryTexts(root);
  const preSha = { ...packBlobShas(texts), registry: gitBlobSha(preRegistry[0]), registryFixes: gitBlobSha(preRegistry[1]) };
  const registryText = serializeRegistry(generateFromPackTexts({ texts: out, previousRegistry: loadPreviousRegistry(root), manifests }));
  const postSha = { ...packBlobShas(out), registry: gitBlobSha(registryText), registryFixes: gitBlobSha(registryText) };
  const textQuality = summarizeTextQuality(scanManifestText(manifests), pendingSourceTextCorrections(root));
  return {
    schemaVersion: 2,
    phase: '3C-1',
    status: textQuality.gatingFields === 0 && textQuality.pendingSourceTextCorrections === 0 ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_BLOCKED_PHASE3B_TEXT_DEFECTS',
    productionMutationPerformed: false,
    inputAuthority: {
      phase3bCloseout: CLOSEOUT_PATH,
      sourcebooks: manifests.length,
      startingTalentRecords: before.talents.length,
      startingTalentTrees: before.trees.length,
      startingClassRecords: before.classes.length
    },
    preState: preSha,
    postState: postSha,
    projectedState: {
      talentRecords: projection.talents.length,
      talentTrees: projection.trees.length,
      classRecords: projection.classes.length
    },
    operations: projection.operationCounts,
    dispositions: projection.dispositionCounts,
    protections: {
      reviewExtrasPreserved: closeout.reviewExtras.length,
      phase3dDeferredPreserved: closeout.productionOnlyDeferred.length,
      protectedTalentRecordsUnchanged: projection.protectedSnapshots.size,
      charmBeastIdentitySplitVerified: true
    },
    fingerprints: computeCertifiedFingerprints({ manifests, closeout, before }),
    textQuality,
    acceptance: {
      certifiedTextFreeOfOcrArtifacts: textQuality.gatingFields === 0,
      noSourceTextCorrectionAwaitingPdf: textQuality.pendingSourceTextCorrections === 0,
      all14BookManifestsRebuiltInCheckMode: true,
      productionDriftChecksPassed: true,
      noGeneratedTalentIdCollisions: true,
      noGeneratedTreeIdCollisions: true,
      allCanonicalTalentsPresentInTargetTrees: true,
      protectedRecordsUnchanged: true,
      productionPacksWritten: false
    }
  };
}

/* ------------------------------------------------------------------------------------------------
 * CLI
 * ---------------------------------------------------------------------------------------------- */
function requirePreState(root) {
  const { state, sha } = detectPackState(root);
  invariant(state === 'PRE_STATE',
    state === 'POST_STATE'
      ? 'already applied: production packs are the certified Phase 3C post-state; use --verify (pre-state fingerprint mismatch)'
      : state === 'POST_3D_STATE' || state === 'POST_3E4_STATE' ? 'already applied: production packs are a certified post-state later than Phase 3C'
      : `pre-state fingerprint mismatch: packs match neither the Phase 3B certified pre-state nor the Phase 3C post-state (talents ${sha.talents}, trees ${sha.trees})`);
}

function loadPreStateInputs(root) {
  // Re-derive every manifest from the certified pre-state packs; this throws on any drift or stale manifest.
  return import('./build-talent-phase-3b-manifest.mjs').then(({ buildBookManifest }) => {
    const manifests = MANIFEST_SPECS.map(([bookKey, manifestPath]) => ({ bookKey, manifestPath, manifest: buildBookManifest(bookKey, { check: true }) }));
    const closeout = readJson(CLOSEOUT_PATH, root);
    const texts = loadPackTexts(root);
    const before = { talents: parseNdjson(texts.talents), trees: parseNdjson(texts.trees), classes: parseNdjson(texts.classes) };
    return { manifests, closeout, texts, before };
  });
}

function printResults(results) {
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}${r.detail ? '  [' + r.detail + ']' : ''}`);
  const bad = results.filter(r => !r.ok);
  return bad.length;
}

export async function main(argv = process.argv.slice(2), root = ROOT) {
  const has = flag => argv.includes(flag);
  const modes = ['--apply', '--verify', '--report', '--check', '--status'].filter(has);
  invariant(!has('--allow-ocr-artifacts') || has('--apply'), '--allow-ocr-artifacts is only meaningful with --apply');
  invariant(modes.length <= 1, 'choose at most one of --apply --verify --report --check --status');
  if (has('--write')) throw new Error(ERR + '--write is not a mode; use --apply');

  if (has('--status')) { const { state } = detectPackState(root); console.log(state); return state === 'UNKNOWN_STATE' ? 2 : 0; }

  if (has('--verify')) {
    const { state } = detectPackState(root);
    invariant(state !== 'PRE_STATE', 'production is still the certified pre-state; nothing to verify (use --check for the dry-run report)');
    invariant(state !== 'POST_3D_STATE' && state !== 'POST_3E4_STATE', 'packs are a later certified post-state, which supersedes this verifier; use tools/apply-talent-phase-3d.mjs / apply-talent-phase-3e4.mjs --verify --exact');
    const closeout = readJson(CLOSEOUT_PATH, root);
    const manifests = loadCommittedManifests(root);
    const report = readJson(REPORT_PATH, root);
    const texts = loadPackTexts(root);
    const packs = { talents: parseNdjson(texts.talents), trees: parseNdjson(texts.trees), classes: parseNdjson(texts.classes) };
    let results = verifyPostState({ manifests, closeout, report, ...packs });
    const registryTexts = readRegistryTexts(root);
    const expectedText = serializeRegistry(generateFromPackTexts({ texts, previousRegistry: registryTexts[0] ? JSON.parse(registryTexts[0]) : [], manifests }));
    results = results.concat(verifyRegistry({ registryTexts, expectedText, manifests, closeout, ...packs }));
    if (has('--exact')) results = results.concat(exactPostStateResults(texts, report, registryTexts));
    const bad = printResults(results);
    console.log(bad ? `\n[talent-phase-3c] verify FAILED (${bad})` : `\n[talent-phase-3c] verify PASS (${results.length} checks; no files written)`);
    return bad ? 1 : 0;
  }

  // Everything below runs the Phase 3B builder and therefore requires the certified pre-state.
  requirePreState(root);
  const inputs = await loadPreStateInputs(root);
  const projection = projectPhase3C({ manifests: inputs.manifests, closeout: inputs.closeout, ...inputs.before });
  const report = buildReport({ manifests: inputs.manifests, closeout: inputs.closeout, texts: inputs.texts, before: inputs.before, projection, root });
  const serialized = JSON.stringify(report, null, 2) + '\n';

  if (has('--check')) {
    invariant(fs.existsSync(path.join(root, REPORT_PATH)), 'missing committed dry-run report (run --report)');
    invariant(readText(REPORT_PATH, root) === serialized, 'committed dry-run report is stale (run --report and review the diff)');
    console.log('[talent-phase-3c] PASS: committed dry-run report is current');
    return 0;
  }
  if (has('--report')) {
    fs.writeFileSync(path.join(root, REPORT_PATH), serialized, 'utf8');
    console.log('[talent-phase-3c] wrote ' + REPORT_PATH);
    return 0;
  }
  if (has('--apply')) {
    // 0. never write certified text that carries OCR artifacts (see tools/audit-talent-phase-3c-text-quality.mjs)
    const quality = scanManifestText(inputs.manifests);
    const pending = pendingSourceTextCorrections(root);
    if ((quality.gating.length || pending.length) && !has('--allow-ocr-artifacts')) {
      const q = summarizeTextQuality(quality, pending);
      const reasons = [];
      if (q.gatingFields) reasons.push(`${q.gatingFields} certified target text fields in ${q.gatingRecords} records carry OCR artifacts ${JSON.stringify(q.bySignature)}`);
      if (pending.length) reasons.push(`${pending.length} source-text corrections still require the rendered PDF (${pending.map(p => p.canonicalIdentity).join('; ')})`);
      throw new Error(ERR + 'refusing to apply: ' + reasons.join('; and ') + '; Phase 3B text must be corrected and PDF-confirmed first ' +
        '(node tools/audit-talent-phase-3c-text-quality.mjs). --allow-ocr-artifacts exists for scratch validation only');
    }
    // 1. the committed report must be the report of THIS pre-state
    invariant(fs.existsSync(path.join(root, REPORT_PATH)) && readText(REPORT_PATH, root) === serialized,
      'committed dry-run report is missing or stale; refusing to write production packs');
    // 2. the global closeout checker must pass (subprocess: it re-runs every builder check)
    const closeoutRun = spawnSync(process.execPath, [path.join(root, 'tools/check-talent-phase-3b-global-closeout.mjs')], { cwd: root, encoding: 'utf8' });
    invariant(closeoutRun.status === 0, 'Phase 3B global closeout checker failed:\n' + (closeoutRun.stderr || closeoutRun.stdout).slice(0, 600));
    // 3. prove the projected state before writing a byte
    const out = serializeProjection(projection, inputs.texts);
    const pre = verifyPostState({
      manifests: loadCommittedManifests(root), closeout: inputs.closeout, report,
      talents: parseNdjson(out.talents), trees: parseNdjson(out.trees), classes: parseNdjson(out.classes)
    });
    const registryText = serializeRegistry(generateFromPackTexts({ texts: out, previousRegistry: loadPreviousRegistry(root), manifests: inputs.manifests }));
    const preRegistry = verifyRegistry({
      registryTexts: REGISTRY_PATHS.map(() => registryText), expectedText: registryText,
      manifests: loadCommittedManifests(root), closeout: inputs.closeout,
      talents: parseNdjson(out.talents), trees: parseNdjson(out.trees), classes: parseNdjson(out.classes)
    });
    const failed = pre.concat(preRegistry).filter(r => !r.ok);
    invariant(failed.length === 0, 'projected state failed verification: ' + failed.map(f => `${f.id}: ${f.detail}`).join(' | '));
    invariant(gitBlobSha(registryText) === report.postState.registry, 'projected registry differs from the committed report');
    // 4. write only the certified outputs: three packs + the derived runtime registry (both copies)
    for (const [key, rel] of Object.entries(PACKS)) fs.writeFileSync(path.join(root, rel), out[key], 'utf8');
    for (const rel of REGISTRY_PATHS) fs.writeFileSync(path.join(root, rel), registryText, 'utf8');
    console.log('[talent-phase-3c] APPLIED: packs/talents.db, packs/talent_trees.db, packs/classes.db written');
    console.log('[talent-phase-3c] APPLIED: ' + REGISTRY_PATHS.join(', ') + ' regenerated');
    console.log('[talent-phase-3c] next: node tools/apply-talent-phase-3c.mjs --verify --exact');
    return 0;
  }

  process.stdout.write(serialized);
  console.log('[talent-phase-3c] PASS: 932 existing + 248 created => 1272 projected talents');
  console.log('[talent-phase-3c] PASS: 7 tree creates + 1 consolidation + 5 class-access mutations');
  console.log('[talent-phase-3c] PASS: 2 review extras + 90 Phase 3D deferred records unchanged');
  console.log('[talent-phase-3c] PASS: no production packs were written (dry run)');
  return 0;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().then(code => process.exit(code), err => { console.error(err.message.startsWith(ERR) ? 'Error: ' + err.message : err.stack); process.exit(1); });
}
