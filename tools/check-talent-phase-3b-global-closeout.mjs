#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBookManifest } from './build-talent-phase-3b-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLOSEOUT_PATH = 'data/audits/talent-phase-3b-global-closeout.json';
const MANIFEST_SPECS = [
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

const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const parseNdjson = raw => raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);
const invariant = (ok, message) => {
  if (!ok) throw new Error('[talent-phase-3b-global] ' + message);
};
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const assertSame = (actual, expected, label) => {
  invariant(sameJson(actual, expected), label + ' mismatch');
};

const manifests = MANIFEST_SPECS.map(([bookKey, manifestPath]) => ({
  bookKey,
  manifestPath,
  manifest: buildBookManifest(bookKey, {check: true})
}));
const closeout = JSON.parse(readText(CLOSEOUT_PATH));
const canonical = JSON.parse(readText('data/canonical/talents.json'));
const talents = parseNdjson(readText('packs/talents.db'));
const trees = parseNdjson(readText('packs/talent_trees.db'));
const registry = JSON.parse(readText('data/audits/talent-canonical-tree-registry.json'));

invariant(closeout.phase === '3B', 'closeout phase must be 3B');
invariant(closeout.status === 'GLOBAL_CLOSEOUT_CERTIFIED', 'closeout status is not certified');
invariant(closeout.phase3cGate?.ready === true, 'Phase 3C gate is not marked ready');
invariant(manifests.length === 14, 'expected 14 sourcebook manifests');
invariant(canonical.records.length === 1180, 'canonical authority must contain 1180 identities');

const totals = {
  claims: 0,
  owned: 0,
  refs: 0,
  dispositions: {},
  extras: 0,
  treeCreates: 0,
  treeConsolidations: 0,
  classAccessMutations: 0
};
const canonicalSet = new Set(canonical.records.map(r => r.canonicalIdentity));
const manifestSet = new Set();
const ownerByCanonical = new Map(canonical.records.map(r => [
  r.canonicalIdentity,
  r.provenance?.primaryPublication?.sourcebook ?? r.source
]));
const productionAssignments = new Map();
const createIds = new Map();
const generatedTreeIds = new Map();
const reviewExtraIds = new Set();
const references = [];
const reviewExtras = [];
const treeCreates = [];
const treeConsolidations = [];
const classAccessMutations = [];
const specialOperations = {
  CORRECT_TREE: [],
  IDENTITY_SPLIT: [],
  REMOVE_CONTAMINATION: []
};

for (const {manifest: m} of manifests) {
  totals.claims += m.counts.certifiedPublicationClaims;
  totals.owned += m.counts.ownedCanonicalIdentities;
  totals.refs += m.counts.referenceOnlyPublicationClaims;
  totals.extras += m.counts.productionExtras ?? 0;
  totals.treeCreates += m.counts.productionTreeCreates ?? 0;
  totals.treeConsolidations += m.counts.productionTreeConsolidations ?? 0;
  totals.classAccessMutations += m.counts.classAccessMutations ?? 0;

  for (const [disposition, count] of Object.entries(m.counts.dispositions ?? {})) {
    totals.dispositions[disposition] = (totals.dispositions[disposition] ?? 0) + count;
  }

  for (const record of m.records) {
    manifestSet.add(record.canonicalIdentity);

    const productionId = record.identityResolution?.productionRecordId;
    if (productionId) {
      const bucket = productionAssignments.get(productionId) ?? [];
      bucket.push(record.canonicalIdentity);
      productionAssignments.set(productionId, bucket);
    }

    const createId = record.identityResolution?.createRecordId;
    if (createId) {
      const bucket = createIds.get(createId) ?? [];
      bucket.push(record.canonicalIdentity);
      createIds.set(createId, bucket);
    }

    if (specialOperations[record.disposition]) {
      specialOperations[record.disposition].push({
        sourcebook: m.sourcebook,
        canonicalIdentity: record.canonicalIdentity,
        productionRecordId: productionId ?? null,
        createRecordId: createId ?? null,
        targetTree: record.targetTree,
        sourceTreeClaims: record.identityResolution?.currentTreeClaims ?? [],
        phase2Flags: record.phase2Flags ?? []
      });
    }
  }

  for (const extra of m.productionExtras ?? []) {
    reviewExtraIds.add(extra.productionRecordId);
    reviewExtras.push({sourcebook: m.sourcebook, ...extra});
  }

  for (const publication of m.referenceOnlyPublications ?? []) {
    references.push({sourcebook: m.sourcebook, ...publication});
  }

  for (const treeCreate of m.treeCreates ?? []) {
    const bucket = generatedTreeIds.get(treeCreate.createTreeId) ?? [];
    bucket.push(treeCreate.canonicalTreeKey);
    generatedTreeIds.set(treeCreate.createTreeId, bucket);
    treeCreates.push({
      sourcebook: m.sourcebook,
      canonicalTreeKey: treeCreate.canonicalTreeKey,
      createTreeId: treeCreate.createTreeId,
      displayName: treeCreate.displayName,
      classAccess: treeCreate.classAccess ?? [],
      memberTalentIds: treeCreate.createTemplate?.system?.talentIds ?? [],
      memberTalentNames: treeCreate.createTemplate?.system?.talentNames ?? []
    });
  }

  for (const consolidation of m.treeConsolidations ?? []) {
    treeConsolidations.push({
      sourcebook: m.sourcebook,
      canonicalTreeKey: consolidation.canonicalTreeKey,
      survivorTreeId: consolidation.survivorTreeId,
      survivorCurrentName: consolidation.survivorCurrentName,
      canonicalDisplayName: consolidation.canonicalDisplayName,
      deleteObsoleteTreeIds: consolidation.deleteObsoleteTreeIds ?? []
    });
  }

  for (const mutation of m.classAccessMutations ?? []) {
    classAccessMutations.push({
      sourcebook: m.sourcebook,
      classRecordId: mutation.classRecordId,
      className: mutation.className,
      canonicalTreeKey: mutation.canonicalTreeKey,
      treeId: mutation.treeId,
      treeName: mutation.treeName
    });
  }
}

