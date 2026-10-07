#!/usr/bin/env node
// Phase 5C-14/25: one-time, idempotent migration of repository-shipped references to weapon records that the cutover retired
// (merged or removed) or whose canonical production id changed meaning. Driven ONLY by data/canonical/weapons.json
// (retiredProductionRecords). Never rewrites audits/docs. `--check` proves there is no live dangling reference left.
// Usage: node tools/migrate-phase-5c-weapon-references.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, CANONICAL_WEAPONS, readJson, readText, packText } from './lib/canonical-weapons-shared.mjs';
import { projectSystem } from './lib/canonical-weapons-projection.mjs';

const REPLACEMENT_BY_REASON = { 'weapon-hold-out-blaster': 'weapon-hold-out-blaster-pistol' }; // 3C reason names the existing canonical equivalent
const ACTOR_PACKS = ['packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'packs/droids.db', 'packs/beasts.db'];
const SOURCE_RE = /^Compendium\.foundryvtt-swse\.(weapons[a-z-]*)\.(.+)$/;
const stable = JSON.stringify;

function maps() {
  const c = readJson(CANONICAL_WEAPONS);
  const merge = new Map(), removed = new Set();
  for (const r of c.retiredProductionRecords) { if (r.disposition === 'MERGE_INTO_CANONICAL') merge.set(r.oldId, r.canonicalProductionId); else removed.add(r.oldId); }
  return { c, merge, removed, replace: REPLACEMENT_BY_REASON };
}

/** Rewrites actor-pack embedded weapon sourceIds: merge -> survivor, removed -> sourceId stripped (item becomes a custom/legacy weapon). */
function migrateActorPacks(m, write) {
  const report = { remapped: 0, stripped: 0, files: {} };
  for (const f of ACTOR_PACKS) {
    if (!fs.existsSync(path.join(ROOT, f))) continue;
    let changed = 0;
    const out = readText(f).split('\n').filter((l) => l.trim()).map((line) => {
      const doc = JSON.parse(line);
      const walk = (o) => {
        if (Array.isArray(o)) { o.forEach(walk); return; }
        if (!o || typeof o !== 'object') return;
        const sid = o.flags?.core?.sourceId;
        const mt = typeof sid === 'string' ? SOURCE_RE.exec(sid) : null;
        if (mt) {
          const id = mt[2];
          if (m.merge.has(id)) { o.flags.core.sourceId = `Compendium.foundryvtt-swse.weapons.${m.merge.get(id)}`; report.remapped++; changed++; }
          else if (m.removed.has(id)) {
            const rep = m.replace[id];
            if (rep) { o.flags.core.sourceId = `Compendium.foundryvtt-swse.weapons.${rep}`; report.remapped++; } else { delete o.flags.core.sourceId; if (!Object.keys(o.flags.core).length) delete o.flags.core; report.stripped++; }
            changed++;
          }
        }
        for (const v of Object.values(o)) walk(v);
      };
      walk(doc);
      return stable(doc);
    });
    report.files[f] = changed;
    if (write && changed) fs.writeFileSync(path.join(ROOT, f), `${out.join('\n')}\n`);
  }
  return report;
}

function pruneCatalogs(m, write) {
  const report = {};
  const ids = new Set(m.merge.keys());
  let t = readText('data/lightsaber-components.json');
  const arr = JSON.parse(t).filter((x) => !ids.has(x.id));
  if (write) fs.writeFileSync(path.join(ROOT, 'data/lightsaber-components.json'), `${JSON.stringify(arr, null, 2)}\n`);
  report['data/lightsaber-components.json'] = JSON.parse(t).length - arr.length;
  const nd = readText('data/lightsaber-items-import.ndjson').split('\n').filter((l) => l.trim());
  const keep = nd.filter((l) => !ids.has(JSON.parse(l)._id));
  if (write) fs.writeFileSync(path.join(ROOT, 'data/lightsaber-items-import.ndjson'), `${keep.join('\n')}\n`);
  report['data/lightsaber-items-import.ndjson'] = nd.length - keep.length;
  return report;
}

/** Generated review-staging candidates that carried compendium identity metadata for a now-retired weapon: drop only that metadata (the printed row stays). */
function stripRetiredCandidateMetadata(m, write) {
  const retired = new Set([...m.merge.keys(), ...m.removed]);
  const report = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'data/nonheroic/generated')).filter((x) => /^nonheroic-weapon-damage-candidates\..*\.json$/.test(x))) {
    const rel = `data/nonheroic/generated/${f}`;
    const doc = JSON.parse(readText(rel));
    let n = 0;
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (!o || typeof o !== 'object') return;
      if (o.weapon && typeof o.weapon === 'object' && retired.has(o.weapon.baseSlug)) {
        for (const k of ['uuid', 'baseSlug', 'basePack', 'baseFormula', 'baseType', 'baseFormulaPolicy']) delete o.weapon[k];
        n++;
      }
      for (const v of Object.values(o)) walk(v);
    };
    walk(doc);
    report[rel] = n;
    if (write && n) fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(doc, null, 2)}\n`);
  }
  return report;
}

/** Weapons whose category pack changed (merge survivors move to weapons-lightsabers): repoint profile/candidate compendium UUIDs and basePack. */
function repointMovedWeaponUuids(m, write) {
  const moved = new Map(m.c.identities.filter((i) => i.production.mergedFrom.length).map((i) => [i.production.id, i.production.categoryPack]));
  const report = {};
  const files = [];
  for (const dir of ['data/nonheroic', 'data/nonheroic/generated']) for (const f of fs.readdirSync(path.join(ROOT, dir))) if (/\.json$/.test(f) && /nonheroic-weapon-damage/.test(f)) files.push(`${dir}/${f}`);
  for (const rel of files) {
    const doc = JSON.parse(readText(rel));
    let n = 0;
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (!o || typeof o !== 'object') return;
      if (o.weapon && typeof o.weapon === 'object' && typeof o.weapon.uuid === 'string') {
        const mt = /^Compendium\.foundryvtt-swse\.(weapons[a-z-]*)\.Item\.(.+)$/.exec(o.weapon.uuid);
        const want = mt && moved.get(mt[2]);
        if (want && mt[1] !== `weapons-${want}`) { o.weapon.uuid = `Compendium.foundryvtt-swse.weapons-${want}.Item.${mt[2]}`; if (o.weapon.basePack) o.weapon.basePack = `weapons-${want}`; n++; }
      }
      for (const v of Object.values(o)) walk(v);
    };
    walk(doc);
    if (n) { report[rel] = n; if (write) fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(doc, null, 2)}\n`); }
  }
  return report;
}

