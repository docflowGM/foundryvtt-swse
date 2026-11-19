import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { verifyInstalledPacks } = await import(path.join(ROOT, 'tools/release/verify-installed-packs.mjs'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'system.json'), 'utf8'));

// A raw git-style install (system.json + NeDB sources only): every pack is reported missing, with the feats pack named.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swse-install-'));
fs.writeFileSync(path.join(tmp, 'system.json'), JSON.stringify(manifest));
fs.mkdirSync(path.join(tmp, 'packs'));
fs.writeFileSync(path.join(tmp, 'packs/feats.db'), '{}\n');
let r = verifyInstalledPacks(tmp);
assert.equal(r.ok, false);
assert.equal(r.total, manifest.packs.length);
assert.equal(r.missing.length, manifest.packs.length, 'no pack store exists in a raw checkout');
assert.deepEqual(r.missing.find((m) => m.name === 'feats'), { name: 'feats', path: 'packs/feats', hasSource: true });

// An empty directory (not a store) is still missing; a LevelDB-shaped store counts.
fs.mkdirSync(path.join(tmp, 'packs/feats'));
assert.equal(verifyInstalledPacks(tmp).missing.some((m) => m.name === 'feats'), true, 'an empty directory is not a store');
fs.writeFileSync(path.join(tmp, 'packs/feats/CURRENT'), 'MANIFEST-000006\n');
fs.writeFileSync(path.join(tmp, 'packs/feats/MANIFEST-000006'), '');
assert.equal(verifyInstalledPacks(tmp).missing.some((m) => m.name === 'feats'), false);
assert.equal(verifyInstalledPacks(tmp).missing.length, manifest.packs.length - 1);
assert.equal(verifyInstalledPacks(path.join(tmp, 'nope')).ok, false);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('PASS: the installed-pack verifier flags a raw git install (feats missing) and accepts LevelDB stores');
