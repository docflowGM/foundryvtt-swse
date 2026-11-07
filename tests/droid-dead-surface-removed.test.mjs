import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Clean-break: the retired droid surfaces stay gone, with no dangling references.
const DELETED = [
  'scripts/apps/droid-builder-app.js', 'scripts/apps/stock-droid-conversion-dialog.js', 'templates/apps/stock-droid-conversion-dialog.hbs',
  'scripts/domain/droids/droid-modification-factory.js', 'scripts/domain/droids/droid-transaction-service.js',
  'scripts/domain/droids/droid-slot-governance.js', 'scripts/domain/droids/droid-system-definitions.js'
];
for (const f of DELETED) assert.equal(fs.existsSync(f), false, `${f} must stay deleted`);

const NAMES = ['droid-builder-app', 'stock-droid-conversion-dialog', 'droid-modification-factory', 'droid-transaction-service', 'droid-slot-governance', 'droid-system-definitions'];
function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith('.') || n === 'node_modules') continue;
    const full = path.join(dir, n);
    if (fs.statSync(full).isDirectory()) walk(full, out); else if (/\.(js|mjs|hbs|css|json)$/.test(n)) out.push(full);
  }
  return out;
}
const live = [...walk('scripts'), ...walk('templates'), ...walk('styles'), 'system.json'];
for (const file of live) {
  const text = fs.readFileSync(file, 'utf8');
  for (const name of NAMES) {
    // import / template / manifest references only; prose comments may mention history
    const re = new RegExp(`(from\\s+['"][^'"]*${name}|import\\(['"][^'"]*${name}|["'][^"']*${name}\\.(js|hbs)["'])`);
    assert.equal(re.test(text), false, `${file} still references ${name}`);
  }
}
assert.equal(/stock-droid-conversion-dialog/.test(fs.readFileSync('styles/system/app-responsive-import-wizards.css', 'utf8')), false);
assert.equal(/stock-droid-conversion-dialog/.test(fs.readFileSync('scripts/ui/shell/shell-responsive-observer.js', 'utf8')), false);
console.log('Droid dead-surface removal tests passed.');
