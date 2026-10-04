#!/usr/bin/env node
// Deterministic Pass 3A working talent semantic authority = Pass 3A baseline (certified Phase 12 final state) + owner overlay (ADD-only).
// Fails closed on any identity/guard/vocabulary/implication/immutability violation. Byte-stable output (no timestamps).
// Writes only the working-authority JSON/MD. Never touches packs/talents.db or any Phase 12 authority file.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ROOT, BASELINE_PATH, PHASE12_FILES, OWNER_SKILL_TAGS, sharedVocabulary, buildBaseline } from './build-talent-feat-pass3a-baseline.mjs';
import { OWNER_SKILL_ADDITIONS } from './validate-feat-tags-semantic-authority.mjs';
import { OVERLAY_PATH } from './audit-talent-feat-pass3a-skill-sweep.mjs';

export const AUTH_JSON = 'data/audits/talent-feat-pass3a-semantic-authority.json';
export const AUTH_MD = 'docs/audits/talent-feat-pass3a-semantic-authority.md';
export const OVERLAY_MD = 'docs/audits/talent-feat-pass3a-skill-owner-adjudication.md';
export const STATUS = 'PASS3A_WORKING_AUTHORITY_ADD_ONLY_NOT_PRODUCTION';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const usageOf = (recs, key) => { const u = {}; for (const r of recs) for (const t of r[key]) u[t] = (u[t] || 0) + 1; return u; };

