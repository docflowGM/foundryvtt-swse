import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_DIR = 'scripts/engine/progression/profile';

/** Foundry-only wiring cannot execute offline; this guards the part that CAN rot silently: its imports. */
test('every Foundry-absolute import in the profile wiring resolves to a real file and a real named export', () => {
  const problems = [];
  for (const file of fs.readdirSync(path.join(ROOT, PROFILE_DIR)).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(ROOT, PROFILE_DIR, file), 'utf8');
    const re = /import\s+\{([^}]+)\}\s+from\s+'(\/systems\/foundryvtt-swse\/[^']+)'/g;
    let m;
    while ((m = re.exec(src))) {
      const target = m[2].replace('/systems/foundryvtt-swse/', '');
      if (!fs.existsSync(path.join(ROOT, target))) { problems.push(`${file}: missing ${target}`); continue; }
      const text = fs.readFileSync(path.join(ROOT, target), 'utf8');
      for (const name of m[1].split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
        if (!new RegExp(`export\\s+(const|class|function|async function)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b`).test(text)) problems.push(`${file}: ${target} has no export ${name}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('the service uses only the strict resolver and the pure compile/apply path (no template system, no actor writes)', () => {
  const src = fs.readFileSync(path.join(ROOT, PROFILE_DIR, 'galactic-profile-service.js'), 'utf8');
  assert.equal(/Template(Registry|Adapter|Validator|Initializer)/.test(src), false);
  assert.equal(/resolveAdapter\(/.test(src), false);
  assert.equal(/\.(update|updateActor|setFlag|createEmbeddedDocuments)\(/.test(src), false, 'no actor mutation in the service');
  assert.match(src, /applyCompiledProfile\(/);
  assert.match(src, /compileProfile\(/);
});