invariant(totals.claims === 1182, 'publication claims must total 1182');
invariant(totals.owned === 1180, 'owned identities must total 1180');
invariant(totals.refs === 2, 'reference-only publication claims must total 2');
assertSame(totals.dispositions, {
  UPDATE_CONTENT: 725,
  UPDATE_METADATA: 146,
  CREATE: 236,
  REMOVE_CONTAMINATION: 38,
  CORRECT_TREE: 23,
  IDENTITY_SPLIT: 12
}, 'global disposition counts');

invariant(manifestSet.size === canonicalSet.size, 'manifest/canonical identity set size differs');
invariant([...canonicalSet].every(id => manifestSet.has(id)), 'canonical identity missing from manifests');
invariant([...manifestSet].every(id => canonicalSet.has(id)), 'manifest contains noncanonical owned identity');

for (const {manifest: m} of manifests) {
  for (const record of m.records) {
    invariant(ownerByCanonical.get(record.canonicalIdentity) === m.sourcebook,
      'owner mismatch for ' + record.canonicalIdentity);
  }
}

const duplicateProductionAssignments = [...productionAssignments].filter(([, claims]) => claims.length > 1);
const duplicateCreateIds = [...createIds].filter(([, claims]) => claims.length > 1);
const duplicateTreeCreateIds = [...generatedTreeIds].filter(([, keys]) => keys.length > 1);
const productionIds = new Set(talents.map(t => t._id));
const productionTreeIds = new Set(trees.map(t => t._id));

invariant(duplicateProductionAssignments.length === 0, 'one production record maps to multiple canonical identities');
invariant(duplicateCreateIds.length === 0, 'generated talent ID collision across manifests');
invariant([...createIds.keys()].every(id => !productionIds.has(id)), 'generated talent ID collides with production');
invariant(duplicateTreeCreateIds.length === 0, 'generated tree ID collision across manifests');
invariant([...generatedTreeIds.keys()].every(id => !productionTreeIds.has(id)), 'generated tree ID collides with production');

invariant(productionAssignments.size === 932, 'expected 932 existing canonical production records');
invariant(createIds.size === 248, 'expected 248 generated talent records');
invariant(productionAssignments.size + createIds.size === 1180, 'existing + generated canonical identities must equal 1180');

const treeById = new Map(trees.map(tree => [tree._id, tree]));
const registryByTreeId = new Map();
const treeClaims = new Map();
for (const entry of registry.entries ?? []) {
  for (const treeId of entry.repoTreeIds ?? []) registryByTreeId.set(treeId, entry);
}
for (const tree of trees) {
  for (const talentId of tree.system?.talentIds ?? []) {
    const bucket = treeClaims.get(talentId) ?? [];
    bucket.push(tree);
    treeClaims.set(talentId, bucket);
  }
}

