#!/usr/bin/env node
/**
 * Nonheroic statblock profile coverage audit.
 *
 * This is audit-only. It inventories weapon-like rows from the same broad
 * source set used by tools/audit-nonheroic-weapon-damage.mjs, loads the
 * source-backed nonheroic damage profile records, and buckets each discovered
 * row by whether the current profile set appears to cover it.
 *
 * It does not mutate actor packs, source data, profile data, compendium items,
 * or runtime combat code.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_JSON = 'docs/audits/generated/nonheroic-profile-coverage-audit.json';
const OUTPUT_MD = 'docs/audits/generated/nonheroic-profile-coverage-audit.md';

const ACTOR_PACKS = [
  'packs/nonheroic.db',
  'packs/droids.db',
  'packs/beasts.db',
  'packs/npc.db'
];

const JSON_SOURCES = [
  { path: 'data/nonheroic/nonheroic_templates.json', kind: 'nonheroic-statblock-json' },
  { path: 'data/nonheroic-templates.json', kind: 'starter-template-json' }
];

const PROFILE_DIR = 'data/nonheroic';
const PROFILE_PREFIX = 'nonheroic-weapon-damage-profiles.';

const SOURCEBOOK_ORDER = [
  'Saga Edition Core Rulebook',
  'Threats of the Galaxy',
  'Scum and Villainy',
  'Galaxy of Intrigue',
  'Galaxy at War',
  'Clone Wars Campaign Guide',
  'Force Unleashed Campaign Guide',
  'Knights of the Old Republic Campaign Guide',
  'Jedi Academy Training Manual',
  'Scavenger\'s Guide to Droids',
  'The Unknown Regions',
  'Starships of the Galaxy',
  'Web Enhancements',
  'Unknown / missing source'
];

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function writeText(relPath, text) {
  fs.mkdirSync(path.dirname(path.join(ROOT, relPath)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, relPath), text);
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function parseJsonFile(relPath) {
  return JSON.parse(readText(relPath));
}

function parseJsonLines(relPath) {
  if (!exists(relPath)) return [];
  return readText(relPath)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        return { __parseError: err.message, __line: index + 1, __raw: line };
      }
    });
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function splitSourceList(value) {
  const text = clean(value);
  if (!text) return [];
  const out = [];
  let current = '';
  let depth = 0;
  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if ((char === ';' || char === ',') && depth === 0) {
      if (current.trim()) out.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function extractReferenceBook(value = '') {
  const text = String(value ?? '');
  const match = text.match(/Reference Book:\s*([^\n\r]+)/i);
  if (!match) return 'Unknown / missing source';
  return clean(match[1]).replace(/^Star Wars Saga Edition\s+/i, '') || 'Unknown / missing source';
}

function normalizeBook(book) {
  const value = clean(book);
  if (!value) return 'Unknown / missing source';
  if (/core rulebook/i.test(value)) return 'Saga Edition Core Rulebook';
  if (/threats of the galaxy/i.test(value)) return 'Threats of the Galaxy';
  if (/scum and villainy/i.test(value)) return 'Scum and Villainy';
  if (/galaxy of intrigue/i.test(value)) return 'Galaxy of Intrigue';
  if (/galaxy at war/i.test(value)) return 'Galaxy at War';
  if (/clone wars/i.test(value)) return 'Clone Wars Campaign Guide';
  if (/force unleashed/i.test(value)) return 'Force Unleashed Campaign Guide';
  if (/old republic/i.test(value)) return 'Knights of the Old Republic Campaign Guide';
  if (/jedi academy/i.test(value)) return 'Jedi Academy Training Manual';
  if (/scavenger/i.test(value) && /droid/i.test(value)) return 'Scavenger\'s Guide to Droids';
  if (/unknown regions/i.test(value)) return 'The Unknown Regions';
  if (/starships of the galaxy/i.test(value)) return 'Starships of the Galaxy';
  if (/web enhancement|preview/i.test(value)) return 'Web Enhancements';
  return value;
}

function extractDamageText(entry) {
  const parens = [...String(entry ?? '').matchAll(/\(([^)]*)\)/g)].map(match => clean(match[1]));
  return parens.find(text => /\d+d\d+|\b\d+\b/i.test(text) && !/^flat-footed/i.test(text)) ?? '';
}

function rowSortKey(row) {
  return [row.sourceBook, row.actorSlug, row.rawSlug].join('::');
}

function inferCustomReason(row) {
  const text = slugify(`${row.attackKind} ${row.raw}`);
  // Word-bounded: "blast" must not match inside "blaster", "area" must not
  // match inside unrelated compound words, etc.
  if (/\bunarmed\b/.test(text)) return 'unarmed';
  if (/\b(claw|bite|gore|slam|sting|tail|horn|natural)\b/.test(text)) return 'natural';
  // Self-destruct / pacify-hostile style unique droid or NPC actions are
  // custom, not a reusable compendium weapon. Riders (poison, disease,
  // condition-track effects) and autofire/grenade/area-attack modes are
  // handled separately below via classifyWeapon's flags, so they route to
  // manual-special-mode-needed instead of manual-custom-needed.
  if (/\bself-destruct\b|\bself destruct\b|\bpacify hostile\b/.test(text)) return 'special';
  return null;
}

function classifyWeapon(entry, source = {}) {
  const raw = clean(entry);
  const damageText = extractDamageText(raw);
  const flags = [];
  if (!damageText) flags.push('missing-damage-formula');
  // Word-bounded to avoid false positives from substrings inside unrelated
  // words (e.g. "blast" inside "Blaster", "area" inside longer compounds).
  if (/\bautofire\b/i.test(raw)) flags.push('autofire-review');
  if (/\b(grenade|explosive|blast|burst|area|cone|line)\b/i.test(raw)) flags.push('area-or-explosive-review');
  if (/\b(poison|disease)\b|condition track|moves? -\d steps?/i.test(raw)) flags.push('rider-review');
  return {
    actor: source.actor,
    actorSlug: slugify(source.actor),
    sourcePath: source.sourcePath,
    sourceKind: source.sourceKind,
    sourceBook: normalizeBook(source.sourceBook),
    attackKind: source.attackKind,
    raw,
    rawSlug: slugify(raw),
    damageText,
    flags,
    customReason: null
  };
}

function collectFromStatblock(statblock, source) {
  const rows = [];
  const actor = clean(statblock.name ?? statblock.Name ?? source.actor ?? 'Unknown');
  const sourceBook = normalizeBook(source.sourceBook ?? extractReferenceBook(statblock.notes ?? statblock.Notes ?? statblock.description ?? ''));

  for (const [field, attackKind] of [['Melee Weapons', 'melee'], ['Ranged Weapons', 'ranged'], ['Melee', 'melee'], ['Ranged', 'ranged']]) {
    for (const entry of splitSourceList(statblock[field])) {
      rows.push(classifyWeapon(entry, { ...source, actor, sourceBook, attackKind }));
    }
  }

  const possessions = clean(statblock.possessions ?? statblock.Possessions ?? '');
  if (possessions && !rows.length) {
    for (const entry of splitSourceList(possessions)) {
      if (/blaster|pistol|rifle|carbine|club|baton|grenade|lightsaber|knife|vibro|claw|bite|slam|saw|torch|welder|probe|weapon/i.test(entry)) {
        rows.push(classifyWeapon(entry, { ...source, actor, sourceBook, attackKind: 'possession-only' }));
      }
    }
  }

  return rows;
}

function collectStarterTemplates() {
  const rows = [];
  if (!exists('data/nonheroic-templates.json')) return rows;
  const data = parseJsonFile('data/nonheroic-templates.json');
  for (const template of asArray(data.templates)) {
    const actor = clean(template.name ?? template.id ?? 'Unknown starter template');
    for (const weapon of asArray(template.beastData?.naturalWeapons)) {
      const raw = `${weapon.name ?? 'Natural Weapon'} (${weapon.damage ?? ''})`;
      rows.push(classifyWeapon(raw, {
        actor,
        sourcePath: 'data/nonheroic-templates.json',
        sourceKind: 'starter-template-json',
        sourceBook: template.isBeast ? 'The Unknown Regions / Saga Edition Core Rulebook natural weapon rules' : 'Unknown / missing source',
        attackKind: 'natural'
      }));
    }
  }
  return rows;
}

function collectJsonStatblocks() {
  const rows = [];
  for (const source of JSON_SOURCES) {
    if (!exists(source.path) || source.path === 'data/nonheroic-templates.json') continue;
    const data = parseJsonFile(source.path);
    for (const statblock of asArray(data)) {
      rows.push(...collectFromStatblock(statblock, {
        sourcePath: source.path,
        sourceKind: source.kind,
        actor: statblock.name
      }));
    }
  }
  return rows;
}

function actorSourceKind(actor, packPath) {
  const profileKind = actor.system?.npcProfile?.kind ?? actor.system?.npcType ?? actor.flags?.swse?.import?.templateType ?? actor.flags?.['foundryvtt-swse']?.templateType;
  if (profileKind) return String(profileKind);
  if (/beasts\.db$/.test(packPath)) return 'beast-pack';
  if (/droids\.db$/.test(packPath)) return 'droid-pack';
  if (/nonheroic\.db$/.test(packPath)) return 'nonheroic-pack';
  return 'npc-pack';
}

function collectActorPacks() {
  const rows = [];
  for (const packPath of ACTOR_PACKS) {
    for (const actor of parseJsonLines(packPath)) {
      if (actor.__parseError) {
        rows.push({
          actor: `Parse error line ${actor.__line}`,
          actorSlug: `parse-error-${actor.__line}`,
          sourcePath: packPath,
          sourceKind: 'parse-error',
          sourceBook: 'Unknown / missing source',
          attackKind: 'parse-error',
          raw: actor.__raw,
          rawSlug: `parse-error-${actor.__line}`,
          damageText: '',
          flags: ['pack-json-parse-error'],
          customReason: null
        });
        continue;
      }

      const sourceKind = actorSourceKind(actor, packPath);
      const rawStatblock = actor.flags?.swse?.import?.raw ?? actor.flags?.['foundryvtt-swse']?.originalStatblock ?? null;
      if (rawStatblock && typeof rawStatblock === 'object') {
        rows.push(...collectFromStatblock(rawStatblock, {
          sourcePath: packPath,
          sourceKind,
          actor: actor.name
        }));
      }

      for (const item of asArray(actor.items)) {
        if (item?.type !== 'weapon') continue;
        const system = item.system ?? {};
        const raw = clean(item.flags?.swse?.import?.raw ?? system.description ?? item.name);
        const row = classifyWeapon(raw || item.name, {
          sourcePath: packPath,
          sourceKind,
          actor: actor.name,
          sourceBook: normalizeBook(actor.system?.source?.book ?? actor.flags?.swse?.sourceBook ?? extractReferenceBook(JSON.stringify(rawStatblock ?? {}))),
          attackKind: system.weaponType ?? system.category ?? 'embedded-weapon'
        });
        row.embeddedItemName = item.name;
        row.systemDamage = system.damage ?? system.damageFormula ?? system.damage?.formula ?? null;
        row.systemDamageType = system.damageType ?? system.damage?.type ?? null;
        rows.push(row);
      }
    }
  }
  return rows;
}

function profileFiles() {
  if (!exists(PROFILE_DIR)) return [];
  return fs.readdirSync(path.join(ROOT, PROFILE_DIR))
    .filter(file => file.startsWith(PROFILE_PREFIX) && file.endsWith('.json') && !file.endsWith('.schema.json'))
    .sort()
    .map(file => path.join(PROFILE_DIR, file));
}

function loadProfiles() {
  const profiles = [];
  for (const relPath of profileFiles()) {
    const data = parseJsonFile(relPath);
    for (const record of asArray(data.records)) {
      const actorSlugs = asArray(record.match?.actorSlugs).map(slugify).filter(Boolean);
      const rawIncludes = asArray(record.match?.rawIncludes).map(value => clean(value).toLowerCase()).filter(Boolean);
      profiles.push({
        file: relPath,
        slug: record.slug,
        name: record.name,
        actorSlugs,
        rawIncludes,
        confidence: record.confidence,
        delivery: record.delivery,
        attackShape: record.attackShape,
        formula: record.formula?.printed ?? asArray(record.components)[0]?.formula ?? null,
        variants: asArray(record.variants).map(variant => ({ slug: variant.slug, label: variant.label, formula: variant.formula?.printed ?? asArray(variant.components)[0]?.formula ?? null }))
      });
    }
  }
  return profiles;
}

function matchProfiles(row, profiles) {
  const raw = clean(row.raw).toLowerCase();
  const actorSlug = slugify(row.actor);
  return profiles.filter(profile => {
    const actorMatch = !profile.actorSlugs.length || profile.actorSlugs.includes(actorSlug);
    if (!actorMatch) return false;
    return profile.rawIncludes.some(marker => raw.includes(marker));
  });
}

function bucketRow(row, matches) {
  row.customReason = inferCustomReason(row);
  if (matches.length === 1) return 'covered';
  if (matches.length > 1) return 'ambiguous-profile-match';
  if (row.customReason) return 'manual-custom-needed';
  if (!row.damageText) return 'missing-source-damage';
  if (row.flags.includes('autofire-review') || row.flags.includes('area-or-explosive-review') || row.flags.includes('rider-review')) return 'manual-special-mode-needed';
  return 'missing-profile';
}

function dedupeRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = `${row.actorSlug}::${row.rawSlug}::${row.sourcePath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function byCount(rows, selector) {
  const out = {};
  for (const row of rows) {
    const key = selector(row) || 'Unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function sortedBooks(counts) {
  return Object.fromEntries(Object.entries(counts).sort((a, b) => {
    const ai = SOURCEBOOK_ORDER.indexOf(a[0]);
    const bi = SOURCEBOOK_ORDER.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a[0].localeCompare(b[0]);
  }));
}

function mdTable(rows, columns) {
  if (!rows.length) return '_None._';
  const header = `|${columns.map(c => c.label).join('|')}|`;
  const sep = `|${columns.map(() => '---').join('|')}|`;
  const body = rows.map(row => `|${columns.map(c => clean(c.value(row)).replace(/\|/g, '\\|')).join('|')}|`);
  return [header, sep, ...body].join('\n');
}

function renderMarkdown(summary, buckets) {
  const bucketRows = Object.entries(summary.byBucket).map(([bucket, rows]) => ({ bucket, rows }));
  const bookRows = Object.entries(summary.bySourceBook).map(([book, rows]) => ({ book, rows }));
  const sourceRows = Object.entries(summary.bySourceKind).map(([sourceKind, rows]) => ({ sourceKind, rows }));

  const important = [
    ...buckets['missing-profile'],
    ...buckets['manual-special-mode-needed'],
    ...buckets['manual-custom-needed'],
    ...buckets['ambiguous-profile-match']
  ].sort((a, b) => rowSortKey(a).localeCompare(rowSortKey(b))).slice(0, 120);

  const bucketTable = mdTable(bucketRows, [
    { label: 'Bucket', value: r => r.bucket },
    { label: 'Rows', value: r => r.rows }
  ]);
  const bookTable = mdTable(bookRows, [
    { label: 'Source book', value: r => r.book },
    { label: 'Rows', value: r => r.rows }
  ]);
  const sourceKindTable = mdTable(sourceRows, [
    { label: 'Source kind', value: r => r.sourceKind },
    { label: 'Rows', value: r => r.rows }
  ]);
  const importantTable = mdTable(important, [
    { label: 'Bucket', value: r => r.bucket },
    { label: 'Actor', value: r => r.actor },
    { label: 'Book', value: r => r.sourceBook },
    { label: 'Source', value: r => r.sourcePath },
    { label: 'Raw', value: r => r.raw || '(none)' },
    { label: 'Damage', value: r => r.damageText || '(missing)' },
    { label: 'Reason', value: r => r.customReason || (r.flags ?? []).join(', ') || '(none)' },
    { label: 'Matches', value: r => (r.matches ?? []).map(m => m.slug).join(', ') || '(none)' }
  ]);

  return `# Nonheroic Profile Coverage Audit

Generated by \`node tools/audit-nonheroic-profile-coverage.mjs\`.

This is an audit-only report. It compares weapon-like NPC/statblock rows discovered from source JSON and actor packs against \`data/nonheroic/nonheroic-weapon-damage-profiles.*.json\`.

## Summary

- Source rows scanned: **${summary.sourceRowsScanned}**
- Unique source rows: **${summary.uniqueSourceRows}**
- Profile records loaded: **${summary.profileRecordsLoaded}**

## Coverage buckets

${bucketTable}

## By source book

${bookTable}

## By source kind

${sourceKindTable}

## First rows needing follow-up

${importantTable}
`;
}

function main() {
  const rawRows = [
    ...collectJsonStatblocks(),
    ...collectStarterTemplates(),
    ...collectActorPacks()
  ];
  const profiles = loadProfiles();
  const rows = dedupeRows(rawRows).map(row => {
    const matches = matchProfiles(row, profiles);
    const bucket = bucketRow(row, matches);
    return {
      ...row,
      bucket,
      matches: matches.map(match => ({ file: match.file, slug: match.slug, formula: match.formula, confidence: match.confidence }))
    };
  });

  const buckets = {
    covered: [],
    'missing-profile': [],
    'manual-custom-needed': [],
    'manual-special-mode-needed': [],
    'missing-source-damage': [],
    'ambiguous-profile-match': []
  };
  for (const row of rows) (buckets[row.bucket] ||= []).push(row);

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceRowsScanned: rawRows.length,
    uniqueSourceRows: rows.length,
    profileRecordsLoaded: profiles.length,
    byBucket: byCount(rows, row => row.bucket),
    bySourceBook: sortedBooks(byCount(rows, row => row.sourceBook)),
    bySourceKind: byCount(rows, row => row.sourceKind)
  };

  writeText(OUTPUT_JSON, JSON.stringify({ summary, buckets, rows }, null, 2) + '\n');
  writeText(OUTPUT_MD, renderMarkdown(summary, buckets));
  console.log(JSON.stringify({ summary, outputJson: OUTPUT_JSON, outputMd: OUTPUT_MD }, null, 2));
}

main();
