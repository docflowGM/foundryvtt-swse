#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const targetPath = path.join(repoRoot, 'data', 'canonical', 'talents.json');

const BOOKS = [
  { order: 1, sourcebook: 'Saga Edition Core Rulebook', file: 'talent-phase-2-core-rulebook-content.json' },
  { order: 2, sourcebook: 'Clone Wars Campaign Guide', file: 'talent-phase-2-clone-wars-campaign-guide-content.json' },
  { order: 3, sourcebook: 'Rebellion Era Campaign Guide', file: 'talent-phase-2-rebellion-era-campaign-guide-content.json' },
  { order: 4, sourcebook: 'Galaxy at War', file: 'talent-phase-2-galaxy-at-war-content.json' },
  { order: 5, sourcebook: 'Galaxy of Intrigue', file: 'talent-phase-2-galaxy-of-intrigue-content.json' },
  { order: 6, sourcebook: 'Starships of the Galaxy', file: 'talent-phase-2-starships-of-the-galaxy-content.json' },
  { order: 7, sourcebook: 'Threats of the Galaxy', file: 'talent-phase-2-threats-of-the-galaxy-content.json' },
  { order: 8, sourcebook: 'Scum and Villainy', file: 'talent-phase-2-scum-and-villainy-content.json' },
  { order: 9, sourcebook: 'Unknown Regions', file: 'talent-phase-2-unknown-regions-content.json' },
  { order: 10, sourcebook: 'Legacy Era Campaign Guide', file: 'talent-phase-2-legacy-era-campaign-guide-content.json' },
  { order: 11, sourcebook: 'Knights of the Old Republic Campaign Guide', file: 'talent-phase-2-knights-of-the-old-republic-campaign-guide-content.json' },
  { order: 12, sourcebook: 'Force Unleashed Campaign Guide', file: 'talent-phase-2-force-unleashed-campaign-guide-content.json' },
  { order: 13, sourcebook: 'Jedi Academy Training Manual', file: 'talent-phase-2-jedi-academy-training-manual-content.json' },
  { order: 14, sourcebook: "Scavenger's Guide to Droids", file: 'talent-phase-2-scavengers-guide-to-droids-content.json' }
];

