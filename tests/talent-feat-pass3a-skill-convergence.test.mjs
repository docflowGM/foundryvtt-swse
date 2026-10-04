import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { buildBaseline, loadPack, sharedVocabulary, BASELINE_PATH, PHASE12_FILES, PACK_PATH } from '../tools/build-talent-feat-pass3a-baseline.mjs';
import { derive, buildOutputs, AUTH_JSON, AUTH_MD } from '../tools/build-talent-feat-pass3a-semantic-authority.mjs';
import { sweep, buildReport, OVERLAY_PATH, SWEEP_JSON, SWEEP_MD } from '../tools/audit-talent-feat-pass3a-skill-sweep.mjs';

const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const txt = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const baseline = rd(BASELINE_PATH), overlay = rd(OVERLAY_PATH), auth = rd(AUTH_JSON), vocab = sharedVocabulary();
const rec = (a, id) => a.records.find(r => r.canonicalId === id);
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('baseline reconstructs exactly from the Phase 12 chain and matches the pack (1,187 records, order-exact)', () => {
  assert.equal(txt(BASELINE_PATH), JSON.stringify(buildBaseline(), null, 2) + '\n');
  assert.equal(baseline.records.length, 1187); assert.equal(baseline.counts.tagInstances, 9334); assert.equal(baseline.counts.distinctTagsUsed, 181);
  const { byId } = loadPack();
  for (const r of baseline.records) assert.deepEqual(byId.get(r.canonicalId).system.tags, r.tags, r.name);
});
test('shared vocabulary is 181 + 6 = 187 with exact spellings and no retired tags', () => {
  assert.equal(vocab.list.length, 187); assert.equal(vocab.base.length, 181);
  for (const t of ['acrobatics', 'climb', 'endurance', 'gather_information', 'jump', 'swim']) assert.ok(vocab.set.has(t));
  assert.ok(vocab.set.has('skill_mastery')); assert.ok(!vocab.set.has('skill-mastery'));
  for (const t of vocab.retired) assert.ok(!vocab.set.has(t));
});
test('Phase 12 historical authorities are unmodified (hash pins + git)', () => {
  for (const f of Object.values(PHASE12_FILES)) { assert.equal(baseline.phase12AuthoritySha256[f].length, 64); }
  const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(new URL('../' + rel, import.meta.url))).digest('hex');
  for (const f of Object.values(PHASE12_FILES)) assert.equal(sha(f), baseline.phase12AuthoritySha256[f], f);
  assert.equal(sha(PACK_PATH), baseline.packSha256);
});
test('the working authority equals a fresh deterministic derivation (twice, byte-stable)', () => {
  const a = buildOutputs(), b = buildOutputs();
  assert.equal(a.json, b.json); assert.equal(txt(AUTH_JSON), a.json); assert.equal(txt(AUTH_MD), a.md);
});
test('overlay derives exactly 63 records / 76 additions, zero removals', () => {
  assert.equal(auth.counts.recordsChanged, 63); assert.equal(auth.counts.tagAdditions, 76); assert.equal(auth.counts.removals, 0);
  assert.equal(auth.counts.tagInstancesBefore, 9334); assert.equal(auth.counts.tagInstancesAfter, 9410);
  assert.equal(auth.sharedVocabulary.count, 187);
  const u = auth.tagUsage.find(x => x.tag === 'use_the_force'); assert.equal(u.before, 98); assert.equal(u.after, 118);
  for (const r of auth.records) assert.deepEqual(r.finalTags.slice(0, r.baselineTags.length), r.baselineTags);
});
test('only records named in the overlay changed; the other Mobile Combatant is untouched', () => {
  const named = new Set(overlay.additions.map(a => a.canonicalId));
  for (const r of auth.records) assert.equal(JSON.stringify(r.finalTags) !== JSON.stringify(r.baselineTags), named.has(r.canonicalId), r.name);
  assert.equal(rec(auth, '198b68c0ca770ad7').finalTags.includes('acrobatics'), true);
  assert.deepEqual(rec(auth, 'ee184e210f8c8935').finalTags, rec(auth, 'ee184e210f8c8935').baselineTags);
});
test('specific rulings: Directed Movement, Directed Action, Tripwire, Force Immersion, Inspire Fear I', () => {
  const add = (id) => rec(auth, id).finalTags.filter(t => !rec(auth, id).baselineTags.includes(t));
  assert.deepEqual(add('510d4b2aadbbc2de'), ['acrobatics', 'climb', 'jump', 'stealth', 'swim']);
  assert.deepEqual(add('3a34ce2ef55c41b1'), ['deception', 'mechanics', 'persuasion', 'pilot', 'ride', 'treat_injury', 'use_computer']);
  assert.ok(rec(auth, '3a34ce2ef55c41b1').finalTags.includes('skills'));
  assert.deepEqual(add('9992fb4ee6ab40df'), ['acrobatics', 'perception']);
  assert.deepEqual(add('d2aabaa6848b4a09'), ['perception', 'use_computer']);
  assert.deepEqual(add('cf4b1e5b126a2a7e'), ['use_the_force', 'force']);
});
test('use_the_force -> force holds on every record, baseline and final', () => {
  for (const r of auth.records) for (const k of ['baselineTags', 'finalTags']) if (r[k].includes('use_the_force')) assert.ok(r[k].includes('force'), r.name);
});
test('rejected tags are absent and Slammer-style inference is not applied (no medical/healing from treat_injury)', () => {
  for (const d of overlay.dispositions) assert.ok(!rec(auth, d.canonicalId).finalTags.includes(d.tag), `${d.name} ${d.tag}`);
  for (const a of overlay.additions.filter(x => x.sections.includes('Treat Injury'))) {
    const r = rec(auth, a.canonicalId); for (const t of ['medical', 'medicine', 'healing']) assert.equal(r.finalTags.includes(t), r.baselineTags.includes(t), `${r.name} ${t}`);
  }
});
test('builder fails closed: wrong name, unknown ID, present tag, outside vocabulary, removal, force invariant', () => {
  const mk = (patch) => { const o = JSON.parse(JSON.stringify(overlay)); patch(o); return o; };
  assert.throws(() => derive(baseline, mk(o => { o.additions[0].name = 'Nope'; }), vocab), /overlay says/);
  assert.throws(() => derive(baseline, mk(o => { o.additions[0].canonicalId = 'ffffffffffffffff'; }), vocab), /resolves 0 times/);
  assert.throws(() => derive(baseline, mk(o => { o.additions[0].add = [baseline.records.find(r => r.canonicalId === o.additions[0].canonicalId).tags[0]]; }), vocab), /already present/);
  assert.throws(() => derive(baseline, mk(o => { o.additions[0].add = ['not_a_tag']; }), vocab), /outside the 187-tag/);
  assert.throws(() => derive(baseline, mk(o => { o.additions[0].remove = ['x']; }), vocab), /unauthorized removal/);
  assert.throws(() => derive(baseline, mk(o => { o.additions.pop(); }), vocab), /DISCREPANCY/);
  assert.throws(() => derive(baseline, mk(o => { o.additions.find(a => a.name === 'Inspire Fear I').add = ['use_the_force']; o.expected = { uniqueRecords: 63, tagAdditions: 75 }; }), vocab), /use_the_force without force/);
});
test('sweep: 117 raw hits / 97 unique talents, every hit terminal, PASS3A_OWNER_REVIEW = 0, owner count correction recorded', () => {
  const rep = rd(SWEEP_JSON); assert.equal(rep.counts.rawHits, 117); assert.equal(rep.counts.uniqueTalents, 97);
  assert.equal(JSON.stringify(rep, null, 2) + '\n', buildReport().json);
  const states = new Set(['PASS3A_OWNER_APPROVED', 'PASS3A_FALSE_POSITIVE', 'PASS3A_INTENTIONAL_GENERIC_SKILL', 'PASS3A_ROLE_NOT_SKILL', 'PASS3A_TEXT_MATCH_NOT_SKILL']);
  for (const f of rep.findings) assert.ok(states.has(f.state), `${f.name} ${f.tag} ${f.state}`);
  assert.deepEqual(rep.counts.byState, { PASS3A_FALSE_POSITIVE: 4, PASS3A_INTENTIONAL_GENERIC_SKILL: 9, PASS3A_OWNER_APPROVED: 75, PASS3A_ROLE_NOT_SKILL: 3, PASS3A_TEXT_MATCH_NOT_SKILL: 26 });
  assert.equal(rep.findings.filter(f => f.state === 'PASS3A_OWNER_REVIEW').length, 0);
  assert.equal(Object.values(rep.counts.byState).reduce((a, b) => a + b, 0), 117);
  assert.deepEqual(overlay.sweepCountCorrection.certified, { rawHits: 117, uniqueTalents: 97 });
  assert.deepEqual(overlay.sweepCountCorrection.earlierOwnerReported, { rawHits: 117, uniqueTalents: 98 });
});
test('final rulings: Move Massive Object gains use_the_force only; four residual items stay untagged', () => {
  const m = rec(auth, '62d461ae3b0fcfa9'); assert.deepEqual(m.finalTags.filter(t => !m.baselineTags.includes(t)), ['use_the_force']); assert.ok(m.baselineTags.includes('force'));
  for (const [id, t] of [['06ab0e40780ea63d', 'knowledge'], ['df6c20e602190daa', 'ride'], ['d26506bfba104470', 'acrobatics'], ['e293cb03d35c2bff', 'acrobatics']]) assert.ok(!rec(auth, id).finalTags.includes(t), id);
  assert.ok(rec(auth, 'd26506bfba104470').finalTags.includes('gather_information'));
});
test('the working authority never claims production mutation and the pack hash matches the baseline pin', () => {
  assert.equal(auth.counts.productionMutated, false); assert.equal(auth.status, 'PASS3A_WORKING_AUTHORITY_ADD_ONLY_NOT_PRODUCTION');
  assert.equal(auth.derivedFrom.packSha256, baseline.packSha256);
});
console.log(`${n} tests passed`);
