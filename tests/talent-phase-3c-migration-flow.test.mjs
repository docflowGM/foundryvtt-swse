import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, detectPackState, loadCommittedManifests } from '../tools/apply-talent-phase-3c.mjs';
import { scanManifestText } from '../tools/audit-talent-phase-3c-text-quality.mjs';

// End-to-end tool-architecture test on a SCRATCH COPY of the repository. The checked-out packs are never touched.
//   pre-state copy : --report, --check, --apply       -> certified post-state
//   post-state copy: --verify --exact (twice), --status, --apply (must refuse cleanly), --check (must refuse cleanly)

if (detectPackState().state !== 'PRE_STATE') {
  console.log('  skip migration flow: production packs are already migrated; use apply-talent-phase-3c.mjs --verify');
  process.exit(0);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'swse-3c-flow-'));
const copy = path.join(scratch, 'repo');
try {
  fs.mkdirSync(path.join(copy, 'packs'), { recursive: true });
  for (const dir of ['tools', 'data']) fs.cpSync(path.join(ROOT, dir), path.join(copy, dir), { recursive: true });
  for (const f of ['talents.db', 'talent_trees.db', 'classes.db']) fs.copyFileSync(path.join(ROOT, 'packs', f), path.join(copy, 'packs', f));
  const packsBefore = ['talents.db', 'talent_trees.db', 'classes.db'].map(f => fs.readFileSync(path.join(ROOT, 'packs', f), 'utf8'));

  const run = (...args) => {
    const r = spawnSync(process.execPath, [path.join(copy, 'tools/apply-talent-phase-3c.mjs'), ...args], { cwd: copy, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return { code: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') };
  };
  let n = 0;
  const step = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

  step('pre-state copy: --status reports PRE_STATE', () => { const r = run('--status'); assert.equal(r.code, 0); assert.match(r.out, /PRE_STATE/); });
  step('--apply refuses when the committed report is missing/stale (nothing is written)', () => {
    fs.rmSync(path.join(copy, 'data/audits/talent-phase-3c-dry-run-report.json'), { force: true });
    const before = fs.readFileSync(path.join(copy, 'packs/talents.db'), 'utf8');
    const r = run('--apply', '--allow-ocr-artifacts'); assert.notEqual(r.code, 0); assert.match(r.out, /report is missing or stale/);
    assert.equal(fs.readFileSync(path.join(copy, 'packs/talents.db'), 'utf8'), before);
  });
  step('--report then --check pass on the pre-state', () => {
    assert.equal(run('--report').code, 0); const r = run('--check'); assert.equal(r.code, 0, r.out); assert.match(r.out, /report is current/);
  });
  step('--verify refuses on the pre-state (nothing to verify)', () => { const r = run('--verify'); assert.notEqual(r.code, 0); assert.match(r.out, /still the certified pre-state/); });
  const textDefects = scanManifestText(loadCommittedManifests()).gating.length;
  step('--apply refuses to write certified text that carries OCR artifacts (checked only while such text exists)', () => {
    if (!textDefects) return; // certified text is clean: the gate has nothing to refuse (apply itself is exercised below)
    const snap = fs.readFileSync(path.join(copy, 'packs/talents.db'), 'utf8');
    const r = run('--apply');
    assert.notEqual(r.code, 0); assert.match(r.out, /refusing to apply.*OCR artifacts/); assert.equal(fs.readFileSync(path.join(copy, 'packs/talents.db'), 'utf8'), snap);
  });
  step('--apply refuses while a source-text correction still requires the rendered PDF, even with clean text', () => {
    const file = path.join(copy, 'data/audits/talent-phase-3b-source-text-corrections.json');
    fs.writeFileSync(file, JSON.stringify({ entries: [{ id: 'TC-X', canonicalIdentity: 'B|T|Pending', printedPage: 1, blocksApply: true, applied: false, verification: { status: 'TXT_AMBIGUOUS_PDF_REQUIRED' } }] }));
    try {
      const snap = fs.readFileSync(path.join(copy, 'packs/talents.db'), 'utf8');
      const r = run('--apply'); assert.notEqual(r.code, 0); assert.match(r.out, /still require the rendered PDF \(B\|T\|Pending\)/);
      assert.equal(fs.readFileSync(path.join(copy, 'packs/talents.db'), 'utf8'), snap);
    } finally { fs.rmSync(file, { force: true }); }
  });
  step('--apply succeeds on the pre-state (with NO override once the certified text is clean)', () => {
    const r = textDefects ? run('--apply', '--allow-ocr-artifacts') : run('--apply');
    assert.equal(r.code, 0, r.out); assert.match(r.out, /APPLIED/);
  });
  step('post-state copy: --status reports POST_STATE', () => { assert.match(run('--status').out, /POST_STATE/); });
  step('--verify --exact passes', () => { const r = run('--verify', '--exact'); assert.equal(r.code, 0, r.out); assert.match(r.out, /verify PASS/); });
  step('--verify passes again with zero changes (rerunnable)', () => {
    const snap = ['talents.db', 'talent_trees.db', 'classes.db'].map(f => fs.readFileSync(path.join(copy, 'packs', f), 'utf8'));
    const r = run('--verify'); assert.equal(r.code, 0, r.out);
    assert.deepEqual(['talents.db', 'talent_trees.db', 'classes.db'].map(f => fs.readFileSync(path.join(copy, 'packs', f), 'utf8')), snap);
  });
  step('--apply against the migrated state refuses cleanly (already applied), not with an ID collision', () => {
    const snap = fs.readFileSync(path.join(copy, 'packs/talents.db'), 'utf8');
    const r = run('--apply'); assert.notEqual(r.code, 0);
    assert.match(r.out, /already applied/); assert.match(r.out, /pre-state fingerprint mismatch/);
    assert.doesNotMatch(r.out, /collision|collides/);
    assert.equal(fs.readFileSync(path.join(copy, 'packs/talents.db'), 'utf8'), snap);
  });
  step('--check on the migrated state also refuses cleanly and points at --verify', () => {
    const r = run('--check'); assert.notEqual(r.code, 0); assert.match(r.out, /use --verify/);
  });
  step('a corrupted post-state fails --verify (protected record edited)', () => {
    const p = path.join(copy, 'packs/talents.db');
    const good = fs.readFileSync(p, 'utf8');
    const lines = good.split('\n');
    const idx = lines.findIndex(l => l.includes('"_id":"a7d8c4da96eacad4"'));
    assert.ok(idx >= 0, 'protected review extra a7d8c4da96eacad4 must exist');
    lines[idx] = lines[idx].replace('"name":"Notorious"', '"name":"Notorious!"');
    fs.writeFileSync(p, lines.join('\n'));
    const r = run('--verify'); assert.notEqual(r.code, 0); assert.match(r.out, /FAIL {2}protected 92/);
    fs.writeFileSync(p, good);
    assert.equal(run('--verify').code, 0);
  });
  step('repository packs were never modified by this test', () => {
    assert.deepEqual(['talents.db', 'talent_trees.db', 'classes.db'].map(f => fs.readFileSync(path.join(ROOT, 'packs', f), 'utf8')), packsBefore);
  });
  console.log(`\n${n} migration-flow steps passed`);
} finally { fs.rmSync(scratch, { recursive: true, force: true }); }
