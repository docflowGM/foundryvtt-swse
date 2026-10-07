// Phase 5C-28: the parity gate must FAIL on each of these defects (and pass on the real tree).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFeats, verifyWeapons, CANONICAL_FEATS, CANONICAL_WEAPONS } from '../tools/lib/canonical-production-verify.mjs';
import { verifyClassification, scanRuntimeAuditImports } from '../tools/lib/canonical-authority-classification.mjs';
import { scanDangling } from '../tools/migrate-phase-5c-feat-references.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const real = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mk = (over = {}) => ({ read: (f) => (f in over ? (typeof over[f] === 'function' ? over[f](real(f)) : over[f]) : real(f)), exists: (f) => f in over || fs.existsSync(path.join(ROOT, f)) });
const json = (fn) => (t) => { const j = JSON.parse(t); fn(j); return JSON.stringify(j); };
const jsonPretty = (fn) => (t) => { const j = JSON.parse(t); fn(j); return JSON.stringify(j, null, 2) + '\n'; };
const lineEdit = (fn) => (t) => { const l = t.split('\n').filter(Boolean).map((x) => JSON.parse(x)); const out = fn(l) ?? l; return out.map((d) => JSON.stringify(d)).join('\n') + '\n'; };
const F = (over) => verifyFeats(mk(over), { skipLossless: true }).errors;
const W = (over) => verifyWeapons(mk(over), { skipLossless: true }).errors;
const fails = (errs, re, label) => assert.ok(errs.length > 0 && (!re || errs.some((e) => re.test(e))), `${label}: expected failure ${re ?? ''}, got ${JSON.stringify(errs.slice(0, 3))}`);

// the real tree passes
assert.deepEqual(verifyFeats(mk()).errors, [], 'real feat tree must pass');
assert.deepEqual(verifyWeapons(mk()).errors, [], 'real weapon tree must pass');
assert.equal(verifyFeats(mk()).counts.production, 353);
assert.equal(verifyWeapons(mk()).counts.production, 203);

// 1-3 feats: missing / unexpected / duplicate
fails(verifyFeats(mk({ [CANONICAL_FEATS]: json((j) => { j.identities.pop(); }) })).errors, /expected 353|missing|unexpected/, 'missing feat (corpus)');
fails(F({ 'packs/feats.db': lineEdit((l) => l.slice(1)) }), /missing canonical feat/, 'missing feat (pack)');
fails(F({ 'packs/feats.db': lineEdit((l) => [...l, { ...l[0], _id: 'ffffffffffffffff' }]) }), /unexpected feat/, 'unexpected feat');
fails(F({ 'packs/feats.db': lineEdit((l) => [...l, l[0]]) }), /duplicate _id/, 'duplicate feat');
// 4 non-deterministic feat id
fails(F({ [CANONICAL_FEATS]: json((j) => { j.identities[0].production.id = '0123456789abcdef'; }) }), /differs|missing|unexpected/, 'non-deterministic feat id');
// 5-6 hand-edited feat pack / catalog
fails(F({ 'packs/feats.db': lineEdit((l) => { l[3].system.benefit = 'hand edit'; }) }), /differs/, 'hand-edited feat pack');
fails(F({ 'data/feat-catalog.json': jsonPretty((j) => { j[2].name = 'Hand Edit'; }) }), /catalog|differs/, 'hand-edited feat catalog');
// 13 missing derivative mapping, alias missing
fails(F({ 'data/migrations/feat-canonical-aliases.json': jsonPretty((j) => { j.aliases.find((a) => a.choice).choice = null; }) }), /derivative|differs/, 'missing derivative mapping');
fails(F({ 'data/migrations/feat-canonical-aliases.json': jsonPretty((j) => { j.aliases.pop(); }) }), /alias/, 'missing feat alias');
// 17 semantic tag drift + identity stamp loss
fails(F({ 'packs/feats.db': lineEdit((l) => { l[0].system.semanticTags = [...l[0].system.semanticTags, 'melee']; }) }), /semanticTags|differs/, 'feat semantic drift');
fails(F({ 'packs/feats.db': lineEdit((l) => { delete l[0].flags.swse.canonicalFeat; }) }), /identity stamp|differs/, 'feat identity stamp lost');
// retired derivative id back in the pack
fails(F({ 'packs/feats.db': lineEdit((l) => [...l, { ...l[0], _id: '2d680cc46a7972da' }]) }), /retired feat|unexpected/, 'retired feat id in pack');

