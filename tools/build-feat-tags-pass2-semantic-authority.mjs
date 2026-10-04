#!/usr/bin/env node
// Deterministic Pass 2 working semantic authority = immutable Pass 1 authority + owner adjudication overlay (Batch 1).
// Pass 1 is never edited. Every overlay operation is asserted against the Pass 1 state; any mismatch fails the build.
// Output is byte-stable (no timestamps). Writes only the two Pass 2 authority files. Never touches production feat data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTHORITY_PATH, PASS2_AUTHORITY_PATH, PASS2_STATUS, ROOT, loadContext, validateAuthority } from './validate-feat-tags-semantic-authority.mjs';

export const OVERLAY_PATH = 'data/audits/feat-tags-pass2-owner-adjudication.json';
export const PASS2_MD_PATH = 'docs/audits/feat-tags-pass2-semantic-authority.md';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const TERMINAL = new Set(['PASS2_OWNER_APPROVED', 'PASS2_OWNER_CORRECTED', 'PASS2_FALSE_POSITIVE', 'PASS2_INTENTIONAL_DIVERGENCE', 'PASS2_INVALID_FAMILY_REFERENCE']);

// Pure: returns { auth, changes }. Throws on any overlay/Pass 1 inconsistency.
export function derive(pass1, overlay, ctx) {
  const err = (m) => { throw new Error(`PASS2 BUILD FAILED: ${m}`); };
  if (pass1.status !== 'PASS1_COMPLETE_ALL_353_QC2_STANDARD') err(`Pass 1 status ${pass1.status}`);
  if (overlay.kind !== 'FEAT_TAGS_PASS2_OWNER_ADJUDICATION' || overlay.batch !== 1) err('overlay kind/batch');
  const auth = JSON.parse(JSON.stringify(pass1));
  const byId = new Map(auth.assignments.map(a => [a.canonicalId, a]));
  const seen = new Set();
  const take = (id, name, bucket) => {
    const a = byId.get(id);
    if (!a) err(`${bucket}: unknown canonical ID ${id} (${name})`);
    if (a.name !== name) err(`${bucket}: ${id} is "${a.name}", overlay says "${name}"`);
    return a;
  };
  const changes = [];
  for (const c of overlay.tagChanges) {
    if (!TERMINAL.has(c.ruling)) err(`${c.name}: non-terminal ruling ${c.ruling}`);
    if (seen.has(c.canonicalId)) err(`${c.name}: duplicate tag change entry`);
    seen.add(c.canonicalId);
    const a = take(c.canonicalId, c.name, 'tagChanges');
    const before = [...a.finalTags];
    for (const t of c.add) { if (!ctx.vocabulary.has(t)) err(`${c.name}: ADD ${t} is not in the approved vocabulary`); if (before.includes(t)) err(`${c.name}: ADD ${t} already present in Pass 1`); }
    for (const t of c.remove) if (!before.includes(t)) err(`${c.name}: REMOVE ${t} not present in Pass 1`);
    for (const t of c.keep || []) if (!before.includes(t)) err(`${c.name}: KEEP ${t} not present in Pass 1`);
    const after = [...before.filter(t => !c.remove.includes(t)), ...c.add];
    a.pass1FinalTags = before;
    a.finalTags = after;
    for (const t of c.add) a.rationale[t] = `Pass 2 owner adjudication (${c.ruling}): ${c.reason}`;
    const removedRationale = {};
    for (const t of c.remove) { removedRationale[t] = a.rationale[t] ?? null; delete a.rationale[t]; }
    if (Array.isArray(a.proposedTags)) a.pass1ProposedTags = [...a.proposedTags];
    a.pass2Adjudication = { batch: 1, ruling: c.ruling, family: c.family, added: [...c.add], removed: [...c.remove], reason: c.reason, ...(c.doNotInfer ? { doNotInfer: [...c.doNotInfer] } : {}), ...(c.remove.length ? { removedTagPass1Rationale: removedRationale } : {}) };
    changes.push({ canonicalId: c.canonicalId, name: c.name, ruling: c.ruling, before, after, added: [...c.add], removed: [...c.remove] });
  }
  for (const r of overlay.rejectedFindings) {
    if (!TERMINAL.has(r.ruling)) err(`${r.name}: non-terminal ruling ${r.ruling}`);
    const a = take(r.canonicalId, r.name, 'rejectedFindings');
    if (a.finalTags.includes(r.rejectedTag)) err(`${r.name}: rejected tag ${r.rejectedTag} is present`);
    (a.pass2Rejections ||= []).push({ batch: 1, ruling: r.ruling, rejectedTag: r.rejectedTag, source: r.source, reason: r.reason });
  }
  for (const fr of overlay.familyReviews) {
    if (!TERMINAL.has(fr.ruling)) err(`${fr.label}: non-terminal ruling ${fr.ruling}`);
    for (const [id, want] of Object.entries(fr.expectedFinalTags || {})) {
      const a = byId.get(id);
      if (!a) err(`${fr.label}: unknown canonical ID ${id}`);
      if (JSON.stringify([...a.finalTags].sort()) !== JSON.stringify([...want].sort())) err(`${fr.label}: ${a.name} final tags ${a.finalTags.join(',')} != owner-expected ${want.join(',')}`);
    }
  }
  const pc = overlay.publicationCategory;
  const publicationChanges = [];
  for (const c of pc.corrections) {
    const a = take(c.canonicalId, c.name, 'publicationCategory.corrections');
    const from = a.publicationCategory;
    if (from === c.to) err(`${c.name}: category already ${c.to}`);
    const m = ctx.manifest.records.find(r => r.canonicalId === c.canonicalId);
    if (m.publicationCategory !== c.to) err(`${c.name}: ruling ${c.to} disagrees with identity manifest ${m.publicationCategory}`);
    a.pass1PublicationCategory = from;
    a.publicationCategory = c.to;
    publicationChanges.push({ canonicalId: c.canonicalId, name: c.name, from, to: c.to });
  }
  for (const c of pc.multiClaim) {
    const a = take(c.canonicalId, c.name, 'publicationCategory.multiClaim');
    const m = ctx.manifest.records.find(r => r.canonicalId === c.canonicalId);
    if (m.publicationCategory !== c.primaryPublicationCategory) err(`${c.name}: primary category ${c.primaryPublicationCategory} disagrees with identity manifest ${m.publicationCategory}`);
    const from = a.publicationCategory;
    a.pass1PublicationCategory = from;
    a.publicationCategory = c.primaryPublicationCategory;
    a.primaryPublicationCategory = c.primaryPublicationCategory;
    a.publicationCategories = c.publicationCategories.map(x => ({ ...x }));
    publicationChanges.push({ canonicalId: c.canonicalId, name: c.name, from, to: c.primaryPublicationCategory, claims: c.publicationCategories.map(x => `${x.source} p.${x.page}: ${x.category}`) });
  }
  auth.phase = 'TAGS_PASS_2';
  auth.status = PASS2_STATUS;
  auth.pass2 = {
    batch: 1, derivedFrom: { pass1Authority: AUTHORITY_PATH, pass1Status: pass1.status, overlay: OVERLAY_PATH, overlayStatus: overlay.status },
    pass1Immutable: true, productionMutated: false, tagRecordsChanged: changes.length, publicationCategoryRecordsChanged: publicationChanges.length,
    falsePositiveRecords: overlay.rejectedFindings.length, familyReviewsClosed: overlay.familyReviews.length, invalidFamilyReferences: overlay.invalidFamilyReferences.map(x => x.label)
  };
  return { auth, changes, publicationChanges };
}