// Pure given inputs. Throws on any violation.
export function derive(baseline, overlay, vocab) {
  const err = (m) => { throw new Error(`PASS3A BUILD FAILED: ${m}`); };
  if (overlay.kind !== 'TALENT_FEAT_PASS3A_SKILL_OWNER_ADJUDICATION' || overlay.batch !== 1) err('overlay kind/batch');
  if (JSON.stringify(OWNER_SKILL_TAGS) !== JSON.stringify(OWNER_SKILL_ADDITIONS)) err('talent-side owner skill tags differ from the feat-side owner skill tags');
  if (vocab.list.length !== 187) err(`shared vocabulary ${vocab.list.length} != 187`);
  // Immutability: Phase 12 authority files must still hash to the pins recorded in the baseline.
  for (const [f, h] of Object.entries(baseline.phase12AuthoritySha256)) if (sha(f) !== h) err(`historical Phase 12 authority modified: ${f}`);
  const recs = baseline.records.map(r => ({ ...r, baselineTags: [...r.tags], finalTags: [...r.tags] }));
  for (const r of recs) delete r.tags;
  const idCount = new Map();
  for (const r of recs) idCount.set(r.canonicalId, (idCount.get(r.canonicalId) || 0) + 1);
  const resolve = (id, name, where) => {
    if (idCount.get(id) !== 1) err(`${where}: canonical ID ${id} (${name}) resolves ${idCount.get(id) || 0} times`);
    const r = recs.find(x => x.canonicalId === id);
    if (r.name !== name) err(`${where}: ${id} is "${r.name}", overlay says "${name}"`);
    return r;
  };
  const seen = new Set(); let adds = 0; const changes = [];
  for (const a of overlay.additions) {
    if (seen.has(a.canonicalId)) err(`duplicate addition entry for ${a.canonicalId}`);
    seen.add(a.canonicalId);
    if (a.state !== 'PASS3A_OWNER_APPROVED') err(`${a.name}: addition state ${a.state}`);
    if ((a.remove || []).length) err(`${a.name}: ADD-only batch; unauthorized removal ${a.remove.join(',')}`);
    const r = resolve(a.canonicalId, a.name, 'additions');
    if (new Set(a.add).size !== a.add.length) err(`${a.name}: duplicate tag in its own addition`);
    for (const t of a.add) {
      if (!vocab.set.has(t)) err(`${a.name}: tag ${t} is outside the 187-tag shared vocabulary`);
      if (vocab.retired.has(t)) err(`${a.name}: retired tag ${t}`);
      if (r.baselineTags.includes(t)) err(`${a.name}: ADD ${t} already present in the baseline`);
    }
    r.finalTags = [...r.baselineTags, ...a.add];
    adds += a.add.length;
    changes.push({ canonicalId: a.canonicalId, name: a.name, state: a.state, added: [...a.add], sections: [...a.sections], reason: a.reason, before: [...r.baselineTags], after: [...r.finalTags] });
    r.pass3a = { batch: 1, state: a.state, added: [...a.add], sections: [...a.sections], reason: a.reason };
  }
  for (const d of overlay.dispositions) {
    resolve(d.canonicalId, d.name, 'dispositions');
    if (!vocab.set.has(d.tag)) err(`${d.name}: disposition tag ${d.tag} outside the shared vocabulary`);
    if (d.state === 'PASS3A_OWNER_APPROVED') err(`${d.name}: a disposition cannot be an approval`);
    const r = recs.find(x => x.canonicalId === d.canonicalId);
    if (r.finalTags.includes(d.tag) && !r.pass3a?.added.includes(d.tag) ) err(`${d.name}: rejected tag ${d.tag} is present`);
    if (r.pass3a?.added.includes(d.tag)) err(`${d.name}: tag ${d.tag} is both approved and rejected`);
    (r.pass3aDispositions ||= []).push({ tag: d.tag, state: d.state, reason: d.reason });
  }
  for (const r of recs) {
    if (new Set(r.finalTags).size !== r.finalTags.length) err(`${r.name}: duplicate final tags`);
    for (const t of r.finalTags) if (!vocab.set.has(t)) err(`${r.name}: final tag ${t} outside the shared vocabulary`);
    if (r.finalTags.includes('use_the_force') && !r.finalTags.includes('force')) err(`${r.name}: use_the_force without force`);
    const removed = r.baselineTags.filter(t => !r.finalTags.includes(t));
    if (removed.length) err(`${r.name}: unauthorized removal ${removed.join(',')}`);
    if (JSON.stringify(r.finalTags.slice(0, r.baselineTags.length)) !== JSON.stringify(r.baselineTags)) err(`${r.name}: baseline tag order not preserved`);
  }
  const exp = overlay.expected;
  if (changes.length !== exp.uniqueRecords || adds !== exp.tagAdditions) err(`DISCREPANCY: derived ${changes.length} records / ${adds} additions, owner expected ${exp.uniqueRecords} / ${exp.tagAdditions}. Not applying; report to the owner.`);
  const before = usageOf(recs, 'baselineTags'), after = usageOf(recs, 'finalTags');
  const tagUsage = vocab.list.map(t => ({ tag: t, before: before[t] || 0, after: after[t] || 0 })).sort((x, y) => y.after - x.after || cmp(x.tag, y.tag));
  const auth = {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3A_SEMANTIC_AUTHORITY', status: STATUS,
    note: 'Working authority only: baseline + ADD-only owner overlay. Not applied to production; packs/talents.db is unchanged.',
    derivedFrom: { baseline: BASELINE_PATH, overlay: OVERLAY_PATH, packSha256: baseline.packSha256, phase12AuthoritySha256: baseline.phase12AuthoritySha256 },
    sharedVocabulary: { count: vocab.list.length, phase12FinalCount: 181, ownerAuthorizedSkillAdditions: [...OWNER_SKILL_TAGS], tags: vocab.list },
    counts: { talents: recs.length, recordsChanged: changes.length, tagAdditions: adds, removals: 0, productionMutated: false,
      tagInstancesBefore: recs.reduce((n, r) => n + r.baselineTags.length, 0), tagInstancesAfter: recs.reduce((n, r) => n + r.finalTags.length, 0),
      distinctTagsBefore: Object.keys(before).length, distinctTagsAfter: Object.keys(after).length },
    tagUsage, changes: changes.sort((a, b) => cmp(a.canonicalId, b.canonicalId)), records: recs
  };
  return { auth, changes, tagUsage };
}