// 7-9 weapons: missing / unexpected / duplicate
fails(verifyWeapons(mk({ [CANONICAL_WEAPONS]: json((j) => { j.identities.pop(); }) })).errors, /expected 203|missing|unexpected|differs/, 'missing weapon (corpus)');
fails(W({ 'packs/weapons.db': lineEdit((l) => l.filter((d) => d._id !== l.find((x) => x.flags?.swse?.canonicalWeapon)._id)) }), /missing canonical weapon|differs/, 'missing weapon (pack)');
fails(W({ 'packs/weapons.db': lineEdit((l) => [...l, { ...l.find((x) => x.flags?.swse?.canonicalWeapon), _id: 'weapon-unexpected-thing' }]) }), /unexpected weapon|differs/, 'unexpected weapon');
fails(W({ 'packs/weapons.db': lineEdit((l) => [...l, l.find((x) => x.flags?.swse?.canonicalWeapon)]) }), /duplicate _id/, 'duplicate weapon');
// 10 non-deterministic weapon id
fails(W({ [CANONICAL_WEAPONS]: json((j) => { j.identities[0].production.id = 'weapon-not-its-id'; }) }), /differs|missing|unexpected/, 'non-deterministic weapon id');
// 11 hand-edited weapon pack, 16 compat projection disagreement / identity loss
fails(W({ 'packs/weapons.db': lineEdit((l) => { const d = l.find((x) => x.flags?.swse?.canonicalWeapon); d.system.damage = '99d99'; }) }), /differs/, 'hand-edited weapon pack / compat projection');
fails(W({ 'packs/weapons-rifles.db': lineEdit((l) => { delete l[0].flags.swse.canonicalWeapon; }) }), /differs/, 'category pack lost identity');
fails(W({ 'packs/weapons.db': lineEdit((l) => { const d = l.find((x) => x.flags?.swse?.canonicalWeapon); d.flags.swse.canonicalWeapon.identityKey = 'weapon::wrong'; }) }), /identity stamp|differs/, 'weapon identity stamp changed');
// 12 registry divergence, 18 registry semantic drift
fails(W({ 'data/weapons/canonical-weapon-registry.json': json((j) => { j.identities[0].canonicalName = 'Tampered'; }) }), /registry/, 'registry divergence');
fails(W({ 'data/weapons/canonical-weapon-registry.json': json((j) => { j.identities[0].semantic.tags.finalTags = ['melee']; }) }), /registry/, 'registry semantic drift');
// 15 missing weapon alias
fails(W({ 'data/migrations/weapon-canonical-aliases.json': json((j) => { j.retired.pop(); }) }), /alias/, 'missing weapon alias');
// 14 dangling reference to a retired feat id
assert.ok(scanDangling((f) => (f === 'packs/heroic.db' ? `${real(f)}\n{"x":"2d680cc46a7972da"}` : real(f))).length > 0, 'dangling retired feat id must be reported');
assert.equal(scanDangling().length, 0, 'real tree has no dangling retired feat ids');
// 19 runtime import from audit authority
assert.ok(scanRuntimeAuditImports(['scripts/fake-runtime.js'], () => "import x from '/systems/foundryvtt-swse/data/audits/feat-phase-1a-canonical-identity-manifest.json';").length > 0, 'runtime audit import must fail');
assert.equal(scanRuntimeAuditImports(['scripts/fake-runtime.js'], () => '// see data/audits/feat-foo.json for provenance').length, 0, 'comments are not imports');
// 20 unclassified new feat/weapon data source
assert.ok(verifyClassification(mk(), ['data/feat-new-hand-authored-source.json']).some((e) => /unclassified/.test(e)), 'new unclassified source must fail');
assert.deepEqual(verifyClassification(mk()), [], 'real tree classification is complete');
console.log('phase-5c-canonical-production-negative: ok');
