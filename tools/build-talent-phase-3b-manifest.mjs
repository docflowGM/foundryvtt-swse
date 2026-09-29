#!/usr/bin/env node
/**
 * Build a book-scoped Phase 3B talent repair manifest.
 *
 * Usage:
 *   node tools/build-talent-phase-3b-manifest.mjs --book core [--check]
 *   node tools/build-talent-phase-3b-manifest.mjs --book threats [--check]
 *   node tools/build-talent-phase-3b-manifest.mjs --book starships [--check]
 *   node tools/build-talent-phase-3b-manifest.mjs --book scavengers [--check]
 *   node tools/build-talent-phase-3b-manifest.mjs --book intrigue [--check]
 *   node tools/build-talent-phase-3b-manifest.mjs --book war [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMMON = {
  canonical: 'data/canonical/talents.json',
  registry: 'data/audits/talent-canonical-tree-registry.json',
  talents: 'packs/talents.db',
  trees: 'packs/talent_trees.db'
};
const BOOKS = {
  core: {
    sourcebook: 'Saga Edition Core Rulebook',
    bookOrder: 1,
    phase2: 'data/audits/talent-phase-2-core-rulebook-content.json',
    discrepancy: 'data/audits/talent-phase-2-core-discrepancy-manifest.json',
    output: 'data/audits/talent-phase-3b-core-rulebook-manifest.json',
    aliases: {
      'Saga Edition Core Rulebook|Weapon Master|Multiattack Proficiency (heavy weapons)': '1b3d5d3260391867'
    },
    expected: {
      records: 198,
      extras: 1,
      dispositions: {
        UPDATE_CONTENT: 112,
        UPDATE_METADATA: 31,
        REMOVE_CONTAMINATION: 31,
        CORRECT_TREE: 17,
        CREATE: 6,
        IDENTITY_SPLIT: 1
      }
    }
  },
  war: {
    sourcebook: 'Galaxy at War',
    bookOrder: 4,
    classes: 'packs/classes.db',
    allowTreeCreates: true,
    phase2: 'data/audits/talent-phase-2-galaxy-at-war-content.json',
    discrepancy: 'data/audits/talent-phase-2-galaxy-at-war-discrepancy-manifest.json',
    output: 'data/audits/talent-phase-3b-galaxy-at-war-manifest.json',
    aliases: {},
    expected: {
      records: 56,
      extras: 0,
      treeCreates: 3,
      classAccessMutations: 3,
      dispositions: {
        UPDATE_CONTENT: 13,
        UPDATE_METADATA: 1,
        CREATE: 39,
        IDENTITY_SPLIT: 3
      }
    }
  },
  intrigue: {
    sourcebook: 'Galaxy of Intrigue',
    bookOrder: 5,
    classes: 'packs/classes.db',
    allowTreeCreates: true,
    phase2: 'data/audits/talent-phase-2-galaxy-of-intrigue-content.json',
    discrepancy: 'data/audits/talent-phase-2-galaxy-of-intrigue-discrepancy-manifest.json',
    output: 'data/audits/talent-phase-3b-galaxy-of-intrigue-manifest.json',
    aliases: {},
    expected: {
      records: 43,
      extras: 0,
      treeCreates: 2,
      classAccessMutations: 2,
      dispositions: {
        UPDATE_CONTENT: 12,
        UPDATE_METADATA: 2,
        CREATE: 27,
        IDENTITY_SPLIT: 2
      }
    }
  },
  scavengers: {
    sourcebook: "Scavenger's Guide to Droids",
    bookOrder: 14,
    phase2: 'data/audits/talent-phase-2-scavengers-guide-to-droids-content.json',
    discrepancy: 'data/audits/talent-phase-2-scavengers-guide-to-droids-discrepancy-manifest.json',
    output: 'data/audits/talent-phase-3b-scavengers-guide-to-droids-manifest.json',
    aliases: {},
    expected: {
      records: 31,
      extras: 0,
      dispositions: {
        UPDATE_CONTENT: 12,
        CREATE: 19
      }
    }
  },
  starships: {
    sourcebook: 'Starships of the Galaxy',
    bookOrder: 6,
    phase2: 'data/audits/talent-phase-2-starships-of-the-galaxy-content.json',
    discrepancy: 'data/audits/talent-phase-2-starships-of-the-galaxy-discrepancy-manifest.json',
    output: 'data/audits/talent-phase-3b-starships-of-the-galaxy-manifest.json',
    aliases: {},
    expected: {
      records: 23,
      extras: 0,
      dispositions: {
        UPDATE_CONTENT: 22,
        CORRECT_TREE: 1
      }
    }
  },
  threats: {
    sourcebook: 'Threats of the Galaxy',
    bookOrder: 7,
    phase2: 'data/audits/talent-phase-2-threats-of-the-galaxy-content.json',
    discrepancy: 'data/audits/talent-phase-2-threats-of-the-galaxy-discrepancy-manifest.json',
    output: 'data/audits/talent-phase-3b-threats-of-the-galaxy-manifest.json',
    aliases: {
      'Threats of the Galaxy|Master of Teräs Käsi|Teräs Käsi Basics': '67bddb17ae2770f3'
    },
    expected: {
      records: 11,
      extras: 1,
      dispositions: { UPDATE_CONTENT: 11 }
    }
  }
};

const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const invariant = (ok, message) => { if (!ok) throw new Error('[talent-phase-3b] ' + message); };
const normalizeKey = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().trim().replace(/&/g, ' and ').replace(/['’`]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const normalizeText = value => String(value ?? '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();
const pairKey = (treeKey, name) => treeKey + '||' + name;
const fingerprint = text => {
  let hash = 0xcbf29ce484222325n;
  for (const char of text) {
    hash ^= BigInt(char.codePointAt(0));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return 'fnv1a64:' + hash.toString(16).padStart(16, '0');
};
const makeId = identity => crypto.createHash('sha256').update('swse-talent|' + identity).digest('hex').slice(0, 16);
const makeTreeId = treeKey => crypto.createHash('sha256').update('swse-talent-tree|' + treeKey).digest('hex').slice(0, 16);
const treeSlug = name => normalizeKey(name).replace(/-/g, '_');
const parseNdjson = raw => raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);

export function buildBookManifest(bookKey, { check = false } = {}) {
  const cfg = BOOKS[bookKey];
  invariant(cfg, 'unknown --book value: ' + bookKey);

  const paths = {
    ...COMMON,
    ...(cfg.classes ? {classes: cfg.classes} : {}),
    phase2: cfg.phase2,
    discrepancy: cfg.discrepancy
  };
  const raw = Object.fromEntries(Object.entries(paths).map(([key, rel]) => [key, readText(rel)]));
  const canonicalAuthority = JSON.parse(raw.canonical);
  const phase2 = JSON.parse(raw.phase2);
  const discrepancy = JSON.parse(raw.discrepancy);
  const registry = JSON.parse(raw.registry);
  const talents = parseNdjson(raw.talents);
  const trees = parseNdjson(raw.trees);
  const classes = raw.classes ? parseNdjson(raw.classes) : [];

  const canonicalByPair = new Map(canonicalAuthority.records.map(r => [pairKey(r.canonicalTreeKey, r.name), r]));
  const registryByKey = new Map(registry.entries.map(e => [e.canonicalTreeKey, e]));
  const talentById = new Map(talents.map(t => [t._id, t]));
  const treeById = new Map(trees.map(t => [t._id, t]));
  const classByName = new Map(classes.map(c => [c.name, c]));
  const claimsByTalentId = new Map();
  const talentsByName = new Map();

  for (const talent of talents) {
    const key = normalizeKey(talent.name);
    const bucket = talentsByName.get(key) ?? [];
    bucket.push(talent);
    talentsByName.set(key, bucket);
  }
  for (const tree of trees) {
    for (const id of tree.system?.talentIds ?? []) {
      const bucket = claimsByTalentId.get(id) ?? [];
      bucket.push(tree);
      claimsByTalentId.set(id, bucket);
    }
  }

  const discrepancyRows = discrepancy.talents ?? discrepancy.records ?? [];
  const discrepancyIds = new Map(discrepancyRows.filter(r => r.repoId).map(r => [
    pairKey(r.canonicalTreeKey, r.canonicalName), r.repoId
  ]));
  const contaminationFlags = new Set([
    'HOMEBREW_CONTAMINATION',
    'CONCATENATED_IDENTITY_TEXT',
    'CORE_TEXT_WITH_LATER_EXTENSION',
    'NONCANONICAL_ACTIVE_FORM_RESTRICTION'
  ]);
  const productionIds = new Set(talents.map(t => t._id));
  const generatedIds = new Set();
  const extras = new Map();
  const referenceOnlyPublications = [];
  const treeCreates = new Map();
  const classAccessMutations = new Map();
  const records = [];

  for (const claim of phase2.records) {
    const canonical = canonicalByPair.get(pairKey(claim.canonicalTreeKey, claim.canonicalName));
    invariant(canonical, 'missing Phase 3A canonical record: ' + claim.canonicalIdentity);

    const ownerSourcebook = canonical.provenance?.primaryPublication?.sourcebook ?? canonical.source;
    if (ownerSourcebook !== cfg.sourcebook) {
      referenceOnlyPublications.push({
        publicationClaim: claim.canonicalIdentity,
        canonicalIdentity: canonical.canonicalIdentity,
        ownerSourcebook
      });
      continue;
    }

    const treeAuthority = registryByKey.get(claim.canonicalTreeKey);
    invariant(treeAuthority, 'missing canonical tree registry entry: ' + claim.canonicalTreeKey);
    const repoTreeIds = treeAuthority.repoTreeIds ?? [];
    let targetTreeId;
    let targetTree;
    if (repoTreeIds.length === 1) {
      targetTreeId = repoTreeIds[0];
      targetTree = treeById.get(targetTreeId);
      invariant(targetTree, 'target production tree missing: ' + targetTreeId);
    } else {
      invariant(cfg.allowTreeCreates && repoTreeIds.length === 0, 'expected one production tree id for ' + claim.canonicalTreeKey);
      targetTreeId = makeTreeId(claim.canonicalTreeKey);
      invariant(!treeById.has(targetTreeId), 'deterministic tree id collides with production: ' + claim.canonicalTreeKey);
      targetTree = {
        _id: targetTreeId,
        name: treeAuthority.displayName,
        type: 'talenttree',
        img: 'icons/svg/item-bag.svg',
        system: {
          talent_tree: treeAuthority.displayName,
          description: '',
          costNumeric: null,
          talentIds: [],
          talentNames: []
        },
        effects: [],
        folder: null,
        sort: 0,
        ownership: {default: 0},
        flags: {}
      };
      if (!treeCreates.has(claim.canonicalTreeKey)) {
        treeCreates.set(claim.canonicalTreeKey, {
          canonicalTreeKey: claim.canonicalTreeKey,
          createTreeId: targetTreeId,
          displayName: treeAuthority.displayName,
          classAccess: treeAuthority.aggregateClassAccess ?? treeAuthority.classAccess ?? [],
          createTemplate: targetTree
        });
        for (const className of treeAuthority.aggregateClassAccess ?? treeAuthority.classAccess ?? []) {
          const classRecord = classByName.get(className);
          invariant(classRecord, 'missing production class record for tree access: ' + className);
          classAccessMutations.set(className + '|' + claim.canonicalTreeKey, {
            classRecordId: classRecord._id,
            className,
            canonicalTreeKey: claim.canonicalTreeKey,
            treeId: targetTreeId,
            treeName: treeAuthority.displayName,
            add: {
              'system.talent_trees': targetTreeId,
              'system.talentTreeIds': treeSlug(treeAuthority.displayName),
              'system.talentTreeSourceIds': targetTreeId,
              'system.talentTreeUuids': 'Compendium.foundryvtt-swse.talent_trees.' + targetTreeId
            }
          });
        }
      }
    }

    const overrideId = cfg.aliases[canonical.canonicalIdentity] ?? null;
    const discrepancyId = discrepancyIds.get(pairKey(claim.canonicalTreeKey, claim.canonicalName)) ?? null;
    const evidenceId = claim.repoRecordId ?? discrepancyId;
    const direct = (overrideId && talentById.get(overrideId)) || (evidenceId && talentById.get(evidenceId)) || null;
    const sameName = talentsByName.get(normalizeKey(canonical.name)) ?? [];
    const sameNameInTarget = sameName.filter(t => (claimsByTalentId.get(t._id) ?? []).some(tree => tree._id === targetTreeId));
    const exactNameInTarget = sameNameInTarget.filter(t => t.name === canonical.name);
    const resolved = direct || (exactNameInTarget.length === 1 ? exactNameInTarget[0] : sameNameInTarget.length === 1 ? sameNameInTarget[0] : null);

    const currentTrees = resolved ? (claimsByTalentId.get(resolved._id) ?? []) : [];
    const isCorrectTree = !!resolved && currentTrees.some(tree => tree._id === targetTreeId);
    for (const duplicate of sameNameInTarget.filter(t => t._id !== resolved?._id)) {
      extras.set(duplicate._id, {
        productionRecordId: duplicate._id,
        name: duplicate.name,
        treeClaims: (claimsByTalentId.get(duplicate._id) ?? []).map(tree => ({treeId: tree._id, treeName: tree.name})),
        classification: 'REVIEW_EXTRA_DUPLICATE_CANONICAL_ALIAS',
        relatedCanonicalIdentity: canonical.canonicalIdentity,
        instruction: 'Do not delete during Phase 3C. Resolve under Phase 3D after canonical repair and reference audit.'
      });
    }

    const sys = resolved?.system ?? {};
    const descriptionPath = resolved && typeof sys.description === 'string'
      ? 'system.description'
      : 'system.description.value';
    const currentDescription = typeof sys.description === 'object' ? sys.description?.value : sys.description;
    const targetFields = {
      name: canonical.name,
      'system.benefit': canonical.benefit,
      [descriptionPath]: canonical.description,
      'system.summary': canonical.summary,
      'system.prerequisites': canonical.prerequisites,
      'system.source': canonical.source,
      'system.page': canonical.page
    };
    const fieldChanges = {
      name: !!resolved && resolved.name !== canonical.name,
      'system.benefit': normalizeText(sys.benefit) !== normalizeText(canonical.benefit),
      [descriptionPath]: normalizeText(currentDescription) !== normalizeText(canonical.description),
      'system.summary': normalizeText(sys.summary) !== normalizeText(canonical.summary),
      'system.prerequisites': normalizeText(sys.prerequisites) !== normalizeText(canonical.prerequisites),
      'system.source': normalizeText(sys.source) !== normalizeText(canonical.source),
      'system.page': String(sys.page ?? '') !== String(canonical.page ?? '')
    };

    let disposition;
    if (!resolved) disposition = sameName.length > 0 ? 'IDENTITY_SPLIT' : 'CREATE';
    else if (!isCorrectTree) disposition = evidenceId || overrideId ? 'CORRECT_TREE' : 'IDENTITY_SPLIT';
    else if ((claim.dispositions ?? []).some(flag => contaminationFlags.has(flag))) disposition = 'REMOVE_CONTAMINATION';
    else if (fieldChanges['system.benefit'] || fieldChanges[descriptionPath] || fieldChanges['system.prerequisites']) disposition = 'UPDATE_CONTENT';
    else if (fieldChanges.name || fieldChanges['system.summary'] || fieldChanges['system.source'] || fieldChanges['system.page']) disposition = 'UPDATE_METADATA';
    else disposition = 'KEEP';

    const productionId = resolved?._id ?? null;
    const createId = productionId ? null : makeId(canonical.canonicalIdentity);
    if (createId) {
      invariant(!productionIds.has(createId), 'deterministic create id collides with production: ' + canonical.canonicalIdentity);
      invariant(!generatedIds.has(createId), 'deterministic create id collision in manifest: ' + canonical.canonicalIdentity);
      generatedIds.add(createId);
    }
    const finalId = productionId ?? createId;
    const sourceTreeClaims = currentTrees.map(tree => ({treeId: tree._id, treeName: tree.name}));

    let treeMutation;
    if (disposition === 'CORRECT_TREE') {
      treeMutation = {action: 'MOVE', removeFromTreeIds: sourceTreeClaims.map(x => x.treeId), addToTreeId: targetTreeId, addTalentId: finalId, addTalentName: canonical.name};
    } else if (disposition === 'CREATE' || disposition === 'IDENTITY_SPLIT') {
      treeMutation = {action: 'ADD', removeFromTreeIds: [], addToTreeId: targetTreeId, addTalentId: finalId, addTalentName: canonical.name};
    } else if (fieldChanges.name) {
      treeMutation = {action: 'UPDATE_NAME', removeFromTreeIds: [], addToTreeId: targetTreeId, addTalentId: finalId, replaceTalentName: {from: resolved.name, to: canonical.name}};
    } else {
      treeMutation = {action: 'KEEP', removeFromTreeIds: [], addToTreeId: targetTreeId, addTalentId: finalId, addTalentName: canonical.name};
    }

    const mutationFields = Object.entries(fieldChanges).filter(([, changed]) => changed).map(([field]) => field);
    if (disposition === 'CORRECT_TREE') mutationFields.push('system.treeId');
    if (disposition === 'CREATE' || disposition === 'IDENTITY_SPLIT') mutationFields.push('_record_create', 'system.treeId');

    records.push({
      canonicalIdentity: canonical.canonicalIdentity,
      canonicalTreeKey: canonical.canonicalTreeKey,
      name: canonical.name,
      ownerSourcebook,
      targetTree: {treeId: targetTreeId, treeName: targetTree.name},
      disposition,
      phase2Flags: claim.dispositions ?? [],
      identityResolution: {
        resolutionEvidence: overrideId ? 'EXPLICIT_ALIAS_OVERRIDE'
          : claim.repoRecordId ? 'PHASE2_CONTENT_MAPPING'
          : discrepancyId ? 'PHASE2_DISCREPANCY_MAPPING'
          : resolved ? 'TARGET_TREE_NAME_MATCH' : 'UNRESOLVED',
        productionRecordId: productionId,
        preserveProductionId: !!productionId,
        createRecordId: createId,
        currentTreeClaims: sourceTreeClaims,
        sameNameProductionCandidates: sameName.map(t => ({
          id: t._id,
          name: t.name,
          treeClaims: (claimsByTalentId.get(t._id) ?? []).map(tree => ({treeId: tree._id, treeName: tree.name}))
        })),
        reviewExtraCandidateIds: sameNameInTarget.filter(t => t._id !== resolved?._id).map(t => t._id)
      },
      currentCanonicalFields: resolved ? {
        name: resolved.name,
        'system.benefit': sys.benefit ?? null,
        [descriptionPath]: currentDescription ?? null,
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
          description: {value: canonical.description},
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
        : disposition === 'IDENTITY_SPLIT' ? 'Create the distinct canonical identity with createRecordId. Do not overwrite or repurpose a same-name record in another tree.'
        : disposition === 'CORRECT_TREE' ? 'Preserve the existing production record ID, update the listed canonical fields, move tree membership to the target tree, and set system.treeId.'
        : disposition === 'REMOVE_CONTAMINATION' ? 'Preserve the existing production record ID and runtime metadata; replace only listed canonical fields and remove contaminated player-facing text.'
        : disposition === 'UPDATE_CONTENT' ? 'Preserve the existing production record ID and runtime metadata; replace only the listed canonical fields.'
        : disposition === 'UPDATE_METADATA' ? 'Preserve the existing production record ID and canonical content; update only the listed metadata or display-name fields.'
        : 'No mutation required.'
    });
  }

  for (const treeCreate of treeCreates.values()) {
    const members = records.filter(record => record.canonicalTreeKey === treeCreate.canonicalTreeKey);
    treeCreate.createTemplate.system.talentIds = members.map(record =>
      record.identityResolution.productionRecordId ?? record.identityResolution.createRecordId
    );
    treeCreate.createTemplate.system.talentNames = members.map(record => record.name);
  }

  const dispositionCounts = {};
  const fieldChangeCounts = {};
  for (const record of records) {
    dispositionCounts[record.disposition] = (dispositionCounts[record.disposition] ?? 0) + 1;
    for (const [field, changed] of Object.entries(record.fieldChanges)) {
      if (changed) fieldChangeCounts[field] = (fieldChangeCounts[field] ?? 0) + 1;
    }
  }

  invariant(records.length === cfg.expected.records, 'unexpected owned record count for ' + bookKey);
  invariant(extras.size === cfg.expected.extras, 'unexpected production-extra count for ' + bookKey);
  invariant(treeCreates.size === (cfg.expected.treeCreates ?? 0), 'unexpected tree-create count for ' + bookKey);
  invariant(classAccessMutations.size === (cfg.expected.classAccessMutations ?? 0), 'unexpected class-access mutation count for ' + bookKey);
  for (const [key, value] of Object.entries(cfg.expected.dispositions)) {
    invariant((dispositionCounts[key] ?? 0) === value, 'unexpected ' + key + ' count for ' + bookKey);
  }
  for (const [key, value] of Object.entries(dispositionCounts)) {
    invariant(Object.hasOwn(cfg.expected.dispositions, key) || value === 0, 'unexpected disposition ' + key + ' for ' + bookKey);
  }

  const output = {
    schemaVersion: 2,
    phase: '3B',
    status: 'CERTIFIED_BOOK_REPAIR_MANIFEST',
    sourcebook: cfg.sourcebook,
    bookOrder: cfg.bookOrder,
    identityRule: 'canonicalTreeKey + talent name; never talent name alone',
    ownershipRule: 'Only the Phase 3A primary publication owner emits a production mutation. Repeated later publications are reference-only.',
    productionMutationAllowed: false,
    generatedAgainst: Object.fromEntries(Object.entries(paths).map(([key, rel]) => [
      key, {path: rel, fingerprint: fingerprint(raw[key])}
    ])),
    counts: {
      certifiedPublicationClaims: phase2.records.length,
      ownedCanonicalIdentities: records.length,
      referenceOnlyPublicationClaims: referenceOnlyPublications.length,
      canonicalTrees: new Set(records.map(r => r.canonicalTreeKey)).size,
      dispositions: dispositionCounts,
      fieldChanges: fieldChangeCounts,
      productionExtras: extras.size,
      ...(cfg.allowTreeCreates ? {
        productionTreeCreates: treeCreates.size,
        classAccessMutations: classAccessMutations.size
      } : {})
    },
    dispositionPrecedence: ['IDENTITY_SPLIT','CREATE','CORRECT_TREE','REMOVE_CONTAMINATION','UPDATE_CONTENT','UPDATE_METADATA','KEEP'],
    phase3cWriteContract: {
      productionTalentPack: 'packs/talents.db',
      productionTreePack: 'packs/talent_trees.db',
      ...(cfg.allowTreeCreates ? {productionClassPack: 'packs/classes.db'} : {}),
      preserveExistingIds: true,
      descriptionWriteRule: "Preserve each existing record's description shape: write system.description.value when description is an object and system.description when it is a string. New records use system.description.value.",
      canonicalFields: ['name','system.benefit','system.description.value or system.description','system.summary','system.prerequisites','system.source','system.page'],
      prohibitedShortcuts: [
        'Do not match or mutate by talent name alone.',
        'Do not infer CREATE from a Phase 2 missing flag.',
        'Do not overwrite a same-name identity in another tree.',
        'Do not delete REVIEW_EXTRA records during Phase 3C.',
        'Do not erase runtime metadata unless explicitly targeted.'
      ]
    },
    ...(cfg.allowTreeCreates ? {
      treeCreates: [...treeCreates.values()],
      classAccessMutations: [...classAccessMutations.values()]
    } : {}),
    referenceOnlyPublications,
    productionExtras: [...extras.values()],
    records
  };

  const serialized = JSON.stringify(output, null, 2) + '\n';
  const outputPath = path.join(ROOT, cfg.output);
  if (check) {
    invariant(fs.existsSync(outputPath), 'missing manifest: ' + cfg.output);
    invariant(fs.readFileSync(outputPath, 'utf8') === serialized, 'committed manifest is stale: ' + cfg.output);
    console.log('[talent-phase-3b] PASS: ' + cfg.sourcebook + ' (' + records.length + ' owned identities)');
  } else {
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, serialized, 'utf8');
    console.log('[talent-phase-3b] wrote ' + cfg.output);
  }
  return output;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const bookArg = process.argv.find(arg => arg.startsWith('--book='));
  const index = process.argv.indexOf('--book');
  const bookKey = bookArg ? bookArg.slice('--book='.length) : index >= 0 ? process.argv[index + 1] : null;
  invariant(bookKey, 'usage: --book core|threats|starships|scavengers|intrigue|war [--check]');
  buildBookManifest(bookKey, {check: process.argv.includes('--check')});
}
