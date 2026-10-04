#!/usr/bin/env node
// Pass 3B working semantic authority = Pass 3B comparison baseline (Feat Pass 2 authority + Talent Pass 3A authority) + cumulative owner overlay.
// Claude executes explicit owner decisions only. Fails closed on identity/name/vocabulary/duplicate/implication violations and on any count discrepancy.
// Writes only the working-authority JSON/MD. Never touches production packs/catalogs or the immutable input authorities.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { BASELINE3B_PATH, SOURCE_FILES, sha, buildBaseline3B } from './build-talent-feat-pass3b-mechanic-baseline.mjs';

export const OWNER_OVERLAY_PATH = 'data/audits/talent-feat-pass3b-owner-adjudication.json';
export const OWNER_OVERLAY_MD = 'docs/audits/talent-feat-pass3b-owner-adjudication.md';
export const AUTH3B_JSON = 'data/audits/talent-feat-pass3b-semantic-authority.json';
export const AUTH3B_MD = 'docs/audits/talent-feat-pass3b-semantic-authority.md';
export const STATUS = 'PASS3B_WORKING_AUTHORITY_OWNER_RULINGS_APPLIED_NOT_PRODUCTION';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const usageOf = (recs, key) => { const u = {}; for (const r of recs) for (const t of r[key]) u[t] = (u[t] || 0) + 1; return u; };

