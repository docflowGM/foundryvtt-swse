#!/usr/bin/env node

/**
 * check-ability-schema-authority.mjs
 *
 * Guardrail for the v2 ability schema contract:
 * - Persistent/editable ability scores live on system.attributes.*
 * - Computed totals/modifiers live on system.derived.attributes.*
 * - system.abilities.* is legacy compatibility/fallback only
 *
 * This scanner flags likely new write or UI-binding sites for system.abilities.*.
 * Reads in adapters, migration code, and documentation are intentionally ignored.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');
const JSON_OUT = process.argv.includes('--json');

const SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.hbs', '.html']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'packs']);

const ALLOWLIST = [
  /^template\.json$/,
  /^scripts\/utils\/schema-adapters\.js$/,
  /^scripts\/adapters\/ActorAbilityBridge\.js$/,
  /^scripts\/migrations\//,
  /^tools\//,
  /^docs\//
];

const WRITE_PATTERNS = [
  /['"]system\.abilities\.[^'"]+['"]\s*:/,
  /\bname\s*=\s*['"]system\.abilities\./,
  /\bdata-dtype\s*=\s*['"][^'"]*['"][^\n]*system\.abilities\./,
  /setProperty\s*\([^,]+,\s*['"]system\.abilities\./,
  /update\s*\(\s*\{[^}]*['"]system\.abilities\./s,
  /updateActor\s*\([^,]+,\s*\{[^}]*['"]system\.abilities\./s,
  /ActorEngine\.(?:updateActor|applyMutationPlan)\s*\([^,]+,\s*\{[^}]*['"]system\.abilities\./s,
  /system\.abilities\.[a-z]{3}\.(?:base|racial|species|enhancement|misc|temp)\s*=/
];

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function isAllowed(relativePath) {
  return ALLOWLIST.some(pattern => pattern.test(relativePath));
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (SCAN_EXTENSIONS.has(path.extname(name))) out.push(full);
  }
  return out;
}

const findings = [];

for (const file of walk(ROOT)) {
  const relativePath = rel(file);
  if (isAllowed(relativePath)) continue;

  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('system.abilities')) continue;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('system.abilities')) continue;
    const windowText = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n');
    if (WRITE_PATTERNS.some(pattern => pattern.test(windowText))) {
      findings.push({ file: relativePath, line: i + 1, text: line.trim() });
    }
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ findings }, null, 2));
} else {
  console.log('\n' + '='.repeat(72));
  console.log('  ABILITY SCHEMA AUTHORITY CHECK');
  console.log('='.repeat(72));
  console.log('  Canonical persistent path: system.attributes.<ability>.*');
  console.log('  Canonical computed path:   system.derived.attributes.<ability>.*');
  console.log('  Legacy fallback only:      system.abilities.<ability>.*');

  if (!findings.length) {
    console.log('\n  OK: no likely system.abilities write/bind sites found.');
  } else {
    console.log(`\n  Findings (${findings.length}):`);
    for (const finding of findings) {
      console.log(`     - ${finding.file}:${finding.line} ${finding.text}`);
    }
  }
  console.log('='.repeat(72) + '\n');
}

if (STRICT && findings.length > 0) process.exit(1);
process.exit(0);
