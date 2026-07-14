#!/usr/bin/env node
/**
 * NH-1.5 NPC source attribution audit.
 *
 * Audit-only. Inventories heroic + nonheroic-adjacent actor compendiums and
 * normalizes each actor to a source book bucket so later damage/profile passes
 * can be executed by book instead of by guesswork.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_JSON = 'docs/audits/generated/npc-source-attribution-audit.json';
const OUTPUT_MD = 'docs/audits/generated/npc-source-attribution-audit.md';

const ACTOR_PACKS = [
  { path: 'packs/heroic.db', bucket: 'heroic' },
  { path: 'packs/nonheroic.db', bucket: 'nonheroic' },
  { path: 'packs/droids.db', bucket: 'droid' },
  { path: 'packs/beasts.db', bucket: 'beast' },
  { path: 'packs/npc.db', bucket: 'generic-npc' }
];

const JSON_SOURCES = [
  { path: 'data/nonheroic/nonheroic_templates.json', bucket: 'nonheroic-json' },
  { path: 'data/nonheroic-templates.json', bucket: 'starter-template-json' }
];

const BOOK_PATTERNS = [
  ['Saga Edition Core Rulebook', /core rulebook|saga edition core/i],
  ['Threats of the Galaxy', /threats of the galaxy/i],
  ['Scum and Villainy', /scum and villainy/i],
  ['Galaxy of Intrigue', /galaxy of intrigue/i],
  ['Galaxy at War', /galaxy at war/i],
  ['Clone Wars Campaign Guide', /clone wars campaign guide|clone wars/i],
  ['Force Unleashed Campaign Guide', /force unleashed campaign guide|force unleashed/i],
  ['Knights of the Old Republic Campaign Guide', /knights of the old republic|old republic campaign guide|kotor/i],
  ['Jedi Academy Training Manual', /jedi academy training manual|jedi academy/i],
  ['Scavenger\'s Guide to Droids', /scavenger'?s guide to droids|scavenger.*droid/i],
  ['The Unknown Regions', /unknown regions/i],
  ['Starships of the Galaxy', /starships of the galaxy/i],
  ['Web Enhancements', /web enhancement|saga edition preview|dawn of defiance/i]
];

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function parseJson(relPath) {
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

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function normalizeBook(value) {
  const text = clean(value);
  if (!text) return null;
  const withoutPrefix = text.replace(/^Star Wars Saga Edition\s+/i, '').trim();
  for (const [book, pattern] of BOOK_PATTERNS) {
    if (pattern.test(withoutPrefix)) return book;
  }
  return withoutPrefix;
}

function findReferenceBook(text) {
  const haystack = String(text ?? '');
  const referenceMatch = haystack.match(/Reference Book:\s*([^\n\r]+)/i);
  if (referenceMatch) return normalizeBook(referenceMatch[1]);

  for (const [book, pattern] of BOOK_PATTERNS) {
    if (pattern.test(haystack)) return book;
  }
  return null;
}

function getPath(obj, pathSpec) {
  return pathSpec.split('.').reduce((value, key) => value?.[key], obj);
}

const SOURCE_PATHS = [
  'system.source.book',
  'system.sourceBook',
  'system.details.source',
  'system.details.sourceBook',
  'system.npcProfile.source.book',
  'flags.swse.sourceBook',
  'flags.swse.source.book',
  'flags.swse.import.sourceBook',
  'flags.swse.import.raw.notes',
  'flags.swse.import.raw.Notes',
  'flags.foundryvtt-swse.sourceBook',
  'flags.foundryvtt-swse.originalStatblock.notes',
  'flags.foundryvtt-swse.originalStatblock.Notes'
];

function extractActorSource(actor) {
  const evidence = [];
  for (const pathSpec of SOURCE_PATHS) {
    const value = getPath(actor, pathSpec);
    const book = normalizeBook(value) ?? findReferenceBook(value);
    if (book) evidence.push({ path: pathSpec, value: clean(value), book });
  }

  const rawText = JSON.stringify({
    name: actor.name,
    system: actor.system,
    flags: actor.flags,
    biography: actor.system?.biography,
    description: actor.system?.description
  });
  const rawBook = findReferenceBook(rawText);
  if (rawBook) evidence.push({ path: 'actor-json-search', value: rawBook, book: rawBook });

  const uniqueBooks = [...new Set(evidence.map(item => item.book).filter(Boolean))];
  let status = 'missing-source';
  let book = 'Unknown / missing source';
  if (uniqueBooks.length === 1) {
    status = 'attributed';
    book = uniqueBooks[0];
  } else if (uniqueBooks.length > 1) {
    status = 'conflicting-source';
    book = uniqueBooks.join(' / ');
  }

  return { book, status, evidence };
}

function inferActorKind(actor, fallbackBucket) {
  const npcProfileKind = actor.system?.npcProfile?.kind ?? actor.system?.npcType ?? actor.flags?.swse?.import?.templateType ?? actor.flags?.['foundryvtt-swse']?.templateType;
  if (npcProfileKind) return clean(npcProfileKind);
  if (fallbackBucket === 'heroic') return 'heroic';
  if (fallbackBucket === 'nonheroic') return 'nonheroic';
  if (fallbackBucket === 'droid') return 'droid';
  if (fallbackBucket === 'beast') return 'beast';
  return fallbackBucket;
}

function countWeapons(actor) {
  return asArray(actor.items).filter(item => item?.type === 'weapon').length;
}

function collectActorPacks() {
  const records = [];
  for (const pack of ACTOR_PACKS) {
    for (const actor of parseJsonLines(pack.path)) {
      if (actor.__parseError) {
        records.push({
          name: `Parse error line ${actor.__line}`,
          slug: `parse-error-${actor.__line}`,
          sourceBook: 'Unknown / missing source',
          sourceStatus: 'parse-error',
          actorKind: pack.bucket,
          packPath: pack.path,
          weaponCount: 0,
          evidence: [{ path: 'parse-error', value: actor.__parseError, book: null }]
        });
        continue;
      }
      const source = extractActorSource(actor);
      records.push({
        name: clean(actor.name),
        slug: slugify(actor.name),
        sourceBook: source.book,
        sourceStatus: source.status,
        actorKind: inferActorKind(actor, pack.bucket),
        packPath: pack.path,
        compendiumId: actor._id ?? actor.id ?? null,
        level: actor.system?.level ?? actor.system?.details?.level ?? null,
        challengeLevel: actor.system?.cl ?? actor.system?.challengeLevel ?? actor.system?.details?.cl ?? null,
        weaponCount: countWeapons(actor),
        evidence: source.evidence
      });
    }
  }
  return records;
}

function collectJsonSources() {
  const records = [];
  for (const source of JSON_SOURCES) {
    if (!exists(source.path)) continue;
    const data = parseJson(source.path);
    const entries = Array.isArray(data) ? data : asArray(data.templates);
    for (const entry of entries) {
      const sourceText = JSON.stringify(entry);
      const book = findReferenceBook(sourceText) ?? (entry.isBeast ? 'The Unknown Regions / Saga Edition Core Rulebook natural weapon rules' : 'Unknown / missing source');
      const status = book === 'Unknown / missing source' ? 'missing-source' : 'attributed';
      records.push({
        name: clean(entry.name ?? entry.id),
        slug: slugify(entry.name ?? entry.id),
        sourceBook: book,
        sourceStatus: status,
        actorKind: entry.isBeast ? 'beast-template' : source.bucket,
        packPath: source.path,
        compendiumId: entry.id ?? null,
        level: entry.level ?? entry.CL ?? null,
        challengeLevel: entry.CL ?? null,
        weaponCount: asArray(entry.beastData?.naturalWeapons).length,
        evidence: book === 'Unknown / missing source' ? [] : [{ path: 'json-search', value: book, book }]
      });
    }
  }
  return records;
}

function groupCounts(records, selector) {
  return records.reduce((acc, row) => {
    const key = selector(row) || 'Unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function summarize(records) {
  return {
    totalActors: records.length,
    byPackPath: groupCounts(records, row => row.packPath),
    byActorKind: groupCounts(records, row => row.actorKind),
    bySourceBook: groupCounts(records, row => row.sourceBook),
    bySourceStatus: groupCounts(records, row => row.sourceStatus),
    actorsWithWeapons: records.filter(row => Number(row.weaponCount ?? 0) > 0).length,
    missingSourceWithWeapons: records.filter(row => row.sourceStatus === 'missing-source' && Number(row.weaponCount ?? 0) > 0).length
  };
}

function mdTable(rows, columns) {
  if (!rows.length) return '_None._';
  const header = `|${columns.map(c => c.label).join('|')}|`;
  const sep = `|${columns.map(() => '---').join('|')}|`;
  const body = rows.map(row => `|${columns.map(c => clean(c.value(row)).replace(/\|/g, '\\|')).join('|')}|`);
  return [header, sep, ...body].join('\n');
}

function entriesFromCounts(counts) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));
}

function writeOutputs(records) {
  records.sort((a, b) => a.packPath.localeCompare(b.packPath) || a.sourceBook.localeCompare(b.sourceBook) || a.name.localeCompare(b.name));
  const summary = summarize(records);
  fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT_JSON)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUTPUT_JSON), JSON.stringify({ generatedAt: new Date().toISOString(), summary, records }, null, 2));

  const missingRows = records.filter(row => row.sourceStatus !== 'attributed').slice(0, 100);
  const weaponRows = records.filter(row => Number(row.weaponCount ?? 0) > 0).slice(0, 150);

  const md = `# NPC Source Attribution Audit\n\nGenerated by \`node tools/audit-npc-source-attribution.mjs\`.\n\nThis is an NH-1.5 audit-only source map for heroic and nonheroic-adjacent NPC compendiums. It exists so later damage/profile passes can be done by book.\n\n## Summary\n\n- Total actor/source rows: **${summary.totalActors}**\n- Actors with embedded weapons/natural weapons: **${summary.actorsWithWeapons}**\n- Missing source and has weapons: **${summary.missingSourceWithWeapons}**\n\n## By source status\n\n${mdTable(entriesFromCounts(summary.bySourceStatus), [\n  { label: 'Status', value: r => r.key },\n  { label: 'Actors', value: r => r.count }\n])}\n\n## By source book\n\n${mdTable(entriesFromCounts(summary.bySourceBook), [\n  { label: 'Source book', value: r => r.key },\n  { label: 'Actors', value: r => r.count }\n])}\n\n## By pack/source path\n\n${mdTable(entriesFromCounts(summary.byPackPath), [\n  { label: 'Pack/source path', value: r => r.key },\n  { label: 'Actors', value: r => r.count }\n])}\n\n## Attributed actors with weapons, first 150\n\n${mdTable(weaponRows, [\n  { label: 'Actor', value: r => r.name },\n  { label: 'Kind', value: r => r.actorKind },\n  { label: 'Book', value: r => r.sourceBook },\n  { label: 'Status', value: r => r.sourceStatus },\n  { label: 'Weapons', value: r => r.weaponCount },\n  { label: 'Path', value: r => r.packPath }\n])}\n\n## Missing/conflicting source rows, first 100\n\n${mdTable(missingRows, [\n  { label: 'Actor', value: r => r.name },\n  { label: 'Kind', value: r => r.actorKind },\n  { label: 'Book', value: r => r.sourceBook },\n  { label: 'Status', value: r => r.sourceStatus },\n  { label: 'Weapons', value: r => r.weaponCount },\n  { label: 'Path', value: r => r.packPath }\n])}\n\n## Recommended use\n\n1. Run this before each book-specific damage pass.\n2. Filter the JSON output by \`sourceBook\` and \`weaponCount > 0\`.\n3. Fix or append source metadata before changing formulas.\n4. Keep \`missing-source\` and \`conflicting-source\` rows manual until source authority is recovered.\n`;
  fs.writeFileSync(path.join(ROOT, OUTPUT_MD), md);
  return { summary, outputJson: OUTPUT_JSON, outputMd: OUTPUT_MD };
}

const records = [
  ...collectActorPacks(),
  ...collectJsonSources()
];

console.log(JSON.stringify(writeOutputs(records), null, 2));
