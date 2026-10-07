#!/usr/bin/env node
// Phase 5C one-time (idempotent) feat reference migration. Retired feat ids come ONLY from data/canonical/feats.json:
//   - the 6 implementation derivatives -> canonical Weapon Proficiency (ecc2471ac96ec2d4) + explicit choice
//     (embedded actor items keep their display name; their sourceId points at the canonical feat and flags.swse.choices.weaponProficiency
//      carries the group; class feat id lists are remapped and de-duplicated)
//   - the 33 noncanonical records -> references removed
// `--check` reports dangling retired ids outside the alias map / audits / docs and exits non-zero if any remain.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, readText, readJson } from './lib/canonical-weapons-shared.mjs';

const corpus = readJson('data/canonical/feats.json');
const RET = new Map(corpus.retiredProductionRecords.map((r) => [r.oldId, r]));
const WP = corpus.counts.weaponProficiencyCanonicalId;
const target = (id) => { const r = RET.get(id); return r.disposition === 'IMPLEMENTATION_DERIVATIVE_MIGRATED_TO_CHOICE' ? WP : null; };

const ACTOR_PACKS = ['heroic', 'nonheroic', 'npc', 'droids', 'beasts'];
const JSON_FILES = ['data/class-archetypes.json', 'data/generated/class-feat-list-bindings.json'];
const TEXT_FILES = ['data/prestige-prerequisites-reference.json']; // hand-formatted reference document: textual id substitution only
const CODE_FILES = ['scripts/engine/progression/prerequisites/class-prereq-normalizer.js'];
const SOURCE_RE = /^(Compendium\.foundryvtt-swse\.feats\.)([0-9a-f]{16})$/;

let stats = { embeddedMigrated: 0, embeddedDropped: 0, listEntriesRemapped: 0, listEntriesDropped: 0, stringsRemapped: 0 };

function walk(node) {
  if (Array.isArray(node)) {
    const out = [], seen = new Set();
    for (const v of node) {
      let w = walk(v);
      if (w === undefined) { stats.listEntriesDropped++; continue; }
      if (typeof v === 'string' && w !== v) stats.listEntriesRemapped++;
      if (typeof w === 'string' && RET.has(w) === false && /^[0-9a-f]{16}$/.test(w) && seen.has(w) && w === WP) continue; // de-duplicate the canonical target only
      if (typeof w === 'string') seen.add(w);
      out.push(w);
    }
    return out;
  }
  if (node && typeof node === 'object') { for (const k of Object.keys(node)) { const w = walk(node[k]); if (w === undefined) delete node[k]; else node[k] = w; } return node; }
  if (typeof node === 'string') {
    if (RET.has(node)) { const t = target(node); return t ?? undefined; }
    const m = /^(.*: )([0-9a-f]{16})$/.exec(node);
    if (m && RET.has(m[2])) { const t = target(m[2]); if (t) { stats.stringsRemapped++; return `${m[1]}${t}`; } }
    const m2 = /^(.*-> )([0-9a-f]{16})$|^(.*-> .*: )([0-9a-f]{16})$/.exec(node);
    const mm = m2 && (m2[2] ?? m2[4]); if (mm && RET.has(mm)) { stats.stringsRemapped++; return node.replace(mm, target(mm) ?? mm); }
  }
  return node;
}

function migratePack(name) {
  const rel = `packs/${name}.db`;
  if (!fs.existsSync(path.join(ROOT, rel))) return;
  const lines = readText(rel).split('\n');
  const out = lines.map((l) => {
    if (!l || ![...RET.keys()].some((id) => l.includes(id))) return l;
    const d = JSON.parse(l);
    const items = [];
    for (const it of d.items ?? []) {
      const m = SOURCE_RE.exec(it?.flags?.core?.sourceId ?? '');
      if (m && RET.has(m[2])) {
        const t = target(m[2]);
        if (!t) { stats.embeddedDropped++; continue; }
        const choice = RET.get(m[2]).choice;
        it.flags.core.sourceId = `${m[1]}${t}`;
        it.flags.swse = { ...(it.flags.swse ?? {}), choices: { ...(it.flags.swse?.choices ?? {}), weaponProficiency: { group: choice.value } } };
        stats.embeddedMigrated++;
      }
      items.push(it);
    }
    if (d.items) d.items = items;
    return JSON.stringify(d);
  });
  fs.writeFileSync(path.join(ROOT, rel), out.join('\n'));
}

const enc = (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
function migrateJson(rel) {
  const text = readText(rel); const j = JSON.parse(text);
  const esc = /\\u[0-9a-f]{4}/i.test(text) ? /[\u0080-\uffff]/g : /$^/g; // keep the file's own escaping style
  const indent2 = JSON.stringify(j, null, 2).replace(esc, enc); const trail = text.endsWith('\n') ? '\n' : '';
  if (indent2 + trail !== text) throw new Error(`${rel}: not 2-space JSON; refusing to reformat`);
  const w = walk(j);
  fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(w, null, 2).replace(esc, enc) + trail);
}

function migrateText(rel) { migrateCode(rel); }
function migrateCode(rel) {
  let t = readText(rel);
  for (const [id] of RET) if (target(id)) t = t.split(`'${id}'`).join(`'${WP}'`).split(`: ${id}"`).join(`: ${WP}"`);
  fs.writeFileSync(path.join(ROOT, rel), t);
}

export function scanDangling(read = readText) {
  const ids = [...RET.keys()];
  const hits = [];
  const files = [...ACTOR_PACKS.map((p) => `packs/${p}.db`), ...JSON_FILES, ...TEXT_FILES, ...CODE_FILES, 'data/heroic.json', 'data/nonheroic.json', 'data/feat-catalog.json', 'packs/feats.db', 'data/feat-effects.json', 'data/feat-metadata.json', 'data/feat-choice-options.json', 'data/feat-combat-actions.json', 'data/feat-validity-registry.json', 'data/character-templates.json', 'packs/classes.db'];
  for (const f of files) { if (!fs.existsSync(path.join(ROOT, f))) continue; const t = read(f); for (const id of ids) if (t.includes(id)) hits.push(`${f}: ${id} (${RET.get(id).oldName})`); }
  return hits;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
if (process.argv.includes('--check')) {
    const hits = scanDangling();
    if (hits.length) { console.error(`dangling retired feat ids:\n${hits.join('\n')}`); process.exit(1); }
    console.log('feat reference migration OK: no retired feat id is referenced outside the alias map, audits and docs');
  } else {
    for (const p of ACTOR_PACKS) migratePack(p);
    for (const f of JSON_FILES) migrateJson(f);
    for (const f of CODE_FILES) migrateCode(f);
    for (const f of TEXT_FILES) migrateText(f);
    console.log(`feat reference migration done ${JSON.stringify(stats)}`);
  }
}