const consumed = new Set(productionAssignments.keys());
const deferred = talents
  .filter(talent => !consumed.has(talent._id) && !reviewExtraIds.has(talent._id))
  .map(talent => {
    const claims = treeClaims.get(talent._id) ?? [];
    const treeId = talent.system?.treeId ?? claims[0]?._id ?? null;
    const tree = treeById.get(treeId) ?? claims[0] ?? null;
    const registryEntry = treeId ? registryByTreeId.get(treeId) : null;
    return {
      productionRecordId: talent._id,
      name: talent.name,
      treeId,
      treeName: tree?.name ?? null,
      registryKey: registryEntry?.canonicalTreeKey ?? null,
      registryStatus: registryEntry?.status ?? null,
      classification: 'DEFER_PHASE_3D_PRODUCTION_ONLY'
    };
  });

invariant(talents.length === 1024, 'expected 1024 production talents before Phase 3C');
invariant(reviewExtraIds.size === 2, 'expected 2 review-only production extras');
invariant(deferred.length === 90, 'expected 90 production-only records deferred to Phase 3D');
invariant(consumed.size + reviewExtraIds.size + deferred.length === talents.length,
  'production talent inverse classification does not reconcile');

for (const consolidation of treeConsolidations) {
  for (const obsoleteTreeId of consolidation.deleteObsoleteTreeIds) {
    const obsoleteTree = treeById.get(obsoleteTreeId);
    invariant(obsoleteTree, 'obsolete consolidation tree missing: ' + obsoleteTreeId);
    const unconsumed = (obsoleteTree.system?.talentIds ?? []).filter(id => !consumed.has(id));
    invariant(unconsumed.length === 0,
      'tree consolidation would orphan noncanonical/unclassified talents: ' + obsoleteTreeId);
  }
}

const core = manifests.find(x => x.bookKey === 'core')?.manifest;
const jatm = manifests.find(x => x.bookKey === 'jatm')?.manifest;
const coreCharm = core?.records.find(r => r.canonicalIdentity === 'Saga Edition Core Rulebook|Dathomiri Witch|Charm Beast');
const jatmCharm = jatm?.records.find(r => r.canonicalIdentity === 'Jedi Academy Training Manual|Beastwarden|Charm Beast');
invariant(coreCharm?.disposition === 'IDENTITY_SPLIT', 'Core Charm Beast must be an identity split');
invariant(coreCharm?.identityResolution?.createRecordId === 'c919d7682bd9df40', 'Core Charm Beast create ID changed');
invariant(jatmCharm?.identityResolution?.productionRecordId === 'bab9a1ce285f98b9', 'JATM Charm Beast must preserve production ID');

assertSame(references, closeout.referenceOnlyPublications, 'reference-only publication list');
assertSame(reviewExtras, closeout.reviewExtras, 'review-extra list');
assertSame(treeCreates, closeout.treeCreates, 'tree-create list');
assertSame(treeConsolidations, closeout.treeConsolidations, 'tree-consolidation list');
assertSame(classAccessMutations, closeout.classAccessMutations, 'class-access mutation list');
assertSame(specialOperations, closeout.specialOperations, 'special operation inventory');
assertSame(deferred, closeout.productionOnlyDeferred, 'Phase 3D deferred production inventory');

const expectedCounts = {
  sourcebooks: 14,
  publicationClaims: 1182,
  canonicalIdentities: 1180,
  referenceOnlyPublicationClaims: 2,
  dispositions: totals.dispositions,
  existingCanonicalProductionRecords: 932,
  generatedTalentRecords: 248,
  projectedProductionTalentRecordsAfterPhase3C: 1272,
  productionTalentRecordsBeforePhase3C: 1024,
  productionReviewExtras: 2,
  productionOnlyDeferredToPhase3D: 90,
  productionTreeCreates: 7,
  productionTreeConsolidations: 1,
  classAccessMutations: 5
};
assertSame(expectedCounts, closeout.counts, 'closeout counts');

console.log('[talent-phase-3b-global] PASS: 1182 publication claims -> 1180 canonical identities');
console.log('[talent-phase-3b-global] PASS: 932 existing + 248 generated talent records');
console.log('[talent-phase-3b-global] PASS: 2 review extras + 90 Phase 3D deferred production records');
console.log('[talent-phase-3b-global] PASS: Phase 3C preflight gate certified');
