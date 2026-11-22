// Illusion talent, size-penalty transcription (issue #1166 Phase 2 follow-up).
// Printed source: KOTOR Campaign Guide p.52 and Jedi Academy Training Manual p.14-15 both read
// "-10 for Colossal (frigate) or larger illusions". The KOTOR audit-evidence JSON had an OCR "~10".
// Scope: audit-evidence records and the active top-level canonical talent only.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const find = (node, out = []) => {
  if (Array.isArray(node)) node.forEach((x) => find(x, out));
  else if (node && typeof node === 'object') {
    if (node.canonicalName === 'Illusion') out.push(node);
    Object.values(node).forEach((v) => find(v, out));
  }
  return out;
};
const EXPECT = '-5 for Colossal illusions, and -10 for Colossal (frigate) or larger illusions';

for (const [file, page] of [
  ['data/audits/talent-phase-2-knights-of-the-old-republic-campaign-guide-content.json', 52],
  ['data/audits/talent-phase-2-jedi-academy-training-manual-content.json', 14]
]) {
  const recs = find(rd(file)).filter((r) => typeof r.canonicalDescription === 'string' && r.page === page);
  assert.equal(recs.length, 1, `${file}: exactly one Illusion evidence record at p.${page}`);
  const d = recs[0].canonicalDescription;
  assert.ok(d.includes(EXPECT), `${file}: Illusion penalty text must read -10 for Colossal (frigate) or larger`);
  assert.ok(!/~\s?10/.test(d), `${file}: no OCR tilde in the Illusion penalty`);
}

const active = (() => {
  const d = rd('data/canonical/talents.json');
  const rows = Array.isArray(d) ? d : d.talents ?? d.records ?? [];
  return rows.filter((r) => (r.name ?? r.canonicalName) === 'Illusion');
})();
assert.equal(active.length, 1, 'one active canonical Illusion talent');
assert.ok(/-10 for Colossal \(frigate\) or larger illusions/i.test(`${active[0].description} ${active[0].benefit ?? ''}`), 'active canonical Illusion already reads -10');

// Generated per-publication mirror in the canonical corpus must agree with its evidence file (no OCR drift).
const illusion = active[0];
const pubs = illusion.publications ?? [];
for (const book of ['Force Unleashed Campaign Guide', 'Knights of the Old Republic Campaign Guide', 'Jedi Academy Training Manual']) {
  assert.ok(pubs.some((p) => p.sourcebook === book), `canonical Illusion keeps its ${book} publication entry`);
}
const kotorPub = pubs.find((p) => p.sourcebook === 'Knights of the Old Republic Campaign Guide');
assert.equal(kotorPub.page, 52, 'KOTOR publication page stays printed p.52');
assert.ok(kotorPub.description.includes(EXPECT), 'KOTOR canonical publication mirror reads -10 for Colossal (frigate) or larger');
assert.ok(!/~\s?10/.test(JSON.stringify(illusion)), 'no OCR tilde anywhere in the canonical Illusion record');
const kotorEvidence = find(rd('data/audits/talent-phase-2-knights-of-the-old-republic-campaign-guide-content.json'))[0];
assert.equal(kotorPub.description, kotorEvidence.canonicalDescription, 'KOTOR mirror equals its evidence-file description (sourceAuthorityFile)');
assert.equal(illusion.canonicalIdentity, 'Saga Edition Core Rulebook|Alter|Illusion', 'canonical Illusion identity is stable');
const all = Array.isArray(rd('data/canonical/talents.json')) ? rd('data/canonical/talents.json') : rd('data/canonical/talents.json').talents ?? rd('data/canonical/talents.json').records ?? [];
assert.equal(new Set(all.map((r) => r.canonicalIdentity)).size, all.length, 'canonical talent identities are unique');
assert.ok(!/~\s?10 for/.test(fs.readFileSync('data/canonical/talents.json', 'utf8')), 'no "~10 for" OCR artifact anywhere in the canonical corpus');

console.log('talent-illusion-size-penalty-evidence: ok');
