#!/usr/bin/env node
/**
 * Build the Phase 3A canonical talent authority.
 *
 * Reads only Phase 1D/Phase 2 audit authority and writes
 * data/canonical/talents.json. It never mutates production packs or staging
 * mirrors.
 *
 * Usage:
 *   node tools/build-talent-canonical-authority.mjs
 *   node tools/build-talent-canonical-authority.mjs --check
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'data', 'canonical', 'talents.json');
const REGISTRY_PATH = 'data/audits/talent-canonical-tree-registry.json';
const CLOSEOUT_PATH = 'data/audits/talent-phase-2-closeout.json';

const CONTENT_FILES = [
  "talent-phase-2-core-rulebook-content.json",
  "talent-phase-2-clone-wars-campaign-guide-content.json",
  "talent-phase-2-rebellion-era-campaign-guide-content.json",
  "talent-phase-2-galaxy-at-war-content.json",
  "talent-phase-2-galaxy-of-intrigue-content.json",
  "talent-phase-2-starships-of-the-galaxy-content.json",
  "talent-phase-2-threats-of-the-galaxy-content.json",
  "talent-phase-2-scum-and-villainy-content.json",
  "talent-phase-2-unknown-regions-content.json",
  "talent-phase-2-legacy-era-campaign-guide-content.json",
  "talent-phase-2-knights-of-the-old-republic-campaign-guide-content.json",
  "talent-phase-2-force-unleashed-campaign-guide-content.json",
  "talent-phase-2-jedi-academy-training-manual-content.json",
  "talent-phase-2-scavengers-guide-to-droids-content.json"
];

const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const invariant = (ok, message) => {
  if (!ok) throw new Error(`[talent-canonical-authority] ${message}`);
};

const registry = readJson(REGISTRY_PATH);
const closeout = readJson(CLOSEOUT_PATH);
const datasets = CONTENT_FILES.map(filename => ({
  filename,
  path: `data/audits/${filename}`,
  data: readJson(`data/audits/${filename}`)
}));

invariant(closeout?.totals?.sourcebooks === 14, 'Phase 2 closeout sourcebook count changed');
invariant(closeout?.totals?.certifiedPublicationClaims === 1182, 'Phase 2 closeout publication-claim count changed');
invariant(closeout?.totals?.aggregateCanonicalTreeMembershipClaims === 1180, 'Phase 2 closeout aggregate-membership count changed');

const claims = datasets.flatMap(d =>
  (d.data.records ?? []).map(record => ({ ...record, __authorityFile: d.path }))
);

const pairKey = (treeKey, name) => `${treeKey}||${name}`;
const claimsByPair = new Map();
for (const claim of claims) {
  const key = pairKey(claim.canonicalTreeKey, claim.canonicalName);
  const bucket = claimsByPair.get(key) ?? [];
  bucket.push(claim);
  claimsByPair.set(key, bucket);
}

const registryPairs = [];
for (const entry of registry.entries ?? []) {
  for (const name of entry.aggregateCanonicalTalentNames ?? []) {
    registryPairs.push({ entry, name, key: pairKey(entry.canonicalTreeKey, name) });
  }
}

invariant(claims.length === 1182, `expected 1182 publication claims, found ${claims.length}`);
invariant(claimsByPair.size === 1180, `expected 1180 merged claim identities, found ${claimsByPair.size}`);
invariant(registryPairs.length === 1180, `expected 1180 registry memberships, found ${registryPairs.length}`);

const registryKeySet = new Set(registryPairs.map(x => x.key));
const claimKeySet = new Set(claimsByPair.keys());
invariant([...registryKeySet].every(k => claimKeySet.has(k)), 'registry contains a membership missing from Phase 2 content authority');
invariant([...claimKeySet].every(k => registryKeySet.has(k)), 'Phase 2 content contains an identity missing from the structural registry');

function publicationRank(entry, claim, name) {
  return (entry.talentPublications ?? []).findIndex(pub =>
    pub.sourcebook === claim.sourcebook && (pub.talentNames ?? []).includes(name)
  );
}

const records = registryPairs.map(({ entry, name, key }) => {
  const sourceClaims = [...(claimsByPair.get(key) ?? [])];
  invariant(sourceClaims.length > 0, `no publication claim for ${key}`);

  for (const claim of sourceClaims) {
    invariant(
      publicationRank(entry, claim, name) >= 0,
      `publication claim absent from tree registry: ${claim.sourcebook} :: ${key}`
    );
  }

  sourceClaims.sort((a, b) => {
    const ar = publicationRank(entry, a, name);
    const br = publicationRank(entry, b, name);
    return ar - br ||
      String(a.sourcebook).localeCompare(String(b.sourcebook)) ||
      Number(a.page) - Number(b.page);
  });

  const primary = sourceClaims[0];
  return {
    canonicalIdentity: `${entry.canonicalTreeKey}|${name}`,
    canonicalTreeKey: entry.canonicalTreeKey,
    name,
    tree: entry.displayName,
    treeOriginSourcebook: entry.originSourcebook,
    classAccess: entry.aggregateClassAccess ?? [],
    benefit: primary.canonicalDescription,
    description: primary.canonicalDescription,
    summary: primary.quickSummary,
    prerequisites: primary.canonicalPrerequisites ?? '',
    source: primary.sourcebook,
    page: primary.page,
    publications: sourceClaims.map(claim => ({
      sourcebook: claim.sourcebook,
      page: claim.page,
      publicationType: claim.publicationType ?? (
        claim.sourcebook === entry.originSourcebook ? 'TREE_ORIGIN_MEMBERSHIP' : 'EXPANSION'
      ),
      claimIdentity: claim.canonicalIdentity,
      description: claim.canonicalDescription,
      prerequisites: claim.canonicalPrerequisites ?? '',
      summary: claim.quickSummary,
      textCapture: claim.canonicalTextCapture,
      sourceAuthorityFile: claim.__authorityFile
    })),
    provenance: {
      structuralAuthority: REGISTRY_PATH,
      primaryPublicationRule: 'first matching sourcebook entry in talent-canonical-tree-registry.json talentPublications[]',
      primaryPublication: {
        sourcebook: primary.sourcebook,
        page: primary.page,
        claimIdentity: primary.canonicalIdentity,
        sourceAuthorityFile: primary.__authorityFile
      },
      repoEvidence: sourceClaims.map(claim => ({
        sourcebook: claim.sourcebook,
        repoRecordId: claim.repoRecordId ?? null,
        repoName: claim.repoName ?? null,
        repoTreeName: claim.repoTreeName ?? null,
        repoTreeId: claim.repoTreeId ?? null,
        dispositions: claim.dispositions ?? [],
        sameNameRepoCandidates: claim.sameNameRepoCandidates ?? [],
        notes: claim.notes ?? null
      }))
    }
  };
});

const nameMap = new Map();
for (const record of records) {
  const bucket = nameMap.get(record.name) ?? [];
  bucket.push(record.canonicalTreeKey);
  nameMap.set(record.name, bucket);
}
const sameNameDifferentTreeGroups = [...nameMap.entries()]
  .filter(([, treeKeys]) => treeKeys.length > 1)
  .map(([name, canonicalTreeKeys]) => ({ name, canonicalTreeKeys }))
  .sort((a, b) => a.name.localeCompare(b.name));

const multiPublication = records.filter(r => r.publications.length > 1);
invariant(records.length === 1180, `expected 1180 canonical records, found ${records.length}`);
invariant(sameNameDifferentTreeGroups.length === 19, `expected 19 same-name collision groups, found ${sameNameDifferentTreeGroups.length}`);
invariant(
  multiPublication.length === 1 &&
  multiPublication[0].canonicalIdentity === 'Saga Edition Core Rulebook|Alter|Illusion' &&
  multiPublication[0].publications.length === 3,
  'unexpected 1182 -> 1180 multi-publication reconciliation'
);
invariant(
  records.every(r => r.benefit && r.description && r.summary && r.source && r.page !== null && r.page !== undefined),
  'required canonical content field is missing'
);

const output = {
  schemaVersion: 1,
  phase: '3A',
  status: 'CANONICAL_PRODUCTION_AUTHORITY',
  identityRule: "canonicalTreeKey + '|' + talent name; talent name alone is never an identity",
  generatedFrom: {
    structuralAuthority: REGISTRY_PATH,
    phase2Closeout: CLOSEOUT_PATH,
    contentAuthorityFiles: CONTENT_FILES.map(f => `data/audits/${f}`)
  },
  counts: {
    sourcebooks: datasets.length,
    publicationClaims: claims.length,
    canonicalIdentities: records.length,
    aggregateRegistryMemberships: registryPairs.length,
    multiPublicationIdentities: multiPublication.length,
    sameNameDifferentTreeGroups: sameNameDifferentTreeGroups.length
  },
  mergePolicy: {
    groupBy: ['canonicalTreeKey', 'canonicalName'],
    primaryPublication: 'Use the first matching talentPublications[] entry in the canonical tree registry. Preserve all later/repeated publication claims in publications[].',
    knownMultiPublicationIdentity: {
      canonicalIdentity: multiPublication[0].canonicalIdentity,
      publicationCount: multiPublication[0].publications.length,
      publications: multiPublication[0].publications.map(p => ({
        sourcebook: p.sourcebook,
        page: p.page
      }))
    }
  },
  sameNameDifferentTreeGroups,
  records
};

const serialized = JSON.stringify(output, null, 2) + '\n';

if (process.argv.includes('--check')) {
  invariant(fs.existsSync(OUTPUT), `missing generated authority: ${path.relative(ROOT, OUTPUT)}`);
  const current = fs.readFileSync(OUTPUT, 'utf8');
  invariant(current === serialized, 'data/canonical/talents.json is stale; regenerate it');
  console.log('[talent-canonical-authority] PASS: 1182 claims -> 1180 canonical identities');
} else {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, serialized, 'utf8');
  console.log('[talent-canonical-authority] wrote data/canonical/talents.json');
  console.log('[talent-canonical-authority] 1182 claims -> 1180 canonical identities');
}