export function derive(baseline, overlay) {
  const err = (m) => { throw new Error(`PASS3B BUILD FAILED: ${m}`); };
  if (overlay.kind !== 'TALENT_FEAT_PASS3B_OWNER_ADJUDICATION') err('overlay kind');
  const vocab = new Set(baseline.sharedVocabulary);
  if (vocab.size !== 187) err(`vocabulary ${vocab.size} != 187`);
  for (const [f, h] of Object.entries(baseline.sourceSha256)) if (sha(f) !== h) err(`source authority changed since the baseline pin: ${f}`);
  const recs = baseline.records.map(r => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, baselineTags: [...r.tags], finalTags: [...r.tags] }));
  if (recs.length !== 1540) err(`records ${recs.length} != 1540`);
  const index = new Map(); for (const r of recs) { const k = `${r.domain}:${r.canonicalId}`; if (index.has(k)) err(`duplicate identity ${k}`); index.set(k, r); }
  const seen = new Set(); const changes = new Map(); let adds = 0, noChange = 0;
  for (const d of overlay.decisions) {
    const key = `${d.domain}:${d.canonicalId}|${d.tag}`;
    if (d.decisionId !== key) err(`decision id ${d.decisionId} != ${key}`);
    if (seen.has(key)) err(`duplicate owner decision ${key}`);
    seen.add(key);
    const r = index.get(`${d.domain}:${d.canonicalId}`);
    if (!r) err(`${key}: identity does not resolve exactly once`);
    if (r.name !== d.name) err(`${key}: name guard "${r.name}" != "${d.name}"`);
    if (!vocab.has(d.tag)) err(`${key}: tag outside the 187-tag vocabulary`);
    if (!['ADD', 'NO_CHANGE'].includes(d.ownerAction)) err(`${key}: owner action ${d.ownerAction} is not authorized in this overlay version`);
    if (r.baselineTags.includes(d.tag)) err(`${key}: tag already present in the baseline (${d.ownerAction})`);
    if (d.ownerAction === 'ADD') {
      r.finalTags.push(d.tag); adds++;
      (changes.get(r) || changes.set(r, []).get(r)).push(d);
    } else noChange++;
  }
  const bad = [];
  for (const r of recs) {
    if (new Set(r.finalTags).size !== r.finalTags.length) err(`${r.domain} ${r.name}: duplicate final tags`);
    for (const [a, b] of REQUIRED_IMPLICATIONS) if (r.finalTags.includes(a) && !r.finalTags.includes(b)) bad.push(`${r.domain} ${r.name}: ${a} -> ${b}`);
    const removed = r.baselineTags.filter(t => !r.finalTags.includes(t)); if (removed.length) err(`${r.name}: unauthorized removal ${removed}`);
  }
  if (bad.length) err(`implication violations: ${bad.slice(0, 5).join(' | ')}`);
  const addRecords = [...changes.keys()];
  const noChangeOnly = new Set(overlay.decisions.filter(d => d.ownerAction === 'NO_CHANGE').map(d => `${d.domain}:${d.canonicalId}`));
  for (const r of addRecords) noChangeOnly.delete(`${r.domain}:${r.canonicalId}`);
  const newTags = new Set(recs.flatMap(r => r.finalTags).filter(t => !vocab.has(t)));
  for (const b of overlay.batches) {
    const ds = overlay.decisions.filter(d => d.batch === b.batch);
    const ar = new Set(ds.filter(d => d.ownerAction === 'ADD').map(d => `${d.domain}:${d.canonicalId}`)), at = ds.filter(d => d.ownerAction === 'ADD').length;
    const nr = new Set(ds.filter(d => d.ownerAction === 'NO_CHANGE').map(d => `${d.domain}:${d.canonicalId}`)); for (const x of ar) nr.delete(x);
    const e = b.expected;
    if (ar.size !== e.recordsWithAdd || at !== e.tagAdditions || nr.size !== e.recordsWithOnlyNoChange || e.removals !== 0 || newTags.size !== e.newTags) err(`DISCREPANCY in batch ${b.batch}: derived ${ar.size} ADD records / ${at} additions / ${nr.size} no-change-only records / ${newTags.size} new tags; owner expected ${e.recordsWithAdd} / ${e.tagAdditions} / ${e.recordsWithOnlyNoChange} / ${e.newTags}. Not applying; report to the owner.`);
  }
  const before = usageOf(recs, 'baselineTags'), after = usageOf(recs, 'finalTags');
  const tagUsage = baseline.sharedVocabulary.map(t => ({ tag: t, before: before[t] || 0, after: after[t] || 0 })).sort((x, y) => y.after - x.after || cmp(x.tag, y.tag));
  const changeList = addRecords.sort((a, b) => cmp(a.domain, b.domain) || cmp(a.canonicalId, b.canonicalId)).map(r => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name, added: changes.get(r).map(d => d.tag), before: r.baselineTags, after: r.finalTags, decisions: changes.get(r).map(d => ({ decisionId: d.decisionId, policy: d.ownerPolicyApplied, batch: d.batch })) }));
  for (const r of recs) { const c = changes.get(r); if (c) r.ownerAdditions = c.map(d => ({ tag: d.tag, batch: d.batch, policy: d.ownerPolicyApplied, decisionId: d.decisionId })); }
  const auth = {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B_SEMANTIC_AUTHORITY', status: STATUS,
    note: 'Audit-only working authority: Pass 2 feat authority + Pass 3A talent authority + cumulative Pass 3B owner overlay. Not applied to production.',
    derivedFrom: { baseline: BASELINE3B_PATH, overlay: OWNER_OVERLAY_PATH, sourceSha256: baseline.sourceSha256 },
    sharedVocabulary: { count: vocab.size, newTagsIntroduced: 0 },
    counts: { feats: recs.filter(r => r.domain === 'FEAT').length, talents: recs.filter(r => r.domain === 'TALENT').length, combined: recs.length, recordsChanged: changeList.length, recordsChangedByDomain: { FEAT: changeList.filter(c => c.domain === 'FEAT').length, TALENT: changeList.filter(c => c.domain === 'TALENT').length }, tagAdditions: adds, removals: 0, noChangeDecisions: noChange, recordsWithOnlyNoChange: noChangeOnly.size, ownerDecisions: overlay.decisions.length, productionMutated: false,
      tagInstancesBefore: recs.reduce((n, r) => n + r.baselineTags.length, 0), tagInstancesAfter: recs.reduce((n, r) => n + r.finalTags.length, 0) },
    tagUsage, changes: changeList, records: recs
  };
  return { auth, changeList, tagUsage };
}

