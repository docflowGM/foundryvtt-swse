#!/usr/bin/env node
// Pass 3B immutable comparison baseline: 353 feats (Pass 2 working authority) + 1,187 talents (Pass 3A working authority) = 1,540 canonical identities.
// Each record carries its domain, identity, canonical mechanic evidence + evidence tier, and the exact semantic tags entering Pass 3B.
// Source authority hashes are pinned; consumers fail if any source changes. Deterministic (no timestamps). No production mutation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sharedVocabulary, loadPack } from './build-talent-feat-pass3a-baseline.mjs';
import { PASS2_AUTHORITY_PATH, PASS2_STATUS, ROOT, loadContext, validateAuthority } from './validate-feat-tags-semantic-authority.mjs';

export const BASELINE3B_PATH = 'data/audits/talent-feat-pass3b-mechanic-baseline.json';
export const FEAT_AUTH = PASS2_AUTHORITY_PATH;
export const TALENT_AUTH = 'data/audits/talent-feat-pass3a-semantic-authority.json';
export const FEAT_TEXT_AUTH = 'data/audits/feat-provenance-canonical-authority.json';
export const TALENT_PACK = 'packs/talents.db';
export const SOURCE_FILES = [FEAT_AUTH, FEAT_TEXT_AUTH, TALENT_AUTH, TALENT_PACK, 'data/audits/talent-phase-12-final-ontology-adjudication.json'];
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
export const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function buildBaseline3B() {
  const fail = (m) => { throw new Error(`PASS3B BASELINE FAILED: ${m}`); };
  const vocab = sharedVocabulary();
  const feats = readJson(FEAT_AUTH), talents = readJson(TALENT_AUTH);
  if (feats.status !== PASS2_STATUS) fail(`feat authority status ${feats.status}`);
  if (talents.status !== 'PASS3A_WORKING_AUTHORITY_ADD_ONLY_NOT_PRODUCTION') fail(`talent authority status ${talents.status}`);
  if (feats.assignments.length !== 353) fail(`feat identities ${feats.assignments.length} != 353`);
  if (talents.records.length !== 1187) fail(`talent identities ${talents.records.length} != 1187`);
  if (talents.counts.recordsChanged !== 63 || talents.counts.tagAdditions !== 76 || talents.counts.removals !== 0) fail('Pass 3A final counts are not 63 / 76 / 0');
  const fv = validateAuthority(feats, loadContext(), { pass: 2 });
  if (fv.failures.length) fail(`feat Pass 2 authority fails validation: ${fv.failures[0]}`);
  // Rules/mechanic evidence for feats: certified provenance authority (rules shape + quick summary), falling back to the Pass 1 mechanic summary.
  const prov = readJson(FEAT_TEXT_AUTH);
  const shape = new Map();
  for (const f of [...Object.values(prov.books).flatMap(b => b.feats), ...(prov.officialWebSources?.feats || [])]) {
    if (!f.canonicalId || /^FULL_REPRINT/.test(f.identityRole)) continue;
    const rs = [...(f.content?.canonicalRulesShape || []), ...(f.content?.starshipsReprintRulesShape || [])].join(' ');
    shape.set(f.canonicalId, { rs, qs: f.content?.quickSummary || '' });
  }
  const records = [];
  for (const a of feats.assignments) {
    const s = shape.get(a.canonicalId);
    const hasShape = !!(s && s.rs);
    const text = hasShape ? [s.rs, s.qs].filter(Boolean).join(' ') : (a.canonicalMechanicSummary || '');
    records.push({ domain: 'FEAT', canonicalId: a.canonicalId, name: a.name, source: a.primaryPublication.source, page: a.primaryPublication.page, evidenceTier: hasShape ? 'FEAT_CANONICAL_RULES_SHAPE' : 'FEAT_PASS1_MECHANIC_SUMMARY', evidenceAuthority: hasShape ? FEAT_TEXT_AUTH : FEAT_AUTH, evidence: text, tags: [...a.finalTags] });
  }
  const pack = loadPack();
  for (const r of talents.records) {
    const p = pack.byId.get(r.canonicalId);
    if (!p) fail(`talent ${r.canonicalId} missing from the pack`);
    if (p.name !== r.name) fail(`talent ${r.canonicalId} name mismatch`);
    records.push({ domain: 'TALENT', canonicalId: r.canonicalId, name: r.name, source: r.source ?? p.system.source ?? null, page: r.page ?? p.system.page ?? null, evidenceTier: 'TALENT_CERTIFIED_PACK_BENEFIT_TEXT', evidenceAuthority: TALENT_PACK, evidence: p.system.benefit || '', tags: [...r.finalTags] });
  }
  const keys = records.map(r => `${r.domain}|${r.canonicalId}`);
  if (new Set(keys).size !== 1540 || records.length !== 1540) fail(`combined corpus ${records.length} / unique ${new Set(keys).size} != 1540`);
  for (const r of records) {
    if (new Set(r.tags).size !== r.tags.length) fail(`${r.domain} ${r.name}: duplicate tags`);
    for (const t of r.tags) { if (!vocab.set.has(t)) fail(`${r.domain} ${r.name}: tag ${t} outside the 187-tag vocabulary`); if (vocab.retired.has(t)) fail(`${r.domain} ${r.name}: retired tag ${t}`); }
  }
  records.sort((a, b) => cmp(a.domain, b.domain) || cmp(a.canonicalId, b.canonicalId));
  const tiers = {};
  for (const r of records) tiers[r.evidenceTier] = (tiers[r.evidenceTier] || 0) + 1;
  return {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B_MECHANIC_BASELINE', status: 'IMMUTABLE_COMPARISON_BASELINE',
    note: 'Combined Pass 3B corpus. Feat evidence is the certified provenance rules shape (a certified paraphrase of the printed rules, not verbatim text) or, where unavailable, the Pass 1 mechanic summary; talent evidence is the certified pack Benefit text. Evidence tiers are recorded per record and are not equivalent to each other.',
    counts: { combined: records.length, feats: 353, talents: 1187, sharedVocabulary: vocab.list.length, evidenceTiers: tiers },
    sourceSha256: Object.fromEntries(SOURCE_FILES.map(f => [f, sha(f)])),
    sharedVocabulary: vocab.list, records
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = JSON.stringify(buildBaseline3B(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(path.join(ROOT, BASELINE3B_PATH), 'utf8') !== out) { console.error('Committed Pass 3B baseline differs from a fresh build (a source authority changed)'); process.exit(1); }
    console.log('PASS 3B BASELINE MATCHES A FRESH BUILD');
  } else {
    fs.writeFileSync(path.join(ROOT, BASELINE3B_PATH), out);
    const b = JSON.parse(out);
    console.log(`PASS 3B BASELINE: ${b.counts.combined} identities (${b.counts.feats} feats + ${b.counts.talents} talents); vocabulary ${b.counts.sharedVocabulary}; tiers ${JSON.stringify(b.counts.evidenceTiers)}`);
  }
}
