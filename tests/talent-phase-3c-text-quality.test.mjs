import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanManifestText, pendingSourceTextCorrections, summarize, gibberishTokens, CORRECTIONS_PATH } from '../tools/audit-talent-phase-3c-text-quality.mjs';

// The Phase 3C write gate on certified text quality: OCR-artifact signatures that would be newly written, and Phase 3B
// source-text corrections that still require the rendered PDF. Synthetic inputs only; independent of the real manifests.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const rec = (over = {}) => ({
  canonicalIdentity: 'B|T|N', disposition: 'UPDATE_CONTENT', identityResolution: { productionRecordId: 'p', createRecordId: null },
  mutationFields: ['system.benefit', 'system.prerequisites'],
  targetFields: { 'system.benefit': 'Clean rules text.', 'system.prerequisites': '' },
  currentCanonicalFields: { 'system.benefit': 'Old text.', 'system.prerequisites': '' }, ...over
});
const book = (...records) => [{ manifest: { sourcebook: 'B', records } }];
const tmpRoot = files => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swse-tq-'));
  fs.mkdirSync(path.join(dir, 'data/audits'), { recursive: true }); fs.mkdirSync(path.join(dir, 'tools'));
  fs.copyFileSync(path.join(ROOT, 'tools/audit-talent-phase-3c-text-quality.mjs'), path.join(dir, 'tools/audit-talent-phase-3c-text-quality.mjs'));
  for (const [rel, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, rel), JSON.stringify(data));
  return dir;
};
const cli = (dir, ...args) => { const r = spawnSync(process.execPath, [path.join(dir, 'tools/audit-talent-phase-3c-text-quality.mjs'), ...args], { encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; };

test('clean text produces no findings', () => {
  const r = scanManifestText(book(rec()));
  assert.equal(r.gating.length, 0); assert.equal(r.informational.length, 0);
});
test('each certified-text OCR signature is caught: pipe, backslash, tilde, braces, html, gibberish', () => {
  const cases = {
    pipe: '|mpel Ally |', backslash: 'ends here, \\f you do', tilde: 'equip~ ment', 'curly-brace': 'see page 128}',
    'html-tag': '<p>Paragraph</p>', gibberish: 'Real rules text. esidvnS eaVued YatavHg'
  };
  for (const [sig, text] of Object.entries(cases)) {
    const r = scanManifestText(book(rec({ targetFields: { 'system.benefit': text, 'system.prerequisites': '' } })));
    assert.ok(r.gating.some(f => f.signatures.includes(sig)), sig);
  }
});
test('a signature already present in the current production value is not "newly written"', () => {
  const r = scanManifestText(book(rec({ targetFields: { 'system.benefit': 'a | b', 'system.prerequisites': '' }, currentCanonicalFields: { 'system.benefit': 'a | b', 'system.prerequisites': '' } })));
  assert.equal(r.gating.length, 0);
});
test('fields the migration does not write are ignored; created records are checked in full', () => {
  const ignored = scanManifestText(book(rec({ mutationFields: ['system.prerequisites'], targetFields: { 'system.benefit': 'bad | text', 'system.prerequisites': '' } })));
  assert.equal(ignored.gating.length, 0);
  const created = scanManifestText(book(rec({ identityResolution: { productionRecordId: null, createRecordId: 'c' }, mutationFields: ['_record_create'], currentCanonicalFields: null, targetFields: { 'system.benefit': 'bad | text' } })));
  assert.equal(created.gating.length, 1);
});
test('unbalanced brackets are informational only; legitimate [descriptor] brackets are not flagged', () => {
  const r = scanManifestText(book(rec({ targetFields: { 'system.benefit': 'A [minimum of 1) rule.', 'system.prerequisites': '' } })));
  assert.equal(r.gating.length, 0); assert.equal(r.informational.length, 1);
  assert.equal(scanManifestText(book(rec({ targetFields: { 'system.benefit': 'Add the [dark side] descriptor (see page 1).', 'system.prerequisites': '' } }))).informational.length, 0);
});
test('known compound words are not gibberish', () => { assert.deepEqual(gibberishTokens('HoloNet and SpyNet'), []); });
test('pending source-text corrections: absent manifest => none; PDF-pending entries are reported; confirmed ones are not', () => {
  const dir = tmpRoot({});
  try { assert.deepEqual(pendingSourceTextCorrections(dir), []); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const manifest = { entries: [
    { id: 'TC-1', canonicalIdentity: 'B|T|A', printedPage: 60, blocksApply: true, applied: true, verification: { status: 'TXT_AMBIGUOUS_PDF_REQUIRED', notes: 'needs PDF' } },
    { id: 'TC-2', canonicalIdentity: 'B|T|B', printedPage: 61, blocksApply: false, applied: true, verification: { status: 'TXT_CONFIRMED' } },
    { id: 'TC-3', canonicalIdentity: 'B|T|C', printedPage: 62, blocksApply: true, applied: false, verification: { status: 'UNRESOLVED', unresolvedReason: 'damaged' } }
  ] };
  const d2 = tmpRoot({ [CORRECTIONS_PATH]: manifest });
  try {
    const p = pendingSourceTextCorrections(d2);
    assert.deepEqual(p.map(x => x.id), ['TC-1', 'TC-3']); assert.equal(summarize({ gating: [], informational: [] }, p).pendingSourceTextCorrections, 2);
  } finally { fs.rmSync(d2, { recursive: true, force: true }); }
});
test('CLI runs (no circular-import hang), reports pending PDF items and --strict fails on them or on OCR signatures', () => {
  const clean = { sourcebook: 'B', records: [rec()] };
  const dirty = { sourcebook: 'B', records: [rec({ targetFields: { 'system.benefit': 'bad | text', 'system.prerequisites': '' } })] };
  const pendingManifest = { entries: [{ id: 'TC-1', canonicalIdentity: 'B|T|A', printedPage: 60, blocksApply: true, applied: true, verification: { status: 'TXT_AMBIGUOUS_PDF_REQUIRED' } }] };
  let dir = tmpRoot({ 'data/audits/talent-phase-3b-x-manifest.json': clean });
  try { const r = cli(dir, '--strict'); assert.equal(r.code, 0, r.out); assert.match(r.out, /0 fields in 0 records/); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  dir = tmpRoot({ 'data/audits/talent-phase-3b-x-manifest.json': dirty });
  try { const r = cli(dir, '--strict'); assert.equal(r.code, 1); assert.match(r.out, /1 fields in 1 records/); assert.equal(cli(dir).code, 0, 'without --strict the scan only reports'); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  dir = tmpRoot({ 'data/audits/talent-phase-3b-x-manifest.json': clean, [CORRECTIONS_PATH]: pendingManifest });
  try { const r = cli(dir, '--strict'); assert.equal(r.code, 1); assert.match(r.out, /TC-1 B\|T\|A \(p\. 60\) TXT_AMBIGUOUS_PDF_REQUIRED \[applied, unconfirmed\]/); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

console.log(`\n${n} text-quality gate checks passed`);