function renderMd(auth, changes, publicationChanges, overlay) {
  const t = (a) => a.length ? a.map(x => `\`${x}\``).join(', ') : '—';
  const L = ['# Feat Tags — Pass 2 Working Semantic Authority (Owner Adjudication Batch 1)', '',
    `Derived deterministically from the immutable Pass 1 authority (\`${AUTHORITY_PATH}\`) plus the owner overlay (\`${OVERLAY_PATH}\`). Status: \`${auth.status}\`. **Not production-final; no production record was changed.**`, '',
    '## Tag changes', '', '| Feat | Ruling | Before | After |', '| --- | --- | --- | --- |',
    ...changes.map(c => `| ${c.name} (\`${c.canonicalId}\`) | ${c.ruling} | ${t(c.before)} | ${t(c.after)} |`), '',
    '### Operations', '', ...changes.map(c => `- **${c.name}**: ADD ${t(c.added)}; REMOVE ${t(c.removed)}`), '',
    '## Publication-category structural changes', '', '| Feat | Pass 1 | Pass 2 |', '| --- | --- | --- |',
    ...publicationChanges.map(p => `| ${p.name} (\`${p.canonicalId}\`) | ${p.from} | ${p.to}${p.claims ? ` (claims: ${p.claims.join('; ')})` : ''} |`), '',
    '## Reviewed false positives (no tag change)', '', ...overlay.rejectedFindings.map(r => `- ${r.name} (\`${r.canonicalId}\`): not \`${r.rejectedTag}\` — ${r.ruling}. ${r.reason}`), '',
    '## Family reviews closed without tag change', '', ...overlay.familyReviews.map(f => `- ${f.label} — ${f.ruling}. ${f.reason}`), '',
    '## Invalid family references', '', ...overlay.invalidFamilyReferences.map(f => `- ${f.label} — ${f.ruling}. ${f.reason}`), '',
    'Full per-feat records (including `pass1FinalTags` and `pass2Adjudication`) are in the JSON.', ''];
  return L.join('\n');
}

export function buildOutputs() {
  const pass1 = readJson(AUTHORITY_PATH), overlay = readJson(OVERLAY_PATH), ctx = loadContext();
  const p1 = validateAuthority(pass1, ctx);
  if (p1.failures.length) throw new Error('Pass 1 authority fails validation: ' + p1.failures[0]);
  const { auth, changes, publicationChanges } = derive(pass1, overlay, ctx);
  const v = validateAuthority(auth, ctx, { pass: 2 });
  if (v.failures.length) throw new Error(`Pass 2 authority fails validation (${v.failures.length}): ${v.failures.slice(0, 5).join(' | ')}`);
  return { json: JSON.stringify(auth, null, 2) + '\n', md: renderMd(auth, changes, publicationChanges, overlay), changes, publicationChanges, stats: v.stats };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs();
  if (process.argv.includes('--check')) {
    const same = fs.readFileSync(path.join(ROOT, PASS2_AUTHORITY_PATH), 'utf8') === out.json && fs.readFileSync(path.join(ROOT, PASS2_MD_PATH), 'utf8') === out.md;
    if (!same) { console.error('Committed Pass 2 authority differs from a fresh derivation'); process.exit(1); }
    console.log('PASS 2 AUTHORITY MATCHES A FRESH DERIVATION');
  } else {
    fs.writeFileSync(path.join(ROOT, PASS2_AUTHORITY_PATH), out.json);
    fs.writeFileSync(path.join(ROOT, PASS2_MD_PATH), out.md);
    console.log(`PASS 2 AUTHORITY BUILT: ${out.changes.length} tag-changed records, ${out.publicationChanges.length} publication-category records; tags used ${out.stats.tagsUsed}, zero-use ${out.stats.zeroUse}`);
  }
}
