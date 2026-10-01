#!/usr/bin/env node
// Phase 3E-3 publication-to-production reconciler (read-only).
// Invariant: every certified published claim maps to exactly one canonical production record, and every canonical production
// record is explained by exactly one certified identity. Authority = Phase 2 claims (merged into data/canonical/talents.json
// publications[]) + the 3E addendum; the claim->production mapping comes from the immutable Phase 3B manifests.
// Homebrew packs are outside the denominator (they are only checked for disjointness).
//   node tools/reconcile-talent-publication-corpus.mjs            write the report
//   node tools/reconcile-talent-publication-corpus.mjs --check    report is current and there are no blocking findings
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCommittedManifests } from './apply-talent-phase-3c.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_JSON = 'data/audits/talent-phase-3e-publication-reconciliation.json';
const OUT_MD = 'docs/audits/talent-phase-3e-publication-reconciliation.md';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const ndjson = rel => read(rel).split('\n').filter(Boolean).map(JSON.parse);

// Finding codes. Since Phase 3F every code is blocking: source/page, tree-id slugs and tree display names are all certified clean.
export const BLOCKING = ['CLAIM_WITHOUT_RECORD', 'RECORD_WITHOUT_CLAIM', 'DUPLICATE_MAPPING', 'DUPLICATE_RECORD_IN_TREE', 'WRONG_TREE', 'NAME_MISMATCH', 'UNRESOLVED_SAME_NAME_AMBIGUITY', 'CLAIM_COUNT_MISMATCH', 'HOMEBREW_IN_DENOMINATOR', 'TEXT_DRIFT',
  'WRONG_SOURCE_PAGE', // the seven 3E addendum records lacked source/page until Phase 3E-4
  'STALE_TREE_ID_SLUG', // system.treeId must be the persistent tree _id, never a name slug (Phase 3F)
  'TREE_DISPLAY_NAME_DRIFT']; // the production tree name must equal the canonical name (Phase 3F)