/** Profile rows keep an identity-metadata copy of the compendium base formula; refresh it where a certified canonical damage correction changed the weapon (the printed statblock formula is untouched). */
function refreshBaseFormulas(m, write) {
  const byId = new Map(m.c.identities.map((i) => [i.production.id, i]));
  const damageOf = (rec) => projectSystem(rec).system.damage;
  const report = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'data/nonheroic')).filter((x) => /^nonheroic-weapon-damage-profiles\..*\.json$/.test(x))) {
    const rel = `data/nonheroic/${f}`;
    const doc = JSON.parse(readText(rel));
    let n = 0;
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (!o || typeof o !== 'object') return;
      const w = o.weapon;
      if (w && typeof w === 'object' && typeof w.baseSlug === 'string' && byId.has(w.baseSlug) && typeof w.baseFormula === 'string') {
        const want = damageOf(byId.get(w.baseSlug));
        if (want && want !== '0' && w.baseFormula !== want && /^\d+d\d+/.test(want)) { w.baseFormula = want; n++; }
      }
      for (const v of Object.values(o)) walk(v);
    };
    walk(doc);
    if (n) { report[rel] = n; if (write) fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(doc, null, 2)}\n`); }
  }
  return report;
}

function migrateTemplates(m, write) {
  let t = readText('data/character-templates.json'), n = 0;
  for (const [oldId, newId] of Object.entries(m.replace)) {
    const oldName = m.c.retiredProductionRecords.find((r) => r.oldId === oldId).oldName;
    const newName = m.c.identities.find((i) => i.production.id === newId).canonicalName;
    const before = t;
    t = t.split(`"${oldId}"`).join(`"${newId}"`).split(`"${oldName}"`).join(`"${newName}"`);
    if (t !== before) n++;
  }
  if (write) fs.writeFileSync(path.join(ROOT, 'data/character-templates.json'), t);
  return { 'data/character-templates.json': n };
}

/** Live (non-audit) dangling exact-id references to retired weapon ids; excludes the alias map and the canonical corpus themselves. */
export function scanDangling() {
  const { merge, removed } = maps();
  const ids = [...merge.keys(), ...removed];
  const re = new RegExp(`(?<![A-Za-z0-9_-])(${ids.map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![A-Za-z0-9_-])`, 'g');
  const tracked = fs.readFileSync(path.join(ROOT, '.git/index')) ? null : null;
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory()) { if (/^(\.git|node_modules|docs|assets|styles|design-docs|\.github)$/.test(e.name) || rel === 'data/audits') continue; walk(rel); continue; }
      if (!/\.(js|mjs|json|db|hbs|html|ndjson|yml|csv|txt)$/.test(e.name)) continue;
      if (/^(data\/canonical\/weapons\.json|data\/migrations\/|data\/weapons\/canonical-weapon-registry\.json)/.test(rel)) continue;
      if (/^(tools|tests)\//.test(rel)) continue;
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const mt = text.match(re);
      if (mt) hits.push({ file: rel, count: mt.length, ids: [...new Set(mt)] });
    }
  };
  walk('.');
  return hits;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const hits = scanDangling();
    if (hits.length) { console.error(`dangling references to retired weapon ids:\n${hits.map((h) => `${h.file}: ${h.ids.join(',')}`).join('\n')}`); process.exit(1); }
    console.log('no live dangling references to retired weapon ids');
  } else {
    const m = maps();
    const r = { actorPacks: migrateActorPacks(m, true), catalogs: pruneCatalogs(m, true), templates: migrateTemplates(m, true), generatedCandidates: stripRetiredCandidateMetadata(m, true), movedUuids: repointMovedWeaponUuids(m, true), baseFormulas: refreshBaseFormulas(m, true) };
    console.log(JSON.stringify(r, null, 1));
  }
}
