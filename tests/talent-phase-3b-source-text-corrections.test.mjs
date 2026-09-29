import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCorrections, validateManifest, checkApplied } from '../tools/apply-talent-phase-3b-source-text-corrections.mjs';

// Guards the Phase 3B source-text corrections: the correction manifest is valid, every applied correction is present in
// the whole authority chain (Phase 2 content -> canonical authority -> Phase 3B manifests), no OCR-residue signature is
// left anywhere in the canonical text, identity accounting is unchanged, and PDF-pending items stay visible.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const manifest = loadCorrections();
const canonical = readJson('data/canonical/talents.json');
const closeout = readJson('data/audits/talent-phase-3b-global-closeout.json');
const books = fs.readdirSync(path.join(ROOT, 'data/audits')).filter(f => /^talent-phase-3b-.*-manifest\.json$/.test(f)).map(f => readJson('data/audits/' + f));
const records = books.flatMap(m => m.records);
const byId = new Map(records.map(r => [r.canonicalIdentity, r]));
const canonById = new Map(canonical.records.map(r => [r.canonicalIdentity, r]));

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('manifest is valid; statuses and blocksApply are consistent', () => {
  const v = validateManifest(manifest);
  assert.equal(v.entries, 47);
  assert.deepEqual(Object.fromEntries(Object.entries(manifest.summary.byStatus)), { TXT_CONFIRMED: 43, TXT_AMBIGUOUS_PDF_REQUIRED: 4 });
  assert.equal(manifest.entries.filter(e => e.verification.status === 'UNRESOLVED').length, 0, 'no entry may be UNRESOLVED');
});
test('every applied correction is present in Phase 2, the canonical authority and the Phase 3B manifests', () => {
  const { problems } = checkApplied(manifest);
  assert.deepEqual(problems, []);
  for (const e of manifest.entries.filter(x => x.applied)) {
    const rec = byId.get(e.canonicalIdentity); assert.ok(rec, e.canonicalIdentity);
    for (const f of e.fields) {
      const targets = { canonicalDescription: ['system.benefit'], quickSummary: ['system.summary'], canonicalPrerequisites: ['system.prerequisites'] }[f.phase2Field];
      for (const t of targets) if (rec.targetFields[t] !== undefined && canonById.get(e.canonicalIdentity).provenance.primaryPublication.sourcebook === e.sourcebook) {
        assert.equal(rec.targetFields[t], f.correctedValue, `${e.canonicalIdentity} ${t} in the Phase 3B manifest`);
      }
    }
  }
});
test('the 54 fields flagged by the Phase 3C scan are all resolved; none was a false positive', () => {
  assert.deepEqual(manifest.summary.flaggedByPhase3CScan, { fields: 54, records: 27, correctedFields: 54, falsePositiveFields: 0 });
  assert.equal(manifest.entries.filter(e => e.group === 'A-flagged-ocr-signature').length, 27);
});
test('no OCR-residue signature survives in any canonical benefit/summary/prerequisite', () => {
  const residue = [['html', /<\/?(?:p|br|div|span)\b/i], ['backslash', /\\/], ['pipe', /\|/], ['tilde', /~/], ['brace', /[{}]/]];
  const caps = v => (v.match(/\b[A-Z][A-Z0-9']{3,}\b/g) ?? []).filter(w => !['DC', 'HP', 'BAB', 'SWSE', 'NPC', 'CL', 'XP', 'DR', 'GM'].includes(w));
  const unresolved = new Set(manifest.entries.filter(e => e.blocksApply).map(e => e.canonicalIdentity));
  for (const r of canonical.records) {
    if (unresolved.has(r.canonicalIdentity)) continue; // documented PDF-pending records
    for (const key of ['benefit', 'description', 'summary', 'prerequisites']) {
      for (const [name, re] of residue) assert.ok(!re.test(r[key]), `${r.canonicalIdentity} ${key} has ${name} residue`);
      assert.equal(caps(r[key]).length, 0, `${r.canonicalIdentity} ${key} has all-caps page furniture: ${caps(r[key])}`);
    }
  }
});
test('Krath Illusions: prerequisite is "Illusion" and its status stays PDF-pending until a PDF check is recorded', () => {
  const rec = byId.get('Knights of the Old Republic Campaign Guide|Krath|Krath Illusions');
  assert.equal(rec.targetFields['system.prerequisites'], 'Illusion');
  assert.equal(canonById.get('Knights of the Old Republic Campaign Guide|Krath|Krath Illusions').prerequisites, 'Illusion');
  const entry = manifest.entries.find(e => e.canonicalIdentity === rec.canonicalIdentity);
  assert.equal(entry.printedPage, 60);
  assert.ok(['TXT_AMBIGUOUS_PDF_REQUIRED', 'PDF_CONFIRMED'].includes(entry.verification.status));
  assert.equal(entry.blocksApply, entry.verification.status !== 'PDF_CONFIRMED');
});
test('Elite Droid: certified printed page is 29 everywhere in the authority chain', () => {
  for (const name of ['Break Program', 'Heuristic Mastery', 'Scripted Routines', 'Ultra Resilient']) {
    const id = `Scavenger's Guide to Droids|Elite Droid|${name}`;
    assert.equal(canonById.get(id).page, 29, id); assert.equal(byId.get(id).targetFields['system.page'], 29, id);
  }
  assert.ok(manifest.nonSourceFindings.some(f => f.kind === 'PAGE_AUTHORITY' && f.verdict.includes('printed page 29')));
});
test('Skill Confidence: canonical prerequisite carries the printed "trained in the chosen skill" clause', () => {
  assert.equal(canonById.get('Galaxy of Intrigue|Superior Skills|Skill Confidence').prerequisites, 'Critical Skill Success, trained in the chosen skill');
});
test('identity accounting is unchanged; disposition totals sum to 1180 and match the closeout', () => {
  assert.equal(canonical.records.length, 1180); assert.equal(canonical.counts.publicationClaims, 1182);
  assert.equal(records.length, 1180);
  assert.equal(records.filter(r => r.identityResolution.productionRecordId).length, 932);
  assert.equal(records.filter(r => r.identityResolution.createRecordId).length, 248);
  assert.equal(closeout.productionOnlyDeferred.length, 90); assert.equal(closeout.reviewExtras.length, 2);
  const totals = {}; for (const r of records) totals[r.disposition] = (totals[r.disposition] ?? 0) + 1;
  assert.deepEqual(totals, closeout.counts.dispositions);
  assert.equal(Object.values(totals).reduce((a, b) => a + b, 0), 1180);
  assert.equal(closeout.phase3bSourceTextCorrections.countsChanged, false);
});
test('corrections that made canonical text equal production only moved records between UPDATE_CONTENT and UPDATE_METADATA', () => {
  const prev = closeout.phase3bSourceTextCorrections.previousDispositions.global, now = closeout.counts.dispositions;
  for (const k of Object.keys(prev)) if (!['UPDATE_CONTENT', 'UPDATE_METADATA'].includes(k)) assert.equal(now[k], prev[k], k);
  assert.equal((now.UPDATE_CONTENT ?? 0) + (now.UPDATE_METADATA ?? 0), prev.UPDATE_CONTENT + prev.UPDATE_METADATA);
});
test('PDF-pending records are named in the closeout and blocked from application', () => {
  const pending = manifest.entries.filter(e => e.blocksApply).map(e => e.canonicalIdentity).sort();
  assert.deepEqual([...closeout.phase3bSourceTextCorrections.entriesStillRequiringPdf].sort(), pending);
  assert.equal(pending.length, 4);
});
test('validateManifest rejects tampering (unknown status, no-op correction, residue in a corrected value)', () => {
  const clone = () => structuredClone(manifest);
  let m = clone(); m.entries[0].verification.status = 'PROBABLY_FINE'; assert.throws(() => validateManifest(m), /unknown verification status/);
  m = clone(); const e = m.entries.find(x => x.fields.length); e.fields[0].correctedValue = e.fields[0].currentValue; assert.throws(() => validateManifest(m), /not actually corrected/);
  m = clone(); const f = m.entries.find(x => x.fields.length); f.fields[0].correctedValue += ' \\o'; assert.throws(() => validateManifest(m), /residue/);
  m = clone(); const p = m.entries.find(x => x.blocksApply); p.blocksApply = false; assert.throws(() => validateManifest(m), /blocksApply disagrees/);
});

console.log(`\n${n} source-text correction checks passed`);