function renderMd(a) {
  const t = (x) => x.map(y => `\`${y}\``).join(', ');
  const L = ['# Talent/Feat Pass 3A — Working Talent Semantic Authority (Owner Adjudication Batch 1)', '',
    `Status \`${a.status}\`. Baseline (certified Phase 12 final state, 1,187 talents) + ADD-only owner overlay. **packs/talents.db is unchanged; nothing was applied to production.**`, '',
    `- Shared vocabulary: ${a.sharedVocabulary.count} tags (Phase 12 final ${a.sharedVocabulary.phase12FinalCount} + six owner-authorized skill tags).`,
    `- Records changed: **${a.counts.recordsChanged}**; tag additions: **${a.counts.tagAdditions}**; removals: ${a.counts.removals}.`,
    `- Tag instances ${a.counts.tagInstancesBefore} -> ${a.counts.tagInstancesAfter}; distinct tags ${a.counts.distinctTagsBefore} -> ${a.counts.distinctTagsAfter}.`, '',
    '## Changed records (before -> after)', '', '| Talent | ID | Added | Before | After |', '| --- | --- | --- | --- | --- |',
    ...a.changes.map(c => `| ${c.name} | \`${c.canonicalId}\` | ${t(c.added)} | ${t(c.before)} | ${t(c.after)} |`), '',
    '## Tag usage changes', '', '| Tag | Before | After |', '| --- | ---: | ---: |', ...a.tagUsage.filter(u => u.before !== u.after).map(u => `| \`${u.tag}\` | ${u.before} | ${u.after} |`), ''];
  return L.join('\n');
}

function renderOverlayMd(o) {
  const t = (x) => x.map(y => `\`${y}\``).join(', ');
  const L = ['# Talent/Feat Pass 3A — Skill Owner Adjudication (Batch 1)', '', o.note, '',
    `Owner-stated expectation: ${o.expected.uniqueRecords} records / ${o.expected.tagAdditions} additions (assertion only).`, '',
    `## Approved additions (${o.additions.length} records)`, '', '| Talent | ID | Add | Section |', '| --- | --- | --- | --- |',
    ...o.additions.map(a => `| ${a.name} | \`${a.canonicalId}\` | ${t(a.add)} | ${a.sections.join('; ')} |`), '',
    `## Owner-ruled non-skill dispositions (${o.dispositions.length})`, '', '| Talent | ID | Tag | State | Reason |', '| --- | --- | --- | --- | --- |',
    ...o.dispositions.map(d => `| ${d.name} | \`${d.canonicalId}\` | \`${d.tag}\` | ${d.state} | ${d.reason.replace(/\|/g, '\\|')} |`), ''];
  return L.join('\n');
}

export function buildOutputs() {
  const baseline = readJson(BASELINE_PATH);
  const fresh = JSON.stringify(buildBaseline(), null, 2) + '\n';
  if (fresh !== fs.readFileSync(path.join(ROOT, BASELINE_PATH), 'utf8')) throw new Error('PASS3A BUILD FAILED: committed baseline differs from a fresh reconstruction (pack or Phase 12 authority changed)');
  const { auth, changes, tagUsage } = derive(baseline, readJson(OVERLAY_PATH), sharedVocabulary());
  return { json: JSON.stringify(auth, null, 2) + '\n', md: renderMd(auth), overlayMd: renderOverlayMd(readJson(OVERLAY_PATH)), auth, changes, tagUsage };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs();
  if (process.argv.includes('--check')) {
    const same = fs.readFileSync(path.join(ROOT, AUTH_JSON), 'utf8') === out.json && fs.readFileSync(path.join(ROOT, AUTH_MD), 'utf8') === out.md && fs.readFileSync(path.join(ROOT, OVERLAY_MD), 'utf8') === out.overlayMd;
    if (!same) { console.error('Committed Pass 3A authority differs from a fresh derivation'); process.exit(1); }
    console.log('PASS 3A AUTHORITY MATCHES A FRESH DERIVATION');
  } else {
    fs.writeFileSync(path.join(ROOT, AUTH_JSON), out.json);
    fs.writeFileSync(path.join(ROOT, AUTH_MD), out.md);
    fs.writeFileSync(path.join(ROOT, OVERLAY_MD), out.overlayMd);
    console.log(`PASS 3A AUTHORITY BUILT: ${out.auth.counts.recordsChanged} records / ${out.auth.counts.tagAdditions} additions; distinct tags ${out.auth.counts.distinctTagsBefore} -> ${out.auth.counts.distinctTagsAfter}`);
  }
}
