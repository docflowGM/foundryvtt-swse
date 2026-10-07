// Shared, deterministic reference scan for the Phase 3C weapon production ledger.
// Finds explicit id references and quoted exact-name references to weapon production records
// across tracked runtime/data/test/tool sources. Authority audits and docs are excluded
// (they describe the records and must not count as dependents).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const SCAN_EXCLUDE_PREFIXES = ['data/audits/', 'docs/', 'assets/', 'styles/', 'design-docs/', '.github/', 'tools/lib/item-weapons-reference-scan.mjs'];
export const SCAN_EXCLUDE_PATTERNS = [/^tools\/(build|verify)-item-weapons/, /^tools\/census-item-ssot/, /^tools\/lib\/item-weapons-phase-4h/, /^tools\/audit-weapon-phase-5a/, /^tools\/build-weapon-runtime-registry/, /^tools\/build-weapon-phase-5b/, /^tools\/lib\/weapon-phase-5b/, /^data\/weapons\/canonical-weapon-registry\.json$/, /^tests\/weapon-runtime-/, /^tests\/helpers\/weapon-runtime-/, /^scripts\/items\/weapon-runtime\//];
const TEXT_EXT = new Set(['.db', '.json', '.js', '.mjs', '.hbs', '.html', '.csv', '.py', '.yml', '.yaml', '.txt']);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function scanFileList(root) {
  const out = execFileSync('git', ['ls-files'], { cwd: root, maxBuffer: 1 << 28 }).toString().split('\n').filter(Boolean);
  return out.filter((f) => !SCAN_EXCLUDE_PREFIXES.some((p) => f.startsWith(p)) && !SCAN_EXCLUDE_PATTERNS.some((r) => r.test(f)) && TEXT_EXT.has(path.extname(f)) && fs.existsSync(path.join(root, f))).sort();
}

/** records: [{id, name}] -> Map id -> [{file, kind: 'id'|'name', count}] (references from anywhere except the record's own pack line). */
export function scanReferences(root, records) {
  const files = scanFileList(root);
  const idRe = new RegExp(`(?<![A-Za-z0-9_-])(${records.map((r) => esc(r.id)).join('|')})(?![A-Za-z0-9_-])`, 'g');
  const names = [...new Set(records.map((r) => r.name))];
  const nameRe = new RegExp(`(["'\`])(${names.map(esc).join('|')})\\1`, 'g');
  const idSet = new Map(records.map((r) => [r.id, r])); const nameToIds = new Map();
  for (const r of records) { if (!nameToIds.has(r.name)) nameToIds.set(r.name, []); nameToIds.get(r.name).push(r.id); }
  const acc = new Map(records.map((r) => [r.id, new Map()]));
  const bump = (id, file, kind) => { const m = acc.get(id); const k = `${file}\u0000${kind}`; m.set(k, (m.get(k) || 0) + 1); };
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    if (f === 'packs/weapons.db') {
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        let self = null, selfName = null;
        try { const j = JSON.parse(line); self = j._id; selfName = j.name; } catch { /* ignore */ }
        for (const m of line.matchAll(idRe)) if (m[1] !== self) bump(m[1], f, 'id');
        for (const m of line.matchAll(nameRe)) if (m[2] !== selfName) for (const id of nameToIds.get(m[2])) bump(id, f, 'name');
      }
      continue;
    }
    for (const m of text.matchAll(idRe)) bump(m[1], f, 'id');
    for (const m of text.matchAll(nameRe)) for (const id of nameToIds.get(m[2])) bump(id, f, 'name');
  }
  const out = new Map();
  for (const [id, m] of acc) out.set(id, [...m.entries()].map(([k, count]) => { const [file, kind] = k.split('\u0000'); return { file, kind, count }; }).sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.kind < b.kind ? -1 : 1)));
  return { files: files.length, references: out };
}
