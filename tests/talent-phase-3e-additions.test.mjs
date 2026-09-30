import assert from 'node:assert/strict';
import { checkAdditions, loadAll } from '../tools/check-talent-phase-3e-additions.mjs';

// Phase 3E-1: the authority addendum must make authority and production agree on the complete talent set.
const base = loadAll();
const clone = v => structuredClone(v);
const run = (mut = () => {}) => { const i = { ...base, addendum: clone(base.addendum), production: clone(base.production), canonicalIdentities: new Set(base.canonicalIdentities), certifiedIds: new Set(base.certifiedIds), trees: clone(base.trees) }; mut(i); return checkAdditions(i); };
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const has = (errs, re) => errs.some(e => re.test(e));

test('baseline: 1,180 certified + 7 additions = the 1,187 production records, with no unexplained extra and none missing', () => {
  assert.deepEqual(run(), []);
  assert.equal(base.certifiedIds.size, 1180); assert.equal(base.production.length, 1187); assert.equal(base.addendum.additions.length, 7);
});
test('the seven are exactly the known cases, each a new identity', () => {
  assert.deepEqual(base.addendum.additions.map(a => a.name).sort(), ['Dark Preservation', 'Hard Target', 'Move Massive Object', 'Ranged Disarm', 'Stolen Form', 'Telekinetic Stability', 'Trigger Work']);
  for (const a of base.addendum.additions) assert.ok(!base.canonicalIdentities.has(a.canonicalIdentity), a.canonicalIdentity);
});
test('an unexplained production extra is detected', () => {
  assert.ok(has(run(i => { const t = clone(i.production[0]); t._id = 'eeeeeeeeeeeeeeee'; t.name = 'Invented Talent'; i.production.push(t); }), /differ from the addendum/));
});
test('a missing production record (certified or added) is detected', () => {
  assert.ok(has(run(i => { i.production = i.production.filter(t => t._id !== 'd7870d0940a3ce0b'); }), /missing/));
  assert.ok(has(run(i => { i.addendum.additions.pop(); }), /differ from the addendum|arithmetic/));
});
test('an addition that collides with a certified identity is refused', () => {
  assert.ok(has(run(i => { i.canonicalIdentities.add(i.addendum.additions[0].canonicalIdentity); }), /already a certified canonical identity/));
});
test('production drift away from both the audited snapshot and the authority is detected', () => {
  assert.ok(has(run(i => { i.production.find(t => t._id === '192279eaa0b61d36').system.benefit += ' DRIFT'; }), /drifted/));
});
test('a later manifest-driven repair (production == PDF-verified authority) keeps the gate green', () => {
  assert.deepEqual(run(i => {
    for (const name of ['Ranged Disarm', 'Trigger Work']) {
      const a = i.addendum.additions.find(x => x.name === name), t = i.production.find(p => p._id === a.production.id);
      t.system.benefit = a.rulesText; t.system.prerequisites = a.prerequisites; t.system.source = a.publication.sourcebook; t.system.page = a.publication.page;
    }
  }), []);
});
test('PDF_VERIFIED rows must carry the exact wording and page; wording must equal the PDF-verified census', () => {
  assert.ok(has(run(i => { i.addendum.additions.find(a => a.name === 'Trigger Work').rulesText = null; }), /PDF_VERIFIED text without the exact wording/));
  assert.ok(has(run(i => { i.addendum.additions.find(a => a.name === 'Ranged Disarm').rulesText += ' extra words'; }), /differs from the PDF-verified census/));
  assert.ok(has(run(i => { i.addendum.additions.find(a => a.name === 'Ranged Disarm').publication.page = 216; }), /page differs from the PDF-verified census/));
});
test('unverified pages stay null until the PDF answers (no page is invented from OCR)', () => {
  assert.ok(has(run(i => { i.addendum.additions.find(a => a.name === 'Hard Target').publication.page = 50; }), /PDF_REQUIRED page must stay null/));
  assert.deepEqual(base.addendum.additions.filter(a => a.publication.pageStatus === 'PDF_REQUIRED').map(a => a.name).sort(), ['Dark Preservation', 'Hard Target', 'Move Massive Object', 'Telekinetic Stability']);
});
test('Gunslinger roster reconciles: Phase 1D 5 + 2 = 7 = PDF-verified source census', () => {
  const d = base.addendum.treeRosterDeltas.find(x => x.tree === 'Gunslinger'); assert.equal(d.originRosterBefore + d.add.length, 7);
  assert.ok(has(run(i => { i.addendum.treeRosterDeltas.find(x => x.tree === 'Gunslinger').originRosterAfter = 6; }), /roster delta/));
});
console.log(`\n${n} talent-phase-3e additions checks passed`);
