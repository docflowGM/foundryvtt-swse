import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Release packaging: system.json declares V13 LevelDB pack directories (packs/<name>), the repository versions their legacy NeDB
// sources (packs/<name>.db), and scripts/build/package-system.js stages + compiles + checks + zips. This test needs no npm install:
// it covers the manifest/source mapping, the NeDB replay and key preparation the compiler is fed, and the package layout. The
// LevelDB compile itself (tools/release/build-packs.mjs, which reads every pack back) needs `npm ci --prefix tools/release`.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import(path.join(ROOT, 'tools/release/pack-sources.mjs'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'system.json'), 'utf8'));
let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);

{
  const { packs, problems } = S.planPacks(manifest);
  assert.deepEqual(problems, []);
  assert.equal(packs.length, manifest.packs.length);
  for (const p of packs) {
    assert.ok(!p.path.endsWith('.db'), `${p.name}: the manifest declares a LevelDB directory, never a .db file`);
    assert.ok(fs.statSync(path.join(ROOT, p.source)).isFile(), `${p.name}: committed source ${p.source} exists`);
  }
  const declared = new Set(packs.map((p) => path.basename(p.source)));
  const undeclared = fs.readdirSync(path.join(ROOT, 'packs')).filter((f) => f.endsWith('.db') && !declared.has(f));
  assert.deepEqual(undeclared, ['vehicles-starships.db'], 'known undeclared source (not shipped); a new one must be declared or listed here deliberately');
  assert.deepEqual(S.planPacks({ packs: [{ name: 'x', type: 'Item', path: 'packs/x.db' }] }).problems.length, 1, 'a .db manifest path is refused');
  assert.deepEqual(S.planPacks({ packs: [{ name: 'x', type: 'Scene', path: 'packs/x' }] }).problems.length, 1, 'an unmapped document type is refused');
  ok(`every one of the ${packs.length} declared packs is a LevelDB directory path with a committed packs/<name>.db source`);
}
{
  const text = [
    '{"_id":"a","name":"A1"}',
    '{"_id":"b","name":"B"}',
    '{"$$indexCreated":{"fieldName":"name"}}',
    '{"_id":"a","name":"A2"}',
    '{"_id":"b","$$deleted":true}',
    '',
    'not json',
  ].join('\n');
  const { docs, problems } = S.parseNedb(text);
  assert.deepEqual(docs, [{ _id: 'a', name: 'A2' }], 'later line wins, $$deleted removes, index records ignored');
  assert.equal(problems.length, 1, 'malformed line reported');
  ok('NeDB replay: last write wins, tombstones remove, index records ignored, malformed lines reported');
}
{
  const actor = { _id: 'act1', name: 'NPC', items: [{ _id: 'it1', name: 'Sword', effects: [{ name: 'no id' }, { _id: 'eff2', name: 'has id' }] }], effects: [] };
  const before = structuredClone(actor);
  const a = S.prepareDocuments([actor], 'actors');
  const b = S.prepareDocuments([actor], 'actors');
  assert.deepEqual(actor, before, 'the source document is not modified');
  assert.deepEqual(a.problems, []);
  assert.equal(a.synthesized, 1);
  const synth = S.synthesizedEmbeddedId('!actors.items!act1.it1', 'effects', 0);
  assert.match(synth, /^[0-9a-f]{16}$/);
  assert.deepEqual([...a.keys], ['!actors!act1', '!actors.items!act1.it1', `!actors.items.effects!act1.it1.${synth}`, '!actors.items.effects!act1.it1.eff2']);
  assert.deepEqual([...a.keys], [...b.keys], 'deterministic');
  assert.equal(a.docs[0].items[0].effects[0]._id, synth);
  const back = S.expectedReadBack(a.docs[0], 'actors');
  assert.equal(back._key, undefined); assert.equal(back.items[0]._key, undefined); assert.equal(back.items[0].effects[0]._key, undefined);
  assert.deepEqual(back.items[0].effects[1], { _id: 'eff2', name: 'has id' });
  const dup = S.prepareDocuments([{ _id: 'j', pages: [{ _id: 'p' }, { _id: 'p' }] }], 'journal');
  assert.equal(dup.problems.length, 1, 'duplicate embedded key reported');
  // a synthesized id can never silently overwrite a real sibling: if it ever equals one, the duplicate key fails the build
  const clash = S.synthesizedEmbeddedId('!actors.items!act1.it1', 'effects', 0);
  const collided = S.prepareDocuments([{ _id: 'act1', items: [{ _id: 'it1', effects: [{ name: 'no id' }, { _id: clash, name: 'real' }] }] }], 'actors');
  assert.deepEqual(collided.problems, [`duplicate key !actors.items.effects!act1.it1.${clash}`], 'collision between a synthesized and a real id is refused');
  // ids are position-scoped per parent: the same position under different parents never collides
  assert.notEqual(S.synthesizedEmbeddedId('!actors.items!a.i', 'effects', 0), S.synthesizedEmbeddedId('!actors.items!a.j', 'effects', 0));
  ok('key preparation: Foundry `!sublevel!id` keys at every level, deterministic synthesized ids for id-less embedded documents (a collision with a real id is refused), source untouched');
}
{
  let docs = 0; let synthesized = 0; const synthPacks = new Set();
  for (const p of S.planPacks(manifest).packs) {
    const replay = S.parseNedb(fs.readFileSync(path.join(ROOT, p.source), 'utf8'));
    assert.deepEqual(replay.problems, [], p.name);
    const prepared = S.prepareDocuments(replay.docs, p.collection);
    assert.deepEqual(prepared.problems, [], p.name);
    docs += replay.docs.length; synthesized += prepared.synthesized;
    if (prepared.synthesized) synthPacks.add(p.type);
  }
  assert.ok(docs > 0);
  assert.deepEqual([...synthPacks], synthesized ? ['Actor'] : [], 'only actor packs carry id-less embedded documents');
  ok(`every committed source replays and keys cleanly (${docs} documents; ${synthesized} id-less embedded documents get synthesized ids in the artifact)`);
}
{
  assert.ok(!S.PACKAGE_INCLUDE.some((e) => /^(docs|tools|packs|tests|reference)\b/.test(e)), 'docs, tools, tests, references and pack sources never ship');
  assert.ok(S.PACKAGE_INCLUDE.includes('data'), 'runtime data ships');
  assert.ok(S.PACKAGE_INCLUDE.includes('LICENSE'), 'the license ships');
  const license = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
  assert.equal(manifest.license, 'MIT');
  assert.match(license, /^MIT License\n\nCopyright \(c\) 2026 Doc Flow\n/, 'MIT text with the owner-approved attribution');
  assert.deepEqual([...S.PACKAGE_EXCLUDE_DIRS], ['data/audits', 'data/audit'], 'audit evidence under data/ never ships');
  const packager = fs.readFileSync(path.join(ROOT, 'scripts/build/package-system.js'), 'utf8');
  for (const use of ['PACKAGE_INCLUDE', 'PACKAGE_EXCLUDE_DIRS', 'buildPacks', 'manifestCoverage']) assert.ok(packager.includes(use), `the packager uses ${use}`);
  assert.ok(!/filesToInclude/.test(packager), 'no second, hand-maintained allowlist');
  ok('package layout: one allowlist (tools/release/pack-sources.mjs) used by the packager; audit evidence, docs and sources excluded');
}
{
  // a staged package as the packager produces it: the included tree (minus exclusions) plus a LevelDB store at every declared pack path
  const included = (rel) => S.PACKAGE_INCLUDE.some((e) => rel === e || rel.startsWith(`${e}/`)) && !S.PACKAGE_EXCLUDE_DIRS.some((x) => rel === x || rel.startsWith(`${x}/`));
  const stagedPacks = new Set(manifest.packs.map((p) => p.path));
  const view = (packs) => ({
    isFile: (p) => (/\/(CURRENT|MANIFEST-000001)$/.test(p) ? packs.has(path.dirname(p)) : included(p) && fs.existsSync(path.join(ROOT, p)) && fs.statSync(path.join(ROOT, p)).isFile()),
    isDir: (p) => packs.has(p),
    read: () => 'MANIFEST-000001\n',
  });
  assert.deepEqual(S.manifestCoverage(manifest, view(stagedPacks)), [], 'every esmodule, style, language file and pack is in the package');
  const lessOne = new Set(stagedPacks); lessOne.delete('packs/species');
  assert.deepEqual(S.manifestCoverage(manifest, view(lessOne)), ['missing pack directory packs/species']);
  ok('manifest coverage: the staged layout satisfies every path system.json loads, and a missing pack store is caught');
}
console.log(`release-package-manifest: ${n} checks ok`);
