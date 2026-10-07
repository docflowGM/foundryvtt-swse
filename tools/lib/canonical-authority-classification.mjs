// Phase 5C-9/10: authority classification of every feat/weapon data file, plus the "no runtime import of audit authority" scan.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './canonical-weapons-shared.mjs';

export const CLASSES = ['CANONICAL_SSOT', 'GENERATED_PRODUCTION', 'GENERATED_RUNTIME_INDEX', 'GENERATED_COMPATIBILITY', 'MIGRATION_ALIAS_ONLY', 'HISTORICAL_AUDIT_EVIDENCE', 'DEAD_REMOVE',
  // Deviations (reported, not in the planner's seven): data owned by other domains that merely names/refs feats or weapons.
  'OTHER_DOMAIN_DATA', 'REFERENCE_BEARING_DOMAIN_DATA'];
export const CLASSIFICATION_FILE = 'data/audits/phase-5c-authority-classification.json';

// Which repo files are in scope: any data/ or packs/ file whose basename mentions feat or weapon, plus the canonical dir.
export const inScope = (rel) => rel !== 'data/audits/phase-5c-authority-classification.json' && /^(data|packs)\//.test(rel) && (/(^|[/_.-])(feat|feats|weapon|weapons)([/_.-]|$)/i.test(rel) || rel.startsWith('data/canonical/') || rel.startsWith('data/audits/')) && !/\.(png|webp|svg)$/.test(rel);

export function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.name === 'node_modules' || e.name.startsWith('.git')) continue;
    if (e.isDirectory()) walk(rel, out); else out.push(rel);
  }
  return out;
}

