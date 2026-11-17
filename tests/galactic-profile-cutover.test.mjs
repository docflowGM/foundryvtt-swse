import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));

const RETIRED = [
  'scripts/engine/progression/template/template-registry.js',
  'scripts/engine/progression/template/template-adapter.js',
  'scripts/engine/progression/template/template-validator.js',
  'scripts/engine/progression/template/template-initializer.js',
  'scripts/engine/progression/template/template-traversal-policy.js',
  'scripts/apps/progression-framework/dialogs/template-selection-dialog.js',
  'scripts/apps/template-character-creator.js',
  'scripts/apps/chargen/chargen-templates.js',
  'scripts/apps/droid-template-choice-dialog.js'
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (!['node_modules', '.git'].includes(e.name)) walk(rel, out); }
    else if (/\.(js|mjs|hbs|json)$/.test(e.name)) out.push(rel);
  }
  return out;
}

test('the parallel template-creation stack is gone', () => {
  for (const f of RETIRED) assert.equal(exists(f), false, `${f} must stay retired`);
  assert.equal(exists('scripts/engine/progression/template'), false);
});

test('nothing imports a retired module or references its classes (grep gate across scripts/, templates/, index, manifest)', () => {
  const needles = [/template-registry/, /template-adapter/, /template-validator/, /template-initializer/, /template-traversal-policy/, /template-selection-dialog/,
    /template-character-creator/, /chargen-templates/, /droid-template-choice/, /\bTemplateRegistry\b/, /\bTemplateAdapter\b/, /\bTemplateInitializer\b/, /\bTemplateCharacterCreator\b/, /\bTemplateTraversalPolicy\b/];
  const offenders = [];
  for (const rel of [...walk('scripts'), ...walk('templates'), 'system.json']) {
    const text = read(rel);
    // doc comments that merely NAME the retired module as history are allowed; code/import/manifest use is not.
    const code = text.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    for (const n of needles) if (n.test(code)) offenders.push(`${rel}: ${n}`);
  }
  assert.deepEqual(offenders, []);
});

test('every character-creation entry point routes through the shared ProgressionSession (no direct actor creation)', () => {
  const dir = read('scripts/infrastructure/hooks/directory-hooks.js');
  const side = read('scripts/infrastructure/hooks/actor-sidebar-controls.js');
  for (const [name, src] of [['directory', dir], ['sidebar', side]]) {
    assert.match(src, /launchNewProgression\(\{ actorType: 'character', profilePicker: true \}\)/, `${name}: Galactic Profile creation must open the profile picker`);
    assert.equal(/createActor|Actor\.create|ActorEngine\.createActor/.test(src), false, `${name}: no direct actor creation`);
  }
  const shell = read('scripts/apps/progression-framework/chargen-shell.js');
  assert.match(shell, /options\?\.profilePicker === true/);
  const entry = read('scripts/apps/progression-framework/progression-entry.js');
  assert.match(entry, /_createTransientProgressionActor/, 'new characters stay transient until final confirmation');
  // organic and droid splash both open the SAME picker
  assert.match(read('templates/apps/progression-framework/steps/intro-work-surface.hbs'), /data-role="intro-galactic-profile"/);
});

test('retained legacy v2 JSON is data only: no runtime script loads it', () => {
  for (const rel of walk('scripts')) {
    const code = read(rel).split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    if (rel.startsWith('scripts/maintenance/') || rel.startsWith('scripts/migration/')) continue;   // dev-time migration utilities, never loaded by the system
    assert.equal(/character-templates\.json|nonheroic-templates\.json/.test(code), false, `${rel} must not load the v2 template JSON`);
  }
});