const EXPECTED = {
  sourcebooks: 14,
  publicationClaims: 1182,
  canonicalIdentities: 1180,
  aggregateMemberships: 1180,
  multiPublicationIdentities: 1,
  policyReviews: 1
};

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function buildCanonicalDataset() {
  const registry = readJson('data/audits/talent-canonical-tree-registry.json');
  const closeout = readJson('data/audits/talent-phase-2-closeout.json');
  const treeByKey = new Map(registry.entries.map(entry => [entry.canonicalTreeKey, entry]));
  const publications = [];

  for (const book of BOOKS) {
    const phase2File = `data/audits/${book.file}`;
    const source = readJson(phase2File);
    if (source.sourcebook !== book.sourcebook) {
      throw new Error(`Sourcebook mismatch in ${phase2File}: ${source.sourcebook}`);
    }

    for (const rec of source.records ?? []) {
      const tree = treeByKey.get(rec.canonicalTreeKey);
      if (!tree) throw new Error(`Unknown canonical tree key: ${rec.canonicalTreeKey}`);

      const claim = (tree.talentPublications ?? []).find(pub =>
        pub.sourcebook === book.sourcebook &&
        (pub.talentNames ?? []).includes(rec.canonicalName)
      );
      if (!claim) {
        throw new Error(
          `Registry publication missing: ${book.sourcebook} | ${rec.canonicalTreeKey} | ${rec.canonicalName}`
        );
      }

      publications.push({
        order: book.order,
        phase2File,
        sourcebook: book.sourcebook,
        publicationType: claim.publicationType,
        page: rec.page,
        canonicalTreeKey: rec.canonicalTreeKey,
        canonicalName: rec.canonicalName,
        canonicalDescription: rec.canonicalDescription,
        canonicalPrerequisites: rec.canonicalPrerequisites ?? '',
        quickSummary: rec.quickSummary
      });
    }
  }

  const groups = new Map();
  for (const pub of publications) {
    const identity = `${pub.canonicalTreeKey}|${pub.canonicalName}`;
    if (!groups.has(identity)) groups.set(identity, []);
    groups.get(identity).push(pub);
  }

  if (publications.length !== EXPECTED.publicationClaims) {
    throw new Error(`Expected ${EXPECTED.publicationClaims} publication claims, found ${publications.length}`);
  }
  if (groups.size !== EXPECTED.canonicalIdentities) {
    throw new Error(`Expected ${EXPECTED.canonicalIdentities} canonical identities, found ${groups.size}`);
  }

  const records = [];
  for (const [identity, rawPublications] of groups) {
    const pubs = [...rawPublications].sort((a, b) => a.order - b.order);
    const tree = treeByKey.get(pubs[0].canonicalTreeKey);

    let selected = pubs[0];
    let status = 'SINGLE_PUBLICATION';
    let requiresProductionPolicyReview = false;
    let note = 'Only certified publication for this canonical identity.';

    if (pubs.length > 1) {
      if (identity !== 'Saga Edition Core Rulebook|Alter|Illusion') {
        throw new Error(`Unexpected multi-publication canonical identity: ${identity}`);
      }
      selected =
        pubs.find(pub => pub.sourcebook === 'Knights of the Old Republic Campaign Guide') ??
        pubs[0];
      status = 'MULTI_PUBLICATION_VARIANT_REVIEW_REQUIRED';
      requiresProductionPolicyReview = true;
      note =
        'Illusion is printed in KOTOR, Force Unleashed, and Jedi Academy with materially different later wording. ' +
        'KOTOR is retained as the provisional primary publication because it is the earliest certified printing in this corpus; ' +
        'all official variants are preserved and production mutation must not auto-resolve this identity until precedence is explicitly approved.';
    }

    const record = {
      canonicalIdentity: identity,
      canonicalTreeKey: selected.canonicalTreeKey,
      name: selected.canonicalName,
      tree: tree.displayName,
      treeOriginSourcebook: tree.originSourcebook,
      accessModel: tree.accessModel ?? 'CLASS_OR_PRESTIGE_TREE',
      classAccess: tree.aggregateClassAccess ?? [],
      benefit: selected.canonicalDescription,
      description: selected.canonicalDescription,
      summary: selected.quickSummary,
      prerequisites: selected.canonicalPrerequisites,
      source: selected.sourcebook,
      page: selected.page,
      contentSelection: {
        status,
        requiresProductionPolicyReview,
        note
      },
      publications: pubs.map(pub => ({
        sourcebook: pub.sourcebook,
        page: pub.page,
        publicationType: pub.publicationType,
        phase2File: pub.phase2File
      })),
      provenance: {
        structuralRegistry: 'data/audits/talent-canonical-tree-registry.json',
        phase2Closeout: 'data/audits/talent-phase-2-closeout.json',
        repoTreeIds: tree.repoTreeIds ?? [],
        repoTreeNames: tree.repoTreeNames ?? []
      }
    };

    if (pubs.length > 1) {
      record.publicationVariants = pubs.map(pub => ({
        sourcebook: pub.sourcebook,
        page: pub.page,
        description: pub.canonicalDescription,
        prerequisites: pub.canonicalPrerequisites,
        summary: pub.quickSummary
      }));
    }

    records.push(record);
  }

  records.sort((a, b) =>
    a.canonicalTreeKey.localeCompare(b.canonicalTreeKey) ||
    a.name.localeCompare(b.name)
  );

  const output = {
    schemaVersion: 1,
    phase: '3A',
    status: 'AUTHORITY_MERGED_WITH_ONE_EXPLICIT_VARIANT_CONFLICT',
    generatedAt: closeout.reviewedAt ?? closeout.completedAt ?? '2026-09-27',
    identityRule: 'canonicalTreeKey + talent name',
    counts: {
      sourcebooks: BOOKS.length,
      certifiedPublicationClaims: publications.length,
      canonicalIdentities: records.length,
      aggregateCanonicalTreeMembershipClaims:
        closeout.totals.aggregateCanonicalTreeMembershipClaims,
      multiPublicationIdentities: records.filter(r => r.publications.length > 1).length,
      productionPolicyReviewRequired:
        records.filter(r => r.contentSelection.requiresProductionPolicyReview).length
    },
    sourcePolicy: {
      structuralAuthority: 'data/audits/talent-canonical-tree-registry.json',
      contentAuthority: '14 data/audits/talent-phase-2-*-content.json datasets',
      finalSourceAuthority: 'Primary-source PDF pages for ambiguity',
      summaryAuthority: 'Derived player-facing convenience text; never mechanical authority.'
    },
    mergePolicy: {
      singlePublication: 'Use the certified publication text directly.',
      multiplePublications:
        'Preserve every certified publication variant. Use the earliest certified printing provisionally, but flag materially differing variants for explicit production-policy review rather than silently choosing a later rewrite.'
    },
    records
  };

  const counts = output.counts;
  if (counts.sourcebooks !== EXPECTED.sourcebooks) throw new Error('Sourcebook count invariant failed');
  if (counts.certifiedPublicationClaims !== EXPECTED.publicationClaims) throw new Error('Publication count invariant failed');
  if (counts.canonicalIdentities !== EXPECTED.canonicalIdentities) throw new Error('Canonical identity count invariant failed');
  if (counts.aggregateCanonicalTreeMembershipClaims !== EXPECTED.aggregateMemberships) throw new Error('Aggregate membership invariant failed');
  if (counts.multiPublicationIdentities !== EXPECTED.multiPublicationIdentities) throw new Error('Multi-publication invariant failed');
  if (counts.productionPolicyReviewRequired !== EXPECTED.policyReviews) throw new Error('Policy review invariant failed');

  for (const record of records) {
    if (!record.canonicalTreeKey || !record.name || !record.benefit || !record.description || !record.summary || record.page == null) {
      throw new Error(`Incomplete canonical record: ${record.canonicalIdentity}`);
    }
  }

  return output;
}

const output = buildCanonicalDataset();
const serialized = JSON.stringify(output, null, 2) + '\n';

if (process.argv.includes('--check')) {
  const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
  if (current !== serialized) {
    console.error('Canonical talent dataset is stale. Run: node tools/build-canonical-talents.mjs');
    process.exit(1);
  }
  console.log(`Canonical talent dataset OK: ${output.counts.canonicalIdentities} identities from ${output.counts.certifiedPublicationClaims} publications.`);
} else {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, serialized);
  console.log(`Wrote ${path.relative(repoRoot, targetPath)} with ${output.counts.canonicalIdentities} canonical identities.`);
}