/** Deterministic rule table (first match wins). Directory-level classes keep the file small; each file is still enumerated. */
export const RULES = [
  [/^data\/canonical\/(feats|weapons|talents)\.json$/, 'CANONICAL_SSOT', 'The one operational authority for its domain.'],
  [/^packs\/feats\.db(\.sha256)?$/, 'GENERATED_PRODUCTION', 'tools/build-feat-production.mjs from data/canonical/feats.json'],
  [/^packs\/weapons(-[a-z]+)?\.db$/, 'GENERATED_PRODUCTION', 'tools/build-weapon-production.mjs from data/canonical/weapons.json'],
  [/^data\/feat-catalog\.json$/, 'GENERATED_COMPATIBILITY', 'Catalog projection of packs/feats.db documents; retire when every consumer reads the pack/registry (5G).'],
  [/^data\/feat-(effects|choice-options|metadata|combat-actions|validity-registry)\.json$/, 'GENERATED_PRODUCTION', 'Feat companion data generated from the canonical feats corpus (companions + per-feat automation).'],
  [/^data\/feat-buckets-and-subbuckets\.json$/, 'GENERATED_COMPATIBILITY', 'Picker bucket view derived from generated feat documents.'],
  [/^data\/weapons\/canonical-weapon-registry\.json$/, 'GENERATED_RUNTIME_INDEX', 'tools/build-weapon-runtime-registry.mjs from data/canonical/weapons.json'],
  [/^data\/store\/weapon-store-descriptions\.json$/, 'GENERATED_COMPATIBILITY', 'Store card text projected from canonical player summaries.'],
  [/^data\/migrations\/(feat|weapon)-canonical-aliases\.json$/, 'MIGRATION_ALIAS_ONLY', 'Old id/name -> canonical mapping; defines nothing.'],
  [/^data\/audits\//, 'HISTORICAL_AUDIT_EVIDENCE', 'Certified audit evidence; never read by runtime or generators except as one-time/consolidation provenance.'],
  [/^data\/feat-(implementation|source-parity|taxonomy)\//, 'HISTORICAL_AUDIT_EVIDENCE', 'Developer audit inputs read only by scripts/dev audit tools.'],
  [/^data\/skill-challenges\/skill-challenge-feat-hooks\.json$/, 'HISTORICAL_AUDIT_EVIDENCE', 'Read only by scripts/dev skill-challenge audits.'],
  [/^data\/generated\/class-feat-list-bindings\.json$/, 'REFERENCE_BEARING_DOMAIN_DATA', 'Class-owned feat id lists (runtime); ids verified against the canonical corpus.'],
  [/^data\/nonheroic\//, 'REFERENCE_BEARING_DOMAIN_DATA', 'Nonheroic damage-profile subsystem; weapon UUIDs verified by tools/audit-nonheroic-profile-weapon-uuids.mjs.'],
  [/^data\/(actor-weapon-ranges|vehicle-weapon-ranges|vehicle-weapons)\.json$|^packs\/(vehicle-weapon-ranges|vehicle-weapons|vehicles-weapon-emplacements)\.db$|^data\/combat\/damage-profiles\.(vehicle-)?weapon\.json$|^data\/(upgrades\/weapon-upgrades|vehicle-modifications\/weapon-systems|prestige-layers\/weapon-master|class-features)\.json$/, 'OTHER_DOMAIN_DATA', 'Vehicle / upgrade / range / class-feature data; not the personal weapon or feat corpus.'],
];

export const OTHER_DOMAIN_DEFINITION = 'OTHER_DOMAIN_DATA: a file owned by another domain that neither defines nor projects feat/weapon canonical authority.';
export const REFERENCE_BEARING_DEFINITION = 'REFERENCE_BEARING_DOMAIN_DATA: an operational file owned by another domain that legitimately contains references to canonical feats/weapons (class feat lists, actor/NPC packs, archetypes, vehicle/domain records).';

/**
 * Guardrail for the two non-authority classes: such a file may not define canonical feat/weapon identity, rules or mechanics, nor
 * carry a second feat/weapon definition set. Returns violations (empty = legitimate other-domain / reference-bearing data).
 * Heuristic, structural: top-level (or depth-1 collection) records that are feat/weapon definition documents, any canonical stamp,
 * or any canonical-corpus-only key (identityKey feat::/weapon::, canonicalStats, canonicalRulesShape, certifiedPublications).
 */
export function domainClassGuardrailViolations(rel, text) {
  const out = [];
  const records = [];
  const t = String(text);
  if (/\.db$|\.ndjson$/.test(rel)) { for (const l of t.split('\n')) { if (!l.trim()) continue; try { records.push(JSON.parse(l)); } catch { /* not json */ } } }
  else { try { const j = JSON.parse(t); if (Array.isArray(j)) records.push(...j); else if (j && typeof j === 'object') { records.push(j); for (const v of Object.values(j)) if (Array.isArray(v)) records.push(...v); } } catch { return out; } }
  const BAD_KEYS = ['canonicalStats', 'canonicalRulesShape', 'certifiedPublications', 'canonicalPlayerText'];
  for (const r of records) {
    if (!r || typeof r !== 'object') continue;
    if (typeof r.identityKey === 'string' && /^(feat|weapon)::/.test(r.identityKey)) out.push(`${rel}: carries a canonical identityKey (${r.identityKey})`);
    if (BAD_KEYS.some((k) => k in r)) out.push(`${rel}: carries canonical-corpus-only fields (${BAD_KEYS.filter((k) => k in r).join(', ')})`);
    if (r.flags?.swse?.canonicalFeat || r.flags?.swse?.canonicalWeapon) out.push(`${rel}: carries a canonical identity stamp (a generated feat/weapon document)`);
    if ((r.type === 'feat' || r.type === 'weapon') && r.system && typeof r.system === 'object' && typeof r._id === 'string') out.push(`${rel}: defines a top-level ${r.type} item document (parallel feat/weapon definitions)`);
  }
  return [...new Set(out)];
}

export function classify(rel) { for (const [re, cls, note] of RULES) if (re.test(rel)) return { class: cls, note }; return null; }

export function buildClassification(files = [...walk('data'), ...walk('packs')]) {
  const scope = files.filter(inScope).sort();
  const entries = scope.map((p) => { const c = classify(p); return { path: p, class: c?.class ?? null, note: c?.note ?? null }; });
  return { schemaVersion: '5C.1', role: 'HISTORICAL_AUDIT_EVIDENCE', classes: CLASSES, counts: Object.fromEntries(CLASSES.map((c) => [c, entries.filter((e) => e.class === c).length])), unclassified: entries.filter((e) => !e.class).map((e) => e.path), entries };
}

export function verifyClassification(io, extraFiles = []) {
  const errs = [];
  let cur; try { cur = JSON.parse(io.read(CLASSIFICATION_FILE)); } catch { return [`${CLASSIFICATION_FILE} missing`]; }
  const now = buildClassification([...walk('data'), ...walk('packs'), ...extraFiles]);
  for (const p of now.unclassified) errs.push(`unclassified feat/weapon data file: ${p} (add it to RULES in tools/lib/canonical-authority-classification.mjs and rebuild the classification)`);
  const have = new Map(cur.entries.map((e) => [e.path, e.class]));
  for (const e of now.entries) if (e.class && have.get(e.path) !== e.class) errs.push(`classification file out of date for ${e.path}`);
  for (const p of have.keys()) if (!fs.existsSync(path.join(ROOT, p))) errs.push(`classification lists a file that no longer exists: ${p}`);
  for (const e of cur.entries) if (e.class === 'OTHER_DOMAIN_DATA' || e.class === 'REFERENCE_BEARING_DOMAIN_DATA') { try { errs.push(...domainClassGuardrailViolations(e.path, io.read(e.path)).map((v) => `${e.class} guardrail: ${v}`)); } catch { /* unreadable: caught by existence check */ } }
  const seen = new Set(); for (const e of cur.entries) { if (seen.has(e.path)) errs.push(`classified twice: ${e.path}`); seen.add(e.path); if (!CLASSES.includes(e.class)) errs.push(`invalid class for ${e.path}`); }
  return errs;
}

/** Runtime code (scripts/**) must never read audit/fix authority: data/audits, data/fixes. */
export function scanRuntimeAuditImports(files = walk('scripts'), read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')) {
  const errs = [];
  for (const f of files.filter((x) => /\.(m?js)$/.test(x) && !x.startsWith('scripts/dev/'))) {
    const t = read(f);
    if (/['"`][^'"`\n]*(data\/audits\/|data\/fixes\/)[^'"`\n]*(feat|weapon)[^'"`\n]*['"`]/i.test(t.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) errs.push(`runtime module ${f} references audit/fix authority`);
  }
  return errs;
}
