// Provenance guard for the KOTOR Illusion canonical-mirror correction (issue #1166, PR #1181).
// The certified Phase 3B/3F/3G records pin the git blob sha of data/canonical/talents.json. Regenerating the
// one-token correction changed that blob, so the four effective guard pins were updated. This test keeps the
// HISTORICAL recorded checksum distinct from the CURRENT ACCEPTED one and proves the correction scope.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const rec = rd('data/audits/talent-canonical-blob-correction-kotor-illusion-2026-11-22.json');
const gitBlobSha = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');

// 1. The record preserves the historical certified checksum and a different current accepted one.
assert.equal(rec.recordId, 'TCBC-2026-11-22-KOTOR-ILLUSION-1');
assert.equal(rec.checksums.historicalRecordedCertifiedBlobSha, 'd0add2069f174cedc9f4a01500477f4dc62b6fb4');
assert.equal(rec.checksums.currentAcceptedBlobSha, 'ae7fe14adcf8a0eb5ac799d841107851d88b303b');
assert.notEqual(rec.checksums.historicalRecordedCertifiedBlobSha, rec.checksums.currentAcceptedBlobSha);
assert.equal(rec.reason, 'VERIFIED_OCR_DEFECT');
assert.equal(rec.scope.oneToken, true);
assert.equal(rec.scope.publicationPrintedPage, 52);
assert.deepEqual(rec.guarantees, { productionPackMutation: false, guardsLoosened: false, otherHistoryRewritten: false, unrelatedDataChanged: false });

// 2. The live canonical corpus is exactly the accepted blob.
const canonicalBuf = fs.readFileSync(rec.file);
assert.equal(gitBlobSha(canonicalBuf), rec.checksums.currentAcceptedBlobSha, 'data/canonical/talents.json blob == current accepted checksum');

// 3. All four effective guard pins equal the current accepted checksum and none still holds the historical one.
const closeout = rd('data/audits/talent-phase-3b-global-closeout.json');
const pins = [
  closeout.authority?.canonicalTalentBlobSha,
  closeout.phase3bSourceTextCorrections?.correctedCanonicalTalentBlobSha,
  rd('data/audits/talent-phase-3f-dry-run-report.json').untouchedFiles?.['data/canonical/talents.json'],
  rd('data/audits/talent-phase-3g-dry-run-report.json').untouchedFiles?.['data/canonical/talents.json']
];
assert.equal(pins.length, 4);
for (const [i, p] of pins.entries()) assert.equal(p, rec.checksums.currentAcceptedBlobSha, `guard pin ${i} == current accepted checksum`);
assert.equal(rec.pinsUpdated.length, 4, 'record lists exactly the four updated pins');
for (const f of ['talent-phase-3b-global-closeout', 'talent-phase-3f-dry-run-report', 'talent-phase-3g-dry-run-report']) {
  assert.ok(!fs.readFileSync(`data/audits/${f}.json`, 'utf8').includes(rec.checksums.historicalRecordedCertifiedBlobSha),
    `${f}: the historical sha is preserved only in the correction record, not left as a stale guard pin`);
}

// 4. One-token scope, proven by hash: reversing the single token reproduces the recorded "before" description.
const corpus = JSON.parse(canonicalBuf.toString('utf8'));
const rows = Array.isArray(corpus) ? corpus : corpus.talents ?? corpus.records;
const illusion = rows.filter((r) => r.canonicalIdentity === rec.scope.canonicalIdentity);
assert.equal(illusion.length, 1);
const kotor = illusion[0].publications.find((p) => p.sourcebook === rec.scope.publication);
assert.equal(kotor.page, rec.scope.publicationPrintedPage);
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
assert.equal(sha256(kotor.description), rec.scope.descriptionSha256After, 'KOTOR mirror description == recorded "after"');
assert.ok(kotor.description.includes('-10 for Colossal (frigate) or larger illusions'));
const reversed = kotor.description.replace(rec.scope.tokenAfter, rec.scope.tokenBefore);
assert.notEqual(reversed, kotor.description);
assert.equal(sha256(reversed), rec.scope.descriptionSha256Before, 'reversing the single token reproduces the certified "before" text');

// 5. No other drift: identities unique and untouched count, no OCR tilde left, no pack mutation.
assert.equal(new Set(rows.map((r) => r.canonicalIdentity)).size, rows.length);
assert.equal(rows.length, 1180, 'canonical identity count unchanged');
assert.ok(!/~10 for/.test(canonicalBuf.toString('utf8')));
assert.ok(!/~10 for/.test(fs.readFileSync('packs/talents.db', 'utf8')), 'live talents pack never carried the OCR text');

console.log('talent-canonical-blob-correction-record: ok');
