// scripts/dev/v2-slippage-report.mjs
/**
 * Repo-wide V2 slippage grep (Node).
 *
 * Run:
 *   node scripts/dev/v2-slippage-report.mjs
 */
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PATTERNS = [
  { id: 'renderActorSheet hook', re: /Hooks\.on\(\s*['"]renderActorSheet['"]/ },
  { id: 'html.find', re: /\bhtml\.find\b/ },
  { id: 'activateListeners', re: /\bactivateListeners\s*\(/ },
  { id: 'jQuery $(', re: /\$\(/ }
];

const files = await glob('scripts/**/*.js', { cwd: ROOT, nodir: true });

const hits = [];
for (const f of files) {
  const abs = path.join(ROOT, f);
  const txt = await readFile(abs, 'utf8');
  for (const p of PATTERNS) {
    if (p.re.test(txt)) hits.push({ file: f, pattern: p.id });
  }
}

hits.sort((a, b) => (a.file + a.pattern).localeCompare(b.file + b.pattern));

if (!hits.length) {
  console.log('✅ No obvious V1 slippage patterns found.');
  process.exit(0);
}

console.log('⚠️ V1 slippage patterns found:');
for (const h of hits) console.log(`- ${h.file}: ${h.pattern}`);
process.exit(1);
