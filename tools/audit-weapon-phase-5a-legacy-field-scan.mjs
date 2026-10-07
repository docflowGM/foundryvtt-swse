#!/usr/bin/env node
// Phase 5A (read-only): repo-wide scan of consumers of legacy weapon item fields. Reproducible, deterministic evidence for
// data/audits/weapon-phase-5a-runtime-consumer-matrix.json. It reads source files only and mutates nothing.
// Usage: node tools/audit-weapon-phase-5a-legacy-field-scan.mjs [--out <file>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIELDS = [
  'weaponCategory', 'proficiency', 'subcategory', 'category', 'weaponGroup', 'group',
  'meleeOrRanged', 'range', 'rangeProfile', 'ranges', 'ranged', 'thrown', 'reachBonus',
  'damage', 'damageFormula', 'damageType', 'damageTypes', 'damageDice', 'damageDiceType', 'damageBonus',
  'attackBonus', 'attackAttribute', 'autofire', 'properties', 'traits', 'specialEffects',
  'ammunition.type', 'ammunition.current', 'ammunition.max', 'ammunition',
  'proficient', 'dualWielded', 'wieldedTwoHanded', 'weaponProperties', 'weaponType', 'critRange', 'critMultiplier', 'size',
];
const SCOPES = ['scripts', 'templates', 'index.js'];
const EXCLUDE = [/^scripts\/dev\//, /\.min\.js$/];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function files() {
  const out = execFileSync('git', ['ls-files', ...SCOPES], { cwd: ROOT, maxBuffer: 1 << 28 }).toString().split('\n').filter(Boolean);
  return out.filter((f) => /\.(js|mjs|hbs|html)$/.test(f) && !EXCLUDE.some((r) => r.test(f))).sort();
}

function enclosing(lines, idx) {
  for (let i = idx; i >= Math.max(0, idx - 200); i--) {
    const m = lines[i].match(/^\s*(?:export\s+)?(?:async\s+)?(?:static\s+)?(?:function\s+\*?\s*([A-Za-z0-9_$]+)|(?:async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{\s*$|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>)/);
    if (m && !/^(if|for|while|switch|catch|return)$/.test(m[1] || m[2] || m[3] || '')) return m[1] || m[2] || m[3];
  }
  return null;
}

export function scan() {
  const list = files(), hits = [];
  const pats = FIELDS.map((f) => ({ f, re: new RegExp(`(?:system\\??\\.|['"\`]system\\.|\\bsys\\??\\.|\\bs\\??\\.)${esc(f)}(?![A-Za-z0-9_])`, 'g') }));
  for (const file of list) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (!/weapon|Weapon|ammunition|attack|damage/.test(text)) continue;
    const lines = text.split('\n');
    lines.forEach((ln, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(ln)) return; // comments
      for (const { f, re } of pats) {
        re.lastIndex = 0;
        if (!re.test(ln)) continue;
        // 'ammunition' alone must not double-count the dotted variants; 'proficiency'/'group'/'range'/'damage' are broad, so require weapon context
        if (['proficiency', 'group', 'category', 'range', 'ranges', 'damage', 'size', 'properties', 'traits', 'ranged', 'thrown', 'proficient', 'subcategory'].includes(f) && !/weapon|Weapon|attack|ammo|item\b|w\.system|wpn/i.test(ln + ' ' + (lines[i - 1] || ''))) continue;
        const write = new RegExp(`['"\`]system\\.${esc(f)}['"\`]\\s*:|system\\.${esc(f)}\\s*=[^=]|\\.update\\([^)]*system\\.${esc(f)}`).test(ln);
        hits.push({ field: f, file, line: i + 1, fn: enclosing(lines, i), kind: write ? 'write' : 'read', text: ln.trim().slice(0, 160) });
      }
    });
  }
  return { filesScanned: list.length, hits };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = scan();
  const byField = {};
  for (const h of r.hits) { const b = (byField[h.field] ||= { reads: 0, writes: 0, files: new Set() }); b[h.kind === 'write' ? 'writes' : 'reads']++; b.files.add(h.file); }
  const summary = Object.fromEntries(Object.entries(byField).map(([k, v]) => [k, { reads: v.reads, writes: v.writes, files: v.files.size }]));
  const i = process.argv.indexOf('--out');
  if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify({ filesScanned: r.filesScanned, summary, hits: r.hits }, null, 1));
  console.log(JSON.stringify({ filesScanned: r.filesScanned, totalHits: r.hits.length, summary }, null, 1));
}
