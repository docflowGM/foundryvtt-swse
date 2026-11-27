import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildIndex, serialize } from '../tools/build-canonical-prerequisite-index.mjs';

// PRQ.1A–1C: the generated, UUID-keyed canonical prerequisite index. Read-only production artifact check; nothing here changes packs or runtime.
const { index, errors } = buildIndex();
const e = index.entries;

test('the production packs compile into the index without rejections (no duplicate owners, unknown types or malformed identities)', () => {
  assert.deepEqual(errors, []);
  assert.equal(Object.keys(e).length, 1540);
});
test('the build is deterministic: two builds serialize to identical bytes; keys are UUIDs in sorted order', () => {
  assert.equal(serialize(buildIndex().index), serialize(index));
  const keys = Object.keys(e);
  assert.deepEqual(keys, [...keys].sort());
  assert.ok(keys.every((k) => /^Compendium\.foundryvtt-swse\.(feats|talents)\.Item\.[0-9a-zA-Z]{16}$|^Compendium\.foundryvtt-swse\.(feats|talents)\.Item\.[0-9a-f]{32}$/.test(k)));
});
test('an empty condition list never means eligible: no COMPILED entry is empty; unstructured text is UNRESOLVED, never free', () => {
  for (const [uuid, entry] of Object.entries(e)) {
    if (entry.state === 'COMPILED') assert.ok(entry.structure.conditions.length > 0, uuid);
    if (entry.text && !['', 'none', '—', '-', 'n/a'].includes(entry.text.trim().toLowerCase()) && !entry.structure) assert.equal(entry.state, 'UNRESOLVED', uuid);
    assert.ok(entry.state !== 'PREREQUISITE_FREE_UNVERIFIED' || entry.reasons.length > 0, 'free-by-text carries its verification-pending reason');
  }
});
test('counts match the PRQ.0A census (feats: 96 structured, 196 text-only; talents: 327 structured, 288 text-only)', () => {
  assert.equal(index.counts.feat.COMPILED + (index.counts.feat.PARTIALLY_COMPILED ?? 0), 96);
  assert.equal(index.counts.feat.UNRESOLVED, 196);
  assert.equal(index.counts.talent.COMPILED + (index.counts.talent.PARTIALLY_COMPILED ?? 0), 327);
  assert.equal(index.counts.talent.UNRESOLVED, 288);
});
test('REGRESSION (approved ruling, not reopened): Outlaw "Find an Opening" requires the OUTLAW "Seize the Moment", never the Provocateur one', () => {
  const find = e['Compendium.foundryvtt-swse.talents.Item.3991e671da41995a'];
  assert.equal(find.name, 'Find an Opening');
  assert.equal(find.state, 'COMPILED');
  const targets = find.structure.conditions.filter((c) => c.type === 'talent').map((c) => c.uuid);
  assert.deepEqual(targets, ['Compendium.foundryvtt-swse.talents.Item.e19c06b6dfc7a703']);
  const outlaw = e[targets[0]], provocateur = e['Compendium.foundryvtt-swse.talents.Item.ec12ce36ff7048f2'];
  assert.equal(outlaw.name, 'Seize the Moment'); assert.equal(provocateur.name, 'Seize the Moment');
  assert.notEqual(outlaw.recordId, provocateur.recordId, 'same name, different identities');
});
test('every talent/feat reference in a COMPILED entry resolves to an indexed record of the right domain', () => {
  for (const [uuid, entry] of Object.entries(e)) {
    if (entry.state !== 'COMPILED') continue;
    for (const c of entry.structure.conditions) if (c.type === 'talent' || c.type === 'feat') { assert.ok(e[c.uuid], `${uuid} -> ${c.uuid}`); assert.equal(e[c.uuid].domain, c.type); }
  }
});
test('rejections: duplicate owners, unknown condition types and unsupported groups fail the build', () => {
  const feats = [{ _id: 'aaaaaaaaaaaaaaaa', name: 'A', system: { prerequisites: 'X', prerequisitesStructured: { type: 'any', conditions: [] } } },
    { _id: 'bbbbbbbbbbbbbbbb', name: 'B', system: { prerequisites: 'X', prerequisitesStructured: { type: 'all', conditions: [{ type: 'mystery' }] } } }];
  const r = buildIndex({ feats, talents: [] });
  assert.ok(r.errors.some((m) => /unsupported group type/.test(m)));
  assert.ok(r.errors.some((m) => /unsupported condition type/.test(m)));
  const dup = buildIndex({ feats: [{ _id: 'aaaaaaaaaaaaaaaa', name: 'A', system: {} }, { _id: 'aaaaaaaaaaaaaaaa', name: 'A2', system: {} }], talents: [] });
  assert.ok(dup.errors.some((m) => /duplicate owner/.test(m)));
});
test('the verifier passes on the committed file and never rewrites it', () => {
  const before = fs.readFileSync('data/generated/canonical-prerequisite-index.json', 'utf8');
  const out = execFileSync('node', ['tools/verify-canonical-prerequisite-index.mjs'], { encoding: 'utf8' });
  assert.match(out, /index is current: 1540 entries/);
  assert.equal(fs.readFileSync('data/generated/canonical-prerequisite-index.json', 'utf8'), before);
});