const t = (x) => x.map(y => `\`${y}\``).join(', ');
function renderOverlayMd(o) {
  const L = ['# Talent/Feat Pass 3B — Cumulative Owner Adjudication', '', o.note, '', '## Owner policies', '', ...o.ownerPolicies.map(p => `- **${p.id}** — ${p.text}`), '',
    ...o.batches.flatMap(b => [`## Batch ${b.batch} — ${b.title}`, '', `Expected by owner: ${b.expected.recordsWithAdd} records with ADD, ${b.expected.tagAdditions} tag additions, ${b.expected.recordsWithOnlyNoChange} records NO_CHANGE only, ${b.expected.removals} removals, ${b.expected.newTags} new tags.`, '',
      ...(b.ownerDirectedCompletions || []).map(c => `Owner-directed completion beyond the detector: ${c.name} (\`${c.canonicalId}\`) ${t(c.tags)} — ${c.note}`), '',
      '| Action | Domain | Name | ID | Tag | Policy | Evidence reference |', '| --- | --- | --- | --- | --- | --- | --- |',
      ...o.decisions.filter(d => d.batch === b.batch).map(d => `| ${d.ownerAction} | ${d.domain} | ${d.name} | \`${d.canonicalId}\` | \`${d.tag}\` | ${d.ownerPolicyApplied} | ${d.detectorEvidenceReference.join('; ')} |`), '']),
    '## Rationale', '', ...o.decisions.map(d => `- ${d.ownerAction} \`${d.tag}\` — ${d.name} (${d.domain} \`${d.canonicalId}\`): ${d.ownerRationale}`), ''];
  return L.join('\n');
}
function renderMd(a) {
  const L = ['# Talent/Feat Pass 3B — Working Semantic Authority', '', `Status \`${a.status}\`. Audit only; production packs and catalogs are unchanged.`, '',
    `- Identities: ${a.counts.combined} (${a.counts.feats} feats + ${a.counts.talents} talents); shared vocabulary ${a.sharedVocabulary.count}; new tags introduced ${a.sharedVocabulary.newTagsIntroduced}`,
    `- Owner decisions: ${a.counts.ownerDecisions} (${a.counts.tagAdditions} ADD, ${a.counts.noChangeDecisions} NO_CHANGE); records changed ${a.counts.recordsChanged} (${a.counts.recordsChangedByDomain.FEAT} feat / ${a.counts.recordsChangedByDomain.TALENT} talent); records with NO_CHANGE only ${a.counts.recordsWithOnlyNoChange}; removals ${a.counts.removals}`,
    `- Tag instances ${a.counts.tagInstancesBefore} -> ${a.counts.tagInstancesAfter}`, '', '## Changed records (before -> after)', '', '| Domain | Name | ID | Added | Before | After |', '| --- | --- | --- | --- | --- | --- |',
    ...a.changes.map(c => `| ${c.domain} | ${c.name} | \`${c.canonicalId}\` | ${t(c.added)} | ${t(c.before)} | ${t(c.after)} |`), '', '## Tag usage changes', '', '| Tag | Before | After |', '| --- | ---: | ---: |', ...a.tagUsage.filter(u => u.before !== u.after).map(u => `| \`${u.tag}\` | ${u.before} | ${u.after} |`), ''];
  return L.join('\n');
}
export function buildOutputs() {
  const baseline = readJson(BASELINE3B_PATH);
  if (JSON.stringify(buildBaseline3B(), null, 2) + '\n' !== fs.readFileSync(path.join(ROOT, BASELINE3B_PATH), 'utf8')) throw new Error('PASS3B BUILD FAILED: committed baseline differs from a fresh build');
  const overlay = readJson(OWNER_OVERLAY_PATH);
  const { auth, changeList, tagUsage } = derive(baseline, overlay);
  return { auth, changeList, tagUsage, json: JSON.stringify(auth, null, 2) + '\n', md: renderMd(auth), overlayMd: renderOverlayMd(overlay) };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs();
  if (process.argv.includes('--check')) {
    const same = fs.readFileSync(path.join(ROOT, AUTH3B_JSON), 'utf8') === out.json && fs.readFileSync(path.join(ROOT, AUTH3B_MD), 'utf8') === out.md && fs.readFileSync(path.join(ROOT, OWNER_OVERLAY_MD), 'utf8') === out.overlayMd;
    if (!same) { console.error('Committed Pass 3B authority/overlay docs differ from a fresh derivation'); process.exit(1); }
    console.log('PASS 3B AUTHORITY MATCHES A FRESH DERIVATION');
  } else {
    fs.writeFileSync(path.join(ROOT, AUTH3B_JSON), out.json); fs.writeFileSync(path.join(ROOT, AUTH3B_MD), out.md); fs.writeFileSync(path.join(ROOT, OWNER_OVERLAY_MD), out.overlayMd);
    const c = out.auth.counts;
    console.log(`PASS 3B AUTHORITY BUILT: ${c.combined} identities; ${c.recordsChanged} records changed (${c.recordsChangedByDomain.FEAT} feat / ${c.recordsChangedByDomain.TALENT} talent); ${c.tagAdditions} additions; ${c.recordsWithOnlyNoChange} no-change-only records; removals ${c.removals}`);
  }
}