export const METADATA = [];
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function loadInput(root = ROOT) {
  const rd = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const nd = rel => fs.readFileSync(path.join(root, rel), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  return {
    canonical: rd('data/canonical/talents.json'),
    manifests: loadCommittedManifests(root),
    addendum: rd('data/audits/talent-phase-3e-canonical-additions.json'),
    registry: rd('data/audits/talent-canonical-tree-registry.json').entries,
    closeout: rd('data/audits/talent-phase-2-closeout.json'),
    textCorrections: fs.existsSync(path.join(root, 'data/audits/talent-phase-3e5-text-defect-manifest.json')) ? rd('data/audits/talent-phase-3e5-text-defect-manifest.json') : { entries: [] },
    production: nd('packs/talents.db'), trees: nd('packs/talent_trees.db'),
    homebrew: fs.existsSync(path.join(root, 'packs/talents-homebrew.db')) ? nd('packs/talents-homebrew.db') : []
  };
}

export function reconcile({ canonical, manifests, addendum, registry, closeout, production, trees, homebrew, textCorrections = { entries: [] } }) {
  const findings = [];
  const add = (code, identity, detail) => findings.push({ code, identity, detail });
  const prodById = new Map(production.map(t => [t._id, t]));
  const regByKey = new Map(registry.map(e => [e.canonicalTreeKey, e]));

  // --- authority: certified identities + addendum ---
  const authority = new Map(); // identity -> { name, treeKey, treeName, publications[{sourcebook,page,type}], origin }
  let claims = 0;
  for (const r of canonical.records) {
    authority.set(r.canonicalIdentity, { name: r.name, treeKey: r.canonicalTreeKey, origin: 'CERTIFIED', publications: r.publications.map(p => ({ sourcebook: p.sourcebook, page: p.page, type: p.publicationType })), primary: { sourcebook: r.source, page: r.page } });
    claims += r.publications.length;
  }
  const certifiedClaims = claims;
  if (certifiedClaims !== closeout.totals.certifiedPublicationClaims) add('CLAIM_COUNT_MISMATCH', null, `canonical publications hold ${certifiedClaims} claims; the Phase 2 closeout certified ${closeout.totals.certifiedPublicationClaims}`);
  for (const a of addendum.additions) {
    if (authority.has(a.canonicalIdentity)) { add('DUPLICATE_MAPPING', a.canonicalIdentity, 'addendum identity is already certified'); continue; }
    authority.set(a.canonicalIdentity, { name: a.name, treeKey: a.canonicalTreeKey, origin: 'ADDENDUM_3E', publications: [{ sourcebook: a.publication.sourcebook, page: a.publication.page, type: a.publication.publicationType }], primary: { sourcebook: a.publication.sourcebook, page: a.publication.page } });
    claims += 1;
  }

  // --- claim identity -> production id (Phase 3B manifests; 3E addendum for the seven) ---
  const idToProd = new Map(), idToTree = new Map(), manifestSeen = new Map();
  for (const { manifest } of manifests) for (const rec of manifest.records) {
    const i = rec.identityResolution, pid = i.productionRecordId || i.createRecordId;
    manifestSeen.set(rec.canonicalIdentity, (manifestSeen.get(rec.canonicalIdentity) ?? 0) + 1);
    if (!idToTree.has(rec.canonicalIdentity)) idToTree.set(rec.canonicalIdentity, rec.targetTree?.treeId ?? null);
    if (!idToProd.has(rec.canonicalIdentity)) idToProd.set(rec.canonicalIdentity, pid);
    else if (idToProd.get(rec.canonicalIdentity) !== pid) add('DUPLICATE_MAPPING', rec.canonicalIdentity, `identity maps to two production ids (${idToProd.get(rec.canonicalIdentity)}, ${pid})`);
  }
  for (const a of addendum.additions) { idToProd.set(a.canonicalIdentity, a.production.id); idToTree.set(a.canonicalIdentity, a.production.registryTreeIds[0]); }

  // --- per-identity checks ---
  const byProd = new Map();
  const treeOf = id => trees.filter(t => t.system.talentIds.includes(id));
  const treeKeyToTree = new Map();
  const stats = { exactSourcePage: 0, wrongSourcePage: 0 };
  for (const [identity, a] of authority) {
    const pid = idToProd.get(identity), p = pid && prodById.get(pid);
    if (!p) { add('CLAIM_WITHOUT_RECORD', identity, pid ? `production id ${pid} does not exist` : 'no manifest maps this identity to a production record'); continue; }
    if (!byProd.has(pid)) byProd.set(pid, []); byProd.get(pid).push(identity);
    if (p.name !== a.name) add('NAME_MISMATCH', identity, `production name is "${p.name}"`);
    // expected tree = the Phase 3B manifest's target tree (the Phase 1D registry snapshot predates the trees Phase 3C created)
    const expectedTree = idToTree.get(identity), memberOf = treeOf(pid), treeName = a.treeKey.split('|')[1];
    const regIds = regByKey.get(a.treeKey)?.repoTreeIds ?? [];
    if (!expectedTree || (regIds.length && !regIds.includes(expectedTree))) add('WRONG_TREE', identity, `manifest target tree ${expectedTree} is not registry tree ${a.treeKey}`);
    else if (memberOf.length !== 1 || memberOf[0]._id !== expectedTree) add('WRONG_TREE', identity, `member of [${memberOf.map(t => `${t.name}/${t._id}`).join(', ')}], expected ${expectedTree}`);
    else {
      if (memberOf[0].name !== treeName) add('TREE_DISPLAY_NAME_DRIFT', identity, `tree ${expectedTree} is named "${memberOf[0].name}", canonical "${treeName}"`);
      if (!treeKeyToTree.has(a.treeKey)) treeKeyToTree.set(a.treeKey, expectedTree);
      if (treeKeyToTree.get(a.treeKey) !== expectedTree) add('WRONG_TREE', identity, `canonical tree ${a.treeKey} is split across production trees ${treeKeyToTree.get(a.treeKey)} and ${expectedTree}`);
      if (p.system.treeId !== expectedTree) {
        if (slugify(treeName) === String(p.system.treeId).replace(/_/g, '-')) add('STALE_TREE_ID_SLUG', identity, `system.treeId "${p.system.treeId}" is the slug of the correct tree`);
        else add('WRONG_TREE', identity, `system.treeId "${p.system.treeId}" does not resolve to ${treeName} (${expectedTree})`);
      }
    }
    const okSource = a.publications.some(x => x.sourcebook === p.system.source && x.page === p.system.page) || (a.primary.sourcebook === p.system.source && a.primary.page === p.system.page);
    if (okSource) stats.exactSourcePage++; else { stats.wrongSourcePage++; add('WRONG_SOURCE_PAGE', identity, `production ${p.system.source ?? 'null'} p.${p.system.page ?? 'null'}; authority ${a.publications.map(x => `${x.sourcebook} p.${x.page}`).join(' | ')}`); }
  }
  const treeToKey = new Map();
  for (const [k, t] of treeKeyToTree) { if (treeToKey.has(t)) add('WRONG_TREE', k, `production tree ${t} is shared by canonical trees ${treeToKey.get(t)} and ${k}`); treeToKey.set(t, k); }
  for (const [pid, ids] of byProd) if (ids.length > 1) add('DUPLICATE_MAPPING', ids.join(' & '), `${ids.length} identities map to production record ${pid}`);
  for (const [identity, n] of manifestSeen) if (n > 1 && !authority.has(identity)) add('DUPLICATE_MAPPING', identity, 'manifest lists an identity not in the authority');
  for (const t of production) if (!byProd.has(t._id)) add('RECORD_WITHOUT_CLAIM', `${t._id} ${t.name}`, 'canonical production record has no certified claim');

  // --- duplicate production records (same name in the same canonical tree) and same-name cross-tree ambiguity ---
  const byNameTree = new Map();
  for (const t of production) for (const tr of treeOf(t._id)) { const k = `${tr._id}|${t.name}`; byNameTree.set(k, [...(byNameTree.get(k) ?? []), t._id]); }
  for (const [k, ids] of byNameTree) if (ids.length > 1) add('DUPLICATE_RECORD_IN_TREE', k, `${ids.length} production records share this name in one tree`);
  const nameGroups = new Map();
  for (const [identity, a] of authority) nameGroups.set(a.name, [...(nameGroups.get(a.name) ?? []), identity]);
  let crossTreeGroups = 0;
  for (const [name, identities] of nameGroups) {
    if (identities.length < 2) continue;
    crossTreeGroups++;
    const pids = identities.map(i => idToProd.get(i)), treeKeys = identities.map(i => authority.get(i).treeKey);
    const prodSameName = production.filter(t => t.name === name).map(t => t._id);
    if (new Set(pids).size !== identities.length || new Set(treeKeys).size !== identities.length || [...prodSameName].sort().join() !== [...pids].sort().join()) add('UNRESOLVED_SAME_NAME_AMBIGUITY', name, `${identities.length} identities vs ${prodSameName.length} production records of that name`);
  }
  for (const g of canonical.sameNameDifferentTreeGroups) if ((nameGroups.get(g.name) ?? []).length < 2) add('UNRESOLVED_SAME_NAME_AMBIGUITY', g.name, 'certified same-name group no longer has two identities');

  // --- text: production must equal the certified canonical text (whitespace-insensitive), or the text after an APPROVED correction
  //     (3E addendum rows; PDF_VERIFIED 3E-5 defect entries). Anything else is silent drift. ---
  const ws = x => String(x ?? '').replace(/\s+/g, ' ').trim();
  const descOf = t => (t.system.description && typeof t.system.description === 'object') ? t.system.description.value : t.system.description;
  const prodText = t => ({ prerequisites: t.system.prerequisites, benefit: t.system.benefit, description: descOf(t), summary: t.system.summary });
  const canonByIdentity = new Map(canonical.records.map(r => [r.canonicalIdentity, r]));
  const fixesByProd = new Map();
  for (const e of textCorrections.entries) if (e.verification?.status === 'PDF_VERIFIED') fixesByProd.set(e.productionId, [...(fixesByProd.get(e.productionId) ?? []), e]);
  let textChecked = 0, textCorrected = 0;
  for (const [identity] of authority) {
    const pid = idToProd.get(identity), p = pid && prodById.get(pid); if (!p) continue;
    const cur = prodText(p), allowed = {};
    const c = canonByIdentity.get(identity), addRow = addendum.additions.find(a => a.canonicalIdentity === identity);
    if (c) for (const f of Object.keys(cur)) allowed[f] = [ws(c[f])];
    else if (addRow) { allowed.prerequisites = [ws(addRow.prerequisites), ws(addRow.production.prerequisites)]; allowed.benefit = allowed.description = [ws(addRow.rulesText), ws(addRow.production.benefit)]; }
    // approved corrections apply in id order; every intermediate state is an allowed state (base, after TD-a, after TD-a+TD-b, ...)
    for (const e of (fixesByProd.get(pid) ?? []).sort((x, y) => x.id.localeCompare(y.id))) for (const f of e.fields) {
      const prev = allowed[f]?.at(-1) ?? '';
      const next = e.action === 'REPLACE_FIELDS' ? ws(e.after[f]) : ws(prev.replace(ws(e.find), ws(e.replace)));
      allowed[f] = [...(allowed[f] ?? []), next];
    }
    for (const f of Object.keys(allowed)) {
      if (f === 'summary' && (cur.summary === undefined || cur.summary === null) && !c) continue;
      textChecked++;
      const got = ws(cur[f]);
      if (!allowed[f].includes(got)) add('TEXT_DRIFT', identity, `${f} in production matches neither the certified canonical text nor an approved correction`);
      else if (got !== allowed[f][0]) textCorrected++;
    }
  }

  // --- homebrew is outside the denominator ---
  for (const h of homebrew) if (prodById.has(h._id)) add('HOMEBREW_IN_DENOMINATOR', `${h._id} ${h.name}`, 'homebrew talent id also in the canonical pack');

  const count = codes => Object.fromEntries(codes.map(c => [c, findings.filter(f => f.code === c).length]));
  return {
    schemaVersion: 1, phase: '3E-3', productionMutationPerformed: false,
    invariant: 'every certified published claim maps to exactly one canonical production record, and every canonical production record is explained by exactly one certified identity',
    textInvariant: { fieldsChecked: textChecked, fieldsAtApprovedCorrection: textCorrected },
    denominator: { certifiedClaims, addendumClaims: addendum.additions.length, totalClaims: claims, identities: authority.size, productionCanonicalRecords: production.length, homebrewExcluded: homebrew.length, crossTreeSameNameGroups: crossTreeGroups },
    sourcePageAgreement: stats,
    findingCounts: { ...count(BLOCKING), ...count(METADATA) },
    blockingFindings: findings.filter(f => BLOCKING.includes(f.code)),
    metadataFindings: findings.filter(f => METADATA.includes(f.code))
  };
}

function renderMd(r) {
  const d = r.denominator;
  return ['# Phase 3E-3 — Publication-to-production reconciliation', '',
    'Read-only. Generator: `node tools/reconcile-talent-publication-corpus.mjs` · data: `data/audits/talent-phase-3e-publication-reconciliation.json`.', '',
    `**Invariant:** ${r.invariant}.`, '',
    `Denominator: ${d.certifiedClaims} certified claims + ${d.addendumClaims} 3E addendum claims = ${d.totalClaims} claims → ${d.identities} identities ↔ ${d.productionCanonicalRecords} canonical production records. ${d.homebrewExcluded} homebrew talents are outside the denominator; ${d.crossTreeSameNameGroups} same-name cross-tree groups are resolved by tree identity, never by name.`, '',
    '| Finding | Count | Blocking |', '|---|---|---|',
    ...Object.entries(r.findingCounts).map(([k, v]) => `| ${k} | ${v} | ${BLOCKING.includes(k) ? 'yes' : 'no (metadata: source/page repair unit or Phase 3F)'} |`), '',
    `Text invariant: ${r.textInvariant.fieldsChecked} text fields (prerequisites, benefit, description, summary) equal the certified canonical text or an approved correction (${r.textInvariant.fieldsAtApprovedCorrection} currently at an approved correction).`, '',
    `Source/page agreement: ${r.sourcePageAgreement.exactSourcePage} of ${r.sourcePageAgreement.exactSourcePage + r.sourcePageAgreement.wrongSourcePage} identities carry a production source/page that matches a certified publication.`, '',
    r.blockingFindings.length ? '## Blocking findings\n\n' + r.blockingFindings.map(f => `- **${f.code}** ${f.identity}: ${f.detail}`).join('\n') + '\n' : 'No blocking findings.', '',
    r.metadataFindings.length ? '## Source/page metadata findings\n\n' + r.metadataFindings.map(f => `- ${f.identity}: ${f.detail}`).join('\n') + '\n' : 'No source/page findings.', ''].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = reconcile(loadInput());
  const json = JSON.stringify(report, null, 2) + '\n', md = renderMd(report);
  if (process.argv.includes('--check')) {
    const bad = [];
    if (report.blockingFindings.length) bad.push(`${report.blockingFindings.length} blocking findings`);
    if (!fs.existsSync(path.join(ROOT, OUT_JSON)) || read(OUT_JSON) !== json || !fs.existsSync(path.join(ROOT, OUT_MD)) || read(OUT_MD) !== md) bad.push('committed reconciliation report is stale');
    if (bad.length) { console.error('[reconcile-corpus] FAIL: ' + bad.join(' | ')); report.blockingFindings.slice(0, 20).forEach(f => console.error(`  ${f.code} ${f.identity}: ${f.detail}`)); process.exit(1); }
    console.log(`[reconcile-corpus] PASS: ${report.denominator.totalClaims} claims / ${report.denominator.identities} identities ↔ ${report.denominator.productionCanonicalRecords} production records`);
  } else {
    fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md);
    console.log(JSON.stringify({ denominator: report.denominator, findingCounts: report.findingCounts, sourcePage: report.sourcePageAgreement }, null, 1));
  }
}
