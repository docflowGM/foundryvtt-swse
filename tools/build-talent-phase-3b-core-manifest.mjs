#!/usr/bin/env node
/**
 * Build the Phase 3B Saga Edition Core Rulebook production repair manifest.
 *
 * Compares certified canonical authority against the current production
 * talent/tree packs. This tool never mutates production.
 *
 * Usage:
 *   node tools/build-talent-phase-3b-core-manifest.mjs
 *   node tools/build-talent-phase-3b-core-manifest.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'data', 'audits', 'talent-phase-3b-core-rulebook-manifest.json');
const PATHS = {
  canonical: 'data/canonical/talents.json',
  core: 'data/audits/talent-phase-2-core-rulebook-content.json',
  registry: 'data/audits/talent-canonical-tree-registry.json',
  talents: 'packs/talents.db',
  trees: 'packs/talent_trees.db'
};
const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const invariant = (ok, message) => { if (!ok) throw new Error(`[talent-phase-3b-core] ${message}`); };
const normalizeKey = value => String(value ?? '').toLowerCase().trim()
  .replace(/&/g, ' and ').replace(/['’`]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const normalizeText = value => String(value ?? '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();
const fingerprint = text => 'sha256:' + crypto.createHash('sha256').update(text).digest('hex');
const makeId = identity => crypto.createHash('sha256').update('swse-talent|' + identity).digest('hex').slice(0, 16);
const pairKey = (treeKey, name) => `${treeKey}||${name}`;

const raw = Object.fromEntries(Object.entries(PATHS).map(([key, rel]) => [key, readText(rel)]));
const canonicalAuthority = JSON.parse(raw.canonical);
const phase2Core = JSON.parse(raw.core);
const registry = JSON.parse(raw.registry);
const talents = raw.talents.split(/\r?\n/).filter(Boolean).map(JSON.parse);
const trees = raw.trees.split(/\r?\n/).filter(Boolean).map(JSON.parse);

const canonicalByPair = new Map(canonicalAuthority.records.map(r => [pairKey(r.canonicalTreeKey, r.name), r]));
const registryByKey = new Map(registry.entries.map(e => [e.canonicalTreeKey, e]));
const talentById = new Map(talents.map(t => [t._id, t]));
const talentsByName = new Map();
for (const talent of talents) {
  const key = normalizeKey(talent.name);
  const bucket = talentsByName.get(key) ?? [];
  bucket.push(talent);
  talentsByName.set(key, bucket);
}
const treeById = new Map(trees.map(t => [t._id, t]));
const claimsByTalentId = new Map();
for (const tree of trees) {
  for (const id of tree.system?.talentIds ?? []) {
    const bucket = claimsByTalentId.get(id) ?? [];
    bucket.push(tree);
    claimsByTalentId.set(id, bucket);
  }
}

const contaminationFlags = new Set([
  'HOMEBREW_CONTAMINATION',
  'CONCATENATED_IDENTITY_TEXT',
  'CORE_TEXT_WITH_LATER_EXTENSION',
  'NONCANONICAL_ACTIVE_FORM_RESTRICTION'
]);
const productionIds = new Set(talents.map(t => t._id));
const generatedIds = new Set();

const records = phase2Core.records.map(claim => {
  const canonical = canonicalByPair.get(pairKey(claim.canonicalTreeKey, claim.canonicalName));
  invariant(canonical, `missing Phase 3A canonical record: ${claim.canonicalIdentity}`);

  const treeAuthority = registryByKey.get(claim.canonicalTreeKey);
  invariant(treeAuthority, `missing canonical tree registry entry: ${claim.canonicalTreeKey}`);
  invariant((treeAuthority.repoTreeIds ?? []).length === 1, `expected one production tree id for ${claim.canonicalTreeKey}`);
  const targetTreeId = treeAuthority.repoTreeIds[0];
  const targetTree = treeById.get(targetTreeId);
  invariant(targetTree, `target production tree missing: ${claim.canonicalTreeKey} -> ${targetTreeId}`);

  const direct = claim.repoRecordId ? talentById.get(claim.repoRecordId) : null;
  const sameName = talentsByName.get(normalizeKey(claim.canonicalName)) ?? [];
  const sameNameInTarget = sameName.filter(t => (claimsByTalentId.get(t._id) ?? []).some(tree => tree._id === targetTreeId));
  invariant(sameNameInTarget.length <= 1, `multiple same-name records in target tree for ${claim.canonicalIdentity}`);

  const resolved = direct || (sameNameInTarget.length === 1 ? sameNameInTarget[0] : null);
  const currentTrees = resolved ? (claimsByTalentId.get(resolved._id) ?? []) : [];
  const isCorrectTree = !!resolved && currentTrees.some(tree => tree._id === targetTreeId);
  const sys = resolved?.system ?? {};
  const currentDescription = typeof sys.description === 'object' ? sys.description?.value : sys.description;

  const targetFields = {
    'system.benefit': canonical.benefit,
    'system.description': canonical.description,
    'system.summary': canonical.summary,
    'system.prerequisites': canonical.prerequisites,
    'system.source': canonical.source,
    'system.page': canonical.page
  };
  const fieldChanges = {
    'system.benefit': normalizeText(sys.benefit) !== normalizeText(canonical.benefit),
    'system.description': normalizeText(currentDescription) !== normalizeText(canonical.description),
    'system.summary': normalizeText(sys.summary) !== normalizeText(canonical.summary),
    'system.prerequisites': normalizeText(sys.prerequisites) !== normalizeText(canonical.prerequisites),
    'system.source': normalizeText(sys.source) !== normalizeText(canonical.source),
    'system.page': String(sys.page ?? '') !== String(canonical.page ?? '')
  };

  let disposition;
  if (!resolved) disposition = sameName.length > 0 ? 'IDENTITY_SPLIT' : 'CREATE';
  else if (!isCorrectTree) disposition = claim.repoRecordId ? 'CORRECT_TREE' : 'IDENTITY_SPLIT';
  else if ((claim.dispositions ?? []).some(flag => contaminationFlags.has(flag))) disposition = 'REMOVE_CONTAMINATION';
  else if (fieldChanges['system.benefit'] || fieldChanges['system.description'] || fieldChanges['system.prerequisites']) disposition = 'UPDATE_CONTENT';
  else if (fieldChanges['system.summary'] || fieldChanges['system.source'] || fieldChanges['system.page']) disposition = 'UPDATE_METADATA';
  else disposition = 'KEEP';

  const productionId = resolved?._id ?? null;
  const createId = productionId ? null : makeId(canonical.canonicalIdentity);
  if (createId) {
    invariant(!productionIds.has(createId), `deterministic create id collides with production: ${canonical.canonicalIdentity}`);
    invariant(!generatedIds.has(createId), `deterministic create id collision in manifest: ${canonical.canonicalIdentity}`);
    generatedIds.add(createId);
  }
  const finalId = productionId ?? createId;
  const sourceTreeClaims = currentTrees.map(tree => ({treeId: tree._id, treeName: tree.name}));

  const treeMutation = disposition === 'CORRECT_TREE'
    ? {action: 'MOVE', removeFromTreeIds: sourceTreeClaims.map(x => x.treeId), addToTreeId: targetTreeId, addTalentId: finalId, addTalentName: canonical.name}
    : (disposition === 'CREATE' || disposition === 'IDENTITY_SPLIT')
      ? {action: 'ADD', removeFromTreeIds: [], addToTreeId: targetTreeId, addTalentId: finalId, addTalentName: canonical.name}
      : {action: 'KEEP', removeFromTreeIds: [], addToTreeId: targetTreeId, addTalentId: finalId, addTalentName: canonical.name};

  const mutationFields = Object.entries(fieldChanges).filter(([, changed]) => changed).map(([field]) => field);
  if (disposition === 'CORRECT_TREE') mutationFields.push('system.treeId');
  if (disposition === 'CREATE' || disposition === 'IDENTITY_SPLIT') mutationFields.push('_record_create', 'system.treeId');

  return {
    canonicalIdentity: canonical.canonicalIdentity,
    canonicalTreeKey: canonical.canonicalTreeKey,
    name: canonical.name,
    targetTree: {treeId: targetTreeId, treeName: targetTree.name},
    disposition,
    phase2Flags: claim.dispositions ?? [],
    identityResolution: {
      productionRecordId: productionId,
      preserveProductionId: !!productionId,
      createRecordId: createId,
      currentTreeClaims: sourceTreeClaims,
      sameNameProductionCandidates: sameName.map(t => ({
        id: t._id,
        name: t.name,
        treeClaims: (claimsByTalentId.get(t._id) ?? []).map(tree => ({treeId: tree._id, treeName: tree.name}))
      }))
    },
    currentCanonicalFields: resolved ? {
      'system.benefit': sys.benefit ?? null,
      'system.description': currentDescription ?? null,
      'system.summary': sys.summary ?? null,
      'system.prerequisites': sys.prerequisites ?? null,
      'system.source': sys.source ?? null,
      'system.page': sys.page ?? null
    } : null,
    targetFields,
    fieldChanges,
    mutationFields: [...new Set(mutationFields)],
    treeMutation,
    preserveFields: [
      'system.abilityMeta', 'system.prerequisitesStructured', 'system.tags',
      'system.executionModel', 'system.subType', 'system.costNumeric',
      'effects', 'flags', 'img', 'ownership', 'folder', 'sort'
    ],
    createTemplate: productionId ? null : {
      _id: createId,
      name: canonical.name,
      type: 'talent',
      img: 'icons/svg/item-bag.svg',
      system: {
        treeId: targetTreeId,
        benefit: canonical.benefit,
        description: canonical.description,
        summary: canonical.summary,
        prerequisites: canonical.prerequisites,
        source: canonical.source,
        page: canonical.page,
        costNumeric: null,
        tags: []
      },
      effects: [],
      folder: null,
      sort: 0,
      ownership: {default: 0},
      flags: {}
    },
    claudeInstruction:
      disposition === 'CREATE' ? 'Create the exact canonical identity with createRecordId; do not infer automation metadata. Add the new ID/name to the target talent tree.'
      : disposition === 'IDENTITY_SPLIT' ? 'Create the distinct canonical identity with createRecordId. Do not overwrite or repurpose the existing same-name record in another tree.'
      : disposition === 'CORRECT_TREE' ? 'Preserve the existing production record ID, rewrite canonical fields, move tree membership from the current tree claim(s) to the target tree, and set system.treeId to the target tree ID.'
      : disposition === 'REMOVE_CONTAMINATION' ? 'Preserve the existing production record ID and runtime metadata, but replace the canonical player-facing fields exactly with targetFields; do not preserve later-source/homebrew/concatenated rules text in those fields.'
      : disposition === 'UPDATE_CONTENT' ? 'Preserve the existing production record ID and runtime metadata; replace only the listed canonical player-facing fields with targetFields.'
      : disposition === 'UPDATE_METADATA' ? 'Preserve the existing production record ID and canonical content; populate only the listed metadata/player-facing fields from targetFields.'
      : 'No mutation required.'
  };
});

const dispositionCounts = {};
const fieldChangeCounts = {};
for (const record of records) {
  dispositionCounts[record.disposition] = (dispositionCounts[record.disposition] ?? 0) + 1;
  for (const [field, changed] of Object.entries(record.fieldChanges)) if (changed) fieldChangeCounts[field] = (fieldChangeCounts[field] ?? 0) + 1;
}
const expected = {UPDATE_CONTENT:111, UPDATE_METADATA:31, REMOVE_CONTAMINATION:31, CORRECT_TREE:17, CREATE:7, IDENTITY_SPLIT:1};
for (const [key, value] of Object.entries(expected)) invariant(dispositionCounts[key] === value, `unexpected ${key} count: ${dispositionCounts[key]} != ${value}`);
invariant((dispositionCounts.KEEP ?? 0) === 0, 'unexpected KEEP records');
invariant(records.length === 198, `expected 198 Core records, found ${records.length}`);

const output = {
  schemaVersion: 1,
  phase: '3B',
  status: 'CERTIFIED_BOOK_REPAIR_MANIFEST',
  sourcebook: 'Saga Edition Core Rulebook',
  bookOrder: 1,
  authorityRule: 'Canonical Phase 3A authority + Phase 2 Core certification define rules content and identity. Production pack is comparison evidence only.',
  identityRule: 'canonicalTreeKey + talent name; never talent name alone',
  productionMutationAllowed: false,
  generatedAgainst: Object.fromEntries(Object.entries(PATHS).map(([key, rel]) => [key, {path: rel, fingerprint: fingerprint(raw[key])}])),
  counts: {
    certifiedBookIdentities: records.length,
    canonicalTrees: new Set(records.map(r => r.canonicalTreeKey)).size,
    dispositions: dispositionCounts,
    fieldChanges: fieldChangeCounts
  },
  dispositionPrecedence: ['IDENTITY_SPLIT','CREATE','CORRECT_TREE','REMOVE_CONTAMINATION','UPDATE_CONTENT','UPDATE_METADATA','KEEP'],
  phase3cWriteContract: {
    productionTalentPack: 'packs/talents.db',
    productionTreePack: 'packs/talent_trees.db',
    preserveExistingIds: true,
    descriptionFieldShape: 'Current production schema stores the canonical full text at system.description as a string.',
    canonicalFields: ['system.benefit','system.description','system.summary','system.prerequisites','system.source','system.page'],
    prohibitedShortcuts: [
      'Do not match or mutate by talent name alone.',
      'Do not convert MISSING_CONTENT into CREATE without this manifest identity reconciliation.',
      'Do not overwrite a same-name record from another tree.',
      'Do not delete noncanonical/homebrew records during this book repair.',
      'Do not erase runtime metadata such as system.abilityMeta, tags, structured prerequisites, effects, or flags unless a later certified manifest explicitly requires it.'
    ]
  },
  records
};
const serialized = JSON.stringify(output, null, 2) + '\n';

if (process.argv.includes('--check')) {
  invariant(fs.existsSync(OUTPUT), `missing manifest: ${path.relative(ROOT, OUTPUT)}`);
  invariant(fs.readFileSync(OUTPUT, 'utf8') === serialized, 'committed Core Phase 3B manifest is stale; regenerate it');
  console.log('[talent-phase-3b-core] PASS: 198 Core identities reconcile deterministically');
} else {
  fs.mkdirSync(path.dirname(OUTPUT), {recursive: true});
  fs.writeFileSync(OUTPUT, serialized, 'utf8');
  console.log('[talent-phase-3b-core] wrote data/audits/talent-phase-3b-core-rulebook-manifest.json');
  console.log('[talent-phase-3b-core] 198 identities: 111 content, 31 metadata, 31 contamination, 17 tree, 7 create, 1 split');
}
