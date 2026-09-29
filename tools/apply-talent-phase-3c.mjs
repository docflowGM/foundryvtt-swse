#!/usr/bin/env node
/**
 * Phase 3C-1 dry-run talent production applicator.
 *
 * This tool MUST NOT write production packs. It re-runs the certified Phase 3B
 * manifests, applies every planned mutation in memory, and fails closed on drift,
 * identity collisions, protected-record changes, or reconciliation mismatch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBookManifest } from './build-talent-phase-3b-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLOSEOUT_PATH = 'data/audits/talent-phase-3b-global-closeout.json';
const REPORT_PATH = 'data/audits/talent-phase-3c-dry-run-report.json';
const MANIFEST_SPECS = [
  ['clone-wars','data/audits/talent-phase-3b-clone-wars-campaign-guide-manifest.json'],
  ['core','data/audits/talent-phase-3b-core-rulebook-manifest.json'],
  ['force-unleashed','data/audits/talent-phase-3b-force-unleashed-campaign-guide-manifest.json'],
  ['war','data/audits/talent-phase-3b-galaxy-at-war-manifest.json'],
  ['intrigue','data/audits/talent-phase-3b-galaxy-of-intrigue-manifest.json'],
  ['jatm','data/audits/talent-phase-3b-jedi-academy-training-manual-manifest.json'],
  ['kotor','data/audits/talent-phase-3b-knights-of-the-old-republic-campaign-guide-manifest.json'],
  ['legacy','data/audits/talent-phase-3b-legacy-era-campaign-guide-manifest.json'],
  ['rebellion','data/audits/talent-phase-3b-rebellion-era-campaign-guide-manifest.json'],
  ['scavengers','data/audits/talent-phase-3b-scavengers-guide-to-droids-manifest.json'],
  ['scum','data/audits/talent-phase-3b-scum-and-villainy-manifest.json'],
  ['starships','data/audits/talent-phase-3b-starships-of-the-galaxy-manifest.json'],
  ['threats','data/audits/talent-phase-3b-threats-of-the-galaxy-manifest.json'],
  ['unknown','data/audits/talent-phase-3b-unknown-regions-manifest.json']
];

const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const parseNdjson = raw => raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);
const clone = value => structuredClone(value);
const invariant = (ok, message) => { if (!ok) throw new Error('[talent-phase-3c-dry-run] ' + message); };
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const getPath = (obj, dotted) => dotted.split('.').reduce((v,k) => v?.[k], obj);
const setPath = (obj, dotted, value) => {
  const parts = dotted.split('.');
  let cur = obj;
  for (const key of parts.slice(0,-1)) {
    if (!cur[key] || typeof cur[key] !== 'object' || Array.isArray(cur[key])) cur[key] = {};
    cur = cur[key];
  }
  cur[parts.at(-1)] = clone(value);
};
const pushUnique = (arr, value) => { if (!arr.includes(value)) arr.push(value); };
const removeValue = (arr, value) => { let i; while ((i = arr.indexOf(value)) >= 0) arr.splice(i,1); };
const STRUCTURAL_MUTATION_FIELDS = new Set(['_record_create', 'system.treeId']);

if (process.argv.includes('--write')) {
  throw new Error('[talent-phase-3c-dry-run] --write is intentionally unavailable in Phase 3C-1');
}

const manifests = MANIFEST_SPECS.map(([bookKey, manifestPath]) => ({
  bookKey,
  manifestPath,
  manifest: buildBookManifest(bookKey, {check:true})
}));
const closeout = JSON.parse(readText(CLOSEOUT_PATH));
const talentsBefore = parseNdjson(readText('packs/talents.db'));
const treesBefore = parseNdjson(readText('packs/talent_trees.db'));
const classesBefore = parseNdjson(readText('packs/classes.db'));

invariant(closeout.status === 'GLOBAL_CLOSEOUT_CERTIFIED', 'Phase 3B closeout is not certified');
invariant(closeout.phase3cGate?.ready === true, 'Phase 3C gate is not ready');
invariant(talentsBefore.length === 1024, 'expected 1024 starting talent records');
invariant(treesBefore.length > 0, 'talent tree pack is empty');
invariant(classesBefore.length > 0, 'class pack is empty');

const talents = clone(talentsBefore);
const trees = clone(treesBefore);
const classes = clone(classesBefore);
const talentById = new Map(talents.map(x => [x._id,x]));
const treeById = new Map(trees.map(x => [x._id,x]));
const classById = new Map(classes.map(x => [x._id,x]));

const protectedIds = new Set([
  ...closeout.reviewExtras.map(x => x.productionRecordId),
  ...closeout.productionOnlyDeferred.map(x => x.productionRecordId)
]);
const protectedSnapshots = new Map([...protectedIds].map(id => {
  const rec = talentById.get(id);
  invariant(rec, 'protected record missing before dry run: ' + id);
  return [id, JSON.stringify(rec)];
}));

const operationCounts = {
  existingTalentUpdates: 0,
  talentCreates: 0,
  treeCreates: 0,
  treeConsolidations: 0,
  classAccessMutations: 0,
  treeMembershipMoves: 0
};
const dispositionCounts = {};

for (const {manifest} of manifests) {
  for (const create of manifest.treeCreates ?? []) {
    invariant(!treeById.has(create.createTreeId), 'tree create ID already exists: ' + create.createTreeId);
    const doc = clone(create.createTemplate);
    invariant(doc?._id === create.createTreeId, 'tree create template ID mismatch: ' + create.canonicalTreeKey);
    trees.push(doc);
    treeById.set(doc._id, doc);
    operationCounts.treeCreates++;
  }

  for (const record of manifest.records) {
    dispositionCounts[record.disposition] = (dispositionCounts[record.disposition] ?? 0) + 1;
    const existingId = record.identityResolution?.productionRecordId ?? null;
    const createId = record.identityResolution?.createRecordId ?? null;
    let talent;
    let originalName = null;

    if (existingId) {
      talent = talentById.get(existingId);
      invariant(talent, 'existing production record missing: ' + existingId + ' for ' + record.canonicalIdentity);
      invariant(!protectedIds.has(existingId), 'certified mutation targets protected record: ' + existingId);
      originalName = talent.name;

      for (const field of record.mutationFields ?? []) {
        if (STRUCTURAL_MUTATION_FIELDS.has(field)) continue;
        invariant(Object.prototype.hasOwnProperty.call(record.targetFields ?? {}, field),
          'targetFields missing mutation field ' + field + ' for ' + record.canonicalIdentity);
        if (record.currentCanonicalFields && Object.prototype.hasOwnProperty.call(record.currentCanonicalFields, field)) {
          const actualCurrent = getPath(talent, field) ?? null;
          invariant(same(actualCurrent, record.currentCanonicalFields[field]),
            'production drift at ' + field + ' for ' + record.canonicalIdentity);
        }
        setPath(talent, field, record.targetFields[field]);
      }
      if ((record.mutationFields ?? []).includes('system.treeId')) {
        setPath(talent, 'system.treeId', record.targetTree.treeId);
      }
      operationCounts.existingTalentUpdates++;
    } else {
      invariant(createId, 'record has neither existing nor create ID: ' + record.canonicalIdentity);
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
        removeValue(oldTree.system.talentIds ??= [], talent._id);
        removeValue(oldTree.system.talentNames ??= [], originalName);
        removeValue(oldTree.system.talentNames, record.name);
        operationCounts.treeMembershipMoves++;
      }
      if (tm.addToTreeId) {
        const targetTree = treeById.get(tm.addToTreeId);
        invariant(targetTree, 'tree mutation target missing: ' + tm.addToTreeId);
        pushUnique(targetTree.system.talentIds ??= [], tm.addTalentId ?? talent._id);
        if (tm.replaceTalentName) {
          removeValue(targetTree.system.talentNames ??= [], tm.replaceTalentName.from);
          pushUnique(targetTree.system.talentNames, tm.replaceTalentName.to);
        } else {
          pushUnique(targetTree.system.talentNames ??= [], tm.addTalentName ?? talent.name);
        }
      }
    }
  }

  for (const consolidation of manifest.treeConsolidations ?? []) {
    const survivor = treeById.get(consolidation.survivorTreeId);
    invariant(survivor, 'consolidation survivor missing: ' + consolidation.survivorTreeId);
    for (const [field,value] of Object.entries(consolidation.survivorTreePatch ?? {})) setPath(survivor, field, value);
    for (const obsoleteId of consolidation.deleteObsoleteTreeIds ?? []) {
      const obsolete = treeById.get(obsoleteId);
      invariant(obsolete, 'obsolete consolidation tree missing: ' + obsoleteId);
      invariant((obsolete.system?.talentIds ?? []).every(id => !protectedIds.has(id)),
        'consolidation would orphan protected talent from ' + obsoleteId);
      treeById.delete(obsoleteId);
      const index = trees.findIndex(x => x._id === obsoleteId);
      invariant(index >= 0, 'obsolete tree not found in array: ' + obsoleteId);
      trees.splice(index,1);
    }
    operationCounts.treeConsolidations++;
  }

  for (const mutation of manifest.classAccessMutations ?? []) {
    const cls = classById.get(mutation.classRecordId);
    invariant(cls, 'class record missing: ' + mutation.classRecordId);
    invariant(cls.name === mutation.className, 'class name drift for ' + mutation.classRecordId);
    for (const [field,value] of Object.entries(mutation.add ?? {})) {
      const arr = getPath(cls, field);
      invariant(Array.isArray(arr), 'class access target is not an array: ' + mutation.classRecordId + ' ' + field);
      pushUnique(arr, value);
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
invariant(new Set(talents.map(x => x._id)).size === talents.length, 'duplicate talent IDs after dry run');
invariant(new Set(trees.map(x => x._id)).size === trees.length, 'duplicate tree IDs after dry run');

for (const {manifest} of manifests) {
  for (const record of manifest.records) {
    const id = record.identityResolution?.productionRecordId ?? record.identityResolution?.createRecordId;
    const talent = talentById.get(id);
    const tree = treeById.get(record.targetTree?.treeId);
    invariant(talent, 'final canonical talent missing: ' + record.canonicalIdentity);
    invariant(tree, 'final canonical target tree missing: ' + record.canonicalIdentity);
    invariant((tree.system?.talentIds ?? []).includes(id), 'final target tree lacks talent ID: ' + record.canonicalIdentity);
    invariant((tree.system?.talentNames ?? []).includes(record.name), 'final target tree lacks talent name: ' + record.canonicalIdentity);
    if ((record.mutationFields ?? []).includes('system.treeId')) {
      invariant(talent.system?.treeId === record.targetTree.treeId,
        'final talent treeId mismatch: ' + record.canonicalIdentity);
    }
  }
}

for (const [id,before] of protectedSnapshots) {
  invariant(JSON.stringify(talentById.get(id)) === before, 'protected production record changed: ' + id);
}

const coreCharm = manifests.find(x => x.bookKey === 'core').manifest.records
  .find(x => x.canonicalIdentity === 'Saga Edition Core Rulebook|Dathomiri Witch|Charm Beast');
const jatmCharm = manifests.find(x => x.bookKey === 'jatm').manifest.records
  .find(x => x.canonicalIdentity === 'Jedi Academy Training Manual|Beastwarden|Charm Beast');
invariant(coreCharm?.identityResolution?.createRecordId === 'c919d7682bd9df40', 'Core Charm Beast split ID changed');
invariant(jatmCharm?.identityResolution?.productionRecordId === 'bab9a1ce285f98b9', 'JATM Charm Beast preserved ID changed');
invariant(talentById.has('c919d7682bd9df40') && talentById.has('bab9a1ce285f98b9'), 'Charm Beast split not present after dry run');

const report = {
  schemaVersion: 1,
  phase: '3C-1',
  status: 'DRY_RUN_CERTIFIED',
  productionMutationPerformed: false,
  inputAuthority: {
    phase3bCloseout: CLOSEOUT_PATH,
    sourcebooks: manifests.length,
    startingTalentRecords: talentsBefore.length,
    startingTalentTrees: treesBefore.length,
    startingClassRecords: classesBefore.length
  },
  projectedState: {
    talentRecords: talents.length,
    talentTrees: trees.length,
    classRecords: classes.length
  },
  operations: operationCounts,
  dispositions: dispositionCounts,
  protections: {
    reviewExtrasPreserved: closeout.reviewExtras.length,
    phase3dDeferredPreserved: closeout.productionOnlyDeferred.length,
    protectedTalentRecordsUnchanged: protectedSnapshots.size,
    charmBeastIdentitySplitVerified: true
  },
  acceptance: {
    all14BookManifestsRebuiltInCheckMode: true,
    productionDriftChecksPassed: true,
    noGeneratedTalentIdCollisions: true,
    noGeneratedTreeIdCollisions: true,
    allCanonicalTalentsPresentInTargetTrees: true,
    protectedRecordsUnchanged: true,
    productionPacksWritten: false
  }
};

const serialized = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) {
  invariant(fs.existsSync(path.join(ROOT, REPORT_PATH)), 'missing committed dry-run report');
  invariant(readText(REPORT_PATH) === serialized, 'committed dry-run report is stale');
} else if (process.argv.includes('--report')) {
  fs.writeFileSync(path.join(ROOT, REPORT_PATH), serialized, 'utf8');
} else {
  process.stdout.write(serialized);
}

console.log('[talent-phase-3c-dry-run] PASS: 932 existing + 248 created => 1272 projected talents');
console.log('[talent-phase-3c-dry-run] PASS: 7 tree creates + 1 consolidation + 5 class-access mutations');
console.log('[talent-phase-3c-dry-run] PASS: 2 review extras + 90 Phase 3D deferred records unchanged');
console.log('[talent-phase-3c-dry-run] PASS: no production packs were written');
